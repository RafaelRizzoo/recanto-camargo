/**
 * DashboardAdministrador.jsx
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Row, Col, Card, Modal, Alert, Button } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import Calendar from 'react-calendar';
import { useAutenticacao } from '../hooks/useAutenticacao';
import Notificacoes from '../components/UI/Notificacoes';
import 'react-calendar/dist/Calendar.css';
import './DashboardAdministrador.css';

// ─── Utilitários ─────────────────────────────────────────────────────────────
const fmtData  = (s) => { if (!s) return '—'; const [a,m,d]=s.split('-'); return `${d}/${m}/${a}`; };
const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
const noites   = (ci, co) => Math.round((new Date(co+'T00:00:00') - new Date(ci+'T00:00:00')) / 86400000);

const STATUS_CFG = {
  pendente: { label:'Pendente', bg:'#fff3cd', cor:'#856404' },
  aprovada: { label:'Confirmada', bg:'#d1e7dd', cor:'#0f5132' },
  recusada: { label:'Recusada', bg:'#f8d7da', cor:'#842029' },
  cancelada: { label:'Cancelada', bg:'#f8d7da', cor:'#842029' },
  concluida: { label:'Concluída', bg:'#dbeafe', cor:'#1e40af' },
};

// ─── Ícones ───────────────────────────────────────────────────────────────────
const Ico = {
  Dash:    ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Reservas:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>,
  Cal:     ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  Previsao:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Estrela: ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
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

function EstrelasAvaliacao({ nota, tamanho = '1rem' }) {
  const valor = Math.min(5, Math.max(0, Number(nota) || 0));

  return (
    <span
      className="avaliacao-admin-estrelas"
      role="img"
      aria-label={`${valor.toLocaleString('pt-BR')} de 5 estrelas`}
      style={{ fontSize: tamanho }}
    >
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

// ─── Modal Detalhe ────────────────────────────────────────────────────────────
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
              {[['Check-in', fmtData(r.checkin)], ['Check-out', fmtData(r.checkout)], ['Noites', n]].map(([l,v]) => (
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
              <div className="bloco-data-modal" style={{background:'#f0fdf4'}}>
                <div className="label-data-modal">Total</div>
                <div className="cli-bloco-valor" style={{color:'#198754'}}>{fmtMoeda(r.total || r.valorTotal)}</div>
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
              <div className="obs-modal" style={{background:'#fff1f2',border:'1px solid #fecaca',color:'#9a3412'}}>{reserva.motivoRecusa}</div>
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


function ModalResponderAvaliacao({ avaliacao, aoFechar, aoResponder }) {
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setNota(5);
    setComentario('');
    setErro('');
    setEnviando(false);
  }, [avaliacao?.id]);

  if (!avaliacao) return null;

  const comentarioLimpo = comentario.trim();
  const notaValida = Number.isFinite(Number(nota))
    && Number(nota) >= 1
    && Number(nota) <= 5
    && Number(nota) * 2 === Math.round(Number(nota) * 2);
  const formularioValido = notaValida && comentarioLimpo.length >= 1 && comentarioLimpo.length <= 255;

  const fechar = () => {
    if (!enviando) aoFechar();
  };

  const enviarResposta = async (evento) => {
    evento.preventDefault();
    if (!formularioValido || enviando) return;

    setEnviando(true);
    setErro('');

    try {
      const resposta = await fetch(`http://localhost:3000/api/proprietario/avaliacoes/${avaliacao.id}/responder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nota: Number(nota), comentario: comentarioLimpo }),
      });
      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(dados.error || 'Não foi possível enviar a resposta. Tente novamente.');
      }

      aoResponder(avaliacao.id, dados.respostaProprietario);
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
          <Modal.Title>Responder avaliação</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="avaliacao-modal-contexto mb-4">
            <div className="mini-avatar">{avaliacao.hospede.nome.charAt(0)}</div>
            <div>
              <div className="fw-bold">{avaliacao.hospede.nome}</div>
              <div className="text-muted small">
                Reserva #{avaliacao.reserva.id} · {avaliacao.imovel.nome}
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

          <label htmlFor="nota-hospede" className="label-secao-modal d-block">
            Nota do hóspede: <strong>{Number(nota).toLocaleString('pt-BR')}</strong>/5
          </label>
          <input
            id="nota-hospede"
            className="form-range avaliacao-nota-range"
            type="range"
            min="1"
            max="5"
            step="0.5"
            value={nota}
            onChange={evento => setNota(Number(evento.target.value))}
            aria-valuetext={`${Number(nota).toLocaleString('pt-BR')} de 5 estrelas`}
            disabled={enviando}
          />
          <div className="d-flex justify-content-between text-muted small mb-4" aria-hidden="true">
            <span>1 — Ruim</span>
            <span>5 — Excelente</span>
          </div>

          <div className="d-flex align-items-center justify-content-between gap-2">
            <label htmlFor="comentario-proprietario" className="label-secao-modal mb-2">
              Comentário <span className="text-danger">*</span>
            </label>
            <span className={`avaliacao-contador${comentario.length >= 240 ? ' limite' : ''}`}>
              {comentario.length}/255
            </span>
          </div>
          <textarea
            id="comentario-proprietario"
            className="form-controle-config w-100"
            rows={4}
            maxLength={255}
            placeholder="Conte como foi receber este hóspede..."
            value={comentario}
            onChange={evento => setComentario(evento.target.value)}
            disabled={enviando}
            required
            style={{ borderRadius: '12px', padding: '0.85rem 1rem', border: '1px solid #e2e8f0', resize: 'vertical' }}
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
        <p>Quando um hóspede avaliar uma estadia concluída, ela aparecerá aqui.</p>
      </div>
    );
  }

  const media = avaliacoes.reduce((total, item) => total + Number(item.nota || 0), 0) / avaliacoes.length;

  return (
    <>
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl={4}>
          <CardResumo
            icone={<i className="bi bi-chat-square-dots fs-4" aria-hidden="true" />}
            titulo="Aguardando resposta"
            valor={avaliacoes.length}
            sub="avaliações pendentes"
            cor="#f59e0b"
          />
        </Col>
        <Col xs={12} sm={6} xl={4}>
          <CardResumo
            icone={<i className="bi bi-star-fill fs-4" aria-hidden="true" />}
            titulo="Média recebida"
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
                <div className="avatar-avaliacao-admin">{avaliacao.hospede.nome.charAt(0)}</div>
                <div>
                  <div className="fw-bold" style={{ color: '#223a5e' }}>{avaliacao.hospede.nome}</div>
                  <div className="text-muted small">Reserva #{avaliacao.reserva.id}</div>
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
              <span><i className="bi bi-house me-1" aria-hidden="true" />{avaliacao.imovel.nome}</span>
              <span><i className="bi bi-calendar3 me-1" aria-hidden="true" />{fmtData(avaliacao.reserva.checkin)} → {fmtData(avaliacao.reserva.checkout)}</span>
            </div>

            <button type="button" className="btn-responder-avaliacao" onClick={() => aoResponder(avaliacao)}>
              <i className="bi bi-reply me-2" aria-hidden="true" />Responder avaliação
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

// ─── Tabela ──────────────────────────────────────────────────
function TabelaReservas({ reservas, onVer, filtro, setFiltro, reservasGerais }) {
  const baseContagem = reservasGerais || reservas;

  const lista = filtro === 'todas' ? reservas : reservas.filter(r => r.status === filtro);
  const cnt   = s => s === 'todas' ? baseContagem.length : baseContagem.filter(r => r.status === s).length;

  return (
    <div className="tabela-wrapper-admin">
      <div className="tabela-header-admin">
        <h5 className="mb-0 fw-bold" style={{color:'#223a5e'}}>Gerenciar Reservas</h5>
        <div className="filtros-status-admin">
          {['todas','pendente','aprovada','concluida','recusada','cancelada'].map(f => (
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
                    <div className="mini-avatar">{(r.nome || r.hospede || '?').charAt(0)}</div>
                    <div>
                      <div className="fw-semibold" style={{fontSize:'0.875rem'}}>{r.nome || r.hospede}</div>
                      <div className="text-muted" style={{fontSize:'0.75rem'}}>{r.hospedes} pessoa(s)</div>
                    </div>
                  </div>
                </td>
                <td style={{fontSize:'0.875rem'}}>{fmtData(r.checkin)}</td>
                <td style={{fontSize:'0.875rem'}}>{fmtData(r.checkout)}</td>
                <td className="d-none d-md-table-cell text-center" style={{fontSize:'0.875rem'}}>{noites(r.checkin,r.checkout)}</td>
                <td className="fw-bold" style={{color:'#198754',fontSize:'0.875rem'}}>{fmtMoeda(r.total || r.valorTotal)}</td>
                <td><BadgeStatus status={r.status}/></td>
                <td>
                  <div className="acoes-tabela">
                    <button className="btn-acao-tabela ver" onClick={() => onVer(r)} title="Ver detalhes"><i className="bi bi-eye"></i></button>
                    {r.status === 'aprovada' && (
                      <button className="btn-acao-tabela concluir text-primary" onClick={() => onVer(r)} title="Concluir Estadia"><i className="bi bi-check2-circle"></i></button>
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
          <span className="legenda-item"><span className="dot dot-aprovada"></span>Confirmada</span>
          {reservas.some(r => r.status === 'pendente') && <span className="legenda-item"><span className="dot dot-pendente"></span>Pendente</span>}
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
                <span className="fw-semibold" style={{fontSize:'0.875rem'}}>{r.nome || r.hospede}</span>
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
    const confirmada = doMes.filter(r => r.status === 'aprovada').reduce((a,r) => a + (r.total || r.valorTotal || 0), 0);
    const potencial  = doMes.filter(r => r.status === 'pendente').reduce((a,r) => a + (r.total || r.valorTotal || 0), 0);
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
    .reduce((a, r) => a + (r.total || r.valorTotal || 0), 0);

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
                  <div className="grafico-barra confirmada" style={{ height: `${(confirmada / maxValor) * 100}%` }} title={`Confirmada: ${fmtMoeda(confirmada)}`}></div>
                  {potencial > 0 && (
                    <div className="grafico-barra potencial" style={{ height: `${(potencial / maxValor) * 100}%` }} title={`Potencial: ${fmtMoeda(potencial)}`}></div>
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
                <div className="mini-avatar" style={{width:28,height:28,fontSize:'0.75rem'}}>{(r.nome || r.hospede || '?').charAt(0)}</div>
                <div className="flex-grow-1">
                  <div className="fw-semibold" style={{fontSize:'0.85rem'}}>{r.nome || r.hospede}</div>
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
  const navigate = useNavigate();
  const usuarioId = usuario?.id ?? null;
  const sessaoReservasRef = useRef(null);

  const [sidebarAberta, setSidebarAberta] = useState(() => window.innerWidth >= 992);
  const [abaAtiva,    setAbaAtiva]    = useState('visao-geral');
  const [reservas,    setReservas]    = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [feedback, setFeedback] = useState({ tipo:'', msg:'' });
  const [avaliacoesPendentes, setAvaliacoesPendentes] = useState([]);
  const [carregandoAvaliacoes, setCarregandoAvaliacoes] = useState(true);
  const [erroAvaliacoes, setErroAvaliacoes] = useState('');
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);

  useEffect(() => { if (tipo !== 'proprietario') navigate('/'); }, [tipo, navigate]);

  useEffect(() => {
    const onResize = () => setSidebarAberta(window.innerWidth >= 992);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const buscarReservas = useCallback(async () => {
    const sessao = sessaoReservasRef.current;
    if (!sessao?.ativa || sessao.usuarioId !== usuarioId || tipo !== 'proprietario') return;
    if (sessao.promessa) {
      // Uma notificação recebida durante o GET exige mais uma leitura ao final.
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
          const resposta = await fetch('http://localhost:3000/api/proprietario/reservas', {
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

  async function decidirReserva(id, acao, motivo) {
    const sessao = sessaoReservasRef.current;
    if (!sessao?.ativa) throw new Error('Faça login novamente para decidir a reserva.');
    const resposta = await fetch(`http://localhost:3000/api/proprietario/reservas/${id}/${acao}`, {
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
    setFeedback({ tipo: 'sucesso', msg: dados.message || 'Decisão salva com sucesso.' });
    await buscarReservas();
  }

  const buscarAvaliacoesPendentes = useCallback(async (signal) => {
    setCarregandoAvaliacoes(true);
    setErroAvaliacoes('');

    try {
      const resposta = await fetch('http://localhost:3000/api/proprietario/avaliacoes/pendentes', {
        credentials: 'include',
        signal,
      });
      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(dados.error || 'Não foi possível carregar as avaliações.');
      }
      if (!Array.isArray(dados)) {
        throw new Error('O servidor retornou um formato de avaliações inválido.');
      }

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


  const fb = (tipo, msg) => {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback({ tipo:'', msg:'' }), 3500);
  };


  const confirmarRespostaAvaliacao = useCallback((id) => {
    setAvaliacoesPendentes(atuais => atuais.filter(item => item.id !== id));
    setAvaliacaoSelecionada(null);
    fb('sucesso', 'Resposta enviada com sucesso.');
  }, []);

  const aprovadas    = reservas.filter(r => r.status === 'aprovada').length;
  const receita      = reservas.filter(r => r.status === 'aprovada').reduce((a,r) => a + (r.total || r.valorTotal || 0), 0);
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
    { id:'avaliacoes',  label:'Avaliações',  icone:<Ico.Estrela/>},
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
              <Col xs={6} xl={3}><CardResumo icone={<i className="bi bi-calendar-check fs-4"></i>} titulo="Reservas Confirmadas" valor={aprovadas} sub="aprovadas pelo proprietário" cor="#f59e0b"/></Col>
              <Col xs={6} xl={3}><CardResumo icone={<i className="bi bi-house-check fs-4"></i>} titulo="Ocupação no Mês" valor={`${ocupacao}%`} sub={`${diasOcupados}/${diasNoMes} dias`} cor="#198754"/></Col>
              <Col xs={6} xl={3}><CardResumo icone={<i className="bi bi-cash-coin fs-4"></i>} titulo="Receita Confirmada" valor={fmtMoeda(receita)} sub={`${aprovadas} confirmadas`} cor="#0d6efd"/></Col>
            </Row>
            

            <p className="dash-section-label">Últimas Reservas</p>
            
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
          <TabelaReservas reservas={reservas} onVer={setSelecionada}
            filtro={filtro} setFiltro={setFiltro}/>
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
        <div className="sidebar-overlay" onClick={() => setSidebarAberta(false)}/>
      )}
      <aside className={`sidebar-admin ${sidebarAberta ? 'aberta' : 'colapsada'}`}>
        <div className="sidebar-topo">
          {/* <button className="btn-toggle-sidebar" onClick={() => setSidebarAberta(s => !s)} aria-label="Toggle menu">
            <Ico.Menu/>
          </button> */}
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
            <button type="button" className="btn-menu-topbar me-3"
         onClick={() => setSidebarAberta(s => !s)}
        aria-label="Toggle menu"
           >
      <Ico.Menu/>
      </button>
            <div>
              <h4 className="topbar-titulo mb-0">{abas.find(a => a.id === abaAtiva)?.label}</h4>
              <span className="topbar-sub">Olá, {usuario?.nome?.split(' ')[0]}!</span>
            </div>
          </div>
          <div className="topbar-direita">
            <Notificacoes aoNovaNotificacao={buscarReservas}/>
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
      <ModalReserva reserva={selecionada} aoFechar={() => setSelecionada(null)} aoDecidir={decidirReserva}/>
      <ModalResponderAvaliacao
        avaliacao={avaliacaoSelecionada}
        aoFechar={() => setAvaliacaoSelecionada(null)}
        aoResponder={confirmarRespostaAvaliacao}
      />
    </div>
  );
}

export default DashboardAdministrador;
