import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-white py-5 mt-5">
      <Container>
        <Row>
          <Col md={4}>
            <h5 className="mb-4">ParkingReserve</h5>
            <p className="text-light">
              La plateforme de réservation de parking la plus simple et efficace.
              Trouvez et réservez votre place en quelques clics.
            </p>
            <div className="d-flex gap-3 mt-3">
              <a href="#" className="text-white"><FaFacebook size={20} /></a>
              <a href="#" className="text-white"><FaTwitter size={20} /></a>
              <a href="#" className="text-white"><FaInstagram size={20} /></a>
              <a href="#" className="text-white"><FaLinkedin size={20} /></a>
            </div>
          </Col>
          
          <Col md={2}>
            <h6 className="mb-4">Liens Rapides</h6>
            <ul className="list-unstyled">
              <li className="mb-2"><a href="/parkings" className="text-light text-decoration-none">Parkings</a></li>
              <li className="mb-2"><a href="/about" className="text-light text-decoration-none">À propos</a></li>
              <li className="mb-2"><a href="/contact" className="text-light text-decoration-none">Contact</a></li>
              <li className="mb-2"><a href="/faq" className="text-light text-decoration-none">FAQ</a></li>
            </ul>
          </Col>
          
          <Col md={2}>
            <h6 className="mb-4">Légal</h6>
            <ul className="list-unstyled">
              <li className="mb-2"><a href="/privacy" className="text-light text-decoration-none">Confidentialité</a></li>
              <li className="mb-2"><a href="/terms" className="text-light text-decoration-none">Conditions</a></li>
              <li className="mb-2"><a href="/cookies" className="text-light text-decoration-none">Cookies</a></li>
            </ul>
          </Col>
          
          <Col md={4}>
            <h6 className="mb-4">Contact</h6>
            <ul className="list-unstyled text-light">
              <li className="mb-2">contact@parkingreserve.com</li>
              <li className="mb-2">+212 6 43 98 49 41</li>
              <li className="mb-2">123 Rue du Parking, 60000 Oujda</li>
            </ul>
          </Col>
        </Row>
        
        <hr className="bg-light my-4" />
        
        <Row>
          <Col className="text-center">
            <p className="mb-0">
              &copy; {currentYear} ParkingReserve. Tous droits réservés.
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;