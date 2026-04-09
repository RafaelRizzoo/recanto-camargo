import { Container, Row, Col, Carousel } from "react-bootstrap";
import Botao from "../components/UI/Botao";
import Entrada from "../components/UI/Entrada";
import { LinkContainer } from "react-router-bootstrap";
import {
  imagensCarrosselHome,
  comodidades,
  pontosTuristicos,
} from "../data/conteudoSite";

function Home() {
  return (
    <>
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
                  {imagensCarrosselHome.map((imagem) => (
                    <Carousel.Item key={imagem.alt}>
                      <img
                        className="d-block w-100 img-carousel-home"
                        src={imagem.src}
                        alt={imagem.alt}
                      />
                    </Carousel.Item>
                  ))}
                </Carousel>
              </div>
            </Col>
          </Row>

          <div className="barra-disponibilidade shadow">
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <label className="label-dispo">Data de entrada</label>
                <Entrada tipo="date" />
              </Col>
              <Col md={3}>
                <label className="label-dispo">Data de saída</label>
                <Entrada tipo="date" />
              </Col>
              <Col md={3}>
                <label className="label-dispo">Pessoas</label>
                <Entrada tipo="number" placeholder="0" />
              </Col>
              <Col md={3}>
                <Botao tipo="button" className="w-100 py-2">
                  Verificar disponibilidade
                </Botao>
              </Col>
            </Row>
          </div>
        </Container>
      </div>

      <section className="comodidades-section py-5 bg-white">
        <Container>
          <div className="text-center mb-5">
            <h2 className="titulo-secao-dark">Comodidades para você!</h2>
            <p className="text-muted">Aproveite o melhor do Recanto Camargo</p>
          </div>
          <Row className="g-4 text-center justify-content-center">
            {comodidades.map((item) => (
              <Col xs={6} md={3} key={item.id}>
                <div className="comodidade-item">
                  <div className="comodidade-icone-area">
                    <div className="icone-circulo">
                      <i className={`bi ${item.icone}`}></i>
                    </div>
                  </div>
                  <h4 className="comodidade-titulo">{item.titulo}</h4>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

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
            {pontosTuristicos.map((item) => (
              <Col md={6} lg={4} key={item.id}>
                <div className="card-turismo shadow-sm">
                  <div className="img-container">
                    <img src={item.imagem} alt={item.alt} className="img-fluid" />
                    <div className="tempo-tag">
                      <i className="bi bi-clock"></i> {item.tempo}
                    </div>
                  </div>
                  <div className="card-conteudo p-4">
                    <h4>{item.titulo}</h4>
                    <p>{item.descricao}</p>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      <section className="reserva-final-section py-5">
        <Container>
          <Row className="align-items-center g-5">
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
                  <LinkContainer to="/Reserva">
                    <Botao className="btn-reserva-claro py-3 fs-5">
                      <i className="bi bi-calendar-check me-2"></i>Reservar Agora
                    </Botao>
                  </LinkContainer>

                  <a
                    href="https://wa.me/5512999999999"
                    target="_blank"
                    rel="noopener noreferrer"
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
