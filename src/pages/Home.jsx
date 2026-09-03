import { useState, useEffect } from "react";
import { Container, Row, Col, Carousel } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Botao from "../components/UI/Botao";
import Entrada from "../components/UI/Entrada";
import { LinkContainer } from "react-router-bootstrap";
import CalendarioCustom from "../components/UI/CalendarioCustom";
import {
  imagensCarrosselHome,
  comodidades,
  pontosTuristicos,
} from "../data/conteudoSite";
import { verificarSeFeriado } from "../utils/feriados";

const CHAVE_RESERVAS = 'recanto_camargo_reservas';
const WHATSAPP_NUMERO = '5512996297452';

function verificarConflito(checkin, checkout) {
  try {
    const reservas = JSON.parse(localStorage.getItem(CHAVE_RESERVAS) || '[]');
    const entrada = new Date(checkin);
    const saida = new Date(checkout);
    return reservas.some(r => {
      if (r.status === 'cancelada') return false;
      const rEntrada = new Date(r.checkin);
      const rSaida = new Date(r.checkout);
      return entrada < rSaida && saida > rEntrada;
    });
  } catch {
    return false;
  }
}

function Home() {
  const navigate = useNavigate();

  // ----- TESTE DE INTEGRAÇÃO COM O NOVO BACK-END -----
  useEffect(() => {
    fetch('http://localhost:3000/api/imoveis')
      .then(response => response.json())
      .then(dados => {
        console.log("🔥 [SUCESSO] Dados vindos direto do MySQL via Back-end Node.js:");
        console.table(dados);
      })
      .catch(erro => console.error("Erro ao conectar no Back-end:", erro));
  }, []);
  // ---------------------------------------------------

  const [dispo, setDispo] = useState({ checkin: '', checkout: '', pessoas: '' });
  const [erroDispo, setErroDispo] = useState('');
  const [feedbackDispo, setFeedbackDispo] = useState(null);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  const toggleCalendario = () => {
    if (!mostrarCalendario) {
      setMostrarCalendario(true);
      setTimeout(() => {
        const cal = document.getElementById('calendario-popup');
        if (cal) {
          cal.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      setMostrarCalendario(false);
    }
  };

  function handleDispo(e) {
    const { name, value } = e.target;
    const valorFinal = name === 'pessoas' && Number(value) > 10 ? '10' : value;
    setDispo(d => ({ ...d, [name]: valorFinal }));
    setErroDispo('');
  }

  async function verificarDisponibilidade() {
    if (!dispo.checkin || !dispo.checkout) {
      setErroDispo('Selecione as datas de entrada e saída.');
      setFeedbackDispo(null);
      return;
    }
    
    if (!dispo.pessoas || dispo.pessoas <= 0) {
      setErroDispo('Informe o número de pessoas.');
      setFeedbackDispo(null);
      return;
    }

    if (parseInt(dispo.pessoas, 10) > 10) {
      setErroDispo('O número de pessoas ultrapassa o limite da casa (máx: 10).');
      setFeedbackDispo(null);
      return;
    }
    
    const entrada = new Date(dispo.checkin + 'T12:00:00');
    const saida = new Date(dispo.checkout + 'T12:00:00');
    if (saida <= entrada) {
      setErroDispo('A saída deve ser depois da entrada.');
      setFeedbackDispo(null);
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/reservas/disponibilidade?checkin=${dispo.checkin}&checkout=${dispo.checkout}`);
      const data = await response.json();
      
      if (!data.disponivel) {
        setErroDispo('Período indisponível. Escolha outras datas.');
        setFeedbackDispo(null);
        return;
      }
      
      const msDiff = saida.getTime() - entrada.getTime();
      const dias = Math.round(msDiff / (1000 * 3600 * 24));
      
      const strCheckin = entrada.toLocaleDateString('pt-BR');
      const strCheckout = saida.toLocaleDateString('pt-BR');
      
      setFeedbackDispo(`Reserva de ${dias} noite${dias > 1 ? 's' : ''} disponível! Check-in: ${strCheckin} | Check-out: ${strCheckout}`);
      
      setTimeout(() => {
        navigate(`/Reserva?checkin=${dispo.checkin}&checkout=${dispo.checkout}&hospedes=${dispo.pessoas}`);
      }, 2000);
    } catch (error) {
      console.error(error);
      setErroDispo('Erro ao consultar servidor.');
    }
  }


    
  const handleCalendarChange = (val) => {
    if (Array.isArray(val) && val[0] && val[1]) {
      const ci = new Date(val[0].getTime() - val[0].getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const co = new Date(val[1].getTime() - val[1].getTimezoneOffset() * 60000).toISOString().split('T')[0];
      setDispo(d => ({ ...d, checkin: ci, checkout: co }));
      setErroDispo('');
      setFeedbackDispo(null);
      setMostrarCalendario(false);
    }
  };

  return (
    <>
      <div className="wrapper-home">
        <Container className="container-home">
          <Row className="align-items-center mb-5 hero-section">
            <Col lg={6} className="mb-4 mb-lg-0">
              <p className="mb-2" style={{ color: 'rgba(255,146,17,0.9)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
                ⭐ 4,98 · 9 avaliações
              </p>
              <h1
                className="fonte-logo text-white mb-4"
                style={{ fontSize: "3.5rem" }}
              >
                Nosso espaço
              </h1>
              <p className="text-white opacity-90 descricao">
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
                  {imagensCarrosselHome.map((imagem, idx) => (
                    <Carousel.Item key={imagem.alt}>
                      <img
                        className="d-block w-100 img-carousel-home"
                        src={imagem.src}
                        alt={imagem.alt}
                        loading={idx === 0 ? 'eager' : 'lazy'}
                      />
                    </Carousel.Item>
                  ))}
                </Carousel>
              </div>
            </Col>
          </Row>

          <div className="barra-disponibilidade shadow position-relative">
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <div onClick={toggleCalendario} style={{ cursor: 'pointer' }}>
                  <label className="label-dispo">Data de entrada</label>
                  <Entrada 
                    tipo="text" 
                    nome="checkin" 
                    valor={dispo.checkin ? new Date(dispo.checkin + 'T12:00:00').toLocaleDateString('pt-BR') : ''} 
                    onChange={() => {}} 
                    placeholder="Selecionar" 
                    mostrarIconeEsquerdo={false} 
                    readOnly 
                    style={{ cursor: 'pointer', backgroundColor: '#fff' }}
                  />
                </div>
              </Col>
              <Col md={3}>
                <div onClick={toggleCalendario} style={{ cursor: 'pointer' }}>
                  <label className="label-dispo">Data de saída</label>
                  <Entrada 
                    tipo="text" 
                    nome="checkout" 
                    valor={dispo.checkout ? new Date(dispo.checkout + 'T12:00:00').toLocaleDateString('pt-BR') : ''} 
                    onChange={() => {}} 
                    placeholder="Selecionar" 
                    mostrarIconeEsquerdo={false} 
                    readOnly 
                    style={{ cursor: 'pointer', backgroundColor: '#fff' }}
                  />
                </div>
              </Col>
              <Col md={3}>
                <label className="label-dispo">Pessoas</label>
                <Entrada tipo="number" nome="pessoas" valor={dispo.pessoas} onChange={handleDispo} placeholder="0" min="1" max="10" mostrarIconeEsquerdo={false} />
              </Col>
              <Col md={3}>
                <Botao tipo="button" className="w-100 mb-3" style={{ height: '55px' }} onClick={verificarDisponibilidade}>
                  Verificar disponibilidade
                </Botao>
              </Col>
            </Row>

            {mostrarCalendario && (
              <div id="calendario-popup" className="calendario-popup-home shadow-lg rounded bg-white p-3 position-absolute z-3" style={{ top: '100%', left: '15px', marginTop: '10px', minWidth: '320px' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold text-azul fs-5">Selecione as datas</span>
                  <button type="button" className="btn-close" onClick={() => setMostrarCalendario(false)}></button>
                </div>
                <CalendarioCustom
                  valor={(dispo.checkin && dispo.checkout) ? [new Date(dispo.checkin + 'T12:00:00'), new Date(dispo.checkout + 'T12:00:00')] : null}
                  onChange={handleCalendarChange}
                />
              </div>
            )}

            {erroDispo && (
              <p className="text-danger small mt-2 mb-0 ps-2 fw-bold">
                <i className="bi bi-exclamation-circle me-1"></i>{erroDispo}
              </p>
            )}
            {feedbackDispo && (
              <p className="text-success small mt-2 mb-0 ps-2 fw-bold" style={{ color: '#198754' }}>
                <i className="bi bi-check-circle-fill me-1"></i>{feedbackDispo}
              </p>
            )}
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

      <section className="roteiros-section-moderna py-5" style={{ backgroundColor: "#f0f4f8" }}>
        <Container>
          <div className="text-center mb-5">
            <h2 className="titulo-secao-azul">Explore Aparecida</h2>
            <p className="text-muted">O Recanto Camargo está perto de tudo</p>
          </div>

          <Row className="g-4">
            {pontosTuristicos.map((item) => (
              <Col md={6} lg={4} key={item.id}>
                <a 
                  href={item.linkMaps} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div className="card-turismo shadow-sm">
                    <div className="img-container">
                      <img
                        src={item.imagem}
                        alt={item.alt}
                        className="img-fluid"
                        loading="lazy"
                        decoding="async"
                        width="400"
                        height="220"
                      />
                      <div className="tempo-tag">
                        <i className="bi bi-clock"></i> {item.tempo}
                      </div>
                    </div>
                    <div className="card-conteudo p-4">
                      <h4>{item.titulo}</h4>
                      <p>{item.descricao}</p>
                      <div className="mt-3 text-end">
                         <span style={{color: '#f37321', fontWeight: 'bold', fontSize: '0.9rem'}}>
                           Ver Rota <i className="bi bi-arrow-right-short"></i>
                         </span>
                      </div>
                    </div>
                  </div>
                </a>
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
                  title="Localização Recanto Camargo"
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
                    href={`https://wa.me/${WHATSAPP_NUMERO}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline-whats text-center py-2"
                  >
                    <i className="bi bi-whatsapp me-2"></i>Falar com Anfitrião
                  </a>
                </div>

                <p className="mt-4 small opacity-75 text-center">
                  <i className="bi bi-shield-check me-2"></i>Reserva Direta Segura
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
