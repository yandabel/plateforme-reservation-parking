
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Row, Col, Card, Button, Spinner, Alert, 
  Badge, Tab, Tabs, Form, Modal, ListGroup 
} from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  FaStar, FaMapMarkerAlt, FaEuroSign, FaCar, FaShieldAlt, 
  FaCamera, FaPlug, FaWheelchair, FaClock, FaCalendarAlt,
  FaUser, FaPhone, FaChevronLeft, FaShareAlt, FaHeart
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import ParkingMap from '../../components/map/ParkingMap';
import StripePayment from '../../components/payment/StripePayment';

class DebugBoundary extends React.Component {
  componentDidCatch(error, info) {
    console.error('🔥 ERROR BOUNDARY:', error);
    console.error('📍 COMPONENT STACK:', info.componentStack);   
  }
  render() {
    return this.props.children;
  }
}


const ParkingDetail = () => {

  console.log('salam Réserver')
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  

  const [selectedSpot, setSelectedSpot] = useState(null);
  const [reservationDates, setReservationDates] = useState({
    startTime: new Date(),
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // +2 heures
  });
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [createdReservation, setCreatedReservation] = useState(null); // AJOUTÉ

  // Récupérer les détails du parking
  const { data: parking, isLoading, error } = useQuery(
    ['parking', id],
    () => axios.get(`/parkings/${id}`).then(res => res.data.data),
    { enabled: !!id }
  );

  // Récupérer les avis
  const { data: reviews } = useQuery(
    ['reviews', id],
    () => axios.get(`/reviews/parking/${id}`).then(res => res.data.data),
    { enabled: !!id }
  );

  // Mutation pour créer une réservation
  const createReservationMutation = useMutation(
    (reservationData) => axios.post('/reservations', reservationData),
    {
      onSuccess: (response) => {
        const reservation = response.data.data;
        toast.success('Réservation créée avec succès !');
        queryClient.invalidateQueries(['parking', id]);
        setCreatedReservation(reservation); // AJOUTÉ
        setShowReservationModal(false);
        
        if (paymentMethod === 'cash' || paymentMethod === 'paypal') {
          navigate(`/reservations/${reservation._id}`);
        }
        // Pour le paiement par carte, on laisse StripePayment gérer la navigation
      },
      onError: (error) => {
        const message =
          typeof error.response?.data?.message === 'string'
            ? error.response.data.message
            : 'Erreur lors de la réservation';

        toast.error(message);
      }
    }
  );

  // Mutation pour ajouter aux favoris
  const toggleFavoriteMutation = useMutation(
    () => axios.post(`/users/favorites/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['parking', id]);
        toast.success('Favoris mis à jour');
      }
    }
  );

  const calculatePrice = () => {
    if (!parking || !selectedSpot) return 0;
    
    const duration = (reservationDates.endTime - reservationDates.startTime) / (1000 * 60 * 60);
    const hourlyRate = selectedSpot.customHourlyRate || parking.hourlyRate;
    const dailyRate = selectedSpot.customDailyRate || parking.dailyRate;

    if (dailyRate && duration >= 24) {
      const days = Math.floor(duration / 24);
      const remainingHours = duration % 24;
      let price = days * dailyRate;
      
      if (remainingHours > 0) {
        price += Math.min(remainingHours * hourlyRate, dailyRate);
      }
      return price;
    }
    
    return duration * hourlyRate;
  };

  const handleReservation = () => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour réserver');
      navigate('/login', { state: { from: `/parkings/${id}` } });
      return;
    }

    if (!selectedSpot) {
      toast.error('Veuillez sélectionner une place');
      return;
    }

    const reservationData = {
      parkingId: id,
      spotId: selectedSpot._id,
      startTime: reservationDates.startTime.toISOString(),
      endTime: reservationDates.endTime.toISOString(),
      paymentMethod
    };

    createReservationMutation.mutate(reservationData);
  };

  // Fonction pour gérer le paiement réussi
  const handlePaymentSuccess = (paymentIntent) => {
    toast.success('Paiement réussi !');
    setShowReservationModal(false);
    if (createdReservation?._id) {
      navigate(`/reservations/${createdReservation._id}`);
    }
  };

  if (isLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Chargement du parking...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          Erreur lors du chargement du parking
        </Alert>
        <Button variant="outline-primary" onClick={() => navigate('/parkings')}>
          <FaChevronLeft className="me-2" />
          Retour aux parkings
        </Button>
      </Container>
    );
  }

  if (!parking) return null;

  // Récupérer les places disponibles (supposons que parking.spots existe)
  // const availableSpots = parking.spots?.filter(spot => spot.available) || [];
  const availableSpots = Array.isArray(parking.availableSpots)
  ? parking.availableSpots
  : [];

  const availableSpotsCount = availableSpots.length;

  console.log('DEBUG selectedSpot =', selectedSpot);

  return (
  <DebugBoundary>
    <Container className="py-4">
      {/* TOUT ton JSX ici */}
            {/* Boutons d'action */}
      <div className="d-flex justify-content-between mb-4">
        <Button variant="outline-primary" onClick={() => navigate('/parkings')}>
          <FaChevronLeft className="me-2" />
          Retour aux parkings
        </Button>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary">
            <FaShareAlt className="me-2" />
            Partager
          </Button>
          {isAuthenticated && (
            <Button 
              variant={parking.isFavorite ? "danger" : "outline-danger"}
              onClick={() => toggleFavoriteMutation.mutate()}
              disabled={toggleFavoriteMutation.isLoading}
            >
              <FaHeart className="me-2" />
              {parking.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            </Button>
          )}
        </div>
      </div>

      <Row>
        {/* Images du parking */}
        <Col lg={8}>
          <Card className="mb-4 shadow-sm">
            <div className="position-relative">
              {parking.images && parking.images.length > 0 ? (
                <>
                  <img
                    src={
                      parking.images?.find(img => img.isMain)?.url ||
                      parking.images?.[0]?.url ||
                      '/placeholder.jpg'
                    }
                    alt={parking.name}
                    className="img-fluid w-100"
                    style={{ height: '400px', objectFit: 'cover' }}
                  />
                  {parking.images.length > 1 && (
                    <div className="position-absolute bottom-0 start-0 p-3">
                      <Badge bg="dark" className="fs-6">
                        +{parking.images.length - 1} photos
                      </Badge>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-light d-flex align-items-center justify-content-center" style={{ height: '400px' }}>
                  <FaCar size={100} className="text-muted" />
                </div>
              )}
            </div>
          </Card>

          {/* Informations détaillées */}
          <Tabs defaultActiveKey="details" className="mb-4">
            <Tab eventKey="details" title="Détails">
              <Card className="shadow-sm">
                <Card.Body>
                  <h4 className="fw-bold mb-4">{parking.name}</h4>
                  <p className="text-muted">{parking.description}</p>
                  
                  <div className="mb-4">
                    <h5 className="fw-bold mb-3">
                      <FaMapMarkerAlt className="me-2" />
                      Adresse
                    </h5>
                    <p className="mb-0">{parking.address.street}</p>
                    <p className="mb-0">
                      {parking.address.postalCode} {parking.address.city}
                    </p>
                  </div>

                  <div className="mb-4">
                    <h5 className="fw-bold mb-3">
                      <FaClock className="me-2" />
                      Horaires
                    </h5>
                    {parking.is24h ? (
                      <p className="text-success">Ouvert 24h/24, 7j/7</p>
                    ) : (
                      <Row>
                        {Object.entries(parking.openingHours || {}).map(([day, hours]) => (
                          <Col key={day} md={6} className="mb-2">
                            <strong className="text-capitalize">{day}: </strong>
                            {hours.open && hours.close ? `${hours.open} - ${hours.close}` : 'Fermé'}
                          </Col>
                        ))}
                      </Row>
                    )}
                  </div>

                  <div className="mb-4">
                    <h5 className="fw-bold mb-3">Équipements</h5>
                    <Row>
                      {Object.entries(parking.features || {}).map(([key, value]) => (
                        <Col key={key} xs={6} md={4} className="mb-3">
                          <div className="d-flex align-items-center">
                            {value ? (
                              <>
                                <div className="me-2">
                                  {key === 'covered' && <FaCar className="text-success" />}
                                  {key === 'security' && <FaShieldAlt className="text-success" />}
                                  {key === 'surveillance' && <FaCamera className="text-success" />}
                                  {key === 'electricCharging' && <FaPlug className="text-success" />}
                                  {key === 'disabledAccess' && <FaWheelchair className="text-success" />}
                                </div>
                                <span className="text-capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="reviews" title="Avis">
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center mb-4">
                    <div className="me-4">
                      <h1 className="fw-bold text-warning mb-0">
                        {parking.averageRating?.toFixed(1) || '0.0'}
                      </h1>
                      <div className="d-flex">
                        {[...Array(5)].map((_, i) => (
                          <FaStar
                            key={i}
                            className={i < Math.floor(parking.averageRating) ? "text-warning" : "text-muted"}
                          />
                        ))}
                      </div>
                      <small className="text-muted">
                        ({parking.ratingCount || 0} avis)
                      </small>
                    </div>
                    <Button variant="primary">
                      Laisser un avis
                    </Button>
                  </div>

                  {reviews?.length > 0 ? (
                    reviews.map(review => (
                      <Card key={review._id} className="mb-3 border">
                        <Card.Body>
                          <div className="d-flex justify-content-between mb-2">
                            <div className="d-flex align-items-center">
                              <img
                                src={review.user.avatar}
                                alt={review.user.firstName}
                                className="rounded-circle me-2"
                                width="40"
                                height="40"
                              />
                              <div>
                                <strong>{review.user.firstName} {review.user.lastName}</strong>
                                <div className="d-flex">
                                  {[...Array(5)].map((_, i) => (
                                    <FaStar
                                      key={i}
                                      size={12}
                                      className={i < review.rating ? "text-warning" : "text-muted"}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <small className="text-muted">
                              {format(new Date(review.createdAt), 'dd MMM yyyy', { locale: fr })}
                            </small>
                          </div>
                          <p className="mb-0">{review.comment}</p>
                        </Card.Body>
                      </Card>
                    ))
                  ) : (
                    <Alert variant="info">
                      Aucun avis pour ce parking. Soyez le premier à en laisser un !
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="map" title="Carte">
               {/* debug temp */}
              <Card className="shadow-sm">
                <Card.Body>
                  <ParkingMap
                    center={[parking.location.coordinates[1], parking.location.coordinates[0]]}
                    zoom={15}
                    height="400px"
                    markers={[{
                      position: [parking.location.coordinates[1], parking.location.coordinates[0]],
                      title: parking.name
                    }]}
                  />
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Col>

        {/* Panneau de réservation */}
        <Col lg={4}>
          <Card className="shadow-sm sticky-top" style={{ top: '20px' }}>
            <Card.Body>
              <div className="text-center mb-4">
                <h2 className="text-primary fw-bold">
                  <FaEuroSign /> {parking.hourlyRate}/h
                </h2>
                {parking.dailyRate && (
                  <p className="text-muted mb-0">{parking.dailyRate}€/jour</p>
                )}
                <div className="mt-2">
                  <Badge bg={availableSpotsCount > 0 ? "success" : "danger"}>
                    {availableSpotsCount} places disponibles
                  </Badge>
                </div>
              </div>

              {/* Sélection des dates */}
              <Form.Group className="mb-3">
                <Form.Label>
                  <FaCalendarAlt className="me-2" />
                  Date d'arrivée
                </Form.Label>
                <DatePicker
                  selected={reservationDates.startTime}
                  onChange={(date) => setReservationDates({ ...reservationDates, startTime: date })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={30}
                  dateFormat="dd/MM/yyyy HH:mm"
                  className="form-control"
                  minDate={new Date()}
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>
                  <FaCalendarAlt className="me-2" />
                  Date de départ
                </Form.Label>
                <DatePicker
                  selected={reservationDates.endTime}
                  onChange={(date) => setReservationDates({ ...reservationDates, endTime: date })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={30}
                  dateFormat="dd/MM/yyyy HH:mm"
                  className="form-control"
                  minDate={reservationDates.startTime}
                />
              </Form.Group>

              {/* Sélection de la place */}
              <Form.Group className="mb-4">
                <Form.Label>Sélectionnez une place</Form.Label>
                {availableSpotsCount > 0 ? (
                  <Row className="g-2">
                    {availableSpots.map((spot) => (
                      <Col key={spot._id} xs={6}>
                        <Button
                          variant={selectedSpot?._id === spot._id ? "primary" : "outline-primary"}
                          className="w-100"
                          onClick={() => setSelectedSpot(spot)}
                        >
                          {spot.spotNumber}
                          <br />
                          <small>{spot.type}</small>
                        </Button>
                      </Col>
                      
                    ))}
                  </Row>
                ) : (
                  <Alert variant="warning">
                    Aucune place disponible pour ces dates
                  </Alert>
                )}
              </Form.Group>

              {/* Prix total */}
              {selectedSpot && (
                <Card className="bg-light mb-4">
                  <Card.Body>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Tarif horaire:</span>
                      {selectedSpot && (
                          <span>
                            {selectedSpot.customHourlyRate ?? parking.hourlyRate}€/h
                          </span>
                      )}

                      
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Durée:</span>
                      <span>
                        {((reservationDates.endTime - reservationDates.startTime) / (1000 * 60 * 60)).toFixed(1)}h
                      </span>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between">
                      <strong>Total:</strong>
                      <strong className="fs-5 text-primary">{calculatePrice().toFixed(2)}€</strong>
                    </div>
                  </Card.Body>
                </Card>
              )}

              {/* Bouton de réservation */}
              <Button
                variant="primary"
                size="lg"
                className="w-100"
                disabled={!selectedSpot || availableSpotsCount === 0}
                onClick={() => setShowReservationModal(true)}
              >
                Réserver maintenant
              </Button>

              {/* Informations propriétaire */}
              <Card className="mt-4">
                <Card.Body>
                  <h6 className="fw-bold mb-3">
                    <FaUser className="me-2" />
                    Propriétaire
                  </h6>
                  <div className="d-flex align-items-center mb-3">
                    <img
                      src={parking.owner?.avatar}
                      alt={parking.owner?.firstName}
                      className="rounded-circle me-3"
                      width="50"
                      height="50"
                    />
                    <div>
                      <strong>{parking.owner?.firstName} {parking.owner?.lastName}</strong>
                      <div className="d-flex align-items-center">
                        <FaStar className="text-warning me-1" />
                        <span>4.8 (120 avis)</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline-primary" size="sm" className="w-100">
                    <FaPhone className="me-2" />
                    Contacter
                  </Button>
                </Card.Body>
              </Card>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de réservation */}
      <Modal show={showReservationModal} onHide={() => setShowReservationModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Confirmer la réservation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <h5>Récapitulatif</h5>
              <ListGroup className="mb-4">
                <ListGroup.Item>
                  <strong>Parking:</strong> {parking.name}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Place:</strong>{" "}
                  {selectedSpot
                    ? `${selectedSpot.spotNumber} (${selectedSpot.type})`
                    : '—'}
                  
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Arrivée:</strong> {format(reservationDates.startTime, 'dd/MM/yyyy HH:mm')}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Départ:</strong> {format(reservationDates.endTime, 'dd/MM/yyyy HH:mm')}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Durée:</strong> {((reservationDates.endTime - reservationDates.startTime) / (1000 * 60 * 60)).toFixed(1)} heures
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Prix total:</strong> {calculatePrice().toFixed(2)}€
                </ListGroup.Item>
              </ListGroup>
            </Col>
            <Col md={6}>
              <h5>Méthode de paiement</h5>
              <Form.Group className="mb-3">
                {['card', 'cash', 'paypal'].map(method => (
                <Form.Check
                  key={method}
                  type="radio"
                  id={method}
                  label={
                    method === 'card'
                      ? '💳 Carte bancaire'
                      : method === 'cash'
                      ? '💵 Paiement sur place'
                      : 'PayPal'
                  }
                  name="paymentMethod"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mb-2"
                />

                ))}
              </Form.Group>

              {paymentMethod === 'card' && createdReservation && (
                  <StripePayment
                    amount={calculatePrice()}
                    reservationId={createdReservation._id}  // CORRIGÉ
                    onSuccess={handlePaymentSuccess}  // CORRIGÉ
                    onError={(error) => {
                      toast.error('Erreur de paiement : ' + error.message);
                    }}
                  />
              )}

              {paymentMethod === 'cash' && (
                <Alert variant="warning">
                  Le paiement se fera directement au propriétaire à votre arrivée
                </Alert>
              )}
              
              {paymentMethod === 'paypal' && (
                <Alert variant="info">
                  Vous serez redirigé vers PayPal pour compléter le paiement
                </Alert>
              )}
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReservationModal(false)}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleReservation}
            disabled={createReservationMutation.isLoading}
          >
            {createReservationMutation.isLoading
              ? 'Réservation en cours...'
              : 'Confirmer la réservation'}
          </Button>
        </Modal.Footer>
      </Modal>
      
    </Container>
  </DebugBoundary>
   );


  // return (
  //   <Container className="py-4">
  //     {/* Boutons d'action */}
  //     <div className="d-flex justify-content-between mb-4">
  //       <Button variant="outline-primary" onClick={() => navigate('/parkings')}>
  //         <FaChevronLeft className="me-2" />
  //         Retour aux parkings
  //       </Button>
  //       <div className="d-flex gap-2">
  //         <Button variant="outline-secondary">
  //           <FaShareAlt className="me-2" />
  //           Partager
  //         </Button>
  //         {isAuthenticated && (
  //           <Button 
  //             variant={parking.isFavorite ? "danger" : "outline-danger"}
  //             onClick={() => toggleFavoriteMutation.mutate()}
  //             disabled={toggleFavoriteMutation.isLoading}
  //           >
  //             <FaHeart className="me-2" />
  //             {parking.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
  //           </Button>
  //         )}
  //       </div>
  //     </div>

  //     <Row>
  //       {/* Images du parking */}
  //       <Col lg={8}>
  //         <Card className="mb-4 shadow-sm">
  //           <div className="position-relative">
  //             {parking.images && parking.images.length > 0 ? (
  //               <>
  //                 <img
  //                   src={
  //                     parking.images?.find(img => img.isMain)?.url ||
  //                     parking.images?.[0]?.url ||
  //                     '/placeholder.jpg'
  //                   }
  //                   alt={parking.name}
  //                   className="img-fluid w-100"
  //                   style={{ height: '400px', objectFit: 'cover' }}
  //                 />
  //                 {parking.images.length > 1 && (
  //                   <div className="position-absolute bottom-0 start-0 p-3">
  //                     <Badge bg="dark" className="fs-6">
  //                       +{parking.images.length - 1} photos
  //                     </Badge>
  //                   </div>
  //                 )}
  //               </>
  //             ) : (
  //               <div className="bg-light d-flex align-items-center justify-content-center" style={{ height: '400px' }}>
  //                 <FaCar size={100} className="text-muted" />
  //               </div>
  //             )}
  //           </div>
  //         </Card>

  //         {/* Informations détaillées */}
  //         <Tabs defaultActiveKey="details" className="mb-4">
  //           <Tab eventKey="details" title="Détails">
  //             <Card className="shadow-sm">
  //               <Card.Body>
  //                 <h4 className="fw-bold mb-4">{parking.name}</h4>
  //                 <p className="text-muted">{parking.description}</p>
                  
  //                 <div className="mb-4">
  //                   <h5 className="fw-bold mb-3">
  //                     <FaMapMarkerAlt className="me-2" />
  //                     Adresse
  //                   </h5>
  //                   <p className="mb-0">{parking.address.street}</p>
  //                   <p className="mb-0">
  //                     {parking.address.postalCode} {parking.address.city}
  //                   </p>
  //                 </div>

  //                 <div className="mb-4">
  //                   <h5 className="fw-bold mb-3">
  //                     <FaClock className="me-2" />
  //                     Horaires
  //                   </h5>
  //                   {parking.is24h ? (
  //                     <p className="text-success">Ouvert 24h/24, 7j/7</p>
  //                   ) : (
  //                     <Row>
  //                       {Object.entries(parking.openingHours || {}).map(([day, hours]) => (
  //                         <Col key={day} md={6} className="mb-2">
  //                           <strong className="text-capitalize">{day}: </strong>
  //                           {hours.open && hours.close ? `${hours.open} - ${hours.close}` : 'Fermé'}
  //                         </Col>
  //                       ))}
  //                     </Row>
  //                   )}
  //                 </div>

  //                 <div className="mb-4">
  //                   <h5 className="fw-bold mb-3">Équipements</h5>
  //                   <Row>
  //                     {Object.entries(parking.features || {}).map(([key, value]) => (
  //                       <Col key={key} xs={6} md={4} className="mb-3">
  //                         <div className="d-flex align-items-center">
  //                           {value ? (
  //                             <>
  //                               <div className="me-2">
  //                                 {key === 'covered' && <FaCar className="text-success" />}
  //                                 {key === 'security' && <FaShieldAlt className="text-success" />}
  //                                 {key === 'surveillance' && <FaCamera className="text-success" />}
  //                                 {key === 'electricCharging' && <FaPlug className="text-success" />}
  //                                 {key === 'disabledAccess' && <FaWheelchair className="text-success" />}
  //                               </div>
  //                               <span className="text-capitalize">
  //                                 {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
  //                               </span>
  //                             </>
  //                           ) : null}
  //                         </div>
  //                       </Col>
  //                     ))}
  //                   </Row>
  //                 </div>
  //               </Card.Body>
  //             </Card>
  //           </Tab>

  //           <Tab eventKey="reviews" title="Avis">
  //             <Card className="shadow-sm">
  //               <Card.Body>
  //                 <div className="d-flex align-items-center mb-4">
  //                   <div className="me-4">
  //                     <h1 className="fw-bold text-warning mb-0">
  //                       {parking.averageRating?.toFixed(1) || '0.0'}
  //                     </h1>
  //                     <div className="d-flex">
  //                       {[...Array(5)].map((_, i) => (
  //                         <FaStar
  //                           key={i}
  //                           className={i < Math.floor(parking.averageRating) ? "text-warning" : "text-muted"}
  //                         />
  //                       ))}
  //                     </div>
  //                     <small className="text-muted">
  //                       ({parking.ratingCount || 0} avis)
  //                     </small>
  //                   </div>
  //                   <Button variant="primary">
  //                     Laisser un avis
  //                   </Button>
  //                 </div>

  //                 {reviews?.length > 0 ? (
  //                   reviews.map(review => (
  //                     <Card key={review._id} className="mb-3 border">
  //                       <Card.Body>
  //                         <div className="d-flex justify-content-between mb-2">
  //                           <div className="d-flex align-items-center">
  //                             <img
  //                               src={review.user.avatar}
  //                               alt={review.user.firstName}
  //                               className="rounded-circle me-2"
  //                               width="40"
  //                               height="40"
  //                             />
  //                             <div>
  //                               <strong>{review.user.firstName} {review.user.lastName}</strong>
  //                               <div className="d-flex">
  //                                 {[...Array(5)].map((_, i) => (
  //                                   <FaStar
  //                                     key={i}
  //                                     size={12}
  //                                     className={i < review.rating ? "text-warning" : "text-muted"}
  //                                   />
  //                                 ))}
  //                               </div>
  //                             </div>
  //                           </div>
  //                           <small className="text-muted">
  //                             {format(new Date(review.createdAt), 'dd MMM yyyy', { locale: fr })}
  //                           </small>
  //                         </div>
  //                         <p className="mb-0">{review.comment}</p>
  //                       </Card.Body>
  //                     </Card>
  //                   ))
  //                 ) : (
  //                   <Alert variant="info">
  //                     Aucun avis pour ce parking. Soyez le premier à en laisser un !
  //                   </Alert>
  //                 )}
  //               </Card.Body>
  //             </Card>
  //           </Tab>

  //           <Tab eventKey="map" title="Carte">
  //             <Card className="shadow-sm">
  //               <Card.Body>
  //                 <ParkingMap
  //                   center={[parking.location.coordinates[1], parking.location.coordinates[0]]}
  //                   zoom={15}
  //                   height="400px"
  //                   markers={[{
  //                     position: [parking.location.coordinates[1], parking.location.coordinates[0]],
  //                     title: parking.name
  //                   }]}
  //                 />
  //               </Card.Body>
  //             </Card>
  //           </Tab>
  //         </Tabs>
  //       </Col>

  //       {/* Panneau de réservation */}
  //       <Col lg={4}>
  //         <Card className="shadow-sm sticky-top" style={{ top: '20px' }}>
  //           <Card.Body>
  //             <div className="text-center mb-4">
  //               <h2 className="text-primary fw-bold">
  //                 <FaEuroSign /> {parking.hourlyRate}/h
  //               </h2>
  //               {parking.dailyRate && (
  //                 <p className="text-muted mb-0">{parking.dailyRate}€/jour</p>
  //               )}
  //               <div className="mt-2">
  //                 <Badge bg={availableSpotsCount > 0 ? "success" : "danger"}>
  //                   {availableSpotsCount} places disponibles
  //                 </Badge>
  //               </div>
  //             </div>

  //             {/* Sélection des dates */}
  //             <Form.Group className="mb-3">
  //               <Form.Label>
  //                 <FaCalendarAlt className="me-2" />
  //                 Date d'arrivée
  //               </Form.Label>
  //               <DatePicker
  //                 selected={reservationDates.startTime}
  //                 onChange={(date) => setReservationDates({ ...reservationDates, startTime: date })}
  //                 showTimeSelect
  //                 timeFormat="HH:mm"
  //                 timeIntervals={30}
  //                 dateFormat="dd/MM/yyyy HH:mm"
  //                 className="form-control"
  //                 minDate={new Date()}
  //               />
  //             </Form.Group>

  //             <Form.Group className="mb-4">
  //               <Form.Label>
  //                 <FaCalendarAlt className="me-2" />
  //                 Date de départ
  //               </Form.Label>
  //               <DatePicker
  //                 selected={reservationDates.endTime}
  //                 onChange={(date) => setReservationDates({ ...reservationDates, endTime: date })}
  //                 showTimeSelect
  //                 timeFormat="HH:mm"
  //                 timeIntervals={30}
  //                 dateFormat="dd/MM/yyyy HH:mm"
  //                 className="form-control"
  //                 minDate={reservationDates.startTime}
  //               />
  //             </Form.Group>

  //             {/* Sélection de la place */}
  //             <Form.Group className="mb-4">
  //               <Form.Label>Sélectionnez une place</Form.Label>
  //               {availableSpotsCount > 0 ? (
  //                 <Row className="g-2">
  //                   {availableSpots.map((spot) => (
  //                     <Col key={spot._id} xs={6}>
  //                       <Button
  //                         variant={selectedSpot?._id === spot._id ? "primary" : "outline-primary"}
  //                         className="w-100"
  //                         onClick={() => setSelectedSpot(spot)}
  //                       >
  //                         {spot.spotNumber}
  //                         <br />
  //                         <small>{spot.type}</small>
  //                       </Button>
  //                     </Col>
                      
  //                   ))}
  //                 </Row>
  //               ) : (
  //                 <Alert variant="warning">
  //                   Aucune place disponible pour ces dates
  //                 </Alert>
  //               )}
  //             </Form.Group>

  //             {/* Prix total */}
  //             {selectedSpot && (
  //               <Card className="bg-light mb-4">
  //                 <Card.Body>
  //                   <div className="d-flex justify-content-between mb-2">
  //                     <span>Tarif horaire:</span>
  //                     <span>{selectedSpot.customHourlyRate || parking.hourlyRate}€/h</span>
  //                   </div>
  //                   <div className="d-flex justify-content-between mb-2">
  //                     <span>Durée:</span>
  //                     <span>
  //                       {((reservationDates.endTime - reservationDates.startTime) / (1000 * 60 * 60)).toFixed(1)}h
  //                     </span>
  //                   </div>
  //                   <hr />
  //                   <div className="d-flex justify-content-between">
  //                     <strong>Total:</strong>
  //                     <strong className="fs-5 text-primary">{calculatePrice().toFixed(2)}€</strong>
  //                   </div>
  //                 </Card.Body>
  //               </Card>
  //             )}

  //             {/* Bouton de réservation */}
  //             <Button
  //               variant="primary"
  //               size="lg"
  //               className="w-100"
  //               disabled={!selectedSpot || availableSpotsCount === 0}
  //               onClick={() => setShowReservationModal(true)}
  //             >
  //               Réserver maintenant
  //             </Button>

  //             {/* Informations propriétaire */}
  //             <Card className="mt-4">
  //               <Card.Body>
  //                 <h6 className="fw-bold mb-3">
  //                   <FaUser className="me-2" />
  //                   Propriétaire
  //                 </h6>
  //                 <div className="d-flex align-items-center mb-3">
  //                   <img
  //                     src={parking.owner?.avatar}
  //                     alt={parking.owner?.firstName}
  //                     className="rounded-circle me-3"
  //                     width="50"
  //                     height="50"
  //                   />
  //                   <div>
  //                     <strong>{parking.owner?.firstName} {parking.owner?.lastName}</strong>
  //                     <div className="d-flex align-items-center">
  //                       <FaStar className="text-warning me-1" />
  //                       <span>4.8 (120 avis)</span>
  //                     </div>
  //                   </div>
  //                 </div>
  //                 <Button variant="outline-primary" size="sm" className="w-100">
  //                   <FaPhone className="me-2" />
  //                   Contacter
  //                 </Button>
  //               </Card.Body>
  //             </Card>
  //           </Card.Body>
  //         </Card>
  //       </Col>
  //     </Row>

  //     {/* Modal de réservation */}
  //     <Modal show={showReservationModal} onHide={() => setShowReservationModal(false)} size="lg">
  //       <Modal.Header closeButton>
  //         <Modal.Title>Confirmer la réservation</Modal.Title>
  //       </Modal.Header>
  //       <Modal.Body>
  //         <Row>
  //           <Col md={6}>
  //             <h5>Récapitulatif</h5>
  //             <ListGroup className="mb-4">
  //               <ListGroup.Item>
  //                 <strong>Parking:</strong> {parking.name}
  //               </ListGroup.Item>
  //               <ListGroup.Item>
  //                 <strong>Place:</strong> {selectedSpot?.spotNumber} ({selectedSpot?.type})
  //               </ListGroup.Item>
  //               <ListGroup.Item>
  //                 <strong>Arrivée:</strong> {format(reservationDates.startTime, 'dd/MM/yyyy HH:mm')}
  //               </ListGroup.Item>
  //               <ListGroup.Item>
  //                 <strong>Départ:</strong> {format(reservationDates.endTime, 'dd/MM/yyyy HH:mm')}
  //               </ListGroup.Item>
  //               <ListGroup.Item>
  //                 <strong>Durée:</strong> {((reservationDates.endTime - reservationDates.startTime) / (1000 * 60 * 60)).toFixed(1)} heures
  //               </ListGroup.Item>
  //               <ListGroup.Item>
  //                 <strong>Prix total:</strong> {calculatePrice().toFixed(2)}€
  //               </ListGroup.Item>
  //             </ListGroup>
  //           </Col>
  //           <Col md={6}>
  //             <h5>Méthode de paiement</h5>
  //             <Form.Group className="mb-3">
  //               {['card', 'cash', 'paypal'].map(method => (
  //                 <Form.Check
  //                   key={method}
  //                   type="radio"
  //                   id={method}
  //                   label={
  //                     <div className="d-flex align-items-center">
  //                       {method === 'card' && '💳 Carte bancaire'}
  //                       {method === 'cash' && '💵 Paiement sur place'}
  //                       {method === 'paypal' && 'PayPal'}
  //                     </div>
  //                   }
  //                   name="paymentMethod"
  //                   value={method}
  //                   checked={paymentMethod === method}
  //                   onChange={(e) => setPaymentMethod(e.target.value)}
  //                   className="mb-2"
  //                 />
  //               ))}
  //             </Form.Group>

  //             {paymentMethod === 'card' && createdReservation && (
  //                 <StripePayment
  //                   amount={calculatePrice()}
  //                   reservationId={createdReservation._id}  // CORRIGÉ
  //                   onSuccess={handlePaymentSuccess}  // CORRIGÉ
  //                   onError={(error) => {
  //                     toast.error('Erreur de paiement : ' + error.message);
  //                   }}
  //                 />
  //             )}

  //             {paymentMethod === 'cash' && (
  //               <Alert variant="warning">
  //                 Le paiement se fera directement au propriétaire à votre arrivée
  //               </Alert>
  //             )}
              
  //             {paymentMethod === 'paypal' && (
  //               <Alert variant="info">
  //                 Vous serez redirigé vers PayPal pour compléter le paiement
  //               </Alert>
  //             )}
  //           </Col>
  //         </Row>
  //       </Modal.Body>
  //       <Modal.Footer>
  //         <Button variant="secondary" onClick={() => setShowReservationModal(false)}>
  //           Annuler
  //         </Button>
  //         <Button
  //           variant="primary"
  //           onClick={handleReservation}
  //           disabled={createReservationMutation.isLoading}
  //         >
  //           {createReservationMutation.isLoading
  //             ? 'Réservation en cours...'
  //             : 'Confirmer la réservation'}
  //         </Button>
  //       </Modal.Footer>
  //     </Modal>
  //   </Container>
  // );
};

export default ParkingDetail;