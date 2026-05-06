/**
 * Notificacoes.jsx
 * Sino com badge + dropdown — localStorage, zero dependências externas.
 */
import { useState, useRef, useEffect } from 'react';
import { useNotificacoes } from '../../hooks/useNotificacoes';
import './Notificacoes.css';

const CFG_TIPO = {
  sucesso: { bg: '#d1fae5', cor: '#065f46', icone: 'bi-check-circle-fill'          },
  erro:    { bg: '#fee2e2', cor: '#991b1b', icone: 'bi-x-circle-fill'              },
  aviso:   { bg: '#fef3c7', cor: '#92400e', icone: 'bi-exclamation-triangle-fill'  },
  info:    { bg: '#dbeafe', cor: '#1e40af', icone: 'bi-info-circle-fill'           },
};

function tempoRelativo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return 'agora mesmo';
  if (diff < 3600)  return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

function Notificacoes() {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const {
    notificacoes, naoLidas,
    marcarLida, marcarTodasLidas,
    remover, limparTodas,
  } = useNotificacoes();

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="notif-wrapper" ref={ref}>

      {/* ── Sino ── */}
      <button
        className={`notif-sino ${aberto ? 'ativo' : ''}`}
        onClick={() => setAberto(a => !a)}
        aria-label={`Notificações${naoLidas > 0 ? ` — ${naoLidas} não lidas` : ''}`}
        title="Notificações"
      >
        <i className="bi bi-bell-fill"></i>
        {naoLidas > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
      {aberto && (
        <div className="notif-dropdown" role="dialog" aria-label="Notificações">

          {/* Header */}
          <div className="notif-header">
            <div className="d-flex align-items-center gap-2">
              <span className="notif-header-titulo">Notificações</span>
              {naoLidas > 0 && (
                <span className="notif-header-badge">
                  {naoLidas} nova{naoLidas > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="notif-header-acoes">
              {naoLidas > 0 && (
                <button className="notif-btn-texto" onClick={marcarTodasLidas} title="Marcar todas como lidas">
                  <i className="bi bi-check-all"></i> Todas lidas
                </button>
              )}
              {notificacoes.length > 0 && (
                <button className="notif-btn-texto danger" onClick={limparTodas} title="Limpar histórico">
                  <i className="bi bi-trash3"></i>
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          <div className="notif-lista">
            {notificacoes.length === 0 ? (
              <div className="notif-vazia">
                <i className="bi bi-bell-slash"></i>
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              notificacoes.map(n => {
                const cfg = CFG_TIPO[n.tipo] || CFG_TIPO.info;
                return (
                  <div
                    key={n.id}
                    className={`notif-item ${!n.lida ? 'nao-lida' : ''}`}
                    onClick={() => !n.lida && marcarLida(n.id)}
                    role={!n.lida ? 'button' : 'listitem'}
                    tabIndex={!n.lida ? 0 : undefined}
                    onKeyDown={e => e.key === 'Enter' && !n.lida && marcarLida(n.id)}
                  >
                    <div className="notif-icone" style={{ background: cfg.bg, color: cfg.cor }}>
                      <i className={`bi ${n.icone || cfg.icone}`}></i>
                    </div>

                    <div className="notif-conteudo">
                      <div className="notif-titulo-item">{n.titulo}</div>
                      <div className="notif-mensagem">{n.mensagem}</div>
                      <div className="notif-tempo">{tempoRelativo(n.criadaEm)}</div>
                    </div>

                    <div className="notif-acoes-item">
                      {!n.lida && <span className="notif-dot" title="Não lida"></span>}
                      <button
                        className="notif-btn-remover"
                        onClick={e => { e.stopPropagation(); remover(n.id); }}
                        title="Remover"
                        aria-label="Remover notificação"
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notificacoes.length > 0 && (
            <div className="notif-footer">
              {notificacoes.length} notificação{notificacoes.length !== 1 ? 'ões' : ''} no histórico
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Notificacoes;
