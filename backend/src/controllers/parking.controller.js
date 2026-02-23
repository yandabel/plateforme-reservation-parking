const Parking = require('../models/parking.model');
const Spot = require('../models/spot.model');
const Review = require('../models/review.model');
const Reservation = require('../models/reservation.model');
const mongoose = require('mongoose');

// @desc    Créer un nouveau parking
// @route   POST /api/parkings
// @access  Private/Proprietaire
exports.createParking = async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      latitude,
      longitude,
      images=[],
      totalSpots,
      hourlyRate,
      dailyRate,
      monthlyRate,
      openingHours,
      features,
      spotTypes
    } = req.body;


    // Vérifier si le propriétaire a déjà un parking avec le même nom
    const existingParking = await Parking.findOne({
      name,
      owner: req.user.id
    });

    if (existingParking) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà un parking avec ce nom'
      });
    }

        console.log('BACKEND LAT:', latitude);
        console.log('BACKEND LNG:', longitude);

    // 🛡️ Validate coordinates FIRST
    if (
      latitude === undefined ||
      longitude === undefined ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez sélectionner un emplacement valide sur la carte'
      });
    }




    // Créer le parking
    const parking = await Parking.create({
      name,
      description,
      owner: req.user.id,
      address: {
        street: address.street,
        city: address.city,
        postalCode: address.postalCode,
        country: address.country || 'Maroc'
      },
      location: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)]
      },
      images,
      totalSpots,
      availableSpots: totalSpots,
      hourlyRate,
      dailyRate,
      monthlyRate,
      openingHours: openingHours || {
        monday: { open: '08:00', close: '20:00' },
        tuesday: { open: '08:00', close: '20:00' },
        wednesday: { open: '08:00', close: '20:00' },
        thursday: { open: '08:00', close: '20:00' },
        friday: { open: '08:00', close: '20:00' },
        saturday: { open: '08:00', close: '20:00' },
        sunday: { open: '08:00', close: '20:00' }
      },
      features: features || {},
      spotTypes: spotTypes || [{ type: 'voiture', count: totalSpots }],
      status: 'under_review'
    });

    // Créer les places automatiquement
    const spots = [];
    let spotNumber = 1;

    for (const spotType of parking.spotTypes) {
      for (let i = 0; i < spotType.count; i++) {
        spots.push({
          parking: parking._id,
          spotNumber: `${spotType.type.charAt(0).toUpperCase()}${spotNumber.toString().padStart(3, '0')}`,
          type: spotType.type,
          status: 'available'
        });
        spotNumber++;
      }
    }

    await Spot.insertMany(spots);

    // Notifier l'admin via Socket.io
    const io = req.app.get('io');
    io.to('admin-room').emit('new-parking', {
      parkingId: parking._id,
      parkingName: parking.name,
      ownerName: `${req.user.firstName} ${req.user.lastName}`,
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Parking créé avec succès, en attente de validation',
      parking
    });
  } catch (error) {
    console.error('Erreur création parking:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du parking',
      error: error.message
    });
  }
  console.log('Emit new parking')
};

// @desc    Récupérer tous les parkings
// @route   GET /api/parkings
// @access  Public
exports.getParkings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      city,
      minPrice,
      maxPrice,
      features,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status
    } = req.query;

    // Construction de la requête
    const query = { };

    // filtre status si fourni
    if (status) {
      query.status=status
    } else {
      // par defaut le public ne voit que les parkings actifs
      query.status= 'active'
    }

    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }

    if (minPrice || maxPrice) {
      query.hourlyRate = {};
      if (minPrice) query.hourlyRate.$gte = parseFloat(minPrice);
      if (maxPrice) query.hourlyRate.$lte = parseFloat(maxPrice);
    }

    if (features) {
      const featuresArray = features.split(',');
      featuresArray.forEach(feature => {
        query[`features.${feature}`] = true;
      });
    }

    // Tri
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = parseInt(page) * parseInt(limit);

    const total = await Parking.countDocuments(query);
    const parkings = await Parking.find(query)
      .populate('owner', 'firstName lastName avatar')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(startIndex);

    // Pagination result
    const pagination = {};
    if (endIndex < total) {
      pagination.next = {
        page: parseInt(page) + 1,
        limit: parseInt(limit)
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: parseInt(page) - 1,
        limit: parseInt(limit)
      };
    }

    res.json({
      success: true,
      count: parkings.length,
      pagination,
      data: parkings
    });
  } catch (error) {
    console.error('Erreur récupération parkings:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Rechercher des parkings par proximité
// @route   GET /api/parkings/nearby
// @access  Public
exports.getNearbyParkings = async (req, res) => {
  try {
    const { lat, lng, radius = 5, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude et longitude sont requises'
      });
    }

    const parkings = await Parking.find({
      status: 'active',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000 // Convertir km en mètres
        }
      }
    })
    .limit(parseInt(limit))
    .populate('owner', 'firstName lastName avatar');

    res.json({
      success: true,
      count: parkings.length,
      data: parkings
    });
  } catch (error) {
    console.error('Erreur recherche parkings proches:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};
// @desc    Rechercher des parkings du proprietaire
// @route   GET /api/parkings/my-parking
// @access  private
exports.getMyParkings = async (req, res) => {
  try {
    const parkings = await Parking.find({
      owner: req.user.id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: parkings.length,
      data: parkings
    });
  } catch (error) {
    console.error('Erreur récupération mes parkings:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};


// @desc    Récupérer un parking par ID
// @route   GET /api/parkings/:id
// @access  Public
exports.getParkingById = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id)
      .populate('owner', 'firstName lastName avatar phone')
      .populate({
        path: 'reviews',
        match: { status: 'approved' },
        options: { sort: { createdAt: -1 }, limit: 10 },
        populate: {
          path: 'user',
          select: 'firstName lastName avatar'
        }
      });

    if (!parking) {
      return res.status(404).json({
        success: false,
        message: 'Parking non trouvé'
      });
    }

    // Récupérer les places disponibles
    const availableSpots = await Spot.find({
      parking: parking._id,
      status: 'available'
    }).select('spotNumber type features');

    res.json({
      success: true,
      data: {
        ...parking.toObject(),
        availableSpots
      }
    });
  } catch (error) {
    console.error('Erreur récupération parking:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Mettre à jour un parking
// @route   PUT /api/parkings/:id
// @access  Private/Proprietaire
exports.updateParking = async (req, res) => {
  try {
    let parking = await Parking.findById(req.params.id);

    if (!parking) {
      return res.status(404).json({
        success: false,
        message: 'Parking non trouvé'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (parking.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à modifier ce parking'
      });
    }

    // Mettre à jour le parking
    parking = await Parking.findByIdAndUpdate(
      req.params.id,
      { $set: req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Parking mis à jour avec succès',
      data: parking
    });
  } catch (error) {
    console.error('Erreur mise à jour parking:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message
    });
  }
};

// @desc    Supprimer un parking
// @route   DELETE /api/parkings/:id
// @access  Private/Proprietaire/Admin
exports.deleteParking = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id);

    if (!parking) {
      return res.status(404).json({
        success: false,
        message: 'Parking non trouvé'
      });
    }

    // Vérifier les autorisations
    if (parking.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à supprimer ce parking'
      });
    }

    // Vérifier s'il y a des réservations futures
    const futureReservations = await Reservation.find({
      parking: parking._id,
      startTime: { $gt: new Date() },
      status: { $in: ['confirmed', 'pending'] }
    });

    if (futureReservations.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer, des réservations futures existent'
      });
    }

    // Annuler les réservations en cours
    await Reservation.updateMany(
      { parking: parking._id, status: { $in: ['pending', 'confirmed'] } },
      { $set: { status: 'cancelled', cancellationReason: 'Parking supprimé' } }
    );

    // Supprimer le parking et ses places
    await parking.deleteOne();
    await Spot.deleteMany({ parking: parking._id });

    res.json({
      success: true,
      message: 'Parking supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression parking:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      error: error.message
    });
  }
};

// @desc    Ajouter une image au parking
// @route   POST /api/parkings/:id/images
// @access  Private/Proprietaire
exports.addParkingImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez télécharger une image'
      });
    }

    const parking = await Parking.findById(req.params.id);

    if (!parking) {
      return res.status(404).json({
        success: false,
        message: 'Parking non trouvé'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (parking.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    // Ajouter l'image
    const newImage = {
      url: req.file.path,
      publicId: req.file.filename,
      isMain: parking.images.length === 0 // Première image devient principale
    };

    parking.images.push(newImage);
    await parking.save();

    res.json({
      success: true,
      message: 'Image ajoutée avec succès',
      image: newImage
    });
  } catch (error) {
    console.error('Erreur ajout image:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout de l\'image',
      error: error.message
    });
  }
};

// @desc    Obtenir les statistiques d'un parking
// @route   GET /api/parkings/:id/stats
// @access  Private/Proprietaire
exports.getParkingStats = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id);

    if (!parking) {
      return res.status(404).json({
        success: false,
        message: 'Parking non trouvé'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire ou admin
    if (parking.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    // Statistiques des 30 derniers jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reservations = await Reservation.aggregate([
      {
        $match: {
          parking: mongoose.Types.ObjectId(req.params.id),
          createdAt: { $gte: thirtyDaysAgo },
          status: { $in: ['completed', 'confirmed', 'active'] }
        }
      },
      {
        $group: {
          _id: null,
          totalReservations: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    // Réservations par jour
    const dailyReservations = await Reservation.aggregate([
      {
        $match: {
          parking: mongoose.Types.ObjectId(req.params.id),
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Taux d'occupation
    const occupancy = await Reservation.aggregate([
      {
        $match: {
          parking: mongoose.Types.ObjectId(req.params.id),
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalHours: { $sum: '$duration' },
          maxPossibleHours: { 
            $sum: { 
              $multiply: [
                { $subtract: ['$endTime', '$startTime'] },
                parking.totalSpots
              ]
            }
          }
        }
      }
    ]);

    const stats = {
      totalReservations: reservations[0]?.totalReservations || 0,
      totalRevenue: reservations[0]?.totalRevenue || 0,
      averageDuration: reservations[0]?.avgDuration || 0,
      dailyReservations,
      occupancyRate: occupancy[0] ? 
        (occupancy[0].totalHours / occupancy[0].maxPossibleHours * 100).toFixed(2) : 0,
      totalSpots: parking.totalSpots,
      availableSpots: parking.availableSpots,
      averageRating: parking.averageRating,
      ratingCount: parking.ratingCount
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erreur statistiques parking:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};


exports.approveParking = async(req , res) => {
  console.log('🔥 APPROVE ROUTE HIT', req.params.id);
  try {
    const parking= await Parking.findById(req.params.id).populate('owner')

    if (!parking) {
      return res.status(404).json({message : 'Parking introuvable'})
    }

    parking.status= 'active'
    await parking.save()

    //notifier le proprietaire
    const io = req.app.get('io')
    io.to(`user-${parking.owner._id}`).emit('parking-approved', {
      parkingId: parking._id,
      parkingName: parking.name
    })

    res.json({success: true, message: 'Parking validé'})
  } catch (error ){
    res.status(500).json({message: 'Erreur serveur'})

  }
}

exports.rejectParking = async (req, res) => {

  try {
    const parking = await Parking.findById(req.params.id).populate('owner')

  if (!parking) {
      return res.status(404).json({message : 'Parking introuvable'})
  }

  parking.status= 'rejected'
  await parking.save()

  console.log('❌ PARKING REJECTED:', parking._id, parking.status);


  const io = req.app.get('io')
  io.to(`user-${parking.owner._id}`).emit('parking-rejected' , {
    parkingId : parking._id,
    parkingName : parking.name
  })
  res.json({success: true, message: 'Parking refusé'})
  } catch (error ) {
    res.status(500).json({message: 'Erreur Serveur'})
  }

}