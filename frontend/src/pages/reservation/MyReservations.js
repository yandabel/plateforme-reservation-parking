import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Badge, Tab, Tabs, Alert } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  FaCalendarAlt, 
  FaMapMarkerAlt, 
  FaCar, 
  FaEuroSign,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaHistory
} from 'react-icons/fa';
import { Spinner } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const MyReservations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('upcoming');

  // Récupérer les réservations
  const { data: reservations, isLoading } = useQuery(
    ['reservations', activeTab],
    () => axios.get('/reservations/my-reservations', {
      params: {
        status: activeTab === 'upcoming' ? 'confirmed' : 
                activeTab === 'active' ? 'active' :
                activeTab === 'history' ? 'completed,cancelled' : undefined
      }
    }).then(res => res.data.data),
    { enabled: !!user }
  );

  // Mutation pour annuler une réservation
  const cancelReservationMutation = useMutation(
    ({ id, reason }) => axios.put(`/reservations/${id}/cancel`, { reason }),
    {
      onSuccess: () => {
        toast.success('Réservation annulée avec succès');
        queryClient.invalidateQueries(['reservations']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Erreur lors de l\'annulation');
      }
    }
  );

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: 'warning', text: 'En attente' },
      confirmed: { variant: 'success', text: 'Confirmée' },
      active: { variant: 'primary', text: 'En cours' },
      completed: { variant: 'info', text: 'Terminée' },
      cancelled: { variant: 'danger', text: 'Annulée' },
      no_show: { variant: 'dark', text: 'Non présenté' }
    };

    const config = statusConfig[status] || { variant: 'secondary', text: status };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const handleCancel = (reservationId) => {
    if (window.confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) {
      cancelReservationMutation.mutate({ 
        id: reservationId, 
        reason: 'Annulé par l\'utilisateur' 
      });
    }
  };

if (isLoading) {
  return (
    <Container className="py-5 text-center">
      <Spinner animation="border" variant="primary" role="status"> {/* CORRIGÉ */}
        <span className="visually-hidden">Chargement...</span>
      </Spinner>
      <p className="mt-3">Chargement des réservations...</p> {/* AJOUTÉ */}
    </Container>
  );
}

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="fw-bold">Mes réservations</h1>
          <p className="text-muted">
            Gérez toutes vos réservations de parking
          </p>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onSelect={setActiveTab}
        className="mb-4"
      >
        <Tab eventKey="upcoming" title={
          <div className="d-flex align-items-center">
            <FaCalendarAlt className="me-2" />
            À venir
          </div>
        } />
        <Tab eventKey="active" title={
          <div className="d-flex align-items-center">
            <FaClock className="me-2" />
            En cours
          </div>
        } />
        <Tab eventKey="history" title={
          <div className="d-flex align-items-center">
            <FaHistory className="me-2" />
            Historique
          </div>
        } />
      </Tabs>

      {reservations?.length === 0 ? (
        <Alert variant="info">
          <div className="text-center py-4">
            <FaCalendarAlt size={48} className="text-muted mb-3" />
            <h5>Aucune réservation {activeTab === 'upcoming' ? 'à venir' : activeTab === 'active' ? 'en cours' : 'dans l\'historique'}</h5>
            {activeTab === 'upcoming' && (
              <Button variant="primary" className="mt-3" href="/parkings">
                Trouver un parking
              </Button>
            )}
          </div>
        </Alert>
      ) : (
        <Row>
          {reservations?.map(reservation => (
            <Col key={reservation._id} lg={6} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="fw-bold mb-1">{reservation.parking?.name}</h5>
                      <div className="d-flex align-items-center text-muted small mb-2">
                        <FaMapMarkerAlt className="me-1" />
                        {reservation.parking?.address?.city}
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(reservation.status)}
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Place:</span>
                      <strong>{reservation.spot?.spotNumber}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Véhicule:</span>
                      <strong>
                        {reservation.vehicle ? 
                          `${reservation.vehicle.brand} ${reservation.vehicle.model}` : 
                          'Non spécifié'}
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Date:</span>
                      <strong>
                        {format(new Date(reservation.startTime), 'dd/MM/yyyy', { locale: fr })}
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Heure:</span>
                      <strong>
                        {format(new Date(reservation.startTime), 'HH:mm', { locale: fr })} - 
                        {format(new Date(reservation.endTime), 'HH:mm', { locale: fr })}
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Durée:</span>
                      <strong>{reservation.duration} heures</strong>
                    </div>
                  </div>

                  <div className="border-top pt-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h4 className="text-primary fw-bold mb-0">
                          <FaEuroSign /> {reservation.totalPrice.toFixed(2)}
                        </h4>
                        <small className="text-muted">
                          Réf: {reservation.reference}
                        </small>
                      </div>
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          href={`/reservations/${reservation._id}`}
                        >
                          Détails
                        </Button>
                        
                        {(reservation.status === 'confirmed' || reservation.status === 'pending') && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleCancel(reservation._id)}
                            disabled={cancelReservationMutation.isLoading}
                          >
                            Annuler
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {reservation.checkInTime && (
                    <div className="mt-3">
                      <small className="text-success">
                        <FaCheckCircle className="me-1" />
                        Check-in: {format(new Date(reservation.checkInTime), 'dd/MM HH:mm', { locale: fr })}
                      </small>
                    </div>
                  )}

                  {reservation.checkOutTime && (
                    <div className="mt-2">
                      <small className="text-info">
                        <FaCheckCircle className="me-1" />
                        Check-out: {format(new Date(reservation.checkOutTime), 'dd/MM HH:mm', { locale: fr })}
                      </small>
                    </div>
                  )}

                  {reservation.status === 'cancelled' && reservation.cancelledAt && (
                    <div className="mt-2">
                      <small className="text-danger">
                        <FaTimesCircle className="me-1" />
                        Annulé le: {format(new Date(reservation.cancelledAt), 'dd/MM/yyyy', { locale: fr })}
                      </small>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default MyReservations;