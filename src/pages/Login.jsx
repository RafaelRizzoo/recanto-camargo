import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import logoPng from '../assets/img/logo.png';
import basilicaPng from '../assets/img/basilica.png';

function Login() {
  return (
    <Container fluid className="vh-100 p-0 m-0 overflow-hidden">
      <Row className="h-100 g-0 m-0">

        {/* COLUNA ESQUERDA: Imagem + Botão Voltar */}
        <Col md={8} className="d-none d-md-block position-relative p-0 gradiente-fundo">

          {/* Botão de Voltar Flutuante */}
          <Link
            to="/"
            className="btn btn-light position-absolute m-4 fw-bold d-flex align-items-center btn-voltar-custom"
            style={{
              zIndex: 10,
              borderRadius: '50px',
              padding: '10px 20px',
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              border: 'none',
              backdropFilter: 'blur(5px)',
              color: '#1a3c6d',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.6)'
            }}
          >
            <span className="me-2 btn-voltar-custom">←</span> Voltar para o site
          </Link>

          <img
            src={basilicaPng}
            alt="Santuário Nacional de Aparecida"
            className="w-100 h-100"
            style={{
              objectFit: 'cover',
              objectPosition: 'left',
              display: 'block'
            }}
          />
        </Col>

        {/* COLUNA DIREITA: Formulário */}
        <Col xs={12} md={4} className="h-100 d-flex align-items-center justify-content-center p-0 gradiente-formulario"
          style={{ zIndex: 10, boxShadow: '-15px 0 30px rgba(0, 0, 0, 0.4)' }}>

          <div className="p-5 w-100" style={{ maxWidth: '450px' }}>

            {/* O Logo Png */}
            <div className="text-center" style={{ marginBottom: '-50px' }}>
              <img
                src={logoPng}
                alt="Recanto Camargo"
                className="img-fluid"
                style={{ width: '100%', height: 'auto', maxWidth: '600px' }}
              />
            </div>

            {/* Texto de Acesso */}
            <h2 className="fonte-logo text-center text-white mb-5 mt-2" style={{ fontSize: '2.5rem' }}>
              Acesse sua conta
            </h2>

            {/* O Formulário do Bootstrap */}
            <Form>
              <Form.Group className="mb-3" controlId="formBasicEmail">
                <Form.Control
                  type="email"
                  placeholder="Insira seu email"
                  className="rounded-pill p-3 border-0"
                />
              </Form.Group>

              <Form.Group className="mb-4 position-relative" controlId="formBasicPassword">
                <Form.Control
                  type="password"
                  placeholder="Insira sua senha"
                  className="rounded-pill p-3 border-0"
                />
                <span className="position-absolute end-0 top-50 translate-middle-y me-3 text-muted" style={{ cursor: 'pointer' }}>
                  👁️
                </span>
              </Form.Group>

              {/* Botão Login Laranja */}
              <Button
                variant="warning"
                type="submit"
                className="w-100 rounded-pill p-3 fw-bold text-white mb-4 btn-login-custom"
                style={{ backgroundColor: '#f37321', border: 'none', boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.7)', fontSize: '20px' }}
              >
                Login
              </Button>

              <div className="text-center mt-3">
                {/* Usamos o to="/cadastro" para apontar para a nova rota */}
                <Link
                  to="/Cadastro"
                  className="text-white text-decoration-none fw-bold"
                  style={{ opacity: 0.9, fontSize: '18px' }}
                >
                  Ainda não tem conta? <span style={{ color: '#ffad33' }}>Criar conta</span>
                </Link>
              </div>

              {/* Link Criar Conta*/}
              <div className="text-center">
                <a href="#esqueci" className="text-white text-decoration-none small" style={{ opacity: 0.8, fontSize: '20px' }}>
                  Esqueceu sua senha? aaaaaaaaaa
                </a>
              </div>
            </Form>

          </div>
        </Col>

      </Row>
    </Container>
  );
}

export default Login;