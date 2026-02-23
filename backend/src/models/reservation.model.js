const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
    unique: true
  },
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
  spot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Spot',
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // en heures
    required: true
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: [
      'pending',        // En attente de paiement
      'confirmed',      // Confirmée et payée
      'active',         // En cours d'utilisation
      'completed',      // Terminée
      'cancelled',      // Annulée
      'no_show',        // Non présenté
      'refunded'        // Remboursée
    ],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'cash', 'transfer', 'wallet'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  cancellationReason: String,
  cancelledAt: Date,
  checkInTime: Date,
  checkOutTime: Date,
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

// Index pour les recherches fréquentes
reservationSchema.index({ user: 1, status: 1 });
reservationSchema.index({ parking: 1, startTime: 1, endTime: 1 });
reservationSchema.index({ reference: 1 });
reservationSchema.index({ status: 1, createdAt: 1 });

// Middleware pour générer la référence
reservationSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.reference = `RES${year}${month}${day}${random}`;
  }
  next();
});

// Méthode pour calculer le prix
reservationSchema.methods.calculatePrice = function(hourlyRate, dailyRate) {
  const hours = this.duration;
  let price = 0;
  
  if (dailyRate && hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    price = days * dailyRate;
    
    if (remainingHours > 0) {
      price += Math.min(remainingHours * hourlyRate, dailyRate);
    }
  } else {
    price = hours * hourlyRate;
  }
  
  return price;
};

module.exports = mongoose.model('Reservation', reservationSchema);