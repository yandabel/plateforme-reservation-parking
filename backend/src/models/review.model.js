const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parking',
    required: true
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  photos: [{
    url: String,
    publicId: String
  }],
  response: {
    ownerReply: String,
    repliedAt: Date
  },
  helpful: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reported: {
    type: Boolean,
    default: false
  },
  reportReason: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index composite pour éviter les doublons
reviewSchema.index({ user: 1, parking: 1 }, { unique: true });

// Middleware pour mettre à jour la note moyenne du parking
reviewSchema.post('save', async function() {
  if (this.status === 'approved') {
    await this.constructor.updateParkingRating(this.parking);
  }
});

reviewSchema.post('findOneAndUpdate', async function(doc) {
  if (doc && doc.status === 'approved') {
    await doc.constructor.updateParkingRating(doc.parking);
  }
});

reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.status === 'approved') {
    await doc.constructor.updateParkingRating(doc.parking);
  }
});

// Méthode statique pour mettre à jour la note moyenne
reviewSchema.statics.updateParkingRating = async function(parkingId) {
  const result = await this.aggregate([
    {
      $match: { 
        parking: parkingId,
        status: 'approved'
      }
    },
    {
      $group: {
        _id: '$parking',
        averageRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 }
      }
    }
  ]);

  if (result.length > 0) {
    await mongoose.model('Parking').findByIdAndUpdate(parkingId, {
      averageRating: result[0].averageRating.toFixed(1),
      ratingCount: result[0].ratingCount
    });
  } else {
    await mongoose.model('Parking').findByIdAndUpdate(parkingId, {
      averageRating: 0,
      ratingCount: 0
    });
  }
};

module.exports = mongoose.model('Review', reviewSchema);