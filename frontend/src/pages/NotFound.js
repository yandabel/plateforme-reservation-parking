import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaSearch, FaExclamationTriangle } from 'react-icons/fa';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Container className="py-5">
      <Row className="justify-content-center text-center">
        <Col md={8} lg={6}>
          <div className="mb-4">
            <FaExclamationTriangle size={100} className="text-warning" />
          </div>
          
          <h1 className="display-1 fw-bold text-muted">404</h1>
          <h2 className="mb-4">Page non trouvée</h2>
          
          <p className="lead text-muted mb-5">
            La page que vous recherchez n'existe pas ou a été déplacée.
            Veuillez vérifier l'URL ou revenir à l'accueil.
          </p>
          
          <div className="d-flex justify-content-center gap-3">
            <Button variant="primary" onClick={() => navigate('/')}>
              <FaHome className="me-2" />
              Retour à l'accueil
            </Button>
            
            <Button variant="outline-primary" onClick={() => navigate('/parkings')}>
              <FaSearch className="me-2" />
              Voir les parkings
            </Button>
          </div>
          
          <div className="mt-5">
            <h5 className="mb-3">Vous cherchez quelque chose ?</h5>
            <div className="d-flex justify-content-center gap-3">
              <a href="/parkings" className="text-decoration-none">Parkings</a>
              <a href="/login" className="text-decoration-none">Connexion</a>
              <a href="/register" className="text-decoration-none">Inscription</a>
              <a href="/contact" className="text-decoration-none">Contact</a>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default NotFound;