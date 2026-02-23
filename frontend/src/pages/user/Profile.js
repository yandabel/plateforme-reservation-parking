import React, { useState } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, Tab, Tabs, 
  Alert, Image, Badge, ListGroup, Modal 
} from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
  FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, 
  FaCar, FaEdit, FaSave, FaTrash, FaPlus,
  FaKey, FaHistory, FaStar, FaCreditCard
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-toastify';

// Schémas de validation
const profileSchema = yup.object({
  firstName: yup.string().required('Prénom requis'),
  lastName: yup.string().required('Nom requis'),
  phone: yup.string().required('Téléphone requis'),
  address: yup.object({
    street: yup.string(),
    city: yup.string(),
    postalCode: yup.string(),
    country: yup.string()
  })
});

const passwordSchema = yup.object({
  currentPassword: yup.string().required('Mot de passe actuel requis'),
  newPassword: yup.string().min(6, 'Minimum 6 caractères').required('Nouveau mot de passe requis'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('newPassword'), null], 'Les mots de passe ne correspondent pas')
    .required('Confirmation requise')
});

const vehicleSchema = yup.object({
  brand: yup.string().required('Marque requise'),
  model: yup.string().required('Modèle requis'),
  licensePlate: yup.string().required('Plaque d\'immatriculation requise'),
  color: yup.string(),
  type: yup.string().oneOf(['voiture', 'moto', 'utilitaire', 'camion']).required('Type requis'),
  year: yup.number().min(1900).max(new Date().getFullYear() + 1)
});

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  // Récupérer les véhicules
  const { data: vehicles } = useQuery(
    'vehicles',
    () => axios.get('/users/vehicles').then(res => res.data.data),
    { enabled: !!user }
  );

  // Récupérer les réservations récentes
  const { data: recentReservations } = useQuery(
    'recent-reservations',
    () => axios.get('/reservations/my-reservations?limit=5').then(res => res.data.data),
    { enabled: !!user }
  );

  // Formulaires
  const { register: registerProfile, handleSubmit: handleProfileSubmit, formState: { errors: profileErrors } } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: user || {}
  });

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, formState: { errors: passwordErrors }, reset: resetPassword } = useForm({
    resolver: yupResolver(passwordSchema)
  });

  const { register: registerVehicle, handleSubmit: handleVehicleSubmit, formState: { errors: vehicleErrors }, reset: resetVehicle } = useForm({
    resolver: yupResolver(vehicleSchema)
  });

  // Mutations
  const updateVehicleMutation = useMutation(
    (vehicleData) => 
      editingVehicle ? 
        axios.put(`/users/vehicles/${editingVehicle._id}`, vehicleData) :
        axios.post('/users/vehicles', vehicleData),
    {
      onSuccess: () => {
        toast.success(editingVehicle ? 'Véhicule mis à jour' : 'Véhicule ajouté');
        queryClient.invalidateQueries('vehicles');
        setShowVehicleModal(false);
        resetVehicle();
        setEditingVehicle(null);
      }
    }
  );

  const deleteVehicleMutation = useMutation(
    (vehicleId) => axios.delete(`/users/vehicles/${vehicleId}`),
    {
      onSuccess: () => {
        toast.success('Véhicule supprimé');
        queryClient.invalidateQueries('vehicles');
      }
    }
  );

  const handleProfileUpdate = async (data) => {
    const result = await updateProfile(data);
    if (result.success) {
      toast.success('Profil mis à jour');
    }
  };

  const handlePasswordChange = async (data) => {
    const result = await changePassword(data);
    if (result.success) {
      toast.success('Mot de passe changé');
      resetPassword();
    }
  };

  const handleVehicleSave = (data) => {
    updateVehicleMutation.mutate(data);
  };

  const handleEditVehicle = (vehicle) => {
    setEditingVehicle(vehicle);
    resetVehicle(vehicle);
    setShowVehicleModal(true);
  };

  const handleAddVehicle = () => {
    setEditingVehicle(null);
    resetVehicle();
    setShowVehicleModal(true);
  };

  const handleDeleteVehicle = (vehicleId) => {
    if (window.confirm('Supprimer ce véhicule ?')) {
      deleteVehicleMutation.mutate(vehicleId);
    }
  };

  const setDefaultVehicle = async (vehicleId) => {
    try {
      await axios.put(`/users/vehicles/${vehicleId}/set-default`);
      toast.success('Véhicule par défaut mis à jour');
      queryClient.invalidateQueries('vehicles');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="fw-bold">Mon profil</h1>
          <p className="text-muted">Gérez vos informations personnelles et préférences</p>
        </Col>
      </Row>

      <Row>
        <Col lg={3} className="mb-4">
          <Card className="shadow-sm">
            <Card.Body className="text-center">
              <Image
                src={user?.avatar || '/default-avatar.png'}
                alt={user?.firstName}
                roundedCircle
                width={120}
                height={120}
                className="mb-3 border"
              />
              <h4>{user?.firstName} {user?.lastName}</h4>
              <p className="text-muted">{user?.email}</p>
              
              <Badge bg={user?.role === 'proprietaire' ? 'warning' : 'primary'} className="mb-3">
                {user?.role === 'proprietaire' ? 'Propriétaire' : 'Client'}
              </Badge>

              <ListGroup variant="flush" className="text-start">
                <ListGroup.Item className="d-flex justify-content-between">
                  <span>Téléphone:</span>
                  <strong>{user?.phone}</strong>
                </ListGroup.Item>
                <ListGroup.Item>
                  <span>Membre depuis:</span>
                  <br />
                  <strong>{new Date(user?.createdAt).toLocaleDateString('fr-FR')}</strong>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={9}>
          <Tabs activeKey={activeTab} onSelect={setActiveTab}>
            <Tab eventKey="profile" title={
              <div className="d-flex align-items-center">
                <FaUser className="me-2" />
                Profil
              </div>
            }>
              <Card className="shadow-sm">
                <Card.Body>
                  <Form onSubmit={handleProfileSubmit(handleProfileUpdate)}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Prénom</Form.Label>
                          <Form.Control
                            type="text"
                            {...registerProfile('firstName')}
                            isInvalid={!!profileErrors.firstName}
                          />
                          <Form.Control.Feedback type="invalid">
                            {profileErrors.firstName?.message}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Nom</Form.Label>
                          <Form.Control
                            type="text"
                            {...registerProfile('lastName')}
                            isInvalid={!!profileErrors.lastName}
                          />
                          <Form.Control.Feedback type="invalid">
                            {profileErrors.lastName?.message}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={user?.email}
                        disabled
                      />
                      <Form.Text className="text-muted">
                        L'email ne peut pas être modifié
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Téléphone</Form.Label>
                      <Form.Control
                        type="tel"
                        {...registerProfile('phone')}
                        isInvalid={!!profileErrors.phone}
                      />
                      <Form.Control.Feedback type="invalid">
                        {profileErrors.phone?.message}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <h5 className="mt-4 mb-3">
                      <FaMapMarkerAlt className="me-2" />
                      Adresse
                    </h5>

                    <Row>
                      <Col md={8}>
                        <Form.Group className="mb-3">
                          <Form.Label>Rue</Form.Label>
                          <Form.Control
                            type="text"
                            {...registerProfile('address.street')}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Code postal</Form.Label>
                          <Form.Control
                            type="text"
                            {...registerProfile('address.postalCode')}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Ville</Form.Label>
                          <Form.Control
                            type="text"
                            {...registerProfile('address.city')}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Pays</Form.Label>
                          <Form.Control
                            type="text"
                            {...registerProfile('address.country')}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Button type="submit" variant="primary">
                      <FaSave className="me-2" />
                      Enregistrer les modifications
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="vehicles" title={
              <div className="d-flex align-items-center">
                <FaCar className="me-2" />
                Véhicules
              </div>
            }>
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="mb-0">Mes véhicules</h5>
                    <Button variant="primary" size="sm" onClick={handleAddVehicle}>
                      <FaPlus className="me-2" />
                      Ajouter un véhicule
                    </Button>
                  </div>

                  {vehicles?.length === 0 ? (
                    <Alert variant="info">
                      <div className="text-center py-4">
                        <FaCar size={48} className="text-muted mb-3" />
                        <h5>Aucun véhicule enregistré</h5>
                        <p>Ajoutez votre premier véhicule pour faciliter vos réservations</p>
                        <Button variant="primary" onClick={handleAddVehicle}>
                          Ajouter un véhicule
                        </Button>
                      </div>
                    </Alert>
                  ) : (
                    <Row>
                      {vehicles?.map(vehicle => (
                        <Col key={vehicle._id} md={6} className="mb-3">
                          <Card>
                            <Card.Body>
                              <div className="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                  <h6 className="fw-bold mb-1">{vehicle.brand} {vehicle.model}</h6>
                                  <p className="text-muted mb-1">{vehicle.licensePlate}</p>
                                  <Badge bg="light" text="dark">
                                    {vehicle.type}
                                  </Badge>
                                </div>
                                {vehicle.isDefault && (
                                  <Badge bg="primary">Par défaut</Badge>
                                )}
                              </div>

                              <div className="d-flex justify-content-between">
                                <div>
                                  {!vehicle.isDefault && (
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => setDefaultVehicle(vehicle._id)}
                                      className="me-2"
                                    >
                                      Définir par défaut
                                    </Button>
                                  )}
                                </div>
                                <div>
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => handleEditVehicle(vehicle)}
                                    className="me-2"
                                  >
                                    <FaEdit />
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleDeleteVehicle(vehicle._id)}
                                  >
                                    <FaTrash />
                                  </Button>
                                </div>
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="password" title={
              <div className="d-flex align-items-center">
                <FaKey className="me-2" />
                Mot de passe
              </div>
            }>
              <Card className="shadow-sm">
                <Card.Body>
                  <Form onSubmit={handlePasswordSubmit(handlePasswordChange)}>
                    <Form.Group className="mb-3">
                      <Form.Label>Mot de passe actuel</Form.Label>
                      <Form.Control
                        type="password"
                        {...registerPassword('currentPassword')}
                        isInvalid={!!passwordErrors.currentPassword}
                      />
                      <Form.Control.Feedback type="invalid">
                        {passwordErrors.currentPassword?.message}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Nouveau mot de passe</Form.Label>
                      <Form.Control
                        type="password"
                        {...registerPassword('newPassword')}
                        isInvalid={!!passwordErrors.newPassword}
                      />
                      <Form.Control.Feedback type="invalid">
                        {passwordErrors.newPassword?.message}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Confirmer le nouveau mot de passe</Form.Label>
                      <Form.Control
                        type="password"
                        {...registerPassword('confirmPassword')}
                        isInvalid={!!passwordErrors.confirmPassword}
                      />
                      <Form.Control.Feedback type="invalid">
                        {passwordErrors.confirmPassword?.message}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Button type="submit" variant="primary">
                      Changer le mot de passe
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="reservations" title={
              <div className="d-flex align-items-center">
                <FaHistory className="me-2" />
                Dernières réservations
              </div>
            }>
              <Card className="shadow-sm">
                <Card.Body>
                  {recentReservations?.length === 0 ? (
                    <Alert variant="info">
                      <div className="text-center py-4">
                        <FaHistory size={48} className="text-muted mb-3" />
                        <h5>Aucune réservation récente</h5>
                        <Button variant="primary" href="/parkings">
                          Trouver un parking
                        </Button>
                      </div>
                    </Alert>
                  ) : (
                    <ListGroup variant="flush">
                      {recentReservations?.map(reservation => (
                        <ListGroup.Item key={reservation._id}>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="mb-1">{reservation.parking?.name}</h6>
                              <small className="text-muted">
                                {new Date(reservation.startTime).toLocaleDateString('fr-FR')} - 
                                {reservation.totalPrice}€
                              </small>
                            </div>
                            <Badge bg={
                              reservation.status === 'completed' ? 'success' :
                              reservation.status === 'cancelled' ? 'danger' : 'primary'
                            }>
                              {reservation.status}
                            </Badge>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Col>
      </Row>

      {/* Modal pour ajouter/modifier un véhicule */}
      <Modal show={showVehicleModal} onHide={() => setShowVehicleModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingVehicle ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleVehicleSubmit(handleVehicleSave)}>
            <Form.Group className="mb-3">
              <Form.Label>Marque</Form.Label>
              <Form.Control
                type="text"
                {...registerVehicle('brand')}
                isInvalid={!!vehicleErrors.brand}
              />
              <Form.Control.Feedback type="invalid">
                {vehicleErrors.brand?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Modèle</Form.Label>
              <Form.Control
                type="text"
                {...registerVehicle('model')}
                isInvalid={!!vehicleErrors.model}
              />
              <Form.Control.Feedback type="invalid">
                {vehicleErrors.model?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Plaque d'immatriculation</Form.Label>
              <Form.Control
                type="text"
                {...registerVehicle('licensePlate')}
                isInvalid={!!vehicleErrors.licensePlate}
              />
              <Form.Control.Feedback type="invalid">
                {vehicleErrors.licensePlate?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Couleur</Form.Label>
                  <Form.Control
                    type="text"
                    {...registerVehicle('color')}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Année</Form.Label>
                  <Form.Control
                    type="number"
                    {...registerVehicle('year')}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label>Type de véhicule</Form.Label>
              <Form.Select
                {...registerVehicle('type')}
                isInvalid={!!vehicleErrors.type}
              >
                <option value="">Sélectionnez...</option>
                <option value="voiture">Voiture</option>
                <option value="moto">Moto</option>
                <option value="utilitaire">Utilitaire</option>
                <option value="camion">Camion</option>
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {vehicleErrors.type?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Définir comme véhicule par défaut"
                {...registerVehicle('isDefault')}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowVehicleModal(false)}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                variant="primary"
                disabled={updateVehicleMutation.isLoading}
              >
                {updateVehicleMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Profile;