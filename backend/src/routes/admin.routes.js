const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getDashboardStats,
  getUsers,
  updateUserStatus,
  updateParkingStatus,
  updateReviewStatus,
  getTransactions,
  exportData,
} = require('../controllers/admin.controller');

const {
  approveParking,
  rejectParking
} = require('../controllers/parking.controller')

router.use(protect);
router.use(authorize('admin'));



router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.put('/parkings/:id/status', updateParkingStatus);
router.put('/reviews/:id/status', updateReviewStatus);
router.get('/transactions', getTransactions);
router.get('/export/:type', exportData);

router.put('/parkings/:id/approve', protect, authorize('admin'), approveParking);
router.put('/parkings/:id/reject', protect, authorize('admin'), rejectParking);



module.exports = router;