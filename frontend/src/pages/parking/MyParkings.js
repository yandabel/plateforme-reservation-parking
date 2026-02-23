import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Spinner, Alert, Modal } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaEye, FaEuroSign, FaCar, FaCalendarAlt } from 'react-icons/fa';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';

const socket = io(
  process.env.REACT_APP_API_URL.replace('/api', ''),
  { withCredentials: true }
);

const MyParkings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
  socket.on('parking-rejected', () => {
    queryClient.invalidateQueries('myParkings');
  });

  socket.on('parking-approved', () => {
    queryClient.invalidateQueries('myParkings');
  });

  return () => {
    socket.off('parking-rejected');
    socket.off('parking-approved');
  };
}, [queryClient]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [parkingToDelete, setParkingToDelete] = useState(null);

  const { data: parkings, isLoading, error } = useQuery(
    'myParkings',
    () => axios.get('/parkings/my-parkings').then(res => res.data.data)
  );

  const deleteParkingMutation = useMutation(
    (id) => axios.delete(`/parkings/${id}`),
    {
      onSuccess: () => {
        toast.success('Parking supprimé avec succès');
        queryClient.invalidateQueries('myParkings');
        setShowDeleteModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
      }
    }
  );

  const handleDeleteClick = (parking) => {
    setParkingToDelete(parking);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (parkingToDelete) {
      deleteParkingMutation.mutate(parkingToDelete._id);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active':
        return <Badge bg="success">Actif</Badge>;
      case 'inactive':
        return <Badge bg="secondary">Inactif</Badge>;
      case 'under_review':
        return <Badge bg="warning">En attente</Badge>;
      case 'rejected':
        return <Badge bg="danger">Rejeté</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Chargement de vos parkings...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="fw-bold">Mes Parkings</h1>
              <p className="text-muted">
                Gérez tous vos parkings en un seul endroit
              </p>
            </div>
            <Button 
              variant="primary" 
              onClick={() => navigate('/parkings/create')  }
            >
              <FaPlus className="me-2" />
              Ajouter un parking
            </Button>
          </div>
        </Col>
      </Row>

      {error ? (
        <Alert variant="danger">
          Erreur lors du chargement de vos parkings
        </Alert>
      ) : parkings?.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <FaCar size={50} className="text-muted mb-3" />
            <h5>Vous n'avez pas encore de parkings</h5>
            <p className="text-muted mb-4">
              Commencez par ajouter votre premier parking pour le louer
            </p>
            <Button 
              variant="primary" 
              onClick={() => navigate('/create-parking')}
            >
              <FaPlus className="me-2" />
              Ajouter mon premier parking
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <>
          <Row className="mb-4">
            {parkings?.map(parking => (
              <Col key={parking._id} lg={6} className="mb-4">
                <Card className="h-100 shadow-sm">
                  <div className="position-relative">
                    <Card.Img 
                      variant="top" 
                      src={parking.images?.[0]?.url || '/default-parking.jpg'}
                      alt={parking.name}
                      style={{ height: '200px', objectFit: 'cover' }}
                    />
                    <div className="position-absolute top-0 end-0 m-2">
                      {getStatusBadge(parking.status)}
                    </div>
                  </div>
                  <Card.Body>
                    <Card.Title>{parking.name}</Card.Title>
                    <Card.Text className="text-muted small mb-3">
                      {parking.address.city}, {parking.address.street}
                    </Card.Text>
                    
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h5 className="text-primary mb-0">
                          <FaEuroSign /> {parking.hourlyRate}/h
                        </h5>
                        {parking.dailyRate && (
                          <small className="text-muted">{parking.dailyRate}€/jour</small>
                        )}
                      </div>
                      <div className="text-end">
                        <div className="mb-1">
                          <small>
                            {parking.availableSpots} / {parking.totalSpots} places
                          </small>
                        </div>
                        <Badge bg={parking.availableSpots > 0 ? "success" : "danger"}>
                          {parking.availableSpots > 0 ? 'Disponible' : 'Complet'}
                        </Badge>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between small text-muted mb-3">
                      <div>
                        <FaCalendarAlt className="me-1" />
                        {format(new Date(parking.createdAt), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      <div>
                        Note: {parking.averageRating || 'N/A'} ⭐
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        as={Link}
                        to={`/parkings/${parking._id}`}
                      >
                        <FaEye className="me-1" />
                        Voir
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => navigate(`/edit-parking/${parking._id}`)}
                      >
                        <FaEdit className="me-1" />
                        Modifier
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleDeleteClick(parking)}
                      >
                        <FaTrash className="me-1" />
                        Supprimer
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Statistiques */}
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Statistiques</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3} className="text-center">
                  <h2 className="text-primary">{parkings?.length || 0}</h2>
                  <small className="text-muted">Parkings</small>
                </Col>
                <Col md={3} className="text-center">
                  <h2 className="text-success">
                    {parkings?.reduce((sum, p) => sum + (p.availableSpots || 0), 0)}
                  </h2>
                  <small className="text-muted">Places disponibles</small>
                </Col>
                <Col md={3} className="text-center">
                  <h2 className="text-warning">
                    {parkings?.reduce((sum, p) => sum + (p.reservationCount || 0), 0)}
                  </h2>
                  <small className="text-muted">Réservations</small>
                </Col>
                <Col md={3} className="text-center">
                  <h2 className="text-info">
                    {parkings?.reduce((sum, p) => sum + (p.totalRevenue || 0), 0).toFixed(2)}€
                  </h2>
                  <small className="text-muted">Revenu total</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </>
      )}

      {/* Modal de confirmation de suppression */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmer la suppression</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Êtes-vous sûr de vouloir supprimer le parking "{parkingToDelete?.name}" ?
          <br />
          <small className="text-danger">
            Cette action est irréversible. Toutes les réservations futures seront annulées.
          </small>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Annuler
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmDelete}
            disabled={deleteParkingMutation.isLoading}
          >
            {deleteParkingMutation.isLoading ? 'Suppression...' : 'Supprimer'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MyParkings;