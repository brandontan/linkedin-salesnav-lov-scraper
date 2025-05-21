import SalesNavigatorScraper from './salesNavigator.js';
import { config } from './config.js';

async function main() {
  try {
    if (!config.LI_AT) {
      console.error('Please set your LI_AT cookie in the .env file');
      process.exit(1);
    }

    const scraper = new SalesNavigatorScraper();
    const results = await scraper.scrape();
    console.log('Scraping completed successfully!');
  } catch (err) {
    console.error('Scraping failed:', err);
    process.exit(1);
  }
}

main(); 