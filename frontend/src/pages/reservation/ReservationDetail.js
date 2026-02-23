import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Alert, Badge, ListGroup } from 'react-bootstrap';
import { useQuery } from 'react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  FaCar, FaMapMarkerAlt, FaEuroSign, FaUser, FaPhone, 
  FaCalendarAlt, FaClock, FaCheckCircle, FaTimesCircle,
  FaPrint, FaDownload, FaChevronLeft
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const ReservationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: reservation, isLoading, error } = useQuery(
    ['reservation', id],
    () => axios.get(`/reservations/${id}`).then(res => res.data.data),
    { enabled: !!id }
  );

  const getStatusBadge = (status) => {
    switch(status) {
      case 'confirmed':
        return <Badge bg="success">Confirmée</Badge>;
      case 'pending':
        return <Badge bg="warning">En attente</Badge>;
      case 'cancelled':
        return <Badge bg="danger">Annulée</Badge>;
      case 'completed':
        return <Badge bg="info">Terminée</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const handleCancelReservation = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) {
      try {
        await axios.put(`/reservations/${id}/cancel`);
        toast.success('Réservation annulée avec succès');
        // Recharger les données
        window.location.reload();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Erreur lors de l\'annulation');
      }
    }
  };

  if (isLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Chargement de la réservation...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          Erreur lors du chargement de la réservation
        </Alert>
        <Button variant="outline-primary" onClick={() => navigate('/reservations')}>
          <FaChevronLeft className="me-2" />
          Retour à mes réservations
        </Button>
      </Container>
    );
  }

  if (!reservation) return null;

  return (
    <Container className="py-4">
      <Button 
        variant="outline-primary" 
        className="mb-4"
        onClick={() => navigate('/reservations')}
      >
        <FaChevronLeft className="me-2" />
        Retour à mes réservations
      </Button>

      <Row>
        <Col lg={8}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Réservation #{reservation._id.slice(-8)}</h5>
              {getStatusBadge(reservation.status)}
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h6 className="fw-bold mb-3">
                    <FaCar className="me-2" />
                    Informations parking
                  </h6>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="d-flex justify-content-between">
                      <span>Parking:</span>
                      <strong>{reservation.parking?.name}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between">
                      <span>Place:</span>
                      <strong>#{reservation.spot?.spotNumber}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between">
                      <span>Type:</span>
                      <span>{reservation.spot?.type}</span>
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <div className="d-flex align-items-center mb-2">
                        <FaMapMarkerAlt className="me-2" />
                        <span>Adresse:</span>
                      </div>
                      <div className="text-muted">
                        {reservation.parking?.address?.street}<br />
                        {reservation.parking?.address?.postalCode} {reservation.parking?.address?.city}
                      </div>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>

                <Col md={6}>
                  <h6 className="fw-bold mb-3">
                    <FaCalendarAlt className="me-2" />
                    Dates et horaires
                  </h6>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="d-flex justify-content-between">
                      <span>Arrivée:</span>
                      <strong>
                        {format(new Date(reservation.startTime), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between">
                      <span>Départ:</span>
                      <strong>
                        {format(new Date(reservation.endTime), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between">
                      <span>Durée:</span>
                      <span>
                        {((new Date(reservation.endTime) - new Date(reservation.startTime)) / (1000 * 60 * 60)).toFixed(1)} heures
                      </span>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Informations de paiement */}
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-light">
              <h6 className="mb-0">
                <FaEuroSign className="me-2" />
                Paiement
              </h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="d-flex justify-content-between">
                      <span>Tarif horaire:</span>
                      <span>{reservation.hourlyRate}€/h</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between">
                      <span>Total heures:</span>
                      <span>{reservation.totalHours?.toFixed(1)}h</span>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
                <Col md={6}>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="d-flex justify-content-between">
                      <span>Sous-total:</span>
                      <span>{reservation.subtotal?.toFixed(2)}€</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between">
                      <span>Frais de service:</span>
                      <span>{reservation.serviceFee?.toFixed(2)}€</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between fw-bold">
                      <span>Total:</span>
                      <span className="text-primary">{reservation.totalAmount?.toFixed(2)}€</span>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
              </Row>
              <div className="mt-3">
                <strong>Méthode de paiement:</strong> {reservation.paymentMethod === 'card' ? '💳 Carte bancaire' : '💵 Paiement sur place'}
                {reservation.paymentStatus === 'paid' && (
                  <Badge bg="success" className="ms-2">
                    <FaCheckCircle className="me-1" />
                    Payé
                  </Badge>
                )}
                {reservation.paymentStatus === 'pending' && (
                  <Badge bg="warning" className="ms-2">
                    En attente
                  </Badge>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          {/* Actions */}
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Actions</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button variant="outline-primary">
                  <FaPrint className="me-2" />
                  Imprimer le reçu
                </Button>
                <Button variant="outline-secondary">
                  <FaDownload className="me-2" />
                  Télécharger PDF
                </Button>
                
                {reservation.status === 'pending' && (
                  <Button 
                    variant="danger" 
                    onClick={handleCancelReservation}
                  >
                    <FaTimesCircle className="me-2" />
                    Annuler la réservation
                  </Button>
                )}

                {reservation.status === 'confirmed' && new Date(reservation.startTime) > new Date() && (
                  <Button variant="warning">
                    Modifier la réservation
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Contact */}
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-light">
              <h6 className="mb-0">
                <FaUser className="me-2" />
                Contact
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <img
                  src={reservation.parking?.owner?.avatar}
                  alt={reservation.parking?.owner?.firstName}
                  className="rounded-circle me-3"
                  width="50"
                  height="50"
                />
                <div>
                  <strong>{reservation.parking?.owner?.firstName} {reservation.parking?.owner?.lastName}</strong>
                  <div className="text-muted small">Propriétaire du parking</div>
                </div>
              </div>
              <Button variant="outline-primary" className="w-100">
                <FaPhone className="me-2" />
                Contacter le propriétaire
              </Button>
            </Card.Body>
          </Card>

          {/* Code d'accès */}
          {reservation.accessCode && (
            <Card className="shadow-sm">
              <Card.Header className="bg-light">
                <h6 className="mb-0">Code d'accès</h6>
              </Card.Header>
              <Card.Body className="text-center">
                <h1 className="display-4 fw-bold text-primary">{reservation.accessCode}</h1>
                <p className="text-muted small">
                  Présentez ce code à l'entrée du parking
                </p>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default ReservationDetail;