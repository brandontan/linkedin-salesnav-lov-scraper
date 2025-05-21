const express = require('express');
const router = express.Router();
const SalesNavigatorFilters = require('../scrapers/sales-navigator-filters');

// Cache for filters to avoid scraping on every request
let filtersCache = null;
let lastCacheUpdate = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function updateFiltersCache() {
  const filterScraper = new SalesNavigatorFilters({
    headless: true,
    slowMo: 50,
    timeout: 30000
  });

  try {
    await filterScraper.initialize();
    filtersCache = await filterScraper.getFilters();
    lastCacheUpdate = Date.now();
  } catch (error) {
    console.error('Error updating filters cache:', error);
    throw error;
  } finally {
    await filterScraper.close();
  }
}

// Get all filters
router.get('/filters', async (req, res) => {
  try {
    // Check if cache needs updating
    if (!filtersCache || !lastCacheUpdate || (Date.now() - lastCacheUpdate > CACHE_DURATION)) {
      await updateFiltersCache();
    }

    res.json({
      success: true,
      data: filtersCache,
      lastUpdated: lastCacheUpdate
    });
  } catch (error) {
    console.error('Error getting filters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get filters'
    });
  }
});

// Force update filters cache
router.post('/filters/update', async (req, res) => {
  try {
    await updateFiltersCache();
    res.json({
      success: true,
      message: 'Filters cache updated successfully',
      lastUpdated: lastCacheUpdate
    });
  } catch (error) {
    console.error('Error updating filters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update filters'
    });
  }
});

module.exports = router; 