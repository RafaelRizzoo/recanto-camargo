import { useState } from 'react';
import { Container, Row, Col, Form, Modal } from 'react-bootstrap';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import Botao from '../components/UI/Botao';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { imagensCarrosselHome, comodidades, depoimentos } from '../data/conteudoSite';

const DIARIA = 270;
const TAXA_LIMPEZA = 80;
const CHAVE_RESERVAS = 'recanto_camargo_reservas';
const WHATSAPP_NUMERO = '5512996297452';
const MAPS_URL = 'https://www.google.com/maps?q=Recanto+Camargo+Aparecida+SP';

function calcularNoites(checkin, checkout) {
  if (!checkin || !checkout) return 0;
  const diff = Math.round((new Date(checkout) - new Date(checkin)) / 86400000);
  return diff > 0 ? diff : 0;
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

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

function Estrelas({ total = 5 }) {
  return (
    <span>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className="bi bi-star-fill" style={{ color: '#f37321', fontSize: '0.85rem' }} />
      ))}
    </span>
  );
}

function GaleriaFotos({ imagens, onAbrirFoto }) {
  const [indiceAtivo, setIndiceAtivo] = useState(0);

  return (
    <>
      <div className="galeria-reserva d-none d-md-grid">
        <div className="galeria-principal" onClick={() => onAbrirFoto(0)}>
          <img src={imagens[0].src} alt={imagens[0].alt} loading="eager" />
          <div className="galeria-overlay"><i className="bi bi-arrows-fullscreen" /></div>
        </div>
        <div className="galeria-grade">
          {imagens.slice(1, 5).map((img, i) => (
            <div key={img.alt} className="galeria-miniatura" onClick={() => onAbrirFoto(i + 1)}>
              <img src={img.src} alt={img.alt} loading="lazy" />
              <div className="galeria-overlay"><i className="bi bi-arrows-fullscreen" /></div>
              {i === 3 && imagens.length > 5 && (
                <div className="galeria-mais">+{imagens.length - 5} fotos</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="d-md-none galeria-mobile">
        <div className="galeria-mobile-slide">
          <img src={imagens[indiceAtivo].src} alt={imagens[indiceAtivo].alt} />
        </div>
        <div className="galeria-mobile-controles">
          <button
            type="button"
            onClick={() => setIndiceAtivo(i => (i - 1 + imagens.length) % imagens.length)}
          >
            <i className="bi bi-chevron-left" />
          </button>
          <span>{indiceAtivo + 1} / {imagens.length}</span>
          <button
            type="button"
            onClick={() => setIndiceAtivo(i => (i + 1) % imagens.length)}
          >
            <i className="bi bi-chevron-right" />
          </button>
        </div>
      </div>
    </>
  );
}

function Reserva() {
  const { usuario, autenticado } = useAutenticacao();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const hoje = new Date().toISOString().split('T')[0];

  const [datas, setDatas] = useState({
    checkin: searchParams.get('checkin') || '',
    checkout: searchParams.get('checkout') || '',
  });
  const [observacoes, setObservacoes] = useState('');
  const [erros, setErros] = useState({});
  const [fotoAtiva, setFotoAtiva] = useState(0);
  const [modalFotoAberta, setModalFotoAberta] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [reservaConfirmada, setReservaConfirmada] = useState(null);

  const imagens = imagensCarrosselHome.filter(img => !img.ehVideo);
  const noites = calcularNoites(datas.checkin, datas.checkout);
  const subtotal = noites * DIARIA;
  const total = noites > 0 ? subtotal + TAXA_LIMPEZA : 0;

  function abrirFoto(indice) {
    setFotoAtiva(indice);
    setModalFotoAberta(true);
  }

  function handleData(e) {
    const { name, value } = e.target;
    setDatas(d => ({ ...d, [name]: value }));
    setErros(er => ({ ...er, [name]: undefined, conflito: undefined }));
  }

  function irParaLogin() {
    navigate('/Login', { state: { from: location.pathname + location.search } });
  }

  function handleSubmit(evt) {
    evt.preventDefault();
    const errosNovos = {};
    if (!datas.checkin) errosNovos.checkin = 'Selecione a data de check-in.';
    if (!datas.checkout) errosNovos.checkout = 'Selecione a data de check-out.';
    if (datas.checkin && datas.checkout && noites <= 0) {
      errosNovos.checkout = 'O check-out deve ser depois do check-in.';
    }
    if (Object.keys(errosNovos).length > 0) {
      setErros(errosNovos);
      return;
    }
    if (verificarConflito(datas.checkin, datas.checkout)) {
      setErros({ conflito: 'Este período já está reservado. Escolha outras datas.' });
      return;
    }

    const reserva = {
      id: Date.now(),
      usuarioId: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone || '',
      checkin: datas.checkin,
      checkout: datas.checkout,
      observacoes,
      noites,
      diaria: DIARIA,
      subtotal,
      taxa: TAXA_LIMPEZA,
      total,
      status: 'pendente',
      criadaEm: new Date().toISOString(),
    };

    try {
      const reservas = JSON.parse(localStorage.getItem(CHAVE_RESERVAS) || '[]');
      reservas.push(reserva);
      localStorage.setItem(CHAVE_RESERVAS, JSON.stringify(reservas));
      setReservaConfirmada(reserva);
      setEnviado(true);
    } catch {
      setErros({ geral: 'Erro ao salvar reserva. Tente novamente.' });
    }
  }

  function gerarLinkWhatsApp(r) {
    const msg = encodeURIComponent(
      `Olá! Gostaria de confirmar minha reserva no Recanto Camargo.\n\n` +
      `*Nome:* ${r.nome}\n` +
      `*Check-in:* ${formatarData(r.checkin)}\n` +
      `*Check-out:* ${formatarData(r.checkout)}\n` +
      `*Noites:* ${r.noites}\n` +
      `*Total:* ${formatarMoeda(r.total)}\n` +
      (r.observacoes ? `*Observações:* ${r.observacoes}` : '')
    );
    return `https://wa.me/${WHATSAPP_NUMERO}?text=${msg}`;
  }

  if (enviado && reservaConfirmada) {
    return (
      <div className="reserva-page py-5">
        <Container>
          <div className="reserva-sucesso-card mx-auto">
            <div className="text-center mb-4">
              <div className="reserva-sucesso-icone">
                <i className="bi bi-check-lg" />
              </div>
              <h2 className="titulo-secao-azul mt-4">Solicitação Enviada!</h2>
              <p className="text-muted">Sua reserva foi registrada com sucesso</p>
            </div>

            <div className="reserva-sucesso-resumo">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Código</span>
                <strong>#{reservaConfirmada.id}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Check-in</span>
                <strong>{formatarData(reservaConfirmada.checkin)}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Check-out</span>
                <strong>{formatarData(reservaConfirmada.checkout)}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Noites</span>
                <strong>{reservaConfirmada.noites}</strong>
              </div>
              <hr />
              <div className="d-flex justify-content-between fw-bold fs-5">
                <span>Total</span>
                <span className="text-orange">{formatarMoeda(reservaConfirmada.total)}</span>
              </div>
            </div>

            <p className="text-muted small text-center mt-3 mb-4">
              Entre em contato pelo WhatsApp para confirmar e combinar o pagamento.
            </p>

            <a
              href={gerarLinkWhatsApp(reservaConfirmada)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success w-100 py-3 fs-5 fw-bold"
              style={{ borderRadius: '12px' }}
            >
              <i className="bi bi-whatsapp me-2" />
              Confirmar pelo WhatsApp
            </a>

            <button
              type="button"
              className="btn btn-link w-100 mt-3 text-muted text-decoration-none"
              onClick={() => navigate('/')}
            >
              Voltar para a página inicial
            </button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="reserva-page">
      <GaleriaFotos imagens={imagens} onAbrirFoto={abrirFoto} />

      <Container className="reserva-conteudo py-5">
        <Row className="g-5">
          {/* Coluna esquerda: informações do imóvel */}
          <Col lg={7}>
            <div className="mb-4">
              <h1 className="reserva-titulo-imovel">Recanto Camargo</h1>
              <div className="d-flex align-items-center gap-3 flex-wrap mt-2">
                <div className="d-flex align-items-center gap-1">
                  <Estrelas />
                  <span className="fw-bold ms-1">4,98</span>
                  <span className="text-muted">(9 avaliações)</span>
                </div>
                <span className="text-muted">·</span>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="reserva-link-local"
                >
                  <i className="bi bi-geo-alt-fill me-1" />
                  Ponte Alta, Aparecida - SP
                </a>
              </div>
            </div>

            <hr className="reserva-divisor" />

            <div className="mb-4">
              <h4 className="reserva-subtitulo">Sobre o espaço</h4>
              <p className="text-muted lh-lg">
                Casa completa e aconchegante a 5 minutos do Santuário Nacional de Aparecida.
                Ideal para famílias e grupos que buscam conforto, praticidade e tranquilidade
                durante a peregrinação ou lazer.
              </p>
              <Row className="g-3 mt-1">
                {[
                  { icone: 'bi-house-door', texto: 'Casa inteira para você' },
                  { icone: 'bi-people-fill', texto: 'Até 8 hóspedes' },
                  { icone: 'bi-door-open', texto: '2 quartos confortáveis' },
                  { icone: 'bi-shield-check', texto: 'Reserva direta segura' },
                ].map(d => (
                  <Col xs={6} key={d.texto}>
                    <div className="reserva-destaque-item">
                      <i className={`bi ${d.icone}`} />
                      <span>{d.texto}</span>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>

            <hr className="reserva-divisor" />

            <div className="mb-4">
              <h4 className="reserva-subtitulo">O que este lugar oferece</h4>
              <Row className="g-3 mt-1">
                {comodidades.map(c => (
                  <Col xs={6} md={4} key={c.id}>
                    <div className="reserva-comodidade">
                      <i className={`bi ${c.icone}`} />
                      <span>{c.titulo}</span>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>

            <hr className="reserva-divisor" />

            <div className="mb-4">
              <h4 className="reserva-subtitulo">
                <i className="bi bi-star-fill me-2" style={{ color: '#f37321' }} />
                4,98 · 9 avaliações
              </h4>
              <Row className="g-3 mt-1">
                {depoimentos.slice(0, 4).map(d => (
                  <Col md={6} key={d.id}>
                    <div className="reserva-card-depoimento">
                      <p className="reserva-texto-depoimento">
                        &ldquo;{d.texto.substring(0, 130)}&hellip;&rdquo;
                      </p>
                      <div className="d-flex align-items-center gap-2 mt-3">
                        <div className="reserva-avatar">{d.nome[0].toUpperCase()}</div>
                        <div>
                          <div className="fw-bold small text-azul">{d.nome}</div>
                          <div className="text-muted" style={{ fontSize: '0.78rem' }}>{d.local}</div>
                        </div>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>

            <hr className="reserva-divisor" />

            <div>
              <h4 className="reserva-subtitulo">Localização</h4>
              <p className="text-muted mb-3">
                Ponte Alta, Aparecida - SP &mdash; 5 min do Santuário Nacional
              </p>
              <div className="reserva-mapa-container">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1279.723618367829!2d-45.23822072662757!3d-22.84648000473076!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ccc3d5a125211b%3A0x240324a5c110d090!2sRecanto%20Camargo!5e0!3m2!1sen!2sbr!4v1774143793114!5m2!1sen!2sbr"
                  width="100%"
                  height="300"
                  style={{ border: 0, borderRadius: '16px' }}
                  allowFullScreen=""
                  loading="lazy"
                  title="Localização Recanto Camargo"
                />
              </div>
            </div>
          </Col>

          {/* Coluna direita: widget de reserva */}
          <Col lg={5}>
            <div className="reserva-widget shadow-lg bg-white card-resumo p-4">
              <div className="d-flex justify-content-between align-items-baseline mb-3">
                <div>
                  <span className="fs-3 fw-bold text-azul">{formatarMoeda(DIARIA)}</span>
                  <span className="text-muted"> / noite</span>
                </div>
                <div className="small text-muted">
                  <i className="bi bi-star-fill me-1" style={{ color: '#f37321' }} />
                  4,98 &middot; 9 avaliações
                </div>
              </div>

              <div className="reserva-datas-grid mb-2">
                <div className={`reserva-data-campo${erros.checkin ? ' is-invalid' : ''}`}>
                  <label>CHECK-IN</label>
                  <input
                    type="date"
                    name="checkin"
                    value={datas.checkin}
                    onChange={handleData}
                    min={hoje}
                  />
                </div>
                <div className={`reserva-data-campo${erros.checkout ? ' is-invalid' : ''}`}>
                  <label>CHECK-OUT</label>
                  <input
                    type="date"
                    name="checkout"
                    value={datas.checkout}
                    onChange={handleData}
                    min={datas.checkin || hoje}
                  />
                </div>
              </div>

              {(erros.checkin || erros.checkout) && (
                <p className="text-danger small mb-2">
                  <i className="bi bi-exclamation-circle me-1" />
                  {erros.checkin || erros.checkout}
                </p>
              )}

              {erros.conflito && (
                <div className="alert alert-danger py-2 small mb-3">
                  <i className="bi bi-calendar-x me-1" />
                  {erros.conflito}
                </div>
              )}

              {noites > 0 && (
                <div className="reserva-resumo-valores my-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span>{formatarMoeda(DIARIA)} × {noites} {noites === 1 ? 'noite' : 'noites'}</span>
                    <span>{formatarMoeda(subtotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span>Taxa de limpeza</span>
                    <span>{formatarMoeda(TAXA_LIMPEZA)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between fw-bold fs-5">
                    <span>Total</span>
                    <span className="text-orange">{formatarMoeda(total)}</span>
                  </div>
                </div>
              )}

              {autenticado && (
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold text-azul">Observações (opcional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    placeholder="Ex: Berço, pet, chegada noturna..."
                    style={{ borderRadius: '10px', fontSize: '0.9rem', resize: 'none' }}
                  />
                </Form.Group>
              )}

              {erros.geral && (
                <div className="alert alert-danger py-2 small mb-3">{erros.geral}</div>
              )}

              {autenticado ? (
                <Botao larguraTotal onClick={handleSubmit} tipo="button" className="py-3 fs-5">
                  Confirmar Reserva
                </Botao>
              ) : (
                <>
                  <button
                    type="button"
                    className="reserva-btn-login w-100 py-3 fw-bold fs-6"
                    onClick={irParaLogin}
                  >
                    <i className="bi bi-person-circle me-2" />
                    Faça login para reservar
                  </button>
                  <p className="text-muted small text-center mt-2 mb-0">
                    Você pode ver datas e valores sem fazer login.
                  </p>
                </>
              )}

              <div className="reserva-beneficios mt-3">
                <div className="d-flex align-items-center gap-2 small text-muted mb-1">
                  <i className="bi bi-check-circle-fill text-success" />
                  Cancelamento gratuito até 7 dias antes
                </div>
                <div className="d-flex align-items-center gap-2 small text-muted">
                  <i className="bi bi-check-circle-fill text-success" />
                  Sem taxas extras do Airbnb
                </div>
              </div>

              {autenticado && (
                <div className="reserva-usuario-info mt-3">
                  <i className="bi bi-person-check-fill me-2 text-success" />
                  <span className="small">
                    Reservando como <strong>{usuario.nome}</strong>
                  </span>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Container>

      {/* Lightbox de fotos */}
      <Modal
        show={modalFotoAberta}
        onHide={() => setModalFotoAberta(false)}
        size="xl"
        centered
        contentClassName="bg-dark border-0"
      >
        <Modal.Header closeButton closeVariant="white" className="border-0 pb-0" />
        <Modal.Body className="text-center p-2 pb-4">
          <img
            src={imagens[fotoAtiva]?.src}
            alt={imagens[fotoAtiva]?.alt}
            style={{ maxHeight: '75vh', maxWidth: '100%', borderRadius: '12px', objectFit: 'contain' }}
          />
          <div className="d-flex justify-content-center align-items-center gap-4 mt-3">
            <button
              type="button"
              className="btn btn-outline-light rounded-circle"
              style={{ width: 40, height: 40 }}
              onClick={() => setFotoAtiva(i => (i - 1 + imagens.length) % imagens.length)}
            >
              <i className="bi bi-chevron-left" />
            </button>
            <span className="text-white small">{fotoAtiva + 1} / {imagens.length}</span>
            <button
              type="button"
              className="btn btn-outline-light rounded-circle"
              style={{ width: 40, height: 40 }}
              onClick={() => setFotoAtiva(i => (i + 1) % imagens.length)}
            >
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default Reserva;
