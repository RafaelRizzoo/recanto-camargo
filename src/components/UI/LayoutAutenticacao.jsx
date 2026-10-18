import { Container, Row, Col } from 'react-bootstrap';
import { usePreferencias } from '../../hooks/usePreferencias';
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
    aria-hidden="true"
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
  textoBotaoVoltar = 'Voltar para o site',
  compacto = false
}) {
  const { t, tema, idioma, alternarTema, alternarIdioma } = usePreferencias();
  const escuro = tema === 'escuro';
  return (
    <Container fluid className="container-autenticacao">
      <Row className="linha-autenticacao">
        <Col md={7} className="d-none d-md-block coluna-imagem">
          {mostrarBotaoVoltar && (
            <Link to={linkVoltar} className="btn-voltar">
              <IconeSetaEsquerda />
              {t(textoBotaoVoltar)}
            </Link>
          )}

          {imagemFundo && (
            <img
              src={imagemFundo}
              alt={t("Basílica Nacional de Aparecida")}
              className="imagem-autenticacao"
            />
          )}

          {/* O logo é branco: só funciona sobre a foto escurecida. */}
          {imagemLogo && (
            <img src={imagemLogo} alt="Recanto Camargo" className="logo-sobre-imagem" />
          )}
        </Col>

        <Col xs={12} md={5} className="coluna-formulario">
          <div className="rc-auth-prefs">
            <button
              type="button"
              className="rc-pref"
              onClick={alternarIdioma}
              lang={idioma === 'en' ? 'pt' : 'en'}
              aria-label={idioma === 'en' ? 'Mudar para português' : 'Switch to English'}
            >
              <i className="bi bi-translate" aria-hidden="true" />
              <span>{idioma === 'en' ? 'PT' : 'EN'}</span>
            </button>
            <button
              type="button"
              className="rc-pref"
              onClick={alternarTema}
              aria-pressed={escuro}
              aria-label={escuro ? t('Ativar tema claro') : t('Ativar tema escuro')}
            >
              <i className={`bi ${escuro ? 'bi-sun' : 'bi-moon-stars'}`} aria-hidden="true" />
            </button>
          </div>
          <div className={`container-formulario${compacto ? ' formulario-compacto' : ''}`}>
            <Link to="/" className="marca-autenticacao fonte-logo" aria-label={t("Recanto Camargo, ir ao início")}>
              Recanto Camargo
            </Link>

            {titulo && (
              <h1 className="titulo-autenticacao">{titulo}</h1>
            )}

            {subtitulo && (
              <p className="subtitulo-autenticacao">{t(subtitulo)}</p>
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
  compacto: PropTypes.bool,
};

export default LayoutAutenticacao;
