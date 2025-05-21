const { Pool } = require('pg');
const axios = require('axios');

class CompanyEnricher {
  constructor(dbConfig, anyMailFinderConfig) {
    this.pool = new Pool(dbConfig);
    this.anyMailFinderConfig = anyMailFinderConfig;
  }

  async enrichCompanies() {
    try {
      const jobs = await this.getUnprocessedJobs();
      
      for (const job of jobs) {
        const companyInfo = await this.getCompanyInfo(job.company);
        
        if (companyInfo) {
          const company = await this.saveCompany(companyInfo);
          const contacts = await this.getContacts(companyInfo.website);
          await this.saveContacts(company.id, contacts);
        }
      }
    } catch (error) {
      console.error('Enrichment error:', error);
      throw error;
    }
  }

  async getUnprocessedJobs() {
    const { rows } = await this.pool.query(
      'SELECT DISTINCT company FROM job_listings WHERE company NOT IN (SELECT name FROM companies)'
    );
    return rows;
  }

  async getCompanyInfo(companyName) {
    try {
      const response = await axios.get(
        `https://api.anymailfinder.com/v1/company/${encodeURIComponent(companyName)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.anyMailFinderConfig.apiKey}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error getting company info for ${companyName}:`, error);
      return null;
    }
  }

  async saveCompany(companyInfo) {
    const { rows: [company] } = await this.pool.query(
      'INSERT INTO companies (name, website, headcount, tech_stack) VALUES ($1, $2, $3, $4) RETURNING id',
      [companyInfo.name, companyInfo.website, companyInfo.headcount, companyInfo.techStack]
    );
    return company;
  }

  async getContacts(website) {
    try {
      const response = await axios.get(
        `https://api.anymailfinder.com/v1/contacts/${encodeURIComponent(website)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.anyMailFinderConfig.apiKey}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error getting contacts for ${website}:`, error);
      return [];
    }
  }

  async saveContacts(companyId, contacts) {
    for (const contact of contacts) {
      const leadScore = this.calculateLeadScore(contact);
      await this.pool.query(
        'INSERT INTO contacts (company_id, email, first_name, last_name, title, linkedin_url, lead_score) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [companyId, contact.email, contact.firstName, contact.lastName, contact.title, contact.linkedinUrl, leadScore]
      );
    }
  }

  calculateLeadScore(contact) {
    let score = 0;
    
    // Title-based scoring
    if (contact.title?.toLowerCase().includes('cto')) score += 25;
    else if (contact.title?.toLowerCase().includes('founder')) score += 20;
    else if (contact.title?.toLowerCase().includes('head of engineering')) score += 15;
    else if (contact.title?.toLowerCase().includes('lead')) score += 10;
    
    // LinkedIn presence
    if (contact.linkedinUrl) score += 10;
    
    // Email verification
    if (contact.email) score += 5;
    
    return score;
  }
}

// Export for testing
module.exports = CompanyEnricher;

// Only run if called directly
if (require.main === module) {
  require('dotenv').config();
  
  const enricher = new CompanyEnricher(
    { connectionString: process.env.DATABASE_URL },
    { apiKey: process.env.ANYMAILFINDER_API_KEY }
  );

  enricher.enrichCompanies()
    .then(() => console.log('Enrichment completed'))
    .catch(console.error);
} 