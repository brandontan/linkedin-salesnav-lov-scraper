/**
 * @typedef {Object} ScraperConfig
 * @property {string} LI_AT - LinkedIn authentication cookie
 * @property {string} SALES_NAV_URL - LinkedIn Sales Navigator URL
 * @property {boolean} HEADLESS - Whether to run browser in headless mode
 * @property {Object} VIEWPORT - Browser viewport settings
 * @property {string} USER_AGENT - Browser user agent
 * @property {number} TIMEOUT - Default timeout for operations
 * @property {number} RETRY_ATTEMPTS - Number of retry attempts
 * @property {number} RETRY_DELAY - Delay between retries
 * @property {number} PAGE_LOAD_DELAY - Delay after page load
 * @property {string} OUTPUT_DIR - Directory for output files
 * @property {string[]} BROWSER_ARGS - Browser launch arguments
 */

/**
 * @typedef {Object} FilterOption
 * @property {string} label - Filter label
 * @property {string[]} options - Available options for the filter
 */

/**
 * @typedef {Object} SearchResult
 * @property {string} name - Person's name
 * @property {string} title - Job title
 * @property {string} company - Company name
 * @property {string} location - Location
 * @property {string} profileUrl - LinkedIn profile URL
 */

export {}; 