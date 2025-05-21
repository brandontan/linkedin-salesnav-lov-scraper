import { Prospect } from '../../models/prospect.js';
import { Campaign } from '../../models/campaign.js';
import { logger } from '../../utils/logger.js';

/**
 * Get dashboard statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getDashboardStats = async (req, res) => {
  try {
    // Get total number of prospects
    const totalProspects = await Prospect.countDocuments();
    
    // Get prospects by status
    const prospectsByStatus = await Prospect.aggregate([
      {
        $group: {
          _id: '$outreachStatus',
          count: { $sum: 1 },
        },
      },
    ]);
    
    // Get total number of campaigns
    const totalCampaigns = await Campaign.countDocuments();
    
    // Get campaigns by status
    const campaignsByStatus = await Campaign.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
    
    // Get recent prospects
    const recentProspects = await Prospect.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName title company email.address linkedinUrl outreachStatus createdAt');
    
    // Get recent campaigns
    const recentCampaigns = await Campaign.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('name status stats.totalProspects stats.emailsSent stats.responses stats.meetings updatedAt');
    
    // Calculate email metrics
    const emailMetrics = await Prospect.aggregate([
      {
        $match: {
          'email.verified': true,
        },
      },
      {
        $group: {
          _id: null,
          totalVerified: { $sum: 1 },
          totalSent: { $sum: { $size: { $ifNull: ['$outreachHistory', []] } } },
        },
      },
    ]);
    
    // Format the response
    const stats = {
      prospects: {
        total: totalProspects,
        byStatus: {},
        recent: recentProspects,
      },
      campaigns: {
        total: totalCampaigns,
        byStatus: {},
        recent: recentCampaigns,
      },
      emails: {
        verified: emailMetrics[0]?.totalVerified || 0,
        sent: emailMetrics[0]?.totalSent || 0,
      },
    };
    
    // Convert array of status counts to object
    prospectsByStatus.forEach(({ _id, count }) => {
      stats.prospects.byStatus[_id] = count;
    });
    
    campaignsByStatus.forEach(({ _id, count }) => {
      stats.campaigns.byStatus[_id] = count;
    });
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats',
      error: error.message,
    });
  }
};

/**
 * Get activity feed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getActivityFeed = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    // Get prospect activities
    const prospectActivities = await Prospect.aggregate([
      {
        $unwind: {
          path: '$outreachHistory',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $sort: { 'outreachHistory.date': -1 },
      },
      {
        $limit: parseInt(limit),
      },
      {
        $project: {
          _id: 0,
          type: 'prospect',
          prospectId: '$_id',
          firstName: 1,
          lastName: 1,
          action: '$outreachHistory.type',
          date: '$outreachHistory.date',
          details: {
            campaignId: '$outreachHistory.campaignId',
            content: { $substr: ['$outreachHistory.content', 0, 100] },
            response: '$outreachHistory.response',
          },
        },
      },
    ]);
    
    // Get campaign activities
    const campaignActivities = await Campaign.aggregate([
      {
        $unwind: {
          path: '$activityLog',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $sort: { 'activityLog.date': -1 },
      },
      {
        $limit: parseInt(limit),
      },
      {
        $project: {
          _id: 0,
          type: 'campaign',
          campaignId: '$_id',
          name: 1,
          action: '$activityLog.action',
          date: '$activityLog.date',
          details: {
            message: '$activityLog.message',
            data: '$activityLog.data',
          },
        },
      },
    ]);
    
    // Combine and sort all activities
    const activities = [...prospectActivities, ...campaignActivities].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    ).slice(0, limit);
    
    res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    logger.error('Error getting activity feed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activity feed',
      error: error.message,
    });
  }
};

/**
 * Get search results
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const search = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }
    
    // Search prospects
    const prospectResults = await Prospect.find({
      $or: [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { company: { $regex: q, $options: 'i' } },
        { title: { $regex: q, $options: 'i' } },
        { 'email.address': { $regex: q, $options: 'i' } },
      ],
    })
      .limit(5)
      .select('firstName lastName title company email.address linkedinUrl');
    
    // Search campaigns
    const campaignResults = await Campaign.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ],
    })
      .limit(5)
      .select('name description status stats');
    
    res.status(200).json({
      success: true,
      data: {
        prospects: prospectResults,
        campaigns: campaignResults,
      },
    });
  } catch (error) {
    logger.error('Error searching:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message,
    });
  }
};
