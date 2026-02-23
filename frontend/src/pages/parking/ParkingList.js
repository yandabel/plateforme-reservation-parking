import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Badge, Pagination } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import { 
  FaMapMarkerAlt, 
  FaEuroSign, 
  FaCar, 
  FaFilter, 
  FaSearch,
  FaStar,
  FaShieldAlt,
  FaCamera,
  FaPlug,
  FaWheelchair
} from 'react-icons/fa';
import ParkingMap from '../../components/map/ParkingMap';

const ParkingList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    city: searchParams.get('city') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    features: searchParams.get('features')?.split(',') || [],
    sortBy: searchParams.get('sortBy') || 'rating',
    sortOrder: searchParams.get('sortOrder') || 'desc'
  });
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);

  const { data, isLoading, refetch } = useQuery(
    ['parkings', filters, page],
    () => axios.get('/parkings', {
      params: {
        ...filters,
        page,
        limit: 12,
        features: filters.features.join(',')
      }
    }).then(res => res.data),
    { keepPreviousData: true }
  );

  useEffect(() => {
    refetch();
  }, [filters, page, refetch]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const toggleFeature = (feature) => {
    setFilters(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
    setPage(1);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            params.set(key, value.join(','));
          }
        } else {
          params.set(key, value);
        }
      }
    });
    params.set('page', page);
    setSearchParams(params);
  };

  const featuresList = [
    { key: 'covered', label: 'Couverts', icon: <FaCar /> },
    { key: 'security', label: 'Sécurisé', icon: <FaShieldAlt /> },
    { key: 'surveillance', label: 'Surveillance', icon: <FaCamera /> },
    { key: 'electricCharging', label: 'Charges électriques', icon: <FaPlug /> },
    { key: 'disabledAccess', label: 'Accès handicapé', icon: <FaWheelchair /> }
  ];

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="fw-bold">Trouvez votre parking</h1>
          <p className="text-muted">
            {data?.count ? `${data.count} parkings trouvés` : 'Recherchez le parking parfait'}
          </p>
        </Col>
      </Row>

      <Row>
        {/* Filtres */}
        <Col lg={3} className="mb-4">
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <FaFilter className="me-2" />
              Filtres
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Ville</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Paris, Lyon..."
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Prix (€/h)</Form.Label>
                <Row className="g-2">
                  <Col>
                    <Form.Control
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    />
                  </Col>
                  <Col>
                    <Form.Control
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    />
                  </Col>
                </Row>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Équipements</Form.Label>
                <div className="d-flex flex-column gap-2">
                  {featuresList.map(feature => (
                    <Form.Check
                      key={feature.key}
                      type="checkbox"
                      id={feature.key}
                      label={
                        <div className="d-flex align-items-center">
                          <span className="me-2">{feature.icon}</span>
                          {feature.label}
                        </div>
                      }
                      checked={filters.features.includes(feature.key)}
                      onChange={() => toggleFeature(feature.key)}
                    />
                  ))}
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Trier par</Form.Label>
                <Form.Select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                >
                  <option value="rating">Note</option>
                  <option value="hourlyRate">Prix</option>
                  <option value="createdAt">Plus récents</option>
                </Form.Select>
              </Form.Group>

              <Button
                variant="primary"
                className="w-100"
                onClick={handleSearch}
              >
                <FaSearch className="me-2" />
                Appliquer les filtres
              </Button>
            </Card.Body>
          </Card>

          {/* Map */}
          <Card className="shadow-sm mt-4">
            <Card.Header className="bg-primary text-white">
              <FaMapMarkerAlt className="me-2" />
              Carte
            </Card.Header>
            <Card.Body className="p-0">
              <ParkingMap 
                height="300px" 
                parkings={data?.data}
                interactive={false}
              />
            </Card.Body>
          </Card>
        </Col>

        {/* Liste des parkings */}
        <Col lg={9}>
          {isLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Chargement des parkings...</p>
            </div>
          ) : data?.data.length === 0 ? (
            <Card className="text-center py-5">
              <Card.Body>
                <h5 className="text-muted">Aucun parking trouvé</h5>
                <p>Essayez de modifier vos critères de recherche</p>
                <Button 
                  variant="outline-primary"
                  onClick={() => {
                    setFilters({
                      city: '',
                      minPrice: '',
                      maxPrice: '',
                      features: [],
                      sortBy: 'rating',
                      sortOrder: 'desc'
                    });
                    setPage(1);
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              </Card.Body>
            </Card>
          ) : (
            <>
              <Row>
                {data?.data.map(parking => (
                  <Col key={parking._id} md={6} lg={4} className="mb-4">
                    <Card className="parking-card h-100">
                      <div style={{ position: 'relative' }}>
                        <Card.Img 
                          variant="top" 
                          src={parking.images?.[0]?.url || '/default-parking.jpg'}
                          alt={parking.name}
                          className="parking-image"
                          style={{ height: '180px', cursor: 'pointer' }}
                          onClick={() => navigate(`/parkings/${parking._id}`)}
                        />
                        <div className="rating-badge">
                          <FaStar className="text-warning" />
                          <span className="ms-1 fw-bold">{parking.averageRating || 'N/A'}</span>
                        </div>
                        {parking.availableSpots === 0 && (
                          <div className="position-absolute top-0 start-0 w-100 bg-danger text-white text-center py-1">
                            Complet
                          </div>
                        )}
                      </div>
                      <Card.Body>
                        <Card.Title 
                          className="cursor-pointer"
                          onClick={() => navigate(`/parkings/${parking._id}`)}
                        >
                          {parking.name}
                        </Card.Title>
                        <Card.Text className="text-muted small">
                          <FaMapMarkerAlt className="me-1" />
                          {parking.address.city}, {parking.address.street}
                        </Card.Text>
                        
                        <div className="mb-3">
                          {Object.entries(parking.features || {})
                            .filter(([key, value]) => value)
                            .map(([key]) => (
                              <Badge key={key} bg="light" text="dark" className="me-1 mb-1">
                                {featuresList.find(f => f.key === key)?.label || key}
                              </Badge>
                            ))}
                        </div>

                        <div className="d-flex justify-content-between align-items-center">
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
                              <small className="text-success">
                                {parking.availableSpots} places dispo
                              </small>
                            </div>
                            <Button 
                              variant="primary"
                              size="sm"
                              onClick={() => navigate(`/parkings/${parking._id}`)}
                              disabled={parking.availableSpots === 0}
                            >
                              {parking.availableSpots === 0 ? 'Complet' : 'Réserver'}
                            </Button>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>

              {/* Pagination */}
              {data?.pagination && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <Pagination.Prev 
                      disabled={!data.pagination.prev}
                      onClick={() => setPage(page - 1)}
                    />
                    
                    {Array.from({ length: Math.min(5, Math.ceil(data.count / 12)) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Pagination.Item
                          key={pageNum}
                          active={pageNum === page}
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Pagination.Item>
                      );
                    })}
                    
                    <Pagination.Next 
                      disabled={!data.pagination.next}
                      onClick={() => setPage(page + 1)}
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default ParkingList;