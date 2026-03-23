import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import logoPng from '../assets/img/artes/logo.png';
import './navbar.css';

// Ícones SVG
const IconeHome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconeFoto = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const IconeMapa = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/>
    <line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
);

const IconeLogin = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
    <polyline points="10 17 15 12 10 7"/>
    <line x1="15" y1="12" x2="3" y2="12"/>
  </svg>
);

function Menu() {
  return (
    <Navbar expand="lg" variant="dark" className="navbar">
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand className="navbar-brand">
            <img 
              src={logoPng} 
              alt="Recanto Camargo" 
              className="navbar-logo"
            />
            <span className="brand-text">RECANTO CAMARGO</span>
          </Navbar.Brand>
        </LinkContainer>

        <Navbar.Toggle aria-controls="basic-navbar-nav" className="navbar-toggle" />

        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            <LinkContainer to="/">
              <Nav.Link className="nav-link">
                <IconeHome />
                <span>Início</span>
              </Nav.Link>
            </LinkContainer>

            <LinkContainer to="/fotos">
              <Nav.Link className="nav-link">
                <IconeFoto />
                <span>Fotos e Vídeos</span>
              </Nav.Link>
            </LinkContainer>

            <LinkContainer to="/passeios">
              <Nav.Link className="nav-link">
                <IconeMapa />
                <span>Roteiros Aparecida</span>
              </Nav.Link>
            </LinkContainer>

            <LinkContainer to="/Login">
              <Nav.Link className="nav-link">
                <IconeLogin />
                <span>Login</span>
              </Nav.Link>
            </LinkContainer>

            <Button variant="primary" className="btn-reservar">
              Reservar Agora
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Menu;