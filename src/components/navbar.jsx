import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import logoPng from '../assets/img/artes/santa.png';
import './navbar.css';

// Ícones SVG
const IconeHome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconeFoto = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const IconeLogin = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

const IconeEstrela = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

function Menu() {
  return (
    <Navbar expand="lg" variant="dark" className="navbar-moderna">
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand className="navbar-brand-moderna">
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
              <Nav.Link className="nav-link-moderna">
                <IconeHome />
                <span>Início</span>
              </Nav.Link>
            </LinkContainer>

            <LinkContainer to="/Fotos">
              <Nav.Link className="nav-link-moderna">
                <IconeFoto />
                <span>Fotos e Vídeos</span>
              </Nav.Link>
            </LinkContainer>

            <LinkContainer to="/Avaliacoes">
              <Nav.Link className="nav-link-moderna">
                <IconeEstrela />
                <span>Avaliações</span>
              </Nav.Link>
            </LinkContainer>

            <LinkContainer to="/Login">
              <Nav.Link className="nav-link-moderna">
                <IconeLogin />
                <span>Login</span>
              </Nav.Link>
            </LinkContainer>

            <LinkContainer to="/Reserva">
              <Button variant="primary" className="btn-reservar-moderna">
                Reservar Agora
              </Button>
            </LinkContainer>

          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Menu;