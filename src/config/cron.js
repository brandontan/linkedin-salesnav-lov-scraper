import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { runProspectDataCollection } from '../modules/outreach/services/linkedinService.js';
import { processEmailVerification } from '../modules/outreach/services/emailService.js';
import { processOutreachCampaigns } from '../modules/outreach/services/woodpeckerService.js';

export const setupCronJobs = () => {
  // Schedule LinkedIn prospect data collection - run daily at 1:00 AM
  cron.schedule('0 1 * * *', async () => {
    logger.info('Starting scheduled LinkedIn prospect data collection');
    try {
      await runProspectDataCollection();
      logger.info('Completed LinkedIn prospect data collection');
    } catch (error) {
      logger.error('Error in LinkedIn prospect data collection:', error);
    }
  });

  // Schedule email verification - run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Starting scheduled email verification process');
    try {
      await processEmailVerification();
      logger.info('Completed email verification process');
    } catch (error) {
      logger.error('Error in email verification process:', error);
    }
  });

  // Schedule outreach campaign processing - run daily at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    logger.info('Starting scheduled outreach campaign processing');
    try {
      await processOutreachCampaigns();
      logger.info('Completed outreach campaign processing');
    } catch (error) {
      logger.error('Error in outreach campaign processing:', error);
    }
  });

  logger.info('Cron jobs scheduled successfully');
};
