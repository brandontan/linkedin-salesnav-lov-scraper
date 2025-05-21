import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { config } from '../config/index.js';

puppeteer.use(StealthPlugin());

class BrowserService {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize the browser instance
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log('Launching browser...');
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ],
      defaultViewport: null,
      ignoreHTTPSErrors: true
    });

    this.page = await this.browser.newPage();
    
    // Set viewport and user agent
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Set the li_at cookie for LinkedIn authentication
    await this.page.setCookie({
      name: 'li_at',
      value: config.LI_AT,
      domain: '.linkedin.com',
      httpOnly: true,
      secure: true
    });
  }

  /**
   * Close the browser instance
   * @returns {Promise<void>}
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Get the current page instance
   * @returns {import('puppeteer').Page}
   */
  getPage() {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    return this.page;
  }
}

export default BrowserService; 