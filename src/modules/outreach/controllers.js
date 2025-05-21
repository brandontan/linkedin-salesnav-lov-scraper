import { runProspectDataCollection } from './services/linkedinService.js';
import { processEmailVerification } from './services/emailService.js';
import { processOutreachCampaigns } from './services/woodpeckerService.js';
import { Prospect } from '../../models/prospect.js';
import { Campaign } from '../../models/campaign.js';
import { logger } from '../../utils/logger.js';

/**
 * Start a new prospect data collection process
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const startProspectCollection = async (req, res) => {
  try {
    const { searchCriteria } = req.body;
    
    logger.info('Starting prospect data collection', { searchCriteria });
    
    // Start the process asynchronously
    runProspectDataCollection(searchCriteria)
      .then(results => {
        logger.info('Completed prospect data collection', { resultsCount: results.length });
      })
      .catch(error => {
        logger.error('Error in prospect data collection:', error);
      });
    
    res.status(202).json({
      success: true,
      message: 'Prospect data collection started',
    });
  } catch (error) {
    logger.error('Error starting prospect collection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start prospect collection',
      error: error.message,
    });
  }
};

/**
 * Get list of prospects with pagination and filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getProspects = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search, 
      sortBy = 'updatedAt',
      sortOrder = -1 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {};
    
    if (status) {
      query['outreachStatus'] = status;
    }
    
    if (search) {
      query['$or'] = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { 'email.address': { $regex: search, $options: 'i' } },
      ];
    }
    
    // Get total count for pagination
    const total = await Prospect.countDocuments(query);
    
    // Get paginated results
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const prospects = await Prospect.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: prospects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error getting prospects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get prospects',
      error: error.message,
    });
  }
};

/**
 * Get a single prospect by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getProspect = async (req, res) => {
  try {
    const { id } = req.params;
    
    const prospect = await Prospect.findById(id);
    
    if (!prospect) {
      return res.status(404).json({
        success: false,
        message: 'Prospect not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: prospect,
    });
  } catch (error) {
    logger.error('Error getting prospect:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get prospect',
      error: error.message,
    });
  }
};

/**
 * Update a prospect
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateProspect = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Don't allow updating certain fields
    const { _id, __v, createdAt, updatedAt, ...safeUpdateData } = updateData;
    
    const prospect = await Prospect.findByIdAndUpdate(
      id,
      { $set: safeUpdateData },
      { new: true, runValidators: true }
    );
    
    if (!prospect) {
      return res.status(404).json({
        success: false,
        message: 'Prospect not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: prospect,
    });
  } catch (error) {
    logger.error('Error updating prospect:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prospect',
      error: error.message,
    });
  }
};

/**
 * Start email verification process
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const startEmailVerification = async (req, res) => {
  try {
    logger.info('Starting email verification process');
    
    // Start the process asynchronously
    processEmailVerification()
      .then(results => {
        logger.info('Completed email verification', { results });
      })
      .catch(error => {
        logger.error('Error in email verification:', error);
      });
    
    res.status(202).json({
      success: true,
      message: 'Email verification process started',
    });
  } catch (error) {
    logger.error('Error starting email verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start email verification',
      error: error.message,
    });
  }
};

/**
 * Create a new outreach campaign
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createCampaign = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      targetAudience,
      messageTemplates,
      status = 'draft' 
    } = req.body;
    
    // Validate required fields
    if (!name || !targetAudience || !messageTemplates || !messageTemplates.length) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, targetAudience, and at least one message template are required',
      });
    }
    
    // Create the campaign
    const campaign = new Campaign({
      name,
      description,
      targetAudience,
      messageTemplates,
      status,
      stats: {
        totalProspects: 0,
        emailsSent: 0,
        emailsOpened: 0,
        emailsClicked: 0,
        responses: 0,
        meetings: 0,
        deals: 0,
      },
      prospects: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    await campaign.save();
    
    res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    logger.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create campaign',
      error: error.message,
    });
  }
};

/**
 * Get list of campaigns with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCampaigns = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search,
      sortBy = 'updatedAt',
      sortOrder = -1 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {};
    
    if (status) {
      query['status'] = status;
    }
    
    if (search) {
      query['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Get total count for pagination
    const total = await Campaign.countDocuments(query);
    
    // Get paginated results
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const campaigns = await Campaign.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error getting campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaigns',
      error: error.message,
    });
  }
};

/**
 * Get a single campaign by ID with its prospects
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = await Campaign.findById(id)
      .populate({
        path: 'prospects',
        select: 'firstName lastName title company email linkedinUrl outreachStatus',
        options: { limit: 50 }, // Limit the number of prospects to avoid large responses
      });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }
    
    // Get campaign stats from Woodpecker if available
    if (campaign.woodpeckerCampaignId) {
      // This would be handled by the Woodpecker service
      // For now, we'll just return the campaign as is
    }
    
    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    logger.error('Error getting campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign',
      error: error.message,
    });
  }
};

/**
 * Update a campaign
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Don't allow updating certain fields
    const { _id, __v, createdAt, updatedAt, woodpeckerCampaignId, ...safeUpdateData } = updateData;
    
    // If updating to active and not already active, set start date
    if (safeUpdateData.status === 'active') {
      const currentCampaign = await Campaign.findById(id);
      if (currentCampaign.status !== 'active') {
        safeUpdateData.startDate = new Date();
      }
    }
    
    const campaign = await Campaign.findByIdAndUpdate(
      id,
      { 
        ...safeUpdateData,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }
    
    // If campaign is being activated and has a Woodpecker ID, start it
    if (campaign.status === 'active' && campaign.woodpeckerCampaignId) {
      // This would be handled by the Woodpecker service
      // For now, we'll just update the status
    }
    
    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    logger.error('Error updating campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign',
      error: error.message,
    });
  }
};

/**
 * Start a campaign in Woodpecker
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const startCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = await Campaign.findById(id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }
    
    if (!campaign.woodpeckerCampaignId) {
      return res.status(400).json({
        success: false,
        message: 'Campaign does not have a Woodpecker ID',
      });
    }
    
    // Start the campaign in Woodpecker
    const result = await processOutreachCampaigns();
    
    // Find the specific campaign result
    const campaignResult = result.details.find(c => c.campaignId.toString() === id);
    
    if (!campaignResult || campaignResult.error) {
      return res.status(500).json({
        success: false,
        message: campaignResult?.error || 'Failed to start campaign',
      });
    }
    
    // Refresh the campaign data
    const updatedCampaign = await Campaign.findById(id);
    
    res.status(200).json({
      success: true,
      data: updatedCampaign,
      result: campaignResult,
    });
  } catch (error) {
    logger.error('Error starting campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start campaign',
      error: error.message,
    });
  }
};

/**
 * Get campaign statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCampaignStats = async (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = await Campaign.findById(id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }
    
    if (!campaign.woodpeckerCampaignId) {
      return res.status(400).json({
        success: false,
        message: 'Campaign does not have a Woodpecker ID',
      });
    }
    
    // Get stats from Woodpecker
    // This would be handled by the Woodpecker service
    // For now, we'll just return the current stats
    
    res.status(200).json({
      success: true,
      data: campaign.stats,
    });
  } catch (error) {
    logger.error('Error getting campaign stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign stats',
      error: error.message,
    });
  }
};
