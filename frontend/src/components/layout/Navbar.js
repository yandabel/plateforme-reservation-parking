import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Nav, Navbar as BootstrapNavbar, NavDropdown, Badge } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { FaParking, FaUser, FaCar, FaSignOutAlt, FaCog } from 'react-icons/fa';

const Navbar = () => {
  const { user, logout, isOwner, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <BootstrapNavbar bg="dark" variant="dark" expand="lg" sticky="top">
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <FaParking className="me-2" size={24} />
          <span className="fw-bold">ParkingReserve</span>
        </BootstrapNavbar.Brand>
        
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/parkings">Parkings</Nav.Link>
            {isOwner && (
              <Nav.Link as={Link} to="/my-parkings">Mes Parkings</Nav.Link>
            )}
            {user && (
              <Nav.Link as={Link} to="/reservations">Mes Réservations</Nav.Link>
            )}
            {isAdmin && (
              <Nav.Link as={Link} to="/admin/dashboard">Dashboard Admin</Nav.Link>
            )}
          </Nav>
          
          <Nav>
            {user ? (
              <NavDropdown
                title={
                  <div className="d-inline-flex align-items-center">
                    <FaUser className="me-2" />
                    <span>{user.firstName}</span>
                    {isOwner && <Badge bg="warning" className="ms-2">Pro</Badge>}
                    {isAdmin && <Badge bg="danger" className="ms-2">Admin</Badge>}
                  </div>
                }
                align="end"
              >
                <NavDropdown.Item as={Link} to="/profile">
                  <FaUser className="me-2" />
                  Mon Profil
                </NavDropdown.Item>
                {isOwner && (
                  <NavDropdown.Item as={Link} to="/parkings/create">
                    <FaCar className="me-2" />
                    Ajouter un Parking
                  </NavDropdown.Item>
                )}
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>
                  <FaSignOutAlt className="me-2" />
                  Déconnexion
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <>
                <Nav.Link as={Link} to="/login">Connexion</Nav.Link>
                <Nav.Link as={Link} to="/register" className="btn btn-primary text-white">
                  Inscription
                </Nav.Link>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;