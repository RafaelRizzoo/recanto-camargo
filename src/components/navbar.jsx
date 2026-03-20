import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

function Menu() {
  return (
    <Navbar style={{ backgroundColor: '#1a3c6d' }} expand="lg" variant="dark" className="shadow">
      <Container>
        {/* Logo ou Nome do Cliente */}
        <LinkContainer to="/">
          <Navbar.Brand className="fw-bold text-primary" style={{ cursor: 'pointer' }}>
            RECANTO CAMARGO
          </Navbar.Brand>
        </LinkContainer>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />

        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            <LinkContainer to="/">
              <Nav.Link>Início</Nav.Link>
            </LinkContainer>

            <LinkContainer to="/fotos">
              <Nav.Link>Fotos e Vídeos</Nav.Link>
            </LinkContainer>

            <LinkContainer to="/passeios">
              <Nav.Link>Roteiros Aparecida</Nav.Link>
            </LinkContainer>

            {/* Botão de Login com destaque */}
            <LinkContainer to="/login">
              <Nav.Link className="mx-lg-2">Login</Nav.Link>
            </LinkContainer>

            {/* Chamada para ação principal: Reserva Direta */}
            <Button variant="primary" className="ms-lg-3 rounded-pill px-4">
              Reservar Agora
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Menu;