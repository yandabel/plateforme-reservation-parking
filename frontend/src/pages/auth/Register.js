import React, { useState } from 'react';
import { Container, Form, Button, Card, Alert, Row, Col } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaUserTie } from 'react-icons/fa';

const schema = yup.object({
  firstName: yup.string().required('Prénom requis'),
  lastName: yup.string().required('Nom requis'),
  email: yup.string().email('Email invalide').required('Email requis'),
  phone: yup.string()
  .required('Téléphone requis')
  .matches(
    /^[\+]?[1-9][\d]{0,15}$/,
    'Numéro de téléphone invalide. Utilisez le format international'
  ),  password: yup.string().min(6, 'Minimum 6 caractères').required('Mot de passe requis'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password'), null], 'Les mots de passe ne correspondent pas')
    .required('Confirmation du mot de passe requise'),
  role: yup.string().oneOf(['client', 'proprietaire'], 'Rôle invalide').required('Rôle requis')
});

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { register: formRegister, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  });

  const onSubmit = async (data) => {
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      const { confirmPassword, ...userData } = data;
      const result = await register(userData);
      
      if (result.success) {
        setSuccess('Compte créé avec succès ! Veuillez vérifier votre email.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(result.error?.message || 'Erreur lors de l\'inscription');
      }
    } catch (err) {
      setError('Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <h2 className="fw-bold">Créer un compte</h2>
                <p className="text-muted">Rejoignez notre communauté</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Form onSubmit={handleSubmit(onSubmit)}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Prénom</Form.Label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <FaUser />
                        </span>
                        <Form.Control
                          type="text"
                          placeholder="Votre prénom"
                          isInvalid={!!errors.firstName}
                          {...formRegister('firstName')}
                        />
                      </div>
                      <Form.Control.Feedback type="invalid">
                        {errors.firstName?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nom</Form.Label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <FaUser />
                        </span>
                        <Form.Control
                          type="text"
                          placeholder="Votre nom"
                          isInvalid={!!errors.lastName}
                          {...formRegister('lastName')}
                        />
                      </div>
                      <Form.Control.Feedback type="invalid">
                        {errors.lastName?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaEnvelope />
                    </span>
                    <Form.Control
                      type="email"
                      placeholder="votre@email.com"
                      isInvalid={!!errors.email}
                      {...formRegister('email')}
                    />
                  </div>
                  <Form.Control.Feedback type="invalid">
                    {errors.email?.message}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Téléphone</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaPhone />
                    </span>
                    <Form.Control
                      type="tel"
                      placeholder="0123456789"
                      isInvalid={!!errors.phone}
                      {...formRegister('phone')}
                    />
                  </div>
                  <Form.Control.Feedback type="invalid">
                    {errors.phone?.message}
                  </Form.Control.Feedback>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Mot de passe</Form.Label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <FaLock />
                        </span>
                        <Form.Control
                          type="password"
                          placeholder="Votre mot de passe"
                          isInvalid={!!errors.password}
                          {...formRegister('password')}
                        />
                      </div>
                      <Form.Control.Feedback type="invalid">
                        {errors.password?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Confirmer le mot de passe</Form.Label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <FaLock />
                        </span>
                        <Form.Control
                          type="password"
                          placeholder="Confirmez votre mot de passe"
                          isInvalid={!!errors.confirmPassword}
                          {...formRegister('confirmPassword')}
                        />
                      </div>
                      <Form.Control.Feedback type="invalid">
                        {errors.confirmPassword?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-4">
                  <Form.Label>Je souhaite</Form.Label>
                  <div className="d-flex gap-4">
                    <Form.Check
                      type="radio"
                      id="client"
                      label={
                        <div className="d-flex align-items-center">
                          <FaUser className="me-2" />
                          <span>Réserver des places</span>
                        </div>
                      }
                      value="client"
                      {...formRegister('role')}
                    />
                    <Form.Check
                      type="radio"
                      id="proprietaire"
                      label={
                        <div className="d-flex align-items-center">
                          <FaUserTie className="me-2" />
                          <span>Louer mes places</span>
                        </div>
                      }
                      value="proprietaire"
                      {...formRegister('role')}
                    />
                  </div>
                  <Form.Control.Feedback type="invalid" className="d-block">
                    {errors.role?.message}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Check
                    type="checkbox"
                    id="terms"
                    label={
                      <span>
                        J'accepte les{' '}
                        <Link to="/terms" className="text-decoration-none">
                          conditions d'utilisation
                        </Link>{' '}
                        et la{' '}
                        <Link to="/privacy" className="text-decoration-none">
                          politique de confidentialité
                        </Link>
                      </span>
                    }
                    required
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? 'Création en cours...' : 'Créer mon compte'}
                </Button>

                <div className="text-center">
                  <span className="text-muted">Vous avez déjà un compte ? </span>
                  <Link to="/login" className="text-decoration-none fw-bold">
                    Se connecter
                  </Link>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Register;