/**
 * DashboardCliente.jsx
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Row, Col, Modal, Alert } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { usePreferencias } from '../hooks/usePreferencias';
import Notificacoes from '../components/UI/Notificacoes';
import { API_BASE, IS_API_AVAILABLE } from '../utils/api';
import { contato } from '../data/conteudoSite';
import '../components/home/home.css';
import './DashboardCliente.css';

const CHAVE_RESERVAS_CLIENTE = 'recanto_reservas_cliente';
const URL_WHATSAPP = `https://wa.me/${contato.whatsapp}`;

// ─── Utilitários ──────────────────────────────────────────────────────────────
const fmtData = (s) => {
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

const fmtMoeda = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const normalizarCupom = (cupom) => {
  const tipoDesconto = String(cupom.tipoDesconto || '').toUpperCase();
  const valorDesconto = Number(cupom.valorDesconto);

  return {
    id: cupom.cupomId,
    codigo: cupom.codigo,
    tipoDesconto,
    valorDesconto,
    validoAte: cupom.validoAte,
    icone: tipoDesconto === 'PERCENTUAL' ? 'bi-gift' : 'bi-tag',
    ativo: true,
    usado: Boolean(cupom.usado),
  };
};

const descreverCupom = (cupom, t) => {
  if (cupom.tipoDesconto === 'PERCENTUAL') {
    const valor = cupom.valorDesconto.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    return t('{valor}% de desconto na próxima reserva', { valor });
  }
  return t('{valor} de desconto na próxima reserva', { valor: fmtMoeda(cupom.valorDesconto) });
};

const normalizarDataAvaliacao = (data) => {
  const valor = String(data || '');
  const dataIso = valor.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dataIso) ? dataIso : '';
};

const normalizarRespostaProprietario = (resposta) => {
  if (!resposta || typeof resposta !== 'object') return null;

  const nota = Number(resposta.nota ?? resposta.Ava_NotaPropietario);
  if (!Number.isFinite(nota) || nota < 1 || nota > 5 || !Number.isInteger(nota * 2)) return null;

  return {
    nota,
    comentario: String(resposta.comentario ?? resposta.Ava_ComentarioPropietario ?? ''),
    data: normalizarDataAvaliacao(resposta.data ?? resposta.Ava_DataPropietario),
  };
};

const normalizarAvaliacao = (avaliacao) => {
  if (!avaliacao || typeof avaliacao !== 'object') return null;

  const nota = Number(avaliacao.nota ?? avaliacao.Ava_Nota);
  const data = normalizarDataAvaliacao(avaliacao.data ?? avaliacao.Ava_Data);
  if (!Number.isFinite(nota) || nota < 1 || nota > 5 || !Number.isInteger(nota * 2) || !data) return null;

  return {
    id: avaliacao.id ?? avaliacao.avaliacaoId ?? avaliacao.Ava_Id,
    nota,
    comentario: String(avaliacao.comentario ?? avaliacao.Ava_Comentario ?? ''),
    data,
    respostaProprietario: normalizarRespostaProprietario(
      avaliacao.respostaProprietario ?? avaliacao.resposta
    ),
  };
};

const calcNoites = (ci, co) =>
  Math.round((new Date(co + 'T00:00:00') - new Date(ci + 'T00:00:00')) / 86400000);

const diasAteCheckin = (ci) => {
  if (!ci) return 0;
  const dataCi = new Date(ci + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((dataCi - hoje) / 86400000);
};

const podeCancelar = (reservaOuCheckin, checkout) => {
  if (!reservaOuCheckin) return false;
  if (typeof reservaOuCheckin === 'object') {
    const r = reservaOuCheckin;
    const statusValido = ['aprovada', 'pendente', 'pagamento pendente'].includes(r.status);
    if (!statusValido) return false;
    const dataRef = r.checkout || r.checkin;
    if (!dataRef) return true;
    const fim = new Date(dataRef + 'T11:00:00');
    return new Date() <= fim;
  }
  const dataRef = checkout || reservaOuCheckin;
  const fim = new Date(dataRef + 'T11:00:00');
  return new Date() <= fim;
};

const STATUS_CFG = {
  pendente:  { label: 'Pendente',   icone: 'bi-hourglass-split' },
  'pagamento pendente': { label: 'Pagamento Pendente', icone: 'bi-credit-card-2-front' },
  aprovada:  { label: 'Aprovada',   icone: 'bi-check-circle'    },
  cancelada: { label: 'Cancelada',  icone: 'bi-x-circle'        },
  concluida: { label: 'Concluída',  icone: 'bi-award'           },
  recusada:  { label: 'Recusada',   icone: 'bi-x-circle'        },
};

const classeStatus = (status) => `st-${String(status || 'pendente').replace(/\s+/g, '-')}`;

// ─── Ícones SVG ───────────────────────────────────────────────────────────────
const Ico = {
  Dash:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Reservas: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01"/></svg>,
  Estrela:  () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Cupom:    () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Voltar:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Config:   () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Sair:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Menu:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Whats:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.215a.75.75 0 0 0 .912.912l5.344-1.47A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.658-.523-5.172-1.432l-.372-.222-3.863 1.063 1.064-3.868-.228-.377A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>,
};

// ─── Subcomponentes ───────────────────────────────────────────────────────────
function BadgeStatus({ status }) {
  const { t } = usePreferencias();
  const c = STATUS_CFG[status] || STATUS_CFG.pendente;
  return (
    <span className={`cli-badge-status ${classeStatus(status)}`}>
      <i className={`bi ${c.icone} me-1`} aria-hidden="true"></i>{t(c.label)}
    </span>
  );
}
BadgeStatus.propTypes = { status: PropTypes.string.isRequired };

function Estrelas({ nota, tamanho = '1.1rem' }) {
  return (
    <div className="cli-estrelas" aria-hidden="true">
      {[1, 2, 3, 4, 5].map(n => {
        const icone = nota >= n ? 'bi-star-fill' : nota >= n - 0.5 ? 'bi-star-half' : 'bi-star';
        return <i key={n} className={`bi ${icone}`} style={{ fontSize: tamanho }} />;
      })}
    </div>
  );
}
Estrelas.propTypes = {
  nota: PropTypes.number.isRequired,
  tamanho: PropTypes.string,
};

// Textos de quantidade com singular/plural (o inglês tem entradas próprias em en.js).
const textoNoites = (t, n) => (n > 1 ? t("{n} noites", { n }) : t("{n} noite", { n }));
const textoPessoas = (t, n) => (n > 1 ? t("{n} pessoas", { n }) : t("{n} pessoa", { n }));

// ─── Modal Detalhe da Reserva ─────────────────────────────────────────────────
function ModalDetalheReserva({ reserva, aoFechar, aoCancelar, aoPagar, pagando = false }) {
  const { t } = usePreferencias();
  if (!reserva) return null;
  const n = calcNoites(reserva.checkin, reserva.checkout);
  const podeCanc = podeCancelar(reserva);
  const reembolsado = Number(reserva.valorReembolsado) > 0;
  return (
    <Modal show onHide={aoFechar} centered scrollable size="lg" className="cli-modal">
      <Modal.Header closeButton className="cli-modal-header py-2 px-3 px-md-4">
        <Modal.Title className="d-flex align-items-center gap-2">
          <i className="bi bi-calendar2-check-fill" aria-hidden="true"></i> {t('Reserva #{id}', { id: reserva.id })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-3 px-md-4">
        <Row className="g-3">
          {/* Banner do Imóvel + Data de Solicitação */}
          <Col xs={12}>
            <div className="cli-modal-imovel d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex align-items-center gap-3">
                <div className="cli-modal-imovel-img">
                  <i className="bi bi-house-heart" aria-hidden="true"></i>
                </div>
                <div>
                  <div className="cli-modal-imovel-nome">{reserva.imovel}</div>
                  <div className="cli-muted small mt-1">
                    <i className="bi bi-geo-alt-fill me-1" aria-hidden="true"></i>{reserva.localizacao}
                  </div>
                  <div className="mt-1"><BadgeStatus status={reserva.status} /></div>
                </div>
              </div>
              {reserva.criadaEm && (
                <div className="text-md-end cli-muted small ms-auto">
                  <div className="cli-bloco-label mb-1">{t('Solicitada em')}</div>
                  <strong style={{ color: 'var(--rc-ink)', fontSize: '0.88rem' }}>{fmtDataHora(reserva.criadaEm, t)}</strong>
                </div>
              )}
            </div>
          </Col>

          {/* Coluna 1: Período & Hóspedes */}
          <Col md={6}>
            <div className="cli-painel">
              <div className="cli-label-secao d-flex align-items-center gap-1 mb-1">
                <i className="bi bi-calendar3" aria-hidden="true"></i> {t('Período & Hóspedes')}
              </div>
              <div className="d-flex gap-2">
                <div className="cli-bloco-dado flex-fill">
                  <div className="cli-bloco-label">{t('Check-in')}</div>
                  <div className="cli-bloco-valor">{fmtData(reserva.checkin)}</div>
                </div>
                <div className="cli-bloco-dado flex-fill">
                  <div className="cli-bloco-label">{t('Check-out')}</div>
                  <div className="cli-bloco-valor">{fmtData(reserva.checkout)}</div>
                </div>
              </div>
              <div className="d-flex gap-2">
                <div className="cli-bloco-dado flex-fill">
                  <div className="cli-bloco-label">{t('Duração')}</div>
                  <div className="cli-bloco-valor">{t('{n} noites', { n })}</div>
                </div>
                <div className="cli-bloco-dado flex-fill">
                  <div className="cli-bloco-label">{t('Hóspedes')}</div>
                  <div className="cli-bloco-valor">{t('{n} pessoas', { n: reserva.hospedes })}</div>
                </div>
              </div>
            </div>
          </Col>

          {/* Coluna 2: Valores & Pagamento */}
          <Col md={6}>
            <div className="cli-painel">
              <div className="cli-label-secao d-flex align-items-center gap-1 mb-1">
                <i className="bi bi-cash-stack" aria-hidden="true"></i> {t('Valores & Pagamento')}
              </div>
              <div className="d-flex gap-2">
                <div className="cli-bloco-dado flex-fill">
                  <div className="cli-bloco-label">{t('Diária')}</div>
                  <div className="cli-bloco-valor">{fmtMoeda(reserva.diaria ?? reserva.valorDiaria)}</div>
                </div>
                <div className="cli-bloco-dado flex-fill">
                  <div className="cli-bloco-label">{t('Método')}</div>
                  <div className="cli-bloco-valor">{reserva.formaPagamento || 'PIX'}</div>
                </div>
              </div>
              <div className="cli-bloco-dado total">
                <div className="cli-bloco-label">
                  <i className="bi bi-receipt me-1" aria-hidden="true"></i> {t('Valor Total')}
                </div>
                <div className="cli-bloco-valor">
                  {fmtMoeda(reserva.total ?? reserva.valorTotal)}
                </div>
              </div>
            </div>
          </Col>

          {/* Avisos de Status / Prazos */}
          {reserva.status === 'pagamento pendente' && (
            <Col xs={12}>
              <div className="cli-aviso">
                <div>
                  <strong><i className="bi bi-clock-history me-1" aria-hidden="true"></i> {t('Aguardando seu Pagamento:')}</strong> {t('Sua reserva foi pré-aprovada!')}
                </div>
                {reserva.expiraEm && (
                  <div className="mt-1 fw-bold">
                    <i className="bi bi-hourglass-split me-1" aria-hidden="true"></i> {t('Pague até {data} (24 horas) para garantir suas datas.', { data: fmtDataHora(reserva.expiraEm, t) })}
                  </div>
                )}
              </div>
            </Col>
          )}

          {reserva.status === 'pendente' && (
            <Col xs={12}>
              <div className="cli-aviso info">
                <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
                <strong>{t('Aguardando Aprovação do Anfitrião:')}</strong> {t('O proprietário analisa sua solicitação.')}
                {reserva.expiraEm && (
                  <span className="ms-1">
                    {t('Prazo para resposta: até')} <strong>{fmtDataHora(reserva.expiraEm, t)} {t('(48 horas)')}</strong>.
                  </span>
                )}
              </div>
            </Col>
          )}

          {(reserva.observacoes || reserva.observacao) && (
            <Col xs={12}>
              <p className="cli-label-secao mb-1">{t('Suas Observações')}</p>
              <div className="cli-obs-box">{reserva.observacoes || reserva.observacao}</div>
            </Col>
          )}

          {reserva.status === 'recusada' && (reserva.motivoRecusa || reserva.motivo) && (
            <Col xs={12}>
              <p className="cli-label-secao mb-1">{t('Motivo da Recusa')}</p>
              <div className="cli-motivo-recusa">
                <i className="bi bi-info-circle me-2" aria-hidden="true"></i>
                {reserva.motivoRecusa || reserva.motivo}
              </div>
            </Col>
          )}

          {reserva.status === 'cancelada' && (
            <Col xs={12}>
              <p className="cli-label-secao mb-1">{t('Cancelamento & Reembolso')}</p>
              <div className={`cli-motivo-recusa${reembolsado ? ' ok' : ''}`}>
                <i className={`bi ${reembolsado ? 'bi-arrow-counterclockwise' : 'bi-x-circle'} me-2`} aria-hidden="true"></i>
                {reembolsado ? (
                  <><strong>{t('Reembolso Processado:')}</strong> {t('{valor} estornados diretamente à sua operadora no Mercado Pago conforme a Cláusula 4 dos Termos de Uso.', { valor: fmtMoeda(reserva.valorReembolsado) })}</>
                ) : (
                  reserva.motivoRecusa || reserva.motivo || t('Cancelada conforme a política de uso.')
                )}
              </div>
            </Col>
          )}
        </Row>
      </Modal.Body>
      <Modal.Footer className="pt-3 pb-3 px-3 px-md-4 d-flex justify-content-between align-items-center gap-2">
        <button type="button" className="cli-btn-sec" onClick={aoFechar}>
          {t('Fechar')}
        </button>
        <div className="d-flex align-items-center gap-2">
          <a
            href={`${URL_WHATSAPP}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre minha reserva #${reserva.id} no Recanto Camargo.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="cli-btn-whats"
          >
            <Ico.Whats /> WhatsApp
          </a>
          {podeCanc && aoCancelar && (
            <button
              type="button"
              className="cli-btn-perigo-line"
              onClick={() => {
                aoFechar();
                aoCancelar(reserva);
              }}
            >
              <i className="bi bi-x-circle me-1" aria-hidden="true"></i>
              {t('Cancelar Reserva')}
            </button>
          )}
          {reserva.status === 'pagamento pendente' && aoPagar && (
            <button
              type="button"
              className="cli-btn-pagar"
              disabled={pagando}
              onClick={() => aoPagar(reserva)}
            >
              <i className="bi bi-credit-card-2-front me-1" aria-hidden="true"></i>
              {pagando ? t('Abrindo...') : t('Pagar Reserva')}
            </button>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
}
ModalDetalheReserva.propTypes = {
  reserva: PropTypes.object,
  aoFechar: PropTypes.func.isRequired,
  aoCancelar: PropTypes.func,
  aoPagar: PropTypes.func,
  pagando: PropTypes.bool,
};

// ─── Modal Cancelar Reserva ───────────────────────────────────────────────────
function ModalCancelar({ reserva, aoFechar, aoConfirmar, cancelando = false }) {
  const { t } = usePreferencias();
  const [motivo, setMotivo] = useState('');
  if (!reserva) return null;

  const estimativaReembolso = (() => {
    if (!reserva?.checkin) return null;
    if (reserva.status !== 'aprovada') return null;
    const checkinDate = new Date(reserva.checkin);
    const ano = checkinDate.getUTCFullYear();
    const mes = checkinDate.getUTCMonth();
    const dia = checkinDate.getUTCDate();
    const checkinHora = new Date(ano, mes, dia, 14, 0, 0, 0);
    const diffMs = checkinHora.getTime() - Date.now();
    const horas = Math.max(0, diffMs / (1000 * 60 * 60));
    const total = Number(reserva.total ?? reserva.valorTotal ?? 0);
    let percentual = 0;
    let descricao = '';
    let tom = 'err';

    if (horas >= 168) {
      percentual = 100;
      descricao = t('Cancelamento com mais de 7 dias de antecedência: 100% de reembolso integral estornado no Mercado Pago.');
      tom = 'ok';
    } else if (horas >= 48) {
      percentual = 50;
      descricao = t('Cancelamento entre 2 e 7 dias de antecedência: 50% de reembolso (retenção de 50%).');
      tom = '';
    } else {
      percentual = 0;
      descricao = t('Cancelamento com menos de 48h do check-in: sem direito a reembolso conforme os Termos de Uso (retenção de 100%).');
      tom = 'err';
    }
    const valor = Math.round((total * (percentual / 100)) * 100) / 100;
    return { percentual, valor, descricao, tom };
  })();

  return (
    <Modal show onHide={aoFechar} centered scrollable size="lg" className="cli-modal">
      <Modal.Header closeButton className="cli-modal-header-danger py-2 px-3 px-md-4">
        <Modal.Title>
          <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
          {t('Cancelar Reserva #{id}', { id: reserva.id })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-3 px-md-4 py-md-3">
        <Row className="g-3 mb-3">
          {/* Coluna 1: Sugestão de Remarcação */}
          <Col md={6}>
            <div className="cli-aviso ok h-100 d-flex flex-column justify-content-between">
              <div>
                <div className="fw-bold d-flex align-items-center mb-1">
                  <i className="bi bi-whatsapp me-2" aria-hidden="true" />
                  {t('Prefere remarcar sua estadia para outra data?')}
                </div>
                <div>
                  {t('Antes de cancelar, você pode solicitar a remarcação de datas diretamente com o anfitrião sem qualquer multa ou taxa extra!')}
                </div>
              </div>
              <div className="mt-3">
                <a
                  href={`${URL_WHATSAPP}?text=${encodeURIComponent(`Olá! Gostaria de verificar a possibilidade de remarcar minha reserva #${reserva.id} no Recanto Camargo.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cli-btn-whats"
                >
                  <i className="bi bi-whatsapp me-1" aria-hidden="true" />
                  {t('Remarcar no WhatsApp')}
                </a>
              </div>
            </div>
          </Col>

          {/* Coluna 2: Política de Cancelamento */}
          <Col md={6}>
            <div className="cli-aviso cli-aviso-politica h-100">
              <div className="fw-bold d-flex align-items-center mb-1">
                <i className="bi bi-shield-exclamation me-2" aria-hidden="true"></i>
                {t('Política de Cancelamento (Termos de Uso)')}
              </div>
              <ul>
                <li><strong>{t('Mais de 7 dias de antecedência:')}</strong> {t('100% de reembolso integral.')}</li>
                <li><strong>{t('Entre 2 e 7 dias de antecedência:')}</strong> {t('50% de reembolso.')}</li>
                <li><strong>{t('Com menos de 48h do check-in:')}</strong> {t('Não há reembolso (retenção de 100%).')}</li>
              </ul>
            </div>
          </Col>
        </Row>

        {estimativaReembolso && (
          <div className={`cli-aviso ${estimativaReembolso.tom} mb-3`}>
            <div className="fw-bold d-flex align-items-center mb-1">
              <i className="bi bi-info-circle-fill me-2" aria-hidden="true" />
              {t('Previsão de Reembolso: {valor} ({pct}%)', { valor: fmtMoeda(estimativaReembolso.valor), pct: estimativaReembolso.percentual })}
            </div>
            <div>{estimativaReembolso.descricao}</div>
          </div>
        )}

        <label htmlFor="motivo-cancelamento" className="cli-label">{t('Motivo do cancelamento (opcional)')}</label>
        <textarea
          id="motivo-cancelamento"
          className="cli-input"
          rows={2}
          placeholder={t('Nos conte o motivo do cancelamento...')}
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
        />
      </Modal.Body>
      <Modal.Footer className="pt-3 pb-3 px-3 px-md-4 d-flex justify-content-between align-items-center gap-2">
        <button type="button" className="cli-btn-sec" onClick={aoFechar} disabled={cancelando}>{t('Voltar')}</button>
        <button
          type="button"
          className="cli-btn-perigo"
          onClick={() => aoConfirmar(reserva.id, motivo)}
          disabled={cancelando}
        >
          {cancelando ? (
            <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />{t('Cancelando...')}</>
          ) : (
            <><i className="bi bi-x-circle me-2" aria-hidden="true" />{t('Confirmar Cancelamento')}</>
          )}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
ModalCancelar.propTypes = {
  reserva: PropTypes.object,
  aoFechar: PropTypes.func.isRequired,
  aoConfirmar: PropTypes.func.isRequired,
  cancelando: PropTypes.bool,
};

// ─── Modal Avaliação ──────────────────────────────────────────────────────────
function ModalAvaliar({ reserva, aoFechar, aoEnviar, enviando, erro }) {
  const { t } = usePreferencias();
  const [limpeza, setLimpeza] = useState(5);
  const [comunicacao, setComunicacao] = useState(5);
  const [localizacao, setLocalizacao] = useState(5);
  const [custoBeneficio, setCustoBeneficio] = useState(5);
  const [comentario, setComentario] = useState('');

  useEffect(() => {
    setLimpeza(5);
    setComunicacao(5);
    setLocalizacao(5);
    setCustoBeneficio(5);
    setComentario('');
  }, [reserva?.id]);

  if (!reserva) return null;

  // Média ponderada com arredondamento seguro para intervalo de meio ponto
  const mediaExata = (limpeza + comunicacao + localizacao + custoBeneficio) / 4;
  const notaGeral = Math.round(mediaExata * 2) / 2;

  const criterios = [
    { chave: 'limpeza',        label: 'Limpeza',         icone: 'bi-stars',         valor: limpeza,        definir: setLimpeza },
    { chave: 'comunicacao',    label: 'Comunicação',     icone: 'bi-chat-dots-fill', valor: comunicacao,    definir: setComunicacao },
    { chave: 'localizacao',    label: 'Localização',     icone: 'bi-geo-alt-fill',  valor: localizacao,    definir: setLocalizacao },
    { chave: 'custoBeneficio', label: 'Custo-benefício', icone: 'bi-tag-fill',      valor: custoBeneficio, definir: setCustoBeneficio },
  ];

  return (
    <Modal
      show
      onHide={() => { if (!enviando) aoFechar(); }}
      backdrop={enviando ? 'static' : true}
      keyboard={!enviando}
      centered
      size="lg"
      className="cli-modal cli-modal-avaliar"
    >
      <Modal.Header closeButton={!enviando} className="cli-modal-header">
        <Modal.Title>{t('Avaliar Estadia no Recanto Camargo')}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <div className="text-center mb-4">
          <div className="cli-modal-imovel-img mx-auto mb-3">
            <i className="bi bi-house-heart" aria-hidden="true"></i>
          </div>
          <div className="cli-nome-imovel">{reserva.imovel}</div>
          <div className="cli-muted small">{fmtData(reserva.checkin)} → {fmtData(reserva.checkout)}</div>
        </div>

        {/* Nota Média Geral */}
        <div className="cli-nota-geral mb-4">
          <p className="cli-nome-imovel mb-1">{t('Avaliação Geral do Chalé')}</p>
          <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
            <span className="cli-nota-geral-valor">{notaGeral.toFixed(1)}</span>
            <Estrelas nota={notaGeral} tamanho="1.6rem" />
          </div>
          <small className="cli-muted">{t('Calculada com base nos 4 critérios abaixo')}</small>
        </div>

        {/* Os 4 Subcritérios */}
        <p className="cli-nome-imovel mb-3">{t('Classifique cada critério da sua estadia:')}</p>
        <Row className="g-3 mb-4">
          {criterios.map(c => (
            <Col sm={6} key={c.chave}>
              <div className="cli-criterio">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="cli-criterio-nome">
                    <i className={`bi ${c.icone}`} aria-hidden="true"></i>{t(c.label)}
                  </span>
                  <span className="cli-criterio-nota">{c.valor.toFixed(1)} / 5</span>
                </div>
                <div className={`cli-estrelas-click${enviando ? ' travado' : ''}`}>
                  {[1, 2, 3, 4, 5].map(v => (
                    <i
                      key={v}
                      className={`bi ${c.valor >= v ? 'bi-star-fill' : 'bi-star'} estrela-animada`}
                      onClick={() => !enviando && c.definir(v)}
                    />
                  ))}
                </div>
              </div>
            </Col>
          ))}
        </Row>

        <label htmlFor="comentario-avaliacao" className="cli-label">{t('Seu comentário (opcional)')}</label>
        <textarea
          id="comentario-avaliacao"
          className="cli-input"
          rows={3}
          maxLength={255}
          placeholder={t('Conte como foi sua experiência no Recanto Camargo...')}
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          disabled={enviando}
        />
        <div className="text-end cli-muted small mt-1">{comentario.length}/255</div>
        {erro && <Alert variant="danger" className="cli-alert cli-alert-err mt-3 mb-0" role="alert">{erro}</Alert>}
      </Modal.Body>
      <Modal.Footer className="gap-2">
        <button
          type="button"
          className="cli-btn-sec"
          onClick={aoFechar}
          disabled={enviando}
        >
          {t('Cancelar')}
        </button>
        <button
          type="button"
          className="cli-btn-prim"
          style={{ minWidth: '160px' }}
          onClick={() => aoEnviar(reserva.id, {
            nota: notaGeral,
            limpeza,
            comunicacao,
            localizacao,
            custoBeneficio,
            comentario
          })}
          disabled={enviando}
        >
          {enviando
            ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>{t('Enviando...')}</>
            : <><i className="bi bi-send me-2" aria-hidden="true"></i>{t('Enviar Avaliação')}</>
          }
        </button>
      </Modal.Footer>
    </Modal>
  );
}
ModalAvaliar.propTypes = {
  reserva: PropTypes.object,
  aoFechar: PropTypes.func.isRequired,
  aoEnviar: PropTypes.func.isRequired,
  enviando: PropTypes.bool.isRequired,
  erro: PropTypes.string.isRequired,
};

// ─── Card de Reserva ──────────────────────────────────────────────────────────
function CardReserva({ reserva, onVer, onCancelar, onAvaliar, onPagar, pagando = false }) {
  const { t } = usePreferencias();
  const n    = calcNoites(reserva.checkin, reserva.checkout);
  const dias = diasAteCheckin(reserva.checkin);
  const podeCanc = podeCancelar(reserva);
  const reembolsado = Number(reserva.valorReembolsado) > 0;

  return (
    <div className="cli-card-reserva">
      {/* Imagem placeholder */}
      <div className="cli-card-img">
        <i className="bi bi-house-heart" aria-hidden="true"></i>
        <BadgeStatus status={reserva.status} />
        {reserva.status === 'aprovada' && dias >= 0 && dias <= 30 && (
          <div className="cli-card-contagem">
            {dias === 0 ? t('Check-in Hoje!') : (dias > 1 ? t('em {n} dias', { n: dias }) : t('em {n} dia', { n: dias }))}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="cli-card-corpo">
        <div className="cli-card-topo">
          <div>
            <h3 className="cli-card-titulo">{reserva.imovel}</h3>
            <div className="cli-card-local">
              <i className="bi bi-geo-alt me-1" aria-hidden="true"></i>{reserva.localizacao}
            </div>
          </div>
        </div>

        <div className="cli-card-infos">
          <span><i className="bi bi-calendar3 me-1" aria-hidden="true"></i>{fmtData(reserva.checkin)} → {fmtData(reserva.checkout)}</span>
          <span><i className="bi bi-moon me-1" aria-hidden="true"></i>{textoNoites(t, n)}</span>
          <span><i className="bi bi-people me-1" aria-hidden="true"></i>{textoPessoas(t, reserva.hospedes)}</span>
        </div>

        {reserva.status === 'recusada' && (reserva.motivoRecusa || reserva.motivo) && (
          <div className="cli-motivo-recusa">
            <i className="bi bi-info-circle me-2" aria-hidden="true"></i>
            <strong>{t('Motivo da recusa:')}</strong> {reserva.motivoRecusa || reserva.motivo}
          </div>
        )}

        {reserva.status === 'cancelada' && (
          <div className={`cli-motivo-recusa${reembolsado ? ' ok' : ''}`}>
            <i className={`bi ${reembolsado ? 'bi-arrow-counterclockwise' : 'bi-x-circle'} me-2`} aria-hidden="true"></i>
            <strong>{t('Reserva Cancelada:')}</strong> {reembolsado ? t('Reembolso de {valor} processado via Mercado Pago.', { valor: fmtMoeda(reserva.valorReembolsado) }) : (reserva.motivoRecusa || reserva.motivo || t('Cancelada conforme Termos de Uso.'))}
          </div>
        )}

        {reserva.status === 'pagamento pendente' && (
          <div className="cli-motivo-recusa warn">
            <i className="bi bi-clock-history me-2" aria-hidden="true"></i>
            <strong>{t('Pré-Aprovada!')}</strong> {reserva.expiraEm ? t('Pague até {data} para garantir suas datas.', { data: fmtDataHora(reserva.expiraEm, t) }) : t('Efetue o pagamento em até 24h para garantir suas datas.')}
          </div>
        )}

        <div className="cli-card-rodape">
          <div>
            <div className="cli-card-valor">{fmtMoeda(reserva.total ?? reserva.valorTotal)}</div>
            <div className="cli-card-valor-diaria">{fmtMoeda(reserva.diaria ?? reserva.valorDiaria)}{t('/noite')}</div>
          </div>
          <div className="cli-card-acoes">
            {reserva.status === 'pagamento pendente' && onPagar && (
              <button
                type="button"
                className="cli-btn-pagar"
                onClick={() => onPagar(reserva)}
                disabled={pagando}
                title={t('Efetuar pagamento via Mercado Pago (Pix / Cartão)')}
              >
                <i className="bi bi-credit-card-2-front me-1" aria-hidden="true"></i>
                {pagando ? t('Abrindo...') : t('Pagar Reserva')}
              </button>
            )}
            <button type="button" className="cli-btn-ver" onClick={() => onVer(reserva)}>
              <i className="bi bi-eye me-1" aria-hidden="true"></i>{t('Detalhes')}
            </button>
            {podeCanc && (
              <button type="button" className="cli-btn-cancelar" onClick={() => onCancelar(reserva)}>
                {t('Cancelar')}
              </button>
            )}
            {reserva.status === 'concluida' && !reserva.avaliacao && (
              <button type="button" className="cli-btn-avaliar" onClick={() => onAvaliar(reserva)}>
                <i className="bi bi-star me-1" aria-hidden="true"></i>{t('Avaliar')}
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
  onPagar: PropTypes.func,
  pagando: PropTypes.bool,
};

function VisaoGeral({ reservas, cupons, onVerReserva, onCancelarReserva, onIrAba, reputacao, onPagar, pagandoId }) {
  const { t } = usePreferencias();
  const hoje = useMemo(() => {
    const h = new Date();
    h.setHours(0, 0, 0, 0);
    return h;
  }, []);

  const proxima = useMemo(() =>
    reservas
      .filter(r => (r.status === 'aprovada' || r.status === 'pendente' || r.status === 'pagamento pendente') && new Date(r.checkin + 'T00:00:00') >= hoje)
      .sort((a, b) => new Date(a.checkin) - new Date(b.checkin))[0]
  , [reservas, hoje]);

  const totalAvaliacoes  = reservas.filter(r => r.avaliacao).length;
  const cuponsDisponiveis = cupons.filter(c => c.ativo && !c.usado).length;
  const diasProxima = proxima ? diasAteCheckin(proxima.checkin) : null;
  const avaliacoesPendentes = reservas.filter(r => r.status === 'concluida' && !r.avaliacao).length;

  return (
    <>
      <p className="dash-section-label">{t('Resumo da Conta')}</p>
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl={4}>
          <div className="cli-card-resumo">
            <div className="cli-card-resumo-icone">
              <i className="bi bi-patch-check-fill fs-4" aria-hidden="true"></i>
            </div>
            <div className="cli-card-resumo-valor d-flex align-items-center gap-1">
              {reputacao?.totalAvaliadas > 0 ? (
                <>
                  <span className="cli-star" aria-hidden="true">★</span> {reputacao?.nota}
                </>
              ) : (
                <span className="fs-5 fw-bold cli-muted">{t('Novo')}</span>
              )}
            </div>
            <div className="cli-card-resumo-titulo">{t(reputacao?.badge || 'Novo Hóspede')}</div>
            <div className="cli-card-resumo-sub">
              {reputacao?.totalAvaliadas ? t('{n} estadia(s) avaliada(s)', { n: reputacao.totalAvaliadas }) : t('Sem avaliações de estadias ainda')}
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} xl={4}>
          <div className={`cli-card-resumo ${proxima ? 'destaque' : 'vazio'}`}>
            <div className="cli-card-resumo-icone">
              <i className="bi bi-calendar-heart fs-4" aria-hidden="true"></i>
            </div>
            <div className="cli-card-resumo-valor">{proxima ? (diasProxima === 0 ? t('Hoje') : `${diasProxima}${t('d')}`) : '—'}</div>
            <div className="cli-card-resumo-titulo">{t('Próxima Estadia')}</div>
            <div className="cli-card-resumo-sub">
              {proxima ? `${fmtData(proxima.checkin)} → ${fmtData(proxima.checkout)}` : t('Nenhuma agendada')}
            </div>
          </div>
        </Col>
        <Col xs={6} sm={6} xl={4}>
          <div className="cli-card-resumo">
            <div className="cli-card-resumo-icone">
              <i className="bi bi-house-check fs-4" aria-hidden="true"></i>
            </div>
            <div className="cli-card-resumo-valor">{reservas.length}</div>
            <div className="cli-card-resumo-titulo">{t('Total de Reservas')}</div>
            <div className="cli-card-resumo-sub">{t('{n} concluída(s)', { n: reservas.filter(r => r.status === 'concluida').length })}</div>
          </div>
        </Col>
        <Col xs={6} sm={6} xl={6}>
          <div className="cli-card-resumo">
            <div className="cli-card-resumo-icone">
              <i className="bi bi-star-fill fs-4" aria-hidden="true"></i>
            </div>
            <div className="cli-card-resumo-valor">{totalAvaliacoes}</div>
            <div className="cli-card-resumo-titulo">{t('Avaliações Feitas')}</div>
            <div className="cli-card-resumo-sub">
              {t('{n} pendente(s)', { n: avaliacoesPendentes })}
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} xl={6}>
          <div className="cli-card-resumo">
            <div className="cli-card-resumo-icone">
              <i className="bi bi-tag-fill fs-4" aria-hidden="true"></i>
            </div>
            <div className="cli-card-resumo-valor">{cuponsDisponiveis}</div>
            <div className="cli-card-resumo-titulo">{t('Cupons Disponíveis')}</div>
            <div className="cli-card-resumo-sub">{t('prontos para usar')}</div>
          </div>
        </Col>
      </Row>

      {proxima ? (
        <>
          <p className="dash-section-label">{t('Sua Próxima Viagem')}</p>
          <div className="cli-card-proxima-viagem">
            <div className="cli-proxima-img">
              <i className="bi bi-house-heart" aria-hidden="true"></i>
              {diasProxima <= 7 && <div className="cli-proxima-urgente">{t('Em breve!')}</div>}
            </div>
            <div className="cli-proxima-info">
              <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                <h3 className="cli-proxima-titulo">{proxima.imovel}</h3>
                <BadgeStatus status={proxima.status} />
              </div>
              <p className="cli-muted small mb-3">
                <i className="bi bi-geo-alt me-1" aria-hidden="true"></i>{proxima.localizacao}
              </p>
              <div className="cli-proxima-grid">
                <div><span className="cli-proxima-label">{t('Check-in')}</span><br/><strong>{fmtData(proxima.checkin)}</strong></div>
                <div><span className="cli-proxima-label">{t('Check-out')}</span><br/><strong>{fmtData(proxima.checkout)}</strong></div>
                <div><span className="cli-proxima-label">{t('Noites')}</span><br/><strong>{calcNoites(proxima.checkin, proxima.checkout)}</strong></div>
                <div><span className="cli-proxima-label">{t('Hóspedes')}</span><br/><strong>{proxima.hospedes}</strong></div>
              </div>
              <div className="cli-proxima-rodape">
                <div>
                  <span className="cli-proxima-label">{proxima.status === 'pagamento pendente' ? t('Total a pagar') : t('Total')}</span>
                  <div className="cli-proxima-valor">{fmtMoeda(proxima.total ?? proxima.valorTotal)}</div>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  {proxima.status === 'pagamento pendente' && onPagar && (
                    <button
                      type="button"
                      className="cli-btn-pagar"
                      onClick={() => onPagar(proxima)}
                      disabled={pagandoId === proxima.id}
                      title={t('Efetuar pagamento via Mercado Pago (Pix / Cartão)')}
                    >
                      <i className="bi bi-credit-card-2-front me-1" aria-hidden="true"></i>
                      {pagandoId === proxima.id ? t('Abrindo...') : t('Pagar Reserva')}
                    </button>
                  )}
                  <button type="button" className="cli-btn-ver" onClick={() => onVerReserva(proxima)}>
                    <i className="bi bi-eye me-1" aria-hidden="true"></i>{t('Ver Detalhes')}
                  </button>
                  {podeCancelar(proxima) && onCancelarReserva && (
                    <button
                      type="button"
                      className="cli-btn-cancelar"
                      onClick={() => onCancelarReserva(proxima)}
                    >
                      <i className="bi bi-x-circle me-1" aria-hidden="true"></i>{t('Cancelar')}
                    </button>
                  )}
                  <a
                    href={URL_WHATSAPP}
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
          <i className="bi bi-house-slash cli-vazio-icone" aria-hidden="true"></i>
          <h5>{t('Nenhuma reserva ativa')}</h5>
          <p>{t('Que tal planejar sua próxima visita ao Recanto Camargo?')}</p>
          <Link to="/Reserva" className="cli-btn-ver">
            <i className="bi bi-calendar-plus me-2" aria-hidden="true"></i>{t('Fazer uma Reserva')}
          </Link>
        </div>
      )}

      {avaliacoesPendentes > 0 && (
        <div
          className="cli-alerta-soft mt-4"
          role="button"
          tabIndex={0}
          onClick={() => onIrAba('avaliacoes')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onIrAba('avaliacoes'); } }}
        >
          <i className="bi bi-star me-2" aria-hidden="true"></i>
          {t('Você tem {n} avaliação(ões) pendente(s).', { n: avaliacoesPendentes })}
          <span className="ms-2" style={{ textDecoration: 'underline' }}>{t('Avaliar agora →')}</span>
        </div>
      )}
    </>
  );
}
VisaoGeral.propTypes = {
  reservas: PropTypes.array.isRequired,
  cupons: PropTypes.array.isRequired,
  onVerReserva: PropTypes.func.isRequired,
  onCancelarReserva: PropTypes.func,
  onIrAba: PropTypes.func.isRequired,
  reputacao: PropTypes.object,
  onPagar: PropTypes.func,
  pagandoId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

// ─── Aba: Minhas Reservas ─────────────────────────────────────────────────────
function MinhasReservas({ reservas, onVer, onCancelar, onAvaliar, onPagar, pagandoId }) {
  const { t } = usePreferencias();
  const [filtro, setFiltro] = useState('todas');

  const FILTROS = [
    { id: 'todas', label: 'Todas' },
    { id: 'pendente', label: 'Pendentes' },
    { id: 'pagamento pendente', label: 'Pagamento Pendente' },
    { id: 'aprovada', label: 'Confirmadas'},
    { id: 'cancelada', label: 'Canceladas' },
    { id: 'recusada', label: 'Recusadas' },
    { id: 'concluida', label: 'Concluídas' },
  ];

  const lista = filtro === 'todas'
    ? reservas
    : reservas.filter(r => r.status === filtro);

  const cnt = (s) => s === 'todas' ? reservas.length : reservas.filter(r => r.status === s).length;

  return (
    <>
      <div className="cli-filtros mb-4" role="group" aria-label={t('Filtrar reservas')}>
        {FILTROS.map(f => (
          <button
            key={f.id}
            type="button"
            className={`cli-filtro-btn${filtro === f.id ? ' ativo' : ''}`}
            aria-pressed={filtro === f.id}
            onClick={() => setFiltro(f.id)}
          >
            {t(f.label)}
            <span className="cli-filtro-count">{cnt(f.id)}</span>
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="cli-estado-vazio">
          <i className="bi bi-calendar-x cli-vazio-icone" aria-hidden="true"></i>
          <h5>{t('Nenhuma reserva encontrada')}</h5>
          <p>{t('Tente outro filtro ou faça sua primeira reserva.')}</p>
          <Link to="/Reserva" className="cli-btn-ver">
            <i className="bi bi-calendar-plus me-2" aria-hidden="true"></i>{t('Reservar Agora')}
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
              onPagar={onPagar}
              pagando={pagandoId === r.id}
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
  onPagar: PropTypes.func,
  pagandoId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

// ─── Aba: Cupons ──────────────────────────────────────────────────────────────
function MeusCupons({ cupons, carregando, erro }) {
  const { t } = usePreferencias();
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

  if (carregando) {
    return (
      <div className="text-center cli-muted py-4" role="status">
        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
        {t('Carregando cupons...')}
      </div>
    );
  }

  if (erro) {
    return <Alert variant="danger" className="cli-alert cli-alert-err">{erro}</Alert>;
  }

  if (cupons.length === 0) {
    return <Alert variant="info" className="cli-alert">{t('Nenhum cupom disponível no momento.')}</Alert>;
  }

  return (
    <>
      <div className="cli-cupons-grid">
        {cupons.map(c => {
          const exp = expirado(c.validoAte);
          const inativo = !c.ativo || exp || c.usado;
          return (
            <div key={c.id} className={`cli-cupom${inativo ? ' inativo' : ''}`}>
              <div className="cli-cupom-topo">
                <span className="cli-cupom-icone"><i className={`bi ${c.icone}`} aria-hidden="true"></i></span>
                <div className="cli-cupom-status">
                  {c.usado && <span className="cli-cupom-tag usado">{t('Usado')}</span>}
                  {exp && !c.usado && <span className="cli-cupom-tag expirado">{t('Expirado')}</span>}
                  {!inativo && <span className="cli-cupom-tag ativo">{t('Ativo')}</span>}
                </div>
              </div>
              <div className="cli-cupom-descricao">{descreverCupom(c, t)}</div>
              <div className="cli-cupom-codigo">{c.codigo}</div>
              <div className="cli-cupom-validade">
                <i className="bi bi-calendar-event me-1" aria-hidden="true"></i>
                {t('Válido até {data}', { data: fmtData(c.validoAte) })}
              </div>
              <button
                type="button"
                className={`cli-cupom-btn${inativo ? ' disabled' : ''}`}
                onClick={() => !inativo && copiarCodigo(c.codigo)}
                disabled={inativo}
              >
                {copiado === c.codigo
                  ? <><i className="bi bi-check2 me-1" aria-hidden="true"></i>{t('Copiado!')}</>
                  : <><i className="bi bi-clipboard me-1" aria-hidden="true"></i>{t('Copiar Código')}</>
                }
              </button>
            </div>
          );
        })}
      </div>
      <div className="cli-cupons-info mt-4">
        <i className="bi bi-info-circle me-2" aria-hidden="true"></i>
        {t('Cupons são aplicados automaticamente ao informar o código na finalização da reserva.')}
      </div>
    </>
  );
}
MeusCupons.propTypes = {
  cupons: PropTypes.array.isRequired,
  carregando: PropTypes.bool.isRequired,
  erro: PropTypes.string.isRequired,
};

// ─── Aba: Avaliações ──────────────────────────────────────────────────────────
function MinhasAvaliacoes({ reservas, onAvaliar }) {
  const { t } = usePreferencias();
  const feitas     = reservas.filter(r => r.avaliacao);
  const pendentes  = reservas.filter(r => r.status === 'concluida' && !r.avaliacao);

  return (
    <>
      {pendentes.length > 0 && (
        <>
          <p className="dash-section-label">{t('Avaliações Pendentes')}</p>
          <div className="cli-lista-pendentes mb-4">
            {pendentes.map(r => (
              <div key={r.id} className="cli-avaliacao-pendente">
                <div className="cli-avaliacao-pendente-img">
                  <i className="bi bi-house-heart" aria-hidden="true"></i>
                </div>
                <div className="flex-grow-1">
                  <div className="cli-nome-imovel">{r.imovel}</div>
                  <div className="cli-muted small">{fmtData(r.checkin)} → {fmtData(r.checkout)}</div>
                </div>
                <button type="button" className="cli-btn-avaliar" onClick={() => onAvaliar(r)}>
                  <i className="bi bi-star me-1" aria-hidden="true"></i>{t('Avaliar')}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="dash-section-label">{t('Avaliações Enviadas')}</p>
      {feitas.length === 0 ? (
        <div className="cli-estado-vazio" style={{ padding: '2rem' }}>
          <i className="bi bi-star-half cli-vazio-icone" aria-hidden="true"></i>
          <h5>{t('Nenhuma avaliação ainda')}</h5>
          <p>{t('Suas avaliações aparecerão aqui após concluir uma estadia.')}</p>
        </div>
      ) : (
        <div className="cli-lista-avaliacoes">
          {feitas.map(r => (
            <div key={r.id} className="cli-card-avaliacao">
              <div className="cli-avaliacao-header">
                <div className="cli-avaliacao-icone">
                  <i className="bi bi-house-heart" aria-hidden="true"></i>
                </div>
                <div className="flex-grow-1">
                  <div className="cli-nome-imovel">{r.imovel}</div>
                  <div className="cli-muted small">{fmtData(r.checkin)} → {fmtData(r.checkout)}</div>
                </div>
                <div className="cli-muted small">{fmtData(r.avaliacao.data)}</div>
              </div>
              <div className="mb-2"><Estrelas nota={r.avaliacao.nota} /></div>
              {r.avaliacao.comentario && (
                <p className="cli-avaliacao-texto">"{r.avaliacao.comentario}"</p>
              )}
              {r.avaliacao.respostaProprietario && (
                <div className="cli-resposta-proprietario">
                  <div className="cli-resposta-proprietario-header">
                    <strong><i className="bi bi-reply-fill me-2" aria-hidden="true"></i>{t('Resposta do proprietário')}</strong>
                    {r.avaliacao.respostaProprietario.data && (
                      <span>{fmtData(r.avaliacao.respostaProprietario.data)}</span>
                    )}
                  </div>
                  <Estrelas nota={r.avaliacao.respostaProprietario.nota} />
                  {r.avaliacao.respostaProprietario.comentario && (
                    <p>{r.avaliacao.respostaProprietario.comentario}</p>
                  )}
                </div>
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
  const { t, tema, idioma, alternarTema, alternarIdioma } = usePreferencias();
  const escuro = tema === 'escuro';
  const navigate = useNavigate();

  const [sidebarAberta, setSidebarAberta] = useState(() => window.innerWidth >= 992);
  const [abaAtiva,      setAbaAtiva]      = useState('visao-geral');
  const [reservas,      setReservas]      = useState([]);
  const [cupons,        setCupons]        = useState([]);
  const [cuponsCarregando, setCuponsCarregando] = useState(true);
  const [erroCupons,     setErroCupons]    = useState('');
  const [feedback,      setFeedback]      = useState({ tipo: '', msg: '' });
  const [reputacao,     setReputacao]     = useState({ nota: 'Novo', badge: 'Novo Hóspede', totalAvaliadas: 0 });

  const tratarCliqueNotificacao = useCallback((notificacao) => {
    if (!notificacao) return;
    const texto = `${notificacao.titulo || ''} ${notificacao.mensagem || ''}`.toLowerCase();
    const matchReserva = texto.match(/#(\d+)/);
    const reservaId = matchReserva ? matchReserva[1] : null;

    if (texto.includes('avaliação') || texto.includes('avaliacao') || texto.includes('avaliar') || texto.includes('avaliou')) {
      setAbaAtiva('avaliacoes');
    } else if (texto.includes('cupom') || texto.includes('cupons')) {
      setAbaAtiva('cupons');
    } else if (texto.includes('reserva')) {
      setAbaAtiva('reservas');
      if (reservaId) {
        const rEncontrada = reservas.find(res => String(res.id) === String(reservaId));
        if (rEncontrada) {
          setModalDetalhe(rEncontrada);
        }
      }
    }
  }, [reservas]);

  // Modais
  const [modalDetalhe,  setModalDetalhe]  = useState(null);
  const [modalCancelar, setModalCancelar] = useState(null);
  const [modalAvaliar,  setModalAvaliar]  = useState(null);
  const [avaliacaoEnviando, setAvaliacaoEnviando] = useState(false);
  const [erroAvaliacao, setErroAvaliacao] = useState('');
  const [pagandoReservaId, setPagandoReservaId] = useState(null);
  const [cancelando, setCancelando] = useState(false);

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
    async function carregarReservas() {
      if (!IS_API_AVAILABLE) {
        try {
          const salvas = JSON.parse(localStorage.getItem(CHAVE_RESERVAS_CLIENTE) || '[]');
          setReservas(Array.isArray(salvas) ? salvas : []);
        } catch {
          setReservas([]);
        }
        return;
      }
      try {
        // Busca as reservas reais do Back-end
        const resposta = await fetch(`${API_BASE}/api/hospede/reservas`, {
          credentials: 'include' // Envia o cookie JWT
        });

        const dados = await resposta.json().catch(() => null);
        if (!resposta.ok) {
          throw new Error(dados?.error || t('Falha ao carregar reservas'));
        }
        if (!Array.isArray(dados)) throw new Error(t('Resposta inválida ao carregar reservas'));

        setReservas(dados.map(reserva => ({
          ...reserva,
          avaliacao: normalizarAvaliacao(reserva.avaliacao),
        })));
      } catch (erro) {
        console.error('Erro ao buscar dados do dashboard:', erro);
        fb('erro', t('Erro ao carregar suas reservas. Tente novamente.'));
      }
    }

    async function carregarCupons() {
      if (!IS_API_AVAILABLE) {
        setCuponsCarregando(false);
        return;
      }
      try {
        setErroCupons('');
        const resposta = await fetch(`${API_BASE}/api/cupons/meus`, {
          credentials: 'include',
        });
        const dados = await resposta.json().catch(() => null);

        if (!resposta.ok) {
          throw new Error(dados?.error || t('Não foi possível carregar seus cupons.'));
        }
        if (!Array.isArray(dados)) {
          throw new Error(t('Resposta inválida ao carregar cupons.'));
        }

        setCupons(dados.map(normalizarCupom));
      } catch (erro) {
        console.error('Erro ao buscar cupons:', erro);
        setCupons([]);
        setErroCupons(erro.message || t('Não foi possível carregar seus cupons.'));
      } finally {
        setCuponsCarregando(false);
      }
    }

    async function carregarReputacao() {
      if (!IS_API_AVAILABLE) return;
      try {
        const resp = await fetch(`${API_BASE}/api/hospede/me/reputacao`, {
          credentials: 'include',
        });
        if (resp.ok) {
          const dados = await resp.json();
          if (dados && dados.nota) {
            setReputacao(dados);
          }
        }
      } catch (erro) {
        console.error('Erro ao carregar reputação do hóspede:', erro);
      }
    }

    carregarReservas();
    carregarCupons();
    carregarReputacao();

    const onFocus = () => {
      carregarReservas();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
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
  const confirmarCancelamento = useCallback(async (id, motivo) => {
    setCancelando(true);
    try {
      const resposta = await fetch(`${API_BASE}/api/hospede/reservas/${id}/cancelar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ motivo })
      });

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(dados?.error || t('Falha ao cancelar'));
      }

      const atualizadas = reservas.map(r =>
        r.id === id ? {
          ...r,
          status: 'cancelada',
          motivoCancelamento: motivo,
          valorReembolsado: dados?.calculo?.valorReembolso ?? r.valorReembolsado,
          motivo: dados?.calculo?.descricaoRegra || motivo || r.motivo
        } : r
      );
      salvarReservas(atualizadas);
      setModalCancelar(null);
      if (modalDetalhe && modalDetalhe.id === id) {
        setModalDetalhe(null);
      }
      fb('sucesso', dados?.message || t('Reserva #{id} cancelada com sucesso.', { id }));
    } catch (erro) {
      console.error(erro);
      fb('erro', erro.message || t('Não foi possível cancelar a reserva. Tente novamente.'));
    } finally {
      setCancelando(false);
    }
  }, [reservas, modalDetalhe, t]);

  // Integração Mercado Pago — Gerar preferência e abrir Checkout Pro
  const handlePagar = useCallback(async (reserva) => {
    if (!reserva?.id) return;
    try {
      setPagandoReservaId(reserva.id);
      const resp = await fetch(`${API_BASE}/api/pagamentos/criar-preferencia/${reserva.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const dados = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(dados?.error || t('Não foi possível gerar a preferência de pagamento.'));
      }
      const linkPagamento = dados?.sandboxInitPoint || dados?.initPoint;
      if (linkPagamento) {
        window.open(linkPagamento, '_blank');
        fb('sucesso', t('Guia do Mercado Pago aberta em uma nova aba.'));
      } else {
        throw new Error(t('Link de pagamento não retornado pela operadora.'));
      }
    } catch (err) {
      console.error('Erro ao abrir pagamento:', err);
      fb('erro', err.message || t('Erro ao abrir o checkout.'));
    } finally {
      setPagandoReservaId(null);
    }
  }, [t]);

  const abrirModalAvaliacao = useCallback((reserva) => {
    setErroAvaliacao('');
    setModalAvaliar(reserva);
  }, []);

  const fecharModalAvaliacao = useCallback(() => {
    if (avaliacaoEnviando) return;
    setErroAvaliacao('');
    setModalAvaliar(null);
  }, [avaliacaoEnviando]);

  // Enviar avaliação real; a resposta confirmada pelo servidor atualiza a tela.
  const enviarAvaliacao = useCallback(async (id, dadosAvaliacao) => {
    if (avaliacaoEnviando) return;

    let notaNumero = 5;
    let limpezaNum = 5;
    let comunicacaoNum = 5;
    let localizacaoNum = 5;
    let custoBeneficioNum = 5;
    let comentarioLimpo = '';

    if (typeof dadosAvaliacao === 'object' && dadosAvaliacao !== null) {
      notaNumero = Number(dadosAvaliacao.nota || 5);
      limpezaNum = Number(dadosAvaliacao.limpeza || 5);
      comunicacaoNum = Number(dadosAvaliacao.comunicacao || 5);
      localizacaoNum = Number(dadosAvaliacao.localizacao || 5);
      custoBeneficioNum = Number(dadosAvaliacao.custoBeneficio || 5);
      comentarioLimpo = String(dadosAvaliacao.comentario || '').trim();
    } else {
      notaNumero = Number(dadosAvaliacao);
      comentarioLimpo = String(arguments[2] || '').trim();
    }

    if (!Number.isFinite(notaNumero) || notaNumero < 1 || notaNumero > 5 || !Number.isInteger(notaNumero * 2)) {
      setErroAvaliacao(t('Escolha uma nota entre 1 e 5, em intervalos de meio ponto.'));
      return;
    }
    if (comentarioLimpo.length > 255) {
      setErroAvaliacao(t('O comentário deve ter no máximo 255 caracteres.'));
      return;
    }

    setAvaliacaoEnviando(true);
    setErroAvaliacao('');

    try {
      const resposta = await fetch(`${API_BASE}/api/avaliacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reservaId: id,
          nota: notaNumero,
          limpeza: limpezaNum,
          comunicacao: comunicacaoNum,
          localizacao: localizacaoNum,
          custoBeneficio: custoBeneficioNum,
          comentario: comentarioLimpo
        }),
      });
      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(dados?.error || t('Não foi possível enviar sua avaliação.'));
      }

      const avaliacaoCriada = normalizarAvaliacao(dados?.avaliacao ?? dados);
      if (!avaliacaoCriada) {
        throw new Error(t('O servidor retornou uma avaliação inválida. Atualize a página e tente novamente.'));
      }

      setReservas(atuais => atuais.map(reserva =>
        String(reserva.id) === String(id)
          ? { ...reserva, avaliacao: avaliacaoCriada }
          : reserva
      ));
      setModalAvaliar(null);
      fb('sucesso', t('Avaliação enviada! Obrigado pelo seu feedback.'));
    } catch (erro) {
      console.error('Erro ao enviar avaliação:', erro);
      setErroAvaliacao(erro.message || t('Não foi possível enviar sua avaliação.'));
    } finally {
      setAvaliacaoEnviando(false);
    }
  }, [avaliacaoEnviando, t]);

  const irAba = (id) => {
    setAbaAtiva(id);
    if (window.innerWidth < 992) setSidebarAberta(false);
  };

  const abas = [
    { id: 'visao-geral', label: t('Visão Geral'),      icone: <Ico.Dash />     },
    { id: 'reservas',    label: t('Minhas Reservas'),   icone: <Ico.Reservas /> },
    { id: 'avaliacoes',  label: t('Minhas Avaliações'), icone: <Ico.Estrela />  },
    { id: 'cupons',      label: t('Meus Cupons'),       icone: <Ico.Cupom />    },
  ];

  const renderConteudo = () => {
    switch (abaAtiva) {
      case 'visao-geral':
        return (
          <VisaoGeral
            reservas={reservas}
            cupons={cupons}
            onVerReserva={setModalDetalhe}
            onCancelarReserva={setModalCancelar}
            onIrAba={irAba}
            reputacao={reputacao}
            onPagar={handlePagar}
            pagandoId={pagandoReservaId}
          />
        );
      case 'reservas':
        return (
          <>
            <p className="dash-section-label">{t('Histórico de Reservas')}</p>
            <MinhasReservas
              reservas={reservas}
              onVer={setModalDetalhe}
              onCancelar={setModalCancelar}
              onAvaliar={abrirModalAvaliacao}
              onPagar={handlePagar}
              pagandoId={pagandoReservaId}
            />
          </>
        );
      case 'avaliacoes':
        return (
          <>
            <p className="dash-section-label">{t('Suas Avaliações')}</p>
            <MinhasAvaliacoes reservas={reservas} onAvaliar={abrirModalAvaliacao} />
          </>
        );
      case 'cupons':
        return (
          <>
            <p className="dash-section-label">{t('Cupons de Desconto')}</p>
            <MeusCupons cupons={cupons} carregando={cuponsCarregando} erro={erroCupons} />
          </>
        );
      default: return null;
    }
  };

  return (
    <div className="dashboard-cli-shell">
      {sidebarAberta && window.innerWidth < 992 && (
        <div className="sidebar-overlay-cli" onClick={() => setSidebarAberta(false)} />
      )}

      <aside className={`sidebar-cli ${sidebarAberta ? 'aberta' : 'colapsada'}`} aria-label={t('Menu da conta')}>
        <div className="sidebar-cli-topo">
          {sidebarAberta && <span className="sidebar-cli-marca">Recanto Camargo</span>}
        </div>

        {sidebarAberta && (
          <div className="sidebar-cli-perfil">
            <div className="sidebar-cli-avatar">{usuario?.nome?.charAt(0)}</div>
            <div className="sidebar-cli-nome">{usuario?.nome?.split(' ')[0]}</div>
            <div className="sidebar-cli-tipo">{t('Hóspede')}</div>
          </div>
        )}

        <nav className="sidebar-cli-nav">
          {abas.map(a => (
            <button
              key={a.id}
              type="button"
              className={`sidebar-cli-item${abaAtiva === a.id ? ' ativo' : ''}`}
              onClick={() => irAba(a.id)}
              aria-current={abaAtiva === a.id ? 'page' : undefined}
              title={!sidebarAberta ? a.label : ''}
            >
              <span className="sidebar-cli-icone">{a.icone}</span>
              {sidebarAberta && <span className="sidebar-cli-label">{a.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-cli-rodape">
          <Link to="/" className="sidebar-cli-item sidebar-cli-link" title={!sidebarAberta ? t('Voltar ao site') : ''}>
            <span className="sidebar-cli-icone"><Ico.Voltar /></span>
            {sidebarAberta && <span className="sidebar-cli-label">{t('Voltar ao site')}</span>}
          </Link>
          <button type="button" className="sidebar-cli-item" onClick={() => navigate('/Configuracoes')} title={!sidebarAberta ? t('Configurações') : ''}>
            <span className="sidebar-cli-icone"><Ico.Config /></span>
            {sidebarAberta && <span className="sidebar-cli-label">{t('Configurações')}</span>}
          </button>
          <button type="button" className="sidebar-cli-item sair" onClick={() => { logout(); navigate('/'); }} title={!sidebarAberta ? t('Sair') : ''}>
            <span className="sidebar-cli-icone"><Ico.Sair /></span>
            {sidebarAberta && <span className="sidebar-cli-label">{t('Sair')}</span>}
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
              aria-label={t('Menu')}
            >
              <Ico.Menu />
            </button>
            <div>
              <h1 className="topbar-cli-titulo">
                {abas.find(a => a.id === abaAtiva)?.label}
              </h1>
              <div className="d-flex align-items-center flex-wrap gap-2 mt-1">
                <span className="topbar-cli-sub">{t('Olá, {nome}!', { nome: usuario?.nome?.split(' ')[0] })}</span>
                <span
                  className="cli-badge-rep"
                  title={t('{n} estadia(s) avaliada(s) pelo anfitrião', { n: reputacao?.totalAvaliadas || 0 })}
                >
                  {reputacao?.totalAvaliadas > 0 ? (
                    <>
                      <i className="bi bi-star-fill" aria-hidden="true"></i>
                      {reputacao?.nota} · {t(reputacao?.badge)}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-person-check" aria-hidden="true"></i>
                      {t('Novo Hóspede')}
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
          <div className="topbar-cli-dir">
            <div className="cli-prefs">
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
            <Notificacoes aoClicarNotificacao={tratarCliqueNotificacao} />
          </div>
        </div>

        {feedback.msg && (
          <Alert
            variant={feedback.tipo === 'sucesso' ? 'success' : 'danger'}
            className={`alert-cli cli-alert ${feedback.tipo === 'sucesso' ? 'cli-alert-ok' : 'cli-alert-err'}`}
            role={feedback.tipo === 'sucesso' ? 'status' : 'alert'}
          >
            <i className={`bi ${feedback.tipo === 'sucesso' ? 'bi-check-circle' : 'bi-x-circle'} me-2`} aria-hidden="true"></i>
            {feedback.msg}
          </Alert>
        )}

        <div className="dashboard-cli-conteudo">{renderConteudo()}</div>
      </main>

      <ModalDetalheReserva
        reserva={modalDetalhe}
        aoFechar={() => setModalDetalhe(null)}
        aoCancelar={(res) => {
          setModalDetalhe(null);
          setModalCancelar(res);
        }}
        aoPagar={handlePagar}
        pagando={pagandoReservaId === modalDetalhe?.id}
      />
      <ModalCancelar
        reserva={modalCancelar}
        aoFechar={() => setModalCancelar(null)}
        aoConfirmar={confirmarCancelamento}
        cancelando={cancelando}
      />
      <ModalAvaliar
        reserva={modalAvaliar}
        aoFechar={fecharModalAvaliacao}
        aoEnviar={enviarAvaliacao}
        enviando={avaliacaoEnviando}
        erro={erroAvaliacao}
      />
    </div>
  );
}

export default DashboardCliente;
