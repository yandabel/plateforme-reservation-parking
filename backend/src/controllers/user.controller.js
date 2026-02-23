const User = require('../models/user.model');
const Vehicle = require('../models/vehicle.model');
const Parking = require('../models/parking.model');
const bcrypt = require('bcryptjs');

// @desc    Récupérer le profil utilisateur
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('favorites');
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Mettre à jour le profil
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, address } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        firstName,
        lastName,
        phone,
        address: address || {}
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profil mis à jour',
      user
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message
    });
  }
};

// @desc    Changer le mot de passe
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id).select('+password');
    
    // Vérifier le mot de passe actuel
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }
    
    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe',
      error: error.message
    });
  }
};

// @desc    Récupérer les véhicules de l'utilisateur
// @route   GET /api/users/vehicles
// @access  Private
exports.getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ user: req.user.id });
    
    res.json({
      success: true,
      data: vehicles
    });
  } catch (error) {
    console.error('Erreur récupération véhicules:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Ajouter un véhicule
// @route   POST /api/users/vehicles
// @access  Private
exports.addVehicle = async (req, res) => {
  try {
    const vehicleData = {
      ...req.body,
      user: req.user.id
    };
    
    const vehicle = await Vehicle.create(vehicleData);
    
    res.status(201).json({
      success: true,
      message: 'Véhicule ajouté',
      data: vehicle
    });
  } catch (error) {
    console.error('Erreur ajout véhicule:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du véhicule',
      error: error.message
    });
  }
};

// @desc    Mettre à jour un véhicule
// @route   PUT /api/users/vehicles/:id
// @access  Private
exports.updateVehicle = async (req, res) => {
  try {
    let vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Véhicule non trouvé'
      });
    }
    
    // Vérifier que l'utilisateur possède ce véhicule
    if (vehicle.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à modifier ce véhicule'
      });
    }
    
    vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Véhicule mis à jour',
      data: vehicle
    });
  } catch (error) {
    console.error('Erreur mise à jour véhicule:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message
    });
  }
};

// @desc    Supprimer un véhicule
// @route   DELETE /api/users/vehicles/:id
// @access  Private
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Véhicule non trouvé'
      });
    }
    
    // Vérifier que l'utilisateur possède ce véhicule
    if (vehicle.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à supprimer ce véhicule'
      });
    }
    
    await vehicle.deleteOne();
    
    res.json({
      success: true,
      message: 'Véhicule supprimé'
    });
  } catch (error) {
    console.error('Erreur suppression véhicule:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      error: error.message
    });
  }
};

// @desc    Définir un véhicule par défaut
// @route   PUT /api/users/vehicles/:id/set-default
// @access  Private
exports.setDefaultVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Véhicule non trouvé'
      });
    }
    
    // Vérifier que l'utilisateur possède ce véhicule
    if (vehicle.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }
    
    // Mettre tous les véhicules de l'utilisateur à non-défaut
    await Vehicle.updateMany(
      { user: req.user.id },
      { $set: { isDefault: false } }
    );
    
    // Définir ce véhicule comme défaut
    vehicle.isDefault = true;
    await vehicle.save();
    
    res.json({
      success: true,
      message: 'Véhicule défini comme véhicule par défaut',
      data: vehicle
    });
  } catch (error) {
    console.error('Erreur définition véhicule par défaut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Récupérer les favoris
// @route   GET /api/users/favorites
// @access  Private
exports.getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'favorites',
      populate: {
        path: 'owner',
        select: 'firstName lastName avatar'
      }
    });
    
    res.json({
      success: true,
      data: user.favorites || []
    });
  } catch (error) {
    console.error('Erreur récupération favoris:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Ajouter/Retirer un parking des favoris
// @route   POST /api/users/favorites/:parkingId
// @access  Private
exports.toggleFavorite = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const parking = await Parking.findById(req.params.parkingId);
    
    if (!parking) {
      return res.status(404).json({
        success: false,
        message: 'Parking non trouvé'
      });
    }
    
    const isFavorite = user.favorites.includes(parking._id);
    
    if (isFavorite) {
      // Retirer des favoris
      user.favorites = user.favorites.filter(
        fav => fav.toString() !== parking._id.toString()
      );
      await user.save();
      
      res.json({
        success: true,
        message: 'Parking retiré des favoris',
        isFavorite: false
      });
    } else {
      // Ajouter aux favoris
      user.favorites.push(parking._id);
      await user.save();
      
      res.json({
        success: true,
        message: 'Parking ajouté aux favoris',
        isFavorite: true
      });
    }
  } catch (error) {
    console.error('Erreur toggle favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};