const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  createReview,
  getParkingReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  reportReview,
  markHelpful,
  replyToReview
} = require('../controllers/review.controller');

// Routes publiques
router.get('/parking/:parkingId', getParkingReviews);

// Routes protégées
router.use(protect);

router.post('/', createReview);
router.get('/my-reviews', getMyReviews);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);
router.post('/:id/report', reportReview);
router.post('/:id/helpful', markHelpful);
router.post('/:id/reply', authorize('proprietaire', 'admin'), replyToReview);

module.exports = router;