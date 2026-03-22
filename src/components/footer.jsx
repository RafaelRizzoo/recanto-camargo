import { Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import "./footer.css";

function Footer() {
  return (
    <footer className="footer-recanto pt-5 pb-3">
      <Container>
        <Row className="gy-4">
          {/* COLUNA 1: LOGO E FRASE */}
          <Col lg={4} className="text-center text-lg-start">
            <h3 className="fonte-logo text-white mb-3">Recanto Camargo</h3>
            <p className="text-white opacity-75 small pr-lg-5">
              Sua casa de acolhimento e paz em Aparecida. Localização privilegiada para sua romaria ser inesquecível.
            </p>
          </Col>

          {/* COLUNA 2: LINKS RÁPIDOS */}
          <Col lg={4} className="text-center">
            <h5 className="text-white mb-3 fw-bold">Navegação</h5>
            <ul className="list-unstyled footer-links">
              <li><Link to="/">Início</Link></li>
              <li><Link to="/fotos">Fotos da Casa</Link></li>
              <li><Link to="/roteiros">Roteiros</Link></li>
              <li><Link to="/contato">Contato</Link></li>
            </ul>
          </Col>

          {/* COLUNA 3: CONTATO E REDES */}
          <Col lg={4} className="text-center text-lg-end">
            <h5 className="text-white mb-3 fw-bold">Fale Conosco</h5>
            <p className="text-white small mb-2">
              <i className="bi bi-geo-alt-fill me-2 text-warning"></i>
              Rua José Ourives, 76 - Ponte Alta
            </p>
            <p className="text-white small mb-3">
              <i className="bi bi-whatsapp me-2 text-success"></i>
              (12) 99999-9999
            </p>
            <div className="footer-social">
              <a href="#" className="text-white fs-4 me-3"><i className="bi bi-instagram"></i></a>
              <a href="#" className="text-white fs-4 me-3"><i className="bi bi-facebook"></i></a>
              <a href="#" className="text-white fs-4"><i className="bi bi-airbnb"></i></a>
            </div>
          </Col>
        </Row>

        <hr className="border-light opacity-25 my-4" />

        <div className="text-center text-white opacity-50 small">
          <p>© 2026 Recanto Camargo. Desenvolvido com carinho para nossos hóspedes.</p>
        </div>
      </Container>
    </footer>
  );
}

export default Footer;