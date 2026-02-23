const mongoose = require('mongoose');

const Review = require('../models/review.model');
const Parking = require('../models/parking.model');
const Reservation = require('../models/reservation.model');

// @desc    Créer un avis
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { parkingId, reservationId, rating, title, comment } = req.body;
    
    // Vérifier le parking
    const parking = await Parking.findById(parkingId);
    if (!parking) {
      return res.status(404).json({
        success: false,
        message: 'Parking non trouvé'
      });
    }
    
    // Vérifier la réservation
    if (reservationId) {
      const reservation = await Reservation.findOne({
        _id: reservationId,
        user: req.user.id,
        parking: parkingId,
        status: 'completed'
      });
      
      if (!reservation) {
        return res.status(400).json({
          success: false,
          message: 'Vous devez avoir complété une réservation pour laisser un avis'
        });
      }
    }
    
    // Vérifier si l'utilisateur a déjà laissé un avis pour ce parking
    const existingReview = await Review.findOne({
      user: req.user.id,
      parking: parkingId
    });
    
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà laissé un avis pour ce parking'
      });
    }
    
    // Créer l'avis
    const review = await Review.create({
      user: req.user.id,
      parking: parkingId,
      reservation: reservationId,
      rating,
      title,
      comment,
      status: 'pending' // En attente de modération
    });
    
    // Populer pour la réponse
    await review.populate('user', 'firstName lastName avatar');
    
    res.status(201).json({
      success: true,
      message: 'Avis soumis avec succès. Il sera visible après modération.',
      data: review
    });
  } catch (error) {
    console.error('Erreur création avis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'avis',
      error: error.message
    });
  }
};

// @desc    Récupérer les avis d'un parking
// @route   GET /api/reviews/parking/:parkingId
// @access  Public
exports.getParkingReviews = async (req, res) => {
  try {
    const { parkingId } = req.params;

    // 🛡️ VALIDATION CRITIQUE
    if (!parkingId || !mongoose.Types.ObjectId.isValid(parkingId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de parking invalide'
      });
    }

    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = { 
      parking: parkingId,
      status: 'approved'
    };

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);

    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .populate('user', 'firstName lastName avatar')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip(startIndex);

    // Calculer la note moyenne
    const stats = await Review.aggregate([
      { $match: { parking: new mongoose.Types.ObjectId(parkingId), status: 'approved' } },
      {
        $group: {
          _id: '$parking',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: { $push: '$rating' }
        }
      }
    ]);

    const ratingStats = stats[0] || {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: []
    };

    res.json({
      success: true,
      data: reviews,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        totalReviews: total
      },
      stats: {
        averageRating: ratingStats.averageRating
          ? ratingStats.averageRating.toFixed(1)
          : '0.0',
        totalReviews: ratingStats.totalReviews
      }
    });
  } catch (error) {
    console.error('Erreur récupération avis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};


// @desc    Récupérer les avis de l'utilisateur
// @route   GET /api/reviews/my-reviews
// @access  Private
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.id })
      .populate('parking', 'name address.city images')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error('Erreur récupération avis utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Mettre à jour un avis
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    let review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avis non trouvé'
      });
    }
    
    // Vérifier que l'utilisateur est propriétaire de l'avis
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à modifier cet avis'
      });
    }
    
    // Seuls certains champs peuvent être modifiés
    const allowedUpdates = ['rating', 'title', 'comment'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    review = await Review.findByIdAndUpdate(
      req.params.id,
      { $set: updates, status: 'pending' }, // Retour en modération
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName avatar');
    
    res.json({
      success: true,
      message: 'Avis mis à jour. Il sera réexaminé par notre équipe.',
      data: review
    });
  } catch (error) {
    console.error('Erreur mise à jour avis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message
    });
  }
};

// @desc    Supprimer un avis
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avis non trouvé'
      });
    }
    
    // Vérifier les permissions
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à supprimer cet avis'
      });
    }
    
    await review.deleteOne();
    
    res.json({
      success: true,
      message: 'Avis supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression avis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      error: error.message
    });
  }
};

// @desc    Signaler un avis
// @route   POST /api/reviews/:id/report
// @access  Private
exports.reportReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avis non trouvé'
      });
    }
    
    // Ne pas signaler son propre avis
    if (review.user.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas signaler votre propre avis'
      });
    }
    
    review.reported = true;
    review.reportReason = req.body.reason;
    await review.save();
    
    // Notifier les administrateurs
    const io = req.app.get('io');
    io.to('admin-room').emit('review-reported', {
      reviewId: review._id,
      reporterId: req.user.id,
      reason: req.body.reason
    });
    
    res.json({
      success: true,
      message: 'Avis signalé. Notre équipe l\'examinera.'
    });
  } catch (error) {
    console.error('Erreur signalement avis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Marquer un avis comme utile
// @route   POST /api/reviews/:id/helpful
// @access  Private
exports.markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avis non trouvé'
      });
    }
    
    // Vérifier si l'utilisateur a déjà marqué comme utile
    const alreadyHelpful = review.helpful.users.includes(req.user.id);
    
    if (alreadyHelpful) {
      // Retirer le vote
      review.helpful.users = review.helpful.users.filter(
        userId => userId.toString() !== req.user.id
      );
      review.helpful.count = Math.max(0, review.helpful.count - 1);
    } else {
      // Ajouter le vote
      review.helpful.users.push(req.user.id);
      review.helpful.count += 1;
    }
    
    await review.save();
    
    res.json({
      success: true,
      message: alreadyHelpful ? 'Vote retiré' : 'Merci pour votre vote!',
      helpfulCount: review.helpful.count,
      isHelpful: !alreadyHelpful
    });
  } catch (error) {
    console.error('Erreur vote utile:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Répondre à un avis (Propriétaire)
// @route   POST /api/reviews/:id/reply
// @access  Private/Propriétaire
exports.replyToReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).populate('parking');
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avis non trouvé'
      });
    }
    
    // Vérifier que l'utilisateur est propriétaire du parking
    const parking = review.parking;
    if (parking.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Seul le propriétaire du parking peut répondre'
      });
    }
    
    review.response = {
      ownerReply: req.body.reply,
      repliedAt: new Date()
    };
    
    await review.save();
    
    // Notifier l'utilisateur qui a laissé l'avis
    const io = req.app.get('io');
    io.to(`user-${review.user}`).emit('review-replied', {
      reviewId: review._id,
      parkingName: parking.name,
      reply: req.body.reply
    });
    
    res.json({
      success: true,
      message: 'Réponse ajoutée avec succès',
      data: review
    });
  } catch (error) {
    console.error('Erreur réponse avis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};