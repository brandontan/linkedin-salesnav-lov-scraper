import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { config } from './config.js';
import { retry, randomDelay, saveToFile, formatDate } from './utils.js';

puppeteer.use(StealthPlugin());

class SalesNavigatorScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('Launching browser...');
    this.browser = await puppeteer.launch({
      headless: config.HEADLESS,
      args: config.BROWSER_ARGS
    });

    this.page = await this.browser.newPage();
    
    // Set viewport and user agent
    await this.page.setViewport(config.VIEWPORT);
    await this.page.setUserAgent(config.USER_AGENT);

    // Set the li_at cookie for LinkedIn authentication
    await this.page.setCookie({
      name: 'li_at',
      value: config.LI_AT,
      domain: '.linkedin.com',
      httpOnly: true,
      secure: true
    });
  }

  async navigateToSalesNavigator() {
    console.log('Navigating to Sales Navigator...');
    await retry(async () => {
      await this.page.goto(config.SALES_NAV_URL, { 
        waitUntil: 'networkidle2', 
        timeout: config.TIMEOUT 
      });
    });
  }

  async waitForFilters() {
    await retry(async () => {
      await this.page.waitForSelector('button[aria-label*="Add filter"], .search-filters-bar', { 
        timeout: config.TIMEOUT 
      });
    });
  }

  async getFilterOptions() {
    const results = {};
    
    // Find all filter buttons
    let filterLabels = await this.page.$$eval(
      'button',
      btns => btns
        .filter(btn => btn.innerText && btn.offsetParent !== null && !/add filter|clear all|advanced/i.test(btn.innerText))
        .map(btn => btn.innerText.trim())
    );

    filterLabels = [...new Set(filterLabels)];

    for (const filterLabel of filterLabels) {
      try {
        console.log(`Processing filter: ${filterLabel}`);
        const [filterButton] = await this.page.$x(`//button[contains(., "${filterLabel}")]`);
        if (!filterButton) {
          console.log(`Filter "${filterLabel}" not found.`);
          continue;
        }

        await retry(async () => {
          await filterButton.click();
          await randomDelay();

          const options = await this.page.$$eval(
            'div[role="listbox"] [role="option"], div[role="listbox"] li',
            els => els.map(el => el.textContent.trim()).filter(Boolean)
          );

          await this.page.click('body');
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

  async scrape() {
    try {
      await this.initialize();
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
      if (this.browser) await this.browser.close();
    }
  }
}

export default SalesNavigatorScraper; 