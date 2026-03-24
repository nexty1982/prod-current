/**
 * OCR Language & Dictionary Controller
 * Language config, name dictionary, date formats, correction patterns.
 * OM Daily #39-#44, #51, #101, #102, #109, #110
 */
const { getAppPool } = require('../config/db');

// List supported OCR languages
async function listLanguages(req, res) {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query(
      'SELECT * FROM ocr_language_config WHERE enabled = 1 ORDER BY sort_order'
    );
    res.json({ success: true, languages: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get language config by code
async function getLanguage(req, res) {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query(
      'SELECT * FROM ocr_language_config WHERE language_code = ?',
      [req.params.code]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Language not found' });
    res.json({ success: true, language: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Add/update language config (admin)
async function upsertLanguage(req, res) {
  try {
    const pool = getAppPool();
    const { language_code, language_name, script_type, vision_api_hints, anchor_phrases, character_mapping, transliteration_rules, date_formats, enabled } = req.body;

    await pool.query(`
      INSERT INTO ocr_language_config (language_code, language_name, script_type, vision_api_hints, anchor_phrases, character_mapping, transliteration_rules, date_formats, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE language_name=VALUES(language_name), script_type=VALUES(script_type),
        vision_api_hints=VALUES(vision_api_hints), anchor_phrases=VALUES(anchor_phrases),
        character_mapping=VALUES(character_mapping), transliteration_rules=VALUES(transliteration_rules),
        date_formats=VALUES(date_formats), enabled=VALUES(enabled)
    `, [language_code, language_name, script_type || 'latin',
        JSON.stringify(vision_api_hints), JSON.stringify(anchor_phrases),
        JSON.stringify(character_mapping), JSON.stringify(transliteration_rules),
        JSON.stringify(date_formats), enabled !== false ? 1 : 0]);

    res.json({ success: true, message: `Language ${language_code} saved` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Search name dictionary
async function searchNames(req, res) {
  try {
    const pool = getAppPool();
    const { q, type, language, limit = 20 } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (q) { where += ' AND (name_value LIKE ? OR normalized_value LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    if (type) { where += ' AND name_type = ?'; params.push(type); }
    if (language) { where += ' AND language = ?'; params.push(language); }

    params.push(parseInt(limit));

    const [rows] = await pool.query(
      `SELECT * FROM ocr_name_dictionary ${where} ORDER BY frequency DESC LIMIT ?`, params
    );

    res.json({ success: true, names: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get name normalization suggestions
async function normalizeName(req, res) {
  try {
    const pool = getAppPool();
    const { name, type = 'first' } = req.query;

    if (!name) return res.status(400).json({ success: false, error: 'name parameter required' });

    // Exact match
    const [exact] = await pool.query(
      'SELECT normalized_value FROM ocr_name_dictionary WHERE name_type = ? AND name_value = ?',
      [type, name]
    );

    // Fuzzy match (LIKE)
    const [fuzzy] = await pool.query(
      'SELECT name_value, normalized_value, frequency FROM ocr_name_dictionary WHERE name_type = ? AND (name_value LIKE ? OR normalized_value LIKE ?) ORDER BY frequency DESC LIMIT 5',
      [type, `${name}%`, `${name}%`]
    );

    res.json({
      success: true,
      input: name,
      normalized: exact.length ? exact[0].normalized_value : null,
      suggestions: fuzzy,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Global correction dictionary
async function listGlobalCorrections(req, res) {
  try {
    const pool = getAppPool();
    const { record_type, field_name, limit = 50 } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    if (record_type) { where += ' AND record_type = ?'; params.push(record_type); }
    if (field_name) { where += ' AND field_name = ?'; params.push(field_name); }
    params.push(parseInt(limit));

    const [rows] = await pool.query(
      `SELECT * FROM ocr_global_corrections ${where} ORDER BY correction_count DESC LIMIT ?`, params
    );

    res.json({ success: true, corrections: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Add global correction
async function addGlobalCorrection(req, res) {
  try {
    const pool = getAppPool();
    const { record_type, field_name, incorrect_value, correct_value, source = 'manual' } = req.body;

    if (!record_type || !field_name || !incorrect_value || !correct_value) {
      return res.status(400).json({ success: false, error: 'record_type, field_name, incorrect_value, correct_value required' });
    }

    await pool.query(`
      INSERT INTO ocr_global_corrections (record_type, field_name, incorrect_value, correct_value, source)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE correction_count = correction_count + 1, correct_value = VALUES(correct_value)
    `, [record_type, field_name, incorrect_value, correct_value, source]);

    res.json({ success: true, message: 'Correction saved' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Date format patterns
async function listDateFormats(req, res) {
  try {
    const pool = getAppPool();
    const { language } = req.query;

    let where = '';
    const params = [];
    if (language) { where = 'WHERE language = ? OR language IS NULL'; params.push(language); }

    const [rows] = await pool.query(
      `SELECT * FROM ocr_date_formats ${where} ORDER BY priority`, params
    );

    res.json({ success: true, formats: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Template accuracy stats
async function getTemplateAccuracy(req, res) {
  try {
    const pool = getAppPool();
    const { template_id, church_id } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    if (template_id) { where += ' AND template_id = ?'; params.push(parseInt(template_id)); }
    if (church_id) { where += ' AND church_id = ?'; params.push(parseInt(church_id)); }

    const [rows] = await pool.query(
      `SELECT * FROM ocr_template_accuracy ${where} ORDER BY total_extractions DESC`, params
    );

    res.json({ success: true, accuracy: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  listLanguages, getLanguage, upsertLanguage,
  searchNames, normalizeName,
  listGlobalCorrections, addGlobalCorrection,
  listDateFormats, getTemplateAccuracy,
};
