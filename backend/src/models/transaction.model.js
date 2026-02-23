const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'EUR',
    uppercase: true
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'cash', 'transfer', 'wallet', 'stripe', 'paypal'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  stripePaymentId: String,
  stripeCustomerId: String,
  paypalPaymentId: String,
  receiptUrl: String,
  refundAmount: Number,
  refundReason: String,
  refundedAt: Date,
  metadata: {
    type: mongoose.Schema.Types.Mixed
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
  timestamps: true
});

// Index pour les recherches
transactionSchema.index({ user: 1, status: 1 });
transactionSchema.index({ reservation: 1 });
transactionSchema.index({ stripePaymentId: 1 });
transactionSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);