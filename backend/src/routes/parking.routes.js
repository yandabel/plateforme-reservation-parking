const express = require('express');
const router = express.Router();
const {
  createParking,
  getParkings,
  getNearbyParkings,
  getParkingById,
  updateParking,
  deleteParking,
  addParkingImage,
  getMyParkings,
  getParkingStats
} = require('../controllers/parking.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadParkingImage } = require('../middleware/upload.middleware');

router.get('/', getParkings);
router.get('/nearby', getNearbyParkings);
router.get('/my-parkings',protect,authorize('proprietaire', 'admin'),getMyParkings);

router.get('/:id', getParkingById);

// Routes protégées
router.use(protect);

router.post('/', authorize('proprietaire', 'admin'), createParking);
router.put('/:id', authorize('proprietaire', 'admin'), updateParking);
router.delete('/:id', authorize('proprietaire', 'admin'), deleteParking);
router.post('/:id/images', authorize('proprietaire', 'admin'), uploadParkingImage, addParkingImage);
router.get('/:id/stats', authorize('proprietaire', 'admin'), getParkingStats);

module.exports = router;