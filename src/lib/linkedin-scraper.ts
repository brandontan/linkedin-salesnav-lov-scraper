import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';

puppeteer.use(StealthPlugin());

interface LinkedInFilters {
  keywords: string[];
  title?: string;
  company?: string;
  location?: string;
  // Sales Navigator specific filters
  companyHeadcount?: {
    min?: number;
    max?: number;
  };
  companyType?: 'public' | 'private' | 'non-profit' | 'government' | 'educational';
  companyHeadquarters?: string;
  currentJobTitle?: string;
  personalGeography?: {
    country?: string;
    state?: string;
    city?: string;
    postalCode?: string;
  };
  industry?: string[];
  hasPostedOnLinkedIn?: boolean;
}

interface Prospect {
  full_name: string;
  job_title: string;
  company: string;
  linkedin_url: string;
  keyword_sources: string[];
  signal_score: number;
  company_details?: {
    headcount: string;
    type: string;
    headquarters: string;
    industry: string[];
    founded_year?: string;
    company_size?: string;
    company_type?: string;
    specialties?: string[];
    website?: string;
  };
  personal_details?: {
    location: {
      country: string;
      state: string;
      city: string;
    };
    hasPostedOnLinkedIn: boolean;
    connection_degree?: string;
    mutual_connections?: number;
    profile_views?: number;
    last_active?: string;
    skills?: string[];
    education?: {
      school: string;
      degree: string;
      field: string;
      year: string;
    }[];
    experience?: {
      title: string;
      company: string;
      duration: string;
      description: string;
    }[];
  };
}

export class LinkedInScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      ],
      defaultViewport: null,
      ignoreHTTPSErrors: true,
    });

    this.page = await this.browser.newPage();
    
    // Set viewport to a common resolution
    await this.page.setViewport({ 
      width: 1920, 
      height: 1080,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      isLandscape: true
    });

    // Enhanced browser fingerprint protection
    await this.page.evaluateOnNewDocument(() => {
      // Override navigator properties
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      
      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      // @ts-ignore - We know this is safe for our use case
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Add Chrome-specific properties
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };

      // Override WebGL fingerprinting
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.apply(this, [parameter]);
      };
    });

    // Add random delays between actions
    this.page.setDefaultNavigationTimeout(30000);
    this.page.setDefaultTimeout(30000);
  }

  private async simulateHumanBehavior() {
    if (!this.page) return;

    // Random mouse movements with natural acceleration/deceleration
    const viewport = await this.page.viewport();
    if (viewport) {
      const points = this.generateNaturalMousePath(viewport.width, viewport.height);
      for (const point of points) {
        await this.page.mouse.move(point.x, point.y);
        await this.randomDelay(50, 150);
      }
    }

    // Natural scrolling with variable speed
    await this.page.evaluate(() => {
      const scrollAmount = Math.floor(Math.random() * 300);
      const scrollSteps = Math.floor(Math.random() * 5) + 3;
      const stepSize = scrollAmount / scrollSteps;
      
      let currentStep = 0;
      const scrollInterval = setInterval(() => {
        if (currentStep >= scrollSteps) {
          clearInterval(scrollInterval);
          return;
        }
        window.scrollBy(0, stepSize);
        currentStep++;
      }, Math.random() * 100 + 50);
    });

    // Random pauses between actions
    await this.randomDelay(1000, 3000);
  }

  private generateNaturalMousePath(maxX: number, maxY: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const numPoints = Math.floor(Math.random() * 5) + 3;
    let currentX = Math.random() * maxX;
    let currentY = Math.random() * maxY;

    for (let i = 0; i < numPoints; i++) {
      // Generate next point with natural movement
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 100 + 50;
      currentX += Math.cos(angle) * distance;
      currentY += Math.sin(angle) * distance;

      // Keep within viewport bounds
      currentX = Math.max(0, Math.min(maxX, currentX));
      currentY = Math.max(0, Math.min(maxY, currentY));

      points.push({ x: currentX, y: currentY });
    }

    return points;
  }

  private async randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
    // Add some randomness to the delay itself
    const baseDelay = Math.floor(Math.random() * (max - min + 1)) + min;
    const jitter = Math.random() * 500 - 250; // Add ±250ms jitter
    const delay = Math.max(0, baseDelay + jitter);
    await this.delay(delay);
  }

  async login(email: string, password: string) {
    if (!this.page) throw new Error('Browser not initialized');

    // First login to regular LinkedIn
    await this.page.goto('https://www.linkedin.com/login');
    await this.randomDelay(2000, 4000);

    // Type email with human-like delays
    await this.page.type('#username', email, { delay: Math.random() * 100 + 50 });
    await this.randomDelay(1000, 2000);

    // Type password with human-like delays
    await this.page.type('#password', password, { delay: Math.random() * 100 + 50 });
    await this.randomDelay(1000, 2000);

    // Simulate human behavior before clicking
    await this.simulateHumanBehavior();

    await this.page.click('button[type="submit"]');
    await this.page.waitForNavigation();
    await this.randomDelay(3000, 5000);

    // Then navigate to Sales Navigator
    await this.page.goto('https://www.linkedin.com/sales');
    await this.randomDelay(3000, 5000);
  }

  async searchProspects(filters: LinkedInFilters): Promise<Prospect[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const searchUrl = this.buildSearchUrl(filters);
    await this.page.goto(searchUrl);
    await this.randomDelay(2000, 4000);

    const prospects: Prospect[] = [];
    let hasNextPage = true;
    let pageNum = 1;

    while (hasNextPage && pageNum <= 3) { // Limit to 3 pages for MVP
      await this.scrapeCurrentPage(prospects, filters.keywords);
      hasNextPage = await this.goToNextPage();
      pageNum++;
      await this.randomDelay(2000, 4000);
    }

    return this.calculateSignalScores(prospects, filters.keywords);
  }

  private buildSearchUrl(filters: LinkedInFilters): string {
    const baseUrl = 'https://www.linkedin.com/sales/search/people?';
    const params = new URLSearchParams();

    // Basic filters
    if (filters.keywords.length > 0) {
      params.append('keywords', filters.keywords.join(' '));
    }
    if (filters.title) params.append('title', filters.title);
    if (filters.company) params.append('company', filters.company);
    if (filters.location) params.append('location', filters.location);

    // Sales Navigator specific filters
    if (filters.companyHeadcount) {
      if (filters.companyHeadcount.min) {
        params.append('companyHeadcountMin', filters.companyHeadcount.min.toString());
      }
      if (filters.companyHeadcount.max) {
        params.append('companyHeadcountMax', filters.companyHeadcount.max.toString());
      }
    }

    if (filters.companyType) {
      params.append('companyType', filters.companyType);
    }

    if (filters.companyHeadquarters) {
      params.append('companyHeadquarters', filters.companyHeadquarters);
    }

    if (filters.currentJobTitle) {
      params.append('currentJobTitle', filters.currentJobTitle);
    }

    if (filters.personalGeography) {
      if (filters.personalGeography.country) {
        params.append('country', filters.personalGeography.country);
      }
      if (filters.personalGeography.state) {
        params.append('state', filters.personalGeography.state);
      }
      if (filters.personalGeography.city) {
        params.append('city', filters.personalGeography.city);
      }
      if (filters.personalGeography.postalCode) {
        params.append('postalCode', filters.personalGeography.postalCode);
      }
    }

    if (filters.industry && filters.industry.length > 0) {
      params.append('industry', filters.industry.join(','));
    }

    if (filters.hasPostedOnLinkedIn !== undefined) {
      params.append('hasPostedOnLinkedIn', filters.hasPostedOnLinkedIn.toString());
    }

    return baseUrl + params.toString();
  }

  private async scrapeCurrentPage(prospects: Prospect[], keywords: string[]) {
    if (!this.page) return;

    const profiles = await this.page.$$('.reusable-search__result-container');
    
    for (const profile of profiles) {
      // Simulate human behavior before interacting with each profile
      await this.simulateHumanBehavior();
      
      const prospect = await this.extractProfileData(profile, keywords);
      if (prospect) prospects.push(prospect);
      await this.randomDelay(1000, 3000);
    }
  }

  private async extractProfileData(element: any, keywords: string[]): Promise<Prospect | null> {
    try {
      const name = await element.$eval('.entity-result__title-text', (el: any) => el.textContent.trim());
      const jobTitle = await element.$eval('.entity-result__primary-subtitle', (el: any) => el.textContent.trim());
      const company = await element.$eval('.entity-result__secondary-subtitle', (el: any) => el.textContent.trim());
      const linkedinUrl = await element.$eval('a.app-aware-link', (el: any) => el.href);

      // Visit profile to get more details
      await this.page?.goto(linkedinUrl);
      await this.delay(2000);

      const keywordSources = await this.findKeywordSources(keywords);

      const companyDetails = await this.extractCompanyDetails();
      const personalDetails = await this.extractPersonalDetails();

      return {
        full_name: name,
        job_title: jobTitle,
        company,
        linkedin_url: linkedinUrl,
        keyword_sources: keywordSources,
        signal_score: 0, // Will be calculated later
        company_details: companyDetails,
        personal_details: personalDetails,
      };
    } catch (error) {
      console.error('Error extracting profile data:', error);
      return null;
    }
  }

  private async findKeywordSources(keywords: string[]): Promise<string[]> {
    if (!this.page) return [];

    const sources: string[] = [];
    const content = await this.page.evaluate(() => document.body.innerText);

    for (const keyword of keywords) {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        sources.push(keyword);
      }
    }

    return sources;
  }

  private calculateSignalScores(prospects: Prospect[], keywords: string[]): Prospect[] {
    return prospects.map(prospect => {
      let score = 0;
      const weights = {
        keywordPresence: 0.25,    // 25% - Keywords in profile
        titleRelevance: 0.20,     // 20% - Job title relevance
        companySize: 0.15,        // 15% - Company headcount
        activityLevel: 0.15,      // 15% - LinkedIn activity
        industryMatch: 0.10,      // 10% - Industry relevance
        skillsMatch: 0.10,        // 10% - Skills match
        experienceMatch: 0.05,    // 5% - Experience match
      };

      // Keyword presence score (25%)
      const keywordScore = (prospect.keyword_sources.length / keywords.length) * weights.keywordPresence * 100;
      score += keywordScore;

      // Job title relevance (20%)
      const titleScore = this.calculateTitleRelevance(prospect.job_title, keywords) * weights.titleRelevance * 100;
      score += titleScore;

      // Company size score (15%)
      const companySizeScore = this.calculateCompanySizeScore(prospect.company_details?.headcount) * weights.companySize * 100;
      score += companySizeScore;

      // Activity level score (15%)
      const activityScore = this.calculateActivityScore(prospect.personal_details) * weights.activityLevel * 100;
      score += activityScore;

      // Industry match score (10%)
      const industryScore = this.calculateIndustryScore(keywords, prospect.company_details?.industry) * weights.industryMatch * 100;
      score += industryScore;

      // Skills match score (10%)
      const skillsScore = this.calculateSkillsScore(keywords, prospect.personal_details?.skills) * weights.skillsMatch * 100;
      score += skillsScore;

      // Experience match score (5%)
      const experienceScore = this.calculateExperienceScore(keywords, prospect.personal_details?.experience) * weights.experienceMatch * 100;
      score += experienceScore;

      return {
        ...prospect,
        signal_score: Math.round(score * 100) / 100,
      };
    });
  }

  private calculateTitleRelevance(title: string, keywords: string[]): number {
    const titleLower = title.toLowerCase();
    const keywordMatches = keywords.filter(keyword => 
      titleLower.includes(keyword.toLowerCase())
    ).length;
    
    // More matches = higher score
    return Math.min(keywordMatches / keywords.length, 1);
  }

  private calculateCompanySizeScore(headcount?: string): number {
    if (!headcount) return 0.5; // Default score if unknown

    // Extract numeric value from headcount string (e.g., "1001-5000 employees" -> 3000)
    const match = headcount.match(/(\d+)/g);
    if (!match) return 0.5;

    const size = parseInt(match[0]);
    if (match.length > 1) {
      // If range, take average
      const avg = (parseInt(match[0]) + parseInt(match[1])) / 2;
      return Math.min(avg / 10000, 1); // Cap at 10,000 employees
    }

    return Math.min(size / 10000, 1); // Cap at 10,000 employees
  }

  private calculateActivityScore(details?: any): number {
    if (!details) return 0.5;

    let score = 0;
    const factors = {
      hasPosted: details.hasPostedOnLinkedIn ? 0.4 : 0,
      profileViews: Math.min((details.profile_views || 0) / 1000, 0.3),
      mutualConnections: Math.min((details.mutual_connections || 0) / 100, 0.3),
    };

    score = factors.hasPosted + factors.profileViews + factors.mutualConnections;
    return Math.min(score, 1);
  }

  private calculateIndustryScore(keywords: string[], industries?: string[]): number {
    if (!industries || industries.length === 0) return 0.5;

    const industryText = industries.join(' ').toLowerCase();
    const keywordMatches = keywords.filter(keyword => 
      industryText.includes(keyword.toLowerCase())
    ).length;

    return Math.min(keywordMatches / keywords.length, 1);
  }

  private calculateSkillsScore(keywords: string[], skills?: string[]): number {
    if (!skills || skills.length === 0) return 0.5;

    const skillsText = skills.join(' ').toLowerCase();
    const keywordMatches = keywords.filter(keyword => 
      skillsText.includes(keyword.toLowerCase())
    ).length;

    return Math.min(keywordMatches / keywords.length, 1);
  }

  private calculateExperienceScore(keywords: string[], experience?: any[]): number {
    if (!experience || experience.length === 0) return 0.5;

    const experienceText = experience
      .map(exp => `${exp.title} ${exp.company} ${exp.description}`)
      .join(' ')
      .toLowerCase();

    const keywordMatches = keywords.filter(keyword => 
      experienceText.includes(keyword.toLowerCase())
    ).length;

    return Math.min(keywordMatches / keywords.length, 1);
  }

  private async goToNextPage(): Promise<boolean> {
    if (!this.page) return false;

    const nextButton = await this.page.$('button.artdeco-pagination__button--next:not(:disabled)');
    if (!nextButton) return false;

    await nextButton.click();
    await this.delay(2000);
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  private async extractCompanyDetails(): Promise<any> {
    if (!this.page) return {};

    try {
      const companyUrl = await this.page.$eval('.pv-text-details__left-panel a', (el: any) => el.href);
      await this.page.goto(companyUrl);
      await this.randomDelay(2000, 4000);

      const details = await this.page.evaluate(() => {
        const headcountEl = document.querySelector('.org-about-company-module__company-size-definition-text');
        const typeEl = document.querySelector('.org-about-company-module__company-type-definition-text');
        const headquartersEl = document.querySelector('.org-about-company-module__headquarters');
        const industryEls = document.querySelectorAll('.org-about-company-module__industry');
        const foundedEl = document.querySelector('.org-about-company-module__founded');
        const specialtiesEls = document.querySelectorAll('.org-about-company-module__specialities');
        const websiteEl = document.querySelector('.org-about-us-company-module__website');

        return {
          headcount: headcountEl?.textContent?.trim() || '',
          type: typeEl?.textContent?.trim() || '',
          headquarters: headquartersEl?.textContent?.trim() || '',
          industry: Array.from(industryEls)
            .map(el => el.textContent?.trim() || '')
            .filter(text => text !== ''),
          founded_year: foundedEl?.textContent?.trim() || '',
          specialties: Array.from(specialtiesEls)
            .map(el => el.textContent?.trim() || '')
            .filter(text => text !== ''),
          website: websiteEl?.getAttribute('href') || '',
        };
      });

      return details;
    } catch (error) {
      console.error('Error extracting company details:', error);
      return {};
    }
  }

  private async extractPersonalDetails(): Promise<any> {
    if (!this.page) return {};

    try {
      const details = await this.page.evaluate(() => {
        const locationEl = document.querySelector('.pv-text-details__left-panel .text-body-small');
        const actionsEl = document.querySelector('.pv-top-card-section__actions');
        const connectionEl = document.querySelector('.pv-top-card-v2-section__connections');
        const viewsEl = document.querySelector('.pv-top-card-v2-section__views');
        const lastActiveEl = document.querySelector('.pv-top-card-v2-section__last-active');
        const skillsEls = document.querySelectorAll('.pv-skill-category-entity__name');
        const educationEls = document.querySelectorAll('.pv-education-entity');
        const experienceEls = document.querySelectorAll('.pv-experience-entity');

        const location = locationEl?.textContent?.trim() || '';
        const hasPostedOnLinkedIn = actionsEl?.textContent?.includes('Post') || false;
        const connectionDegree = connectionEl?.textContent?.trim() || '';
        const mutualConnections = parseInt(connectionEl?.textContent?.match(/\d+/)?.[0] || '0');
        const profileViews = parseInt(viewsEl?.textContent?.match(/\d+/)?.[0] || '0');
        const lastActive = lastActiveEl?.textContent?.trim() || '';

        const skills = Array.from(skillsEls)
          .map(el => el.textContent?.trim() || '')
          .filter(text => text !== '');

        const education = Array.from(educationEls).map(el => ({
          school: el.querySelector('.pv-entity__school-name')?.textContent?.trim() || '',
          degree: el.querySelector('.pv-entity__degree-name')?.textContent?.trim() || '',
          field: el.querySelector('.pv-entity__fos')?.textContent?.trim() || '',
          year: el.querySelector('.pv-entity__dates')?.textContent?.trim() || '',
        }));

        const experience = Array.from(experienceEls).map(el => ({
          title: el.querySelector('.pv-entity__role-details-container')?.textContent?.trim() || '',
          company: el.querySelector('.pv-entity__secondary-title')?.textContent?.trim() || '',
          duration: el.querySelector('.pv-entity__date-range')?.textContent?.trim() || '',
          description: el.querySelector('.pv-entity__description')?.textContent?.trim() || '',
        }));

        return {
          location: {
            country: location.split(',')[2]?.trim() || '',
            state: location.split(',')[1]?.trim() || '',
            city: location.split(',')[0]?.trim() || '',
          },
          hasPostedOnLinkedIn,
          connection_degree: connectionDegree,
          mutual_connections: mutualConnections,
          profile_views: profileViews,
          last_active: lastActive,
          skills,
          education,
          experience,
        };
      });

      return details;
    } catch (error) {
      console.error('Error extracting personal details:', error);
      return {};
    }
  }
} 