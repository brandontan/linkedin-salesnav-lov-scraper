import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} attempts - Number of retry attempts
 * @returns {Promise<any>}
 */
export const retry = async (fn, attempts = config.RETRY_ATTEMPTS) => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      console.log(`Attempt ${i + 1} failed, retrying in ${config.RETRY_DELAY}ms...`);
      await sleep(config.RETRY_DELAY);
    }
  }
};

/**
 * Save data to a JSON file
 * @param {any} data - Data to save
 * @param {string} filename - Output filename
 * @returns {Promise<string>} Path to saved file
 */
export const saveToFile = async (data, filename) => {
  try {
    await fs.mkdir(config.OUTPUT_DIR, { recursive: true });
    const filePath = path.join(config.OUTPUT_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filePath}`);
    return filePath;
  } catch (err) {
    console.error('Error saving file:', err);
    throw err;
  }
};

/**
 * Generate a random delay between min and max milliseconds
 * @param {number} min - Minimum delay in milliseconds
 * @param {number} max - Maximum delay in milliseconds
 * @returns {Promise<void>}
 */
export const randomDelay = async (min = 1000, max = 3000) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await sleep(delay);
};

/**
 * Format a date for use in filenames
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date = new Date()) => {
  return date.toISOString().replace(/[:.]/g, '-');
}; 