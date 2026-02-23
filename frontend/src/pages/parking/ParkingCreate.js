import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaMapMarkerAlt, FaEuroSign, FaCar, FaUpload } from 'react-icons/fa';
import { FaMapPin } from 'react-icons/fa';
import ParkingMap from '../../components/map/ParkingMap';
import api from '../../services/api'




const ParkingCreate = () => {
  const navigate = useNavigate();
  const [selectedPosition, setSelectedPosition]= useState(null)
  const [images, setImages]= useState([])
  const [loading, setLoading] = useState(false);
  //
   const cloudImage = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
   const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  //
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
    },
    is24h: false,
    openingHours: {
      monday: { open: '08:00', close: '20:00' },
      tuesday: { open: '08:00', close: '20:00' },
      wednesday: { open: '08:00', close: '20:00' },
      thursday: { open: '08:00', close: '20:00' },
      friday: { open: '08:00', close: '20:00' },
      saturday: { open: '08:00', close: '20:00' },
      sunday: { open: '08:00', close: '20:00' }
    },
    images: []
  });


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else if (name.includes('features.')) {
      const feature = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        features: {
          ...prev.features,
          [feature]: checked
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

const uploadToCloudinary = async (files) => {
  const uploadedImages = [];

  for (let i = 0; i < files.length; i++) {
    const formData = new FormData();
    formData.append('file', files[i]);
    formData.append(
      'upload_preset',
      uploadPreset
    );
    formData.append('folder', 'parkings');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudImage}/image/upload`,
      {
        method: 'POST',
        body: formData
        
      }
    );

    const data = await response.json();

    if (!data.secure_url) {
      console.error('Cloudinary error:', data);
      throw new Error('Upload Cloudinary échoué');
    }

    uploadedImages.push({
      url: data.secure_url,
      publicId: data.public_id,
      isMain: i === 0
    });
  }

  return uploadedImages;
};


  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true)

    try {

      let uploadedImages= []
      if (images.length > 0) {
        uploadedImages = await uploadToCloudinary(images)
      }
      const payload = {
      ...formData,
      latitude: Number(latitude),
      longitude: Number(longitude),
      images: uploadedImages

      };

      // cree le parking
      await api.post('/parkings',payload)
      toast.success("Parking créé avec succès")
      navigate('/my-parkings')

      
    } catch(error){
      console.log('erreur creation parking:', error)
      toast.error(
        error.response?.data?.message || 'Erreur lors de la creation du parking'
      )
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">
                <FaCar className="me-2" />
                Créer un nouveau parking
              </h4>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nom du parking *</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Ex: Parking Centre-Ville"
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
                        placeholder="Décrivez votre parking..."
                      />
                    </Form.Group>

                    <h5 className="mb-3">
                      <FaMapMarkerAlt className="me-2" />
                      Adresse
                    </h5>
                    <Row className="mb-3">
                      <Col md={8}>
                        <Form.Group>
                          <Form.Label>Rue *</Form.Label>
                          <Form.Control
                            type="text"
                            name="address.street"
                            value={formData.address.street}
                            onChange={handleChange}
                            required
                            placeholder="123 Avenue des Champs-Élysées"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Code postal *</Form.Label>
                          <Form.Control
                            type="text"
                            name="address.postalCode"
                            value={formData.address.postalCode}
                            onChange={handleChange}
                            required
                            placeholder="75008"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row className="mb-4">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Ville *</Form.Label>
                          <Form.Control
                            type="text"
                            name="address.city"
                            value={formData.address.city}
                            onChange={handleChange}
                            required
                            placeholder="Paris"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <h5 className="mb-3">📍 Localisation du parking</h5>

                    <ParkingMap
                      height="300px"
                      interactive={true}
                      parkings={[]} // hide existing parkings
                      onMapClick={(latlng) => {
                        console.log('MAP CLICK:', latlng);
                        setSelectedPosition(latlng);
                        setLatitude(latlng.lat);
                        setLongitude(latlng.lng);
                      }}
                      selectedPosition={selectedPosition}
                    />

                    {selectedPosition && (
                      <p className="text-success mt-2">
                        Position sélectionnée : {selectedPosition.lat.toFixed(5)}, {selectedPosition.lng.toFixed(5)}
                      </p>
                    )}


                    <h5 className="mb-3">
                      Tarifs
                    </h5>
                    <Row className="mb-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Tarif horaire (DH) *</Form.Label>
                          <Form.Control
                            type="number"
                            name="hourlyRate"
                            value={formData.hourlyRate}
                            onChange={handleChange}
                            required
                            min="0"
                            step="0.5"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Tarif journalier (DH)</Form.Label>
                          <Form.Control
                            type="number"
                            name="dailyRate"
                            value={formData.dailyRate}
                            onChange={handleChange}
                            min="0"
                            step="0.5"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-4">
                      <Form.Label>Nombre total de places *</Form.Label>
                      <Form.Control
                        type="number"
                        name="totalSpots"
                        value={formData.totalSpots}
                        onChange={handleChange}
                        required
                        min="1"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <h5 className="mb-3">Équipements</h5>
                    {Object.entries(formData.features).map(([key, value]) => (
                      <Form.Check
                        key={key}
                        type="checkbox"
                        id={`feature-${key}`}
                        label={key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        name={`features.${key}`}
                        checked={value}
                        onChange={handleChange}
                        className="mb-2"
                      />
                    ))}

                    <Form.Group className="mb-4">
                      <Form.Check
                        type="checkbox"
                        id="is24h"
                        label="Ouvert 24h/24"
                        name="is24h"
                        checked={formData.is24h}
                        onChange={handleChange}
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>
                        <FaUpload className="me-2" />
                        Images
                      </Form.Label>
                      <Form.Control
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                           setImages(Array.from(e.target.files))
                        }}
                      />
                      <Form.Text className="text-muted">
                        Téléchargez des photos de votre parking
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                {loading && (
                  <Alert variant="info" className="mt-3">
                    Traitement en cours...
                  </Alert>
                )}

                <div className="d-flex justify-content-end gap-3 mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/parkings')}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Création...
                      </>
                    ) : (
                      'Créer le parking'
                    )}
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

export default ParkingCreate;