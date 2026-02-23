import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button, Alert, Spinner, Form } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaCreditCard, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const StripePayment = ({ 
  amount, 
  reservationId, 
  currency = 'EUR',
  onSuccess,
  onError 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [transactionId, setTransactionId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');

  // Créer le PaymentIntent
  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('💰 AMOUNT FRONTEND:', amount);


      const response = await axios.post('/payments/create-payment-intent', {
        reservationId,
        amount: amount,
        currency: currency.toLowerCase()
      });

      setClientSecret(response.data.clientSecret);
      setTransactionId(response.data.transactionId);

      return response.data.clientSecret
    } catch (err) {
      setError('Erreur lors de la création du paiement');
      toast.error('Erreur lors de la création du paiement');
      return null
    } finally {
      setLoading(false);
    }
  };

  // Gérer le paiement
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    
    setError(null);

    try {
      // Si pas de clientSecret, en créer un
      if (!clientSecret) {
        await createPaymentIntent();
        if (!clientSecret) return;
      }

      setLoading(true);

      // Confirmer le paiement
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            // Vous pouvez ajouter des informations de facturation ici
          }
        }
      });

    if (result.error) {
      setError(result.error.message);
      onError?.(result.error);
      setLoading(false);
      return;
    }

    if (result.paymentIntent.status === 'succeeded') {
      try {
        // 3️⃣ Confirmer côté backend

        onSuccess?.(result.paymentIntent);
      } catch (err) {
        setError('Paiement réussi mais confirmation échouée');
        onError?.(err);
      }
    }
    } catch (err) {
      setError(err.message);
      toast.error('Erreur lors du paiement');
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  // Style pour le CardElement
  const cardStyle = {
    style: {
      base: {
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    }
  };

  return (
    <div className="stripe-payment">
      <Form onSubmit={handleSubmit}>
        <div className="mb-4">
          <h5 className="mb-3">
            <FaCreditCard className="me-2" />
            Paiement sécurisé
          </h5>
          
          <div className="mb-3">
            <p className="text-muted mb-1">Montant à payer :</p>
            <h3 className="text-primary fw-bold">{amount} {currency}</h3>
          </div>

          {error && (
            <Alert variant="danger" className="d-flex align-items-center">
              <FaExclamationTriangle className="me-2" />
              {error}
            </Alert>
          )}

          <div className="mb-3">
            <Form.Label>Numéro de carte</Form.Label>
            <div className="border rounded p-3">
              <CardElement 
                options={cardStyle}
                onChange={(e) => {
                  if (e.error) {
                    setError(e.error.message);
                  } else {
                    setError(null);
                  }
                }}
              />
            </div>
            <small className="text-muted">
              Test : utilisez 4242 4242 4242 4242
            </small>
          </div>

          <div className="row mb-3">
            <div className="col-md-6">
              <Form.Label>Date d'expiration (MM/AA)</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="12/25"
                disabled
              />
            </div>
            <div className="col-md-6">
              <Form.Label>CVC</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="123"
                disabled
              />
            </div>
          </div>

          <div className="d-flex align-items-center mb-3">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" 
              alt="Stripe" 
              height="30"
              className="me-2"
            />
            <small className="text-muted">
              Paiement sécurisé par Stripe
            </small>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-100"
            disabled={!stripe || loading}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Traitement en cours...
              </>
            ) : (
              <>
                <FaCheckCircle className="me-2" />
                Payer {amount} {currency}
              </>
            )}
          </Button>
        </div>
      </Form>

      {/* Informations de test */}
      <Alert variant="info" className="mt-4">
        <h6 className="fw-bold mb-2">Cartes de test Stripe :</h6>
        <ul className="mb-0">
          <li>
            <strong>4242 4242 4242 4242</strong> - Paiement réussi
          </li>
          <li>
            <strong>4000 0000 0000 3220</strong> - 3D Secure requis
          </li>
          <li>
            <strong>4000 0000 0000 9995</strong> - Paiement échoué
          </li>
        </ul>
        <p className="mt-2 mb-0 small">
          Date : toute date future | CVC : 3 chiffres quelconques
        </p>
      </Alert>
    </div>
  );
};

export default StripePayment;