import { config } from '../config/index.js';
import { retry, randomDelay, saveToFile, formatDate } from '../utils/index.js';
import BrowserService from '../services/browser.js';

class SalesNavigatorScraper {
  constructor() {
    this.browser = new BrowserService();
  }

  /**
   * Navigate to Sales Navigator
   * @returns {Promise<void>}
   */
  async navigateToSalesNavigator() {
    console.log('Navigating to Sales Navigator...');
    const page = this.browser.getPage();
    await retry(async () => {
      await page.goto(config.SALES_NAV_URL, { 
        waitUntil: 'networkidle2', 
        timeout: config.TIMEOUT 
      });
    });
  }

  /**
   * Wait for filters to load
   * @returns {Promise<void>}
   */
  async waitForFilters() {
    const page = this.browser.getPage();
    await retry(async () => {
      await page.waitForSelector('button[aria-label*="Add filter"], .search-filters-bar', { 
        timeout: config.TIMEOUT 
      });
    });
  }

  /**
   * Get all available filter options
   * @returns {Promise<import('../types').FilterOption[]>}
   */
  async getFilterOptions() {
    const page = this.browser.getPage();
    const results = {};
    
    // Find all filter buttons
    let filterLabels = await page.$$eval(
      'button',
      btns => btns
        .filter(btn => btn.innerText && btn.offsetParent !== null && !/add filter|clear all|advanced/i.test(btn.innerText))
        .map(btn => btn.innerText.trim())
    );

    filterLabels = [...new Set(filterLabels)];

    for (const filterLabel of filterLabels) {
      try {
        console.log(`Processing filter: ${filterLabel}`);
        const [filterButton] = await page.$x(`//button[contains(., "${filterLabel}")]`);
        if (!filterButton) {
          console.log(`Filter "${filterLabel}" not found.`);
          continue;
        }

        await retry(async () => {
          await filterButton.click();
          await randomDelay();

          const options = await page.$$eval(
            'div[role="listbox"] [role="option"], div[role="listbox"] li',
            els => els.map(el => el.textContent.trim()).filter(Boolean)
          );

          await page.click('body');
          await randomDelay(500, 1000);

          results[filterLabel] = options;
          console.log(`${filterLabel}: Found ${options.length} options`);
        });
      } catch (err) {
        console.error(`Error scraping filter "${filterLabel}":`, err);
      }
    }

    return results;
  }

  /**
   * Run the scraper
   * @returns {Promise<import('../types').FilterOption[]>}
   */
  async scrape() {
    try {
      await this.browser.initialize();
      await this.navigateToSalesNavigator();
      await this.waitForFilters();
      
      const results = await this.getFilterOptions();
      
      // Save results
      const filename = `filters_${formatDate()}.json`;
      await saveToFile(results, filename);
      
      return results;
    } catch (err) {
      console.error('Scraping failed:', err);
      throw err;
    } finally {
      await this.browser.close();
    }
  }
}

export default SalesNavigatorScraper; 