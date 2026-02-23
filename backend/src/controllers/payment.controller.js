const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Reservation = require('../models/reservation.model');
const Transaction = require('../models/transaction.model');
const Parking = require('../models/parking.model');

// @desc    Créer un paiement Stripe
// @route   POST /api/payments/create-payment-intent
// @access  Private
exports.createPaymentIntent = async (req, res) => {
  try {
    const { reservationId, amount, currency = 'eur' } = req.body;

    console.log('💰 AMOUNT BACKEND:', amount);


    // Vérifier la réservation
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Vérifier que l'utilisateur est propriétaire de la réservation
    if (reservation.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    // Vérifier si la réservation est déjà payée
    if (reservation.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cette réservation est déjà payée'
      });
    }

    await reservation.populate('parking');

 
    const stripeAmount = Math.round(amount * 100);
    const stripeCurrency = currency?.toLowerCase() || 'eur';

    if (!stripeAmount || stripeAmount <= 0) {
      return res.status(400).json({
        message: 'Montant Stripe invalide'
      });
    }

   console.log('💰 STRIPE AMOUNT:', stripeAmount);
   console.log('💱 STRIPE CURRENCY:', stripeCurrency);

    // Créer un PaymentIntent avec Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount , // Stripe utilise les centimes
      currency: stripeCurrency,
      metadata: {
        reservationId: reservationId.toString(),
        userId: req.user.id.toString()
      },
      description: `Réservation ${reservation.reference} - Parking ${reservation.parking.name}`,
      shipping: {
        name: `${req.user.firstName} ${req.user.lastName}`,
        address: {
          line1: req.user.address?.street || '',
          city: req.user.address?.city || '',
          postal_code: req.user.address?.postalCode || '',
          country: req.user.address?.country || 'FR'
        }
      }
    }
  );
  console.log('✅ PAYMENT INTENT:', paymentIntent)

    // Créer une transaction en base de données
    const transaction = await Transaction.create({
      reservation: reservationId,
      user: req.user.id,
      amount: amount ,
      currency: currency.toUpperCase(),
      paymentMethod: 'stripe',
      status: 'pending',
      stripePaymentId: paymentIntent.id,
      stripeClientSecret: paymentIntent.client_secret
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      transactionId: transaction._id
    });
  } catch (error) {
    
    console.error('🔥 STRIPE ERROR:', error);

    return res.status(500).json({
      message: error.message || 'Erreur Stripe',
    });
  }
};

// @desc    Confirmer un paiement réussi
// @route   POST /api/payments/confirm-payment
// @access  Private
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, transactionId } = req.body;

    // Récupérer la transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée'
      });
    }

    // Vérifier que l'utilisateur est propriétaire
    if (transaction.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    // Vérifier le paiement avec Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Mettre à jour la transaction
      transaction.status = 'completed';
      transaction.stripePaymentId = paymentIntentId;
      transaction.receiptUrl = paymentIntent.charges.data[0]?.receipt_url;
      await transaction.save();

      // Mettre à jour la réservation
      const reservation = await Reservation.findById(transaction.reservation);
      reservation.paymentStatus = 'paid';
      reservation.status = 'confirmed';
      await reservation.save();

      // Notifier le propriétaire via Socket.io
      const io = req.app.get('io');
      const parking = await Parking.findById(reservation.parking);
      io.to(`user-${parking.owner}`).emit('payment-received', {
        reservationId: reservation._id,
        amount: transaction.amount,
        paymentMethod: 'stripe'
      });

      res.json({
        success: true,
        message: 'Paiement confirmé avec succès',
        data: {
          transaction,
          reservation
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Le paiement n\'a pas été confirmé',
        paymentStatus: paymentIntent.status
      });
    }
  } catch (error) {
    console.error('Erreur confirmation paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la confirmation du paiement',
      error: error.message
    });
  }
};

// @desc    Webhook Stripe pour les événements
// @route   POST /api/payments/webhook
// @access  Public
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Erreur webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Gérer les différents événements
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object);
      break;
    case 'charge.refunded':
      await handleChargeRefunded(event.data.object);
      break;
    default:
      console.log(`Événement non géré: ${event.type}`);
  }

  res.json({ received: true });
};

// Fonctions de gestion des événements
const handlePaymentIntentSucceeded = async (paymentIntent) => {

  const parking = await Parking.findById(reservation.parking);
  try {
    const transaction = await Transaction.findOne({
      stripePaymentId: paymentIntent.id
    });
    
    if (transaction) {
      transaction.status = 'completed';
      transaction.receiptUrl = paymentIntent.charges.data[0]?.receipt_url;
      await transaction.save();

      const reservation = await Reservation.findById(transaction.reservation);
      if (reservation) {
        reservation.paymentStatus = 'paid';
        reservation.status = 'confirmed';
        await reservation.save();

        //envoie une notification au owner

        const io = req.app.get('io'); // ❗ important
          io.to(`user-${parking.owner}`).emit('payment-received', {
            reservationId: reservation._id,
            amount: transaction.amount,
            paymentMethod: 'stripe'
          });
      }
    }
  } catch (error) {
    console.error('Erreur handlePaymentIntentSucceeded:', error);
  }
};

const handlePaymentIntentFailed = async (paymentIntent) => {
  try {
    const transaction = await Transaction.findOne({
      stripePaymentId: paymentIntent.id
    });
    
    if (transaction) {
      transaction.status = 'failed';
      transaction.metadata = {
        error: paymentIntent.last_payment_error?.message || 'Paiement échoué'
      };
      await transaction.save();

      const reservation = await Reservation.findById(transaction.reservation);
      if (reservation) {
        reservation.paymentStatus = 'failed';
        await reservation.save();
      }
    }
  } catch (error) {
    console.error('Erreur handlePaymentIntentFailed:', error);
  }
};

const handleChargeRefunded = async (charge) => {
  try {
    const transaction = await Transaction.findOne({
      stripePaymentId: charge.payment_intent
    });
    
    if (transaction) {
      transaction.status = 'refunded';
      transaction.refundAmount = charge.amount_refunded / 100;
      transaction.refundedAt = new Date();
      await transaction.save();

      const reservation = await Reservation.findById(transaction.reservation);
      if (reservation) {
        reservation.paymentStatus = 'refunded';
        reservation.status = 'cancelled';
        await reservation.save();
      }
    }
  } catch (error) {
    console.error('Erreur handleChargeRefunded:', error);
  }
};