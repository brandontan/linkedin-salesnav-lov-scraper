import { woodpeckerClient } from '../../../utils/apiClient.js';
import { logger } from '../../../utils/logger.js';
import { Prospect } from '../../../models/prospect.js';
import { Campaign } from '../../../models/campaign.js';

/**
 * Create a new campaign in Woodpecker
 * @param {Object} campaignData - Campaign data
 * @returns {Promise<Object>} Created campaign data
 */
export const createCampaign = async (campaignData) => {
  try {
    logger.info('Creating new campaign in Woodpecker', { name: campaignData.name });
    
    const client = woodpeckerClient();
    
    // Prepare campaign data for Woodpecker
    const woodpeckerCampaign = {
      name: campaignData.name,
      subject: campaignData.subject,
      body: campaignData.body,
      sender_name: campaignData.senderName || 'BeeTechy Team',
      sender_email: campaignData.senderEmail || 'outreach@beetechy.com',
      reply_to: campaignData.replyTo || 'outreach@beetechy.com',
      tracking: {
        opens: true,
        clicks: true,
        replies: true,
      },
      settings: {
        allow_links: true,
        allow_images: true,
        allow_attachments: false,
        allow_forwarding: true,
        send_as_reply: false,
        tracking_pixel: true,
        send_from_individual_accounts: false,
        resend_to_unreplied: campaignData.resendToUnreplied || false,
        resend_after_days: campaignData.resendAfterDays || 3,
        max_emails_per_day: campaignData.maxEmailsPerDay || 50,
        schedule_day: campaignData.scheduleDay || 'any', // any, weekday, monday, tuesday, etc.
        schedule_time: campaignData.scheduleTime || '09:00',
        timezone: campaignData.timezone || 'America/Los_Angeles',
      },
    };
    
    // Make API request to create campaign
    const response = await client.post('/campaigns', woodpeckerCampaign);
    
    logger.info('Successfully created campaign in Woodpecker', {
      campaignId: response.data.id,
      name: response.data.name,
    });
    
    return {
      success: true,
      campaignId: response.data.id,
      ...response.data,
    };
  } catch (error) {
    logger.error('Error creating campaign in Woodpecker:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || error.message 
    };
  }
};

/**
 * Add prospects to a Woodpecker campaign
 * @param {string} campaignId - Woodpecker campaign ID
 * @param {Array<string>} prospectIds - Array of prospect IDs to add
 * @returns {Promise<Object>} Results of the operation
 */
export const addProspectsToCampaign = async (campaignId, prospectIds) => {
  try {
    logger.info(`Adding ${prospectIds.length} prospects to campaign ${campaignId}`);
    
    const client = woodpeckerClient();
    
    // Get prospect data from our database
    const prospects = await Prospect.find({ _id: { $in: prospectIds } });
    
    if (prospects.length === 0) {
      return { success: false, message: 'No valid prospects found' };
    }
    
    // Format prospects for Woodpecker API
    const woodpeckerProspects = prospects.map(prospect => ({
      email: prospect.email?.address,
      first_name: prospect.firstName,
      last_name: prospect.lastName,
      company: prospect.company,
      position: prospect.title,
      linkedin_url: prospect.linkedinUrl,
      custom_fields: {
        // Add any custom fields you want to track
        industry: prospect.industry || '',
        location: prospect.location || '',
        // Add more custom fields as needed
      },
    }));
    
    // Make API request to add prospects to campaign
    const response = await client.post(`/campaigns/${campaignId}/prospects`, {
      prospects: woodpeckerProspects,
      // Options for handling duplicates
      options: {
        skip_invalid: true,  // Skip invalid email addresses
        skip_duplicates: true,  // Skip duplicate email addresses
        update_duplicates: true,  // Update existing prospects with new data
      },
    });
    
    // Update prospect records with campaign information
    await Prospect.updateMany(
      { _id: { $in: prospectIds } },
      { 
        $addToSet: { 
          'outreachHistory': {
            type: 'email',
            campaignId: campaignId,
            date: new Date(),
          }
        },
        outreachStatus: 'campaign_added',
      }
    );
    
    logger.info('Successfully added prospects to campaign', {
      campaignId,
      added: response.data.added || 0,
      updated: response.data.updated || 0,
      skipped: response.data.skipped || 0,
      errors: response.data.errors || [],
    });
    
    return {
      success: true,
      added: response.data.added || 0,
      updated: response.data.updated || 0,
      skipped: response.data.skipped || 0,
      errors: response.data.errors || [],
    };
  } catch (error) {
    logger.error('Error adding prospects to campaign:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || error.message,
      error: error.response?.data || error.message,
    };
  }
};

/**
 * Start a campaign in Woodpecker
 * @param {string} campaignId - Woodpecker campaign ID
 * @returns {Promise<Object>} Results of the operation
 */
export const startCampaign = async (campaignId) => {
  try {
    logger.info(`Starting campaign ${campaignId} in Woodpecker`);
    
    const client = woodpeckerClient();
    
    // Make API request to start campaign
    const response = await client.post(`/campaigns/${campaignId}/start`);
    
    logger.info('Successfully started campaign in Woodpecker', {
      campaignId,
      status: response.data.status,
    });
    
    // Update campaign status in our database
    await Campaign.findOneAndUpdate(
      { woodpeckerCampaignId: campaignId },
      { 
        status: 'active',
        startDate: new Date(),
        updatedAt: new Date(),
      }
    );
    
    return {
      success: true,
      status: response.data.status,
      startedAt: new Date(),
    };
  } catch (error) {
    logger.error('Error starting campaign in Woodpecker:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || error.message 
    };
  }
};

/**
 * Get campaign statistics from Woodpecker
 * @param {string} campaignId - Woodpecker campaign ID
 * @returns {Promise<Object>} Campaign statistics
 */
export const getCampaignStats = async (campaignId) => {
  try {
    logger.info(`Getting stats for campaign ${campaignId} from Woodpecker`);
    
    const client = woodpeckerClient();
    
    // Make API request to get campaign stats
    const response = await client.get(`/campaigns/${campaignId}/stats`);
    
    logger.info('Retrieved campaign stats from Woodpecker', {
      campaignId,
      stats: response.data,
    });
    
    // Update campaign stats in our database
    await Campaign.findOneAndUpdate(
      { woodpeckerCampaignId: campaignId },
      { 
        'stats.totalProspects': response.data.total_prospects || 0,
        'stats.emailsSent': response.data.emails_sent || 0,
        'stats.emailsOpened': response.data.emails_opened || 0,
        'stats.emailsClicked': response.data.emails_clicked || 0,
        'stats.responses': response.data.replies || 0,
        'stats.meetings': response.data.meetings || 0,
        'stats.deals': response.data.deals || 0,
        updatedAt: new Date(),
      }
    );
    
    return {
      success: true,
      stats: response.data,
    };
  } catch (error) {
    logger.error('Error getting campaign stats from Woodpecker:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || error.message 
    };
  }
};

/**
 * Process outreach campaigns - main function to be called by the scheduler
 * @returns {Promise<Object>} Results of the campaign processing
 */
export const processOutreachCampaigns = async () => {
  try {
    logger.info('Starting outreach campaign processing');
    
    // Find active campaigns that need processing
    const campaigns = await Campaign.find({
      status: { $in: ['draft', 'active'] },
    });
    
    logger.info(`Found ${campaigns.length} campaigns to process`);
    
    const results = {
      totalCampaigns: campaigns.length,
      campaignsProcessed: 0,
      prospectsAdded: 0,
      campaignsStarted: 0,
      details: [],
    };
    
    // Process each campaign
    for (const campaign of campaigns) {
      const campaignResult = {
        campaignId: campaign._id,
        campaignName: campaign.name,
        status: campaign.status,
        prospectsAdded: 0,
        started: false,
        error: null,
      };
      
      try {
        // If campaign doesn't have a Woodpecker ID yet, create it
        if (!campaign.woodpeckerCampaignId) {
          logger.info(`Creating new campaign in Woodpecker: ${campaign.name}`);
          
          // Create the campaign in Woodpecker
          const createResult = await createCampaign({
            name: campaign.name,
            subject: campaign.messageTemplates[0]?.subject || `Re: Quick question about ${campaign.targetAudience.industries[0] || 'your industry'}`,
            body: campaign.messageTemplates[0]?.body || `Hi {{first_name}},\n\nI hope this message finds you well. I came across your profile and was impressed by your work at {{company}}. I'd love to connect and explore potential synergies between our companies.\n\nWould you be open to a quick call next week?\n\nBest regards,\nBeeTechy Team`,
            senderName: 'BeeTechy Team',
            senderEmail: 'outreach@beetechy.com',
            replyTo: 'outreach@beetechy.com',
            resendToUnreplied: true,
            resendAfterDays: 3,
            maxEmailsPerDay: 50,
            scheduleDay: 'any',
            scheduleTime: '09:00',
            timezone: 'America/Los_Angeles',
          });
          
          if (createResult.success) {
            // Update campaign with Woodpecker ID
            campaign.woodpeckerCampaignId = createResult.campaignId;
            await campaign.save();
            
            campaignResult.woodpeckerCampaignId = createResult.campaignId;
          } else {
            throw new Error(`Failed to create campaign in Woodpecker: ${createResult.message}`);
          }
        }
        
        // Find prospects to add to the campaign
        const prospects = await Prospect.find({
          _id: { $nin: campaign.prospects },
          'email.verified': true,
          'outreachStatus': 'email_verified',
          // Add any additional targeting criteria from the campaign
          ...(campaign.targetAudience.industries?.length > 0 && {
            'industry': { $in: campaign.targetAudience.industries },
          }),
          ...(campaign.targetAudience.jobTitles?.length > 0 && {
            'title': { $in: campaign.targetAudience.jobTitles.map(title => new RegExp(title, 'i')) },
          }),
          ...(campaign.targetAudience.locations?.length > 0 && {
            'location': { $in: campaign.targetAudience.locations.map(loc => new RegExp(loc, 'i')) },
          }),
        }).limit(50); // Add up to 50 prospects at a time
        
        if (prospects.length > 0) {
          // Add prospects to the campaign in Woodpecker
          const addResult = await addProspectsToCampaign(
            campaign.woodpeckerCampaignId,
            prospects.map(p => p._id)
          );
          
          if (addResult.success) {
            // Update campaign with added prospects
            campaign.prospects = [...campaign.prospects, ...prospects.map(p => p._id)];
            campaign.stats.totalProspects = campaign.prospects.length;
            campaign.updatedAt = new Date();
            await campaign.save();
            
            campaignResult.prospectsAdded = addResult.added || 0;
            results.prospectsAdded += addResult.added || 0;
          } else {
            throw new Error(`Failed to add prospects to campaign: ${addResult.message}`);
          }
        }
        
        // If campaign is in draft status and has prospects, start it
        if (campaign.status === 'draft' && campaign.prospects.length > 0) {
          const startResult = await startCampaign(campaign.woodpeckerCampaignId);
          
          if (startResult.success) {
            campaign.status = 'active';
            campaign.startDate = new Date();
            campaign.updatedAt = new Date();
            await campaign.save();
            
            campaignResult.started = true;
            results.campaignsStarted++;
          } else {
            throw new Error(`Failed to start campaign: ${startResult.message}`);
          }
        }
        
        // Get updated campaign stats
        await getCampaignStats(campaign.woodpeckerCampaignId);
        
        campaignResult.status = campaign.status;
        results.campaignsProcessed++;
        
      } catch (error) {
        logger.error(`Error processing campaign ${campaign.name}:`, error);
        campaignResult.error = error.message;
      }
      
      results.details.push(campaignResult);
    }
    
    logger.info('Completed outreach campaign processing', {
      campaignsProcessed: results.campaignsProcessed,
      prospectsAdded: results.prospectsAdded,
      campaignsStarted: results.campaignsStarted,
    });
    
    return results;
    
  } catch (error) {
    logger.error('Error in outreach campaign processing:', error);
    throw error;
  }
};
