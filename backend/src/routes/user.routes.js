const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getProfile,
  updateProfile,
  changePassword,
  getVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  getFavorites,
  toggleFavorite
} = require('../controllers/user.controller');

// Routes protégées
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

// Véhicules
router.get('/vehicles', getVehicles);
router.post('/vehicles', addVehicle);
router.put('/vehicles/:id', updateVehicle);
router.delete('/vehicles/:id', deleteVehicle);

// Favoris
router.get('/favorites', getFavorites);
router.post('/favorites/:parkingId', toggleFavorite);
router.delete('/favorites/:parkingId', toggleFavorite);

module.exports = router;