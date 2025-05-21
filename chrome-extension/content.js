// This file is intentionally empty as we're using the executeScript API
// The actual extraction logic is in popup.js 

class SalesNavigatorReader {
  constructor() {
    this.data = [];
    this.isReading = false;
    this.currentPage = 1;
    this.totalLeads = 0;
    this.maxPages = 100;
  }

  init() {
    this.addUIElements();
    if (this.isSavedSearchPage()) {
      this.loadData().then(hasData => {
        if (hasData) {
          this.updateStatus(`Found ${this.data.length} previously extracted leads`);
          chrome.runtime.sendMessage({ 
            type: 'progress', 
            count: this.data.length,
            completed: true
          });
        } else {
          this.updateStatus('Ready to read saved search');
        }
      });
    }
  }

  addUIElements() {
    const container = document.createElement('div');
    container.className = 'sn-reader-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      background: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      min-width: 250px;
    `;

    const controls = document.createElement('div');
    controls.style.marginBottom = '10px';

    const startButton = document.createElement('button');
    startButton.textContent = 'Start Reading';
    startButton.style.cssText = `
      padding: 8px 15px;
      margin-right: 10px;
      background: #0077b5;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    `;
    startButton.onclick = () => this.startReading();

    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export Data';
    exportButton.style.cssText = `
      padding: 8px 15px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    `;
    exportButton.onclick = () => this.exportData();

    controls.appendChild(startButton);
    controls.appendChild(exportButton);

    const status = document.createElement('div');
    status.id = 'sn-reader-status';
    status.style.cssText = `
      margin-top: 10px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 3px;
    `;

    const progress = document.createElement('div');
    progress.id = 'sn-reader-progress';
    progress.style.cssText = `
      margin-top: 10px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 3px;
      display: none;
    `;

    container.appendChild(controls);
    container.appendChild(status);
    container.appendChild(progress);
    document.body.appendChild(container);
  }

  isSavedSearchPage() {
    return window.location.href.includes('savedSearchId=');
  }

  async startReading() {
    if (this.isReading) return;
    this.isReading = true;
    this.data = [];
    this.currentPage = 1;
    this.totalLeads = 0;

    try {
      this.updateStatus('Starting to read search results...');
      this.showProgress();
      chrome.runtime.sendMessage({ type: 'status', message: 'Starting to read search results...' });

      while (this.currentPage <= this.maxPages) {
        await this.waitForResults();
        const pageData = await this.extractPageData();
        this.data.push(...pageData);
        this.totalLeads += pageData.length;
        this.updateProgress();
        await this.saveData();
        
        // Send progress update to popup
        chrome.runtime.sendMessage({ 
          type: 'progress', 
          count: this.data.length,
          completed: false
        });

        const nextButton = await this.findNextButton();
        if (!nextButton || nextButton.disabled) {
          const message = `Completed reading ${this.currentPage} pages`;
          this.updateStatus(message);
          chrome.runtime.sendMessage({ 
            type: 'status', 
            message: message 
          });
          chrome.runtime.sendMessage({ 
            type: 'progress', 
            count: this.data.length,
            completed: true
          });
          break;
        }

        const success = await this.clickNextPage(nextButton);
        if (!success) {
          const message = 'Failed to navigate to next page';
          this.updateStatus(message);
          chrome.runtime.sendMessage({ 
            type: 'status', 
            message: message 
          });
          break;
        }

        await this.delay(3000);
        this.currentPage++;
      }
    } catch (error) {
      console.error('Reading error:', error);
      const message = `Error: ${error.message}`;
      this.updateStatus(message);
      chrome.runtime.sendMessage({ 
        type: 'status', 
        message: message 
      });
    } finally {
      this.isReading = false;
    }
  }

  async extractPageData() {
    const leads = [];
    const leadElements = document.querySelectorAll('.search-results__result-item');

    for (const element of leadElements) {
      try {
        const lead = {
          linkedin_url: this.getElementHref(element, '.name'),
          full_name: this.getElementText(element, '.name'),
          first_name: this.getElementText(element, '.name').split(' ')[0],
          last_name: this.getElementText(element, '.name').split(' ').slice(1).join(' '),
          email: '', // Not available in basic view
          job_title: this.getElementText(element, '.title'),
          job_title_match: this.calculateMatch(this.getElementText(element, '.title')),
          company: this.getElementText(element, '.company'),
          company_size: this.getElementText(element, '.company-size'),
          company_size_match: this.calculateMatch(this.getElementText(element, '.company-size')),
          company_domain: this.extractDomain(this.getElementHref(element, '.company')),
          industry: this.getElementText(element, '.industry'),
          industry_match: this.calculateMatch(this.getElementText(element, '.industry')),
          salesnav_url: window.location.href,
          open_inmail: this.getElementText(element, '.inmail-status'),
          summary: this.getElementText(element, '.summary'),
          keyword_match: this.calculateMatch(this.getElementText(element, '.keywords')),
          company_city: this.getElementText(element, '.company-location').split(',')[0],
          company_region: this.getElementText(element, '.company-location').split(',')[1],
          company_country: this.getElementText(element, '.company-location').split(',')[2],
          contact_city: this.getElementText(element, '.location').split(',')[0],
          contact_region: this.getElementText(element, '.location').split(',')[1],
          contact_country: this.getElementText(element, '.location').split(',')[2],
          linkedin_company_url: this.getElementHref(element, '.company'),
          is_premium: this.getElementText(element, '.premium-badge') ? true : false,
          company_description: this.getElementText(element, '.company-description'),
          years_in_position: this.calculateYears(this.getElementText(element, '.position-duration')),
          months_in_position: this.calculateMonths(this.getElementText(element, '.position-duration')),
          year_in_company: this.calculateYears(this.getElementText(element, '.company-duration')),
          month_in_company: this.calculateMonths(this.getElementText(element, '.company-duration')),
          started_on_year: this.extractYear(this.getElementText(element, '.start-date')),
          started_on_month: this.extractMonth(this.getElementText(element, '.start-date'))
        };
        leads.push(lead);
      } catch (error) {
        console.error('Error extracting lead:', error);
      }
    }

    return leads;
  }

  getElementText(element, selector) {
    const el = element.querySelector(selector);
    return el ? el.textContent.trim() : '';
  }

  getElementHref(element, selector) {
    const el = element.querySelector(selector);
    return el ? el.href : '';
  }

  calculateMatch(text) {
    return text ? 'High' : 'Low';
  }

  extractDomain(url) {
    if (!url) return '';
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  calculateYears(duration) {
    if (!duration) return 0;
    const years = duration.match(/(\d+)\s*year/);
    return years ? parseInt(years[1]) : 0;
  }

  calculateMonths(duration) {
    if (!duration) return 0;
    const months = duration.match(/(\d+)\s*month/);
    return months ? parseInt(months[1]) : 0;
  }

  extractYear(date) {
    if (!date) return '';
    const year = date.match(/\d{4}/);
    return year ? year[0] : '';
  }

  extractMonth(date) {
    if (!date) return '';
    const month = date.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/);
    return month ? month[0] : '';
  }

  async waitForResults() {
    return new Promise((resolve) => {
      const checkResults = () => {
        if (document.querySelector('.search-results__result-item')) {
          resolve();
        } else {
          setTimeout(checkResults, 500);
        }
      };
      checkResults();
    });
  }

  async findNextButton() {
    const selectors = [
      '.next-button',
      'button[aria-label="Next"]',
      'button[data-control-name="next_page"]',
      'button[aria-label="Next page"]'
    ];

    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button) return button;
    }

    return null;
  }

  async clickNextPage(nextButton) {
    const maxRetries = 3;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.delay(1000);
        nextButton.click();
        await this.waitForPageLoad();
        return true;
      } catch (error) {
        console.error(`Click attempt ${i + 1} failed:`, error);
        await this.delay(2000);
      }
    }
    
    return false;
  }

  async waitForPageLoad() {
    return new Promise((resolve) => {
      const checkPageLoad = () => {
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (!loadingIndicator) {
          if (document.querySelector('.search-results__result-item')) {
            resolve();
          } else {
            setTimeout(checkPageLoad, 500);
          }
        } else {
          setTimeout(checkPageLoad, 500);
        }
      };
      checkPageLoad();
    });
  }

  updateProgress() {
    const progress = document.getElementById('sn-reader-progress');
    if (progress) {
      const currentPageLeads = this.data.length - this.totalLeads;
      progress.style.display = 'block';
      progress.innerHTML = `
        <div><strong>Page:</strong> ${this.currentPage}</div>
        <div><strong>Leads on this page:</strong> ${currentPageLeads}</div>
        <div><strong>Total leads:</strong> ${this.data.length}</div>
      `;
    }
  }

  showProgress() {
    const progress = document.getElementById('sn-reader-progress');
    if (progress) {
      progress.style.display = 'block';
    }
  }

  updateStatus(message) {
    const status = document.getElementById('sn-reader-status');
    if (status) {
      status.textContent = message;
    }
  }

  async saveData() {
    try {
      await chrome.storage.local.set({ 'extractedData': this.data });
      console.log('Data saved successfully:', this.data.length, 'leads');
    } catch (error) {
      console.error('Error saving data:', error);
      const message = `Error saving data: ${error.message}`;
      this.updateStatus(message);
      chrome.runtime.sendMessage({ type: 'status', message: message });
    }
  }

  async loadData() {
    try {
      const result = await chrome.storage.local.get('extractedData');
      if (result.extractedData) {
        this.data = result.extractedData;
        this.totalLeads = this.data.length;
        this.updateProgress();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading data:', error);
      return false;
    }
  }

  exportData() {
    try {
      if (!this.data || this.data.length === 0) {
        const message = 'No data to export. Please run the reader first.';
        this.updateStatus(message);
        chrome.runtime.sendMessage({ type: 'status', message: message });
        return;
      }

      const headers = [
        'linkedin_url', 'full_name', 'first_name', 'last_name', 'email',
        'job_title', 'job_title_match', 'company', 'company_size',
        'company_size_match', 'company_domain', 'industry', 'industry_match',
        'salesnav_url', 'open_inmail', 'summary', 'keyword_match',
        'company_city', 'company_region', 'company_country',
        'contact_city', 'contact_region', 'contact_country',
        'linkedin_company_url', 'is_premium', 'company_description',
        'years_in_position', 'months_in_position',
        'year_in_company', 'month_in_company',
        'started_on_year', 'started_on_month'
      ];

      const csvContent = [
        headers.join(','),
        ...this.data.map(lead => headers.map(header => this.escapeCsv(lead[header])).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkedin-leads-${new Date().toISOString()}.csv`;
      a.click();

      const message = `Successfully exported ${this.data.length} leads to CSV`;
      this.updateStatus(message);
      chrome.runtime.sendMessage({ type: 'status', message: message });
    } catch (error) {
      console.error('Export error:', error);
      const message = `Error exporting data: ${error.message}`;
      this.updateStatus(message);
      chrome.runtime.sendMessage({ type: 'status', message: message });
    }
  }

  escapeCsv(str) {
    if (!str) return '';
    return `"${str
      .replace(/"/g, '""')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\t/g, ' ')
      .trim()}"`;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize the reader
const reader = new SalesNavigatorReader();
reader.init();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startReading") {
    reader.startReading();
  } else if (request.action === "exportData") {
    reader.exportData();
  }
}); 