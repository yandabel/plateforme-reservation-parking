const express = require('express');
const router = express.Router();
const {
  createReservation,
  getMyReservations,
  getReservationById,
  cancelReservation,
  checkIn,
  checkOut
} = require('../controllers/reservation.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/', createReservation);
router.get('/my-reservations', getMyReservations);
router.get('/:id', getReservationById);
router.put('/:id/cancel', cancelReservation);
router.put('/:id/checkin', authorize('proprietaire', 'admin'), checkIn);
router.put('/:id/checkout', authorize('proprietaire', 'admin'), checkOut);

module.exports = router;