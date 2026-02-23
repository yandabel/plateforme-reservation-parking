const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  color: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['voiture', 'moto', 'utilitaire', 'camion'],
    default: 'voiture'
  },
  photo: {
    url: String,
    publicId: String
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  year: Number,
  dimensions: {
    length: Number, // en mètres
    width: Number,  // en mètres
    height: Number  // en mètres
  },
  electric: {
    type: Boolean,
    default: false
  },
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

// Index pour les recherches
vehicleSchema.index({ user: 1 });
vehicleSchema.index({ licensePlate: 1 }, { unique: true });

// Middleware pour s'assurer qu'un seul véhicule est par défaut
vehicleSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

module.exports = mongoose.model('Vehicle', vehicleSchema);