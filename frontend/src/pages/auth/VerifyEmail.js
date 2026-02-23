import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Container, Row, Col, Card, Button, Spinner, Alert 
} from 'react-bootstrap';
import { 
  FaCheckCircle, 
  FaTimesCircle, 
  FaEnvelope,
  FaHome,
  FaSignInAlt
} from 'react-icons/fa';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await axios.get(`/auth/verify-email/${token}`);
        setSuccess(true);
        setMessage(response.data.message);
        
        // Optionnel: Récupérer l'email de l'utilisateur
        // const userResponse = await axios.get(`/auth/user-from-token/${token}`);
        // setUserEmail(userResponse.data.email);
        
        // Redirection automatique après 5 secondes
        setTimeout(() => {
          navigate('/login');
        }, 5000);
        
      } catch (error) {
        setSuccess(false);
        setMessage(
          error.response?.data?.message || 
          'Le lien de vérification est invalide ou a expiré.'
        );
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <Card className="shadow-sm border-0" style={{ width: '100%', maxWidth: '500px' }}>
          <Card.Body className="text-center p-5">
            <Spinner animation="border" variant="primary" className="mb-4" />
            <h4>Vérification de votre email</h4>
            <p className="text-muted">Veuillez patienter...</p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow-lg border-0">
            <Card.Body className="p-5">
              <div className="text-center mb-5">
                {success ? (
                  <>
                    <div className="mb-4">
                      <FaCheckCircle size={80} className="text-success" />
                    </div>
                    <h1 className="text-success fw-bold">Compte Activé !</h1>
                    <p className="lead">✅ {message}</p>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <FaTimesCircle size={80} className="text-danger" />
                    </div>
                    <h1 className="text-danger fw-bold">Vérification Échouée</h1>
                    <Alert variant="danger" className="mt-4">
                      <FaEnvelope className="me-2" />
                      {message}
                    </Alert>
                  </>
                )}
              </div>

              {success && (
                <div className="text-center">
                  <Alert variant="success" className="mb-4">
                    <h5>🎉 Félicitations !</h5>
                    <p className="mb-0">
                      Votre compte a été activé avec succès. Vous pouvez maintenant vous connecter et commencer à utiliser ParkingReserve.
                    </p>
                  </Alert>

                  <div className="mb-4">
                    <h5>Que pouvez-vous faire maintenant ?</h5>
                    <div className="d-flex justify-content-center gap-3 mt-3">
                      <div className="text-center">
                        <div className="bg-light rounded-circle p-3 mb-2">
                          <span className="fs-4">🔍</span>
                        </div>
                        <small>Rechercher des parkings</small>
                      </div>
                      <div className="text-center">
                        <div className="bg-light rounded-circle p-3 mb-2">
                          <span className="fs-4">📅</span>
                        </div>
                        <small>Réserver des places</small>
                      </div>
                      <div className="text-center">
                        <div className="bg-light rounded-circle p-3 mb-2">
                          <span className="fs-4">⭐</span>
                        </div>
                        <small>Noter et commenter</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!success && (
                <Alert variant="warning">
                  <h5>Que faire ensuite ?</h5>
                  <ul className="mb-0">
                    <li>Assurez-vous que vous avez cliqué sur le lien le plus récent</li>
                    <li>Le lien de vérification expire après 24 heures</li>
                    <li>Si besoin, demandez un nouveau lien de vérification</li>
                  </ul>
                </Alert>
              )}

              <div className="d-flex flex-column flex-md-row justify-content-center gap-3 mt-5">
                {success ? (
                  <>
                    <Button 
                      variant="primary" 
                      size="lg" 
                      onClick={() => navigate('/login')}
                      className="mb-2"
                    >
                      <FaSignInAlt className="me-2" />
                      Se connecter
                    </Button>
                    <Button 
                      variant="outline-primary" 
                      size="lg" 
                      onClick={() => navigate('/')}
                      className="mb-2"
                    >
                      <FaHome className="me-2" />
                      Page d'accueil
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="primary" 
                      size="lg" 
                      onClick={() => navigate('/register')}
                      className="mb-2"
                    >
                      Créer un nouveau compte
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      size="lg" 
                      onClick={() => navigate('/contact')}
                      className="mb-2"
                    >
                      Contacter le support
                    </Button>
                    <Button 
                      variant="outline-primary" 
                      size="lg" 
                      onClick={() => navigate('/')}
                      className="mb-2"
                    >
                      <FaHome className="me-2" />
                      Retour à l'accueil
                    </Button>
                  </>
                )}
              </div>

              {success && (
                <div className="text-center mt-4">
                  <p className="text-muted">
                    <small>Redirection automatique vers la page de connexion dans 5 secondes...</small>
                  </p>
                </div>
              )}

              <div className="text-center mt-5 pt-4 border-top">
                <p className="text-muted small">
                  Besoin d'aide ? <Link to="/contact">Contactez notre support</Link>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default VerifyEmail;