import express from 'express';
import {
  getDashboardStats,
  getActivityFeed,
  search,
} from './controllers.js';

const router = express.Router();

// Dashboard routes
router.get('/stats', getDashboardStats);
router.get('/activity', getActivityFeed);
router.get('/search', search);

export default router;
