/**
 * DashboardAdministrador.jsx
 * Painel Administrativo do Recanto Camargo - Sprint 2
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Row, Col, Card, Modal, Alert, Button } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import Calendar from 'react-calendar';
import { useAutenticacao } from '../hooks/useAutenticacao';
import Notificacoes from '../components/UI/Notificacoes';
import { API_BASE } from '../utils/api';
import 'react-calendar/dist/Calendar.css';
import './DashboardAdministrador.css';

// ─── Constantes & Utilitários ────────────────────────────────────────────────

const fmtData  = (s) => {
  if (!s) return '—';
  const str = String(s).slice(0, 10);
  const [a, m, d] = str.split('-');
  return (a && m && d) ? `${d}/${m}/${a}` : s;
};

const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const noites   = (ci, co) => {
  if (!ci || !co) return 0;
  return Math.max(1, Math.round((new Date(co + 'T00:00:00') - new Date(ci + 'T00:00:00')) / 86400000));
};

const STATUS_CFG = {
  pendente:  { label: 'Pendente',   bg: '#fff3cd', cor: '#856404' },
  aprovada:  { label: 'Confirmada', bg: '#d1e7dd', cor: '#0f5132' },
  recusada:  { label: 'Recusada',   bg: '#f8d7da', cor: '#842029' },
  cancelada: { label: 'Cancelada',  bg: '#f8d7da', cor: '#842029' },
  concluida: { label: 'Concluída',  bg: '#dbeafe', cor: '#1e40af' },
};

const PUBLICO_CFG = {
  TODOS: {
    label: 'Todos os Hóspedes',
    classeBadge: 'badge-publico-todos',
    icone: 'bi-people-fill',
  },
  PRIMEIRA_RESERVA: {
    label: 'Cliente Novo (1ª Reserva)',
    classeBadge: 'badge-publico-primeira',
    icone: 'bi-person-plus-fill',
  },
  CLIENTE_RETORNANTE: {
    label: 'Cliente Retornante',
    classeBadge: 'badge-publico-retornante',
    icone: 'bi-arrow-repeat',
  },
  CLIENTE_RECORRENTE: {
    label: 'Cliente Recorrente',
    classeBadge: 'badge-publico-recorrente',
    icone: 'bi-award-fill',
  },
  CLIENTE_ESPECIFICO: {
    label: 'Hóspede Específico',
    classeBadge: 'badge-publico-especifico',
    icone: 'bi-person-check-fill',
  },
};

// ─── Ícones SVG Customizados ─────────────────────────────────────────────────
const Ico = {
  Dash:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Reservas: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>,
  Cal:      () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  Cupom:    () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v2"/><path d="M13 11v2"/><path d="M13 17v2"/></svg>,
  Previsao: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Estrela:  () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Config:   () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Voltar:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Sair:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Menu:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Check:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:        () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  WhatsApp: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.78 14.07c-.24.68-1.4 1.26-1.92 1.34-.51.08-1.17.11-3.79-.95-2.24-.91-3.68-3.18-3.79-3.33-.11-.15-.92-1.22-.92-2.33 0-1.11.58-1.65.79-1.88.21-.23.46-.29.61-.29.15 0 .31.01.44.01.14.01.33-.05.51.39.19.46.65 1.58.71 1.7.06.12.1.26.02.42-.08.15-.12.25-.24.39-.12.14-.25.31-.36.42-.12.12-.24.25-.1.5.14.24.62 1.02 1.33 1.65.91.81 1.68 1.06 1.92 1.18.24.12.38.1.52-.06.14-.17.6-.7.76-.94.16-.24.32-.2.53-.12.21.08 1.33.63 1.56.74.23.12.38.18.44.28.06.1.06.6-.18 1.28z"/></svg>,
};

// ─── Subcomponentes Visuais ──────────────────────────────────────────────────
function BadgeStatus({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.pendente;
  return <span className="badge-status-admin" style={{ background: c.bg, color: c.cor }}>{c.label}</span>;
}

function EstrelasAvaliacao({ nota, tamanho = '1rem' }) {
  const valor = Math.min(5, Math.max(0, Number(nota) || 0));
  return (
    <span className="avaliacao-admin-estrelas" role="img" aria-label={`${valor.toLocaleString('pt-BR')} de 5 estrelas`} style={{ fontSize: tamanho }}>
      {[1, 2, 3, 4, 5].map(posicao => {
        const classe = valor >= posicao
          ? 'bi-star-fill'
          : valor >= posicao - 0.5
            ? 'bi-star-half'
            : 'bi-star';
        return <i key={posicao} className={`bi ${classe}`} aria-hidden="true" />;
      })}
    </span>
  );
}

function CardKpiModerno({ icone, titulo, valor, badge, sub, cor = '#3b6399', barraProgresso = null }) {
  return (
    <Card className="card-kpi-moderno border-0 shadow-sm h-100">
      <Card.Body className="p-4 d-flex flex-column justify-content-between">
        <div>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="titulo-kpi-moderno">{titulo}</span>
            <div className="icone-kpi-moderno" style={{ background: `${cor}1a`, color: cor }}>
              {icone}
            </div>
          </div>
          <div className="valor-kpi-moderno">{valor}</div>
        </div>
        <div className="mt-2">
          {barraProgresso !== null && (
            <div className="barra-progresso-kpi mb-2">
              <div
                className="barra-progresso-kpi-fill"
                style={{ width: `${Math.min(100, Math.max(0, barraProgresso))}%`, backgroundColor: cor }}
              />
            </div>
          )}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {badge}
            {sub && <span className="sub-kpi-moderno">{sub}</span>}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

// ─── Gráfico SVG Moderno de Evolução de Faturamento (Últimos 6 Meses) ─────────
function GraficoFaturamentoSVG({ reservas }) {
  const [pontoAtivo, setPontoAtivo] = useState(null);

  const meses = useMemo(() => {
    const hoje = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
      const mesNum = d.getMonth();
      const anoNum = d.getFullYear();
      const label = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');

      const receitaDoMes = reservas
        .filter(r => (r.status === 'aprovada' || r.status === 'concluida'))
        .filter(r => {
          if (!r.checkin) return false;
          const dt = new Date(r.checkin + 'T00:00:00');
          return dt.getMonth() === mesNum && dt.getFullYear() === anoNum;
        })
        .reduce((sum, r) => sum + Number(r.total || r.valorTotal || 0), 0);

      return {
        id: `${anoNum}-${mesNum}`,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        ano: anoNum,
        valor: receitaDoMes,
      };
    });
  }, [reservas]);

  const totalPeriodo = useMemo(() => meses.reduce((a, b) => a + b.valor, 0), [meses]);
  const maxValor = useMemo(() => Math.max(...meses.map(m => m.valor), 2500), [meses]);

  const width = 640;
  const height = 210;
  const padding = { top: 25, right: 35, bottom: 35, left: 65 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const points = useMemo(() => {
    return meses.map((m, index) => {
      const x = padding.left + (index / (meses.length - 1)) * innerWidth;
      const y = padding.top + innerHeight - (m.valor / maxValor) * innerHeight;
      return { x, y, ...m };
    });
  }, [meses, maxValor, innerWidth, innerHeight, padding]);

  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' };
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const controlX = (current.x + next.x) / 2;
      path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }
    const area = `${path} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`;
    return { linePath: path, areaPath: area };
  }, [points, padding, innerHeight]);

  return (
    <div className="card-grafico-svg border-0 shadow-sm p-4 mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="fw-bold mb-0" style={{ color: '#223a5e' }}>
            <i className="bi bi-graph-up me-2 text-primary" />
            Evolução do Faturamento
          </h6>
          <span className="text-muted small">Últimos 6 meses · Receita de estadias confirmadas e concluídas</span>
        </div>
        <div>
          <span className="badge-total-6m">
            Total do período: <strong>{fmtMoeda(totalPeriodo)}</strong>
          </span>
        </div>
      </div>

      <div className="grafico-svg-container position-relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-100" style={{ overflow: 'visible', maxHeight: '220px' }}>
          <defs>
            <linearGradient id="recantoGradienteFaturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff9211" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#3b6399" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#223a5e" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="recantoGradienteLinha" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#223a5e" />
              <stop offset="50%" stopColor="#3b6399" />
              <stop offset="100%" stopColor="#ff9211" />
            </linearGradient>
          </defs>

          {/* Linhas de Grade e Valores Y */}
          {[0, 0.5, 1].map((ratio) => {
            const y = padding.top + innerHeight - ratio * innerHeight;
            const valorY = ratio * maxValor;
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + innerWidth}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeDasharray="4 4"
                  strokeWidth="1.2"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="600"
                >
                  {fmtMoeda(valorY).replace('R$\u00a0', 'R$ ')}
                </text>
              </g>
            );
          })}

          {/* Área preenchida */}
          <path d={areaPath} fill="url(#recantoGradienteFaturamento)" />

          {/* Linha principal com gradiente suave */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#recantoGradienteLinha)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Marcadores Interativos */}
          {points.map((p) => {
            const isAtivo = pontoAtivo?.id === p.id;
            return (
              <g
                key={p.id}
                onMouseEnter={() => setPontoAtivo(p)}
                onMouseLeave={() => setPontoAtivo(null)}
                style={{ cursor: 'pointer' }}
              >
                <text
                  x={p.x}
                  y={padding.top + innerHeight + 20}
                  textAnchor="middle"
                  fill={isAtivo ? '#ff9211' : '#64748b'}
                  fontSize="11"
                  fontWeight={isAtivo ? '700' : '600'}
                >
                  {p.label}
                </text>

                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isAtivo ? 9 : 6.5}
                  fill="#ff9211"
                  fillOpacity={isAtivo ? 0.35 : 0.15}
                  style={{ transition: 'all 0.2s ease' }}
                />

                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isAtivo ? 5 : 4}
                  fill="#ffffff"
                  stroke={isAtivo ? '#ff9211' : '#223a5e'}
                  strokeWidth="2.5"
                  style={{ transition: 'all 0.2s ease' }}
                />
              </g>
            );
          })}
        </svg>

        {pontoAtivo && (
          <div
            className="grafico-tooltip-flutuante shadow-sm"
            style={{
              left: `${(pontoAtivo.x / width) * 100}%`,
              top: `${(pontoAtivo.y / height) * 100 - 15}%`,
            }}
          >
            <strong>{pontoAtivo.label}/{pontoAtivo.ano}:</strong> {fmtMoeda(pontoAtivo.valor)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Card de Próximos Check-ins com Botão Direto de WhatsApp ──────────────────
function CardProximosCheckins({ reservas }) {
  const hoje = useMemo(() => {
    const h = new Date();
    h.setHours(0, 0, 0, 0);
    return h;
  }, []);

  const proximos = useMemo(() => {
    return reservas
      .filter(r => (r.status === 'aprovada' || r.status === 'pendente') && r.checkin)
      .map(r => {
        const dataCi = new Date(r.checkin + 'T00:00:00');
        const diffDias = Math.round((dataCi - hoje) / 86400000);
        return { ...r, diffDias };
      })
      .filter(r => r.diffDias >= 0)
      .sort((a, b) => a.diffDias - b.diffDias)
      .slice(0, 4);
  }, [reservas, hoje]);

  const gerarLinkWhats = (reserva) => {
    const rawTel = String(reserva.telefone || '').replace(/\D/g, '');
    const tel = rawTel.startsWith('55') ? rawTel : `55${rawTel}`;
    const primeiroNome = (reserva.nome || reserva.hospede || 'Hóspede').trim().split(' ')[0];
    const dataCheckin = fmtData(reserva.checkin);
    const texto = `Olá ${primeiroNome}, tudo bem? Aqui é do Recanto Camargo em Aparecida-SP! Estamos preparando tudo com carinho para o seu check-in no dia ${dataCheckin} a partir das 14h. Caso precise de alguma informação ou tenha dúvidas sobre o trajeto, estou à disposição!`;
    return `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
  };

  return (
    <div className="card-checkins-admin border-0 shadow-sm p-4 mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h6 className="fw-bold mb-0" style={{ color: '#223a5e' }}>
            <i className="bi bi-person-check-fill me-2 text-warning" />
            Próximos Check-ins
          </h6>
          <span className="text-muted small">Hóspedes confirmados com chegada nos próximos dias</span>
        </div>
        <span className="badge bg-light text-dark border">
          {proximos.length} agendados
        </span>
      </div>

      {proximos.length === 0 ? (
        <div className="text-center py-4 text-muted">
          <i className="bi bi-calendar-check fs-3 d-block mb-2 opacity-50" />
          <p className="mb-0 small">Nenhum check-in previsto para os próximos dias.</p>
        </div>
      ) : (
        <div className="lista-checkins-wrapper d-flex flex-column gap-3">
          {proximos.map(r => (
            <div key={r.id} className="item-checkin-card p-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-3">
                <div className="avatar-checkin">
                  {(r.nome || r.hospede || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold" style={{ color: '#223a5e' }}>{r.nome || r.hospede}</span>
                    <BadgeStatus status={r.status} />
                  </div>
                  <div className="text-muted small">
                    <i className="bi bi-calendar3 me-1" />
                    {fmtData(r.checkin)} → {fmtData(r.checkout)} ({noites(r.checkin, r.checkout)} noites · {r.hospedes} hóspedes)
                  </div>
                  <div className="small fw-semibold mt-1" style={{ color: r.diffDias === 0 ? '#16a34a' : '#223a5e' }}>
                    {r.diffDias === 0 ? '✨ Entrada Hoje!' : r.diffDias === 1 ? '📅 Entrada Amanhã' : `⏳ Em ${r.diffDias} dias`}
                  </div>
                </div>
              </div>

              <div>
                <a
                  href={gerarLinkWhats(r)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp-checkin"
                  title={`Abrir WhatsApp de ${r.nome || r.hospede}`}
                >
                  <Ico.WhatsApp />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal Detalhe da Reserva ────────────────────────────────────────────────
function ModalReserva({ reserva, aoFechar, aoDecidir }) {
  const [motivo, setMotivo] = useState('');
  const [erroDecisao, setErroDecisao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const envioRef = useRef(false);

  useEffect(() => { setMotivo(''); setErroDecisao(''); }, [reserva?.id]);

  async function decidir(acao) {
    if (envioRef.current) return;
    envioRef.current = true;
    setEnviando(true);
    setErroDecisao('');
    try { await aoDecidir(reserva.id, acao, motivo); }
    catch (erro) { setErroDecisao(erro.message || 'Não foi possível salvar a decisão.'); }
    finally { envioRef.current = false; setEnviando(false); }
  }

  if (!reserva) return null;
  const r = reserva;
  const n = noites(reserva.checkin, reserva.checkout);

  return (
    <Modal show onHide={() => !enviando && aoFechar()} centered size="lg" className="modal-reserva-admin">
      <Modal.Header closeButton className="modal-header-admin">
        <Modal.Title>Reserva #{reserva.id}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {erroDecisao && <Alert variant="danger" role="alert">{erroDecisao}</Alert>}
        <Row className="g-4">
          <Col md={6}>
            <p className="label-secao-modal">Hóspede</p>
            <div className="info-hospede-modal">
              <div className="avatar-hospede-modal">{(r.nome || r.hospede || '?').charAt(0)}</div>
              <div>
                <div className="cli-bloco-valor">{r.nome || r.hospede}</div>
                <div className="text-muted small">{r.email}</div>
                <div className="text-muted small">{r.telefone}</div>
              </div>
            </div>
          </Col>
          <Col md={6}>
            <p className="label-secao-modal">Status</p>
            <BadgeStatus status={r.status} />
            <div className="text-muted small mt-2">Criada em {fmtData(r.criadaEm)}</div>
          </Col>
          <Col md={6}>
            <p className="label-secao-modal">Período</p>
            <div className="d-flex gap-3 flex-wrap">
              {[['Check-in', fmtData(r.checkin)], ['Check-out', fmtData(r.checkout)], ['Noites', n]].map(([l, v]) => (
                <div key={l} className="bloco-data-modal">
                  <div className="label-data-modal">{l}</div>
                  <div className="valor-data-modal">{v}</div>
                </div>
              ))}
            </div>
          </Col>
          <Col md={6}>
            <p className="label-secao-modal">Pessoas & Valor</p>
            <div className="d-flex gap-3">
              <div className="bloco-data-modal"><div className="label-data-modal">Pessoas</div><div className="valor-data-modal">{r.hospedes}</div></div>
              <div className="bloco-data-modal" style={{ background: '#f0fdf4' }}>
                <div className="label-data-modal">Total</div>
                <div className="cli-bloco-valor" style={{ color: '#198754' }}>{fmtMoeda(r.total || r.valorTotal)}</div>
              </div>
            </div>
          </Col>
          {(r.observacoes || r.observacao) && (
            <Col xs={12}>
              <div className="cli-obs-box mb-3">
                <strong><i className="bi bi-chat-text me-2"></i>Observações do Hóspede:</strong>
                <div className="mt-1">{r.observacoes || r.observacao}</div>
              </div>
            </Col>
          )}
          {r.motivoRecusa && (
            <Col xs={12}>
              <p className="label-secao-modal">Motivo da Recusa</p>
              <div className="obs-modal" style={{ background: '#fff1f2', border: '1px solid #fecaca', color: '#9a3412' }}>{reserva.motivoRecusa}</div>
            </Col>
          )}
        </Row>
        {r.status === 'pendente' && (
          <div className="mt-3">
            <label htmlFor="motivo-recusa" className="form-label">Motivo da recusa (opcional)</label>
            <textarea id="motivo-recusa" className="form-control" rows={3} maxLength={250}
              value={motivo} disabled={enviando} onChange={e => setMotivo(e.target.value)} />
          </div>
        )}
      </Modal.Body>
      {r.status === 'pendente' && <Modal.Footer className="gap-2 flex-wrap">
        <Button variant="outline-danger" disabled={enviando} onClick={() => decidir('recusar')}>Recusar reserva</Button>
        <Button variant="success" disabled={enviando} onClick={() => decidir('aprovar')}>
          {enviando ? 'Salvando…' : 'Aprovar reserva'}
        </Button>
      </Modal.Footer>}
      {r.status === 'aprovada' && <Modal.Footer className="gap-2 flex-wrap">
        <Button variant="primary" disabled={enviando} onClick={() => decidir('concluir')}>
          {enviando ? 'Concluindo…' : <><i className="bi bi-check2-circle me-1" /> Concluir Estadia</>}
        </Button>
      </Modal.Footer>}
    </Modal>
  );
}

// ─── Modal Responder Avaliação com Nota Confidencial do Anfitrião ─────────────
function ModalResponderAvaliacao({ avaliacao, aoFechar, aoResponder }) {
  const [notaProprietario, setNotaProprietario] = useState(5);
  const [hoverNota, setHoverNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setNotaProprietario(5);
    setHoverNota(0);
    setComentario('');
    setErro('');
    setEnviando(false);
  }, [avaliacao?.id]);

  if (!avaliacao) return null;

  const comentarioLimpo = comentario.trim();
  const formularioValido = comentarioLimpo.length >= 1 && comentarioLimpo.length <= 255;

  const fechar = () => {
    if (!enviando) aoFechar();
  };

  const enviarResposta = async (evento) => {
    evento.preventDefault();
    if (!formularioValido || enviando) return;

    setEnviando(true);
    setErro('');

    try {
      const resposta = await fetch(`${API_BASE}/api/proprietario/avaliacoes/${avaliacao.id}/responder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nota: Number(notaProprietario),
          Ava_NotaPropietario: Number(notaProprietario),
          comentario: comentarioLimpo,
          resposta: comentarioLimpo,
        }),
      });
      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(dados.error || 'Não foi possível enviar a resposta. Tente novamente.');
      }

      aoResponder(avaliacao.id, dados.respostaProprietario || comentarioLimpo);
    } catch (falha) {
      setErro(falha.message || 'Não foi possível enviar a resposta. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      show
      onHide={fechar}
      centered
      className="modal-reserva-admin"
      backdrop={enviando ? 'static' : true}
      keyboard={!enviando}
    >
      <form onSubmit={enviarResposta}>
        <Modal.Header closeButton={!enviando} className="modal-header-admin">
          <Modal.Title>Responder Avaliação & Avaliar Hóspede</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="avaliacao-modal-contexto mb-3">
            <div className="mini-avatar">{(avaliacao.hospede?.nome || '?').charAt(0)}</div>
            <div>
              <div className="fw-bold" style={{ color: '#223a5e' }}>{avaliacao.hospede?.nome}</div>
              <div className="text-muted small">
                Reserva #{avaliacao.reserva?.id} · {avaliacao.imovel?.nome || 'Recanto Camargo'}
              </div>
            </div>
          </div>

          <div className="avaliacao-original-admin mb-4">
            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
              <EstrelasAvaliacao nota={avaliacao.nota} tamanho="1.15rem" />
              <span className="text-muted small">{fmtData(avaliacao.data)}</span>
            </div>
            <p className="mb-0">“{avaliacao.comentario}”</p>
          </div>

          {/* Nota do Proprietário ao Hóspede com Aviso de Confidencialidade */}
          <div className="mb-3">
            <label className="label-secao-modal d-block mb-1">
              Sua avaliação sobre este hóspede:
            </label>
            <div className="d-flex align-items-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((estrela) => {
                const ativo = (hoverNota || notaProprietario) >= estrela;
                return (
                  <button
                    key={estrela}
                    type="button"
                    className="btn-estrela-picker"
                    onClick={() => setNotaProprietario(estrela)}
                    onMouseEnter={() => setHoverNota(estrela)}
                    onMouseLeave={() => setHoverNota(0)}
                    disabled={enviando}
                    aria-label={`Atribuir ${estrela} estrelas ao hóspede`}
                  >
                    <i
                      className={`bi ${ativo ? 'bi-star-fill text-warning' : 'bi-star text-muted'}`}
                      style={{ fontSize: '1.7rem' }}
                    />
                  </button>
                );
              })}
              <span className="fw-bold ms-2" style={{ color: '#223a5e', fontSize: '1.1rem' }}>
                {(hoverNota || notaProprietario)} / 5 estrelas
              </span>
            </div>

            {/* Aviso Explicativo Obrigatório */}
            <div className="alerta-nota-confidencial mb-3">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-shield-lock-fill text-primary fs-5" />
                <span className="small text-muted">
                  <strong>Esta nota é confidencial</strong> e compõe a reputação interna do hóspede no sistema.
                </span>
              </div>
            </div>
          </div>

          {/* Campo de Resposta Pública */}
          <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
            <label htmlFor="comentario-proprietario" className="label-secao-modal mb-0">
              Resposta Pública ao Hóspede <span className="text-danger">*</span>
            </label>
            <span className={`avaliacao-contador${comentario.length >= 240 ? ' limite' : ''}`}>
              {comentario.length}/255
            </span>
          </div>
          <textarea
            id="comentario-proprietario"
            className="form-control"
            rows={4}
            maxLength={255}
            placeholder="Agradeça a preferência ou envie uma mensagem acolhedora que será exibida publicamente..."
            value={comentario}
            onChange={evento => setComentario(evento.target.value)}
            disabled={enviando}
            required
            style={{ borderRadius: '12px', padding: '0.85rem 1rem', border: '1px solid #cbd5e1', resize: 'vertical' }}
          />

          {erro && (
            <Alert variant="danger" className="border-0 mt-3 mb-0" role="alert">
              <i className="bi bi-exclamation-circle me-2" aria-hidden="true" />{erro}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 gap-2">
          <Button variant="outline-secondary" type="button" onClick={fechar} disabled={enviando} style={{ borderRadius: '50px' }}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={!formularioValido || enviando} className="btn-acao-modal">
            {enviando ? (
              <><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Enviando...</>
            ) : (
              <><i className="bi bi-send me-1" aria-hidden="true" /> Enviar resposta</>
            )}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

// ─── Modal Bloquear Datas (Manutenção / Proprietário) ─────────────────────────
function ModalBloquearDatas({ show, aoFechar, aoSalvar, reservasExistentes = [], bloqueiosExistentes = [] }) {
  const hojeStr = new Date().toISOString().slice(0, 10);
  const [dataInicio, setDataInicio] = useState(hojeStr);
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [motivo, setMotivo] = useState('Manutenção preventiva e reparos gerais');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  // Detecção de Conflitos em Tempo Real
  const conflitoDetectado = useMemo(() => {
    if (!dataInicio || !dataFim || dataInicio >= dataFim) return null;

    // Conflito com reservas
    const reservaConflitante = reservasExistentes.find(r => {
      if (r.status !== 'aprovada' && r.status !== 'pendente') return false;
      return r.checkin < dataFim && r.checkout > dataInicio;
    });

    if (reservaConflitante) {
      return {
        tipo: 'reserva',
        mensagem: `Conflito com Reserva #${reservaConflitante.id} (${fmtData(reservaConflitante.checkin)} a ${fmtData(reservaConflitante.checkout)})`,
      };
    }

    // Conflito com outros bloqueios
    const bloqueioConflitante = bloqueiosExistentes.find(b => {
      return b.dataInicio < dataFim && b.dataFim > dataInicio;
    });

    if (bloqueioConflitante) {
      return {
        tipo: 'bloqueio',
        mensagem: `Conflito com Bloqueio existente (${fmtData(bloqueioConflitante.dataInicio)} a ${fmtData(bloqueioConflitante.dataFim)}): ${bloqueioConflitante.motivo}`,
      };
    }

    return null;
  }, [dataInicio, dataFim, reservasExistentes, bloqueiosExistentes]);

  const submeter = async (e) => {
    e.preventDefault();
    if (!dataInicio || !dataFim || conflitoDetectado || enviando) return;
    setEnviando(true);
    setErro('');

    try {
      await aoSalvar({ dataInicio, dataFim, motivo: motivo.trim() || 'Bloqueio para manutenção' });
      aoFechar();
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar o bloqueio.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal show={show} onHide={aoFechar} centered backdrop={enviando ? 'static' : true}>
      <form onSubmit={submeter}>
        <Modal.Header closeButton={!enviando} className="modal-header-admin">
          <Modal.Title><i className="bi bi-shield-slash me-2" /> Bloquear Datas para Manutenção</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {erro && <Alert variant="danger">{erro}</Alert>}

          <Row className="g-3 mb-3">
            <Col sm={6}>
              <label htmlFor="bloq-inicio" className="form-label fw-semibold small text-muted">Data Início</label>
              <input
                id="bloq-inicio"
                type="date"
                className="form-control"
                value={dataInicio}
                min={hojeStr}
                onChange={e => setDataInicio(e.target.value)}
                required
              />
            </Col>
            <Col sm={6}>
              <label htmlFor="bloq-fim" className="form-label fw-semibold small text-muted">Data Fim</label>
              <input
                id="bloq-fim"
                type="date"
                className="form-control"
                value={dataFim}
                min={dataInicio || hojeStr}
                onChange={e => setDataFim(e.target.value)}
                required
              />
            </Col>
          </Row>

          <div className="mb-3">
            <label htmlFor="bloq-motivo" className="form-label fw-semibold small text-muted">
              Motivo do Bloqueio <span className="fw-normal text-muted">(opcional — apenas para seu controle)</span>
            </label>
            <textarea
              id="bloq-motivo"
              rows={3}
              className="form-control"
              placeholder="Ex.: Conflito com Airbnb, uso pessoal da família, reparos..."
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
            />
            <small className="text-muted d-block mt-1">Este motivo é privado e serve como log interno para sua gestão.</small>
          </div>

          {conflitoDetectado && (
            <Alert variant="warning" className="border-0 shadow-sm d-flex align-items-center gap-2 mb-0">
              <i className="bi bi-exclamation-triangle-fill fs-5 text-warning" />
              <div className="small">
                <strong>Atenção:</strong> {conflitoDetectado.mensagem}. Selecione outro período.
              </div>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={aoFechar} disabled={enviando} style={{ borderRadius: '50px' }}>
            Cancelar
          </Button>
          <Button
            variant="warning"
            type="submit"
            className="fw-bold"
            disabled={!dataInicio || !dataFim || !!conflitoDetectado || enviando}
            style={{ borderRadius: '50px' }}
          >
            {enviando ? 'Bloqueando…' : 'Confirmar Bloqueio'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

// ─── Calendário de Ocupação com 2 Meses Lado a Lado ───────────────────────────
function CalendarioOcupacao({ reservas, bloqueios, aoCriarBloqueio, aoRemoverBloqueio }) {
  const [mesBase, setMesBase] = useState(() => new Date());
  const [showModalBloqueio, setShowModalBloqueio] = useState(false);

  const mesSeguinte = useMemo(() => {
    return new Date(mesBase.getFullYear(), mesBase.getMonth() + 1, 1);
  }, [mesBase]);

  // Mapeamento de reservas para cores do calendário
  const mapaStatus = useMemo(() => reservas.reduce((acc, r) => {
    if (r.status !== 'aprovada' && r.status !== 'pendente') return acc;
    const ini = new Date(r.checkin + 'T00:00:00');
    const fim = new Date(r.checkout + 'T00:00:00');
    for (let d = new Date(ini); d < fim; d = new Date(d.getTime() + 86400000)) {
      const k = d.toISOString().slice(0, 10);
      if (!acc[k] || r.status === 'aprovada') acc[k] = r.status;
    }
    return acc;
  }, {}), [reservas]);

  // Mapeamento de bloqueios para hachura listrada amarela/âmbar
  const mapaBloqueios = useMemo(() => bloqueios.reduce((acc, b) => {
    const ini = new Date(b.dataInicio + 'T00:00:00');
    const fim = new Date(b.dataFim + 'T00:00:00');
    for (let d = new Date(ini); d < fim; d = new Date(d.getTime() + 86400000)) {
      const k = d.toISOString().slice(0, 10);
      acc[k] = b;
    }
    return acc;
  }, {}), [bloqueios]);

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null;
    const k = date.toISOString().slice(0, 10);
    if (mapaBloqueios[k]) return 'dia-bloqueado-manutencao';
    if (mapaStatus[k] === 'aprovada') return 'dia-aprovado';
    if (mapaStatus[k] === 'pendente') return 'dia-pendente';
    return null;
  };

  const mudarMes = (delta) => {
    setMesBase(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <div className="calendario-duplo-wrapper">
      {/* Topo com Ações e Legenda */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h5 className="mb-0 fw-bold" style={{ color: '#223a5e' }}>Calendário de Ocupação & Manutenção</h5>
          <span className="text-muted small">Visualização de 2 meses simultâneos</span>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="d-flex gap-1 me-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              style={{ borderRadius: '50px' }}
              onClick={() => mudarMes(-1)}
              title="Mês Anterior"
            >
              ‹ Anterior
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              style={{ borderRadius: '50px' }}
              onClick={() => setMesBase(new Date())}
              title="Voltar para Hoje"
            >
              Hoje
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              style={{ borderRadius: '50px' }}
              onClick={() => mudarMes(1)}
              title="Próximo Mês"
            >
              Próximo ›
            </button>
          </div>

          <Button
            className="fw-bold d-inline-flex align-items-center gap-1 btn-bloquear-datas-admin"
            style={{ borderRadius: '50px' }}
            onClick={() => setShowModalBloqueio(true)}
          >
            <i className="bi bi-shield-slash" /> + Bloquear Datas
          </Button>
        </div>
      </div>

      {/* Legenda das Cores */}
      <div className="legenda-calendario mb-3 p-2 bg-light rounded-3 d-flex align-items-center gap-3 flex-wrap">
        <span className="legenda-item"><span className="dot dot-aprovada" /> Reserva Confirmada</span>
        <span className="legenda-item"><span className="dot dot-pendente" /> Reserva Pendente</span>
        <span className="legenda-item"><span className="dot dot-bloqueado" /> Bloqueado / Manutenção (Hachura)</span>
      </div>

      {/* Grid de 2 Meses Lado a Lado */}
      <div className="calendario-duplo-grid">
        <div className="calendario-mes-coluna">
          <div className="calendario-mes-titulo">
            {mesBase.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
          <Calendar
            locale="pt-BR"
            activeStartDate={mesBase}
            onActiveStartDateChange={({ activeStartDate }) => setMesBase(activeStartDate || new Date())}
            tileClassName={tileClassName}
            className="calendario-admin-custom w-100"
            showNavigation={false}
          />
        </div>

        <div className="calendario-mes-coluna">
          <div className="calendario-mes-titulo">
            {mesSeguinte.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
          <Calendar
            locale="pt-BR"
            activeStartDate={mesSeguinte}
            tileClassName={tileClassName}
            className="calendario-admin-custom w-100"
            showNavigation={false}
          />
        </div>
      </div>

      {/* Lista de Bloqueios Ativos */}
      <div className="lista-bloqueios-wrapper">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-bold mb-0" style={{ color: '#223a5e' }}>
            <i className="bi bi-cone-striped me-2 text-warning" />
            Bloqueios Ativos para Manutenção ({bloqueios.length})
          </h6>
        </div>

        {bloqueios.length === 0 ? (
          <p className="text-muted small mb-0">Nenhum bloqueio cadastrado. Todas as datas livres estão disponíveis para reservas.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {bloqueios.map(b => (
              <div key={b.id} className="item-bloqueio-card">
                <div className="d-flex align-items-center gap-3">
                  <div className="avatar-checkin" style={{ background: '#f59e0b', width: 36, height: 36, fontSize: '0.9rem' }}>
                    <i className="bi bi-tools" />
                  </div>
                  <div>
                    <div className="fw-bold" style={{ color: '#78350f' }}>{b.motivo}</div>
                    <div className="text-muted small">
                      <i className="bi bi-calendar-event me-1" />
                      {fmtData(b.dataInicio)} até {fmtData(b.dataFim)} ({noites(b.dataInicio, b.dataFim)} noites bloqueadas)
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline-danger"
                  size="sm"
                  style={{ borderRadius: '50px' }}
                  onClick={() => aoRemoverBloqueio(b.id)}
                  title="Remover bloqueio e liberar datas"
                >
                  <i className="bi bi-trash3 me-1" /> Desbloquear
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para Bloquear Datas */}
      <ModalBloquearDatas
        show={showModalBloqueio}
        aoFechar={() => setShowModalBloqueio(false)}
        aoSalvar={aoCriarBloqueio}
        reservasExistentes={reservas}
        bloqueiosExistentes={bloqueios}
      />
    </div>
  );
}

// ─── Modal Criar Novo Cupom ──────────────────────────────────────────────────
function ModalCriarCupom({ show, aoFechar, aoSalvar }) {
  const [codigo, setCodigo] = useState('');
  const [tipo, setTipo] = useState('PERCENTUAL');
  const [valor, setValor] = useState('');
  const [publico, setPublico] = useState('TODOS');
  const [clienteEspecifico, setClienteEspecifico] = useState('');
  const [minimoNoites, setMinimoNoites] = useState(1);
  const [valorMinimo, setValorMinimo] = useState('');
  const [validade, setValidade] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const submeter = async (e) => {
    e.preventDefault();
    if (!codigo.trim() || !valor || !validade || enviando) return;
    setEnviando(true);
    setErro('');

    try {
      await aoSalvar({
        codigo: codigo.trim().toUpperCase(),
        tipo,
        valor: Number(valor),
        publico,
        clienteEspecifico: publico === 'CLIENTE_ESPECIFICO' ? clienteEspecifico.trim() : null,
        minimoNoites: Number(minimoNoites) || 1,
        valorMinimo: Number(valorMinimo) || 0,
        validade,
        ativo: true,
      });
      aoFechar();
    } catch (err) {
      setErro(err.message || 'Erro ao criar cupom.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal show={show} onHide={aoFechar} centered backdrop={enviando ? 'static' : true}>
      <form onSubmit={submeter}>
        <Modal.Header closeButton={!enviando} className="modal-header-admin">
          <Modal.Title><i className="bi bi-tag-fill me-2" /> Criar Novo Cupom de Desconto</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {erro && <Alert variant="danger">{erro}</Alert>}

          <Row className="g-3 mb-3">
            <Col sm={6}>
              <label htmlFor="cupom-codigo" className="form-label fw-semibold small text-muted">Código do Cupom *</label>
              <input
                id="cupom-codigo"
                type="text"
                className="form-control text-uppercase fw-bold"
                placeholder="Ex.: PEREGRINO10"
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                required
              />
            </Col>
            <Col sm={6}>
              <label htmlFor="cupom-tipo" className="form-label fw-semibold small text-muted">Tipo de Desconto *</label>
              <select
                id="cupom-tipo"
                className="form-select"
                value={tipo}
                onChange={e => setTipo(e.target.value)}
              >
                <option value="PERCENTUAL">Percentual (%)</option>
                <option value="FIXO">Valor Fixo (R$)</option>
              </select>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col sm={6}>
              <label htmlFor="cupom-valor" className="form-label fw-semibold small text-muted">
                Valor do Desconto {tipo === 'PERCENTUAL' ? '(%)' : '(R$)'} *
              </label>
              <input
                id="cupom-valor"
                type="number"
                step="any"
                min="1"
                className="form-control"
                placeholder={tipo === 'PERCENTUAL' ? 'Ex.: 10' : 'Ex.: 50'}
                value={valor}
                onChange={e => setValor(e.target.value)}
                required
              />
            </Col>
            <Col sm={6}>
              <label htmlFor="cupom-publico" className="form-label fw-semibold small text-muted">Público-Alvo & Elegibilidade *</label>
              <select
                id="cupom-publico"
                className="form-select"
                value={publico}
                onChange={e => setPublico(e.target.value)}
              >
                <option value="TODOS">🌐 Todos os Clientes (Geral)</option>
                <option value="PRIMEIRA_RESERVA">🎉 Cliente Novo (1ª Reserva)</option>
                <option value="CLIENTE_RETORNANTE">🔄 Cliente Retornante (&gt; 6 meses sem reserva)</option>
                <option value="CLIENTE_RECORRENTE">⭐ Cliente Recorrente (2+ reservas)</option>
                <option value="CLIENTE_ESPECIFICO">🎯 Hóspede Específico (Fidelidade)</option>
              </select>
            </Col>
          </Row>

          {publico === 'CLIENTE_ESPECIFICO' && (
            <div className="mb-3">
              <label htmlFor="cupom-cliente" className="form-label fw-semibold small text-muted">E-mail ou Nome do Hóspede *</label>
              <input
                id="cupom-cliente"
                type="text"
                className="form-control"
                placeholder="Ex.: mariasilva@email.com"
                value={clienteEspecifico}
                onChange={e => setClienteEspecifico(e.target.value)}
                required
              />
            </div>
          )}

          <Row className="g-3 mb-3">
            <Col sm={6}>
              <label htmlFor="cupom-noites" className="form-label fw-semibold small text-muted">Mínimo de Noites</label>
              <input
                id="cupom-noites"
                type="number"
                min="1"
                className="form-control"
                value={minimoNoites}
                onChange={e => setMinimoNoites(e.target.value)}
              />
            </Col>
            <Col sm={6}>
              <label htmlFor="cupom-valormin" className="form-label fw-semibold small text-muted">Valor Mínimo Reserva (R$)</label>
              <input
                id="cupom-valormin"
                type="number"
                step="any"
                min="0"
                className="form-control"
                placeholder="Opcional"
                value={valorMinimo}
                onChange={e => setValorMinimo(e.target.value)}
              />
            </Col>
          </Row>

          <div className="mb-2">
            <label htmlFor="cupom-validade" className="form-label fw-semibold small text-muted">Data de Validade *</label>
            <input
              id="cupom-validade"
              type="date"
              className="form-control"
              value={validade}
              onChange={e => setValidade(e.target.value)}
              required
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={aoFechar} disabled={enviando} style={{ borderRadius: '50px' }}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={enviando} style={{ borderRadius: '50px' }}>
            {enviando ? 'Criando…' : 'Salvar Cupom'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

// ─── Aba de Gestão de Cupons ─────────────────────────────────────────────────
function PainelCupons({ cupons, aoAlternarStatus, aoCriarCupom }) {
  const [copiadoId, setCopiadoId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const copiarCodigo = (codigo, id) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(codigo);
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 2500);
    }
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h5 className="mb-0 fw-bold" style={{ color: '#223a5e' }}>Cupons Promocionais de Desconto</h5>
          <span className="text-muted small">Crie e gerencie vouchers especiais para os peregrinos</span>
        </div>
        <Button
          variant="primary"
          className="d-inline-flex align-items-center gap-2 fw-semibold"
          style={{ borderRadius: '50px', background: '#ff9211', borderColor: '#ff9211' }}
          onClick={() => setShowModal(true)}
        >
          <i className="bi bi-plus-lg" /> + Criar Novo Cupom
        </Button>
      </div>

      {cupons.length === 0 ? (
        <div className="text-center py-5 bg-white rounded-4 shadow-sm border p-4">
          <i className="bi bi-ticket-perforated fs-1 text-muted opacity-50 d-block mb-3" />
          <h5 className="fw-bold" style={{ color: '#223a5e' }}>Nenhum cupom ativo no momento</h5>
          <p className="text-muted small mb-3">Crie um cupom para incentivar reservas de peregrinos e famílias.</p>
          <Button variant="primary" onClick={() => setShowModal(true)} style={{ borderRadius: '50px' }}>
            Criar Primeiro Cupom
          </Button>
        </div>
      ) : (
        <div className="cupons-grid-admin">
          {cupons.map(c => {
            const publicoCfg = PUBLICO_CFG[c.publico] || PUBLICO_CFG.TODOS;
            return (
              <div key={c.id} className={`card-cupom-moderno ${c.ativo ? '' : 'inativo'}`}>
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className={publicoCfg.classeBadge}>
                      <i className={`bi ${publicoCfg.icone} me-1`} />
                      {publicoCfg.label}
                    </span>
                    <span className="badge bg-light text-muted border small">
                      {c.tipo === 'PERCENTUAL' ? 'Desconto %' : 'Desconto R$'}
                    </span>
                  </div>

                  <div className="cupom-valor-destaque mb-1">
                    {c.tipo === 'PERCENTUAL' ? `${c.valor}% OFF` : `${fmtMoeda(c.valor)} OFF`}
                  </div>

                  {c.clienteEspecifico && (
                    <div className="text-muted small mb-2">
                      <i className="bi bi-person me-1" />
                      Para: <strong>{c.clienteEspecifico}</strong>
                    </div>
                  )}

                  <div className="cupom-codigo-box">
                    <span className="cupom-codigo-texto">{c.codigo}</span>
                    <button
                      type="button"
                      className="btn-copiar-cupom"
                      onClick={() => copiarCodigo(c.codigo, c.id)}
                    >
                      {copiadoId === c.id ? (
                        <><i className="bi bi-check2 text-success" /> Copiado!</>
                      ) : (
                        <><i className="bi bi-clipboard" /> Copiar</>
                      )}
                    </button>
                  </div>

                  <div className="d-flex flex-column gap-1 text-muted small mt-2">
                    <span>
                      <i className="bi bi-moon-stars me-1 text-primary" />
                      {c.minimoNoites > 1 ? `Mínimo de ${c.minimoNoites} noites` : 'Sem mínimo de noites'}
                    </span>
                    {c.valorMinimo > 0 && (
                      <span>
                        <i className="bi bi-cash me-1 text-success" />
                        Em reservas a partir de {fmtMoeda(c.valorMinimo)}
                      </span>
                    )}
                    <span>
                      <i className="bi bi-calendar3 me-1 text-warning" />
                      Válido até: <strong>{fmtData(c.validade)}</strong>
                    </span>
                  </div>
                </div>

                <div className="d-flex align-items-center justify-content-between pt-3 border-top mt-3">
                  <span className={`fw-semibold small ${c.ativo ? 'text-success' : 'text-muted'}`}>
                    <i className={`bi bi-circle-fill me-1 ${c.ativo ? 'text-success' : 'text-secondary'}`} style={{ fontSize: '0.45rem' }} />
                    {c.ativo ? 'Cupom Ativo' : 'Cupom Pausado'}
                  </span>
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input switch-cupom-input"
                      type="checkbox"
                      role="switch"
                      checked={c.ativo}
                      onChange={() => aoAlternarStatus(c.id, c.ativo)}
                      aria-label={`Ativar ou pausar cupom ${c.codigo}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModalCriarCupom
        show={showModal}
        aoFechar={() => setShowModal(false)}
        aoSalvar={aoCriarCupom}
      />
    </div>
  );
}

// ─── Tabela de Gerenciamento de Reservas ───────────────────────────────────────
function TabelaReservas({ reservas, onVer, filtro, setFiltro, reservasGerais }) {
  const baseContagem = reservasGerais || reservas;
  const lista = filtro === 'todas' ? reservas : reservas.filter(r => r.status === filtro);
  const cnt   = s => s === 'todas' ? baseContagem.length : baseContagem.filter(r => r.status === s).length;

  return (
    <div className="tabela-wrapper-admin mb-4">
      <div className="tabela-header-admin">
        <h5 className="mb-0 fw-bold" style={{ color: '#223a5e' }}>Gerenciar Reservas</h5>
        <div className="filtros-status-admin">
          {['todas', 'pendente', 'aprovada', 'concluida', 'recusada', 'cancelada'].map(f => (
            <button
              key={f}
              type="button"
              className={`filtro-btn-admin${filtro === f ? ' ativo' : ''}`}
              onClick={() => setFiltro(f)}
            >
              {f === 'todas' ? 'Todas' : STATUS_CFG[f]?.label}
              <span className="filtro-count">{cnt(f)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="table-responsive">
        <table className="tabela-admin">
          <thead>
            <tr>
              <th>ID</th><th>Hóspede</th><th>Check-in</th><th>Check-out</th>
              <th className="d-none d-md-table-cell">Noites</th>
              <th>Total</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-5 text-muted">
                <i className="bi bi-calendar-x fs-2 d-block mb-2 opacity-50" />Nenhuma reserva encontrada
              </td></tr>
            ) : lista.map(r => (
              <tr key={r.id} className="linha-tabela-admin">
                <td><span className="id-reserva">#{r.id}</span></td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <div className="mini-avatar">{(r.nome || r.hospede || '?').charAt(0)}</div>
                    <div>
                      <div className="fw-semibold" style={{ fontSize: '0.875rem' }}>{r.nome || r.hospede}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{r.hospedes} pessoa(s)</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: '0.875rem' }}>{fmtData(r.checkin)}</td>
                <td style={{ fontSize: '0.875rem' }}>{fmtData(r.checkout)}</td>
                <td className="d-none d-md-table-cell text-center" style={{ fontSize: '0.875rem' }}>{noites(r.checkin, r.checkout)}</td>
                <td className="fw-bold" style={{ color: '#198754', fontSize: '0.875rem' }}>{fmtMoeda(r.total || r.valorTotal)}</td>
                <td><BadgeStatus status={r.status} /></td>
                <td>
                  <div className="acoes-tabela">
                    <button className="btn-acao-tabela ver" onClick={() => onVer(r)} title="Ver detalhes"><i className="bi bi-eye" /></button>
                    {r.status === 'aprovada' && (
                      <button className="btn-acao-tabela concluir text-primary" onClick={() => onVer(r)} title="Concluir Estadia"><i className="bi bi-check2-circle" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Painel de Avaliações ────────────────────────────────────────────────────
function PainelAvaliacoes({ avaliacoes, carregando, erro, aoTentarNovamente, aoResponder }) {
  if (carregando) {
    return (
      <div className="estado-avaliacoes-admin" role="status" aria-live="polite">
        <span className="spinner-border text-primary" aria-hidden="true" />
        <span>Carregando avaliações...</span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="estado-avaliacoes-admin erro" role="alert">
        <i className="bi bi-exclamation-triangle" aria-hidden="true" />
        <h5>Não foi possível carregar as avaliações</h5>
        <p>{erro}</p>
        <Button variant="outline-primary" onClick={aoTentarNovamente}>Tentar novamente</Button>
      </div>
    );
  }

  if (avaliacoes.length === 0) {
    return (
      <div className="estado-avaliacoes-admin">
        <i className="bi bi-chat-square-heart" aria-hidden="true" />
        <h5>Nenhuma avaliação aguardando resposta</h5>
        <p>Quando um hóspede avaliar uma estadia concluída, ela aparecerá aqui para você responder.</p>
      </div>
    );
  }

  const media = avaliacoes.reduce((total, item) => total + Number(item.nota || 0), 0) / avaliacoes.length;

  return (
    <>
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl={4}>
          <CardKpiModerno
            icone={<i className="bi bi-chat-square-dots fs-4" aria-hidden="true" />}
            titulo="Aguardando Resposta"
            valor={avaliacoes.length}
            sub="avaliações pendentes"
            cor="#f59e0b"
          />
        </Col>
        <Col xs={12} sm={6} xl={4}>
          <CardKpiModerno
            icone={<i className="bi bi-star-fill fs-4" aria-hidden="true" />}
            titulo="Média Recebida"
            valor={media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            sub="entre as pendentes"
            cor="#f37321"
          />
        </Col>
      </Row>

      <div className="avaliacoes-admin-grid">
        {avaliacoes.map(avaliacao => (
          <article key={avaliacao.id} className="card-avaliacao-admin">
            <div className="card-avaliacao-admin-topo">
              <div className="d-flex align-items-center gap-2">
                <div className="avatar-avaliacao-admin">{(avaliacao.hospede?.nome || '?').charAt(0)}</div>
                <div>
                  <div className="fw-bold" style={{ color: '#223a5e' }}>{avaliacao.hospede?.nome}</div>
                  <div className="text-muted small">Reserva #{avaliacao.reserva?.id}</div>
                </div>
              </div>
              <span className="badge-resposta-pendente">A responder</span>
            </div>

            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap my-3">
              <EstrelasAvaliacao nota={avaliacao.nota} tamanho="1.05rem" />
              <span className="text-muted small">{fmtData(avaliacao.data)}</span>
            </div>

            <p className="comentario-avaliacao-admin">“{avaliacao.comentario}”</p>

            <div className="meta-avaliacao-admin">
              <span><i className="bi bi-house me-1" aria-hidden="true" />{avaliacao.imovel?.nome || 'Recanto Camargo'}</span>
              <span><i className="bi bi-calendar3 me-1" aria-hidden="true" />{fmtData(avaliacao.reserva?.checkin)} → {fmtData(avaliacao.reserva?.checkout)}</span>
            </div>

            <button type="button" className="btn-responder-avaliacao" onClick={() => aoResponder(avaliacao)}>
              <i className="bi bi-reply me-2" aria-hidden="true" />Responder & Avaliar Hóspede
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

// ─── Previsão de Receita (Aba dedicada) ───────────────────────────────────────
function PrevisaoReceita({ reservas }) {
  const hoje = new Date();
  const meses = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    return {
      label: d.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''),
      ano: d.getFullYear(),
      mes: d.getMonth(),
    };
  });

  const dadosMeses = meses.map(({ label, ano, mes }) => {
    const doMes = reservas.filter(r => {
      const ini = new Date(r.checkin + 'T00:00:00');
      return ini.getFullYear() === ano && ini.getMonth() === mes;
    });
    const confirmada = doMes.filter(r => r.status === 'aprovada').reduce((a, r) => a + (r.total || r.valorTotal || 0), 0);
    const potencial  = doMes.filter(r => r.status === 'pendente').reduce((a, r) => a + (r.total || r.valorTotal || 0), 0);
    return { label, confirmada, potencial, total: confirmada + potencial };
  });

  const maxValor = Math.max(...dadosMeses.map(d => d.total), 1);
  const receitaPrevista = reservas
    .filter(r => r.status === 'aprovada' || r.status === 'pendente')
    .reduce((a, r) => a + (r.total || r.valorTotal || 0), 0);

  return (
    <div className="previsao-wrapper">
      <Row className="g-3 mb-4">
        <Col xs={12} md={4}>
          <div className="card-previsao-mini">
            <div className="card-previsao-icone" style={{ background: '#dbeafe', color: '#1e40af' }}>
              <i className="bi bi-graph-up-arrow fs-5" />
            </div>
            <div>
              <div className="card-previsao-valor">{fmtMoeda(receitaPrevista)}</div>
              <div className="card-previsao-label">Receita prevista total</div>
            </div>
          </div>
        </Col>
      </Row>

      <div className="grafico-wrapper-admin">
        <div className="grafico-header-admin">
          <h6 className="fw-bold mb-0" style={{ color: '#223a5e', fontSize: '0.9rem' }}>Receita por Mês (próx. 4 meses)</h6>
          <div className="legenda-grafico">
            <span className="legenda-item"><span className="dot" style={{ background: '#3b6399' }} />Confirmada</span>
            <span className="legenda-item"><span className="dot" style={{ background: '#fbbf24' }} />Potencial (pendente)</span>
          </div>
        </div>
        <div className="grafico-barras">
          {dadosMeses.map(({ label, confirmada, potencial, total }) => (
            <div key={label} className="grafico-coluna">
              <div className="grafico-valor-topo">{total > 0 ? fmtMoeda(total).replace('R$\u00a0', 'R$ ') : '—'}</div>
              <div className="grafico-barra-container">
                <div className="grafico-barra-stack">
                  <div className="grafico-barra confirmada" style={{ height: `${(confirmada / maxValor) * 100}%` }} title={`Confirmada: ${fmtMoeda(confirmada)}`} />
                  {potencial > 0 && (
                    <div className="grafico-barra potencial" style={{ height: `${(potencial / maxValor) * 100}%` }} title={`Potencial: ${fmtMoeda(potencial)}`} />
                  )}
                </div>
              </div>
              <div className="grafico-label-mes">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal DashboardAdministrador ──────────────────────────────
function DashboardAdministrador() {
  const { usuario, tipo, logout } = useAutenticacao();
  const navigate = useNavigate();
  const usuarioId = usuario?.id ?? null;
  const sessaoReservasRef = useRef(null);

  const [sidebarAberta, setSidebarAberta] = useState(() => window.innerWidth >= 992);
  const [abaAtiva, setAbaAtiva] = useState('visao-geral');
  const [reservas, setReservas] = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [feedback, setFeedback] = useState({ tipo: '', msg: '' });

  // Avaliações
  const [avaliacoesPendentes, setAvaliacoesPendentes] = useState([]);
  const [carregandoAvaliacoes, setCarregandoAvaliacoes] = useState(true);
  const [erroAvaliacoes, setErroAvaliacoes] = useState('');
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);

  // Bloqueios de Calendário (Sprint 2)
  const [bloqueios, setBloqueios] = useState([
    {
      id: 1,
      dataInicio: '2026-10-14',
      dataFim: '2026-10-16',
      motivo: 'Dedetização e Manutenção Preventiva',
    },
    {
      id: 2,
      dataInicio: '2026-11-03',
      dataFim: '2026-11-05',
      motivo: 'Pintura da Área Gourmet e Jardim',
    },
  ]);

  // Cupons Promocionais (Sprint 2)
  const [cupons, setCupons] = useState([
    {
      id: 1,
      codigo: 'ROMARIA10',
      tipo: 'PERCENTUAL',
      valor: 10,
      publico: 'TODOS',
      clienteEspecifico: null,
      minimoNoites: 2,
      valorMinimo: 450,
      validade: '2026-12-31',
      ativo: true,
    },
    {
      id: 2,
      codigo: 'BEMVINDO20',
      tipo: 'PERCENTUAL',
      valor: 20,
      publico: 'PRIMEIRA_RESERVA',
      clienteEspecifico: null,
      minimoNoites: 1,
      valorMinimo: 300,
      validade: '2026-11-30',
      ativo: true,
    },
    {
      id: 3,
      codigo: 'VIPRECANTO',
      tipo: 'FIXO',
      valor: 80,
      publico: 'VIP',
      clienteEspecifico: null,
      minimoNoites: 2,
      valorMinimo: 600,
      validade: '2026-12-15',
      ativo: true,
    },
    {
      id: 4,
      codigo: 'ESPECIALMARIA',
      tipo: 'PERCENTUAL',
      valor: 15,
      publico: 'CLIENTE_ESPECIFICO',
      clienteEspecifico: 'maria.peregrina@email.com',
      minimoNoites: 3,
      valorMinimo: 500,
      validade: '2026-10-31',
      ativo: false,
    },
  ]);

  useEffect(() => {
    if (tipo !== 'proprietario') navigate('/');
  }, [tipo, navigate]);

  useEffect(() => {
    const onResize = () => setSidebarAberta(window.innerWidth >= 992);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fb = (tipoAlerta, msg) => {
    setFeedback({ tipo: tipoAlerta, msg });
    setTimeout(() => setFeedback({ tipo: '', msg: '' }), 3500);
  };

  // Buscar Reservas
  const buscarReservas = useCallback(async () => {
    const sessao = sessaoReservasRef.current;
    if (!sessao?.ativa || sessao.usuarioId !== usuarioId || tipo !== 'proprietario') return;
    if (sessao.promessa) {
      sessao.recarregar = true;
      return sessao.promessa;
    }
    const atual = () => sessao.ativa && sessaoReservasRef.current === sessao;
    sessao.promessa = (async () => {
      do {
        sessao.recarregar = false;
        const controlador = new AbortController();
        sessao.controlador = controlador;
        const timeout = window.setTimeout(() => controlador.abort(), 10_000);
        try {
          const resposta = await fetch(`${API_BASE}/api/proprietario/reservas`, {
            credentials: 'include', cache: 'no-store', signal: controlador.signal,
          });
          const dados = await resposta.json().catch(() => null);
          if (!atual() || controlador.signal.aborted) return;
          if (resposta.status === 401 || resposta.status === 403) {
            sessao.ativa = false;
            setReservas([]);
            setSelecionada(null);
            return;
          }
          if (!resposta.ok || !Array.isArray(dados)) throw new Error('Resposta inválida.');
          setReservas(dados);
        } catch (erro) {
          if (atual() && erro.name !== 'AbortError') {
            console.error('Não foi possível atualizar as reservas do painel.');
          }
        } finally {
          window.clearTimeout(timeout);
          if (sessao.controlador === controlador) sessao.controlador = null;
        }
      } while (atual() && sessao.recarregar);
    })().finally(() => { sessao.promessa = null; });
    return sessao.promessa;
  }, [usuarioId, tipo]);

  useEffect(() => {
    const sessao = { usuarioId, ativa: !!usuarioId && tipo === 'proprietario', recarregar: false, promessa: null, controlador: null };
    sessaoReservasRef.current = sessao;
    setReservas([]);
    setSelecionada(null);
    buscarReservas();
    return () => {
      sessao.ativa = false;
      sessao.controlador?.abort();
    };
  }, [usuarioId, tipo, buscarReservas]);

  // Buscar Bloqueios
  const buscarBloqueios = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/proprietario/bloqueios`, { credentials: 'include' });
      if (res.ok) {
        const dados = await res.json();
        if (Array.isArray(dados)) setBloqueios(dados);
      }
    } catch {
      // Mantém estado fallback inicial se offline
    }
  }, []);

  // Buscar Cupons
  const buscarCupons = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/proprietario/cupons`, { credentials: 'include' });
      if (res.ok) {
        const dados = await res.json();
        if (Array.isArray(dados)) setCupons(dados);
      }
    } catch {
      // Mantém estado fallback inicial se offline
    }
  }, []);

  useEffect(() => {
    buscarBloqueios();
    buscarCupons();
  }, [buscarBloqueios, buscarCupons]);

  // Criar Bloqueio
  const criarBloqueio = async (novo) => {
    try {
      const res = await fetch(`${API_BASE}/api/proprietario/bloqueios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(novo),
      });
      if (res.ok) {
        const salvo = await res.json().catch(() => ({}));
        setBloqueios(prev => [...prev, salvo.bloqueio || { ...novo, id: Date.now() }]);
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao registrar bloqueio no servidor.');
      }
    } catch {
      // Fallback em desenvolvimento
      setBloqueios(prev => [...prev, { ...novo, id: Date.now() }]);
    }
    fb('sucesso', 'Datas bloqueadas para manutenção com sucesso.');
  };

  // Remover Bloqueio
  const removerBloqueio = async (id) => {
    try {
      await fetch(`${API_BASE}/api/proprietario/bloqueios/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch {
      // Ignora erro de rede em desenvolvimento
    }
    setBloqueios(prev => prev.filter(b => b.id !== id));
    fb('sucesso', 'Bloqueio de datas removido com sucesso.');
  };

  // Alternar Status do Cupom (Ativar / Desativar)
  const alternarStatusCupom = async (id, statusAtual) => {
    const novoStatus = !statusAtual;
    try {
      await fetch(`${API_BASE}/api/proprietario/cupons/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ativo: novoStatus }),
      });
    } catch {
      // Continua com atualização otimista local
    }
    setCupons(prev => prev.map(c => c.id === id ? { ...c, ativo: novoStatus } : c));
    fb('sucesso', `Cupom ${novoStatus ? 'ativado' : 'pausado'} com sucesso.`);
  };

  // Criar Novo Cupom
  const criarCupom = async (novo) => {
    try {
      const res = await fetch(`${API_BASE}/api/proprietario/cupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(novo),
      });
      if (res.ok) {
        const salvo = await res.json().catch(() => ({}));
        setCupons(prev => [salvo.cupom || { ...novo, id: Date.now() }, ...prev]);
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao registrar cupom.');
      }
    } catch {
      // Fallback em desenvolvimento
      setCupons(prev => [{ ...novo, id: Date.now() }, ...prev]);
    }
    fb('sucesso', `Cupom ${novo.codigo} criado com sucesso!`);
  };

  // Decidir Reserva
  async function decidirReserva(id, acao, motivo) {
    const sessao = sessaoReservasRef.current;
    if (!sessao?.ativa) throw new Error('Faça login novamente para decidir a reserva.');
    const resposta = await fetch(`${API_BASE}/api/proprietario/reservas/${id}/${acao}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(acao === 'recusar' ? { motivo } : {}),
      signal: AbortSignal.timeout(10_000),
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!sessao.ativa || sessaoReservasRef.current !== sessao) return;
    if (!resposta.ok) throw new Error(dados.error || 'Não foi possível salvar a decisão.');
    const statusSalvo = dados.status === 'CONFIRMADA'
      ? 'aprovada'
      : (dados.status === 'CONCLUIDA' ? 'concluida' : 'recusada');
    setReservas(atuais => atuais.map(r => String(r.id) === String(id) ? { ...r, status: statusSalvo } : r));
    setSelecionada(null);
    fb('sucesso', dados.message || 'Decisão salva com sucesso.');
    await buscarReservas();
  }

  // Buscar Avaliações Pendentes
  const buscarAvaliacoesPendentes = useCallback(async (signal) => {
    setCarregandoAvaliacoes(true);
    setErroAvaliacoes('');
    try {
      const resposta = await fetch(`${API_BASE}/api/proprietario/avaliacoes/pendentes`, {
        credentials: 'include',
        signal,
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.error || 'Não foi possível carregar as avaliações.');
      if (!Array.isArray(dados)) throw new Error('Formato inválido retornado pelo servidor.');
      setAvaliacoesPendentes(dados);
    } catch (falha) {
      if (falha.name !== 'AbortError') {
        setErroAvaliacoes(falha.message || 'Não foi possível carregar as avaliações.');
      }
    } finally {
      if (!signal?.aborted) setCarregandoAvaliacoes(false);
    }
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    buscarAvaliacoesPendentes(controlador.signal);
    return () => controlador.abort();
  }, [buscarAvaliacoesPendentes]);

  const confirmarRespostaAvaliacao = useCallback((id) => {
    setAvaliacoesPendentes(atuais => atuais.filter(item => item.id !== id));
    setAvaliacaoSelecionada(null);
    fb('sucesso', 'Resposta e avaliação interna do hóspede enviadas com sucesso.');
  }, []);

  // Cálculos do Dashboard
  const hoje = new Date();
  const mesAtualIdx = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const mesAnteriorDate = new Date(anoAtual, mesAtualIdx - 1, 1);
  const mesAnteriorIdx = mesAnteriorDate.getMonth();
  const anoAnterior = mesAnteriorDate.getFullYear();

  const getReceitaMes = (mes, ano) => {
    return reservas
      .filter(r => (r.status === 'aprovada' || r.status === 'concluida'))
      .filter(r => {
        if (!r.checkin) return false;
        const d = new Date(r.checkin + 'T00:00:00');
        return d.getMonth() === mes && d.getFullYear() === ano;
      })
      .reduce((acc, r) => acc + Number(r.total || r.valorTotal || 0), 0);
  };

  const faturamentoMesAtual = getReceitaMes(mesAtualIdx, anoAtual);
  const faturamentoMesAnterior = getReceitaMes(mesAnteriorIdx, anoAnterior);

  let variacaoPerc = 0;
  if (faturamentoMesAnterior > 0) {
    variacaoPerc = ((faturamentoMesAtual - faturamentoMesAnterior) / faturamentoMesAnterior) * 100;
  } else if (faturamentoMesAtual > 0) {
    variacaoPerc = 100;
  }

  const aprovadas = reservas.filter(r => r.status === 'aprovada' || r.status === 'concluida').length;
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diasOcupados = reservas.filter(r => r.status === 'aprovada' || r.status === 'concluida').reduce((acc, r) => {
    const ini = new Date(r.checkin + 'T00:00:00');
    const fim = new Date(r.checkout + 'T00:00:00');
    for (let d = new Date(ini); d < fim; d = new Date(d.getTime() + 86400000)) {
      if (d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear()) acc++;
    }
    return acc;
  }, 0);
  const ocupacao = Math.min(100, Math.round((diasOcupados / diasNoMes) * 100));

  // Abas do Painel
  const abas = [
    { id: 'visao-geral', label: 'Visão Geral', icone: <Ico.Dash /> },
    { id: 'reservas',    label: 'Reservas',    icone: <Ico.Reservas /> },
    { id: 'calendario',  label: 'Calendário',  icone: <Ico.Cal /> },
    { id: 'cupons',      label: 'Cupons',      icone: <Ico.Cupom /> },
    { id: 'previsao',    label: 'Previsão',    icone: <Ico.Previsao /> },
    { id: 'avaliacoes',  label: 'Avaliações',  icone: <Ico.Estrela /> },
  ];

  const irAba = (id) => {
    setAbaAtiva(id);
    if (window.innerWidth < 992) setSidebarAberta(false);
  };

  const renderConteudo = () => {
    switch (abaAtiva) {
      case 'visao-geral': {
        const reservasFiltradas = filtro === 'todas' ? reservas : reservas.filter(r => r.status === filtro);
        const ultimasReservas = reservasFiltradas.slice(0, 10);

        return (
          <>
            <p className="dash-section-label">Indicadores Principais (KPIs)</p>
            <Row className="g-3 mb-4">
              {/* 1. Faturamento Mensal com badge de variação vs mês anterior */}
              <Col xs={12} sm={6} xl={3}>
                <CardKpiModerno
                  icone={<i className="bi bi-currency-dollar fs-4" />}
                  titulo="Faturamento Mensal"
                  valor={fmtMoeda(faturamentoMesAtual)}
                  badge={
                    <span className={`kpi-badge-variacao ${variacaoPerc >= 0 ? 'positiva' : 'negativa'}`}>
                      <i className={`bi ${variacaoPerc >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right'} me-1`} />
                      {variacaoPerc >= 0 ? `+${variacaoPerc.toFixed(1)}%` : `${variacaoPerc.toFixed(1)}%`}
                    </span>
                  }
                  sub="vs mês anterior"
                  cor="#ff9211"
                />
              </Col>

              {/* 2. Taxa de Ocupação no Mês */}
              <Col xs={12} sm={6} xl={3}>
                <CardKpiModerno
                  icone={<i className="bi bi-house-check fs-4" />}
                  titulo="Ocupação no Mês"
                  valor={`${ocupacao}%`}
                  barraProgresso={ocupacao}
                  sub={`${diasOcupados} de ${diasNoMes} diárias reservadas`}
                  cor="#ff9211"
                />
              </Col>

              {/* 3. Avaliação Média 4.98 com estrelas */}
              <Col xs={12} sm={6} xl={3}>
                <CardKpiModerno
                  icone={<i className="bi bi-star-fill fs-4" />}
                  titulo="Avaliação Média"
                  valor={
                    <span className="d-flex align-items-center gap-2">
                      4.98
                      <EstrelasAvaliacao nota={4.98} tamanho="1.15rem" />
                    </span>
                  }
                  sub="Excelência comprovada pelos hóspedes"
                  cor="#f59e0b"
                />
              </Col>

              {/* 4. Total de Reservas */}
              <Col xs={12} sm={6} xl={3}>
                <CardKpiModerno
                  icone={<i className="bi bi-calendar-check fs-4" />}
                  titulo="Total de Reservas"
                  valor={reservas.length}
                  sub={`${aprovadas} ativas · ${reservas.filter(r => r.status === 'pendente').length} pendentes`}
                  cor="#223a5e"
                />
              </Col>
            </Row>

            {/* Gráfico SVG Moderno de Evolução dos Últimos 6 Meses */}
            <p className="dash-section-label">Desempenho Financeiro Recente</p>
            <GraficoFaturamentoSVG reservas={reservas} />

            {/* Card de Próximos Check-ins com botão direto de WhatsApp */}
            <p className="dash-section-label">Operação & Acolhimento</p>
            <CardProximosCheckins reservas={reservas} />

            {/* Tabela de Reservas Mantida com Filtros */}
            <p className="dash-section-label">Gerenciamento de Reservas</p>
            <TabelaReservas
              reservas={ultimasReservas}
              reservasGerais={reservas}
              onVer={setSelecionada}
              filtro={filtro}
              setFiltro={setFiltro}
            />
          </>
        );
      }

      case 'reservas': return (
        <>
          <p className="dash-section-label">Gerenciamento de Reservas</p>
          <TabelaReservas
            reservas={reservas}
            onVer={setSelecionada}
            filtro={filtro}
            setFiltro={setFiltro}
          />
        </>
      );

      case 'calendario': return (
        <>
          <p className="dash-section-label">Calendário de Ocupação & Manutenção</p>
          <CalendarioOcupacao
            reservas={reservas}
            bloqueios={bloqueios}
            aoCriarBloqueio={criarBloqueio}
            aoRemoverBloqueio={removerBloqueio}
          />
        </>
      );

      case 'cupons': return (
        <>
          <p className="dash-section-label">Gestão de Cupons Promocionais</p>
          <PainelCupons
            cupons={cupons}
            aoAlternarStatus={alternarStatusCupom}
            aoCriarCupom={criarCupom}
          />
        </>
      );

      case 'previsao': return (
        <>
          <p className="dash-section-label">Previsão de Receita</p>
          <PrevisaoReceita reservas={reservas} />
        </>
      );

      case 'avaliacoes': return (
        <>
          <p className="dash-section-label">Avaliações dos Hóspedes</p>
          <PainelAvaliacoes
            avaliacoes={avaliacoesPendentes}
            carregando={carregandoAvaliacoes}
            erro={erroAvaliacoes}
            aoTentarNovamente={() => buscarAvaliacoesPendentes()}
            aoResponder={setAvaliacaoSelecionada}
          />
        </>
      );

      default: return null;
    }
  };

  return (
    <div className="dashboard-admin-shell">
      {sidebarAberta && window.innerWidth < 992 && (
        <div className="sidebar-overlay" onClick={() => setSidebarAberta(false)} />
      )}

      {/* Sidebar de Navegação */}
      <aside className={`sidebar-admin ${sidebarAberta ? 'aberta' : 'colapsada'}`}>
        <div className="sidebar-topo">
          {sidebarAberta && <span className="sidebar-marca">Recanto Admin</span>}
        </div>
        <nav className="sidebar-nav">
          {abas.map(a => (
            <button
              key={a.id}
              type="button"
              className={`sidebar-item${abaAtiva === a.id ? ' ativo' : ''}`}
              onClick={() => irAba(a.id)}
              title={!sidebarAberta ? a.label : ''}
            >
              <span className="sidebar-icone">{a.icone}</span>
              {sidebarAberta && <span className="sidebar-label">{a.label}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-rodape">
          <Link to="/" className="sidebar-item sidebar-item-link" title={!sidebarAberta ? 'Voltar ao site' : ''}>
            <span className="sidebar-icone"><Ico.Voltar /></span>
            {sidebarAberta && <span className="sidebar-label">Voltar ao site</span>}
          </Link>
          <button type="button" className="sidebar-item" onClick={() => navigate('/Configuracoes')} title={!sidebarAberta ? 'Configurações' : ''}>
            <span className="sidebar-icone"><Ico.Config /></span>
            {sidebarAberta && <span className="sidebar-label">Configurações</span>}
          </button>
          <button type="button" className="sidebar-item sair" onClick={() => { logout(); navigate('/'); }} title={!sidebarAberta ? 'Sair' : ''}>
            <span className="sidebar-icone"><Ico.Sair /></span>
            {sidebarAberta && <span className="sidebar-label">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="dashboard-admin-main">
        <div className="topbar-admin">
          <div className="topbar-esquerda">
            <button
              type="button"
              className="btn-menu-topbar me-3"
              onClick={() => setSidebarAberta(s => !s)}
              aria-label="Alternar menu"
            >
              <Ico.Menu />
            </button>
            <div>
              <h4 className="topbar-titulo mb-0">{abas.find(a => a.id === abaAtiva)?.label}</h4>
              <span className="topbar-sub">Olá, {usuario?.nome?.split(' ')[0] || 'Anfitrião'}!</span>
            </div>
          </div>
          <div className="topbar-direita">
            <Notificacoes aoNovaNotificacao={buscarReservas} />
            <div className="topbar-avatar" title={usuario?.nome}>
              {usuario?.nome?.charAt(0) || 'R'}
            </div>
          </div>
        </div>

        {feedback.msg && (
          <Alert
            variant={feedback.tipo === 'sucesso' ? 'success' : 'danger'}
            className="alert-feedback-admin border-0 shadow-sm mx-4 mt-3"
          >
            <i className={`bi ${feedback.tipo === 'sucesso' ? 'bi-check-circle' : 'bi-x-circle'} me-2`} />
            {feedback.msg}
          </Alert>
        )}

        <div className="dashboard-admin-conteudo">{renderConteudo()}</div>
      </main>

      {/* Modais Globais */}
      <ModalReserva
        reserva={selecionada}
        aoFechar={() => setSelecionada(null)}
        aoDecidir={decidirReserva}
      />

      <ModalResponderAvaliacao
        avaliacao={avaliacaoSelecionada}
        aoFechar={() => setAvaliacaoSelecionada(null)}
        aoResponder={confirmarRespostaAvaliacao}
      />
    </div>
  );
}

export default DashboardAdministrador;
