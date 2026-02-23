import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FaCar } from 'react-icons/fa';
import { useQueryClient } from 'react-query';


const EditParking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: 'Maroc'
    },
    hourlyRate: '',
    dailyRate: '',
    totalSpots: '',
    features: {
      covered: false,
      security: false,
      surveillance: false,
      electricCharging: false,
      disabledAccess: false
    }
  });

  // 🔹 LOAD PARKING
  useEffect(() => {
    const fetchParking = async () => {
      try {
        const res = await api.get(`/parkings/${id}`);
        const parking = res.data.data;

        setFormData({
          name: parking.name || '',
          description: parking.description || '',
          address: parking.address || {},
          hourlyRate: parking.hourlyRate || '',
          dailyRate: parking.dailyRate || '',
          totalSpots: parking.totalSpots || '',
          features: parking.features || {}
        });

      } catch (err) {
        toast.error('Erreur chargement parking');
        navigate('/my-parkings');
      } finally {
        setLoading(false);
      }
    };

    fetchParking();
  }, [id, navigate]);

  // 🔹 HANDLE CHANGE
 const handleChange = (e) => {
  const { name, value, type, checked } = e.target;

  // features.*
  if (name.startsWith('features.')) {
    const feature = name.split('.')[1];
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: checked // ✅ BOOLEAN
      }
    }));
    return;
  }

  // address.*
  if (name.startsWith('address.')) {
    const field = name.split('.')[1];
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
    return;
  }

  // default
  setFormData(prev => ({
    ...prev,
    [name]: value
  }));
};

  // 🔹 SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put(`/parkings/${id}`, formData);

      queryClient.invalidateQueries('myParkings');
      toast.success('Parking modifié avec succès');
      navigate('/my-parkings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur modification parking');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col lg={8}>
          <Card className="shadow-sm">
            <Card.Header className="bg-warning text-dark">
              <h4 className="mb-0">
                <FaCar className="me-2" />
                Modifier le parking
              </h4>
            </Card.Header>

            <Card.Body>
              <Form onSubmit={handleSubmit}>

                <Form.Group className="mb-3">
                  <Form.Label>Nom *</Form.Label>
                  <Form.Control
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </Form.Group>

                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>Rue *</Form.Label>
                      <Form.Control
                        name="address.street"
                        value={formData.address.street}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Code postal *</Form.Label>
                      <Form.Control
                        name="address.postalCode"
                        value={formData.address.postalCode}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Ville *</Form.Label>
                  <Form.Control
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tarif horaire *</Form.Label>
                      <Form.Control
                        type="number"
                        name="hourlyRate"
                        value={formData.hourlyRate}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tarif journalier</Form.Label>
                      <Form.Control
                        type="number"
                        name="dailyRate"
                        value={formData.dailyRate}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Places *</Form.Label>
                      <Form.Control
                        type="number"
                        name="totalSpots"
                        value={formData.totalSpots}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <h5 className="mt-4">Équipements</h5>
                {Object.entries(formData.features).map(([key, value]) => (
                  <Form.Check
                    key={key}
                    type="checkbox"
                    label={key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    name={`features.${key}`}
                    checked={value}
                    onChange={handleChange}
                  />
                ))}

                {saving && <Alert variant="info">Sauvegarde en cours...</Alert>}

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <Button variant="secondary" onClick={() => navigate('/my-parkings')}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Sauvegarde...' : 'Enregistrer'}
                  </Button>
                </div>

              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EditParking;
