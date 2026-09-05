import { useState, useRef, useEffect, useId } from 'react';
import PropTypes from 'prop-types';
import { useNotificacoes } from '../../hooks/useNotificacoes';
import './Notificacoes.css';

const CFG_TIPO = {
  sucesso: { bg: '#d1fae5', cor: '#065f46', icone: 'bi-check-circle-fill' },
  erro: { bg: '#fee2e2', cor: '#991b1b', icone: 'bi-x-circle-fill' },
  aviso: { bg: '#fef3c7', cor: '#92400e', icone: 'bi-exclamation-triangle-fill' },
  info: { bg: '#dbeafe', cor: '#1e40af', icone: 'bi-info-circle-fill' },
};
const ICONES = new Set([
  'bi-bell', 'bi-bell-fill', 'bi-check-circle-fill', 'bi-x-circle-fill',
  'bi-exclamation-triangle-fill', 'bi-info-circle-fill', 'bi-calendar-check',
  'bi-calendar-check-fill', 'bi-calendar-plus', 'bi-calendar-plus-fill',
]);

function tempoRelativo(iso) {
  const data = new Date(iso).getTime();
  if (!Number.isFinite(data)) return '';
  const diff = Math.max(0, Math.floor((Date.now() - data) / 1000));
  if (diff < 60) return 'agora mesmo';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

function Notificacoes({ aoNovaNotificacao }) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState(null);
  const ref = useRef(null);
  const sinoRef = useRef(null);
  const dropdownId = useId();
  const ultimaNotificacaoRef = useRef(null);
  const {
    notificacoes, naoLidas, carregando, atualizando, salvando, erro, sessaoEncerrada,
    marcarLida, marcarTodasLidas, atualizar,
  } = useNotificacoes();
  const ultimaNotificacaoId = notificacoes[0]?.id ?? null;

  useEffect(() => {
    if (ultimaNotificacaoId === ultimaNotificacaoRef.current) return;
    ultimaNotificacaoRef.current = ultimaNotificacaoId;
    if (ultimaNotificacaoId !== null) aoNovaNotificacao?.(ultimaNotificacaoId);
  }, [ultimaNotificacaoId, aoNovaNotificacao]);

  useEffect(() => {
    const aoClicarFora = (evento) => {
      if (ref.current && !ref.current.contains(evento.target)) setAberto(false);
    };
    const aoPressionarTecla = (evento) => {
      if (evento.key === 'Escape' && aberto) {
        setAberto(false);
        sinoRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoPressionarTecla);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoPressionarTecla);
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    atualizar();
    const ajustarPosicao = () => {
      const rect = sinoRef.current?.getBoundingClientRect();
      if (!rect) return;
      const largura = Math.min(340, window.innerWidth - 32);
      const direita = Math.max(16, Math.min(window.innerWidth - rect.right, window.innerWidth - largura - 16));
      setPosicao({ position: 'fixed', top: rect.bottom + 12, right: direita, width: largura });
    };
    // Mantém o dropdown dentro da tela, inclusive junto ao avatar do proprietário.
    ajustarPosicao();
    window.addEventListener('resize', ajustarPosicao);
    return () => window.removeEventListener('resize', ajustarPosicao);
  }, [aberto, atualizar]);

  return (
    <div className="notif-wrapper" ref={ref}>
      <button
        type="button"
        ref={sinoRef}
        className={`notif-sino ${aberto ? 'ativo' : ''}`}
        onClick={() => setAberto(atual => !atual)}
        aria-label={`Notificações${naoLidas > 0 ? ` — ${naoLidas} não lidas` : ''}`}
        aria-expanded={aberto}
        aria-controls={aberto ? dropdownId : undefined}
        aria-haspopup="dialog"
        title="Notificações"
      >
        <i className="bi bi-bell-fill" aria-hidden="true" />
        {naoLidas > 0 && <span className="notif-badge" aria-hidden="true">{naoLidas > 9 ? '9+' : naoLidas}</span>}
      </button>

      {aberto && (
        <div id={dropdownId} className="notif-dropdown" style={posicao} role="dialog" aria-label="Notificações">
          <div className="notif-header">
            <div className="d-flex align-items-center gap-2">
              <span className="notif-header-titulo">Notificações</span>
              {naoLidas > 0 && <span className="notif-header-badge">{naoLidas} nova{naoLidas > 1 ? 's' : ''}</span>}
            </div>
            {naoLidas > 0 && (
              <div className="notif-header-acoes">
                <button type="button" className="notif-btn-texto" disabled={salvando}
                  onClick={marcarTodasLidas} title="Marcar todas como lidas">
                  <i className="bi bi-check-all" aria-hidden="true" /> Todas lidas
                </button>
              </div>
            )}
          </div>

          {erro && (
            <div className="notif-footer" role="alert">
              <p className="mb-1 text-danger">{erro}</p>
              {!sessaoEncerrada && <button type="button" className="notif-btn-texto" disabled={atualizando || salvando} onClick={atualizar}>
                {atualizando ? 'Atualizando...' : 'Tentar novamente'}
              </button>}
            </div>
          )}

          <div className="notif-lista" aria-busy={carregando || salvando}
            style={{ maxHeight: 'min(340px, calc(100dvh - 240px))' }}>
            {carregando ? (
              <div className="notif-vazia" role="status"><p>Carregando notificações...</p></div>
            ) : notificacoes.length === 0 ? (
              !erro && <div className="notif-vazia"><i className="bi bi-bell-slash" aria-hidden="true" /><p>Nenhuma notificação</p></div>
            ) : (
              <div role="list">
                {notificacoes.map(n => {
                  const cfg = CFG_TIPO[n.tipo] || CFG_TIPO.info;
                  const icone = ICONES.has(n.icone) ? n.icone : cfg.icone;
                  return (
                    <div key={n.id} role="listitem">
                      <div className={`notif-item ${!n.lida ? 'nao-lida' : ''}`}
                        onClick={() => !n.lida && !salvando && marcarLida(n.id)}
                        role={!n.lida ? 'button' : undefined}
                        aria-disabled={!n.lida ? salvando : undefined}
                        aria-label={!n.lida ? `${n.titulo}. Marcar como lida` : undefined}
                        tabIndex={!n.lida ? 0 : undefined}
                        onKeyDown={evento => {
                          if ((evento.key === 'Enter' || evento.key === ' ') && !n.lida) {
                            evento.preventDefault();
                            if (!salvando) marcarLida(n.id);
                          }
                        }}>
                        <div className="notif-icone" style={{ background: cfg.bg, color: cfg.cor }}>
                          <i className={`bi ${icone}`} aria-hidden="true" />
                        </div>
                        <div className="notif-conteudo" style={{ overflowWrap: 'anywhere' }}>
                          <div className="notif-titulo-item">{n.titulo}</div>
                          <div className="notif-mensagem">{n.mensagem}</div>
                          <div className="notif-tempo">{tempoRelativo(n.criadaEm)}</div>
                        </div>
                        {!n.lida && <div className="notif-acoes-item"><span className="notif-dot" title="Não lida" /></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {notificacoes.length > 0 && (
            <div className="notif-footer">
              {notificacoes.length === 50 ? 'Exibindo as 50 notificações mais recentes' : `${notificacoes.length} ${notificacoes.length === 1 ? 'notificação' : 'notificações'} no histórico`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

Notificacoes.propTypes = {
  aoNovaNotificacao: PropTypes.func,
};

export default Notificacoes;
