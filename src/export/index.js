const { Pool } = require('pg');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');

class ContactExporter {
  constructor(dbConfig, exportConfig) {
    this.pool = new Pool(dbConfig);
    this.exportConfig = exportConfig;
  }

  async exportContacts() {
    try {
      const contacts = await this.getQualifiedContacts();
      
      if (contacts.length === 0) {
        console.log('No new contacts to export');
        return [];
      }

      await this.writeToCsv(contacts);
      await this.markAsExported(contacts);
      
      return contacts;
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }

  async getQualifiedContacts() {
    const { rows } = await this.pool.query(`
      SELECT 
        c.email,
        c.first_name,
        c.last_name,
        co.name as company,
        c.first_line,
        c.lead_score
      FROM contacts c
      JOIN companies co ON c.company_id = co.id
      WHERE c.exported = false
      AND c.lead_score >= $1
      ORDER BY c.lead_score DESC
    `, [this.exportConfig.minLeadScore]);
    
    return rows;
  }

  async writeToCsv(contacts) {
    const csvWriter = createCsvWriter({
      path: this.getExportPath(),
      header: [
        { id: 'email', title: 'Email' },
        { id: 'firstName', title: 'First Name' },
        { id: 'lastName', title: 'Last Name' },
        { id: 'company', title: 'Company' },
        { id: 'firstLine', title: 'First Line' },
        { id: 'leadScore', title: 'Lead Score' }
      ]
    });

    await csvWriter.writeRecords(contacts);
  }

  getExportPath() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(
      this.exportConfig.exportDir,
      `leads-${date}.csv`
    );
  }

  async markAsExported(contacts) {
    const contactIds = contacts.map(c => c.id);
    await this.pool.query(
      'UPDATE contacts SET exported = true WHERE id = ANY($1)',
      [contactIds]
    );
  }
}

// Export for testing
module.exports = ContactExporter;

// Only run if called directly
if (require.main === module) {
  require('dotenv').config();
  
  const exporter = new ContactExporter(
    { connectionString: process.env.DATABASE_URL },
    {
      minLeadScore: 50,
      exportDir: path.join(__dirname, '../../exports')
    }
  );

  exporter.exportContacts()
    .then(contacts => console.log(`Exported ${contacts.length} contacts`))
    .catch(console.error);
} 