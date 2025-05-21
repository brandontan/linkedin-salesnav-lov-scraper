import { findYEmailClient } from '../../../utils/apiClient.js';
import { logger } from '../../../utils/logger.js';
import { Prospect } from '../../../models/prospect.js';

/**
 * Find a prospect's email using FindYEmail API
 * @param {string} firstName - Prospect's first name
 * @param {string} lastName - Prospect's last name
 * @param {string} companyDomain - Company domain (e.g., 'company.com')
 * @returns {Promise<Object>} Email verification result
 */
export const findEmail = async (firstName, lastName, companyDomain) => {
  try {
    logger.info(`Finding email for ${firstName} ${lastName} at ${companyDomain}`);
    
    const client = findYEmailClient();
    
    // Make API request to FindYEmail
    const response = await client.get('/email-finder', {
      params: {
        first_name: firstName,
        last_name: lastName,
        domain: companyDomain,
      },
    });
    
    if (response.data && response.data.email) {
      logger.info(`Found email for ${firstName} ${lastName}: ${response.data.email}`);
      return {
        success: true,
        email: response.data.email,
        confidence: response.data.confidence || 0,
        sources: response.data.sources || [],
      };
    } else {
      logger.warn(`No email found for ${firstName} ${lastName} at ${companyDomain}`);
      return { success: false, message: 'No email found' };
    }
  } catch (error) {
    logger.error('Error finding email:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || error.message 
    };
  }
};

/**
 * Verify an email address using FindYEmail API
 * @param {string} email - Email address to verify
 * @returns {Promise<Object>} Verification result
 */
export const verifyEmail = async (email) => {
  try {
    logger.info(`Verifying email: ${email}`);
    
    const client = findYEmailClient();
    
    // Make API request to verify email
    const response = await client.get('/email-verifier', {
      params: { email },
    });
    
    logger.info(`Email verification result for ${email}:`, response.data);
    
    return {
      success: true,
      isValid: response.data.status === 'valid',
      isDisposable: response.data.disposable || false,
      isRoleAccount: response.data.role || false,
      score: response.data.score || 0,
      details: response.data,
    };
  } catch (error) {
    logger.error('Error verifying email:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || error.message 
    };
  }
};

/**
 * Process email verification for all prospects that need it
 * @returns {Promise<Object>} Results of the email verification process
 */
export const processEmailVerification = async () => {
  try {
    logger.info('Starting email verification process');
    
    // Find prospects that need email verification
    const prospects = await Prospect.find({
      $or: [
        { 'email.verified': { $ne: true } },
        { 'email': { $exists: false } },
      ],
      'company': { $exists: true, $ne: '' },
    }).limit(100); // Process up to 100 prospects at a time
    
    logger.info(`Found ${prospects.length} prospects for email verification`);
    
    const results = {
      total: prospects.length,
      verified: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };
    
    // Process each prospect
    for (const prospect of prospects) {
      try {
        // Skip if we don't have enough information
        if (!prospect.firstName || !prospect.lastName || !prospect.company) {
          results.skipped++;
          results.details.push({
            prospectId: prospect._id,
            name: `${prospect.firstName} ${prospect.lastName}`,
            status: 'skipped',
            reason: 'Missing required information',
          });
          continue;
        }
        
        // Extract company domain from LinkedIn URL or company name
        let companyDomain = '';
        const linkedinUrl = prospect.linkedinUrl || '';
        
        // Try to extract domain from LinkedIn URL
        const linkedinMatch = linkedinUrl.match(/linkedin\.com\/in\/[^/]+/);
        if (linkedinMatch) {
          companyDomain = linkedinMatch[0].replace('linkedin.com/in/', '');
        } else {
          // Fallback to company name
          companyDomain = prospect.company.toLowerCase().replace(/\s+/g, '') + '.com';
        }
        
        // Find email
        const emailResult = await findEmail(
          prospect.firstName,
          prospect.lastName,
          companyDomain
        );
        
        if (emailResult.success && emailResult.email) {
          // Verify the found email
          const verification = await verifyEmail(emailResult.email);
          
          // Update prospect with email information
          prospect.email = {
            address: emailResult.email,
            verified: verification.success && verification.isValid,
            verificationDate: new Date(),
            confidence: emailResult.confidence,
            verificationDetails: verification,
          };
          
          // Update outreach status
          if (verification.success && verification.isValid) {
            prospect.outreachStatus = 'email_verified';
            results.verified++;
          } else {
            results.failed++;
          }
          
          // Save the updated prospect
          await prospect.save();
          
          results.details.push({
            prospectId: prospect._id,
            name: `${prospect.firstName} ${prospect.lastName}`,
            email: emailResult.email,
            verified: verification.success && verification.isValid,
            confidence: emailResult.confidence,
            status: verification.success && verification.isValid ? 'verified' : 'failed',
            reason: verification.message || 'Verification failed',
          });
          
          // Add delay between API calls to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } else {
          // No email found
          results.failed++;
          results.details.push({
            prospectId: prospect._id,
            name: `${prospect.firstName} ${prospect.lastName}`,
            status: 'failed',
            reason: 'No email found',
          });
        }
        
      } catch (error) {
        logger.error(`Error processing prospect ${prospect._id}:`, error);
        results.failed++;
        results.details.push({
          prospectId: prospect._id,
          name: prospect.firstName ? `${prospect.firstName} ${prospect.lastName}` : 'Unknown',
          status: 'error',
          reason: error.message,
        });
      }
    }
    
    logger.info('Completed email verification process', {
      total: results.total,
      verified: results.verified,
      failed: results.failed,
      skipped: results.skipped,
    });
    
    return results;
    
  } catch (error) {
    logger.error('Error in email verification process:', error);
    throw error;
  }
};
