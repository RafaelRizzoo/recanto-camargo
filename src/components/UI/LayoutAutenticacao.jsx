import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import './LayoutAutenticacao.css';

const IconeSetaEsquerda = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

function LayoutAutenticacao({
  children,
  imagemFundo,
  imagemLogo,
  titulo,
  subtitulo = 'Bem-vindo ao seu recanto de paz',
  mostrarBotaoVoltar = true,
  linkVoltar = '/',
  textoBotaoVoltar = 'Voltar para o site'
}) {
  return (
    <Container fluid className="container-autenticacao">
      <Row className="linha-autenticacao">
        <Col md={8} className="d-none d-md-block coluna-imagem">
          {mostrarBotaoVoltar && (
            <Link to={linkVoltar} className="btn-voltar">
              <IconeSetaEsquerda />
              {textoBotaoVoltar}
            </Link>
          )}

          {imagemFundo && (
            <img
              src={imagemFundo}
              alt="Santuário Nacional de Aparecida"
              className="imagem-autenticacao"
            />
          )}
        </Col>

        <Col xs={12} md={4} className="coluna-formulario">
          <div className="container-formulario">
            {imagemLogo && (
              <div className="container-logo">
                <img src={imagemLogo} alt="Recanto Camargo" className="logo" />
              </div>
            )}

            {titulo && (
              <h2 className="titulo-autenticacao">{titulo}</h2>
            )}

            {subtitulo && (
              <p className="subtitulo-autenticacao">{subtitulo}</p>
            )}

            {children}
          </div>
        </Col>
      </Row>
    </Container>
  );
}

LayoutAutenticacao.propTypes = {
  children: PropTypes.node.isRequired,
  imagemFundo: PropTypes.string,
  imagemLogo: PropTypes.string,
  titulo: PropTypes.string,
  subtitulo: PropTypes.string,
  mostrarBotaoVoltar: PropTypes.bool,
  linkVoltar: PropTypes.string,
  textoBotaoVoltar: PropTypes.string,
};

export default LayoutAutenticacao;
