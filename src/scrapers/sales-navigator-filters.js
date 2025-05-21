const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class SalesNavigatorFilters {
  constructor(options = {}) {
    this.options = {
      headless: options.headless ?? true,
      slowMo: options.slowMo ?? 100,
      timeout: options.timeout ?? 60000,
      userAgent: options.userAgent ?? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      sessionCookie: options.sessionCookie ?? null,
      salesNavigatorUrl: 'https://www.linkedin.com/sales/search/people' // Direct URL
    };

    // Define the specific filters we want to capture
    this.targetFilters = [
      'Company Headcount',
      'Company Type',
      'Company Headquarters Location',
      'Function',
      'Current Job Title',
      'Seniority Level',
      'Geography',
      'Industry',
      'Posted on LinkedIn'
    ];
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
          '--window-size=1920x1080',
          '--disable-blink-features=AutomationControlled'
        ],
        slowMo: this.options.slowMo
      });

      // Add stealth scripts
      const page = await this.browser.newPage();
      await page.evaluateOnNewDocument(() => {
        // Overwrite the 'navigator.webdriver' property to prevent detection
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });

        // Add language and platform
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        });

        // Add plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5]
        });
      });
      await page.close();

      console.log('Browser initialized successfully');
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  async randomDelay(min = 1000, max = 3000) {
    if (!this.options.randomDelay) return;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
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

  async setSessionCookie(page) {
    if (!this.options.sessionCookie) {
      throw new Error('Session cookie is required');
    }

    try {
      // Parse the session cookie
      const cookie = typeof this.options.sessionCookie === 'string' 
        ? JSON.parse(this.options.sessionCookie)
        : this.options.sessionCookie;

      // Set the cookie
      await page.setCookie(cookie);
      await this.randomDelay(2000, 4000);
      console.log('Session cookie set successfully');
    } catch (error) {
      console.error('Error setting session cookie:', error);
      throw error;
    }
  }

  async getFilters() {
    let page;
    try {
      page = await this.browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(this.options.userAgent);

      // Set session cookie
      await this.setSessionCookie(page);

      // Navigate directly to Sales Navigator with retry logic
      console.log('Navigating to Sales Navigator...');
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          await page.goto(this.options.salesNavigatorUrl, {
            waitUntil: 'domcontentloaded', // Changed from networkidle0 to be less strict
            timeout: this.options.timeout
          });
          
          // Check if we're on the login page
          const isLoginPage = await page.evaluate(() => {
            return document.querySelector('form[action*="login"]') !== null;
          });
          
          if (isLoginPage) {
            throw new Error('Redirected to login page - session cookie may be invalid');
          }
          
          break; // If we get here, navigation was successful
        } catch (error) {
          retryCount++;
          console.log(`Navigation attempt ${retryCount} failed:`, error.message);
          
          if (retryCount === maxRetries) {
            throw new Error(`Failed to navigate after ${maxRetries} attempts: ${error.message}`);
          }
          
          // Wait before retrying
          await this.randomDelay(5000, 10000);
        }
      }

      // Add random delay after navigation
      await this.randomDelay(3000, 5000);

      // Wait for filters to load with increased timeout and retry logic
      console.log('Waiting for filters to load...');
      retryCount = 0;
      
      while (retryCount < maxRetries) {
        try {
          await page.waitForSelector('.search-filters', { 
            timeout: this.options.timeout,
            visible: true 
          });
          break;
        } catch (error) {
          retryCount++;
          console.log(`Waiting for filters attempt ${retryCount} failed:`, error.message);
          
          if (retryCount === maxRetries) {
            throw new Error(`Failed to find filters after ${maxRetries} attempts: ${error.message}`);
          }
          
          // Wait before retrying
          await this.randomDelay(5000, 10000);
        }
      }

      // Add random delay before extracting filters
      await this.randomDelay(2000, 4000);

      // Extract filters with conservative approach
      console.log('Extracting filters...');
      const filters = await page.evaluate((targetFilters) => {
        const filterData = {};
        
        // Get all filter sections
        const filterSections = document.querySelectorAll('.search-filters__filter-group');
        console.log(`Found ${filterSections.length} filter sections`);
        
        if (filterSections.length === 0) {
          throw new Error('No filter sections found - page may not be loaded correctly');
        }
        
        filterSections.forEach(section => {
          const filterName = section.querySelector('.search-filters__filter-group-title')?.innerText?.trim();
          console.log(`Processing filter: ${filterName}`);
          
          // Only process if it's one of our target filters
          if (!filterName || !targetFilters.includes(filterName)) {
            console.log(`Skipping non-target filter: ${filterName}`);
            return;
          }

          const values = [];
          const valueElements = section.querySelectorAll('.search-filters__filter-option');
          console.log(`Found ${valueElements.length} values for ${filterName}`);
          
          valueElements.forEach(element => {
            const value = element.querySelector('.search-filters__filter-option-label')?.innerText?.trim();
            if (value) {
              values.push(value);
            }
          });

          if (values.length > 0) {
            filterData[filterName] = values;
            console.log(`Added ${values.length} values for ${filterName}`);
          }
        });

        return filterData;
      }, this.targetFilters);

      // Add random delay after extraction
      await this.randomDelay(2000, 4000);

      // Ensure all target filters are present in the response
      const result = {};
      this.targetFilters.forEach(filter => {
        result[filter] = filters[filter] || [];
        console.log(`Filter ${filter} has ${result[filter].length} values`);
      });

      // Verify we got at least some data
      const totalValues = Object.values(result).reduce((sum, values) => sum + values.length, 0);
      if (totalValues === 0) {
        throw new Error('No filter values were extracted - page may not be loaded correctly');
      }

      return result;
    } catch (error) {
      console.error('Error getting filters:', error);
      throw error;
    } finally {
      if (page) {
        await this.randomDelay(1000, 2000);
        await page.close();
      }
    }
  }

  async saveFiltersToFile(filters, format = 'json') {
    const outputDir = path.join(__dirname, '../../output');
    try {
      await fs.mkdir(outputDir, { recursive: true });
      
      if (format === 'json') {
        const jsonPath = path.join(outputDir, 'linkedin-filters.json');
        await fs.writeFile(jsonPath, JSON.stringify(filters, null, 2));
        console.log(`Filters saved to ${jsonPath}`);
      } else if (format === 'csv') {
        const csvPath = path.join(outputDir, 'linkedin-filters.csv');
        const csvContent = Object.entries(filters)
          .map(([filter, values]) => {
            return values.map(value => `${filter},"${value}"`).join('\n');
          })
          .join('\n');
        await fs.writeFile(csvPath, 'Filter,Value\n' + csvContent);
        console.log(`Filters saved to ${csvPath}`);
      }
    } catch (error) {
      console.error('Error saving filters to file:', error);
      throw error;
    }
  }
}

// Export for testing
module.exports = SalesNavigatorFilters;

// Only run if called directly
if (require.main === module) {
  require('dotenv').config();
  
  if (!process.env.LI_AT) {
    console.error('Error: LI_AT environment variable is required');
    process.exit(1);
  }

  const sessionCookie = {
    name: 'li_at',
    value: process.env.LI_AT,
    domain: '.www.linkedin.com',
    path: '/'
  };

  const filterScraper = new SalesNavigatorFilters({
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.SLOW_MO) || 100,
    timeout: parseInt(process.env.TIMEOUT) || 60000,
    sessionCookie: sessionCookie
  });

  async function run() {
    try {
      await filterScraper.initialize();
      const filters = await filterScraper.getFilters();
      
      // Save in both formats
      await filterScraper.saveFiltersToFile(filters, 'json');
      await filterScraper.saveFiltersToFile(filters, 'csv');
      
      console.log('Available filters:', JSON.stringify(filters, null, 2));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      await filterScraper.close();
    }
  }

  run();
} 