import fs from 'fs';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin);

const LI_AT = 'PASTE_YOUR_li_at_HERE';
const SALES_NAV_URL = 'https://www.linkedin.com/sales/search/people';

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.setCookie({
      name: 'li_at',
      value: LI_AT,
      domain: '.linkedin.com',
      httpOnly: true,
      secure: true
    });

    await page.goto(SALES_NAV_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('button[aria-label*="Add filter"], .search-filters-bar', { timeout: 20000 });

    let filterLabels = await page.$$eval(
      'button',
      btns => btns
        .filter(btn => btn.innerText && btn.offsetParent !== null && !/add filter|clear all|advanced/i.test(btn.innerText))
        .map(btn => btn.innerText.trim())
    );
    filterLabels = [...new Set(filterLabels)];

    const results = {};

    for (const filterLabel of filterLabels) {
      try {
        console.log(`Scraping filter: ${filterLabel}`);
        const [filterButton] = await page.$x(`//button[contains(., "${filterLabel}")]`);
        if (!filterButton) {
          console.log(`Filter "${filterLabel}" not found.`);
          continue;
        }
        await filterButton.click();
        await page.waitForTimeout(1000);

        const options = await page.$$eval(
          'div[role="listbox"] [role="option"], div[role="listbox"] li',
          els => els.map(el => el.textContent.trim()).filter(Boolean)
        );

        await page.click('body');
        await page.waitForTimeout(500);

        results[filterLabel] = options;
        console.log(`${filterLabel}:`, options);
      } catch (err) {
        console.error(`Error scraping filter "${filterLabel}":`, err);
      }
    }

    // Output as JSON
    const output = JSON.stringify(results, null, 2);
    console.log('---\nAll LOVs:', output);
    fs.writeFileSync('lovs.json', output);
    console.log('LOVs saved to lovs.json');
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    if (browser) await browser.close();
  }
})(); 