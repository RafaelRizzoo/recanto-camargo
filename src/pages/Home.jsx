import { Container, Row, Col, Carousel } from "react-bootstrap";
import Botao from "../components/UI/Botao";
import Entrada from "../components/UI/Entrada";

import BanheiroImg from "../assets/img/comodos/Banheiro.png";
import ChurrasqueiraImg from "../assets/img/comodos/Churrasqueira.png";
import CozinhaImg from "../assets/img/comodos/Cozinha.png";
import FrenteImg from "../assets/img/comodos/Frente.png";
import JardimImg from "../assets/img/comodos/JardimInverno.png";
import Quarto2Img from "../assets/img/comodos/QuartoDois.png";
import Quarto1Img from "../assets/img/comodos/QuartoUm.png";
import SalaImg from "../assets/img/comodos/Sala.png";

import BasilicaTurismo from "../assets/img/turismo/BasilicaTurismo.png";
import CruzeiroTurismo from "../assets/img/turismo/CruzeiroTurismo.png";
import FeiraTurismo from "../assets/img/turismo/FeiraTurismo.png";
import PassarelaTurismo from "../assets/img/turismo/PassarelaTurismo.png";
import PortoTurismo from "../assets/img/turismo/PortoTurismo.png";
import RosarioTurismo from "../assets/img/turismo/RosarioTurismo.png";

import "../CSS/style.css";

function Home() {
  return (
    <>
      {/* 1. SEÇÃO HERO */}
      <div className="wrapper-home">
        <Container className="container-home">
          <Row className="align-items-center mb-5 hero-section">
            <Col lg={6} className="mb-4 mb-lg-0">
              <h1
                className="fonte-logo text-white mb-4"
                style={{ fontSize: "3.5rem" }}
              >
                Nosso espaço
              </h1>
              <p 
                className="text-white opacity-90 descricao"
              >
                Encontre o espaço ideal para tornar seus momentos ainda mais
                especiais. Nosso ambiente foi pensado para oferecer conforto,
                praticidade e tranquilidade.
              </p>
              <p className="text-white mt-4 opacity-90 descricao">
                Reserve com facilidade e tenha a segurança de um lugar preparado
                para você.
              </p>
            </Col>

            <Col lg={6}>
              <div className="carousel-moldura shadow-lg">
                <Carousel fade indicators={true} interval={3000}>
                  <Carousel.Item>
                    <img
                      className="d-block w-100 img-carousel-home"
                      src={FrenteImg}
                      alt="Frente"
                    />
                  </Carousel.Item>
                  <Carousel.Item>
                    <img
                      className="d-block w-100 img-carousel-home"
                      src={SalaImg}
                      alt="Sala"
                    />
                  </Carousel.Item>
                  <Carousel.Item>
                    <img
                      className="d-block w-100 img-carousel-home"
                      src={Quarto1Img}
                      alt="Quarto 1"
                    />
                  </Carousel.Item>
                  <Carousel.Item>
                    <img
                      className="d-block w-100 img-carousel-home"
                      src={Quarto2Img}
                      alt="Quarto 2"
                    />
                  </Carousel.Item>
                  <Carousel.Item>
                    <img
                      className="d-block w-100 img-carousel-home"
                      src={BanheiroImg}
                      alt="Banheiro"
                    />
                  </Carousel.Item>
                  <Carousel.Item>
                    <img
                      className="d-block w-100 img-carousel-home"
                      src={JardimImg}
                      alt="Jardim"
                    />
                  </Carousel.Item>
                  <Carousel.Item>
                    <img
                      className="d-block w-100 img-carousel-home"
                      src={CozinhaImg}
                      alt="Cozinha"
                    />
                  </Carousel.Item>
                  <Carousel.Item>
                    <img
                      className="d-block w-100 img-carousel-home"
                      src={ChurrasqueiraImg}
                      alt="Churrasqueira"
                    />
                  </Carousel.Item>
                </Carousel>
              </div>
            </Col>
          </Row>

          <div className="barra-disponibilidade shadow">
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <label className="label-dispo">Data de entrada</label>
                <Entrada type="date" />
              </Col>
              <Col md={3}>
                <label className="label-dispo">Data de saída</label>
                <Entrada type="date" />
              </Col>
              <Col md={3}>
                <label className="label-dispo">Pessoas</label>
                <Entrada type="number" placeholder="0" />
              </Col>
              <Col md={3}>
                <Botao className="w-100 py-2">Verificar disponibilidade</Botao>
              </Col>
            </Row>
          </div>
        </Container>
      </div>

      {/* 2. SEÇÃO DE COMODIDADES */}
      <section className="comodidades-section py-5 bg-white">
        <Container>
          <div className="text-center mb-5">
            <h2 className="titulo-secao-dark">Comodidades para você!</h2>
            <p className="text-muted">Aproveite o melhor do Recanto Camargo</p>
          </div>
          <Row className="g-4 text-center justify-content-center">
            <Col xs={6} md={3}>
              <div className="comodidade-item">
                <div className="icone-circulo">
                  <i className="bi bi-geo-alt-fill"></i>
                </div>
                <h4 className="comodidade-titulo">Localização</h4>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="comodidade-item">
                <div className="icone-circulo">
                  <i className="bi bi-wifi"></i>
                </div>
                <h4 className="comodidade-titulo">Wi-Fi Grátis</h4>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="comodidade-item">
                <div className="icone-circulo">
                  <i className="bi bi-car-front-fill"></i>
                </div>
                <h4 className="comodidade-titulo">Garagem</h4>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="comodidade-item">
                <div className="icone-circulo">
                  <i className="bi bi-fire"></i>
                </div>
                <h4 className="comodidade-titulo">Churrasqueira</h4>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="comodidade-item">
                <div className="icone-circulo">
                  <i className="bi bi-heart-fill"></i>
                </div>
                <h4 className="comodidade-titulo">Aceitamos Pets</h4>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="comodidade-item">
                <div className="icone-circulo">
                  <i className="bi bi-tv"></i>
                </div>
                <h4 className="comodidade-titulo">Smart TVs</h4>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="comodidade-item">
                <div className="icone-circulo">
                  <i className="bi bi-egg-fried"></i>
                </div>
                <h4 className="comodidade-titulo">Cozinha Completa</h4>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="comodidade-item">
                <div className="icone-circulo">
                  <i className="bi bi-stars"></i>
                </div>
                <h4 className="comodidade-titulo">Enxoval Incluso</h4>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* 3. SEÇÃO: EXPLORE APARECIDA  */}
      <section
        className="roteiros-section-moderna py-5"
        style={{ backgroundColor: "#f0f4f8" }}
      >
        <Container>
          <div className="text-center mb-5">
            <h2 className="titulo-secao-azul">Explore Aparecida</h2>
            <p className="text-muted">O Recanto Camargo está perto de tudo</p>
          </div>

          <Row className="g-4">
            <Col md={6} lg={4}>
              <div className="card-turismo shadow-sm">
                <div className="img-container">
                  <img
                    src={BasilicaTurismo}
                    alt="Santuário Nacional"
                    className="img-fluid"
                  />
                  <div className="tempo-tag">
                    <i className="bi bi-clock"></i> 5 min
                  </div>
                </div>
                <div className="card-conteudo p-4">
                  <h4>Santuário Nacional</h4>
                  <p>A maior basílica dedicada a Maria no mundo.</p>
                </div>
              </div>
            </Col>
            <Col md={6} lg={4}>
              <div className="card-turismo shadow-sm">
                <div className="img-container">
                  <img
                    src={PassarelaTurismo}
                    alt="Passarela da Fé"
                    className="img-fluid"
                  />
                  <div className="tempo-tag">
                    <i className="bi bi-clock"></i> 6 min
                  </div>
                </div>
                <div className="card-conteudo p-4">
                  <h4>Passarela da Fé</h4>
                  <p>
                    Caminho que liga a Basílica Velha ao Santuário.
                  </p>
                </div>
              </div>
            </Col>
            <Col md={6} lg={4}>
              <div className="card-turismo shadow-sm">
                <div className="img-container">
                  <img
                    src={CruzeiroTurismo}
                    alt="Morro do Cruzeiro"
                    className="img-fluid"
                  />
                  <div className="tempo-tag">
                    <i className="bi bi-clock"></i> 9 min
                  </div>
                </div>
                <div className="card-conteudo p-4">
                  <h4>Morro do Cruzeiro</h4>
                  <p>Vista privilegiada de toda a cidade e da Basílica.</p>
                </div>
              </div>
            </Col>
            <Col md={6} lg={4}>
              <div className="card-turismo shadow-sm">
                <div className="img-container">
                  <img
                    src={RosarioTurismo}
                    alt="Caminho do Rosário"
                    className="img-fluid"
                  />
                  <div className="tempo-tag">
                    <i className="bi bi-clock"></i> 5 min
                  </div>
                </div>
                <div className="card-conteudo p-4">
                  <h4>Caminho do Rosário</h4>
                  <p>Cenários que retratam os mistérios do Rosário.</p>
                </div>
              </div>
            </Col>
            <Col md={6} lg={4}>
              <div className="card-turismo shadow-sm">
                <div className="img-container">
                  <img
                    src={PortoTurismo}
                    alt="Porto Itaguaçu"
                    className="img-fluid"
                  />
                  <div className="tempo-tag">
                    <i className="bi bi-clock"></i> 7 min
                  </div>
                </div>
                <div className="card-conteudo p-4">
                  <h4>Porto Itaguaçu</h4>
                  <p>Local onde a imagem da Padroeira foi encontrada.</p>
                </div>
              </div>
            </Col>
            <Col md={6} lg={4}>
              <div className="card-turismo shadow-sm">
                <div className="img-container">
                  <img
                    src={FeiraTurismo}
                    alt="Feira Livre"
                    className="img-fluid"
                  />
                  <div className="tempo-tag">
                    <i className="bi bi-clock"></i> 4 min
                  </div>
                </div>
                <div className="card-conteudo p-4">
                  <h4>Feira Livre</h4>
                  <p>O ponto ideal para compras e artigos religiosos.</p>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* SEÇÃO FINAL: MAPA + CTA DE RESERVA */}
      <section className="reserva-final-section py-5">
        <Container>
          <Row className="align-items-center g-5">
            {/* LADO ESQUERDO: MAPA */}
            <Col lg={7}>
              <div className="mapa-container shadow-lg">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1279.723618367829!2d-45.23822072662757!3d-22.84648000473076!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ccc3d5a125211b%3A0x240324a5c110d090!2sRecanto%20Camargo!5e0!3m2!1sen!2sbr!4v1774143793114!5m2!1sen!2sbr" 
                  width="100%"
                  height="400"
                  style={{ border: 0, borderRadius: "20px" }}
                  allowFullScreen=""
                  loading="lazy"
                ></iframe>
              </div>
            </Col>

            {/* LADO DIREITO: CHAMADA PARA AÇÃO*/}
            <Col lg={5} className="text-white">
              <div className="cta-reserva-card p-4">
                <h2 className="fonte-logo mb-3" style={{ fontSize: "2.5rem" }}>
                  Sua estadia começa aqui
                </h2>
                <p className="mb-4 opacity-90">
                  Estamos prontos para te receber com todo o conforto que sua
                  família merece. Clique abaixo para garantir sua data ou tirar
                  dúvidas pelo WhatsApp.
                </p>

                <div className="d-grid gap-3">
                  <Botao className="btn-reserva-claro py-3 fs-5">
                    <i className="bi bi-calendar-check me-2"></i>Reservar Agora
                  </Botao>
                  <a
                    href="https://wa.me/seu-numero"
                    className="btn-outline-whats text-center py-2"
                  >
                    <i className="bi bi-whatsapp me-2"></i>Falar com Anfitrião
                  </a>
                </div>

                <p className="mt-4 small opacity-75 text-center">
                  <i className="bi bi-shield-check me-2"></i>Reserva Direta
                  Segura
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </>
  );
}

export default Home;
