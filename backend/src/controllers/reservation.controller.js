const Reservation = require('../models/reservation.model');
const Parking = require('../models/parking.model');
const Spot = require('../models/spot.model');
const Vehicle = require('../models/vehicle.model');
const Transaction = require('../models/transaction.model');
const mongoose = require('mongoose');

const generateReservationReference = () => {
  return `RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

// @desc    Créer une nouvelle réservation
// @route   POST /api/reservations
// @access  Private
exports.createReservation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      parkingId,
      spotId,
      vehicleId,
      startTime,
      endTime,
      paymentMethod
    } = req.body;

    // Validation des dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (start < now) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'La date de début doit être dans le future'
      });
    }

    if (end <= start) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'La date de fin doit être après la date de début'
      });
    }

    // Calcul de la durée en heures
    const duration = Math.ceil((end - start) / (1000 * 60 * 60));

    if (duration < 1) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'La durée minimale est de 1 heure'
      });
    }

    // Vérifier le parking
    const parking = await Parking.findById(parkingId).session(session);
    if (!parking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Parking non trouvé'
      });
    }

    // Vérifier la disponibilité du parking
    if (parking.availableSpots < 1) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Plus de places disponibles dans ce parking'
      });
    }

    // Vérifier la place
    const spot = await Spot.findById(spotId).session(session);
    if (!spot || spot.parking.toString() !== parkingId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Place non trouvée ou n\'appartient pas à ce parking'
      });
    }

    if (spot.status !== 'available') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cette place n\'est pas disponible'
      });
    }

    // Vérifier s'il y a des conflits de réservation
    const conflictingReservation = await Reservation.findOne({
      spot: spotId,
      $or: [
        {
          startTime: { $lt: end },
          endTime: { $gt: start }
        }
      ],
      status: { $in: ['confirmed', 'active'] }
    }).session(session);

    if (conflictingReservation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cette place est déjà réservée pour cette période'
      });
    }

    // Vérifier le véhicule
    let vehicle;
    if (vehicleId) {
      vehicle = await Vehicle.findOne({
        _id: vehicleId,
        user: req.user.id
      }).session(session);
      
      if (!vehicle) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'Véhicule non trouvé'
        });
      }
    } else {
      // Utiliser le véhicule par défaut
      vehicle = await Vehicle.findOne({
        user: req.user.id,
        isDefault: true
      }).session(session);
    }

    // Calculer le prix
    let totalPrice = 0;
    const hourlyRate = spot.customHourlyRate || parking.hourlyRate;
    const dailyRate = spot.customDailyRate || parking.dailyRate;

    if (dailyRate && duration >= 24) {
      const days = Math.floor(duration / 24);
      const remainingHours = duration % 24;
      totalPrice = days * dailyRate;
      
      if (remainingHours > 0) {
        totalPrice += Math.min(remainingHours * hourlyRate, dailyRate);
      }
    } else {
      totalPrice = duration * hourlyRate;
    }

    // Créer la réservation
    const reservation = await Reservation.create([{
      reference: generateReservationReference(),
      user: req.user.id,
      parking: parkingId,
      spot: spotId,
      vehicle: vehicle?._id,
      startTime: start,
      endTime: end,
      duration: duration,
      totalPrice: totalPrice,
      paymentMethod: paymentMethod,
      status: paymentMethod === 'cash' ? 'confirmed' : 'pending',
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'pending'
    }], { session });

    // Mettre à jour le statut de la place
    spot.status = 'reserved';
    spot.currentReservation = reservation[0]._id;
    await spot.save({ session });

    // Mettre à jour les places disponibles du parking
    parking.availableSpots -= 1;
    await parking.save({ session });

    // Créer la transaction si paiement en ligne
    if (paymentMethod !== 'cash') {
      await Transaction.create([{
        reservation: reservation[0]._id,
        user: req.user.id,
        amount: totalPrice,
        paymentMethod: paymentMethod,
        status: 'pending'
      }], { session });
    }

    await session.commitTransaction();
    session.endSession();

    // Notifier le propriétaire via Socket.io
    const io = req.app.get('io');
    io.to(`user-${parking.owner}`).emit('new-reservation', {
      reservationId: reservation[0]._id,
      reservationRef: reservation[0].reference,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      startTime: reservation[0].startTime,
      totalPrice: reservation[0].totalPrice
    });

    res.status(201).json({
      success: true,
      message: 'Réservation créée avec succès',
      data: reservation[0]
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Erreur création réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la réservation',
      error: error.message
    });
  }
};

// @desc    Récupérer les réservations de l'utilisateur
// @route   GET /api/reservations/my-reservations
// @access  Private
exports.getMyReservations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'startTime',
      sortOrder = 'desc'
    } = req.query;

    const query = { user: req.user.id };

    if (status) {
      query.status = status;
    }

    // Tri
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = parseInt(page) * parseInt(limit);

    const total = await Reservation.countDocuments(query);
    const reservations = await Reservation.find(query)
      .populate('parking', 'name address images')
      .populate('spot', 'spotNumber type')
      .populate('vehicle', 'brand model licensePlate')
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
      count: reservations.length,
      pagination,
      data: reservations
    });
  } catch (error) {
    console.error('Erreur récupération réservations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Récupérer une réservation par ID
// @route   GET /api/reservations/:id
// @access  Private
exports.getReservationById = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('parking', 'name address images hourlyRate dailyRate features')
      .populate('spot', 'spotNumber type features')
      .populate('vehicle', 'brand model licensePlate color')
      .populate('user', 'firstName lastName email phone');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Vérifier que l'utilisateur a accès à cette réservation
    if (reservation.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      // Vérifier si l'utilisateur est le propriétaire du parking
      const parking = await Parking.findById(reservation.parking._id);
      if (parking.owner.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Non autorisé à voir cette réservation'
        });
      }
    }

    // Récupérer la transaction associée
    const transaction = await Transaction.findOne({
      reservation: reservation._id
    });

    res.json({
      success: true,
      data: {
        ...reservation.toObject(),
        transaction
      }
    });
  } catch (error) {
    console.error('Erreur récupération réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Annuler une réservation
// @route   PUT /api/reservations/:id/cancel
// @access  Private
exports.cancelReservation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const reservation = await Reservation.findById(req.params.id).session(session);

    if (!reservation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Vérifier que l'utilisateur peut annuler
    if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à annuler cette réservation'
      });
    }

    // Vérifier si l'annulation est possible
    const now = new Date();
    const startTime = new Date(reservation.startTime);
    const hoursUntilStart = (startTime - now) / (1000 * 60 * 60);

    if (hoursUntilStart < 2) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Impossible d\'annuler moins de 2 heures avant le début'
      });
    }

    if (reservation.status === 'cancelled') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cette réservation est déjà annulée'
      });
    }

    // Mettre à jour la réservation
    reservation.status = 'cancelled';
    reservation.cancellationReason = req.body.reason || 'Annulé par l\'utilisateur';
    reservation.cancelledAt = now;
    await reservation.save({ session });

    // Libérer la place
    await Spot.findByIdAndUpdate(
      reservation.spot,
      { 
        status: 'available',
        currentReservation: null 
      },
      { session }
    );

    // Mettre à jour les places disponibles du parking
    await Parking.findByIdAndUpdate(
      reservation.parking,
      { $inc: { availableSpots: 1 } },
      { session }
    );

    // Remboursement si déjà payé
    if (reservation.paymentStatus === 'paid') {
      const transaction = await Transaction.findOne({
        reservation: reservation._id,
        status: 'completed'
      }).session(session);

      if (transaction) {
        // Calculer le montant à rembourser (80% si moins de 24h avant)
        let refundAmount = transaction.amount;
        if (hoursUntilStart < 24) {
          refundAmount = transaction.amount * 0.8;
        }

        transaction.status = 'refunded';
        transaction.refundAmount = refundAmount;
        transaction.refundReason = reservation.cancellationReason;
        transaction.refundedAt = now;
        await transaction.save({ session });

        // Mettre à jour le statut de paiement de la réservation
        reservation.paymentStatus = 'refunded';
        await reservation.save({ session });

        // Notifier l'utilisateur du remboursement
        const io = req.app.get('io');
        io.to(`user-${reservation.user}`).emit('refund-processed', {
          reservationId: reservation._id,
          amount: refundAmount,
          refundedAt: now
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    // Notifier le propriétaire
    const parking = await Parking.findById(reservation.parking);
    const io = req.app.get('io');
    io.to(`user-${parking.owner}`).emit('reservation-cancelled', {
      reservationId: reservation._id,
      reservationRef: reservation.reference,
      reason: reservation.cancellationReason
    });

    res.json({
      success: true,
      message: 'Réservation annulée avec succès'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Erreur annulation réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation',
      error: error.message
    });
  }
};

// @desc    Check-in pour une réservation
// @route   PUT /api/reservations/:id/checkin
// @access  Private/Proprietaire
exports.checkIn = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire du parking
    const parking = await Parking.findById(reservation.parking);
    if (parking.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    // Vérifier que la réservation peut être check-in
    const now = new Date();
    const startTime = new Date(reservation.startTime);

    if (now < startTime) {
      return res.status(400).json({
        success: false,
        message: 'Le check-in n\'est pas encore autorisé'
      });
    }

    if (reservation.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Cette réservation n\'est pas confirmée'
      });
    }

    // Mettre à jour la réservation
    reservation.status = 'active';
    reservation.checkInTime = now;
    await reservation.save();

    // Mettre à jour le statut de la place
    await Spot.findByIdAndUpdate(reservation.spot, {
      status: 'occupied'
    });

    // Notifier l'utilisateur
    const io = req.app.get('io');
    io.to(`user-${reservation.user}`).emit('checkin-confirmed', {
      reservationId: reservation._id,
      checkInTime: now,
      spotNumber: (await Spot.findById(reservation.spot)).spotNumber
    });

    res.json({
      success: true,
      message: 'Check-in enregistré avec succès'
    });
  } catch (error) {
    console.error('Erreur check-in:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Check-out pour une réservation
// @route   PUT /api/reservations/:id/checkout
// @access  Private/Proprietaire
exports.checkOut = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire du parking
    const parking = await Parking.findById(reservation.parking);
    if (parking.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    // Vérifier que la réservation peut être check-out
    if (reservation.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cette réservation n\'est pas active'
      });
    }

    const now = new Date();
    const endTime = new Date(reservation.endTime);

    // Calculer les heures supplémentaires si nécessaire
    let extraHours = 0;
    let extraCost = 0;

    if (now > endTime) {
      extraHours = Math.ceil((now - endTime) / (1000 * 60 * 60));
      extraCost = extraHours * parking.hourlyRate;
    }

    // Mettre à jour la réservation
    reservation.status = 'completed';
    reservation.checkOutTime = now;
    
    if (extraHours > 0) {
      reservation.duration += extraHours;
      reservation.totalPrice += extraCost;
    }

    await reservation.save();

    // Libérer la place
    await Spot.findByIdAndUpdate(reservation.spot, {
      status: 'available',
      currentReservation: null
    });

    // Mettre à jour les places disponibles du parking
    await Parking.findByIdAndUpdate(reservation.parking, {
      $inc: { availableSpots: 1 }
    });

    // Créer une transaction pour les heures supplémentaires si nécessaire
    if (extraCost > 0) {
      await Transaction.create({
        reservation: reservation._id,
        user: reservation.user,
        amount: extraCost,
        paymentMethod: reservation.paymentMethod,
        status: 'pending',
        metadata: {
          type: 'extra_hours',
          hours: extraHours,
          description: `Heures supplémentaires: ${extraHours}h`
        }
      });
    }

    // Notifier l'utilisateur
    const io = req.app.get('io');
    io.to(`user-${reservation.user}`).emit('checkout-confirmed', {
      reservationId: reservation._id,
      checkOutTime: now,
      extraHours,
      extraCost
    });

    res.json({
      success: true,
      message: 'Check-out enregistré avec succès',
      data: {
        extraHours,
        extraCost
      }
    });
  } catch (error) {
    console.error('Erreur check-out:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};