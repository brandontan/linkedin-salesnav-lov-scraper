import { chromium } from 'playwright';
import { logger } from '../../../utils/logger.js';
import { Prospect } from '../../../models/prospect.js';

/**
 * Configure and start a headless browser session for LinkedIn
 * @returns {Promise<Object>} Browser and page objects
 */
const setupBrowser = async () => {
  logger.info('Setting up browser for LinkedIn automation');
  
  // Launch browser with stealth mode to avoid detection
  const browser = await chromium.launch({ 
    headless: false, // Set to false for debugging, true for production
    slowMo: 100, // Slow down operations to avoid detection
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    // Add additional context options to avoid detection
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
  });
  
  // Add cookies if available from previous sessions
  // TODO: Implement cookie storage and retrieval
  
  const page = await context.newPage();
  
  // Add random delays to actions
  await page.route('**/*', async (route) => {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
    await route.continue();
  });
  
  return { browser, context, page };
};

/**
 * Login to LinkedIn Sales Navigator
 * @param {Object} page - Playwright page object
 * @returns {Promise<boolean>} Login success status
 */
const loginToLinkedIn = async (page) => {
  try {
    logger.info('Logging into LinkedIn Sales Navigator');
    
    // Navigate to LinkedIn login page
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle' });
    
    // Fill in login credentials
    await page.fill('#username', process.env.LINKEDIN_EMAIL);
    await page.fill('#password', process.env.LINKEDIN_PASSWORD);
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    
    // Check if login was successful
    const isLoggedIn = await page.evaluate(() => {
      return !document.querySelector('.login-form');
    });
    
    if (isLoggedIn) {
      logger.info('Successfully logged into LinkedIn');
      return true;
    } else {
      logger.error('Failed to login to LinkedIn');
      return false;
    }
  } catch (error) {
    logger.error('Error logging into LinkedIn:', error);
    return false;
  }
};

/**
 * Navigate to Sales Navigator search
 * @param {Object} page - Playwright page object
 * @returns {Promise<boolean>} Success status
 */
const navigateToSalesNavigator = async (page) => {
  try {
    logger.info('Navigating to LinkedIn Sales Navigator');
    
    // Go to Sales Navigator
    await page.goto(process.env.LINKEDIN_SALES_NAVIGATOR_URL, { waitUntil: 'networkidle' });
    
    // Check if we're on the Sales Navigator page
    const isSalesNavigator = await page.evaluate(() => {
      return window.location.href.includes('/sales');
    });
    
    if (isSalesNavigator) {
      logger.info('Successfully navigated to Sales Navigator');
      return true;
    } else {
      logger.error('Failed to navigate to Sales Navigator');
      return false;
    }
  } catch (error) {
    logger.error('Error navigating to Sales Navigator:', error);
    return false;
  }
};

/**
 * Search for prospects based on criteria
 * @param {Object} page - Playwright page object
 * @param {Object} searchCriteria - Search criteria
 * @returns {Promise<Array>} List of prospect URLs
 */
const searchProspects = async (page, searchCriteria = {}) => {
  try {
    logger.info('Searching for prospects in Sales Navigator', searchCriteria);
    
    // Navigate to search page
    await page.goto(`${process.env.LINKEDIN_SALES_NAVIGATOR_URL}/search/people`, { waitUntil: 'networkidle' });
    
    // Apply search filters
    if (searchCriteria.industries && searchCriteria.industries.length > 0) {
      await page.click('button:has-text("Industry")');
      for (const industry of searchCriteria.industries) {
        await page.click(`label:has-text("${industry}")`);
      }
      await page.click('button:has-text("Apply")');
    }
    
    if (searchCriteria.jobTitles && searchCriteria.jobTitles.length > 0) {
      await page.click('button:has-text("Title")');
      for (const title of searchCriteria.jobTitles) {
        await page.fill('input[placeholder="Add a title"]', title);
        await page.press('input[placeholder="Add a title"]', 'Enter');
      }
      await page.click('button:has-text("Apply")');
    }
    
    if (searchCriteria.locations && searchCriteria.locations.length > 0) {
      await page.click('button:has-text("Geography")');
      for (const location of searchCriteria.locations) {
        await page.fill('input[placeholder="Add a location"]', location);
        await page.press('input[placeholder="Add a location"]', 'Enter');
      }
      await page.click('button:has-text("Apply")');
    }
    
    // Submit search
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    
    // Extract prospect URLs from search results (limited by environment variable)
    const maxProspects = parseInt(process.env.MAX_DAILY_PROFILES) || 100;
    
    // Scroll through results to load more prospects
    let prospectUrls = [];
    let previousLength = 0;
    
    while (prospectUrls.length < maxProspects && prospectUrls.length !== previousLength) {
      previousLength = prospectUrls.length;
      
      // Extract prospect URLs
      const newUrls = await page.evaluate(() => {
        const links = [...document.querySelectorAll('a.search-results__result-link')];
        return links.map(link => link.href).filter(url => url.includes('/sales/lead/'));
      });
      
      // Add new URLs to the list
      for (const url of newUrls) {
        if (!prospectUrls.includes(url)) {
          prospectUrls.push(url);
        }
      }
      
      // Scroll to load more
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Wait for more results to load
      await page.waitForTimeout(2000);
      
      // Stop if we have enough prospects
      if (prospectUrls.length >= maxProspects) {
        break;
      }
    }
    
    logger.info(`Found ${prospectUrls.length} prospects`);
    return prospectUrls.slice(0, maxProspects);
  } catch (error) {
    logger.error('Error searching for prospects:', error);
    return [];
  }
};

/**
 * Extract prospect data from profile page
 * @param {Object} page - Playwright page object
 * @param {string} profileUrl - LinkedIn profile URL
 * @returns {Promise<Object>} Prospect data
 */
const extractProspectData = async (page, profileUrl) => {
  try {
    logger.info(`Extracting data from prospect profile: ${profileUrl}`);
    
    // Navigate to profile page
    await page.goto(profileUrl, { waitUntil: 'networkidle' });
    
    // Extract prospect information
    const prospectData = await page.evaluate(() => {
      // Basic info
      const nameElement = document.querySelector('.profile-topcard__title');
      const name = nameElement ? nameElement.textContent.trim() : '';
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ');
      
      const titleElement = document.querySelector('.profile-topcard__subtitle');
      const title = titleElement ? titleElement.textContent.trim() : '';
      
      const companyElement = document.querySelector('.profile-topcard__current-company');
      const company = companyElement ? companyElement.textContent.trim() : '';
      
      const locationElement = document.querySelector('.profile-topcard__location-data');
      const location = locationElement ? locationElement.textContent.trim() : '';
      
      // About section
      const aboutElement = document.querySelector('.profile-about__text');
      const about = aboutElement ? aboutElement.textContent.trim() : '';
      
      // Experience
      const experienceElements = document.querySelectorAll('.profile-experience__position');
      const experience = Array.from(experienceElements).map(el => {
        const titleEl = el.querySelector('.profile-position__title');
        const companyEl = el.querySelector('.profile-position__company-name');
        const dateRangeEl = el.querySelector('.profile-position__date-range');
        const descriptionEl = el.querySelector('.profile-position__description');
        
        return {
          title: titleEl ? titleEl.textContent.trim() : '',
          company: companyEl ? companyEl.textContent.trim() : '',
          dateRange: dateRangeEl ? dateRangeEl.textContent.trim() : '',
          description: descriptionEl ? descriptionEl.textContent.trim() : '',
        };
      });
      
      // Education
      const educationElements = document.querySelectorAll('.profile-education__school');
      const education = Array.from(educationElements).map(el => {
        const institutionEl = el.querySelector('.profile-education__school-name');
        const degreeEl = el.querySelector('.profile-education__degree');
        const dateRangeEl = el.querySelector('.profile-education__date-range');
        
        return {
          institution: institutionEl ? institutionEl.textContent.trim() : '',
          degree: degreeEl ? degreeEl.textContent.trim() : '',
          dateRange: dateRangeEl ? dateRangeEl.textContent.trim() : '',
        };
      });
      
      // Skills
      const skillElements = document.querySelectorAll('.profile-skills__skill');
      const skills = Array.from(skillElements).map(el => el.textContent.trim());
      
      return {
        firstName,
        lastName,
        title,
        company,
        location,
        about,
        experience,
        education,
        skills,
      };
    });
    
    // Add LinkedIn URL to the data
    prospectData.linkedinUrl = profileUrl;
    
    logger.info(`Successfully extracted data for prospect: ${prospectData.firstName} ${prospectData.lastName}`);
    return prospectData;
  } catch (error) {
    logger.error(`Error extracting prospect data from ${profileUrl}:`, error);
    return null;
  }
};

/**
 * Save prospect data to the database
 * @param {Object} prospectData - Prospect data
 * @returns {Promise<Object>} Saved prospect
 */
const saveProspectData = async (prospectData) => {
  try {
    // Check if prospect already exists
    let prospect = await Prospect.findOne({ linkedinUrl: prospectData.linkedinUrl });
    
    if (prospect) {
      // Update existing prospect
      logger.info(`Updating existing prospect: ${prospectData.firstName} ${prospectData.lastName}`);
      
      prospect.firstName = prospectData.firstName;
      prospect.lastName = prospectData.lastName;
      prospect.title = prospectData.title;
      prospect.company = prospectData.company;
      prospect.location = prospectData.location;
      prospect.about = prospectData.about;
      
      // Update experience
      if (prospectData.experience && prospectData.experience.length > 0) {
        prospect.experience = prospectData.experience.map(exp => {
          return {
            title: exp.title,
            company: exp.company,
            description: exp.description,
            // Parse date ranges
            // This is a simplified version - would need more robust parsing in production
            startDate: new Date(),
            endDate: exp.dateRange.includes('Present') ? null : new Date(),
            isCurrent: exp.dateRange.includes('Present'),
          };
        });
      }
      
      // Update education
      if (prospectData.education && prospectData.education.length > 0) {
        prospect.education = prospectData.education.map(edu => {
          // Parse date ranges
          const years = edu.dateRange.match(/\d{4}/g) || [];
          return {
            institution: edu.institution,
            degree: edu.degree,
            field: '',
            startYear: years[0] ? parseInt(years[0]) : null,
            endYear: years[1] ? parseInt(years[1]) : null,
          };
        });
      }
      
      // Update skills
      if (prospectData.skills && prospectData.skills.length > 0) {
        prospect.skills = prospectData.skills;
      }
      
      prospect.updatedAt = new Date();
      
      await prospect.save();
    } else {
      // Create new prospect
      logger.info(`Creating new prospect: ${prospectData.firstName} ${prospectData.lastName}`);
      
      prospect = new Prospect({
        linkedinUrl: prospectData.linkedinUrl,
        firstName: prospectData.firstName,
        lastName: prospectData.lastName,
        title: prospectData.title,
        company: prospectData.company,
        location: prospectData.location,
        about: prospectData.about,
        outreachStatus: 'new',
        
        // Format experience data
        experience: prospectData.experience ? prospectData.experience.map(exp => {
          return {
            title: exp.title,
            company: exp.company,
            description: exp.description,
            // Parse date ranges
            startDate: new Date(),
            endDate: exp.dateRange.includes('Present') ? null : new Date(),
            isCurrent: exp.dateRange.includes('Present'),
          };
        }) : [],
        
        // Format education data
        education: prospectData.education ? prospectData.education.map(edu => {
          // Parse date ranges
          const years = edu.dateRange.match(/\d{4}/g) || [];
          return {
            institution: edu.institution,
            degree: edu.degree,
            field: '',
            startYear: years[0] ? parseInt(years[0]) : null,
            endYear: years[1] ? parseInt(years[1]) : null,
          };
        }) : [],
        
        skills: prospectData.skills || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      await prospect.save();
    }
    
    return prospect;
  } catch (error) {
    logger.error('Error saving prospect data:', error);
    return null;
  }
};

/**
 * Main function to run the prospect data collection process
 * @param {Object} searchCriteria - Search criteria
 * @returns {Promise<Array>} Array of saved prospects
 */
export const runProspectDataCollection = async (searchCriteria = {}) => {
  let browser, context, page;
  const savedProspects = [];
  
  try {
    // Setup browser and login
    ({ browser, context, page } = await setupBrowser());
    
    // Login to LinkedIn
    const loginSuccess = await loginToLinkedIn(page);
    if (!loginSuccess) {
      throw new Error('Failed to login to LinkedIn');
    }
    
    // Navigate to Sales Navigator
    const navigationSuccess = await navigateToSalesNavigator(page);
    if (!navigationSuccess) {
      throw new Error('Failed to navigate to Sales Navigator');
    }
    
    // Search for prospects
    const prospectUrls = await searchProspects(page, searchCriteria);
    
    // Respect LinkedIn's rate limits and add randomization
    logger.info(`Processing ${prospectUrls.length} prospects with rate limiting`);
    
    for (let i = 0; i < prospectUrls.length; i++) {
      // Add random delay between profile visits (3-7 seconds)
      const delay = Math.floor(Math.random() * 4000) + 3000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Extract data from the profile
      const prospectData = await extractProspectData(page, prospectUrls[i]);
      
      if (prospectData) {
        // Save the prospect data to the database
        const savedProspect = await saveProspectData(prospectData);
        if (savedProspect) {
          savedProspects.push(savedProspect);
        }
      }
      
      // Log progress
      logger.info(`Processed ${i + 1}/${prospectUrls.length} prospects`);
      
      // Add longer pause every 10 profiles (20-40 seconds)
      if ((i + 1) % 10 === 0 && i + 1 < prospectUrls.length) {
        const longDelay = Math.floor(Math.random() * 20000) + 20000;
        logger.info(`Taking a longer break (${longDelay / 1000}s) to avoid detection`);
        await new Promise(resolve => setTimeout(resolve, longDelay));
      }
    }
    
    logger.info(`Successfully processed ${savedProspects.length} prospects`);
    return savedProspects;
  } catch (error) {
    logger.error('Error in prospect data collection process:', error);
    return savedProspects;
  } finally {
    // Close browser
    if (browser) {
      await browser.close();
    }
  }
};
