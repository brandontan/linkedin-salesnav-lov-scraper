import express from 'express';
import {
  startProspectCollection,
  getProspects,
  getProspect,
  updateProspect,
  startEmailVerification,
  createCampaign,
  getCampaigns,
  getCampaign,
  updateCampaign,
  startCampaign,
  getCampaignStats,
} from './controllers.js';

const router = express.Router();

// Prospect routes
router.post('/prospects/collect', startProspectCollection);
router.get('/prospects', getProspects);
router.get('/prospects/:id', getProspect);
router.put('/prospects/:id', updateProspect);

// Email verification
router.post('/email-verification/start', startEmailVerification);

// Campaign routes
router.post('/campaigns', createCampaign);
router.get('/campaigns', getCampaigns);
router.get('/campaigns/:id', getCampaign);
router.put('/campaigns/:id', updateCampaign);
router.post('/campaigns/:id/start', startCampaign);
router.get('/campaigns/:id/stats', getCampaignStats);

export default router;
