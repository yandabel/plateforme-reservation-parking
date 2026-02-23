const express = require('express');
const router = express.Router();
const {
  createPaymentIntent,
  confirmPayment,
  handleWebhook
} = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

// Webhook Stripe (pas besoin d'authentification)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Routes protégées
router.use(protect);

router.post('/create-payment-intent', createPaymentIntent);
router.post('/confirm-payment', confirmPayment);

module.exports = router;