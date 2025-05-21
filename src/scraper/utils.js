import fs from 'fs/promises';
import path from 'path';
import { config } from './config.js';

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

export const randomDelay = async (min = 1000, max = 3000) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await sleep(delay);
};

export const formatDate = (date = new Date()) => {
  return date.toISOString().replace(/[:.]/g, '-');
}; 