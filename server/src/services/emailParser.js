/**
 * Email Parser Service
 * Bridges inbound email webhook with OMAI for parsing emails into
 * structured sacramental records or queries about existing records.
 */

const { getTenantPool } = require('../config/db');
const { askOMAIWithMetadata } = require('/var/www/orthodoxmetrics/prod/misc/omai/services/index.js');

// Whitelist of valid record tables to prevent SQL injection
const VALID_RECORD_TABLES = {
  baptism: 'baptism_records',
  marriage: 'marriage_records',
  funeral: 'funeral_records',
};

// Whitelist of allowed columns per record type
const ALLOWED_COLUMNS = {
  baptism: [
    'first_name', 'last_name', 'middle_name', 'date_of_baptism', 'date_of_birth',
    'place_of_baptism', 'godparent_name', 'godparent_name_2', 'priest_name',
    'father_name', 'mother_name', 'notes', 'status', 'source', 'created_by',
  ],
  marriage: [
    'groom_first_name', 'groom_last_name', 'bride_first_name', 'bride_last_name',
    'date_of_marriage', 'place_of_marriage', 'witness_name', 'witness_name_2',
    'priest_name', 'koumbaros', 'notes', 'status', 'source', 'created_by',
  ],
  funeral: [
    'first_name', 'last_name', 'middle_name', 'date_of_funeral', 'date_of_death',
    'date_of_birth', 'place_of_funeral', 'priest_name', 'cemetery',
    'cause_of_death', 'notes', 'status', 'source', 'created_by',
  ],
};

/**
 * Process an inbound email via OMAI
 * @returns {{ status: string, recordType: string, parsedData: object|null, response: object, createdRecordId: number|null }}
 */
async function processEmailWithOMAI({ submissionId, churchId, senderEmail, userId, subject, body, senderName }) {
  const prompt = buildEmailParsingPrompt(subject, body, senderName);

  let omaiResult;
  try {
    omaiResult = await askOMAIWithMetadata(prompt, {
      churchId,
      userId,
      context: 'email_intake',
    });
  } catch (err) {
    console.error('[EmailParser] OMAI call failed:', err.message);
    return {
      status: 'failed',
      recordType: 'unknown',
      parsedData: null,
      response: { error: err.message },
      createdRecordId: null,
    };
  }

  const responseText = omaiResult?.response || omaiResult?.text || '';
  const parsedData = extractStructuredData(responseText);

  if (!parsedData || !parsedData.record_type) {
    return {
      status: 'parsed',
      recordType: 'unknown',
      parsedData: { raw_response: responseText },
      response: omaiResult,
      createdRecordId: null,
    };
  }

  // For queries, don't create a record — just return the parsed query
  if (parsedData.record_type === 'query') {
    return {
      status: 'parsed',
      recordType: 'query',
      parsedData,
      response: omaiResult,
      createdRecordId: null,
    };
  }

  // Create draft record in the church's tenant DB
  let createdRecordId = null;
  try {
    createdRecordId = await createDraftRecord(churchId, userId, parsedData);
  } catch (err) {
    console.error('[EmailParser] Draft record creation failed:', err.message);
    return {
      status: 'parsed',
      recordType: parsedData.record_type,
      parsedData,
      response: omaiResult,
      createdRecordId: null,
    };
  }

  return {
    status: createdRecordId ? 'completed' : 'parsed',
    recordType: parsedData.record_type,
    parsedData,
    response: omaiResult,
    createdRecordId,
  };
}

/**
 * Build a structured prompt for OMAI to parse an email
 */
function buildEmailParsingPrompt(subject, body, senderName) {
  return `You are parsing an email submitted to create a sacramental record for an Orthodox church.

Sender: ${senderName}
Subject: ${subject}

Email Body:
---
${body}
---

Analyze this email and extract record information. Respond with ONLY a JSON block:

\`\`\`json
{
  "record_type": "baptism" | "marriage" | "funeral" | "query" | "unknown",
  "confidence": 0.0 to 1.0,
  "fields": {
    // For baptism: first_name, last_name, date_of_baptism, date_of_birth, godparent_name, priest_name, notes
    // For marriage: groom_first_name, groom_last_name, bride_first_name, bride_last_name, date_of_marriage, witness_name, priest_name, notes
    // For funeral: first_name, last_name, date_of_funeral, date_of_death, priest_name, cemetery, notes
  },
  "missing_fields": ["list of required fields that could not be extracted"],
  "notes": "any additional context or ambiguity"
}
\`\`\`

If the email is asking a question about existing records (not creating a new one), respond with:
\`\`\`json
{
  "record_type": "query",
  "query_text": "the user's question rephrased clearly",
  "notes": "context about what they are looking for"
}
\`\`\`

If the email content is unclear or not related to church records, use record_type "unknown".`;
}

/**
 * Extract structured JSON from OMAI response text
 */
function extractStructuredData(responseText) {
  if (!responseText) return null;

  // Try markdown code block first
  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch { /* fall through */ }
  }

  // Try raw JSON object
  const rawMatch = responseText.match(/(\{[\s\S]*\})/);
  if (rawMatch) {
    try {
      return JSON.parse(rawMatch[1].trim());
    } catch { /* fall through */ }
  }

  return null;
}

/**
 * Create a draft record in the church's tenant database
 * Returns the new record ID, or null on failure
 */
async function createDraftRecord(churchId, userId, parsedData) {
  const recordType = parsedData.record_type;
  const tableName = VALID_RECORD_TABLES[recordType];

  if (!tableName) {
    console.warn('[EmailParser] Unknown record type:', recordType);
    return null;
  }

  const allowedCols = ALLOWED_COLUMNS[recordType];
  if (!allowedCols) return null;

  const fields = parsedData.fields || {};

  // Add metadata
  fields.source = 'email_intake';
  fields.status = 'draft';
  fields.created_by = userId;

  // Filter to only allowed columns
  const safeFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (allowedCols.includes(key) && value !== null && value !== undefined && value !== '') {
      safeFields[key] = value;
    }
  }

  if (Object.keys(safeFields).length === 0) {
    console.warn('[EmailParser] No valid fields to insert');
    return null;
  }

  const columns = Object.keys(safeFields);
  const placeholders = columns.map(() => '?').join(', ');
  const values = Object.values(safeFields);

  const pool = getTenantPool(churchId);
  const [result] = await pool.query(
    `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
    values
  );

  console.log(`[EmailParser] Created draft ${recordType} record #${result.insertId} for church ${churchId}`);
  return result.insertId;
}

module.exports = {
  processEmailWithOMAI,
  extractStructuredData,
  buildEmailParsingPrompt,
};
