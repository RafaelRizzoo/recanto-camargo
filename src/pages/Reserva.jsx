import { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Card, Alert } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import Botao from '../components/UI/Botao';
import faixada from '../assets/img/comodos/Frente.webp';
import { useAutenticacao } from '../hooks/useAutenticacao';

const DIARIA = 270;
const TAXA_LIMPEZA = 80;
const CHAVE_RESERVAS = 'recanto_camargo_reservas';
const WHATSAPP_NUMERO = '5512996297452';

function calcularNoites(checkin, checkout) {
  if (!checkin || !checkout) return 0;
  const d1 = new Date(checkin);
  const d2 = new Date(checkout);
  const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Reserva() {
  const { usuario } = useAutenticacao();
  const [searchParams] = useSearchParams();

  const hoje = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    telefone: usuario?.telefone || '',
    checkin: searchParams.get('checkin') || '',
    checkout: searchParams.get('checkout') || '',
    observacoes: '',
  });

  const [erros, setErros] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [reservaId, setReservaId] = useState(null);

  useEffect(() => {
    if (usuario) {
      setForm(f => ({
        ...f,
        nome: f.nome || usuario.nome || '',
        email: f.email || usuario.email || '',
        telefone: f.telefone || usuario.telefone || '',
      }));
    }
  }, [usuario]);

  const noites = calcularNoites(form.checkin, form.checkout);
  const subtotal = noites * DIARIA;
  const total = noites > 0 ? subtotal + TAXA_LIMPEZA : 0;

  function validar() {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Informe seu nome completo.';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Informe um e-mail válido.';
    if (!form.telefone.trim()) e.telefone = 'Informe seu telefone.';
    if (!form.checkin) e.checkin = 'Selecione a data de check-in.';
    if (!form.checkout) e.checkout = 'Selecione a data de check-out.';
    if (form.checkin && form.checkout && calcularNoites(form.checkin, form.checkout) <= 0) {
      e.checkout = 'O check-out deve ser depois do check-in.';
    }
    return e;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (erros[name]) setErros(er => ({ ...er, [name]: undefined }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errosValidacao = validar();
    if (Object.keys(errosValidacao).length > 0) {
      setErros(errosValidacao);
      return;
    }

    const reserva = {
      id: Date.now(),
      usuarioId: usuario?.id || null,
      ...form,
      noites,
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
      setReservaId(reserva.id);
      setEnviado(true);
    } catch {
      setErros({ geral: 'Erro ao salvar reserva. Tente novamente.' });
    }
  }

  function gerarLinkWhatsApp() {
    const msg = encodeURIComponent(
      `Olá! Gostaria de confirmar minha reserva no Recanto Camargo.\n\n` +
      `*Nome:* ${form.nome}\n` +
      `*Check-in:* ${form.checkin}\n` +
      `*Check-out:* ${form.checkout}\n` +
      `*Noites:* ${noites}\n` +
      `*Total:* ${formatarMoeda(total)}\n` +
      (form.observacoes ? `*Observações:* ${form.observacoes}` : '')
    );
    return `https://wa.me/${WHATSAPP_NUMERO}?text=${msg}`;
  }

  if (enviado) {
    return (
      <div className="reserva-page py-5">
        <Container>
          <div className="text-center py-5">
            <div className="mb-4" style={{ fontSize: '4rem' }}>🎉</div>
            <h2 className="titulo-secao-azul mb-3">Solicitação Enviada!</h2>
            <p className="text-muted mb-2">
              Sua reserva foi registrada com sucesso (ID: <strong>#{reservaId}</strong>).
            </p>
            <p className="text-muted mb-4">
              Entre em contato pelo WhatsApp para confirmar e combinar o pagamento.
            </p>
            <a
              href={gerarLinkWhatsApp()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success btn-lg px-5 py-3"
              style={{ borderRadius: '10px', fontWeight: 600 }}
            >
              <i className="bi bi-whatsapp me-2"></i>
              Confirmar pelo WhatsApp
            </a>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="reserva-page py-5">
      <Container>
        <h2 className="titulo-secao-azul mb-4">Finalizar sua Reserva</h2>

        <Row className="g-5 mt-4">
          <Col lg={7}>
            <div className="form-reserva-container p-4 shadow-sm bg-white">
              <h4 className="fw-bold mb-4 text-azul">Seus Dados</h4>

              {erros.geral && <Alert variant="danger">{erros.geral}</Alert>}

              <Form onSubmit={handleSubmit} noValidate>
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Label className="fw-bold">Nome Completo</Form.Label>
                    <Form.Control
                      type="text"
                      name="nome"
                      value={form.nome}
                      onChange={handleChange}
                      placeholder="Ex: João Silva"
                      isInvalid={!!erros.nome}
                    />
                    <Form.Control.Feedback type="invalid">{erros.nome}</Form.Control.Feedback>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Label className="fw-bold">WhatsApp / Telefone</Form.Label>
                    <Form.Control
                      type="text"
                      name="telefone"
                      value={form.telefone}
                      onChange={handleChange}
                      placeholder="(12) 99999-9999"
                      isInvalid={!!erros.telefone}
                    />
                    <Form.Control.Feedback type="invalid">{erros.telefone}</Form.Control.Feedback>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">E-mail</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="nome@email.com"
                    isInvalid={!!erros.email}
                  />
                  <Form.Control.Feedback type="invalid">{erros.email}</Form.Control.Feedback>
                </Form.Group>

                <h4 className="fw-bold my-4 text-azul">Informações da Estadia</h4>
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Label className="fw-bold">Check-in</Form.Label>
                    <Form.Control
                      type="date"
                      name="checkin"
                      value={form.checkin}
                      onChange={handleChange}
                      min={hoje}
                      isInvalid={!!erros.checkin}
                    />
                    <Form.Control.Feedback type="invalid">{erros.checkin}</Form.Control.Feedback>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Label className="fw-bold">Check-out</Form.Label>
                    <Form.Control
                      type="date"
                      name="checkout"
                      value={form.checkout}
                      onChange={handleChange}
                      min={form.checkin || hoje}
                      isInvalid={!!erros.checkout}
                    />
                    <Form.Control.Feedback type="invalid">{erros.checkout}</Form.Control.Feedback>
                  </Col>
                </Row>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Observações ou Pedidos Especiais</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="observacoes"
                    value={form.observacoes}
                    onChange={handleChange}
                    placeholder="Ex: Preciso de berço, vou levar um pet..."
                  />
                </Form.Group>

                <Botao larguraTotal variante="warning" tipo="submit" className="py-3 fs-5">
                  Confirmar e Solicitar Reserva
                </Botao>
                <p className="text-muted small text-center mt-3">
                  <i className="bi bi-shield-lock me-2"></i>
                  Seus dados estão seguros conosco.
                </p>
              </Form>
            </div>
          </Col>

          <Col lg={5}>
            <Card className="card-resumo border-0 shadow-lg sticky-top">
              <div className="img-resumo-container">
                <Card.Img
                  variant="top"
                  src={faixada}
                  alt="Fachada do Recanto Camargo"
                  loading="lazy"
                  decoding="async"
                />
                <span className="badge-preco">{formatarMoeda(DIARIA)} / noite</span>
              </div>
              <Card.Body className="p-4">
                <h5 className="fw-bold text-azul">Recanto Camargo</h5>
                <p className="text-muted small mb-3">Ponte Alta, Aparecida - SP</p>

                <hr />

                {noites > 0 ? (
                  <>
                    <div className="d-flex justify-content-between mb-2">
                      <span>{noites} {noites === 1 ? 'Noite' : 'Noites'}</span>
                      <span className="fw-bold">{formatarMoeda(subtotal)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Taxa de Limpeza</span>
                      <span className="fw-bold">{formatarMoeda(TAXA_LIMPEZA)}</span>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="fs-5 fw-bold">Total</span>
                      <span className="fs-4 fw-bold text-orange">{formatarMoeda(total)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted small mb-3">Selecione as datas para ver o cálculo.</p>
                )}

                <div className="beneficios-reserva-direta">
                  <div className="d-flex align-items-center mb-2 small text-muted">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    Cancelamento gratuito até 7 dias
                  </div>
                  <div className="d-flex align-items-center mb-2 small text-muted">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    Sem taxas extras do Airbnb
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Reserva;
