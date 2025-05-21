import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * @type {import('../types').ScraperConfig}
 */
export const config = {
  // LinkedIn Authentication
  LI_AT: process.env.LI_AT,
  
  // URLs
  SALES_NAV_URL: 'https://www.linkedin.com/sales/search/people',
  
  // Browser Settings
  HEADLESS: process.env.HEADLESS !== 'false',
  VIEWPORT: {
    width: 1920,
    height: 1080
  },
  USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  
  // Timeouts and Delays
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000,
  PAGE_LOAD_DELAY: 2000,
  
  // Output Settings
  OUTPUT_DIR: path.join(__dirname, '../../output'),
  
  // Browser Launch Arguments
  BROWSER_ARGS: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920,1080'
  ]
}; 