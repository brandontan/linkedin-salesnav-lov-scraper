const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const LI_AT = 'AQEFAQoBAAAAABXhhGsAAAGW7BhlLwAAAZcQJPQdVgAArXVybjpsaTplbnRlcnByaXNlQXV0aFRva2VuOmVKeGpaQUNCUnJYTllQcC93M1lRSlN5K1dZVVJ4Q2hmYXEwTlprUXRGQkJuWUFRQXB6Y0hPZz09XnVybjpsaTplbnRlcnByaXNlUHJvZmlsZToodXJuOmxpOmVudGVycHJpc2VBY2NvdW50Ojg0NjQwNTEsMTY3NDQ2MzEpXnVybjpsaTptZW1iZXI6ODM0ODg5JlwYhrTmyUBsNLazdGGz53gY4Mu7DxKvkdpVUM2o_ftT5SREbN0BvAB6NfuygGBTiKT2N6jLqhWAjOXUovnrKiYglFg2sh5ujijMGaMvp9YQ06k3Fii7TjYOJ_02zIZ8gqTUl3yNVkFrF1EZ9GEvMuuJO3cV2ly_vjhMXaxXWxXwCbTzPqkDr-7ZPWo_cn2TTOb52w';
const SALES_NAV_URL = 'https://www.linkedin.com/sales/search/people';

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // Set the li_at cookie for LinkedIn authentication
    await page.setCookie({
      name: 'li_at',
      value: LI_AT,
      domain: '.linkedin.com',
      httpOnly: true,
      secure: true
    });

    // Go to Sales Navigator search URL
    try {
      await page.goto(SALES_NAV_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (err) {
      console.error('Navigation error:', err);
      process.exit(1);
    }

    // Wait for the filters to load
    try {
      await page.waitForSelector('button[aria-label*="Add filter"], .search-filters-bar', { timeout: 20000 });
    } catch (err) {
      console.error('Could not find filter bar. Are you logged in? Is your li_at valid?', err);
      process.exit(1);
    }

    // Find all filter buttons (excluding "Add filter" and similar non-filter buttons)
    let filterLabels = await page.$$eval(
      'button',
      btns => btns
        .filter(btn => btn.innerText && btn.offsetParent !== null && !/add filter|clear all|advanced/i.test(btn.innerText))
        .map(btn => btn.innerText.trim())
    );

    // Remove duplicates
    filterLabels = [...new Set(filterLabels)];

    const results = {};

    for (const filterLabel of filterLabels) {
      try {
        // Find the button by its label
        const [filterButton] = await page.$x(`//button[contains(., "${filterLabel}")]`);
        if (!filterButton) {
          console.log(`Filter "${filterLabel}" not found.`);
          continue;
        }
        await filterButton.click();
        await page.waitForTimeout(1000);

        // Scrape the options
        const options = await page.$$eval(
          'div[role="listbox"] [role="option"], div[role="listbox"] li',
          els => els.map(el => el.textContent.trim()).filter(Boolean)
        );

        // Click outside to close the dropdown
        await page.click('body');
        await page.waitForTimeout(500);

        results[filterLabel] = options;
        console.log(`${filterLabel}:`, options);
      } catch (err) {
        console.error(`Error scraping filter "${filterLabel}":`, err);
      }
    }

    // Output as JSON
    console.log('---\nAll LOVs:', JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    if (browser) await browser.close();
  }
})(); 