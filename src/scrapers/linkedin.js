const puppeteer = require('puppeteer');
const { Pool } = require('pg');

class LinkedInScraper {
  constructor(dbConfig, options = {}) {
    this.pool = new Pool(dbConfig);
    this.options = {
      headless: options.headless ?? true,
      slowMo: options.slowMo ?? 50,
      timeout: options.timeout ?? 30000,
      userAgent: options.userAgent ?? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    };
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: this.options.headless ? 'new' : false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ],
        slowMo: this.options.slowMo,
        executablePath: process.env.CHROME_PATH || undefined
      });

      console.log('Browser initialized successfully');
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
        console.log('Browser closed successfully');
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }
  }

  async scrapeJobs() {
    let page;
    try {
      page = await this.browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(this.options.userAgent);

      // Enable request interception
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        // Block unnecessary resources
        const blockedResources = ['image', 'stylesheet', 'font', 'media'];
        if (blockedResources.includes(request.resourceType())) {
          request.abort();
        } else {
          request.continue();
        }
      });

      console.log('Navigating to LinkedIn...');
      await page.goto('https://www.linkedin.com/jobs/search/?keywords=full%20stack%20developer&location=United%20States', {
        waitUntil: 'networkidle0',
        timeout: this.options.timeout
      });

      // Wait for job listings to load
      console.log('Waiting for job listings...');
      await page.waitForSelector('.jobs-search__results-list', { timeout: this.options.timeout });
      
      // Scroll to load more jobs
      await this.autoScroll(page);

      const jobs = await this.extractJobs(page);
      await this.saveJobs(jobs);
      
      return jobs;
    } catch (error) {
      console.error('Scraping error:', error);
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  async extractJobs(page) {
    return await page.evaluate(() => {
      const listings = document.querySelectorAll('.jobs-search__results-list > li');
      return Array.from(listings).map(job => {
        const title = job.querySelector('.job-card-list__title')?.innerText?.trim() || '';
        const company = job.querySelector('.job-card-container__company-name')?.innerText?.trim() || '';
        const location = job.querySelector('.job-card-container__metadata-item')?.innerText?.trim() || '';
        const link = job.querySelector('.job-card-list__title')?.href || '';
        
        return {
          title,
          company,
          location,
          link,
          scraped_at: new Date().toISOString()
        };
      });
    });
  }

  async saveJobs(jobs) {
    for (const job of jobs) {
      try {
        await this.pool.query(
          'INSERT INTO job_listings (title, company, location, link, scraped_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (link) DO NOTHING',
          [job.title, job.company, job.location, job.link, job.scraped_at]
        );
      } catch (error) {
        console.error(`Error saving job ${job.link}:`, error);
      }
    }
  }
}

// Export for testing
module.exports = LinkedInScraper;

// Only run if called directly
if (require.main === module) {
  require('dotenv').config();
  
  const scraper = new LinkedInScraper(
    { connectionString: process.env.DATABASE_URL },
    {
      headless: process.env.HEADLESS !== 'false',
      slowMo: 50,
      timeout: 30000
    }
  );

  async function run() {
    try {
      await scraper.initialize();
      const jobs = await scraper.scrapeJobs();
      console.log(`Scraped ${jobs.length} jobs`);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      await scraper.close();
    }
  }

  run();
} 