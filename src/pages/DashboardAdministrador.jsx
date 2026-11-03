/**
 * DashboardAdministrador.jsx
 * Painel Administrativo do Recanto Camargo - Sprint 2
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Row, Col, Card, Modal, Alert, Button } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import Calendar from 'react-calendar';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { usePreferencias } from '../hooks/usePreferencias';
import Notificacoes from '../components/UI/Notificacoes';
import { API_BASE } from '../utils/api';
import 'react-calendar/dist/Calendar.css';
import '../components/home/home.css';
import './DashboardAdministrador.css';

// ─── Constantes & Utilitários ────────────────────────────────────────────────

const fmtData  = (s) => {
  if (!s) return '—';
  const str = String(s).slice(0, 10);
  const [a, m, d] = str.split('-');
  return (a && m && d) ? `${d}/${m}/${a}` : s;
};

const fmtDataHora = (s, t = (x) => x) => {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return fmtData(s);
    return d.toLocaleDateString('pt-BR') + t(' às ') + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return fmtData(s);
  }
};

const localeDe = (idioma) => (idioma === 'en' ? 'en-US' : 'pt-BR');

const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtTelefone = (tel) => {
  if (!tel) return '';
  const digits = String(tel).replace(/\D/g, '');
  const clean = (digits.startsWith('55') && digits.length > 11) ? digits.slice(2) : digits;
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return tel;
};

const noites   = (ci, co) => {
  if (!ci || !co) return 0;
  return Math.max(1, Math.round((new Date(co + 'T00:00:00') - new Date(ci + 'T00:00:00')) / 86400000));
};

const STATUS_CFG = {
  pendente:  { label: 'Pendente',   bg: 'var(--adm-warn-bg)', cor: 'var(--adm-warn-fg)' },
  'pagamento pendente': { label: 'Pagamento Pendente' },
  aprovada:  { label: 'Confirmada' },
  recusada:  { label: 'Recusada',   bg: 'var(--adm-err-bg)', cor: 'var(--adm-err-fg)' },
  cancelada: { label: 'Cancelada',  bg: 'var(--adm-err-bg)', cor: 'var(--adm-err-fg)' },
  concluida: { label: 'Concluída',  bg: 'var(--adm-info-bg)', cor: 'var(--adm-info-fg)' },
};

const classeStatus = (status) => `st-${String(status || 'pendente').replace(/\s+/g, '-')}`;

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
  Diaria:   () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
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
  const { t } = usePreferencias();
  const c = STATUS_CFG[status] || STATUS_CFG.pendente;
  return <span className={`badge-status-admin ${classeStatus(status)}`}>{t(c.label)}</span>;
}

function EstrelasAvaliacao({ nota, tamanho = '1rem' }) {
  const { t, idioma } = usePreferencias();
  const valor = Math.min(5, Math.max(0, Number(nota) || 0));
  return (
    <span className="avaliacao-admin-estrelas" role="img" aria-label={t('{valor} de 5 estrelas', { valor: valor.toLocaleString(localeDe(idioma)) })} style={{ fontSize: tamanho }}>
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

function CardKpiModerno({ icone, titulo, valor, badge, sub, cor = 'var(--adm-blue)', barraProgresso = null }) {
  return (
    <Card className="card-kpi-moderno border-0 shadow-sm h-100">
      <Card.Body className="p-4 d-flex flex-column justify-content-between">
        <div>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="titulo-kpi-moderno">{titulo}</span>
            <div className="icone-kpi-moderno" style={{ background: `color-mix(in srgb, ${cor} 14%, transparent)`, color: cor }}>
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
  const { t, idioma } = usePreferencias();
  const [pontoAtivo, setPontoAtivo] = useState(null);

  const meses = useMemo(() => {
    const hoje = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
      const mesNum = d.getMonth();
      const anoNum = d.getFullYear();
      const label = d.toLocaleString(localeDe(idioma), { month: 'short' }).replace('.', '');

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
  }, [reservas, idioma]);

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
          <h6 className="fw-bold mb-0" style={{ color: 'var(--rc-ink)' }}>
            <i className="bi bi-graph-up me-2 text-primary" />
            {t("Evolução do Faturamento")}
          </h6>
          <span className="text-muted small">{t("Últimos 6 meses · Receita de estadias confirmadas e concluídas")}</span>
        </div>
        <div>
          <span className="badge-total-6m">
            {t("Total do período:")} <strong>{fmtMoeda(totalPeriodo)}</strong>
          </span>
        </div>
      </div>

      <div className="grafico-svg-container position-relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-100" style={{ overflow: 'visible', maxHeight: '220px' }}>
          <defs>
            <linearGradient id="recantoGradienteFaturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--rc-u1)" stopOpacity="0.45" />
              <stop offset="60%" stopColor="var(--adm-blue)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--rc-ink)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="recantoGradienteLinha" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--rc-ink)" />
              <stop offset="50%" stopColor="var(--adm-blue)" />
              <stop offset="100%" stopColor="var(--rc-u1)" />
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
                  stroke="var(--rc-line)"
                  strokeDasharray="4 4"
                  strokeWidth="1.2"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="var(--rc-muted)"
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
                  fill={isAtivo ? 'var(--rc-u1)' : 'var(--rc-muted)'}
                  fontSize="11"
                  fontWeight={isAtivo ? '700' : '600'}
                >
                  {p.label}
                </text>

                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isAtivo ? 9 : 6.5}
                  fill="var(--rc-u1)"
                  fillOpacity={isAtivo ? 0.35 : 0.15}
                  style={{ transition: 'all 0.2s ease' }}
                />

                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isAtivo ? 5 : 4}
                  fill="var(--rc-card)"
                  stroke={isAtivo ? 'var(--rc-u1)' : 'var(--rc-ink)'}
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
  const { t } = usePreferencias();
  const hoje = useMemo(() => {
    const h = new Date();
    h.setHours(0, 0, 0, 0);
    return h;
  }, []);

  const proximos = useMemo(() => {
    return reservas
      .filter(r => (r.status === 'aprovada' || r.status === 'concluida') && r.checkin)
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
          <h6 className="fw-bold mb-0" style={{ color: 'var(--rc-ink)' }}>
            <i className="bi bi-person-check-fill me-2 text-warning" />
            {t("Próximos Check-ins")}
          </h6>
          <span className="text-muted small">{t("Hóspedes confirmados com chegada nos próximos dias")}</span>
        </div>
        <span className="badge bg-light text-dark border">
          {t('{n} agendados', { n: proximos.length })}
        </span>
      </div>

      {proximos.length === 0 ? (
        <div className="text-center py-4 text-muted">
          <i className="bi bi-calendar-check fs-3 d-block mb-2 opacity-50" />
          <p className="mb-0 small">{t("Nenhum check-in previsto para os próximos dias.")}</p>
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
                    <span className="fw-bold" style={{ color: 'var(--rc-ink)' }}>{r.nome || r.hospede}</span>
                    <BadgeStatus status={r.status} />
                  </div>
                  <div className="text-muted small">
                    <i className="bi bi-calendar3 me-1" />
                    {fmtData(r.checkin)} → {fmtData(r.checkout)} ({t('{noites} noites · {hospedes} hóspedes', { noites: noites(r.checkin, r.checkout), hospedes: r.hospedes })})
                  </div>
                  <div className="small fw-semibold mt-1" style={{ color: r.diffDias === 0 ? 'var(--adm-ok-fg)' : 'var(--rc-ink)' }}>
                    {r.diffDias === 0
                      ? <><i className="bi bi-stars me-1" aria-hidden="true" />{t('Entrada Hoje!')}</>
                      : r.diffDias === 1
                        ? <><i className="bi bi-calendar-event me-1" aria-hidden="true" />{t('Entrada Amanhã')}</>
                        : <><i className="bi bi-hourglass-split me-1" aria-hidden="true" />{t('Em {n} dias', { n: r.diffDias })}</>}
                  </div>
                </div>
              </div>

              <div>
                <a
                  href={gerarLinkWhats(r)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp-checkin"
                  title={t('Abrir WhatsApp de {nome}', { nome: r.nome || r.hospede })}
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
function ModalReserva({ reserva, aoFechar, aoDecidir, aoAbrirCancelamento }) {
  const { t } = usePreferencias();
  const [motivo, setMotivo] = useState('');
  const [erroDecisao, setErroDecisao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const envioRef = useRef(false);

  const [confirmandoConclusao, setConfirmandoConclusao] = useState(false);

  useEffect(() => { setMotivo(''); setErroDecisao(''); setConfirmandoConclusao(false); }, [reserva?.id]);

  async function decidir(acao) {
    if (envioRef.current) return;
    envioRef.current = true;
    setEnviando(true);
    setErroDecisao('');
    try { await aoDecidir(reserva.id, acao, motivo); }
    catch (erro) { setErroDecisao(erro.message || t('Não foi possível salvar a decisão.')); }
    finally { envioRef.current = false; setEnviando(false); }
  }

  if (!reserva) return null;
  const r = reserva;
  const n = noites(reserva.checkin, reserva.checkout);

  // Verificação de prazo para a trava de segurança da conclusão manual
  const agora = new Date();
  const checkinDt = r.checkin ? new Date(r.checkin + 'T14:00:00') : null;
  const checkoutDt = r.checkout ? new Date(r.checkout + 'T11:00:00') : null;
  const checkinNoFuturo = checkinDt ? agora < checkinDt : false;
  const checkoutNoFuturo = checkoutDt ? agora < checkoutDt : false;

  return (
    <>
      <Modal show onHide={() => !enviando && aoFechar()} centered scrollable size="lg" className="modal-reserva-admin">
        <Modal.Header closeButton className="modal-header-admin py-2 px-3 px-md-4">
          <Modal.Title className="d-flex align-items-center gap-2">
            <i className="bi bi-calendar2-check-fill" aria-hidden="true"></i> {t('Reserva #{id}', { id: reserva.id })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3 px-md-4">
          {erroDecisao && <Alert variant="danger" role="alert">{erroDecisao}</Alert>}
          <Row className="g-3">
            {/* Banner do Hóspede */}
            <Col xs={12}>
              <div className="info-hospede-modal d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="d-flex align-items-center gap-3">
                  <div className="avatar-hospede-modal">{(r.nome || r.hospede || '?').charAt(0)}</div>
                  <div>
                    <div className="nome-hospede-modal">{r.nome || r.hospede}</div>
                    <div className="text-muted small mt-1">{r.email}</div>
                    {r.telefone && (
                      <div className="text-muted small mt-0.5">
                        <i className="bi bi-telephone me-1" />{fmtTelefone(r.telefone)}
                      </div>
                    )}
                    <div className="mt-1 d-flex align-items-center gap-2"><BadgeStatus status={r.status} /> <span className="small fw-semibold" style={{ color: 'var(--rc-ink)' }}>{r.imovelNome || UNIDADES_ADMIN.find(u => u.id === Number(r.imovelId))?.nome}</span></div>
                  </div>
                </div>
                {r.criadaEm && (
                  <div className="text-md-end text-muted small ms-auto">
                    <div className="label-data-modal mb-1" style={{ fontSize: '0.68rem' }}>{t("Criada em")}</div>
                    <strong style={{ color: 'var(--rc-ink)', fontSize: '0.85rem' }}>{fmtDataHora(r.criadaEm, t)}</strong>
                  </div>
                )}
              </div>
            </Col>

            {/* Coluna 1: Período */}
            <Col md={6}>
              <div className="p-3 rounded-3 border bg-white h-100">
                <div className="label-secao-modal d-flex align-items-center gap-1 mb-2">
                  <i className="bi bi-calendar3"></i> {t("Período")}
                </div>
                <div className="d-flex gap-2">
                  <div className="bloco-data-modal flex-fill">
                    <div className="label-data-modal">{t("Check-in")}</div>
                    <div className="valor-data-modal">{fmtData(r.checkin)}</div>
                  </div>
                  <div className="bloco-data-modal flex-fill">
                    <div className="label-data-modal">{t("Check-out")}</div>
                    <div className="valor-data-modal">{fmtData(r.checkout)}</div>
                  </div>
                  <div className="bloco-data-modal" style={{ minWidth: '60px' }}>
                    <div className="label-data-modal">{t("Noites")}</div>
                    <div className="valor-data-modal">{n}</div>
                  </div>
                </div>
              </div>
            </Col>

            {/* Coluna 2: Pessoas & Valor */}
            <Col md={6}>
              <div className="p-3 rounded-3 border bg-white h-100">
                <div className="label-secao-modal d-flex align-items-center gap-1 mb-2">
                  <i className="bi bi-cash-stack"></i> {t("Pessoas & Valor")}
                </div>
                <div className="d-flex gap-2">
                  <div className="bloco-data-modal" style={{ minWidth: '70px' }}>
                    <div className="label-data-modal">{t("Pessoas")}</div>
                    <div className="valor-data-modal">{r.hospedes}</div>
                  </div>
                  <div className="bloco-data-modal flex-fill" style={{ background: 'var(--adm-ok-bg)', borderColor: 'var(--adm-ok-bd)' }}>
                    <div className="label-data-modal">{t('Total')}</div>
                    <div className="valor-data-modal" style={{ color: 'var(--adm-ok-fg)' }}>{fmtMoeda(r.total || r.valorTotal)}</div>
                  </div>
                </div>
              </div>
            </Col>

            {(r.observacoes || r.observacao) && (
              <Col xs={12}>
                <p className="label-secao-modal mb-1">{t("Observações do Hóspede")}</p>
                <div className="obs-modal obs-modal-neutra">{r.observacoes || r.observacao}</div>
              </Col>
            )}

            {r.status === 'cancelada' && Number(r.valorReembolsado) > 0 && (
              <Col xs={12}>
                <div className="obs-modal" style={{ background: 'var(--adm-ok-bg)', border: '1px solid var(--adm-ok-bd)', color: 'var(--adm-ok-fg)', borderRadius: '10px', padding: '0.85rem 1rem', fontSize: '0.88rem' }}>
                  <i className="bi bi-arrow-counterclockwise me-2"></i>
                  <strong>{t("Estorno Realizado no Mercado Pago:")}</strong> {t('{valor} devolvidos diretamente ao hóspede.', { valor: fmtMoeda(r.valorReembolsado) })}
                </div>
              </Col>
            )}

            {(r.motivoRecusa || r.motivo) && (r.status === 'recusada' || r.status === 'cancelada') && (
              <Col xs={12}>
                <p className="label-secao-modal mb-1">
                  {r.status === 'cancelada' ? t('Motivo do Cancelamento') : t('Motivo da Recusa')}
                </p>
                <div className="obs-modal" style={{ background: 'var(--adm-err-bg)', border: '1px solid var(--adm-err-bd)', color: 'var(--adm-warn-fg)', borderRadius: '10px', padding: '0.85rem 1rem', fontSize: '0.88rem' }}>
                  <i className="bi bi-info-circle me-2"></i>
                  {r.motivoRecusa || r.motivo}
                </div>
              </Col>
            )}

            {r.status === 'pagamento pendente' && (
              <Col xs={12}>
                <div className="obs-modal" style={{ background: 'var(--adm-warn-bg)', border: '1px solid var(--adm-warn-bd)', color: 'var(--adm-warn-fg)', borderRadius: '10px', padding: '0.85rem 1rem', fontSize: '0.88rem', lineHeight: '1.5' }}>
                  <div>
                    <i className="bi bi-clock-history me-2"></i>
                    <strong>{t("Aguardando Pagamento do Hóspede:")}</strong> {t('Esta reserva foi pré-aprovada e aguarda o pagamento via Mercado Pago pelo hóspede. O faturamento e confirmação definitiva ocorrerão automaticamente assim que o pagamento for aprovado.')}
                  </div>
                  {r.expiraEm && (
                    <div className="mt-2 pt-2 border-top border-warning-subtle fw-semibold" style={{ color: 'var(--adm-warn-fg)' }}>
                      <i className="bi bi-hourglass-split me-1"></i>
                      {t('Prazo para pagamento: até')} <strong>{t('{data} (24 horas)', { data: fmtDataHora(r.expiraEm, t) })}</strong>. {t('Caso o pagamento não ocorra até esse horário, a reserva será cancelada e as datas serão liberadas automaticamente no calendário.')}
                    </div>
                  )}
                </div>
              </Col>
            )}

            {r.status === 'pendente' && (
              <Col xs={12}>
                <div className="obs-modal" style={{ background: 'var(--adm-info-bg)', border: '1px solid var(--adm-info-bd)', color: 'var(--adm-info-fg)', borderRadius: '10px', padding: '0.85rem 1rem', fontSize: '0.88rem', lineHeight: '1.5' }}>
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>{t("Aguardando sua Decisão:")}</strong>
                  {r.expiraEm ? (
                    <span> {t('Você tem até')} <strong>{t('{data} (48 horas da solicitação)', { data: fmtDataHora(r.expiraEm, t) })}</strong> {t('para aprovar ou recusar esta reserva antes que ela expire e seja cancelada automaticamente pelo sistema.')}</span>
                  ) : (
                    <span> {t('Responda em até 48 horas para evitar cancelamento automático.')}</span>
                  )}
                </div>
              </Col>
            )}
          </Row>

          {r.status === 'pendente' && (
            <div className="mt-3">
              <label htmlFor="motivo-recusa" className="form-label small fw-semibold text-muted">{t("Motivo da recusa (opcional)")}</label>
              <textarea id="motivo-recusa" className="form-control" rows={2} maxLength={250}
                value={motivo} disabled={enviando} onChange={e => setMotivo(e.target.value)}
                style={{ borderRadius: '10px', fontSize: '0.88rem' }} />
            </div>
          )}
        </Modal.Body>
        {r.status === 'pendente' && (
          <Modal.Footer className="border-top pt-3 pb-3 px-3 px-md-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <Button variant="outline-secondary" style={{ borderRadius: '50px', padding: '0.45rem 1.25rem', fontSize: '0.88rem' }} disabled={enviando} onClick={aoFechar}>
              {t('Fechar')}
            </Button>
            <div className="d-flex align-items-center gap-2">
              <Button variant="outline-danger" style={{ borderRadius: '50px', padding: '0.45rem 1.1rem', fontSize: '0.88rem' }} disabled={enviando} onClick={() => decidir('recusar')}>
                <i className="bi bi-x-circle me-1" /> {t("Recusar reserva")}
              </Button>
              <Button variant="success" style={{ borderRadius: '50px', fontWeight: 700, padding: '0.45rem 1.3rem', fontSize: '0.88rem' }} disabled={enviando} onClick={() => decidir('aprovar')}>
                <i className="bi bi-check2-circle me-1" /> {enviando ? t('Salvando…') : t('Aprovar reserva')}
              </Button>
            </div>
          </Modal.Footer>
        )}
        {r.status === 'aprovada' && (
          <Modal.Footer className="border-top pt-3 pb-3 px-3 px-md-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <Button variant="outline-secondary" style={{ borderRadius: '50px', padding: '0.45rem 1.25rem', fontSize: '0.88rem' }} disabled={enviando} onClick={aoFechar}>
              {t('Fechar')}
            </Button>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Button variant="outline-danger" style={{ borderRadius: '50px', padding: '0.45rem 1.1rem', fontSize: '0.88rem' }} disabled={enviando} onClick={() => { aoFechar(); aoAbrirCancelamento && aoAbrirCancelamento(r); }}>
                <i className="bi bi-x-circle me-1" /> {t("Cancelar Reserva (Estorno)")}
              </Button>
              {checkinNoFuturo ? (
                <div className="d-flex align-items-center gap-2">
                  <span className="small text-muted" style={{ fontSize: '0.8rem' }}>
                    <i className="bi bi-lock-fill text-secondary me-1" />
                    {t('Conclusão liberada após o check-in ({data} às 14h)', { data: fmtData(r.checkin) })}
                  </span>
                  <Button variant="secondary" disabled style={{ opacity: 0.65, borderRadius: '50px' }}>
                    <i className="bi bi-check2-circle me-1" /> {t("Concluir Estadia")}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  disabled={enviando}
                  onClick={() => setConfirmandoConclusao(true)}
                  style={{ borderRadius: '50px', fontWeight: 600, padding: '0.45rem 1.25rem', fontSize: '0.88rem' }}
                >
                  <i className="bi bi-check2-circle me-1" /> {t("Concluir Estadia")}
                </Button>
              )}
            </div>
          </Modal.Footer>
        )}
        {r.status !== 'pendente' && r.status !== 'aprovada' && (
          <Modal.Footer className="border-top pt-3 pb-3 px-3 px-md-4 d-flex justify-content-end align-items-center">
            <Button variant="outline-secondary" style={{ borderRadius: '50px', padding: '0.45rem 1.25rem', fontSize: '0.88rem' }} onClick={aoFechar}>
              {t('Fechar')}
            </Button>
          </Modal.Footer>
        )}
      </Modal>

      {/* Modal de Confirmação com Trava contra Cliques Acidentais */}
      {confirmandoConclusao && (
        <ModalConfirmarConclusao
          show={confirmandoConclusao}
          reserva={r}
          checkoutNoFuturo={checkoutNoFuturo}
          aoFechar={() => setConfirmandoConclusao(false)}
          aoConfirmar={() => {
            setConfirmandoConclusao(false);
            decidir('concluir');
          }}
          enviando={enviando}
        />
      )}
    </>
  );
}

// ─── Modal Confirmação de Conclusão Manual de Estadia (Trava de Segurança) ────
function ModalConfirmarConclusao({ show, reserva, checkoutNoFuturo, aoFechar, aoConfirmar, enviando }) {
  const { t } = usePreferencias();
  if (!show || !reserva) return null;

  return (
    <Modal show onHide={aoFechar} centered backdrop={enviando ? 'static' : true} className="adm-modal">
      <Modal.Header closeButton={!enviando} style={{ background: checkoutNoFuturo ? 'var(--adm-warn-bg)' : 'var(--adm-ok-bg)', borderBottom: '1px solid ' + (checkoutNoFuturo ? 'var(--adm-warn-bd)' : 'var(--adm-ok-bd)') }}>
        <Modal.Title style={{ color: checkoutNoFuturo ? 'var(--adm-warn-fg)' : 'var(--adm-ok-fg)' }}>
          <i className={`bi ${checkoutNoFuturo ? 'bi-exclamation-triangle-fill text-warning' : 'bi-check2-circle text-success'} me-2`} />
          {checkoutNoFuturo ? t('Atenção: Conclusão Antecipada') : t('Confirmar Conclusão da Estadia')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {checkoutNoFuturo ? (
          <div>
            <div className="p-3 mb-3 rounded-3" style={{ background: 'var(--adm-warn-bg)', border: '1px solid var(--adm-warn-bd)' }}>
              <div className="fw-bold mb-1" style={{ color: 'var(--adm-warn-fg)' }}>
                <i className="bi bi-hourglass-split me-1" />
                {t('O check-out oficial está previsto para {data} às 11:00.', { data: fmtData(reserva.checkout) })}
              </div>
              <p className="small mb-0 text-muted">
                {t('O hóspede')} <strong>{reserva.nome || reserva.hospede}</strong> {t('ainda está dentro do período regular da reserva contratada.')}
              </p>
            </div>
            <p className="small text-muted mb-2">
              {t('Você confirma que o hóspede já liberou o chalé e realizou o')} <strong>{t('check-out antecipado')}</strong>?
            </p>
            <div className="small text-muted border-start border-3 border-warning ps-2 py-1 mb-0" style={{ background: 'var(--adm-sub)' }}>
              {t('Ao confirmar, a reserva será concluída no sistema e um convite de avaliação será disparado para o hóspede.')}
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-2">
              {t('Deseja confirmar o encerramento da estadia da')} <strong>{t('Reserva #{id}', { id: reserva.id })}</strong>?
            </p>
            <div className="p-3 mb-3 rounded-3 border bg-light small">
              <div><strong>{t("Hóspede:")}</strong> {reserva.nome || reserva.hospede}</div>
              <div><strong>{t("Período:")}</strong> {t('{ini} às 14:00 até {fim} às 11:00', { ini: fmtData(reserva.checkin), fim: fmtData(reserva.checkout) })}</div>
            </div>
            <p className="small text-muted mb-0">
              {t('Ao confirmar a conclusão, o hóspede receberá um convite por e-mail e pelo painel para avaliar a hospedagem no Recanto Camargo.')}
            </p>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0 gap-2">
        <Button variant="outline-secondary" disabled={enviando} onClick={aoFechar} style={{ borderRadius: '50px' }}>
          {t('Voltar')}
        </Button>
        <Button
          variant={checkoutNoFuturo ? 'warning' : 'primary'}
          disabled={enviando}
          onClick={aoConfirmar}
          style={{ borderRadius: '50px', fontWeight: 600, padding: '0.55rem 1.4rem' }}
        >
          {enviando ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              {t("Concluindo...")}
            </>
          ) : (
            <>
              <i className="bi bi-check2-circle me-1" />
              {checkoutNoFuturo ? t('Sim, Concluir Antecipado') : t('Confirmar Conclusão')}
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Modal Cancelar Reserva com Reembolso Automático (Mercado Pago) ───────────
function ModalCancelarReservaAdmin({ reserva, aoFechar, aoConfirmarCancelamento }) {
  const { t } = usePreferencias();
  const [simulacao, setSimulacao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [motivo, setMotivo] = useState('');
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    if (!reserva?.id) return;
    let ativo = true;
    setCarregando(true);
    setErro('');

    fetch(`${API_BASE}/api/proprietario/reservas/${reserva.id}/simular-cancelamento`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(dados => {
        if (!ativo) return;
        if (dados.error) setErro(dados.error);
        else setSimulacao(dados);
      })
      .catch(err => {
        if (ativo) setErro(err.message || t('Erro ao calcular política de reembolso.'));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => { ativo = false; };
  }, [reserva?.id]);

  async function confirmar() {
    if (cancelando) return;
    setCancelando(true);
    setErro('');
    try {
      await aoConfirmarCancelamento(reserva.id, motivo);
      aoFechar();
    } catch (err) {
      setErro(err.message || t('Não foi possível processar o cancelamento.'));
    } finally {
      setCancelando(false);
    }
  }

  if (!reserva) return null;

  return (
    <Modal show onHide={() => !cancelando && aoFechar()} centered scrollable size="lg" className="modal-reserva-admin">
      <Modal.Header closeButton className="modal-header-admin modal-header-perigo py-2 px-3 px-md-4">
        <Modal.Title>
          <i className="bi bi-exclamation-triangle-fill me-2" />
          {t('Cancelar Reserva #{id}', { id: reserva.id })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {erro && <Alert variant="danger" role="alert">{erro}</Alert>}

        {carregando ? (
          <div className="text-center py-5">
            <div className="spinner-border text-danger" role="status" />
            <p className="mt-3 text-muted">{t("Consultando política e calculando reembolso no Mercado Pago...")}</p>
          </div>
        ) : simulacao ? (
          <div>
            <Row className="g-3 mb-3">
              {/* Coluna 1: Informações e WhatsApp */}
              <Col md={6} className="d-flex flex-column gap-3">
                <div className="p-3 rounded-3 border bg-light h-100" style={{ fontSize: '0.88rem' }}>
                  <div className="text-muted small text-uppercase fw-bold mb-2" style={{ letterSpacing: '0.5px' }}>{t("Dados da Reserva")}</div>
                  <div className="mb-2">
                    <span className="text-muted">{t("Hóspede:")} </span>
                    <strong className="text-dark fs-6">{simulacao.hospedeNome}</strong>
                    {simulacao.hospedeTelefone && <div className="text-muted small mt-1"><i className="bi bi-telephone me-1" />{fmtTelefone(simulacao.hospedeTelefone)}</div>}
                  </div>
                  <div className="text-muted small">
                    <div>{t('Check-in')}: <strong className="text-dark">{t('{data} às 14:00', { data: fmtData(simulacao.checkin) })}</strong></div>
                    <div>{t('Check-out')}: <strong className="text-dark">{t('{data} às 11:00', { data: fmtData(simulacao.checkout) })}</strong></div>
                  </div>
                </div>

                <div className="p-3 rounded-3 border" style={{ background: 'var(--adm-ok-bg)', borderColor: 'var(--adm-ok-bd)' }}>
                  <div className="fw-bold text-success small d-flex align-items-center mb-1">
                    <i className="bi bi-whatsapp me-2 fs-6" />
                    {t("Prefere propor uma remarcação de datas?")}
                  </div>
                  <div className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>
                    {t("Converse com o hóspede pelo WhatsApp antes de cancelar e estornar o valor.")}
                  </div>
                  {simulacao.hospedeTelefone ? (
                    <a
                      href={`https://wa.me/55${simulacao.hospedeTelefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${simulacao.hospedeNome}! Aqui é o anfitrião do Recanto Camargo sobre a reserva #${reserva.id}. Gostaria de conversar com você sobre a possibilidade de remarcar a sua estadia.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-success fw-semibold px-3 py-1 d-inline-flex align-items-center"
                      style={{ borderRadius: '50px' }}
                    >
                      <i className="bi bi-whatsapp me-1" />
                      {t("Falar no WhatsApp")}
                    </a>
                  ) : (
                    <span className="badge bg-secondary py-1 px-2" style={{ fontSize: '0.75rem' }}>{t("Telefone não informado")}</span>
                  )}
                </div>
              </Col>

              {/* Coluna 2: Política e Estorno */}
              <Col md={6}>
                <div className="p-3 rounded-3 h-100 d-flex flex-column justify-content-between" style={{ background: 'var(--adm-err-bg)', border: '1px solid var(--adm-err-bd)' }}>
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold" style={{ color: 'var(--adm-err-fg)', fontSize: '0.9rem' }}>
                        <i className="bi bi-shield-check me-1" />
                        {t("Cancelamento pelo Anfitrião")}
                      </span>
                      <span className="badge bg-danger px-2 py-1" style={{ fontSize: '0.75rem' }}>
                        {t("Reembolso 100%")}
                      </span>
                    </div>
                    <p className="small text-muted mb-3" style={{ fontSize: '0.82rem' }}>
                      {t("Por regra dos Termos de Uso, cancelamentos pelo anfitrião exigem estorno integral de 100% do valor pago via Mercado Pago (retenção zero).")}
                    </p>
                  </div>

                  <div className="pt-2 border-top" style={{ borderColor: 'var(--adm-err-bd)', fontSize: '0.88rem' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted">{t("Valor pago na reserva:")}</span>
                      <span className="fw-semibold text-dark">{fmtMoeda(simulacao.calculo.valorTotal)}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold" style={{ color: 'var(--adm-err-fg)' }}>
                        <i className="bi bi-arrow-counterclockwise me-1" />
                        {t("Valor a Estornar (Mercado Pago):")}
                      </span>
                      <span className="fw-bold fs-5" style={{ color: 'var(--adm-err-fg)' }}>
                        {fmtMoeda(simulacao.calculo.valorReembolso)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center small text-muted">
                      <span>{t("Retenção do anfitrião:")}</span>
                      <span>R$ 0,00 (0%)</span>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Motivo */}
            <div className="mb-2">
              <label htmlFor="motivo-cancelamento" className="form-label small fw-semibold text-muted mb-1">
                {t("Motivo do cancelamento (opcional — será enviado no e-mail do hóspede)")}
              </label>
              <textarea
                id="motivo-cancelamento"
                className="form-control"
                rows={2}
                maxLength={250}
                placeholder={t("Ex.: Manutenção urgente na estrutura do chalé.")}
                value={motivo}
                disabled={cancelando}
                onChange={e => setMotivo(e.target.value)}
                style={{ borderRadius: '10px', fontSize: '0.88rem', resize: 'vertical' }}
              />
            </div>
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer className="border-top pt-3 pb-3 px-3 px-md-4 d-flex justify-content-between align-items-center gap-2">
        <Button variant="outline-secondary" style={{ borderRadius: '50px', padding: '0.45rem 1.25rem', fontSize: '0.88rem' }} disabled={cancelando} onClick={aoFechar}>
          {t('Voltar')}
        </Button>
        {simulacao && (
          <Button
            variant="danger"
            style={{ borderRadius: '50px', padding: '0.45rem 1.4rem', fontSize: '0.88rem' }}
            disabled={cancelando}
            onClick={confirmar}
          >
            {cancelando ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                {t("Estornando no MP...")}
              </>
            ) : (
              <>
                <i className="bi bi-x-circle me-1" />
                {t('Confirmar Estorno ({valor})', { valor: fmtMoeda(simulacao.calculo.valorReembolso) })}
              </>
            )}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

// ─── Modal Responder Avaliação com Nota Confidencial do Anfitrião ─────────────
function ModalResponderAvaliacao({ avaliacao, aoFechar, aoResponder }) {
  const { t } = usePreferencias();
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
  const formularioValido = comentarioLimpo.length <= 255;

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
        throw new Error(dados.error || t('Não foi possível enviar a resposta. Tente novamente.'));
      }

      aoResponder(avaliacao.id, dados.respostaProprietario || comentarioLimpo);
    } catch (falha) {
      setErro(falha.message || t('Não foi possível enviar a resposta. Tente novamente.'));
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
          <Modal.Title>{t("Responder Avaliação & Avaliar Hóspede")}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="avaliacao-modal-contexto mb-3">
            <div className="mini-avatar">{(avaliacao.hospede?.nome || '?').charAt(0)}</div>
            <div>
              <div className="fw-bold" style={{ color: 'var(--rc-ink)' }}>{avaliacao.hospede?.nome}</div>
              <div className="text-muted small">
                {t('Reserva #{id}', { id: avaliacao.reserva?.id })} · {avaliacao.imovel?.nome || 'Recanto Camargo'}
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
              {t("Sua avaliação sobre este hóspede:")}
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
                    aria-label={t('Atribuir {n} estrelas ao hóspede', { n: estrela })}
                  >
                    <i
                      className={`bi ${ativo ? 'bi-star-fill text-warning' : 'bi-star text-muted'}`}
                      style={{ fontSize: '1.7rem' }}
                    />
                  </button>
                );
              })}
              <span className="fw-bold ms-2" style={{ color: 'var(--rc-ink)', fontSize: '1.1rem' }}>
                {t('{n} / 5 estrelas', { n: hoverNota || notaProprietario })}
              </span>
            </div>

            {/* Aviso Explicativo Obrigatório */}
            <div className="alerta-nota-confidencial mb-3">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-shield-lock-fill text-primary fs-5" />
                <span className="small text-muted">
                  <strong>{t("Esta nota é confidencial")}</strong> {t('e compõe a reputação interna do hóspede no sistema.')}
                </span>
              </div>
            </div>
          </div>

          {/* Campo de Resposta Pública */}
          <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
            <label htmlFor="comentario-proprietario" className="label-secao-modal mb-0">
              {t("Resposta Pública ao Hóspede")}
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
            placeholder={t("Agradeça a preferência ou envie uma mensagem acolhedora que será exibida publicamente...")}
            value={comentario}
            onChange={evento => setComentario(evento.target.value)}
            disabled={enviando}
            
            style={{ borderRadius: '12px', padding: '0.85rem 1rem', border: '1px solid var(--rc-line)', resize: 'vertical' }}
          />

          {erro && (
            <Alert variant="danger" className="border-0 mt-3 mb-0" role="alert">
              <i className="bi bi-exclamation-circle me-2" aria-hidden="true" />{erro}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 gap-2">
          <Button variant="outline-secondary" type="button" onClick={fechar} disabled={enviando} style={{ borderRadius: '50px' }}>
            {t("Cancelar")}
          </Button>
          <Button variant="primary" type="submit" disabled={!formularioValido || enviando} className="btn-acao-modal">
            {enviando ? (
              <><span className="spinner-border spinner-border-sm" aria-hidden="true" /> {t("Enviando...")}</>
            ) : (
              <><i className="bi bi-send me-1" aria-hidden="true" /> {t("Enviar resposta")}</>
            )}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

// ─── Modal Bloquear Datas (Manutenção / Proprietário) ─────────────────────────
function ModalBloquearDatas({ show, aoFechar, aoSalvar, reservasExistentes = [], bloqueiosExistentes = [] }) {
  const { t } = usePreferencias();
  const hojeStr = new Date().toISOString().slice(0, 10);
  const [dataInicio, setDataInicio] = useState(hojeStr);
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [motivo, setMotivo] = useState(() => t('Manutenção preventiva e reparos gerais'));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  // Detecção de Conflitos em Tempo Real
  const conflitoDetectado = useMemo(() => {
    if (!dataInicio || !dataFim || dataInicio > dataFim) return null;

    const fimComp = dataInicio === dataFim
      ? new Date(new Date(dataInicio + 'T00:00:00').getTime() + 86400000).toISOString().slice(0, 10)
      : dataFim;

    // Conflito com reservas
    const reservaConflitante = reservasExistentes.find(r => {
      if (r.status !== 'aprovada' && r.status !== 'concluida' && r.status !== 'pendente' && r.status !== 'pagamento pendente') return false;
      return r.checkin < fimComp && r.checkout > dataInicio;
    });

    if (reservaConflitante) {
      return {
        tipo: 'reserva',
        mensagem: t('Conflito com Reserva #{id} ({ini} a {fim})', { id: reservaConflitante.id, ini: fmtData(reservaConflitante.checkin), fim: fmtData(reservaConflitante.checkout) }),
      };
    }

    // Conflito com outros bloqueios
    const bloqueioConflitante = bloqueiosExistentes.find(b => {
      const bData = b.data ? String(b.data).slice(0, 10) : null;
      if (bData) return bData >= dataInicio && bData < fimComp;
      return b.dataInicio < fimComp && b.dataFim > dataInicio;
    });

    if (bloqueioConflitante) {
      return {
        tipo: 'bloqueio',
        mensagem: t('Conflito com Bloqueio existente ({data}): {motivo}', { data: fmtData(bloqueioConflitante.data || bloqueioConflitante.dataInicio), motivo: bloqueioConflitante.motivo }),
      };
    }

    return null;
  }, [dataInicio, dataFim, reservasExistentes, bloqueiosExistentes, t]);

  const submeter = async (e) => {
    e.preventDefault();
    if (!dataInicio || !dataFim || conflitoDetectado || enviando) return;
    setEnviando(true);
    setErro('');

    try {
      await aoSalvar({ dataInicio, dataFim, motivo: motivo.trim() || t('Bloqueio para manutenção') });
      aoFechar();
    } catch (err) {
      setErro(err.message || t('Não foi possível salvar o bloqueio.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal show={show} onHide={aoFechar} centered backdrop={enviando ? 'static' : true} className="adm-modal">
      <form onSubmit={submeter}>
        <Modal.Header closeButton={!enviando} className="modal-header-admin">
          <Modal.Title><i className="bi bi-shield-slash me-2" /> {t("Bloquear Datas para Manutenção")}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {erro && <Alert variant="danger">{erro}</Alert>}

          <Row className="g-3 mb-3">
            <Col sm={6}>
              <label htmlFor="bloq-inicio" className="form-label fw-semibold small text-muted">{t("Data de Entrada (Início)")}</label>
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
              <label htmlFor="bloq-fim" className="form-label fw-semibold small text-muted">{t("Data de Saída (Fim / Desocupação)")}</label>
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
              {t('Motivo do Bloqueio')} <span className="fw-normal text-muted">{t('(opcional — apenas para seu controle)')}</span>
            </label>
            <textarea
              id="bloq-motivo"
              rows={3}
              className="form-control"
              placeholder={t("Ex.: Conflito com Airbnb, uso pessoal da família, reparos...")}
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
            />
            <small className="text-muted d-block mt-1">{t("Este motivo é privado e serve como log interno para sua gestão.")}</small>
          </div>

          {dataInicio && dataFim && dataInicio <= dataFim && !conflitoDetectado && (
            <div className="alert alert-light border py-2 px-3 small d-flex align-items-center gap-2 mb-3 text-muted">
              <i className="bi bi-info-circle text-primary fs-6" />
              <span>
                {dataInicio === dataFim 
                  ? t('Bloqueio de 1 diária ({data}).', { data: fmtData(dataInicio) })
                  : t('Bloqueio de {n} diária(s) ({ini} a {fim} — imóvel liberado no check-out em {fim}).', { n: noites(dataInicio, dataFim), ini: fmtData(dataInicio), fim: fmtData(dataFim) })}
              </span>
            </div>
          )}

          {conflitoDetectado && (
            <Alert variant="warning" className="border-0 shadow-sm d-flex align-items-center gap-2 mb-0">
              <i className="bi bi-exclamation-triangle-fill fs-5 text-warning" />
              <div className="small">
                <strong>{t("Atenção:")}</strong> {conflitoDetectado.mensagem}. {t('Selecione outro período.')}
              </div>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={aoFechar} disabled={enviando} style={{ borderRadius: '50px' }}>
            {t("Cancelar")}
          </Button>
          <Button
            variant="warning"
            type="submit"
            className="fw-bold"
            disabled={!dataInicio || !dataFim || !!conflitoDetectado || enviando}
            style={{ borderRadius: '50px' }}
          >
            {enviando ? t('Bloqueando…') : t('Confirmar Bloqueio')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

// ─── Calendário de Ocupação com 2 Meses Lado a Lado ───────────────────────────
function agruparBloqueios(bloqueios) {
  // Junta dias seguidos com o mesmo motivo num único período (o banco guarda um registro por noite).
  const ordenados = [...bloqueios].sort((a, b) => String(a.data).localeCompare(String(b.data)));
  const grupos = [];
  ordenados.forEach(b => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.motivo === b.motivo) {
      const seguinte = new Date(`${ultimo.fim}T12:00:00Z`);
      seguinte.setUTCDate(seguinte.getUTCDate() + 1);
      if (seguinte.toISOString().slice(0, 10) === b.data) {
        ultimo.fim = b.data;
        ultimo.ids.push(b.id);
        return;
      }
    }
    grupos.push({ inicio: b.data, fim: b.data, motivo: b.motivo, ids: [b.id] });
  });
  return grupos;
}

function CalendarioOcupacao({ reservas, bloqueios, aoCriarBloqueio, aoRemoverBloqueio }) {
  const { t, idioma } = usePreferencias();
  const gruposBloqueio = useMemo(() => agruparBloqueios(bloqueios), [bloqueios]);
  const loc = localeDe(idioma);
  const [mesBase, setMesBase] = useState(() => new Date());
  const [showModalBloqueio, setShowModalBloqueio] = useState(false);

  const mesSeguinte = useMemo(() => {
    return new Date(mesBase.getFullYear(), mesBase.getMonth() + 1, 1);
  }, [mesBase]);

  // Mapeamento de reservas para cores do calendário
  const mapaStatus = useMemo(() => reservas.reduce((acc, r) => {
    if (r.status !== 'aprovada' && r.status !== 'pendente' && r.status !== 'pagamento pendente') return acc;
    const ini = new Date(r.checkin + 'T00:00:00');
    const fim = new Date(r.checkout + 'T00:00:00');
    for (let d = new Date(ini); d < fim; d = new Date(d.getTime() + 86400000)) {
      const k = d.toISOString().slice(0, 10);
      const st = (r.status === 'pagamento pendente' || r.status === 'pendente') ? 'pendente' : 'aprovada';
      if (!acc[k] || st === 'aprovada') acc[k] = st;
    }
    return acc;
  }, {}), [reservas]);

  // Mapeamento de bloqueios para hachura listrada amarela/âmbar
  const mapaBloqueios = useMemo(() => bloqueios.reduce((acc, b) => {
    // Nova arquitetura: blocos atômicos dia a dia
    if (b.data) {
      acc[String(b.data).slice(0, 10)] = b;
    } 
    // Fallback caso ainda exista algum dado na estrutura velha (range)
    else if (b.dataInicio && b.dataFim) {
      const ini = new Date(b.dataInicio + 'T00:00:00');
      const fim = new Date(b.dataFim + 'T00:00:00');
      for (let d = new Date(ini); d < fim; d = new Date(d.getTime() + 86400000)) {
        acc[d.toISOString().slice(0, 10)] = b;
      }
    }
    return acc;
  }, {}), [bloqueios]);

  const getIso = (d) => {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().split('T')[0];
  };

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null;
    const dStr = getIso(date);

    const dtAnt = new Date(date);
    dtAnt.setDate(dtAnt.getDate() - 1);
    const dAntStr = getIso(dtAnt);

    const normalizarStatus = (status) => {
      if (status === 'pagamento pendente') return 'pendente';
      return status;
    };

    const statusValidos = ['aprovada', 'pendente', 'pagamento pendente'];

    // Verificações para MANHÃ (Check-out)
    const resCheckout = reservas.find(r => statusValidos.includes(r.status) && r.checkout === dStr);
    const resMeio = reservas.find(r => statusValidos.includes(r.status) && r.checkin < dStr && r.checkout > dStr);
    const bloqAnterior = !!mapaBloqueios[dAntStr];
    const bloqAtual = !!mapaBloqueios[dStr];

    let manha = 'livre';
    if (resCheckout) manha = normalizarStatus(resCheckout.status);
    else if (resMeio) manha = normalizarStatus(resMeio.status);
    else if (bloqAnterior) manha = 'bloqueado';

    // Verificações para TARDE (Check-in / Pernoite)
    let tarde = 'livre';
    if (bloqAtual) {
      tarde = 'bloqueado';
    } else {
      const resTarde = reservas.find(r => statusValidos.includes(r.status) && r.checkin <= dStr && r.checkout > dStr);
      if (resTarde) tarde = normalizarStatus(resTarde.status);
    }

    // Se ambos os períodos forem iguais
    if (manha === tarde) {
      if (manha === 'aprovada') return 'dia-aprovado';
      if (manha === 'pendente') return 'dia-pendente';
      if (manha === 'bloqueado') return 'dia-bloqueado-manutencao';
      return null;
    }

    // Casos combinados (metade e metade)
    // 1. Reserva Aprovada e Bloqueio
    if (manha === 'aprovada' && tarde === 'bloqueado') return 'dia-split-reserva-bloqueio';
    if (manha === 'bloqueado' && tarde === 'aprovada') return 'dia-split-bloqueio-reserva';

    // 2. Reserva Pendente e Bloqueio
    if (manha === 'pendente' && tarde === 'bloqueado') return 'dia-split-pendente-bloqueio';
    if (manha === 'bloqueado' && tarde === 'pendente') return 'dia-split-bloqueio-pendente';

    // 3. Reserva Aprovada e Livre (Entrada / Saída)
    if (manha === 'aprovada' && tarde === 'livre') return 'dia-split-reserva-livre';
    if (manha === 'livre' && tarde === 'aprovada') return 'dia-split-livre-reserva';

    // 4. Reserva Pendente e Livre (Entrada / Saída)
    if (manha === 'pendente' && tarde === 'livre') return 'dia-split-pendente-livre';
    if (manha === 'livre' && tarde === 'pendente') return 'dia-split-livre-pendente';

    // 5. Bloqueio e Livre (Entrada / Saída)
    if (manha === 'bloqueado' && tarde === 'livre') return 'dia-split-bloqueio-livre';
    if (manha === 'livre' && tarde === 'bloqueado') return 'dia-split-livre-bloqueio';

    // 6. Reserva Aprovada e Reserva Pendente
    if (manha === 'aprovada' && tarde === 'pendente') return 'dia-split-reserva-pendente';
    if (manha === 'pendente' && tarde === 'aprovada') return 'dia-split-pendente-reserva';

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
          <h5 className="mb-0 fw-bold" style={{ color: 'var(--rc-ink)' }}>{t("Calendário de Ocupação & Manutenção")}</h5>
          <span className="text-muted small">{t("Visualização de 2 meses simultâneos")}</span>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="d-flex gap-1 me-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              style={{ borderRadius: '50px' }}
              onClick={() => mudarMes(-1)}
              title={t("Mês Anterior")}
            >
              {t("‹ Anterior")}
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              style={{ borderRadius: '50px' }}
              onClick={() => setMesBase(new Date())}
              title={t("Voltar para Hoje")}
            >
              {t('Hoje')}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              style={{ borderRadius: '50px' }}
              onClick={() => mudarMes(1)}
              title={t("Próximo Mês")}
            >
              {t("Próximo ›")}
            </button>
          </div>

          <Button
            className="fw-bold d-inline-flex align-items-center gap-2 btn-bloquear-datas-admin"
            style={{ borderRadius: '50px' }}
            onClick={() => setShowModalBloqueio(true)}
          >
            <i className="bi bi-shield-slash" /> {t("Bloquear Datas")}
          </Button>
        </div>
      </div>

      {/* Legenda das Cores */}
      <div className="legenda-calendario mb-3 p-2 bg-light rounded-3 d-flex align-items-center gap-3 flex-wrap">
        <span className="legenda-item"><span className="dot dot-aprovada" /> {t("Reserva Confirmada")}</span>
        <span className="legenda-item"><span className="dot dot-pendente" /> {t("Reserva Pendente")}</span>
        <span className="legenda-item"><span className="dot dot-bloqueado" /> {t("Bloqueio Manual (Hachura)")}</span>
        <span className="legenda-item text-muted small"><i className="bi bi-circle-half me-1" /> {t("Metade dividida: Saída (manhã) / Entrada (tarde)")}</span>
      </div>

      {/* Grid de 2 Meses Lado a Lado */}
      <div className="calendario-duplo-grid">
        <div className="calendario-mes-coluna">
          <div className="calendario-mes-titulo">
            {mesBase.toLocaleString(loc, { month: 'long', year: 'numeric' })}
          </div>
          <Calendar
            locale={loc}
            activeStartDate={mesBase}
            onActiveStartDateChange={({ activeStartDate }) => setMesBase(activeStartDate || new Date())}
            tileClassName={tileClassName}
            className="calendario-admin-custom w-100"
            showNavigation={false}
          />
        </div>

        <div className="calendario-mes-coluna">
          <div className="calendario-mes-titulo">
            {mesSeguinte.toLocaleString(loc, { month: 'long', year: 'numeric' })}
          </div>
          <Calendar
            locale={loc}
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
          <h6 className="fw-bold mb-0" style={{ color: 'var(--rc-ink)' }}>
            <i className="bi bi-cone-striped me-2 text-warning" />
            {t('Períodos bloqueados ({n})', { n: gruposBloqueio.length })}
          </h6>
        </div>

        {bloqueios.length === 0 ? (
          <p className="text-muted small mb-0">{t("Nenhum bloqueio cadastrado. Todas as datas livres estão disponíveis para reservas.")}</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {gruposBloqueio.map(b => (
              <div key={b.ids.join('-')} className="item-bloqueio-card">
                <div className="d-flex align-items-center gap-3">
                  <div className="avatar-checkin" style={{ background: 'var(--adm-star)', width: 36, height: 36, fontSize: '0.9rem' }}>
                    <i className="bi bi-tools" />
                  </div>
                  <div>
                    <div className="fw-bold" style={{ color: 'var(--adm-warn-fg)' }}>{b.motivo}</div>
                    <div className="text-muted small">
                      <i className="bi bi-calendar-event me-1" />
                      {b.inicio === b.fim ? fmtData(b.inicio) : `${fmtData(b.inicio)} – ${fmtData(b.fim)}`}
                      {' '}{t(b.ids.length === 1 ? '(1 noite bloqueada)' : '({n} noites bloqueadas)', { n: b.ids.length })}
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline-danger"
                  size="sm"
                  style={{ borderRadius: '50px' }}
                  onClick={() => b.ids.forEach(id => aoRemoverBloqueio(id))}
                  title={t("Remover bloqueio e liberar datas")}
                >
                  <i className="bi bi-trash3 me-1" /> {t("Desbloquear")}
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
  const { t } = usePreferencias();
  const [codigo, setCodigo] = useState('');
  const [tipo, setTipo] = useState('PERCENTUAL');
  const [valor, setValor] = useState('');
  const [publico, setPublico] = useState('TODOS');
  
  // Hóspede específico (busca + seleção com abinha/dropdown)
  const [buscaHospede, setBuscaHospede] = useState('');
  const [hospedeSelecionado, setHospedeSelecionado] = useState(null);
  const [sugestoesHospedes, setSugestoesHospedes] = useState([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [minimoNoites, setMinimoNoites] = useState(1);
  const [valorMinimo, setValorMinimo] = useState('');
  const [limiteUso, setLimiteUso] = useState('');
  const [validade, setValidade] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickFora = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMostrarDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  // Busca hóspedes na API quando o público for CLIENTE_ESPECIFICO
  useEffect(() => {
    if (!show || publico !== 'CLIENTE_ESPECIFICO' || hospedeSelecionado) {
      return;
    }

    const timer = setTimeout(async () => {
      setCarregandoSugestoes(true);
      try {
        const queryParam = encodeURIComponent(buscaHospede.trim());
        const res = await fetch(`${API_BASE}/api/proprietario/hospedes/buscar?q=${queryParam}`, {
          credentials: 'include'
        });
        if (res.ok) {
          const dados = await res.json();
          setSugestoesHospedes(dados || []);
        }
      } catch (err) {
        console.error('Erro ao buscar sugestões de hóspedes:', err);
      } finally {
        setCarregandoSugestoes(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [show, publico, buscaHospede, hospedeSelecionado]);

  // Reseta campos quando o modal abre ou fecha
  useEffect(() => {
    if (!show) {
      setCodigo('');
      setTipo('PERCENTUAL');
      setValor('');
      setPublico('TODOS');
      setBuscaHospede('');
      setHospedeSelecionado(null);
      setSugestoesHospedes([]);
      setMostrarDropdown(false);
      setMinimoNoites(1);
      setValorMinimo('');
      setLimiteUso('');
      setErro('');
    }
  }, [show]);

  const submeter = async (e) => {
    e.preventDefault();
    if (!codigo.trim() || !valor || !validade || enviando) return;

    if (publico === 'CLIENTE_ESPECIFICO' && !hospedeSelecionado && !buscaHospede.trim()) {
      setErro(t('Por favor, selecione um hóspede da lista para este cupom específico.'));
      return;
    }

    setEnviando(true);
    setErro('');

    try {
      await aoSalvar({
        codigo: codigo.trim().toUpperCase(),
        tipoDesconto: tipo,
        valorDesconto: Number(valor),
        publicoAlvo: publico,
        clienteId: publico === 'CLIENTE_ESPECIFICO'
          ? (hospedeSelecionado ? hospedeSelecionado.id : buscaHospede.trim())
          : null,
        minimoNoites: Number(minimoNoites) || 1,
        valorMinimo: Number(valorMinimo) || 0,
        limiteUso: limiteUso && Number(limiteUso) > 0 ? Number(limiteUso) : (publico === 'CLIENTE_ESPECIFICO' ? 1 : null),
        validoAte: validade,
        ativo: true,
      });
      aoFechar();
    } catch (err) {
      setErro(err.message || t('Erro ao criar cupom.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal show={show} onHide={aoFechar} centered backdrop={enviando ? 'static' : true} className="adm-modal">
      <form onSubmit={submeter}>
        <Modal.Header closeButton={!enviando} className="modal-header-admin">
          <Modal.Title><i className="bi bi-tag-fill me-2" /> {t("Criar Novo Cupom de Desconto")}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {erro && <Alert variant="danger">{erro}</Alert>}

          <Row className="g-3 mb-3">
            <Col sm={6}>
              <label htmlFor="cupom-codigo" className="form-label fw-semibold small text-muted">{t("Código do Cupom *")}</label>
              <input
                id="cupom-codigo"
                type="text"
                className="form-control text-uppercase fw-bold"
                placeholder={t("Ex.: PEREGRINO10")}
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                required
              />
            </Col>
            <Col sm={6}>
              <label htmlFor="cupom-tipo" className="form-label fw-semibold small text-muted">{t("Tipo de Desconto *")}</label>
              <select
                id="cupom-tipo"
                className="form-select"
                value={tipo}
                onChange={e => setTipo(e.target.value)}
              >
                <option value="PERCENTUAL">{t("Percentual (%)")}</option>
                <option value="FIXO">{t("Valor Fixo (R$)")}</option>
              </select>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col sm={6}>
              <label htmlFor="cupom-valor" className="form-label fw-semibold small text-muted">
                {t('Valor do Desconto')} {tipo === 'PERCENTUAL' ? '(%)' : '(R$)'} *
              </label>
              <input
                id="cupom-valor"
                type="number"
                step="any"
                min="1"
                className="form-control"
                placeholder={tipo === 'PERCENTUAL' ? t('Ex.: 10') : t('Ex.: 50')}
                value={valor}
                onChange={e => setValor(e.target.value)}
                required
              />
            </Col>
            <Col sm={6}>
              <label htmlFor="cupom-publico" className="form-label fw-semibold small text-muted">{t("Público-Alvo & Elegibilidade *")}</label>
              <select
                id="cupom-publico"
                className="form-select"
                value={publico}
                onChange={e => {
                  const val = e.target.value;
                  setPublico(val);
                  if (val === 'CLIENTE_ESPECIFICO') {
                    setLimiteUso('1');
                  } else if (limiteUso === '1') {
                    setLimiteUso('');
                  }
                  if (val !== 'CLIENTE_ESPECIFICO') {
                    setHospedeSelecionado(null);
                    setBuscaHospede('');
                  }
                }}
              >
                <option value="TODOS">{t("Todos os Clientes (Geral)")}</option>
                <option value="PRIMEIRA_RESERVA">{t("Cliente Novo (1ª Reserva)")}</option>
                <option value="CLIENTE_RETORNANTE">{t('Cliente Retornante (> 6 meses sem reserva)')}</option>
                <option value="CLIENTE_RECORRENTE">{t("Cliente Recorrente (2+ reservas)")}</option>
                <option value="CLIENTE_ESPECIFICO">{t("Hóspede Específico (Fidelidade)")}</option>
              </select>
            </Col>
          </Row>

          {publico === 'CLIENTE_ESPECIFICO' && (
            <div className="mb-3 position-relative" ref={dropdownRef}>
              <label htmlFor="cupom-cliente" className="form-label fw-semibold small text-muted d-flex justify-content-between">
                <span>{t("Hóspede Específico *")}</span>
                <span className="text-primary fw-normal" style={{ fontSize: '0.78rem' }}>
                  <i className="bi bi-person-check me-1" /> {t("Selecione da lista abaixo")}
                </span>
              </label>

              {hospedeSelecionado ? (
                <div className="p-2 px-3 rounded-3 border bg-light d-flex align-items-center justify-content-between shadow-sm" style={{ borderColor: 'var(--adm-ok-bd)' }}>
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: 34, height: 34, fontSize: '0.85rem' }}>
                      {hospedeSelecionado.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
                        {hospedeSelecionado.nome}
                        <span className="badge bg-success-subtle text-success border border-success-subtle ms-2" style={{ fontSize: '0.72rem' }}>
                          {t("✓ Selecionado")}
                        </span>
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                        {hospedeSelecionado.email}
                        {hospedeSelecionado.telefone ? ` • ${fmtTelefone(hospedeSelecionado.telefone)}` : ''}
                        {hospedeSelecionado.totalReservas > 0 ? ` • ${t('{n} reserva(s)', { n: hospedeSelecionado.totalReservas })}` : ''}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    className="py-1 px-2"
                    style={{ fontSize: '0.78rem', borderRadius: '20px' }}
                    onClick={() => {
                      setHospedeSelecionado(null);
                      setBuscaHospede('');
                      setMostrarDropdown(true);
                    }}
                  >
                    <i className="bi bi-arrow-repeat me-1" /> {t("Trocar")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0 text-muted">
                      <i className="bi bi-search" />
                    </span>
                    <input
                      id="cupom-cliente"
                      type="text"
                      className="form-control border-start-0"
                      placeholder={t("Digite o nome ou e-mail (ex.: Felipe)...")}
                      value={buscaHospede}
                      onChange={e => {
                        setBuscaHospede(e.target.value);
                        setMostrarDropdown(true);
                      }}
                      onFocus={() => setMostrarDropdown(true)}
                      autoComplete="off"
                      required
                    />
                    {buscaHospede && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-start-0"
                        onClick={() => {
                          setBuscaHospede('');
                          setMostrarDropdown(true);
                        }}
                      >
                        <i className="bi bi-x-lg" style={{ fontSize: '0.8rem' }} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown de sugestões flutuante */}
                  {mostrarDropdown && (
                    <div
                      className="position-absolute w-100 bg-white border rounded-3 shadow-lg mt-1"
                      style={{ zIndex: 1050, maxHeight: '220px', overflowY: 'auto' }}
                    >
                      {carregandoSugestoes ? (
                        <div className="p-3 text-center text-muted small">
                          <span className="spinner-border spinner-border-sm me-2" /> {t("Buscando hóspedes...")}
                        </div>
                      ) : sugestoesHospedes.length > 0 ? (
                        <div className="py-1">
                          <div className="px-3 py-1 bg-light border-bottom text-muted text-uppercase fw-bold" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                            {buscaHospede ? t('Hóspedes encontrados ({n})', { n: sugestoesHospedes.length }) : t('Hóspedes no sistema (clique para escolher)')}
                          </div>
                          {sugestoesHospedes.map(h => (
                            <div
                              key={h.id}
                              className="px-3 py-2 btn-sugestao-hospede d-flex align-items-center justify-content-between"
                              style={{ cursor: 'pointer', borderBottom: '1px solid var(--rc-line)' }}
                              onClick={() => {
                                setHospedeSelecionado(h);
                                setBuscaHospede(h.nome);
                                setMostrarDropdown(false);
                                setErro('');
                              }}
                            >
                              <div className="d-flex align-items-center gap-2">
                                <div className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                                  {h.nome.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-semibold text-dark" style={{ fontSize: '0.88rem' }}>
                                    {h.nome}
                                  </div>
                                  <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                                    {h.email} {h.telefone ? `• ${fmtTelefone(h.telefone)}` : ''}
                                  </div>
                                </div>
                              </div>
                              <span className="badge bg-light text-secondary border" style={{ fontSize: '0.72rem' }}>
                                {t('{n} reserva(s)', { n: h.totalReservas })}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-muted small">
                          <i className="bi bi-person-x me-1 text-danger" /> {t('Nenhum hóspede cadastrado encontrado para "{busca}".', { busca: buscaHospede })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <Row className="g-3 mb-3">
            <Col sm={6}>
              <label htmlFor="cupom-noites" className="form-label fw-semibold small text-muted">{t("Mínimo de Noites")}</label>
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
              <label htmlFor="cupom-valormin" className="form-label fw-semibold small text-muted">{t("Valor Mínimo Reserva (R$)")}</label>
              <input
                id="cupom-valormin"
                type="number"
                step="any"
                min="0"
                className="form-control"
                placeholder={t("Opcional")}
                value={valorMinimo}
                onChange={e => setValorMinimo(e.target.value)}
              />
            </Col>
          </Row>

          <Row className="g-3 mb-2">
            <Col sm={6}>
              <label htmlFor="cupom-validade" className="form-label fw-semibold small text-muted">{t("Data de Validade *")}</label>
              <input
                id="cupom-validade"
                type="date"
                className="form-control"
                value={validade}
                onChange={e => setValidade(e.target.value)}
                required
              />
            </Col>
            <Col sm={6}>
              <label htmlFor="cupom-limite" className="form-label fw-semibold small text-muted">{t("Quantidade de Usos")}</label>
              <input
                id="cupom-limite"
                type="number"
                min="1"
                className="form-control"
                placeholder={publico === 'CLIENTE_ESPECIFICO' ? t('1 (Exclusivo)') : t('Opcional (Ilimitado)')}
                value={limiteUso}
                onChange={e => setLimiteUso(e.target.value)}
              />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={aoFechar} disabled={enviando} style={{ borderRadius: '50px' }}>
            {t("Cancelar")}
          </Button>
          <Button variant="primary" type="submit" disabled={enviando} style={{ borderRadius: '50px' }}>
            {enviando ? t('Criando…') : t('Salvar Cupom')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

// ─── Aba de Gestão de Cupons ─────────────────────────────────────────────────
function ModalEditarCupom({ cupom, aoFechar, aoSalvar }) {
  const { t } = usePreferencias();
  const [form, setForm] = useState({ valor: '', validade: '', limite: '', minNoites: '1', valMin: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!cupom) return;
    setErro('');
    setForm({
      valor: String(cupom.valorDesconto ?? ''),
      validade: String(cupom.validoAte || '').slice(0, 10),
      limite: cupom.limiteUso && cupom.limiteUso < 999999 ? String(cupom.limiteUso) : '',
      minNoites: String(cupom.minimoNoites || 1),
      valMin: cupom.valorMinimo ? String(cupom.valorMinimo) : '',
    });
  }, [cupom]);

  if (!cupom) return null;
  const percentual = cupom.tipoDesconto === 'PERCENTUAL';
  const mudar = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }));

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      await aoSalvar(cupom.id, {
        valorDesconto: Number(form.valor),
        validoAte: form.validade,
        limiteUso: form.limite === '' ? null : Number(form.limite),
        minimoNoites: Number(form.minNoites) || 1,
        valorMinimo: form.valMin === '' ? 0 : Number(form.valMin),
      });
      aoFechar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal show onHide={aoFechar} centered>
      <form onSubmit={salvar}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">{t('Editar cupom {codigo}', { codigo: cupom.codigo })}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small">{t('Código, tipo de desconto e público não mudam. Para isso, crie um cupom novo.')}</p>
          <Row className="g-3">
            <Col xs={6}>
              <label className="form-label small fw-semibold" htmlFor="ed-valor">{percentual ? t('Desconto (%)') : t('Desconto (R$)')}</label>
              <input id="ed-valor" className="form-control" type="number" min="0.01" step="0.01" max={percentual ? 100 : undefined} required value={form.valor} onChange={mudar('valor')} />
            </Col>
            <Col xs={6}>
              <label className="form-label small fw-semibold" htmlFor="ed-validade">{t('Válido até')}</label>
              <input id="ed-validade" className="form-control" type="date" required value={form.validade} onChange={mudar('validade')} />
            </Col>
            <Col xs={6}>
              <label className="form-label small fw-semibold" htmlFor="ed-limite">{t('Limite de usos')}</label>
              <input id="ed-limite" className="form-control" type="number" min={Math.max(1, cupom.totalUsos || 0)} step="1" placeholder={t('Ilimitado')} value={form.limite} onChange={mudar('limite')} />
            </Col>
            <Col xs={6}>
              <label className="form-label small fw-semibold" htmlFor="ed-min">{t('Mínimo de noites')}</label>
              <input id="ed-min" className="form-control" type="number" min="1" step="1" value={form.minNoites} onChange={mudar('minNoites')} />
            </Col>
            <Col xs={12}>
              <label className="form-label small fw-semibold" htmlFor="ed-valmin">{t('Valor mínimo da reserva (R$)')}</label>
              <input id="ed-valmin" className="form-control" type="number" min="0" step="0.01" placeholder={t('Opcional')} value={form.valMin} onChange={mudar('valMin')} />
            </Col>
          </Row>
          {erro && <Alert variant="danger" className="mt-3 mb-0 py-2 small">{erro}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={aoFechar} style={{ borderRadius: '50px' }}>{t('Cancelar')}</Button>
          <Button type="submit" disabled={salvando} style={{ borderRadius: '50px', background: 'var(--rc-u1)', borderColor: 'var(--rc-u1)' }}>
            {salvando ? t('Salvando...') : t('Salvar alterações')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

function PainelCupons({ cupons, aoAlternarStatus, aoCriarCupom, aoEditarCupom }) {
  const { t } = usePreferencias();
  const [copiadoId, setCopiadoId] = useState(null);
  const [cupomEditando, setCupomEditando] = useState(null);
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
          <h5 className="mb-0 fw-bold" style={{ color: 'var(--rc-ink)' }}>{t("Cupons Promocionais de Desconto")}</h5>
          <span className="text-muted small">{t("Crie e gerencie vouchers especiais para os peregrinos")}</span>
        </div>
        <Button
          variant="primary"
          className="d-inline-flex align-items-center gap-2 fw-semibold"
          style={{ borderRadius: '50px', background: 'var(--rc-u1)', borderColor: 'var(--rc-u1)' }}
          onClick={() => setShowModal(true)}
        >
          <i className="bi bi-plus-lg" /> {t("Criar Novo Cupom")}
        </Button>
      </div>

      {cupons.length === 0 ? (
        <div className="text-center py-5 bg-white rounded-4 shadow-sm border p-4">
          <i className="bi bi-ticket-perforated fs-1 text-muted opacity-50 d-block mb-3" />
          <h5 className="fw-bold" style={{ color: 'var(--rc-ink)' }}>{t("Nenhum cupom ativo no momento")}</h5>
          <p className="text-muted small mb-3">{t("Crie um cupom para incentivar reservas de peregrinos e famílias.")}</p>
          <Button variant="primary" onClick={() => setShowModal(true)} style={{ borderRadius: '50px' }}>
            {t("Criar Primeiro Cupom")}
          </Button>
        </div>
      ) : (
        <div className="cupons-grid-admin">
          {cupons.map(c => {
            const publicoCfg = PUBLICO_CFG[c.publicoAlvo] || PUBLICO_CFG.TODOS;
            const esgotado = Boolean(c.limiteUso && c.limiteUso < 999999 && c.totalUsos >= c.limiteUso);
            return (
              <div key={c.id} className={`card-cupom-moderno ${c.expirado ? 'inativo opacity-75' : esgotado ? 'inativo opacity-75' : (!c.ativo ? 'inativo' : '')}`}>
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className={publicoCfg.classeBadge}>
                      <i className={`bi ${publicoCfg.icone} me-1`} />
                      {t(publicoCfg.label)}
                    </span>
                    <div className="d-flex gap-1 align-items-center">
                      {c.expirado ? (
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle small">
                          {t("Vencido")}
                        </span>
                      ) : esgotado ? (
                        <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle small">
                          {c.publicoAlvo === 'CLIENTE_ESPECIFICO' ? t('Utilizado') : t('Esgotado')}
                        </span>
                      ) : null}
                      <span className="badge bg-light text-muted border small">
                        {c.tipoDesconto === 'PERCENTUAL' ? t('Desconto %') : t('Desconto R$')}
                      </span>
                    </div>
                  </div>

                  <div className="cupom-valor-destaque mb-1">
                    {c.tipoDesconto === 'PERCENTUAL' ? `${c.valorDesconto}% OFF` : `${fmtMoeda(c.valorDesconto)} OFF`}
                  </div>

                  {(c.clienteNome || c.clienteId) && (
                    <div
                      className="text-muted small mb-2 text-truncate"
                      title={c.clienteEmail ? `${c.clienteNome || t('Hóspede')} (${c.clienteEmail})` : (c.clienteNome || undefined)}
                    >
                      <i className="bi bi-person me-1" />
                      {t("Para:")} <strong>{c.clienteNome || c.clienteEmail || t('Hóspede #{id}', { id: c.clienteId })}</strong>
                    </div>
                  )}

                  <div className="cupom-codigo-box">
                    <span className="cupom-codigo-texto">{c.codigo}</span>
                    <button
                      type="button"
                      className="btn-copiar-cupom"
                      onClick={() => setCupomEditando(c)}
                      aria-label={t('Editar cupom {codigo}', { codigo: c.codigo })}
                    >
                      <i className="bi bi-pencil" /> {t('Editar')}
                    </button>
                    <button
                      type="button"
                      className="btn-copiar-cupom"
                      onClick={() => copiarCodigo(c.codigo, c.id)}
                    >
                      {copiadoId === c.id ? (
                        <><i className="bi bi-check2 text-success" /> {t('Copiado!')}</>
                      ) : (
                        <><i className="bi bi-clipboard" /> {t('Copiar')}</>
                      )}
                    </button>
                  </div>

                  <div className="d-flex flex-column gap-1 text-muted small mt-2">
                    <span>
                      <i className="bi bi-moon-stars me-1 text-primary" />
                      {c.minimoNoites > 1 ? t('Mínimo de {n} noites', { n: c.minimoNoites }) : t('Sem mínimo de noites')}
                    </span>
                    {c.valorMinimo > 0 && (
                      <span>
                        <i className="bi bi-cash me-1 text-success" />
                        {t('Em reservas a partir de {valor}', { valor: fmtMoeda(c.valorMinimo) })}
                      </span>
                    )}
                    <span>
                      <i className="bi bi-ticket-perforated me-1 text-primary" />
                      {c.limiteUso && c.limiteUso < 999999
                        ? t('Limite: {n} {usos} (Utilizado: {total})', { n: c.limiteUso, usos: c.limiteUso === 1 ? t('uso') : t('usos'), total: c.totalUsos })
                        : t('Utilizações: {total} (Ilimitado)', { total: c.totalUsos })
                      }
                    </span>
                    <span>
                      <i className={`bi bi-calendar3 me-1 ${c.expirado ? 'text-danger' : 'text-warning'}`} />
                      {t('Válido até:')} <strong className={c.expirado ? 'text-danger' : ''}>{fmtData(c.validoAte)} {c.expirado && t('(Expirado)')}</strong>
                    </span>
                  </div>
                </div>

                <div className="d-flex align-items-center justify-content-between pt-3 border-top mt-3">
                  {c.expirado ? (
                    <span className="fw-semibold small text-danger">
                      <i className="bi bi-x-circle-fill me-1" style={{ fontSize: '0.55rem' }} />
                      {t("Cupom Expirado")}
                    </span>
                  ) : esgotado ? (
                    <span className="fw-semibold small text-secondary">
                      <i className="bi bi-check-circle-fill me-1 text-secondary" style={{ fontSize: '0.65rem' }} />
                      {c.publicoAlvo === 'CLIENTE_ESPECIFICO' ? t('Já Utilizado ({total}/{limite})', { total: c.totalUsos, limite: c.limiteUso }) : t('Esgotado ({total}/{limite})', { total: c.totalUsos, limite: c.limiteUso })}
                    </span>
                  ) : (
                    <span className={`fw-semibold small ${c.ativo ? 'text-success' : 'text-muted'}`}>
                      <i className={`bi bi-circle-fill me-1 ${c.ativo ? 'text-success' : 'text-secondary'}`} style={{ fontSize: '0.45rem' }} />
                      {c.ativo ? t('Cupom Ativo') : t('Cupom Pausado')}
                    </span>
                  )}
                  <div
                    className="form-check form-switch m-0"
                    title={
                      c.expirado
                        ? t('Cupom expirado pela data de validade')
                        : esgotado
                        ? t('Cupom já atingiu o limite de utilizações')
                        : ''
                    }
                  >
                    <input
                      className="form-check-input switch-cupom-input"
                      type="checkbox"
                      role="switch"
                      checked={c.ativo && !c.expirado && !esgotado}
                      disabled={c.expirado || esgotado}
                      onChange={() => aoAlternarStatus(c.id, c.ativo)}
                      aria-label={
                        c.expirado
                          ? t('Cupom {codigo} expirado', { codigo: c.codigo })
                          : esgotado
                          ? t('Cupom {codigo} esgotado', { codigo: c.codigo })
                          : t('Ativar ou pausar cupom {codigo}', { codigo: c.codigo })
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModalEditarCupom cupom={cupomEditando} aoFechar={() => setCupomEditando(null)} aoSalvar={aoEditarCupom} />

      <ModalCriarCupom
        show={showModal}
        aoFechar={() => setShowModal(false)}
        aoSalvar={aoCriarCupom}
      />
    </div>
  );
}

// ─── Tabela de Gerenciamento de Reservas ───────────────────────────────────────
function TabelaReservas({ reservas, onVer, onCancelar, filtro, setFiltro, reservasGerais }) {
  const { t } = usePreferencias();
  const baseContagem = reservasGerais || reservas;
  const lista = filtro === 'todas' ? reservas : reservas.filter(r => r.status === filtro);
  const cnt   = s => s === 'todas' ? baseContagem.length : baseContagem.filter(r => r.status === s).length;

  return (
    <div className="tabela-wrapper-admin mb-4">
      <div className="tabela-header-admin">
        <h5 className="mb-0 fw-bold" style={{ color: 'var(--rc-ink)' }}>{t("Gerenciar Reservas")}</h5>
        <div className="filtros-status-admin">
          {['todas', 'pendente', 'pagamento pendente', 'aprovada', 'concluida', 'recusada', 'cancelada'].map(f => (
            <button
              key={f}
              type="button"
              className={`filtro-btn-admin${filtro === f ? ' ativo' : ''}`}
              onClick={() => setFiltro(f)}
            >
              {f === 'todas' ? t('Todas') : t(STATUS_CFG[f]?.label)}
              <span className="filtro-count">{cnt(f)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="table-responsive">
        <table className="tabela-admin">
          <thead>
            <tr>
              <th>ID</th><th>{t('Hóspede')}</th><th>{t("Check-in")}</th><th>{t("Check-out")}</th>
              <th className="d-none d-md-table-cell">{t("Noites")}</th>
              <th>{t('Total')}</th><th>Status</th><th>{t("Ações")}</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-5 text-muted">
                <i className="bi bi-calendar-x fs-2 d-block mb-2 opacity-50" />{t("Nenhuma reserva encontrada")}
              </td></tr>
            ) : lista.map(r => (
              <tr key={r.id} className="linha-tabela-admin">
                <td><span className="id-reserva">#{r.id}</span></td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <div className="mini-avatar">{(r.nome || r.hospede || '?').charAt(0)}</div>
                    <div>
                      <div className="fw-semibold" style={{ fontSize: '0.875rem' }}>{r.nome || r.hospede}</div>
                      <div className="text-muted d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}><SeloUnidade imovelId={r.imovelId} /> {t('{n} pessoa(s)', { n: r.hospedes })}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: '0.875rem' }}>{fmtData(r.checkin)}</td>
                <td style={{ fontSize: '0.875rem' }}>{fmtData(r.checkout)}</td>
                <td className="d-none d-md-table-cell text-center" style={{ fontSize: '0.875rem' }}>{noites(r.checkin, r.checkout)}</td>
                <td className="fw-bold" style={{ color: 'var(--adm-ok-fg)', fontSize: '0.875rem' }}>{fmtMoeda(r.total || r.valorTotal)}</td>
                <td>
                  <BadgeStatus status={r.status} />
                  {r.status === 'cancelada' && Number(r.valorReembolsado) > 0 && (
                    <div className="small fw-semibold text-success mt-1" style={{ fontSize: '0.72rem' }}>
                      <i className="bi bi-arrow-counterclockwise me-1" />
                      {t('Estorno:')} {fmtMoeda(r.valorReembolsado)}
                    </div>
                  )}
                </td>
                <td>
                  <div className="acoes-tabela">
                    <button className="btn-acao-tabela ver" onClick={() => onVer(r)} title={t("Ver detalhes")}><i className="bi bi-eye" /></button>
                    {r.status === 'aprovada' && (
                      <>
                        <button className="btn-acao-tabela text-danger" onClick={() => onCancelar && onCancelar(r)} title={t("Cancelar com Estorno")}><i className="bi bi-x-circle" /></button>
                        <button className="btn-acao-tabela concluir text-primary" onClick={() => onVer(r)} title={t("Concluir Estadia")}><i className="bi bi-check2-circle" /></button>
                      </>
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
  const { t } = usePreferencias();
  if (carregando) {
    return (
      <div className="estado-avaliacoes-admin" role="status" aria-live="polite">
        <span className="spinner-border text-primary" aria-hidden="true" />
        <span>{t("Carregando avaliações...")}</span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="estado-avaliacoes-admin erro" role="alert">
        <i className="bi bi-exclamation-triangle" aria-hidden="true" />
        <h5>{t("Não foi possível carregar as avaliações")}</h5>
        <p>{erro}</p>
        <Button variant="outline-primary" onClick={aoTentarNovamente}>{t('Tentar novamente')}</Button>
      </div>
    );
  }

  if (avaliacoes.length === 0) {
    return (
      <div className="estado-avaliacoes-admin">
        <i className="bi bi-chat-square-heart" aria-hidden="true" />
        <h5>{t("Nenhuma avaliação aguardando resposta")}</h5>
        <p>{t("Quando um hóspede avaliar uma estadia concluída, ela aparecerá aqui para você responder.")}</p>
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
            titulo={t("Aguardando Resposta")}
            valor={avaliacoes.length}
            sub={t("avaliações pendentes")}
            cor="var(--adm-star)"
          />
        </Col>
        <Col xs={12} sm={6} xl={4}>
          <CardKpiModerno
            icone={<i className="bi bi-star-fill fs-4" aria-hidden="true" />}
            titulo={t("Média Recebida")}
            valor={media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            sub={t("entre as pendentes")}
            cor="var(--rc-u1)"
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
                  <div className="fw-bold" style={{ color: 'var(--rc-ink)' }}>{avaliacao.hospede?.nome}</div>
                  <div className="text-muted small">{t('Reserva #{id}', { id: avaliacao.reserva?.id })}</div>
                </div>
              </div>
              <span className="badge-resposta-pendente">{t("A responder")}</span>
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
              <i className="bi bi-reply me-2" aria-hidden="true" />{t("Responder & Avaliar Hóspede")}
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

// ─── Previsão de Receita (Aba dedicada) ───────────────────────────────────────
function PrevisaoReceita({ reservas }) {
  const { t, idioma } = usePreferencias();
  const hoje = new Date();
  const meses = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    return {
      label: d.toLocaleString(localeDe(idioma), { month: 'short' }).replace('.', ''),
      ano: d.getFullYear(),
      mes: d.getMonth(),
    };
  });

  const dadosMeses = meses.map(({ label, ano, mes }) => {
    const doMes = reservas.filter(r => {
      const ini = new Date(r.checkin + 'T00:00:00');
      return ini.getFullYear() === ano && ini.getMonth() === mes;
    });
    const confirmada = doMes.filter(r => r.status === 'aprovada' || r.status === 'concluida').reduce((a, r) => a + (r.total || r.valorTotal || 0), 0);
    const potencial  = doMes.filter(r => r.status === 'pendente' || r.status === 'pagamento pendente').reduce((a, r) => a + (r.total || r.valorTotal || 0), 0);
    return { label, confirmada, potencial, total: confirmada + potencial };
  });

  const maxValor = Math.max(...dadosMeses.map(d => d.total), 1);
  const receitaPrevista = reservas
    .filter(r => r.status === 'aprovada' || r.status === 'concluida' || r.status === 'pendente' || r.status === 'pagamento pendente')
    .reduce((a, r) => a + (r.total || r.valorTotal || 0), 0);

  return (
    <div className="previsao-wrapper">
      <Row className="g-3 mb-4">
        <Col xs={12} md={4}>
          <div className="card-previsao-mini">
            <div className="card-previsao-icone" style={{ background: 'var(--adm-info-bg)', color: 'var(--adm-info-fg)' }}>
              <i className="bi bi-graph-up-arrow fs-5" />
            </div>
            <div>
              <div className="card-previsao-valor">{fmtMoeda(receitaPrevista)}</div>
              <div className="card-previsao-label">{t("Receita prevista total")}</div>
            </div>
          </div>
        </Col>
      </Row>

      <div className="grafico-wrapper-admin">
        <div className="grafico-header-admin">
          <h6 className="fw-bold mb-0" style={{ color: 'var(--rc-ink)', fontSize: '0.9rem' }}>{t("Receita por Mês (próx. 4 meses)")}</h6>
          <div className="legenda-grafico">
            <span className="legenda-item"><span className="dot" style={{ background: 'var(--adm-blue)' }} />{t("Confirmada (paga)")}</span>
            <span className="legenda-item"><span className="dot" style={{ background: 'var(--adm-star)' }} />{t("Potencial (pendente/aguardando pgto)")}</span>
          </div>
        </div>
        <div className="grafico-barras">
          {dadosMeses.map(({ label, confirmada, potencial, total }) => (
            <div key={label} className="grafico-coluna">
              <div className="grafico-valor-topo">{total > 0 ? fmtMoeda(total).replace('R$\u00a0', 'R$ ') : '—'}</div>
              <div className="grafico-barra-container">
                <div className="grafico-barra-stack">
                  <div className="grafico-barra confirmada" style={{ height: `${(confirmada / maxValor) * 100}%` }} title={`${t('Confirmada')}: ${fmtMoeda(confirmada)}`} />
                  {potencial > 0 && (
                    <div className="grafico-barra potencial" style={{ height: `${(potencial / maxValor) * 100}%` }} title={`${t('Potencial')}: ${fmtMoeda(potencial)}`} />
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

// ─── Unidades (Recanto 1 e 2) ───────────────────────────────────────────────
const UNIDADES_ADMIN = [
  { id: 1, nome: 'Recanto Camargo 1', selo: 'R1', cor: 'var(--rc-u1)' },
  { id: 2, nome: 'Recanto Camargo 2', selo: 'R2', cor: 'var(--rc-u2)' },
];

function SeloUnidade({ imovelId }) {
  const u = UNIDADES_ADMIN.find(x => x.id === Number(imovelId)) || UNIDADES_ADMIN[0];
  return <span className="selo-unidade-admin" style={{ '--cor-unidade': u.cor }} title={u.nome}>{u.selo}</span>;
}

function SeletorUnidade({ valor, aoMudar }) {
  const { t } = usePreferencias();
  return (
    <div className="seletor-unidade-admin" role="tablist" aria-label={t('Unidade')}>
      {UNIDADES_ADMIN.map(u => (
        <button
          key={u.id}
          type="button"
          role="tab"
          aria-selected={valor === u.id}
          className={valor === u.id ? 'ativo' : ''}
          style={{ '--cor-unidade': u.cor }}
          onClick={() => aoMudar(u.id)}
        >
          <i className="dot-unidade" aria-hidden="true" /> {u.nome}
        </button>
      ))}
    </div>
  );
}

// ─── Painel de Diária (valor por noite + histórico de alterações) ────────────
function CartaoPreco({ titulo, ajuda, valorAtual, tipo, imovelId, aoSalvar }) {
  const { t } = usePreferencias();
  const [novoValor, setNovoValor] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const idCampo = `preco-${tipo}-${imovelId}`;

  const valorNumerico = Number(String(novoValor).replace(',', '.'));
  const valorValido = Number.isFinite(valorNumerico) && valorNumerico > 0 && valorNumerico <= 999999.99;
  const igualAtual = valorValido && valorAtual !== null && Number(valorNumerico.toFixed(2)) === Number(valorAtual);

  const salvar = async (e) => {
    e.preventDefault();
    if (!valorValido || igualAtual || salvando) return;
    setSalvando(true);
    setMensagem({ tipo: '', texto: '' });
    try {
      const res = await fetch(`${API_BASE}/api/proprietario/imovel/valor`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imovelId, tipo, novoValor: Number(valorNumerico.toFixed(2)) }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.error || t('Não foi possível atualizar o valor da diária.'));
      setNovoValor('');
      setMensagem({ tipo: 'sucesso', texto: t('Valor atualizado. As próximas reservas já usam o novo preço.') });
      await aoSalvar();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form className="diaria-card" onSubmit={salvar} noValidate>
      <div className="diaria-rotulo">{t(titulo)}</div>
      <div className="diaria-valor-atual">{valorAtual !== null ? fmtMoeda(valorAtual) : '—'}</div>
      <p className="diaria-ajuda">{t(ajuda)}</p>
      <label htmlFor={idCampo} className="diaria-rotulo mt-1">{t('Novo valor')}</label>
      <div className="diaria-input-linha">
        <span className="diaria-prefixo" aria-hidden="true">R$</span>
        <input
          id={idCampo}
          className="form-control diaria-input"
          type="number"
          inputMode="decimal"
          min="1"
          max="999999.99"
          step="0.01"
          placeholder={valorAtual !== null ? Number(valorAtual).toFixed(2) : ''}
          value={novoValor}
          onChange={(e) => { setNovoValor(e.target.value); setMensagem({ tipo: '', texto: '' }); }}
        />
      </div>
      {igualAtual && <div className="diaria-msg aviso">{t('Esse já é o valor atual.')}</div>}
      {mensagem.texto && <div className={`diaria-msg ${mensagem.tipo}`} role="status">{mensagem.texto}</div>}
      <button type="submit" className="btn-diaria-salvar" disabled={!valorValido || igualAtual || salvando}>
        {salvando ? t('Salvando...') : t('Salvar')}
      </button>
    </form>
  );
}

function DatasEspeciais({ imovelId }) {
  const { t } = usePreferencias();
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState({ nome: '', inicio: '', fim: '', preco: '' });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/proprietario/imovel/datas-especiais?imovelId=${imovelId}`, { credentials: 'include' });
      if (res.ok) setLista(await res.json());
    } catch {
      // mantém a lista atual
    }
  }, [imovelId]);

  useEffect(() => { carregar(); }, [carregar]);

  const preco = Number(String(form.preco).replace(',', '.'));
  const valido = form.nome.trim() && form.inicio && (!form.fim || form.fim >= form.inicio) && Number.isFinite(preco) && preco > 0;

  const salvar = async (e) => {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setMensagem({ tipo: '', texto: '' });
    try {
      const res = await fetch(`${API_BASE}/api/proprietario/imovel/datas-especiais`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imovelId, nome: form.nome.trim(), inicio: form.inicio, fim: form.fim || form.inicio, preco: Number(preco.toFixed(2)) }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.error || t('Não foi possível salvar a data especial.'));
      setForm({ nome: '', inicio: '', fim: '', preco: '' });
      setMensagem({ tipo: 'sucesso', texto: t('Data especial salva.') });
      await carregar();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/proprietario/imovel/datas-especiais/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error();
      setLista(l => l.filter(d => d.id !== id));
    } catch {
      setMensagem({ tipo: 'erro', texto: t('Não foi possível remover a data especial.') });
    }
  };

  return (
    <div className="diaria-card mt-3">
      <h6 className="fw-bold mb-0" style={{ color: 'var(--rc-ink)', fontSize: '0.95rem' }}>{t('Datas especiais (feriados e festas)')}</h6>
      <p className="diaria-ajuda">{t('Nessas noites vale o preço definido aqui, no lugar do preço de semana ou de fim de semana.')}</p>

      {lista.length > 0 && (
        <ul className="diaria-historico">
          {lista.map(d => (
            <li key={d.id}>
              <span>
                <strong style={{ color: 'var(--rc-ink)' }}>{d.nome}</strong>
                <span className="diaria-hist-data d-block">
                  {d.inicio === d.fim ? fmtData(d.inicio) : `${fmtData(d.inicio)} – ${fmtData(d.fim)}`}
                </span>
              </span>
              <span className="d-flex align-items-center gap-3">
                <strong className="diaria-hist-valores">{fmtMoeda(d.preco)} <small className="diaria-hist-data">/ {t('noite')}</small></strong>
                <button type="button" className="btn-diaria-remover" onClick={() => remover(d.id)} aria-label={t('Remover {nome}', { nome: d.nome })}>
                  <i className="bi bi-trash" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form className="diaria-form-especial" onSubmit={salvar} noValidate>
        <div className="diaria-campo diaria-campo-nome">
          <label htmlFor={`esp-nome-${imovelId}`} className="diaria-rotulo">{t('Nome')}</label>
          <input id={`esp-nome-${imovelId}`} className="form-control" type="text" maxLength={100}
            placeholder={t('Ex.: Feriado da Padroeira')}
            value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} />
        </div>
        <div className="diaria-campo">
          <label htmlFor={`esp-ini-${imovelId}`} className="diaria-rotulo">{t('Primeira noite')}</label>
          <input id={`esp-ini-${imovelId}`} className="form-control" type="date"
            value={form.inicio} onChange={(e) => setForm(f => ({ ...f, inicio: e.target.value }))} />
        </div>
        <div className="diaria-campo">
          <label htmlFor={`esp-fim-${imovelId}`} className="diaria-rotulo">{t('Última noite')}</label>
          <input id={`esp-fim-${imovelId}`} className="form-control" type="date" min={form.inicio || undefined}
            value={form.fim} onChange={(e) => setForm(f => ({ ...f, fim: e.target.value }))} />
        </div>
        <div className="diaria-campo">
          <label htmlFor={`esp-preco-${imovelId}`} className="diaria-rotulo">{t('Preço por noite')}</label>
          <input id={`esp-preco-${imovelId}`} className="form-control" type="number" inputMode="decimal" min="1" step="0.01"
            value={form.preco} onChange={(e) => setForm(f => ({ ...f, preco: e.target.value }))} />
        </div>
        <button type="submit" className="btn-diaria-salvar" disabled={!valido || salvando}>
          {salvando ? t('Salvando...') : t('Adicionar data especial')}
        </button>
      </form>
      {mensagem.texto && <div className={`diaria-msg ${mensagem.tipo}`} role="status">{mensagem.texto}</div>}
    </div>
  );
}

const ROTULO_TIPO_PRECO = { SEMANA: 'Dia de semana', FIM_SEMANA: 'Fim de semana' };

function PainelDiaria({ imovelId }) {
  const { t } = usePreferencias();
  const [precos, setPrecos] = useState({ semana: null, fimSemana: null });
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');

  const carregar = useCallback(async () => {
    setErroCarga('');
    try {
      const [rImoveis, rHist] = await Promise.all([
        fetch(`${API_BASE}/api/imoveis`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/proprietario/imovel/historico-valores?imovelId=${imovelId}`, { credentials: 'include' }),
      ]);
      if (!rImoveis.ok || !rHist.ok) throw new Error();
      const imoveis = await rImoveis.json();
      const hist = await rHist.json();
      const imovel = Array.isArray(imoveis) ? imoveis.find(i => Number(i.Imo_Id) === Number(imovelId)) : null;
      if (!imovel) throw new Error();
      const semana = Number(imovel.Imo_ValorFixo);
      setPrecos({ semana, fimSemana: imovel.Imo_ValorFimSemana != null ? Number(imovel.Imo_ValorFimSemana) : semana });
      setHistorico(Array.isArray(hist) ? hist : []);
    } catch {
      setErroCarga(t('Não foi possível carregar o valor da diária.'));
    } finally {
      setCarregando(false);
    }
  }, [imovelId, t]);

  useEffect(() => { carregar(); }, [carregar]);

  if (carregando) {
    return <div className="diaria-card text-center py-5" style={{ color: 'var(--rc-muted)' }}>{t('Carregando...')}</div>;
  }

  if (erroCarga) {
    return (
      <div className="diaria-card text-center py-5">
        <p style={{ color: 'var(--rc-muted)' }}>{erroCarga}</p>
        <button type="button" className="btn-diaria-salvar align-self-center" onClick={carregar}>{t('Tentar novamente')}</button>
      </div>
    );
  }

  return (
    <div className="diaria-wrapper">
      <div className="diaria-grid">
        <CartaoPreco
          titulo="Dia de semana"
          ajuda="Noites de domingo a quinta. A taxa de limpeza é cobrada à parte."
          valorAtual={precos.semana}
          tipo="SEMANA"
          imovelId={imovelId}
          aoSalvar={carregar}
        />
        <CartaoPreco
          titulo="Fim de semana"
          ajuda="Noites de sexta e de sábado."
          valorAtual={precos.fimSemana}
          tipo="FIM_SEMANA"
          imovelId={imovelId}
          aoSalvar={carregar}
        />
      </div>

      <DatasEspeciais imovelId={imovelId} />

      <div className="diaria-card mt-3">
        <h6 className="fw-bold mb-0" style={{ color: 'var(--rc-ink)', fontSize: '0.95rem' }}>{t('Histórico de alterações')}</h6>
        <p className="diaria-ajuda">{t('Reservas já feitas mantêm o valor combinado.')}</p>
        {historico.length === 0 ? (
          <p className="mb-0" style={{ color: 'var(--rc-muted)', fontSize: '0.9rem' }}>{t('Nenhuma alteração registrada ainda.')}</p>
        ) : (
          <ul className="diaria-historico">
            {historico.map(h => (
              <li key={h.id}>
                <span className="diaria-hist-data">
                  {fmtDataHora(h.dataAlteracao, t)} · {t(ROTULO_TIPO_PRECO[h.tipo] || 'Dia de semana')}
                </span>
                <span className="diaria-hist-valores">
                  <s>{fmtMoeda(h.valorAntigo)}</s> <i className="bi bi-arrow-right" aria-hidden="true" /> <strong>{fmtMoeda(h.valorNovo)}</strong>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Componente Principal DashboardAdministrador ──────────────────────────────
function DashboardAdministrador() {
  const { t, tema, idioma, alternarTema, alternarIdioma } = usePreferencias();
  const escuro = tema === 'escuro';
  const { usuario, tipo, logout } = useAutenticacao();
  const navigate = useNavigate();
  const usuarioId = usuario?.id ?? null;
  const sessaoReservasRef = useRef(null);

  const [sidebarAberta, setSidebarAberta] = useState(() => window.innerWidth >= 992);
  const [abaAtiva, setAbaAtiva] = useState('visao-geral');
  const [reservas, setReservas] = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [reservaParaCancelar, setReservaParaCancelar] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [feedback, setFeedback] = useState({ tipo: '', msg: '' });

  const tratarCliqueNotificacao = useCallback((notificacao) => {
    if (!notificacao) return;
    const texto = `${notificacao.titulo || ''} ${notificacao.mensagem || ''}`.toLowerCase();
    const matchReserva = texto.match(/#(\d+)/);
    const reservaId = matchReserva ? matchReserva[1] : null;

    if (texto.includes('avaliação') || texto.includes('avaliacao') || texto.includes('avaliou')) {
      setAbaAtiva('avaliacoes');
    } else if (texto.includes('cupom') || texto.includes('cupons')) {
      setAbaAtiva('cupons');
    } else if (texto.includes('bloqueio') || texto.includes('calendário') || texto.includes('calendario')) {
      setAbaAtiva('calendario');
    } else if (texto.includes('reserva')) {
      setAbaAtiva('reservas');
      if (texto.includes('aguarda') || texto.includes('aprovação') || texto.includes('aprovacao') || texto.includes('nova reserva') || texto.includes('pendente')) {
        setFiltro('pendente');
      }
      if (reservaId) {
        const rEncontrada = reservas.find(res => String(res.id) === String(reservaId));
        if (rEncontrada) {
          setSelecionada(rEncontrada);
        }
      }
    }
  }, [reservas]);

  // Avaliações
  const [avaliacoesPendentes, setAvaliacoesPendentes] = useState([]);
  const [carregandoAvaliacoes, setCarregandoAvaliacoes] = useState(true);
  const [erroAvaliacoes, setErroAvaliacoes] = useState('');
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);

  // Bloqueios de Calendário
  const [bloqueios, setBloqueios] = useState([]);
  const [unidadeAdmin, setUnidadeAdmin] = useState(1);

  // Cupons Promocionais
  const [cupons, setCupons] = useState([]);

  // Avaliações Públicas e Nota Média do Imóvel (Opção B)
  const [avaliacoesPublicas, setAvaliacoesPublicas] = useState([]);

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
      const res = await fetch(`${API_BASE}/api/proprietario/bloqueios?imovelId=${unidadeAdmin}`, { credentials: 'include' });
      if (res.ok) {
        const dados = await res.json();
        if (Array.isArray(dados)) setBloqueios(dados);
      }
    } catch {
      // Mantém estado fallback inicial se offline
    }
  }, [unidadeAdmin]);

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
        body: JSON.stringify({ ...novo, imovelId: unidadeAdmin }),
      });
      if (res.ok) {
        await buscarBloqueios();
        fb('sucesso', t('Datas bloqueadas para manutenção com sucesso.'));
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t('Erro ao registrar bloqueio no servidor.'));
      }
    } catch (erro) {
      throw erro; // Repassa para o Modal não fechar sozinho
    }
  };

  // Remover Bloqueio
  const removerBloqueio = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/proprietario/bloqueios/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(t('Erro ao remover bloqueio.'));
      setBloqueios(prev => prev.filter(b => b.id !== id));
      fb('sucesso', t('Bloqueio de datas removido com sucesso.'));
    } catch (erro) {
      fb('erro', erro.message);
    }
  };

  // Alternar Status do Cupom (Ativar / Desativar)
  const alternarStatusCupom = async (id, statusAtual) => {
    const novoStatus = !statusAtual;
    try {
      const res = await fetch(`${API_BASE}/api/proprietario/cupons/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ativo: novoStatus }),
      });
      if (!res.ok) throw new Error(t('Falha ao atualizar status do cupom no servidor.'));
      setCupons(prev => prev.map(c => c.id === id ? { ...c, ativo: novoStatus } : c));
      fb('sucesso', novoStatus ? t('Cupom ativado com sucesso.') : t('Cupom pausado com sucesso.'));
    } catch (erro) {
      fb('erro', erro.message);
    }
  };

  // Editar Cupom (lança erro para o modal mostrar)
  const editarCupom = async (id, dados) => {
    const res = await fetch(`${API_BASE}/api/proprietario/cupons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(dados),
    });
    const resposta = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(resposta.error || t('Não foi possível atualizar o cupom.'));
    await buscarCupons();
    fb('sucesso', t('Cupom atualizado com sucesso.'));
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
        // Recarrega do servidor para garantir que o ID real e todos os campos batam
        await buscarCupons();
        fb('sucesso', t('Cupom criado com sucesso!'));
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t('Erro ao registrar cupom no banco de dados.'));
      }
    } catch (err) {
      // Re-throw para o modal mostrar a mensagem de erro vermelha
      throw err;
    }
  };

  // Decidir Reserva
  async function decidirReserva(id, acao, motivo) {
    const sessao = sessaoReservasRef.current;
    if (!sessao?.ativa) throw new Error(t('Faça login novamente para decidir a reserva.'));
    const resposta = await fetch(`${API_BASE}/api/proprietario/reservas/${id}/${acao}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(acao === 'recusar' ? { motivo } : {}),
      signal: AbortSignal.timeout(10_000),
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!sessao.ativa || sessaoReservasRef.current !== sessao) return;
    if (!resposta.ok) throw new Error(dados.error || t('Não foi possível salvar a decisão.'));
    const statusSalvo = dados.status === 'CONFIRMADA'
      ? 'aprovada'
      : (dados.status === 'PAGAMENTO_PENDENTE'
        ? 'pagamento pendente'
        : (dados.status === 'CONCLUIDA' ? 'concluida' : 'recusada'));
    setReservas(atuais => atuais.map(r => String(r.id) === String(id) ? { ...r, status: statusSalvo } : r));
    setSelecionada(null);
    fb('sucesso', dados.message || t('Decisão salva com sucesso.'));
    await buscarReservas();
  }

  // Cancelar Reserva com Estorno Automático
  async function cancelarReservaComEstorno(id, motivo) {
    const sessao = sessaoReservasRef.current;
    if (!sessao?.ativa) throw new Error(t('Faça login novamente para cancelar a reserva.'));
    const resposta = await fetch(`${API_BASE}/api/proprietario/reservas/${id}/cancelar`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo }),
      signal: AbortSignal.timeout(15_000),
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!sessao.ativa || sessaoReservasRef.current !== sessao) return;
    if (!resposta.ok) throw new Error(dados.error || t('Não foi possível cancelar a reserva.'));
    setSelecionada(null);
    setReservaParaCancelar(null);
    fb('sucesso', dados.message || t('Reserva cancelada e estorno processado.'));
    await buscarReservas();
    return dados;
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
      if (!resposta.ok) throw new Error(dados.error || t('Não foi possível carregar as avaliações.'));
      if (!Array.isArray(dados)) throw new Error(t('Formato inválido retornado pelo servidor.'));
      setAvaliacoesPendentes(dados);
    } catch (falha) {
      if (falha.name !== 'AbortError') {
        setErroAvaliacoes(falha.message || t('Não foi possível carregar as avaliações.'));
      }
    } finally {
      if (!signal?.aborted) setCarregandoAvaliacoes(false);
    }
  }, []);

  // Buscar Avaliações Públicas e Nota Real do Imóvel (Opção B)
  const buscarAvaliacoesPublicas = useCallback(async (signal) => {
    try {
      const respostas = await Promise.all([1, 2].map(id => fetch(`${API_BASE}/api/avaliacoes/imovel/${id}`, { signal })));
      const listas = await Promise.all(respostas.map(r => r.json().catch(() => [])));
      setAvaliacoesPublicas(listas.filter(Array.isArray).flat());
    } catch {
      // Ignora falha de conexão se offline
    }
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    buscarAvaliacoesPendentes(controlador.signal);
    buscarAvaliacoesPublicas(controlador.signal);
    return () => controlador.abort();
  }, [buscarAvaliacoesPendentes, buscarAvaliacoesPublicas]);

  const confirmarRespostaAvaliacao = useCallback((id) => {
    setAvaliacoesPendentes(atuais => atuais.filter(item => item.id !== id));
    setAvaliacaoSelecionada(null);
    buscarAvaliacoesPublicas();
    fb('sucesso', t('Resposta e avaliação interna do hóspede enviadas com sucesso.'));
  }, [buscarAvaliacoesPublicas]);

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

  // Opção B: Nota 5.0 inicial de estreia quando total de avaliações = 0, ou média real calculada
  const totalAvaliacoesPublicas = avaliacoesPublicas.length;
  const notaMediaReal = totalAvaliacoesPublicas > 0
    ? (avaliacoesPublicas.reduce((acc, a) => acc + Number(a.nota || 0), 0) / totalAvaliacoesPublicas)
    : 5.0;

  // Abas do Painel
  const abas = [
    { id: 'visao-geral', label: 'Visão Geral', icone: <Ico.Dash /> },
    { id: 'reservas',    label: 'Reservas',    icone: <Ico.Reservas /> },
    { id: 'calendario',  label: 'Calendário',  icone: <Ico.Cal /> },
    { id: 'cupons',      label: 'Cupons',      icone: <Ico.Cupom /> },
    { id: 'previsao',    label: 'Previsão',    icone: <Ico.Previsao /> },
    { id: 'diaria',      label: 'Diária',      icone: <Ico.Diaria /> },
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
            <p className="dash-section-label">{t("Indicadores Principais (KPIs)")}</p>
            <Row className="g-3 mb-4">
              {/* 1. Faturamento Mensal com badge de variação vs mês anterior */}
              <Col xs={12} sm={6} xl={3}>
                <CardKpiModerno
                  icone={<i className="bi bi-currency-dollar fs-4" />}
                  titulo={t("Faturamento Mensal")}
                  valor={fmtMoeda(faturamentoMesAtual)}
                  badge={
                    (faturamentoMesAtual === 0 && faturamentoMesAnterior === 0) ? null : (
                      <span className={`kpi-badge-variacao ${variacaoPerc > 0 ? 'positiva' : (variacaoPerc < 0 ? 'negativa' : 'neutra')}`}>
                        <i className={`bi ${variacaoPerc > 0 ? 'bi-arrow-up-right' : (variacaoPerc < 0 ? 'bi-arrow-down-right' : 'bi-dash')} me-1`} />
                        {variacaoPerc > 0 ? `+${variacaoPerc.toFixed(1)}%` : `${variacaoPerc.toFixed(1)}%`}
                      </span>
                    )
                  }
                  sub={(faturamentoMesAtual === 0 && faturamentoMesAnterior === 0) ? t('Sem faturamento no período') : t('vs mês anterior')}
                  cor="var(--rc-u1)"
                />
              </Col>

              {/* 2. Taxa de Ocupação no Mês */}
              <Col xs={12} sm={6} xl={3}>
                <CardKpiModerno
                  icone={<i className="bi bi-house-check fs-4" />}
                  titulo={t("Ocupação no Mês")}
                  valor={`${ocupacao}%`}
                  barraProgresso={ocupacao}
                  sub={t('{ocupados} de {total} diárias reservadas', { ocupados: diasOcupados, total: diasNoMes })}
                  cor="var(--rc-u1)"
                />
              </Col>

              {/* 3. Avaliação Média (Opção B: 5.0 inicial de estreia, real quando houver avaliações) */}
              <Col xs={12} sm={6} xl={3}>
                <CardKpiModerno
                  icone={<i className="bi bi-star-fill fs-4" />}
                  titulo={t("Avaliação Média")}
                  valor={
                    <span className="d-flex align-items-center gap-2">
                      {notaMediaReal.toFixed(1)}
                      <EstrelasAvaliacao nota={notaMediaReal} tamanho="1.15rem" />
                    </span>
                  }
                  sub={totalAvaliacoesPublicas === 0
                    ? t('Nota inicial de estreia')
                    : (totalAvaliacoesPublicas === 1 ? t('{n} avaliação de hóspede', { n: totalAvaliacoesPublicas }) : t('{n} avaliações de hóspedes', { n: totalAvaliacoesPublicas }))
                  }
                  cor="var(--adm-star)"
                />
              </Col>

              {/* 4. Total de Reservas */}
              <Col xs={12} sm={6} xl={3}>
                <CardKpiModerno
                  icone={<i className="bi bi-calendar-check fs-4" />}
                  titulo={t("Total de Reservas")}
                  valor={reservas.length}
                  sub={t('{a} confirmadas · {p} pendentes', { a: aprovadas, p: reservas.filter(r => r.status === 'pendente' || r.status === 'pagamento pendente').length })}
                  cor="var(--rc-ink)"
                />
              </Col>
            </Row>

            {/* Gráfico SVG Moderno de Evolução dos Últimos 6 Meses */}
            <p className="dash-section-label">{t("Desempenho Financeiro Recente")}</p>
            <GraficoFaturamentoSVG reservas={reservas} />

            {/* Card de Próximos Check-ins com botão direto de WhatsApp */}
            <p className="dash-section-label">{t("Operação & Acolhimento")}</p>
            <CardProximosCheckins reservas={reservas} />

            {/* Tabela de Reservas Mantida com Filtros */}
            <p className="dash-section-label">{t("Gerenciamento de Reservas")}</p>
            <TabelaReservas
              reservas={ultimasReservas}
              reservasGerais={reservas}
              onVer={setSelecionada}
              onCancelar={setReservaParaCancelar}
              filtro={filtro}
              setFiltro={setFiltro}
            />
          </>
        );
      }

      case 'reservas': return (
        <>
          <p className="dash-section-label">{t("Gerenciamento de Reservas")}</p>
          <TabelaReservas
            reservas={reservas}
            onVer={setSelecionada}
            onCancelar={setReservaParaCancelar}
            filtro={filtro}
            setFiltro={setFiltro}
          />
        </>
      );

      case 'calendario': return (
        <>
          <p className="dash-section-label">{t("Calendário de Ocupação & Manutenção")}</p>
          <SeletorUnidade valor={unidadeAdmin} aoMudar={setUnidadeAdmin} />
          <CalendarioOcupacao
            reservas={reservas.filter(r => Number(r.imovelId || 1) === unidadeAdmin)}
            bloqueios={bloqueios}
            aoCriarBloqueio={criarBloqueio}
            aoRemoverBloqueio={removerBloqueio}
          />
        </>
      );

      case 'cupons': return (
        <>
          <p className="dash-section-label">{t("Gestão de Cupons Promocionais")}</p>
          <PainelCupons
            cupons={cupons}
            aoAlternarStatus={alternarStatusCupom}
            aoCriarCupom={criarCupom}
            aoEditarCupom={editarCupom}
          />
        </>
      );

      case 'previsao': return (
        <>
          <p className="dash-section-label">{t("Previsão de Receita")}</p>
          <PrevisaoReceita reservas={reservas} />
        </>
      );

      case 'diaria': return (
        <>
          <p className="dash-section-label">{t("Valor da Diária")}</p>
          <SeletorUnidade valor={unidadeAdmin} aoMudar={setUnidadeAdmin} />
          <PainelDiaria key={unidadeAdmin} imovelId={unidadeAdmin} />
        </>
      );

      case 'avaliacoes': return (
        <>
          <p className="dash-section-label">{t("Avaliações dos Hóspedes")}</p>
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
              title={!sidebarAberta ? t(a.label) : ''}
            >
              <span className="sidebar-icone">{a.icone}</span>
              {sidebarAberta && <span className="sidebar-label">{t(a.label)}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-rodape">
          <Link to="/" className="sidebar-item sidebar-item-link" title={!sidebarAberta ? t('Voltar ao site') : ''}>
            <span className="sidebar-icone"><Ico.Voltar /></span>
            {sidebarAberta && <span className="sidebar-label">{t('Voltar ao site')}</span>}
          </Link>
          <button type="button" className="sidebar-item" onClick={() => navigate('/Configuracoes')} title={!sidebarAberta ? t('Configurações') : ''}>
            <span className="sidebar-icone"><Ico.Config /></span>
            {sidebarAberta && <span className="sidebar-label">{t('Configurações')}</span>}
          </button>
          <button type="button" className="sidebar-item sair" onClick={() => { logout(); navigate('/'); }} title={!sidebarAberta ? t('Sair') : ''}>
            <span className="sidebar-icone"><Ico.Sair /></span>
            {sidebarAberta && <span className="sidebar-label">{t('Sair')}</span>}
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
              aria-label={t("Alternar menu")}
            >
              <Ico.Menu />
            </button>
            <div>
              <h4 className="topbar-titulo mb-0">{t(abas.find(a => a.id === abaAtiva)?.label)}</h4>
              <span className="topbar-sub">{t('Olá, {nome}!', { nome: usuario?.nome?.split(' ')[0] || t('Anfitrião') })}</span>
            </div>
          </div>
          <div className="topbar-direita">
            <div className="adm-prefs">
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
            <Notificacoes aoNovaNotificacao={buscarReservas} aoClicarNotificacao={tratarCliqueNotificacao} />
            <div className="topbar-avatar" title={usuario?.nome}>
              {usuario?.nome?.charAt(0) || 'R'}
            </div>
          </div>
        </div>

        {feedback.msg && (
          <Alert
            variant={feedback.tipo === 'sucesso' ? 'success' : 'danger'}
            className={`alert-feedback-admin ${feedback.tipo === 'sucesso' ? 'adm-alert-ok' : 'adm-alert-err'}`}
            role={feedback.tipo === 'sucesso' ? 'status' : 'alert'}
          >
            <i className={`bi ${feedback.tipo === 'sucesso' ? 'bi-check-circle' : 'bi-x-circle'} me-2`} aria-hidden="true" />
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
        aoAbrirCancelamento={r => setReservaParaCancelar(r)}
      />

      {reservaParaCancelar && (
        <ModalCancelarReservaAdmin
          reserva={reservaParaCancelar}
          aoFechar={() => setReservaParaCancelar(null)}
          aoConfirmarCancelamento={cancelarReservaComEstorno}
        />
      )}

      <ModalResponderAvaliacao
        avaliacao={avaliacaoSelecionada}
        aoFechar={() => setAvaliacaoSelecionada(null)}
        aoResponder={confirmarRespostaAvaliacao}
      />
    </div>
  );
}

export default DashboardAdministrador;
