# LinkedIn Lead Generation System

A simplified system for generating and managing leads from LinkedIn job postings, optimized for small to medium-sized companies looking to hire full-stack developers.

## Features

- Automated LinkedIn job posting scraping
- Company enrichment with AnyMailFinder
- Contact discovery and validation
- Lead scoring system
- Daily CSV exports for Instantly

## Architecture

The system consists of three main components:

1. **Scraper**: Collects job postings from LinkedIn
2. **Enrichment**: Processes companies and finds contacts
3. **Export**: Generates CSV files for Instantly

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/leads
   ANYMAILFINDER_API_KEY=your_api_key
   ```

3. Initialize the database:
   ```bash
   psql -U your_user -d your_database -f src/db/schema.sql
   ```

## Usage

1. Run the scraper:
   ```bash
   npm run scrape
   ```

2. Run enrichment:
   ```bash
   npm run enrich
   ```

3. Generate exports:
   ```bash
   npm run export
   ```

## Data Flow

1. LinkedIn job postings are scraped and stored in `job_listings`
2. Companies are enriched with additional data and stored in `companies`
3. Contacts are discovered and scored, stored in `contacts`
4. Qualified leads are exported to CSV for Instantly

## Lead Scoring

Leads are scored based on:
- Title (CTO: 25, Founder: 20, Head of Engineering: 15, Lead: 10)
- LinkedIn presence (+10)
- Email verification (+5)

Only leads with scores >= 50 are exported.

## Monthly Costs

- AnyMailFinder: $49
- EC2: $10
- Other tools: $20-50

Total: ~$80-100/month

## Maintenance

- Run scraper daily
- Run enrichment after scraping
- Export leads daily
- Monitor database size and clean up old data as needed
