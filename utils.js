// utils.js
// Utility functions for the Instagram scraper

const config = require('./config');

/**
 * Create proxy authentication string
 * @returns {Object} - auth object with username and password
 */
function createProxyAuth() {
  return {
    username: `${config.auth.username}-session-${config.proxy.session_id}`,
    password: config.auth.password
  };
}

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Time to sleep in milliseconds
 * @returns {Promise} - Resolves after the specified time
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format a date in ISO format
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Formatted date string
 */
function formatDate(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Parse a count string (e.g., "1.5K", "2M") into a number
 * @param {string} countStr - Count string to parse
 * @returns {number} - Parsed number
 */
function parseCount(countStr) {
  if (!countStr) return 0;
  
  countStr = countStr.toLowerCase().trim().replace(',', '');
  
  if (countStr.includes('k')) {
    return Math.round(parseFloat(countStr.replace('k', '')) * 1000);
  } else if (countStr.includes('m')) {
    return Math.round(parseFloat(countStr.replace('m', '')) * 1000000);
  }
  
  return parseInt(countStr, 10) || 0;
}

/**
 * Validate Instagram username format
 * @param {string} username - Username to validate
 * @returns {boolean} - Whether username is valid
 */
function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  
  // Instagram usernames allow letters, numbers, periods and underscores
  // They cannot start with a period and cannot have consecutive periods
  const regex = /^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,29}$/;
  return regex.test(username);
}

/**
 * Handle errors in a consistent way
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @returns {Object} - Standardized error response
 */
function handleError(error, context) {
  const errorResponse = {
    success: false,
    error: {
      message: error.message || 'Unknown error occurred',
      context: context || 'unknown',
      timestamp: new Date().toISOString()
    }
  };
  
  console.error(`Error in ${context}:`, error.message);
  
  return errorResponse;
}

module.exports = {
  createProxyAuth,
  sleep,
  formatDate,
  parseCount,
  isValidUsername,
  handleError
};