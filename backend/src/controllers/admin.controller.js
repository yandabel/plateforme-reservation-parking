const User = require('../models/user.model');
const Parking = require('../models/parking.model');
const Reservation = require('../models/reservation.model');
const Review = require('../models/review.model');
const Transaction = require('../models/transaction.model');

// @desc    Dashboard admin
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    // Calculer les statistiques
    const [
      totalUsers,
      totalParkings,
      totalReservations,
      totalRevenue,
      pendingReviews,
      pendingParkings,
      recentUsers,
      recentReservations
    ] = await Promise.all([
      // Totaux
      User.countDocuments(),
      Parking.countDocuments(),
      Reservation.countDocuments(),
      Transaction.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      
      // En attente
      Review.countDocuments({ status: 'pending' }),
      Parking.countDocuments({ status: 'under_review' }),
      
      // Récents (7 derniers jours)
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName email role createdAt'),
      
      Reservation.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'firstName lastName')
        .populate('parking', 'name')
        .select('reference totalPrice status createdAt')
    ]);

    // Statistiques par mois (6 derniers mois)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await Reservation.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 }
    ]);

    // Top parkings
    const topParkings = await Parking.aggregate([
      {
        $lookup: {
          from: 'reservations',
          localField: '_id',
          foreignField: 'parking',
          as: 'reservations'
        }
      },
      {
        $project: {
          name: 1,
          city: '$address.city',
          totalSpots: 1,
          availableSpots: 1,
          hourlyRate: 1,
          averageRating: 1,
          reservationCount: { $size: '$reservations' },
          occupancyRate: {
            $cond: {
              if: { $gt: ['$totalSpots', 0] },
              then: {
                $multiply: [
                  { $divide: [{ $subtract: ['$totalSpots', '$availableSpots'] }, '$totalSpots'] },
                  100
                ]
              },
              else: 0
            }
          }
        }
      },
      { $sort: { reservationCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          parkings: totalParkings,
          reservations: totalReservations,
          revenue: totalRevenue[0]?.total || 0
        },
        pending: {
          reviews: pendingReviews,
          parkings: pendingParkings
        },
        recent: {
          users: recentUsers,
          reservations: recentReservations
        },
        monthlyStats,
        topParkings
      }
    });
  } catch (error) {
    console.error('Erreur dashboard admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Gérer les utilisateurs
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = '', status = '' } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) query.role = role;
    if (status) query.status = status;
    
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(startIndex);
    
    res.json({
      success: true,
      data: users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        totalUsers: total
      }
    });
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Modifier le statut d'un utilisateur
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Ne pas modifier les admins
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de modifier un administrateur'
      });
    }
    
    user.status = status;
    await user.save();
    
    // Notifier l'utilisateur
    const io = req.app.get('io');
    io.to(`user-${user._id}`).emit('account-status-changed', {
      status,
      reason,
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      message: `Statut utilisateur mis à jour: ${status}`,
      data: user
    });
  } catch (error) {
    console.error('Erreur modification statut utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Valider/Rejeter un parking
// @route   PUT /api/admin/parkings/:id/status
// @access  Private/Admin
exports.updateParkingStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    const parking = await Parking.findById(req.params.id).populate('owner');
    
    if (!parking) {
      return res.status(404).json({
        success: false,
        message: 'Parking non trouvé'
      });
    }
    
    const oldStatus = parking.status;
    parking.status = status;
    
    if (status === 'rejected' && reason) {
      parking.rejectionReason = reason;
    }
    
    await parking.save();
    
    // Notifier le propriétaire
    const io = req.app.get('io');
    io.to(`user-${parking.owner._id}`).emit('parking-status-changed', {
      parkingId: parking._id,
      parkingName: parking.name,
      oldStatus,
      newStatus: status,
      reason,
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      message: `Statut parking mis à jour: ${status}`,
      data: parking
    });
  } catch (error) {
    console.error('Erreur modification statut parking:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Modérer les avis
// @route   PUT /api/admin/reviews/:id/status
// @access  Private/Admin
exports.updateReviewStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    const review = await Review.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('parking', 'name');
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avis non trouvé'
      });
    }
    
    review.status = status;
    
    if (status === 'rejected' && reason) {
      review.rejectionReason = reason;
    }
    
    await review.save();
    
    // Notifier l'utilisateur
    if (status === 'approved' || status === 'rejected') {
      const io = req.app.get('io');
      io.to(`user-${review.user._id}`).emit('review-status-changed', {
        reviewId: review._id,
        parkingName: review.parking.name,
        status,
        reason,
        updatedAt: new Date()
      });
    }
    
    res.json({
      success: true,
      message: `Avis ${status === 'approved' ? 'approuvé' : 'rejeté'}`,
      data: review
    });
  } catch (error) {
    console.error('Erreur modération avis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Récupérer les transactions
// @route   GET /api/admin/transactions
// @access  Private/Admin
exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 50, startDate, endDate, status } = req.query;
    
    const query = {};
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    if (status) query.status = status;
    
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    
    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate('user', 'firstName lastName email')
      .populate('reservation')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(startIndex);
    
    // Statistiques financières
    const stats = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          avgTransaction: { $avg: '$amount' },
          byStatus: {
            $push: {
              status: '$status',
              amount: '$amount'
            }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: transactions,
      stats: stats[0] || {
        totalRevenue: 0,
        totalTransactions: 0,
        avgTransaction: 0
      },
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        totalTransactions: total
      }
    });
  } catch (error) {
    console.error('Erreur récupération transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Exporter les données
// @route   GET /api/admin/export/:type
// @access  Private/Admin
exports.exportData = async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    
    const query = {};
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    let data;
    let filename;
    
    switch (type) {
      case 'users':
        data = await User.find(query).select('-password');
        filename = `users_${Date.now()}.json`;
        break;
        
      case 'reservations':
        data = await Reservation.find(query)
          .populate('user', 'firstName lastName email')
          .populate('parking', 'name address.city');
        filename = `reservations_${Date.now()}.json`;
        break;
        
      case 'transactions':
        data = await Transaction.find(query)
          .populate('user', 'firstName lastName email');
        filename = `transactions_${Date.now()}.json`;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Type d\'export non supporté'
        });
    }
    
    // Convertir en CSV
    const csv = convertToCSV(data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    res.send(csv);
  } catch (error) {
    console.error('Erreur export données:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// Fonction utilitaire pour convertir en CSV
const convertToCSV = (data) => {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0].toObject ? data[0].toObject() : data[0]);
  const rows = data.map(item => {
    const obj = item.toObject ? item.toObject() : item;
    return headers.map(header => {
      let value = obj[header];
      if (value && typeof value === 'object') {
        value = JSON.stringify(value);
      }
      return `"${String(value || '').replace(/"/g, '""')}"`;
    }).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
};