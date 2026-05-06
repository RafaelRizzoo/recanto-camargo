/**
 * DashboardAdministrador.jsx
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Row, Col, Card, Modal, Alert, Button } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import Calendar from 'react-calendar';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { useNotificacoes } from '../hooks/useNotificacoes';
import Notificacoes from '../components/UI/Notificacoes';
import 'react-calendar/dist/Calendar.css';
import './DashboardAdministrador.css';

// ─── Mock Data ───────────────────────────────────────────────────────────────
const RESERVAS_MOCK = [
  { id:'R001', hospede:'Fernanda Lima',    email:'fernanda@email.com', telefone:'(12) 98765-4321', checkin:'2026-05-10', checkout:'2026-05-14', hospedes:4, status:'pendente', valorTotal:1080, observacao:'Preciso de berço para bebê de 8 meses.', criadaEm:'2026-04-20' },
  { id:'R002', hospede:'Carlos Eduardo',   email:'carlos@email.com',   telefone:'(11) 99999-1234', checkin:'2026-05-17', checkout:'2026-05-19', hospedes:2, status:'pendente', valorTotal:580,  observacao:'', criadaEm:'2026-04-21' },
  { id:'R003', hospede:'Mariana Souza',    email:'mariana@email.com',  telefone:'(12) 97777-8888', checkin:'2026-04-28', checkout:'2026-05-02', hospedes:6, status:'aprovada', valorTotal:1160, observacao:'Levaremos pet (cachorro pequeno).', criadaEm:'2026-04-10' },
  { id:'R004', hospede:'Roberto Alves',    email:'roberto@email.com',  telefone:'(21) 98888-5555', checkin:'2026-04-15', checkout:'2026-04-17', hospedes:3, status:'recusada', valorTotal:580,  observacao:'', criadaEm:'2026-04-05' },
  { id:'R005', hospede:'Patricia Mendes',  email:'patricia@email.com', telefone:'(12) 96666-3333', checkin:'2026-06-01', checkout:'2026-06-07', hospedes:5, status:'aprovada', valorTotal:1740, observacao:'Aniversário de casamento.', criadaEm:'2026-04-22' },
  { id:'R006', hospede:'Juliana Costa',    email:'juliana@email.com',  telefone:'(13) 94444-2222', checkin:'2026-05-23', checkout:'2026-05-25', hospedes:2, status:'pendente', valorTotal:580,  observacao:'Viagem de lua de mel.', criadaEm:'2026-04-23' },
  { id:'R007', hospede:'André Oliveira',   email:'andre@email.com',    telefone:'(12) 95555-1111', checkin:'2026-07-04', checkout:'2026-07-08', hospedes:4, status:'aprovada', valorTotal:1160, observacao:'', criadaEm:'2026-04-25' },
  { id:'R008', hospede:'Beatriz Santos',   email:'beatriz@email.com',  telefone:'(11) 96666-2222', checkin:'2026-07-18', checkout:'2026-07-21', hospedes:3, status:'pendente', valorTotal:870,  observacao:'', criadaEm:'2026-04-26' },
];

const CHAVE_RESERVAS = 'recanto_camargo_reservas';

function inicializarReservas() {
  try {
    const raw = localStorage.getItem(CHAVE_RESERVAS);
    return raw ? JSON.parse(raw) : (() => {
      localStorage.setItem(CHAVE_RESERVAS, JSON.stringify(RESERVAS_MOCK));
      return RESERVAS_MOCK;
    })();
  } catch { return RESERVAS_MOCK; }
}

// ─── Utilitários ─────────────────────────────────────────────────────────────
const fmtData  = (s) => { if (!s) return '—'; const [a,m,d]=s.split('-'); return `${d}/${m}/${a}`; };
const fmtMoeda = (v) => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
const noites   = (ci, co) => Math.round((new Date(co+'T00:00:00') - new Date(ci+'T00:00:00')) / 86400000);

const STATUS_CFG = {
  pendente: { label:'Pendente', bg:'#fff3cd', cor:'#856404' },
  aprovada: { label:'Aprovada', bg:'#d1e7dd', cor:'#0f5132' },
  recusada: { label:'Recusada', bg:'#f8d7da', cor:'#842029' },
};

// ─── Ícones ───────────────────────────────────────────────────────────────────
const Ico = {
  Dash:    ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Reservas:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>,
  Cal:     ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  Previsao:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Config:  ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Voltar:  ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Sair:    ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Menu:    ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Check:   ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:       ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

// ─── Subcomponentes─────────────────────────────────────────────────────
function BadgeStatus({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.pendente;
  return <span className="badge-status-admin" style={{ background:c.bg, color:c.cor }}>{c.label}</span>;
}

function CardResumo({ icone, titulo, valor, sub, cor='#3b6399' }) {
  return (
    <Card className="card-resumo-admin border-0 shadow-sm h-100">
      <Card.Body className="p-4">
        <div className="icone-resumo-admin mb-3" style={{ background:`${cor}1a`, color:cor }}>{icone}</div>
        <div className="valor-resumo-admin">{valor}</div>
        <div className="titulo-resumo-admin">{titulo}</div>
        {sub && <div className="sub-resumo-admin mt-1">{sub}</div>}
      </Card.Body>
    </Card>
  );
}

// ─── Modal Detalhe ────────────────────────────────────────────────────────────
function ModalReserva({ reserva, aoFechar, aoAprovar, aoRecusar }) {
  if (!reserva) return null;
  const n = noites(reserva.checkin, reserva.checkout);
  
  return (
    <Modal show onHide={aoFechar} centered size="lg" className="modal-reserva-admin">
      <Modal.Header closeButton className="modal-header-admin">
        <Modal.Title>Reserva #{reserva.id}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Row className="g-4">
          <Col md={6}>
            <p className="label-secao-modal">Hóspede</p>
            <div className="info-hospede-modal">
              <div className="avatar-hospede-modal">{reserva.hospede.charAt(0)}</div>
              <div>
                <div className="fw-bold">{reserva.hospede}</div>
                <div className="text-muted small">{reserva.email}</div>
                <div className="text-muted small">{reserva.telefone}</div>
              </div>
            </div>
          </Col>
          <Col md={6}>
            <p className="label-secao-modal">Status</p>
            <BadgeStatus status={reserva.status} />
            <div className="text-muted small mt-2">Solicitada em {fmtData(reserva.criadaEm)}</div>
          </Col>
          <Col md={6}>
            <p className="label-secao-modal">Período</p>
            <div className="d-flex gap-3 flex-wrap">
              {[['Check-in', fmtData(reserva.checkin)], ['Check-out', fmtData(reserva.checkout)], ['Noites', n]].map(([l,v]) => (
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
              <div className="bloco-data-modal"><div className="label-data-modal">Pessoas</div><div className="valor-data-modal">{reserva.hospedes}</div></div>
              <div className="bloco-data-modal" style={{background:'#f0fdf4'}}>
                <div className="label-data-modal">Total</div>
                <div className="valor-data-modal fw-bold" style={{color:'#198754'}}>{fmtMoeda(reserva.valorTotal)}</div>
              </div>
            </div>
          </Col>
          {reserva.observacao && (
            <Col xs={12}>
              <p className="label-secao-modal">Observações</p>
              <div className="obs-modal">{reserva.observacao}</div>
            </Col>
          )}
        </Row>
      </Modal.Body>
      {reserva.status === 'pendente' && (
        <Modal.Footer className="border-0 pt-0 gap-2">
          <Button variant="outline-danger" className="btn-acao-modal" onClick={() => aoRecusar(reserva.id)}><Ico.X /> Recusar</Button>
          <Button variant="success"        className="btn-acao-modal" onClick={() => aoAprovar(reserva.id)}><Ico.Check /> Aprovar</Button>
        </Modal.Footer>
      )}
    </Modal>
  );
}

// ─── Tabela ──────────────────────────────────────────────────
function TabelaReservas({ reservas, onVer, onAprovar, onRecusar, filtro, setFiltro, reservasGerais }) {
  const baseContagem = reservasGerais || reservas;

  const lista = filtro === 'todas' ? reservas : reservas.filter(r => r.status === filtro);
  const cnt   = s => s === 'todas' ? baseContagem.length : baseContagem.filter(r => r.status === s).length;

  return (
    <div className="tabela-wrapper-admin">
      <div className="tabela-header-admin">
        <h5 className="mb-0 fw-bold" style={{color:'#223a5e'}}>Gerenciar Reservas</h5>
        <div className="filtros-status-admin">
          {['todas','pendente','aprovada','recusada'].map(f => (
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
                <i className="bi bi-calendar-x fs-2 d-block mb-2 opacity-50"></i>Nenhuma reserva encontrada
              </td></tr>
            ) : lista.map(r => (
              <tr key={r.id} className="linha-tabela-admin">
                <td><span className="id-reserva">#{r.id}</span></td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <div className="mini-avatar">{r.hospede.charAt(0)}</div>
                    <div>
                      <div className="fw-semibold" style={{fontSize:'0.875rem'}}>{r.hospede}</div>
                      <div className="text-muted" style={{fontSize:'0.75rem'}}>{r.hospedes} pessoa(s)</div>
                    </div>
                  </div>
                </td>
                <td style={{fontSize:'0.875rem'}}>{fmtData(r.checkin)}</td>
                <td style={{fontSize:'0.875rem'}}>{fmtData(r.checkout)}</td>
                <td className="d-none d-md-table-cell text-center" style={{fontSize:'0.875rem'}}>{noites(r.checkin,r.checkout)}</td>
                <td className="fw-bold" style={{color:'#198754',fontSize:'0.875rem'}}>{fmtMoeda(r.valorTotal)}</td>
                <td><BadgeStatus status={r.status}/></td>
                <td>
                  <div className="acoes-tabela">
                    <button className="btn-acao-tabela ver" onClick={() => onVer(r)} title="Ver detalhes"><i className="bi bi-eye"></i></button>
                    {r.status === 'pendente' && <>
                      <button className="btn-acao-tabela aprovar" onClick={() => onAprovar(r.id)} title="Aprovar"><Ico.Check/></button>
                      <button className="btn-acao-tabela recusar" onClick={() => onRecusar(r.id)} title="Recusar"><Ico.X/></button>
                    </>}
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

// ─── Calendário ───────────────────────────────────────────────────────────────
function CalendarioOcupacao({ reservas }) {
  const [mesAtivo, setMesAtivo] = useState(new Date());
  const mapaStatus = useMemo(() => reservas.reduce((acc, r) => {
    if (r.status !== 'aprovada' && r.status !== 'pendente') return acc;
    const ini = new Date(r.checkin + 'T00:00:00');
    const fim = new Date(r.checkout + 'T00:00:00');
    for (let d = new Date(ini); d < fim; d = new Date(d.getTime() + 86400000)) {
      const k = d.toISOString().slice(0,10);
      if (!acc[k] || r.status === 'aprovada') acc[k] = r.status;
    }
    return acc;
  }, {}), [reservas]);

  const reservasDoMes = useMemo(() => reservas.filter(r => {
    if (r.status !== 'aprovada' && r.status !== 'pendente') return false;
    const ini = new Date(r.checkin + 'T00:00:00');
    const fim = new Date(r.checkout + 'T00:00:00');
    const p1  = new Date(mesAtivo.getFullYear(), mesAtivo.getMonth(), 1);
    const p2  = new Date(mesAtivo.getFullYear(), mesAtivo.getMonth() + 1, 0);
    return ini <= p2 && fim > p1;
  }), [reservas, mesAtivo]);

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null;
    const k = date.toISOString().slice(0,10);
    if (mapaStatus[k] === 'aprovada') return 'dia-aprovado';
    if (mapaStatus[k] === 'pendente') return 'dia-pendente';
    return null;
  };

  return (
    <div className="calendario-wrapper-admin">
      <div className="calendario-header-admin">
        <h5 className="mb-0 fw-bold" style={{color:'#223a5e'}}>Calendário de Ocupação</h5>
        <div className="legenda-calendario">
          <span className="legenda-item"><span className="dot dot-aprovada"></span>Aprovada</span>
          <span className="legenda-item"><span className="dot dot-pendente"></span>Pendente</span>
        </div>
      </div>
      <div className="react-calendar-container">
        <Calendar
          locale="pt-BR"
          tileClassName={tileClassName}
          onActiveStartDateChange={({ activeStartDate }) => setMesAtivo(activeStartDate || new Date())}
          className="calendario-admin-custom"
          prevLabel="‹" nextLabel="›" prev2Label="«" next2Label="»"
        />
      </div>
      <div className="reservas-mes-lista mt-4">
        <h6 className="label-lista-mes">
          Reservas em {mesAtivo.toLocaleString('pt-BR', { month:'long', year:'numeric' })}
        </h6>
        {reservasDoMes.length === 0
          ? <p className="text-muted small mb-0">Nenhuma reserva ativa neste mês.</p>
          : reservasDoMes.map(r => (
            <div key={r.id} className="item-reserva-mes">
              <div className={`dot-inline ${r.status === 'aprovada' ? 'dot-aprovada' : 'dot-pendente'}`}></div>
              <div className="flex-grow-1">
                <span className="fw-semibold" style={{fontSize:'0.875rem'}}>{r.hospede}</span>
                <span className="text-muted ms-2" style={{fontSize:'0.78rem'}}>{fmtData(r.checkin)} → {fmtData(r.checkout)}</span>
              </div>
              <BadgeStatus status={r.status}/>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ─── Previsão de Receita ──────────────────────────────────────────────────────
function PrevisaoReceita({ reservas }) {
  const hoje = new Date();
  const meses = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    return {
      label: d.toLocaleString('pt-BR', { month:'short' }).replace('.',''),
      ano: d.getFullYear(),
      mes: d.getMonth(),
    };
  });

  const dadosMeses = meses.map(({ label, ano, mes }) => {
    const doMes = reservas.filter(r => {
      const ini = new Date(r.checkin + 'T00:00:00');
      return ini.getFullYear() === ano && ini.getMonth() === mes;
    });
    const confirmada = doMes.filter(r => r.status === 'aprovada').reduce((a,r) => a + r.valorTotal, 0);
    const potencial  = doMes.filter(r => r.status === 'pendente').reduce((a,r) => a + r.valorTotal, 0);
    return { label, confirmada, potencial, total: confirmada + potencial };
  });

  const maxValor = Math.max(...dadosMeses.map(d => d.total), 1);

  const em30dias = new Date(hoje.getTime() + 30 * 86400000);
  const proximasEntradas = reservas
    .filter(r => {
      const ci = new Date(r.checkin + 'T00:00:00');
      return (r.status === 'aprovada' || r.status === 'pendente') && ci >= hoje && ci <= em30dias;
    })
    .sort((a, b) => new Date(a.checkin) - new Date(b.checkin));

  const totalDecididas = reservas.filter(r => r.status === 'aprovada' || r.status === 'recusada').length;
  const taxaAprovacao  = totalDecididas > 0
    ? Math.round((reservas.filter(r => r.status === 'aprovada').length / totalDecididas) * 100)
    : 0;

  const receitaPrevista = reservas
    .filter(r => r.status === 'aprovada' || r.status === 'pendente')
    .reduce((a, r) => a + r.valorTotal, 0);

  return (
    <div className="previsao-wrapper">
      <Row className="g-3 mb-4">
        <Col xs={12} md={4}>
          <div className="card-previsao-mini">
            <div className="card-previsao-icone" style={{background:'#dbeafe', color:'#1e40af'}}>
              <i className="bi bi-graph-up-arrow fs-5"></i>
            </div>
            <div>
              <div className="card-previsao-valor">{fmtMoeda(receitaPrevista)}</div>
              <div className="card-previsao-label">Receita prevista total</div>
            </div>
          </div>
        </Col>
        <Col xs={6} md={4}>
          <div className="card-previsao-mini">
            <div className="card-previsao-icone" style={{background:'#d1fae5', color:'#065f46'}}>
              <i className="bi bi-calendar-check fs-5"></i>
            </div>
            <div>
              <div className="card-previsao-valor">{proximasEntradas.length}</div>
              <div className="card-previsao-label">Check-ins nos próx. 30 dias</div>
            </div>
          </div>
        </Col>
        <Col xs={6} md={4}>
          <div className="card-previsao-mini">
            <div className="card-previsao-icone" style={{background:'#fef3c7', color:'#92400e'}}>
              <i className="bi bi-percent fs-5"></i>
            </div>
            <div>
              <div className="card-previsao-valor">{taxaAprovacao}%</div>
              <div className="card-previsao-label">Taxa de aprovação histórica</div>
            </div>
          </div>
        </Col>
      </Row>

      <div className="grafico-wrapper-admin">
        <div className="grafico-header-admin">
          <h6 className="fw-bold mb-0" style={{color:'#223a5e', fontSize:'0.9rem'}}>Receita por Mês (próx. 4 meses)</h6>
          <div className="legenda-grafico">
            <span className="legenda-item"><span className="dot" style={{background:'#3b6399'}}></span>Confirmada</span>
            <span className="legenda-item"><span className="dot" style={{background:'#fbbf24'}}></span>Potencial (pendente)</span>
          </div>
        </div>
        <div className="grafico-barras">
          {dadosMeses.map(({ label, confirmada, potencial, total }) => (
            <div key={label} className="grafico-coluna">
              <div className="grafico-valor-topo">{total > 0 ? fmtMoeda(total).replace('R$\u00a0','R$ ') : '—'}</div>
              <div className="grafico-barra-container">
                <div className="grafico-barra-stack">
                  <div className="grafico-barra confirmada" style={{ height: `${(confirmada / maxValor) * 160}px` }} title={`Confirmada: ${fmtMoeda(confirmada)}`}></div>
                  {potencial > 0 && (
                    <div className="grafico-barra potencial" style={{ height: `${(potencial / maxValor) * 160}px` }} title={`Potencial: ${fmtMoeda(potencial)}`}></div>
                  )}
                </div>
              </div>
              <div className="grafico-label-mes">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {proximasEntradas.length > 0 && (
        <div className="proximas-entradas-wrapper mt-4">
          <h6 className="label-lista-mes mb-3">Próximas Entradas (30 dias)</h6>
          {proximasEntradas.map(r => {
            const diasAte = Math.round((new Date(r.checkin + 'T00:00:00') - hoje) / 86400000);
            return (
              <div key={r.id} className="item-proxima-entrada">
                <div className={`dot-inline ${r.status === 'aprovada' ? 'dot-aprovada' : 'dot-pendente'}`}></div>
                <div className="mini-avatar" style={{width:28,height:28,fontSize:'0.75rem'}}>{r.hospede.charAt(0)}</div>
                <div className="flex-grow-1">
                  <div className="fw-semibold" style={{fontSize:'0.85rem'}}>{r.hospede}</div>
                  <div className="text-muted" style={{fontSize:'0.75rem'}}>{fmtData(r.checkin)} • {noites(r.checkin, r.checkout)} noite(s) • {r.hospedes} pessoa(s)</div>
                </div>
                <div className="text-end">
                  <div className="dias-ate-badge">em {diasAte === 0 ? 'hoje' : `${diasAte}d`}</div>
                  <BadgeStatus status={r.status}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Principal ──────────────────────────────────────────────────────
function DashboardAdministrador() {
  const { usuario, tipo, logout } = useAutenticacao();
  const { adicionar } = useNotificacoes();
  const navigate = useNavigate();

  const [sidebarAberta, setSidebarAberta] = useState(() => window.innerWidth >= 992);
  const [abaAtiva,    setAbaAtiva]    = useState('visao-geral');
  const [reservas,    setReservas]    = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [filtro,      setFiltro]      = useState('todas');
  const [feedback,    setFeedback]    = useState({ tipo:'', msg:'' });

  useEffect(() => { if (tipo !== 'admin') navigate('/'); }, [tipo, navigate]);

  useEffect(() => {
    const onResize = () => setSidebarAberta(window.innerWidth >= 992);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { setReservas(inicializarReservas()); }, []);

  const salvar = (novas) => {
    localStorage.setItem(CHAVE_RESERVAS, JSON.stringify(novas));
    setReservas(novas);
  };

  const fb = (tipo, msg) => {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback({ tipo:'', msg:'' }), 3500);
  };

  const aprovar = useCallback((id) => {
    const r = reservas.find(x => x.id === id);
    salvar(reservas.map(x => x.id === id ? { ...x, status:'aprovada' } : x));
    setSelecionada(null);
    fb('sucesso', `Reserva #${id} aprovada!`);
    adicionar({
      titulo: 'Reserva Aprovada ✅',
      mensagem: `Reserva de ${r?.hospede} (${fmtData(r?.checkin)} → ${fmtData(r?.checkout)}) foi aprovada.`,
      tipo: 'sucesso',
      icone: 'bi-check-circle-fill',
    });
  }, [reservas, adicionar]);

  const recusar = useCallback((id) => {
    const r = reservas.find(x => x.id === id);
    salvar(reservas.map(x => x.id === id ? { ...x, status:'recusada' } : x));
    setSelecionada(null);
    fb('erro', `Reserva #${id} recusada.`);
    adicionar({
      titulo: 'Reserva Recusada ❌',
      mensagem: `Reserva de ${r?.hospede} (${fmtData(r?.checkin)} → ${fmtData(r?.checkout)}) foi recusada.`,
      tipo: 'erro',
      icone: 'bi-x-circle-fill',
    });
  }, [reservas, adicionar]);

  const pendentes    = reservas.filter(r => r.status === 'pendente').length;
  const aprovadas    = reservas.filter(r => r.status === 'aprovada').length;
  const receita      = reservas.filter(r => r.status === 'aprovada').reduce((a,r) => a + r.valorTotal, 0);
  const hoje         = new Date();
  const diasNoMes    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diasOcupados = reservas.filter(r => r.status === 'aprovada').reduce((acc, r) => {
    const ini = new Date(r.checkin + 'T00:00:00');
    const fim = new Date(r.checkout + 'T00:00:00');
    for (let d = new Date(ini); d < fim; d = new Date(d.getTime() + 86400000)) {
      if (d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear()) acc++;
    }
    return acc;
  }, 0);
  const ocupacao = Math.min(100, Math.round((diasOcupados / diasNoMes) * 100));

  const abas = [
    { id:'visao-geral', label:'Visão Geral', icone:<Ico.Dash/>  },
    { id:'reservas',    label:'Reservas',    icone:<Ico.Reservas/>},
    { id:'calendario',  label:'Calendário',  icone:<Ico.Cal/>    },
    { id:'previsao',    label:'Previsão',    icone:<Ico.Previsao/>},
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
            <p className="dash-section-label">Resumo Geral</p>
            <Row className="g-3 mb-4">
              <Col xs={6} xl={3}><CardResumo icone={<i className="bi bi-calendar-check fs-4"></i>} titulo="Total de Reservas" valor={reservas.length} sub="desde o início" cor="#3b6399"/></Col>
              <Col xs={6} xl={3}><CardResumo icone={<i className="bi bi-hourglass-split fs-4"></i>} titulo="Aguardando Aprovação" valor={pendentes} sub={pendentes > 0 ? 'requer atenção' : 'tudo em dia'} cor="#f59e0b"/></Col>
              <Col xs={6} xl={3}><CardResumo icone={<i className="bi bi-house-check fs-4"></i>} titulo="Ocupação no Mês" valor={`${ocupacao}%`} sub={`${diasOcupados}/${diasNoMes} dias`} cor="#198754"/></Col>
              <Col xs={6} xl={3}><CardResumo icone={<i className="bi bi-cash-coin fs-4"></i>} titulo="Receita Confirmada" valor={fmtMoeda(receita)} sub={`${aprovadas} aprovadas`} cor="#0d6efd"/></Col>
            </Row>
            
            {pendentes > 0 && (
              <div className="alerta-pendentes-admin mb-4" role="button" onClick={() => { setAbaAtiva('reservas'); setFiltro('pendente'); }}>
                <i className="bi bi-bell-fill me-2"></i>
                <strong>{pendentes} reserva{pendentes > 1 ? 's' : ''} aguardando aprovação.</strong>
                <span className="ms-2" style={{textDecoration:'underline'}}>Ver agora →</span>
              </div>
            )}

            <p className="dash-section-label">Últimas Reservas</p>
            
            <TabelaReservas 
              reservas={ultimasReservas} 
              reservasGerais={reservas} 
              onVer={setSelecionada}
              onAprovar={aprovar} 
              onRecusar={recusar} 
              filtro={filtro} 
              setFiltro={setFiltro}
            />
          </>
        );
      }
      case 'reservas': return (
        <>
          <p className="dash-section-label">Gerenciamento de Reservas</p>
          <TabelaReservas reservas={reservas} onVer={setSelecionada}
            onAprovar={aprovar} onRecusar={recusar} filtro={filtro} setFiltro={setFiltro}/>
        </>
      );
      case 'calendario': return (
        <>
          <p className="dash-section-label">Calendário de Ocupação</p>
          <CalendarioOcupacao reservas={reservas}/>
        </>
      );
      case 'previsao': return (
        <>
          <p className="dash-section-label">Previsão de Receita</p>
          <PrevisaoReceita reservas={reservas}/>
        </>
      );
      default: return null;
    }
  };

  return (
    <div className="dashboard-admin-shell">
      {sidebarAberta && window.innerWidth < 992 && (
        <div className="sidebar-overlay" onClick={() => setSidebarAberta(false)}/>
      )}
      <aside className={`sidebar-admin ${sidebarAberta ? 'aberta' : 'colapsada'}`}>
        <div className="sidebar-topo">
          <button className="btn-toggle-sidebar" onClick={() => setSidebarAberta(s => !s)} aria-label="Toggle menu">
            <Ico.Menu/>
          </button>
          {sidebarAberta && <span className="sidebar-marca">Recanto Admin</span>}
        </div>
        <nav className="sidebar-nav">
          {abas.map(a => (
            <button key={a.id} type="button" className={`sidebar-item${abaAtiva === a.id ? ' ativo' : ''}`} onClick={() => irAba(a.id)} title={!sidebarAberta ? a.label : ''}>
              <span className="sidebar-icone">{a.icone}</span>
              {sidebarAberta && <span className="sidebar-label">{a.label}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-rodape">
          <Link to="/" className="sidebar-item sidebar-item-link" title={!sidebarAberta ? 'Voltar ao site' : ''}>
            <span className="sidebar-icone"><Ico.Voltar/></span>
            {sidebarAberta && <span className="sidebar-label">Voltar ao site</span>}
          </Link>
          <button type="button" className="sidebar-item" onClick={() => navigate('/Configuracoes')} title={!sidebarAberta ? 'Configurações' : ''}>
            <span className="sidebar-icone"><Ico.Config/></span>
            {sidebarAberta && <span className="sidebar-label">Configurações</span>}
          </button>
          <button type="button" className="sidebar-item sair" onClick={() => { logout(); navigate('/'); }} title={!sidebarAberta ? 'Sair' : ''}>
            <span className="sidebar-icone"><Ico.Sair/></span>
            {sidebarAberta && <span className="sidebar-label">Sair</span>}
          </button>
        </div>
      </aside>
      <main className="dashboard-admin-main">
        <div className="topbar-admin">
          <div className="topbar-esquerda">
            <div>
              <h4 className="topbar-titulo mb-0">{abas.find(a => a.id === abaAtiva)?.label}</h4>
              <span className="topbar-sub">Olá, {usuario?.nome?.split(' ')[0]}!</span>
            </div>
          </div>
          <div className="topbar-direita">
            <Notificacoes/>
            <div className="topbar-avatar" title={usuario?.nome}>{usuario?.nome?.charAt(0)}</div>
          </div>
        </div>
        {feedback.msg && (
          <Alert variant={feedback.tipo === 'sucesso' ? 'success' : 'danger'} className="alert-feedback-admin border-0 shadow-sm mx-4 mt-3">
            <i className={`bi ${feedback.tipo === 'sucesso' ? 'bi-check-circle' : 'bi-x-circle'} me-2`}></i>
            {feedback.msg}
          </Alert>
        )}
        <div className="dashboard-admin-conteudo">{renderConteudo()}</div>
      </main>
      <ModalReserva reserva={selecionada} aoFechar={() => setSelecionada(null)} aoAprovar={aprovar} aoRecusar={recusar}/>
    </div>
  );
}

export default DashboardAdministrador;