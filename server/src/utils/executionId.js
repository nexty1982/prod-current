/**
 * Workflow execution public identifiers — WEX_<ULID> / WEE_<ULID>
 * Matches ONB_<ULID> convention in onboardingId.js
 */
const crypto = require('crypto');
const { generateUlid } = require('./onboardingId');

function generateExecutionId() {
  return `WEX_${generateUlid()}`;
}

function generateEventId() {
  return `WEE_${generateUlid()}`;
}

function generateReconcileRunId() {
  return `WRC_${generateUlid()}`;
}

function churchSubjectId(churchId) {
  return `church:${churchId}`;
}

function ocrJobSubjectId(jobId) {
  return `job:${jobId}`;
}

function isValidExecutionId(id) {
  return typeof id === 'string' && /^WEX_[0-9A-HJKMNP-TV-Z]{26}$/.test(id);
}

function isValidEventId(id) {
  return typeof id === 'string' && /^WEE_[0-9A-HJKMNP-TV-Z]{26}$/.test(id);
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function buildDedupeKey(parts) {
  return sha256Hex(parts.filter((p) => p != null && p !== '').join('|'));
}

function definitionHashFromSteps(steps) {
  const keys = (steps || []).map((s) => s.step_key).sort().join(',');
  return sha256Hex(keys);
}

module.exports = {
  generateExecutionId,
  generateEventId,
  generateReconcileRunId,
  churchSubjectId,
  ocrJobSubjectId,
  isValidExecutionId,
  isValidEventId,
  sha256Hex,
  buildDedupeKey,
  definitionHashFromSteps,
};
