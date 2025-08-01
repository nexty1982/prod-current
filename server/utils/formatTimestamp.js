const dayjs = require('dayjs');

/**
 * Format timestamp for backend logging and API responses
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(date) {
  if (!date) return '';
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Format timestamp for user-friendly display
 * @param {string|Date} date - Date to format
 * @returns {string} User-friendly formatted timestamp
 */
function formatTimestampUser(date) {
  if (!date) return '';
  return dayjs(date).format('MMM D, YYYY h:mm A');
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
function formatRelativeTime(date) {
  if (!date) return '';
  return dayjs(date).fromNow();
}

module.exports = {
  formatTimestamp,
  formatTimestampUser,
  formatRelativeTime
};