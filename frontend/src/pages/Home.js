import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaCar, FaShieldAlt, FaCreditCard, FaMapMarkerAlt } from 'react-icons/fa';
import ParkingMap from '../components/map/ParkingMap';
import { useQuery } from 'react-query';
import axios from 'axios';
import DatePicker from 'react-datepicker';

const Home = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    city: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // +2 heures
  });

  const { data: featuredParkings, isLoading } = useQuery(
    'featured-parkings',
    () => axios.get('/parkings?limit=6&sortBy=rating&sortOrder=desc').then(res => res.data.data)
  );

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({
      city: searchParams.city,
      startDate: searchParams.startDate.toISOString(),
      endDate: searchParams.endDate.toISOString(),
    }).toString();
    navigate(`/parkings?${params}`);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="hero-section">
        <Container>
          <Row className="align-items-center">
            <Col lg={6}>
              <h1 className="hero-title">Trouvez et réservez votre parking en quelques clics</h1>
              <p className="hero-subtitle">
                Des milliers de places disponibles. Réservez votre parking en centre-ville, 
                près des gares, aéroports et centres commerciaux.
              </p>
              <Button size="lg" variant="light" onClick={() => navigate('/parkings')}>
                Voir les parkings
              </Button>
            </Col>
            <Col lg={6}>
              <div className="map-container mt-4 mt-lg-0">
                <ParkingMap height="300px" />
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Search Section */}
      <Container>
        <div className="search-container">
          <Form onSubmit={handleSearch}>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label><FaMapMarkerAlt className="me-2" />Ville</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Oujda, Rabat, Casa..."
                    value={searchParams.city}
                    onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
                  />
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Date d'arrivée</Form.Label>
                  <DatePicker
                    selected={searchParams.startDate}
                    onChange={(date) => setSearchParams({ ...searchParams, startDate: date })}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={30}
                    dateFormat="dd/MM/yyyy HH:mm"
                    className="form-control"
                  />
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Date de départ</Form.Label>
                  <DatePicker
                    selected={searchParams.endDate}
                    onChange={(date) => setSearchParams({ ...searchParams, endDate: date })}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={30}
                    dateFormat="dd/MM/yyyy HH:mm"
                    className="form-control"
                    minDate={searchParams.startDate}
                  />
                </Form.Group>
              </Col>
              
              <Col md={2} className="d-flex align-items-end">
                <Button type="submit" variant="primary" className="w-100">
                  <FaSearch className="me-2" />
                  Rechercher
                </Button>
              </Col>
            </Row>
          </Form>
        </div>
      </Container>

      {/* Features Section */}
      <Container className="py-5">
        <Row className="text-center mb-5">
          <Col>
            <h2 className="fw-bold">Pourquoi choisir ParkingReserve ?</h2>
          </Col>
        </Row>
        <Row>
          <Col md={3} className="text-center mb-4">
            <div className="feature-icon mx-auto">
              <FaCar size={24} className="text-primary" />
            </div>
            <h5>Large choix</h5>
            <p className="text-muted">Des milliers de places dans toute le Maroc</p>
          </Col>
          <Col md={3} className="text-center mb-4">
            <div className="feature-icon mx-auto">
              <FaShieldAlt size={24} className="text-primary" />
            </div>
            <h5>Sécurisé</h5>
            <p className="text-muted">Paiements sécurisés et garantie de remboursement</p>
          </Col>
          <Col md={3} className="text-center mb-4">
            <div className="feature-icon mx-auto">
              <FaCreditCard size={24} className="text-primary" />
            </div>
            <h5>Paiement flexible</h5>
            <p className="text-muted">Carte, PayPal ou espèces</p>
          </Col>
          <Col md={3} className="text-center mb-4">
            <div className="feature-icon mx-auto">
              <FaMapMarkerAlt size={24} className="text-primary" />
            </div>
            <h5>Géolocalisation</h5>
            <p className="text-muted">Trouvez le parking le plus proche</p>
          </Col>
        </Row>
      </Container>

      {/* Featured Parkings */}
      <Container className="py-5">
        <Row className="mb-4">
          <Col>
            <h2 className="fw-bold">Parkings populaires</h2>
            <p className="text-muted">Découvrez nos parkings les mieux notés</p>
          </Col>
          <Col className="text-end">
            <Button variant="outline-primary" onClick={() => navigate('/parkings')}>
              Voir tous
            </Button>
          </Col>
        </Row>
        
        <Row>
          {isLoading ? (
            <Col className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
            </Col>
          ) : (
            featuredParkings?.map(parking => (
              <Col key={parking._id} md={4} className="mb-4">
                <Card className="parking-card h-100">
                  <div style={{ position: 'relative' }}>
                    <Card.Img 
                      variant="top" 
                      src={parking.images?.[0]?.url || '/default-parking.jpg'}
                      alt={parking.name}
                      className="parking-image"
                    />
                    <div className="rating-badge">
                      <span className="text-warning">★</span> {parking.averageRating}
                    </div>
                  </div>
                  <Card.Body>
                    <Card.Title>{parking.name}</Card.Title>
                    <Card.Text className="text-muted">
                      <FaMapMarkerAlt className="me-2" />
                      {parking.address.city}, {parking.address.street}
                    </Card.Text>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 className="text-primary mb-0">
                          {parking.hourlyRate}€/h
                        </h5>
                        {parking.dailyRate && (
                          <small className="text-muted">{parking.dailyRate}€/jour</small>
                        )}
                      </div>
                      <Button 
                        variant="primary"
                        onClick={() => navigate(`/parkings/${parking._id}`)}
                      >
                        Réserver
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))
          )}
        </Row>
      </Container>
    </>
  );
};

export default Home;