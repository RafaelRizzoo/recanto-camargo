/**
 * DashboardCliente.jsx
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Row, Col, Card, Modal, Button, Alert } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAutenticacao } from '../hooks/useAutenticacao';
import './DashboardCliente.css';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const RESERVAS_CLIENTE_MOCK = [
  {
    id: 'RC001',
    imovel: 'Recanto Camargo',
    localizacao: 'Aparecida - SP',
    checkin: '2026-05-20',
    checkout: '2026-05-24',
    hospedes: 4,
    valorTotal: 1080.00,
    valorDiaria: 270.00,
    status: 'aprovada',
    criadaEm: '2026-04-20',
    observacao: 'Preciso de berço para bebê de 8 meses.',
    formaPagamento: 'PIX',
    avaliacao: null,
  },
  {
    id: 'RC002',
    imovel: 'Recanto Camargo',
    localizacao: 'Aparecida - SP',
    checkin: '2026-06-10',
    checkout: '2026-06-14',
    hospedes: 2,
    valorTotal: 1080.00,
    valorDiaria: 270.00,
    status: 'pendente',
    criadaEm: '2026-04-25',
    observacao: 'Viagem de aniversário.',
    formaPagamento: 'Cartão de Crédito',
    avaliacao: null,
  },
  {
    id: 'RC003',
    imovel: 'Recanto Camargo',
    localizacao: 'Aparecida - SP',
    checkin: '2026-03-10',
    checkout: '2026-03-13',
    hospedes: 3,
    valorTotal: 810.00,
    valorDiaria: 270.00,
    status: 'concluida',
    criadaEm: '2026-02-15',
    observacao: '',
    formaPagamento: 'PIX',
    avaliacao: {
      nota: 5,
      comentario: 'Lugar maravilhoso! Voltaremos com certeza.',
      data: '2026-03-15',
    },
  },
  {
    id: 'RC004',
    imovel: 'Recanto Camargo',
    localizacao: 'Aparecida - SP',
    checkin: '2026-01-05',
    checkout: '2026-01-08',
    hospedes: 5,
    valorTotal: 810.00,
    valorDiaria: 270.00,
    status: 'concluida',
    criadaEm: '2025-12-10',
    observacao: 'Levarei meu pet.',
    formaPagamento: 'PIX',
    avaliacao: null,
  },
];

const CUPONS_MOCK = [
  {
    id: 'CUP001',
    codigo: 'RECANTO10',
    descricao: '10% de desconto na próxima reserva',
    validoAte: '2026-12-31',
    usado: false,
    ativo: true,
    icone: '🎁',
  },
  {
    id: 'CUP002',
    codigo: 'PRIMEIRA15',
    descricao: '15% na primeira reserva direta',
    validoAte: '2026-06-30',
    usado: false,
    ativo: true,
    icone: '⭐',
  },
  {
    id: 'CUP003',
    codigo: 'FIDELIDADE5',
    descricao: 'R$ 50 de desconto — cliente fiel',
    validoAte: '2026-03-01',
    usado: false,
    ativo: false,
    icone: '🏆',
  },
];

const CHAVE_RESERVAS_CLIENTE = 'recanto_reservas_cliente';
const CHAVE_CUPONS           = 'recanto_cupons_cliente';

function inicializarDados() {
  try {
    const res = localStorage.getItem(CHAVE_RESERVAS_CLIENTE);
    if (!res) localStorage.setItem(CHAVE_RESERVAS_CLIENTE, JSON.stringify(RESERVAS_CLIENTE_MOCK));

    const cup = localStorage.getItem(CHAVE_CUPONS);
    if (!cup) localStorage.setItem(CHAVE_CUPONS, JSON.stringify(CUPONS_MOCK));

    return {
      reservas: res ? JSON.parse(res) : RESERVAS_CLIENTE_MOCK,
      cupons:   cup ? JSON.parse(cup) : CUPONS_MOCK,
    };
  } catch {
    return { reservas: RESERVAS_CLIENTE_MOCK, cupons: CUPONS_MOCK };
  }
}

// ─── Utilitários ──────────────────────────────────────────────────────────────
const fmtData = (s) => {
  if (!s) return '—';
  const [a, m, d] = s.split('-');
  return `${d}/${m}/${a}`;
};

const fmtMoeda = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const calcNoites = (ci, co) =>
  Math.round((new Date(co + 'T00:00:00') - new Date(ci + 'T00:00:00')) / 86400000);

const diasAteCheckin = (ci) =>
  Math.round((new Date(ci + 'T00:00:00') - new Date()) / 86400000);

const podeCancelar = (ci) => diasAteCheckin(ci) > 7;

const STATUS_CFG = {
  pendente:  { label: 'Pendente',   bg: '#fff3cd', cor: '#856404', icone: 'bi-hourglass-split' },
  aprovada:  { label: 'Aprovada',   bg: '#d1fae5', cor: '#0f5132', icone: 'bi-check-circle'    },
  cancelada: { label: 'Cancelada',  bg: '#f8d7da', cor: '#842029', icone: 'bi-x-circle'        },
  concluida: { label: 'Concluída',  bg: '#e0e7ff', cor: '#3730a3', icone: 'bi-award'           },
  recusada:  { label: 'Recusada',   bg: '#f8d7da', cor: '#842029', icone: 'bi-x-circle'        },
};

// ─── Ícones SVG ───────────────────────────────────────────────────────────────
const Ico = {
  Dash:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Reservas: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01"/></svg>,
  Estrela:  () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Cupom:    () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Voltar:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Config:   () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Sair:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Menu:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Whats:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.215a.75.75 0 0 0 .912.912l5.344-1.47A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.658-.523-5.172-1.432l-.372-.222-3.863 1.063 1.064-3.868-.228-.377A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>,
};

// ─── Subcomponentes ───────────────────────────────────────────────────────────
function BadgeStatus({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.pendente;
  return (
    <span className="cli-badge-status" style={{ background: c.bg, color: c.cor }}>
      <i className={`bi ${c.icone} me-1`}></i>{c.label}
    </span>
  );
}
BadgeStatus.propTypes = { status: PropTypes.string.isRequired };

function Estrelas({ nota, interativa = false, onSelecionar }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="cli-estrelas">
      {[1, 2, 3, 4, 5].map(n => (
        <i
          key={n}
          className={`bi ${(interativa ? (hover || nota) : nota) >= n ? 'bi-star-fill' : 'bi-star'}`}
          style={{ color: '#f59e0b', cursor: interativa ? 'pointer' : 'default', fontSize: '1.1rem' }}
          onClick={() => interativa && onSelecionar?.(n)}
          onMouseEnter={() => interativa && setHover(n)}
          onMouseLeave={() => interativa && setHover(0)}
        />
      ))}
    </div>
  );
}
Estrelas.propTypes = {
  nota: PropTypes.number.isRequired,
  interativa: PropTypes.bool,
  onSelecionar: PropTypes.func,
};

// ─── Modal Detalhe da Reserva ─────────────────────────────────────────────────
function ModalDetalheReserva({ reserva, aoFechar }) {
  if (!reserva) return null;
  const n = calcNoites(reserva.checkin, reserva.checkout);
  return (
    <Modal show onHide={aoFechar} centered size="lg" className="cli-modal">
      <Modal.Header closeButton className="cli-modal-header">
        <Modal.Title>Reserva #{reserva.id}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Row className="g-4">
          <Col xs={12}>
            <div className="cli-modal-imovel">
              <div className="cli-modal-imovel-img">
                <i className="bi bi-house-heart"></i>
              </div>
              <div>
                <div className="fw-bold" style={{ fontSize: '1.1rem', color: '#223a5e' }}>{reserva.imovel}</div>
                <div className="text-muted small"><i className="bi bi-geo-alt me-1"></i>{reserva.localizacao}</div>
                <BadgeStatus status={reserva.status} />
              </div>
            </div>
          </Col>
          <Col md={6}>
            <p className="cli-label-secao">Período</p>
            <div className="d-flex gap-3 flex-wrap">
              {[['Check-in', fmtData(reserva.checkin)], ['Check-out', fmtData(reserva.checkout)], ['Noites', n]].map(([l, v]) => (
                <div key={l} className="cli-bloco-dado">
                  <div className="cli-bloco-label">{l}</div>
                  <div className="cli-bloco-valor">{v}</div>
                </div>
              ))}
            </div>
          </Col>
          <Col md={6}>
            <p className="cli-label-secao">Valores</p>
            <div className="d-flex gap-3 flex-wrap">
              <div className="cli-bloco-dado">
                <div className="cli-bloco-label">Diária</div>
                <div className="cli-bloco-valor">{fmtMoeda(reserva.valorDiaria)}</div>
              </div>
              <div className="cli-bloco-dado" style={{ background: '#f0fdf4' }}>
                <div className="cli-bloco-label">Total</div>
                <div className="cli-bloco-valor fw-bold" style={{ color: '#16a34a' }}>{fmtMoeda(reserva.valorTotal)}</div>
              </div>
            </div>
          </Col>
          <Col md={6}>
            <p className="cli-label-secao">Hóspedes & Pagamento</p>
            <div className="d-flex gap-3">
              <div className="cli-bloco-dado">
                <div className="cli-bloco-label">Pessoas</div>
                <div className="cli-bloco-valor">{reserva.hospedes}</div>
              </div>
              <div className="cli-bloco-dado">
                <div className="cli-bloco-label">Pagamento</div>
                <div className="cli-bloco-valor" style={{ fontSize: '0.82rem' }}>{reserva.formaPagamento}</div>
              </div>
            </div>
          </Col>
          <Col md={6}>
            <p className="cli-label-secao">Solicitada em</p>
            <div className="cli-bloco-dado" style={{ display: 'inline-block' }}>
              <div className="cli-bloco-valor">{fmtData(reserva.criadaEm)}</div>
            </div>
          </Col>
          {reserva.observacao && (
            <Col xs={12}>
              <p className="cli-label-secao">Suas Observações</p>
              <div className="cli-obs-box">{reserva.observacao}</div>
            </Col>
          )}
        </Row>
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0">
        <a
          href={`https://wa.me/5512996297452?text=Olá! Tenho uma dúvida sobre minha reserva ${reserva.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="cli-btn-whats"
        >
          <Ico.Whats /> Falar com o Proprietário
        </a>
        <Button variant="outline-secondary" style={{ borderRadius: '50px' }} onClick={aoFechar}>Fechar</Button>
      </Modal.Footer>
    </Modal>
  );
}
ModalDetalheReserva.propTypes = {
  reserva: PropTypes.object,
  aoFechar: PropTypes.func.isRequired,
};

// ─── Modal Cancelar Reserva ───────────────────────────────────────────────────
function ModalCancelar({ reserva, aoFechar, aoConfirmar }) {
  const [motivo, setMotivo] = useState('');
  if (!reserva) return null;
  return (
    <Modal show onHide={aoFechar} centered className="cli-modal">
      <Modal.Header closeButton className="cli-modal-header-danger">
        <Modal.Title>Cancelar Reserva #{reserva.id}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <div className="cli-aviso-cancelar mb-3">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          Tem certeza que deseja cancelar? Conforme nossa política, cancelamentos são aceitos até 7 dias antes do check-in.
        </div>
        <label className="label-config mb-2 d-block">Motivo (opcional)</label>
        <textarea
          className="form-controle-config w-100"
          rows={3}
          placeholder="Nos conte o motivo do cancelamento..."
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          style={{ borderRadius: '12px', padding: '0.75rem', border: '1px solid #e2e8f0', resize: 'vertical' }}
        />
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0 gap-2">
        <Button variant="outline-secondary" style={{ borderRadius: '50px' }} onClick={aoFechar}>Voltar</Button>
        <Button variant="danger" style={{ borderRadius: '50px', padding: '0.55rem 1.5rem' }} onClick={() => aoConfirmar(reserva.id, motivo)}>
          <i className="bi bi-x-circle me-2"></i>Confirmar Cancelamento
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
ModalCancelar.propTypes = {
  reserva: PropTypes.object,
  aoFechar: PropTypes.func.isRequired,
  aoConfirmar: PropTypes.func.isRequired,
};

// ─── Modal Avaliação ──────────────────────────────────────────────────────────
function ModalAvaliar({ reserva, aoFechar, aoEnviar }) {
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  if (!reserva) return null;
  return (
    <Modal show onHide={aoFechar} centered className="cli-modal">
      <Modal.Header closeButton className="cli-modal-header">
        <Modal.Title>Avaliar Estadia</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <div className="text-center mb-4">
          <div className="cli-modal-imovel-img mx-auto mb-3">
            <i className="bi bi-house-heart"></i>
          </div>
          <div className="fw-bold text-azul">{reserva.imovel}</div>
          <div className="text-muted small">{fmtData(reserva.checkin)} → {fmtData(reserva.checkout)}</div>
        </div>
        <div className="text-center mb-4">
          <p className="fw-semibold mb-2" style={{ color: '#223a5e' }}>Como foi sua estadia?</p>
          <div className="d-flex justify-content-center gap-2" style={{ fontSize: '2rem' }}>
            <Estrelas nota={nota} interativa onSelecionar={setNota} />
          </div>
          <div className="text-muted small mt-1">
            {['', 'Muito ruim', 'Ruim', 'Regular', 'Bom', 'Excelente!'][nota]}
          </div>
        </div>
        <label className="label-config mb-2 d-block">Seu comentário (opcional)</label>
        <textarea
          className="form-controle-config w-100"
          rows={4}
          placeholder="Conte como foi sua experiência no Recanto Camargo..."
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          style={{ borderRadius: '12px', padding: '0.75rem', border: '1px solid #e2e8f0', resize: 'vertical' }}
        />
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0 gap-2">
        <Button variant="outline-secondary" style={{ borderRadius: '50px' }} onClick={aoFechar}>Cancelar</Button>
        <Button
          className="btn-autenticacao btn-inline"
          style={{ minWidth: '160px' }}
          onClick={() => aoEnviar(reserva.id, nota, comentario)}
        >
          <i className="bi bi-send me-2"></i>Enviar Avaliação
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
ModalAvaliar.propTypes = {
  reserva: PropTypes.object,
  aoFechar: PropTypes.func.isRequired,
  aoEnviar: PropTypes.func.isRequired,
};

// ─── Card de Reserva ──────────────────────────────────────────────────────────
function CardReserva({ reserva, onVer, onCancelar, onAvaliar }) {
  const n    = calcNoites(reserva.checkin, reserva.checkout);
  const dias = diasAteCheckin(reserva.checkin);
  const podeCanc = podeCancelar(reserva.checkin) && (reserva.status === 'aprovada' || reserva.status === 'pendente');

  return (
    <div className="cli-card-reserva">
      {/* Imagem placeholder */}
      <div className="cli-card-img">
        <i className="bi bi-house-heart"></i>
        <BadgeStatus status={reserva.status} />
        {reserva.status === 'aprovada' && dias > 0 && dias <= 30 && (
          <div className="cli-card-contagem">
            em {dias} dia{dias > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="cli-card-corpo">
        <div className="cli-card-topo">
          <div>
            <h6 className="cli-card-titulo">{reserva.imovel}</h6>
            <div className="cli-card-local">
              <i className="bi bi-geo-alt me-1"></i>{reserva.localizacao}
            </div>
          </div>
        </div>

        <div className="cli-card-infos">
          <span><i className="bi bi-calendar3 me-1"></i>{fmtData(reserva.checkin)} → {fmtData(reserva.checkout)}</span>
          <span><i className="bi bi-moon me-1"></i>{n} noite{n > 1 ? 's' : ''}</span>
          <span><i className="bi bi-people me-1"></i>{reserva.hospedes} pessoa{reserva.hospedes > 1 ? 's' : ''}</span>
        </div>

        <div className="cli-card-rodape">
          <div>
            <div className="cli-card-valor">{fmtMoeda(reserva.valorTotal)}</div>
            <div className="cli-card-valor-diaria">{fmtMoeda(reserva.valorDiaria)}/noite</div>
          </div>
          <div className="cli-card-acoes">
            <button className="cli-btn-ver" onClick={() => onVer(reserva)}>
              <i className="bi bi-eye me-1"></i>Detalhes
            </button>
            {podeCanc && (
              <button className="cli-btn-cancelar" onClick={() => onCancelar(reserva)}>
                Cancelar
              </button>
            )}
            {reserva.status === 'concluida' && !reserva.avaliacao && (
              <button className="cli-btn-avaliar" onClick={() => onAvaliar(reserva)}>
                <i className="bi bi-star me-1"></i>Avaliar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
CardReserva.propTypes = {
  reserva: PropTypes.object.isRequired,
  onVer: PropTypes.func.isRequired,
  onCancelar: PropTypes.func.isRequired,
  onAvaliar: PropTypes.func.isRequired,
};

// ─── Aba: Visão Geral ─────────────────────────────────────────────────────────
function VisaoGeral({ reservas, cupons, onVerReserva, onIrAba }) {
  const hoje = new Date();
  const proxima = useMemo(() =>
    reservas
      .filter(r => (r.status === 'aprovada' || r.status === 'pendente') && new Date(r.checkin + 'T00:00:00') >= hoje)
      .sort((a, b) => new Date(a.checkin) - new Date(b.checkin))[0]
  , [reservas]);

  const totalAvaliacoes  = reservas.filter(r => r.avaliacao).length;
  // const cuponsDisponiveis = cupons.filter(c => c.ativo && !c.usado).length;
  const diasProxima = proxima ? diasAteCheckin(proxima.checkin) : null;

  return (
    <>
      <p className="dash-section-label">Resumo da Conta</p>
      <Row className="g-3 mb-4">
        <Col xs={12} md={6} xl={4}>
          <div className={`cli-card-resumo destaque ${!proxima ? 'vazio' : ''}`}>
            <div className="cli-card-resumo-icone" style={{ background: '#f0f7ff', color: '#3b6399' }}>
              <i className="bi bi-calendar-heart fs-4"></i>
            </div>
            <div className="cli-card-resumo-valor">{proxima ? `${diasProxima}d` : '—'}</div>
            <div className="cli-card-resumo-titulo">Próxima Estadia</div>
            <div className="cli-card-resumo-sub">
              {proxima ? `${fmtData(proxima.checkin)} → ${fmtData(proxima.checkout)}` : 'Nenhuma agendada'}
            </div>
          </div>
        </Col>
        <Col xs={6} md={6} xl={4}>
          <div className="cli-card-resumo">
            <div className="cli-card-resumo-icone" style={{ background: '#d1fae5', color: '#065f46' }}>
              <i className="bi bi-house-check fs-4"></i>
            </div>
            <div className="cli-card-resumo-valor">{reservas.length}</div>
            <div className="cli-card-resumo-titulo">Total de Reservas</div>
            <div className="cli-card-resumo-sub">{reservas.filter(r => r.status === 'concluida').length} concluída(s)</div>
          </div>
        </Col>
        <Col xs={6} md={6} xl={4}>
          <div className="cli-card-resumo">
            <div className="cli-card-resumo-icone" style={{ background: '#fef3c7', color: '#92400e' }}>
              <i className="bi bi-star-fill fs-4"></i>
            </div>
            <div className="cli-card-resumo-valor">{totalAvaliacoes}</div>
            <div className="cli-card-resumo-titulo">Avaliações Feitas</div>
            <div className="cli-card-resumo-sub">
              {reservas.filter(r => r.status === 'concluida' && !r.avaliacao).length} pendente(s)
            </div>
          </div>
        </Col>
        {/* <Col xs={6} md={6} xl={3}>
          <div className="cli-card-resumo">
            <div className="cli-card-resumo-icone" style={{ background: '#fce7f3', color: '#9d174d' }}>
              <i className="bi bi-tag-fill fs-4"></i>
            </div>
            <div className="cli-card-resumo-valor">{cuponsDisponiveis}</div>
            <div className="cli-card-resumo-titulo">Cupons Disponíveis</div>
            <div className="cli-card-resumo-sub">prontos para usar</div>
          </div>
        </Col> */}
      </Row>

      {proxima ? (
        <>
          <p className="dash-section-label">Sua Próxima Viagem</p>
          <div className="cli-card-proxima-viagem">
            <div className="cli-proxima-img">
              <i className="bi bi-house-heart"></i>
              {diasProxima <= 7 && <div className="cli-proxima-urgente">Em breve!</div>}
            </div>
            <div className="cli-proxima-info">
              <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                <h5 className="mb-0 fw-bold" style={{ color: '#223a5e' }}>{proxima.imovel}</h5>
                <BadgeStatus status={proxima.status} />
              </div>
              <p className="text-muted small mb-3">
                <i className="bi bi-geo-alt me-1"></i>{proxima.localizacao}
              </p>
              <div className="cli-proxima-grid">
                <div><span className="cli-proxima-label">Check-in</span><br/><strong>{fmtData(proxima.checkin)}</strong></div>
                <div><span className="cli-proxima-label">Check-out</span><br/><strong>{fmtData(proxima.checkout)}</strong></div>
                <div><span className="cli-proxima-label">Noites</span><br/><strong>{calcNoites(proxima.checkin, proxima.checkout)}</strong></div>
                <div><span className="cli-proxima-label">Hóspedes</span><br/><strong>{proxima.hospedes}</strong></div>
              </div>
              <div className="cli-proxima-rodape">
                <div>
                  <span className="cli-proxima-label">Total pago</span>
                  <div className="cli-proxima-valor">{fmtMoeda(proxima.valorTotal)}</div>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <button className="cli-btn-ver" onClick={() => onVerReserva(proxima)}>
                    <i className="bi bi-eye me-1"></i>Ver Detalhes
                  </button>
                  <a
                    href="https://wa.me/5512996297452"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cli-btn-whats-sm"
                  >
                    <Ico.Whats /> WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="cli-estado-vazio">
          <i className="bi bi-house-slash"></i>
          <h5>Nenhuma reserva ativa</h5>
          <p className="text-muted">Que tal planejar sua próxima visita ao Recanto Camargo?</p>
          <Link to="/Reserva" className="cli-btn-ver">
            <i className="bi bi-calendar-plus me-2"></i>Fazer uma Reserva
          </Link>
        </div>
      )}

      {reservas.filter(r => r.status === 'concluida' && !r.avaliacao).length > 0 && (
        <div
          className="cli-alerta-soft mt-4"
          role="button"
          onClick={() => onIrAba('avaliacoes')}
        >
          <i className="bi bi-star me-2"></i>
          Você tem {reservas.filter(r => r.status === 'concluida' && !r.avaliacao).length} avaliação(ões) pendente(s).
          <span className="ms-2" style={{ textDecoration: 'underline' }}>Avaliar agora →</span>
        </div>
      )}
    </>
  );
}
VisaoGeral.propTypes = {
  reservas: PropTypes.array.isRequired,
  cupons: PropTypes.array.isRequired,
  onVerReserva: PropTypes.func.isRequired,
  onIrAba: PropTypes.func.isRequired,
};

// ─── Aba: Minhas Reservas ─────────────────────────────────────────────────────
function MinhasReservas({ reservas, onVer, onCancelar, onAvaliar }) {
  const [filtro, setFiltro] = useState('todas');

  const FILTROS = [
    { id: 'todas',     label: 'Todas'      },
    { id: 'pendente',  label: 'Pendentes'  },
    { id: 'aprovada',  label: 'Confirmadas'},
    { id: 'cancelada', label: 'Canceladas' },
    { id: 'concluida', label: 'Concluídas' },
  ];

  const lista = filtro === 'todas'
    ? reservas
    : reservas.filter(r => r.status === filtro);

  const cnt = (s) => s === 'todas' ? reservas.length : reservas.filter(r => r.status === s).length;

  return (
    <>
      <div className="cli-filtros mb-4">
        {FILTROS.map(f => (
          <button
            key={f.id}
            type="button"
            className={`cli-filtro-btn${filtro === f.id ? ' ativo' : ''}`}
            onClick={() => setFiltro(f.id)}
          >
            {f.label}
            <span className="cli-filtro-count">{cnt(f.id)}</span>
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="cli-estado-vazio">
          <i className="bi bi-calendar-x"></i>
          <h5>Nenhuma reserva encontrada</h5>
          <p className="text-muted">Tente outro filtro ou faça sua primeira reserva.</p>
          <Link to="/Reserva" className="cli-btn-ver">
            <i className="bi bi-calendar-plus me-2"></i>Reservar Agora
          </Link>
        </div>
      ) : (
        <div className="cli-lista-reservas">
          {lista.map(r => (
            <CardReserva
              key={r.id}
              reserva={r}
              onVer={onVer}
              onCancelar={onCancelar}
              onAvaliar={onAvaliar}
            />
          ))}
        </div>
      )}
    </>
  );
}
MinhasReservas.propTypes = {
  reservas: PropTypes.array.isRequired,
  onVer: PropTypes.func.isRequired,
  onCancelar: PropTypes.func.isRequired,
  onAvaliar: PropTypes.func.isRequired,
};

// ─── Aba: Cupons ──────────────────────────────────────────────────────────────
function MeusCupons({ cupons }) {
  const [copiado, setCopiado] = useState(null);
  const hoje = new Date();

  const copiarCodigo = async (codigo) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(codigo);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setCopiado(codigo);
      setTimeout(() => setCopiado(null), 2000);
    }
  };

  const expirado = (validoAte) => new Date(validoAte + 'T23:59:59') < hoje;

  return (
    <>
      <div className="cli-cupons-grid">
        {cupons.map(c => {
          const exp = expirado(c.validoAte);
          const inativo = !c.ativo || exp || c.usado;
          return (
            <div key={c.id} className={`cli-cupom${inativo ? ' inativo' : ''}`}>
              <div className="cli-cupom-topo">
                <span className="cli-cupom-emoji">{c.icone}</span>
                <div className="cli-cupom-status">
                  {c.usado && <span className="cli-cupom-tag usado">Usado</span>}
                  {exp && !c.usado && <span className="cli-cupom-tag expirado">Expirado</span>}
                  {!inativo && <span className="cli-cupom-tag ativo">Ativo</span>}
                </div>
              </div>
              <div className="cli-cupom-descricao">{c.descricao}</div>
              <div className="cli-cupom-codigo">{c.codigo}</div>
              <div className="cli-cupom-validade">
                <i className="bi bi-calendar-event me-1"></i>
                Válido até {fmtData(c.validoAte)}
              </div>
              <button
                className={`cli-cupom-btn${inativo ? ' disabled' : ''}`}
                onClick={() => !inativo && copiarCodigo(c.codigo)}
                disabled={inativo}
              >
                {copiado === c.codigo
                  ? <><i className="bi bi-check2 me-1"></i>Copiado!</>
                  : <><i className="bi bi-clipboard me-1"></i>Copiar Código</>
                }
              </button>
            </div>
          );
        })}
      </div>
      <div className="cli-cupons-info mt-4">
        <i className="bi bi-info-circle me-2 text-primary"></i>
        Cupons são aplicados automaticamente ao informar o código na finalização da reserva.
      </div>
    </>
  );
}
MeusCupons.propTypes = { cupons: PropTypes.array.isRequired };

// ─── Aba: Avaliações ──────────────────────────────────────────────────────────
function MinhasAvaliacoes({ reservas, onAvaliar }) {
  const feitas     = reservas.filter(r => r.avaliacao);
  const pendentes  = reservas.filter(r => r.status === 'concluida' && !r.avaliacao);

  return (
    <>
      {pendentes.length > 0 && (
        <>
          <p className="dash-section-label">Avaliações Pendentes</p>
          <div className="cli-lista-pendentes mb-4">
            {pendentes.map(r => (
              <div key={r.id} className="cli-avaliacao-pendente">
                <div className="cli-avaliacao-pendente-img">
                  <i className="bi bi-house-heart"></i>
                </div>
                <div className="flex-grow-1">
                  <div className="fw-semibold" style={{ color: '#223a5e' }}>{r.imovel}</div>
                  <div className="text-muted small">{fmtData(r.checkin)} → {fmtData(r.checkout)}</div>
                </div>
                <button className="cli-btn-avaliar" onClick={() => onAvaliar(r)}>
                  <i className="bi bi-star me-1"></i>Avaliar
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="dash-section-label">Avaliações Enviadas</p>
      {feitas.length === 0 ? (
        <div className="cli-estado-vazio" style={{ padding: '2rem' }}>
          <i className="bi bi-star-half"></i>
          <h5>Nenhuma avaliação ainda</h5>
          <p className="text-muted">Suas avaliações aparecerão aqui após concluir uma estadia.</p>
        </div>
      ) : (
        <div className="cli-lista-avaliacoes">
          {feitas.map(r => (
            <div key={r.id} className="cli-card-avaliacao">
              <div className="cli-avaliacao-header">
                <div className="cli-avaliacao-icone">
                  <i className="bi bi-house-heart"></i>
                </div>
                <div className="flex-grow-1">
                  <div className="fw-bold" style={{ color: '#223a5e' }}>{r.imovel}</div>
                  <div className="text-muted small">{fmtData(r.checkin)} → {fmtData(r.checkout)}</div>
                </div>
                <div className="text-muted small">{fmtData(r.avaliacao.data)}</div>
              </div>
              <div className="mb-2"><Estrelas nota={r.avaliacao.nota} /></div>
              {r.avaliacao.comentario && (
                <p className="cli-avaliacao-texto">"{r.avaliacao.comentario}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
MinhasAvaliacoes.propTypes = {
  reservas: PropTypes.array.isRequired,
  onAvaliar: PropTypes.func.isRequired,
};

// ─── Dashboard Principal ──────────────────────────────────────────────────────
function DashboardCliente() {
  const { usuario, tipo, logout } = useAutenticacao();
  const navigate = useNavigate();

  const [sidebarAberta, setSidebarAberta] = useState(() => window.innerWidth >= 992);
  const [abaAtiva,      setAbaAtiva]      = useState('visao-geral');
  const [reservas,      setReservas]      = useState([]);
  const [cupons,        setCupons]        = useState([]);
  const [feedback,      setFeedback]      = useState({ tipo: '', msg: '' });

  // Modais
  const [modalDetalhe,  setModalDetalhe]  = useState(null);
  const [modalCancelar, setModalCancelar] = useState(null);
  const [modalAvaliar,  setModalAvaliar]  = useState(null);

  // Proteção de rota
  useEffect(() => { if (tipo !== 'hospede') navigate('/'); }, [tipo, navigate]);

  // Responsividade
  useEffect(() => {
    const onResize = () => setSidebarAberta(window.innerWidth >= 992);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Carregar dados
  useEffect(() => {
    const { reservas: r, cupons: c } = inicializarDados();
    setReservas(r);
    setCupons(c);
  }, []);

  const salvarReservas = (novas) => {
    localStorage.setItem(CHAVE_RESERVAS_CLIENTE, JSON.stringify(novas));
    setReservas(novas);
  };

  const fb = (tipo, msg) => {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback({ tipo: '', msg: '' }), 3500);
  };

  // RN02 — Cancelamento
  const confirmarCancelamento = useCallback((id, motivo) => {
    const atualizadas = reservas.map(r =>
      r.id === id ? { ...r, status: 'cancelada', motivoCancelamento: motivo } : r
    );
    salvarReservas(atualizadas);
    setModalCancelar(null);
    fb('sucesso', `Reserva #${id} cancelada com sucesso.`);
  }, [reservas]);

  // Enviar avaliação
  const enviarAvaliacao = useCallback((id, nota, comentario) => {
    const atualizadas = reservas.map(r =>
      r.id === id ? {
        ...r,
        avaliacao: { nota, comentario, data: new Date().toISOString().slice(0, 10) }
      } : r
    );
    salvarReservas(atualizadas);
    setModalAvaliar(null);
    fb('sucesso', 'Avaliação enviada! Obrigado pelo seu feedback.');
  }, [reservas]);

  const irAba = (id) => {
    setAbaAtiva(id);
    if (window.innerWidth < 992) setSidebarAberta(false);
  };

  const abas = [
    { id: 'visao-geral', label: 'Visão Geral',      icone: <Ico.Dash />     },
    { id: 'reservas',    label: 'Minhas Reservas',   icone: <Ico.Reservas /> },
    { id: 'avaliacoes',  label: 'Minhas Avaliações', icone: <Ico.Estrela />  },
    //{ id: 'cupons',      label: 'Meus Cupons',       icone: <Ico.Cupom />    },
  ];

  const renderConteudo = () => {
    switch (abaAtiva) {
      case 'visao-geral':
        return (
          <VisaoGeral
            reservas={reservas}
            cupons={cupons}
            onVerReserva={setModalDetalhe}
            onIrAba={irAba}
          />
        );
      case 'reservas':
        return (
          <>
            <p className="dash-section-label">Histórico de Reservas</p>
            <MinhasReservas
              reservas={reservas}
              onVer={setModalDetalhe}
              onCancelar={setModalCancelar}
              onAvaliar={setModalAvaliar}
            />
          </>
        );
      case 'avaliacoes':
        return (
          <>
            <p className="dash-section-label">Suas Avaliações</p>
            <MinhasAvaliacoes reservas={reservas} onAvaliar={setModalAvaliar} />
          </>
        );
      // case 'cupons':
      //   return (
      //     <>
      //       <p className="dash-section-label">Cupons de Desconto</p>
      //       <MeusCupons cupons={cupons} />
      //     </>
      //   );
      default: return null;
    }
  };

  return (
    <div className="dashboard-cli-shell">
      {sidebarAberta && window.innerWidth < 992 && (
        <div className="sidebar-overlay-cli" onClick={() => setSidebarAberta(false)} />
      )}

      <aside className={`sidebar-cli ${sidebarAberta ? 'aberta' : 'colapsada'}`}>
        <div className="sidebar-cli-topo">
          {/* <button
            className="btn-toggle-sidebar-cli"
            onClick={() => setSidebarAberta(s => !s)}
            aria-label="Toggle menu"
          >
            <Ico.Menu />
          </button> */}
          {sidebarAberta && <span className="sidebar-cli-marca">Minha Área</span>}
        </div>

        {sidebarAberta && (
          <div className="sidebar-cli-perfil">
            <div className="sidebar-cli-avatar">{usuario?.nome?.charAt(0)}</div>
            <div className="sidebar-cli-nome">{usuario?.nome?.split(' ')[0]}</div>
            <div className="sidebar-cli-tipo">🧳 Hóspede</div>
          </div>
        )}

        <nav className="sidebar-cli-nav">
          {abas.map(a => (
            <button
              key={a.id}
              type="button"
              className={`sidebar-cli-item${abaAtiva === a.id ? ' ativo' : ''}`}
              onClick={() => irAba(a.id)}
              title={!sidebarAberta ? a.label : ''}
            >
              <span className="sidebar-cli-icone">{a.icone}</span>
              {sidebarAberta && <span className="sidebar-cli-label">{a.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-cli-rodape">
          <Link to="/" className="sidebar-cli-item sidebar-cli-link" title={!sidebarAberta ? 'Voltar ao site' : ''}>
            <span className="sidebar-cli-icone"><Ico.Voltar /></span>
            {sidebarAberta && <span className="sidebar-cli-label">Voltar ao site</span>}
          </Link>
          <button type="button" className="sidebar-cli-item" onClick={() => navigate('/Configuracoes')} title={!sidebarAberta ? 'Configurações' : ''}>
            <span className="sidebar-cli-icone"><Ico.Config /></span>
            {sidebarAberta && <span className="sidebar-cli-label">Configurações</span>}
          </button>
          <button type="button" className="sidebar-cli-item sair" onClick={() => { logout(); navigate('/'); }} title={!sidebarAberta ? 'Sair' : ''}>
            <span className="sidebar-cli-icone"><Ico.Sair /></span>
            {sidebarAberta && <span className="sidebar-cli-label">Sair</span>}
          </button>
        </div>
      </aside>

      <main className="dashboard-cli-main">
        <div className="topbar-cli">
          <div className="topbar-cli-esq">
            <button
              type="button"
              className="btn-menu-cli me-3"
              onClick={() => setSidebarAberta(s => !s)}
              aria-label="Menu"
            >
              <Ico.Menu />
            </button>
            <div>
              <h4 className="topbar-cli-titulo mb-0">
                {abas.find(a => a.id === abaAtiva)?.label}
              </h4>
              <span className="topbar-cli-sub">Olá, {usuario?.nome?.split(' ')[0]}! 👋</span>
            </div>
          </div>
          {/* <div className="topbar-cli-avatar">{usuario?.nome?.charAt(0)}</div> */}
        </div>

        {feedback.msg && (
          <Alert
            variant={feedback.tipo === 'sucesso' ? 'success' : 'danger'}
            className="alert-cli border-0 shadow-sm mx-4 mt-3"
          >
            <i className={`bi ${feedback.tipo === 'sucesso' ? 'bi-check-circle' : 'bi-x-circle'} me-2`}></i>
            {feedback.msg}
          </Alert>
        )}

        <div className="dashboard-cli-conteudo">{renderConteudo()}</div>
      </main>

      <ModalDetalheReserva reserva={modalDetalhe}  aoFechar={() => setModalDetalhe(null)} />
      <ModalCancelar       reserva={modalCancelar} aoFechar={() => setModalCancelar(null)} aoConfirmar={confirmarCancelamento} />
      <ModalAvaliar        reserva={modalAvaliar}  aoFechar={() => setModalAvaliar(null)}  aoEnviar={enviarAvaliacao} />
    </div>
  );
}

export default DashboardCliente;
