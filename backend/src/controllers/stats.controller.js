const Reservation = require('../models/reservation.model');
const Parking = require('../models/parking.model');
const Transaction = require('../models/transaction.model');
const User = require('../models/user.model');

// @desc    Statistiques générales
// @route   GET /api/stats/overview
// @access  Private/Admin
exports.getOverviewStats = async (req, res) => {
  try {
    // Derniers 30 jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [
      totalUsers,
      totalParkings,
      totalReservations,
      recentReservations,
      totalRevenue,
      activeParkings
    ] = await Promise.all([
      User.countDocuments(),
      Parking.countDocuments(),
      Reservation.countDocuments(),
      Reservation.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Transaction.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Parking.countDocuments({ status: 'active' })
    ]);
    
    // Réservations par jour (30 derniers jours)
    const dailyReservations = await Reservation.aggregate([
      {
        $match: {
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
    
    // Répartition par statut
    const statusDistribution = await Reservation.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Top 5 villes
    const topCities = await Parking.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$address.city',
          count: { $sum: 1 },
          avgPrice: { $avg: '$hourlyRate' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    res.json({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          parkings: totalParkings,
          reservations: totalReservations,
          recentReservations,
          revenue: totalRevenue[0]?.total || 0,
          activeParkings
        },
        charts: {
          dailyReservations,
          statusDistribution,
          topCities
        }
      }
    });
  } catch (error) {
    console.error('Erreur statistiques overview:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Statistiques propriétaire
// @route   GET /api/stats/owner
// @access  Private/Propriétaire
exports.getOwnerStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Parkings du propriétaire
    const parkings = await Parking.find({ owner: req.user.id });
    const parkingIds = parkings.map(p => p._id);
    
    const [
      totalReservations,
      activeReservations,
      totalRevenue,
      monthlyRevenue,
      averageRating,
      occupancyRate
    ] = await Promise.all([
      // Totaux
      Reservation.countDocuments({ parking: { $in: parkingIds } }),
      Reservation.countDocuments({ 
        parking: { $in: parkingIds },
        status: { $in: ['confirmed', 'active'] }
      }),
      
      // Revenus
      Reservation.aggregate([
        { $match: { parking: { $in: parkingIds }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Reservation.aggregate([
        { 
          $match: { 
            parking: { $in: parkingIds },
            status: 'completed',
            createdAt: { $gte: thirtyDaysAgo }
          } 
        },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      
      // Notes moyennes
      Review.aggregate([
        { $match: { parking: { $in: parkingIds }, status: 'approved' } },
        { $group: { _id: null, average: { $avg: '$rating' } } }
      ]),
      
      // Taux d'occupation
      calculateOccupancyRate(parkingIds)
    ]);
    
    // Réservations par parking
    const reservationsByParking = await Reservation.aggregate([
      { $match: { parking: { $in: parkingIds } } },
      {
        $group: {
          _id: '$parking',
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' }
        }
      },
      {
        $lookup: {
          from: 'parkings',
          localField: '_id',
          foreignField: '_id',
          as: 'parking'
        }
      },
      { $unwind: '$parking' },
      {
        $project: {
          parkingName: '$parking.name',
          count: 1,
          revenue: 1
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Revenus mensuels (6 derniers mois)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyRevenueChart = await Reservation.aggregate([
      {
        $match: {
          parking: { $in: parkingIds },
          status: 'completed',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalPrice' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        totals: {
          parkings: parkings.length,
          totalReservations,
          activeReservations,
          totalRevenue: totalRevenue[0]?.total || 0,
          monthlyRevenue: monthlyRevenue[0]?.total || 0,
          averageRating: averageRating[0]?.average?.toFixed(1) || '0.0',
          occupancyRate: occupancyRate.toFixed(1) + '%'
        },
        byParking: reservationsByParking,
        charts: {
          monthlyRevenue: monthlyRevenueChart
        },
        parkings: parkings.map(p => ({
          id: p._id,
          name: p.name,
          city: p.address.city,
          availableSpots: p.availableSpots,
          totalSpots: p.totalSpots,
          hourlyRate: p.hourlyRate,
          rating: p.averageRating
        }))
      }
    });
  } catch (error) {
    console.error('Erreur statistiques propriétaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// Fonction pour calculer le taux d'occupation
const calculateOccupancyRate = async (parkingIds) => {
  const reservations = await Reservation.find({
    parking: { $in: parkingIds },
    status: 'completed'
  }).select('duration totalSpots');
  
  if (reservations.length === 0) return 0;
  
  const totalHours = reservations.reduce((sum, res) => sum + res.duration, 0);
  const maxPossibleHours = reservations.reduce((sum, res) => {
    return sum + (res.duration * (res.totalSpots || 1));
  }, 0);
  
  return maxPossibleHours > 0 ? (totalHours / maxPossibleHours) * 100 : 0;
};

// @desc    Statistiques temps réel
// @route   GET /api/stats/realtime
// @access  Private/Admin
exports.getRealtimeStats = async (req, res) => {
  try {
    // Aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [
      todayReservations,
      todayRevenue,
      activeUsers,
      pendingActions,
      latestReservations
    ] = await Promise.all([
      // Aujourd'hui
      Reservation.countDocuments({ 
        createdAt: { $gte: today, $lt: tomorrow } 
      }),
      Reservation.aggregate([
        { 
          $match: { 
            status: 'completed',
            createdAt: { $gte: today, $lt: tomorrow }
          } 
        },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      
      // Utilisateurs actifs (connectés dans les 5 dernières minutes via socket)
      // Note: Vous devrez implémenter un système de tracking des connexions
      0, // À implémenter
      
      // Actions en attente
      Promise.all([
        Parking.countDocuments({ status: 'under_review' }),
        Review.countDocuments({ status: 'pending' }),
        User.countDocuments({ status: 'suspended' })
      ]),
      
      // Dernières réservations
      Reservation.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'firstName lastName')
        .populate('parking', 'name')
        .select('reference totalPrice status createdAt')
    ]);
    
    res.json({
      success: true,
      data: {
        today: {
          reservations: todayReservations,
          revenue: todayRevenue[0]?.total || 0
        },
        activeUsers,
        pending: {
          parkings: pendingActions[0],
          reviews: pendingActions[1],
          suspendedUsers: pendingActions[2]
        },
        latestReservations
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur stats temps réel:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};