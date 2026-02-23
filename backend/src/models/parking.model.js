const mongoose = require('mongoose');

const parkingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nom du parking est requis'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description est requise']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      default: 'Maroc'
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
          validator: function (val) {
            return (
            Array.isArray(val) &&
            val.length === 2 &&
            val.every(v => typeof v === 'number') &&
            !(val[0] === 0 && val[1] === 0)
          );
        },
            message: 'Les coordonnées doivent être un tableau de 2 nombres valides'
        },
    }
  },
  images: [{
    url: String,
    publicId: String,
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  totalSpots: {
    type: Number,
    required: true,
    min: [1, 'Un parking doit avoir au moins 1 place']
  },
  availableSpots: {
    type: Number,
    default: function() {
      return this.totalSpots;
    }
  },
  hourlyRate: {
    type: Number,
    required: true,
    min: [0, 'Le tarif horaire ne peut pas être négatif']
  },
  dailyRate: {
    type: Number,
    min: [0, 'Le tarif journalier ne peut pas être négatif']
  },
  monthlyRate: {
    type: Number,
    min: [0, 'Le tarif mensuel ne peut pas être négatif']
  },
  openingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  is24h: {
    type: Boolean,
    default: false
  },
  features: {
    covered: { type: Boolean, default: false },
    security: { type: Boolean, default: false },
    surveillance: { type: Boolean, default: false },
    lighting: { type: Boolean, default: false },
    disabledAccess: { type: Boolean, default: false },
    electricCharging: { type: Boolean, default: false },
    valetService: { type: Boolean, default: false }
  },
  spotTypes: [{
    type: {
      type: String,
      enum: ['voiture', 'moto', 'utilitaire', 'camion', 'handicape'],
      required: true
    },
    count: {
      type: Number,
      required: true,
      min: 0
    },
    hourlyRate: Number,
    dailyRate: Number
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'under_review', 'rejected'],
    default: 'under_review'
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index géospatial pour les recherches par proximité
parkingSchema.index({ location: '2dsphere' });

// Index pour les recherches textuelles
parkingSchema.index({ name: 'text', description: 'text', 'address.city': 'text' });

// Virtual pour les avis
parkingSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'parking'
});

// Virtual pour les réservations
parkingSchema.virtual('reservations', {
  ref: 'Reservation',
  localField: '_id',
  foreignField: 'parking'
});

// Middleware pour mettre à jour availableSpots
parkingSchema.pre('save', function(next) {
  if (this.isNew) {
    this.availableSpots = this.totalSpots;
  }
  next();
});

module.exports = mongoose.model('Parking', parkingSchema);