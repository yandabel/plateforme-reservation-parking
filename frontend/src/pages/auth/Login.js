import React, { useState } from 'react';
import { Container, Form, Button, Card, Alert } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FaEnvelope, FaLock, FaGoogle, FaFacebook } from 'react-icons/fa';
import { Row, Col } from 'react-bootstrap';

const schema = yup.object({
  email: yup.string().email('Email invalide').required('Email requis'),
  password: yup.string().min(6, 'Minimum 6 caractères').required('Mot de passe requis')
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  });

  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (data) => {
    try {
      setError('');
      setLoading(true);
      const result = await login(data);
      if (result.success) {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError('Échec de la connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <h2 className="fw-bold">Connexion</h2>
                <p className="text-muted">Accédez à votre compte</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit(onSubmit)}>
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
                      {...register('email')}
                    />
                  </div>
                  <Form.Control.Feedback type="invalid">
                    {errors.email?.message}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Mot de passe</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaLock />
                    </span>
                    <Form.Control
                      type="password"
                      placeholder="Votre mot de passe"
                      isInvalid={!!errors.password}
                      {...register('password')}
                    />
                  </div>
                  <Form.Control.Feedback type="invalid">
                    {errors.password?.message}
                  </Form.Control.Feedback>
                  <div className="text-end mt-2">
                    <Link to="/forgot-password" className="text-decoration-none">
                      Mot de passe oublié ?
                    </Link>
                  </div>
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </Button>

                <div className="text-center mb-3">
                  <span className="text-muted">Ou connectez-vous avec</span>
                </div>

                <div className="d-grid gap-2 mb-4">
                  <Button variant="outline-danger" className="d-flex align-items-center justify-content-center">
                    <FaGoogle className="me-2" />
                    Google
                  </Button>
                  <Button variant="outline-primary" className="d-flex align-items-center justify-content-center">
                    <FaFacebook className="me-2" />
                    Facebook
                  </Button>
                </div>

                <div className="text-center">
                  <span className="text-muted">Pas encore de compte ? </span>
                  <Link to="/register" className="text-decoration-none fw-bold">
                    S'inscrire
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

export default Login;