const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getOverviewStats,
  getOwnerStats,
  getRealtimeStats
} = require('../controllers/stats.controller');

router.use(protect);

router.get('/overview', authorize('admin'), getOverviewStats);
router.get('/owner', authorize('proprietaire', 'admin'), getOwnerStats);
router.get('/realtime', authorize('admin'), getRealtimeStats);

module.exports = router;