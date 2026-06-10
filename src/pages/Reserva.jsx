import { useState } from 'react';
import { Container, Row, Col, Form, Modal, Button } from 'react-bootstrap';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import Botao from '../components/UI/Botao';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { imagensCarrosselHome, comodidades, depoimentos } from '../data/conteudoSite';
import CalendarioCustom from '../components/UI/CalendarioCustom';

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
  const [hospedes, setHospedes] = useState('');
  const [erros, setErros] = useState({});
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [fotoAtiva, setFotoAtiva] = useState(0);
  const [modalFotoAberta, setModalFotoAberta] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [reservaConfirmada, setReservaConfirmada] = useState(null);
  
  const [cupomInput, setCupomInput] = useState('');
  const [cupomAplicado, setCupomAplicado] = useState(null);
  const [erroCupom, setErroCupom] = useState('');

  const imagens = imagensCarrosselHome.filter(img => !img.ehVideo);
  const noites = calcularNoites(datas.checkin, datas.checkout);
  const subtotal = noites * DIARIA;
  
  let desconto = 0;
  if (cupomAplicado) {
    if (cupomAplicado.codigo === 'RECANTO10') desconto = (subtotal + TAXA_LIMPEZA) * 0.10;
    else if (cupomAplicado.codigo === 'PRIMEIRA15') desconto = (subtotal + TAXA_LIMPEZA) * 0.15;
    else if (cupomAplicado.codigo === 'FIDELIDADE5') desconto = 50;
  }
  
  const total = noites > 0 ? (subtotal + TAXA_LIMPEZA) - desconto : 0;

  function aplicarCupom() {
    setErroCupom('');
    if (!cupomInput.trim()) return;
    
    try {
      const cuponsStr = localStorage.getItem('recanto_cupons_cliente');
      const cupons = cuponsStr ? JSON.parse(cuponsStr) : [];
      const cupomEncontrado = cupons.find(c => c.codigo.toUpperCase() === cupomInput.toUpperCase().trim());
      
      if (!cupomEncontrado) {
        setErroCupom('Cupom inválido.');
        setCupomAplicado(null);
        return;
      }
      if (!cupomEncontrado.ativo) {
        setErroCupom('Este cupom expirou ou não está mais ativo.');
        setCupomAplicado(null);
        return;
      }
      if (cupomEncontrado.usado) {
        setErroCupom('Este cupom já foi utilizado.');
        setCupomAplicado(null);
        return;
      }
      
      setCupomAplicado(cupomEncontrado);
      setCupomInput('');
    } catch {
      setErroCupom('Erro ao validar cupom.');
    }
  }

  function removerCupom() {
    setCupomAplicado(null);
    setErroCupom('');
  }

  function abrirFoto(indice) {
    setFotoAtiva(indice);
    setModalFotoAberta(true);
  }

  function handleData(e) {
    const { name, value } = e.target;
    setDatas(d => ({ ...d, [name]: value }));
    setErros(er => ({ ...er, [name]: undefined, conflito: undefined }));
  }

  function handleCalendarChange(range) {
    if (Array.isArray(range) && range.length === 2) {
      const start = range[0];
      const end = range[1];
      
      const checkinStr = start.toISOString().split('T')[0];
      const checkoutStr = end.toISOString().split('T')[0];
      
      setDatas({ checkin: checkinStr, checkout: checkoutStr });
      setErros(er => ({ ...er, checkin: undefined, checkout: undefined, conflito: undefined }));
      setMostrarCalendario(false);
    }
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
    if (!hospedes || hospedes < 1 || hospedes > 8) {
      errosNovos.hospedes = 'Informe um número válido de hóspedes (1 a 8).';
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
      
      // Marcar cupom como usado se for o caso
      if (cupomAplicado) {
        const cuponsStr = localStorage.getItem('recanto_cupons_cliente');
        if (cuponsStr) {
          const cupons = JSON.parse(cuponsStr);
          const idx = cupons.findIndex(c => c.codigo === cupomAplicado.codigo);
          if (idx !== -1) {
            cupons[idx].usado = true;
            localStorage.setItem('recanto_cupons_cliente', JSON.stringify(cupons));
          }
        }
      }
      
      navigate('/ReservaConcluida/' + reserva.id);
    } catch {
      setErros({ geral: 'Erro ao salvar reserva. Tente novamente.' });
    }
  }


  return (
    <div className="reserva-page">
      <Container className="reserva-conteudo py-5">

        <div className="reserva-header-info mb-4">
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

        {/* ── HERO ROW: galeria + widget ── */}
        <Row className="g-4 reserva-hero-row align-items-start">

          {/* Col esquerda: galeria */}
          <Col lg={7}>
            <GaleriaFotos imagens={imagens} onAbrirFoto={abrirFoto} />
          </Col>

          {/* Col direita: título + widget de reserva */}
          <Col lg={5}>

            <div className="reserva-widget-sticky">
              <div className="reserva-widget shadow-lg bg-white p-4">

                <div className="mb-3">
                  <span className="fs-3 fw-bold text-azul">{formatarMoeda(DIARIA)}</span>
                  <span className="text-muted"> / noite</span>
                </div>

                <div className="position-relative">
                  <div className="reserva-datas-grid mb-2">
                    <div 
                      className={`reserva-data-campo${erros.checkin ? ' is-invalid' : ''}`}
                      onClick={() => setMostrarCalendario(!mostrarCalendario)}
                      style={{ cursor: 'pointer' }}
                    >
                      <label>CHECK-IN</label>
                      <div className="fw-semibold text-azul mt-1">
                        {datas.checkin ? formatarData(datas.checkin) : 'Selecionar'}
                      </div>
                    </div>
                    <div 
                      className={`reserva-data-campo${erros.checkout ? ' is-invalid' : ''}`}
                      onClick={() => setMostrarCalendario(!mostrarCalendario)}
                      style={{ cursor: 'pointer' }}
                    >
                      <label>CHECK-OUT</label>
                      <div className="fw-semibold text-azul mt-1">
                        {datas.checkout ? formatarData(datas.checkout) : 'Selecionar'}
                      </div>
                    </div>
                  </div>

                  {mostrarCalendario && (
                    <div 
                      className="position-absolute shadow-lg bg-white" 
                      style={{ top: '100%', left: '50%', transform: 'translateX(-50%)', zIndex: 10, padding: '1rem', borderRadius: '16px', marginTop: '10px', width: '100%', minWidth: '340px' }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-bold text-azul fs-5">Selecione as datas</span>
                        <button 
                          type="button" 
                          className="btn-close" 
                          onClick={() => setMostrarCalendario(false)} 
                        />
                      </div>
                      <CalendarioCustom
                        onChange={handleCalendarChange}
                        valor={(datas.checkin && datas.checkout) ? [new Date(datas.checkin + 'T12:00:00'), new Date(datas.checkout + 'T12:00:00')] : null}
                      />
                    </div>
                  )}
                </div>

                <div className="reserva-hospedes-container mb-3">
                  <label className="small fw-bold text-azul mb-1">HÓSPEDES</label>
                  <select 
                    className={`form-select ${erros.hospedes ? 'is-invalid' : ''}`}
                    value={hospedes}
                    onChange={(e) => {
                      setHospedes(e.target.value);
                      setErros(er => ({ ...er, hospedes: undefined }));
                    }}
                    style={{ borderRadius: '8px', cursor: 'pointer', padding: '0.6rem 1rem' }}
                  >
                    <option value="">Quantidade de pessoas</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>{num} {num === 1 ? 'hóspede' : 'hóspedes'}</option>
                    ))}
                  </select>
                  {erros.hospedes && (
                    <div className="invalid-feedback d-block small">
                      <i className="bi bi-exclamation-circle me-1" />
                      {erros.hospedes}
                    </div>
                  )}
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
                    {cupomAplicado && (
                      <div className="d-flex justify-content-between mb-3 text-success">
                        <span>Desconto ({cupomAplicado.codigo})</span>
                        <span>-{formatarMoeda(desconto)}</span>
                      </div>
                    )}
                    <hr className="my-2" />
                    <div className="d-flex justify-content-between fw-bold fs-5">
                      <span>Total</span>
                      <span className="text-orange">{formatarMoeda(total)}</span>
                    </div>
                  </div>
                )}

                {autenticado && noites > 0 && (
                  <div className="mb-4">
                    {cupomAplicado ? (
                      <div className="d-flex align-items-center justify-content-between p-2 rounded" style={{ backgroundColor: '#e8f5e9', border: '1px dashed #4caf50' }}>
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-tag-fill text-success" />
                          <span className="text-success fw-bold">{cupomAplicado.codigo}</span>
                        </div>
                        <button type="button" className="btn btn-link text-danger p-0 m-0 text-decoration-none" onClick={removerCupom}>
                          Remover
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="d-flex gap-2">
                          <Form.Control
                            type="text"
                            placeholder="Cupom de desconto"
                            value={cupomInput}
                            onChange={(e) => setCupomInput(e.target.value)}
                            style={{ textTransform: 'uppercase' }}
                          />
                          <Button variant="outline-secondary" onClick={aplicarCupom}>Aplicar</Button>
                        </div>
                        {erroCupom && <div className="text-danger small mt-1"><i className="bi bi-exclamation-circle me-1" />{erroCupom}</div>}
                      </>
                    )}
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
            </div>
          </Col>
        </Row>

        {/* ── SEÇÃO SOBRE + MAPA ── */}
        <section className="reserva-secao-sobre mt-1 pt-2">
          <hr className="reserva-divisor mb-4" />
          <Row className="g-4">
            <Col lg={6}>
              <h2 className="reserva-subtitulo fs-4 mb-3">Sobre o Recanto Camargo</h2>
              <p className="text-muted" style={{ lineHeight: '1.75', fontSize: '0.95rem' }}>
                Casa aconchegante com 2 quartos, localizada no bairro Ponte Alta, a apenas 5 minutos
                a pé do Santuário Nacional de Aparecida. Ideal para famílias e grupos de peregrinos
                que buscam conforto, privacidade e uma estadia tranquila na cidade da Padroeira do Brasil.
              </p>
              <p className="text-muted" style={{ lineHeight: '1.75', fontSize: '0.95rem' }}>
                A casa conta com cozinha completa, churrasqueira, Wi-Fi, Smart TVs, garagem e enxoval
                incluso. Os anfitriões Rafael e dona Sônia estão sempre disponíveis para garantir a
                melhor experiência possível.
              </p>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="reserva-link-local d-inline-flex align-items-center gap-1 mt-2"
              >
                <i className="bi bi-geo-alt-fill" />
                Ver no Google Maps
              </a>
            </Col>
            <Col lg={6}>
              <h4 className="reserva-subtitulo mb-2">Localização</h4>
              <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                Ponte Alta, Aparecida - SP &mdash; 5 min do Santuário Nacional
              </p>
              <div className="reserva-mapa-container">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1279.723618367829!2d-45.23822072662757!3d-22.84648000473076!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ccc3d5a125211b%3A0x240324a5c110d090!2sRecanto%20Camargo!5e0!3m2!1sen!2sbr!4v1774143793114!5m2!1sen!2sbr"
                  width="100%"
                  height="100%"
                  style={{ border: 0, borderRadius: '16px' }}
                  allowFullScreen=""
                  loading="lazy"
                  title="Localização Recanto Camargo"
                />
              </div>
            </Col>
          </Row>
        </section>

        {/* ── SEÇÃO COMODIDADES ── */}
        <section className="reserva-secao-comodidades">
          <hr className="reserva-divisor mb-4" />
          <h2 className="reserva-subtitulo fs-4 mb-4">O que este lugar oferece</h2>
          <Row className="g-3">
            {comodidades.map(c => (
              <Col key={c.id} xs={6} md={4} lg={3}>
                <div className="reserva-comodidade">
                  <i className={`bi ${c.icone}`} />
                  <span>{c.titulo}</span>
                </div>
              </Col>
            ))}
          </Row>
        </section>

        {/* ── SEÇÃO AVALIAÇÕES ── */}
        <section className="reserva-secao-avaliacoes mt-5 pt-4">
          <hr className="reserva-divisor mb-4" />
          <div className="d-flex align-items-center gap-2 mb-4">
            <i className="bi bi-star-fill text-orange fs-5" />
            <h2 className="reserva-subtitulo mb-0 fs-4">4,98 &middot; 9 avaliações</h2>
          </div>
          <Row className="g-3">
            {depoimentos.slice(0, 6).map(dep => (
              <Col key={dep.id} md={6} lg={4}>
                <div className="reserva-card-depoimento h-100">
                  <div className="mb-2">
                    <Estrelas total={dep.estrelas} />
                  </div>
                  <p className="reserva-texto-depoimento mb-3">{dep.texto}</p>
                  <div className="d-flex align-items-center gap-2 mt-auto">
                    <div className="reserva-avatar">{dep.nome.charAt(0)}</div>
                    <div>
                      <div className="fw-bold small text-azul">{dep.nome}</div>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>{dep.local}</div>
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </section>

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
            key={imagens[fotoAtiva]?.src}
            src={imagens[fotoAtiva]?.src}
            alt={imagens[fotoAtiva]?.alt}
            className="reserva-modal-img"
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
