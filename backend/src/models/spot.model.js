const mongoose = require('mongoose');

const spotSchema = new mongoose.Schema({
  parking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parking',
    required: true
  },
  spotNumber: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['voiture', 'moto', 'utilitaire', 'camion', 'handicape'],
    default: 'voiture'
  },
  features: {
    covered: { type: Boolean, default: false },
    electricCharging: { type: Boolean, default: false },
    wide: { type: Boolean, default: false }, // Pour les places larges
    heightLimit: { type: Number } // Limite de hauteur en mètres
  },
  customHourlyRate: {
    type: Number,
    min: 0
  },
  customDailyRate: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance', 'out_of_service'],
    default: 'available'
  },
  currentReservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  },
  lastMaintenance: Date,
  nextMaintenance: Date,
  notes: String,
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

// Index composite pour des recherches rapides
spotSchema.index({ parking: 1, spotNumber: 1 }, { unique: true });
spotSchema.index({ parking: 1, status: 1 });

module.exports = mongoose.model('Spot', spotSchema);