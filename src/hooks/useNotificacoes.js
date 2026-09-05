import { useState, useCallback, useEffect, useRef } from 'react';
import { useAutenticacao } from './useAutenticacao';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const INTERVALO_ATUALIZACAO = 15_000;
const TEMPO_LIMITE = 10_000;
const estadoInicial = (usuarioId) => ({
  usuarioId, notificacoes: [], naoLidas: 0, carregando: !!usuarioId,
  atualizando: false, salvando: false, erro: '', sessaoEncerrada: false,
});

export function useNotificacoes() {
  const { usuario } = useAutenticacao();
  const usuarioId = usuario?.id ?? null;
  const [estado, setEstado] = useState(() => estadoInicial(usuarioId));
  const sessaoRef = useRef(null);

  const atualizar = useCallback(async () => {
    const sessao = sessaoRef.current;
    if (!sessao?.ativa || sessao.expirada || sessao.usuarioId !== usuarioId || sessao.escrita) return false;
    if (sessao.leitura) return sessao.leitura.promessa;

    const operacao = { controlador: new AbortController(), expirou: false };
    sessao.leitura = operacao;
    const atual = () => sessao.ativa && sessaoRef.current === sessao && sessao.leitura === operacao;
    setEstado(prev => ({ ...prev, atualizando: true }));

    operacao.promessa = (async () => {
      const timeout = window.setTimeout(() => {
        operacao.expirou = true;
        operacao.controlador.abort();
      }, TEMPO_LIMITE);
      try {
        const resposta = await fetch(`${API_URL}/api/notificacoes`, {
          credentials: 'include', cache: 'no-store', signal: operacao.controlador.signal,
        });
        const dados = await resposta.json().catch(() => ({}));
        if (!atual()) return false;
        if (resposta.status === 401 || resposta.status === 403) {
          sessao.expirada = true;
          setEstado({ ...estadoInicial(usuarioId), carregando: false, sessaoEncerrada: true, erro: 'Sua sessão expirou. Entre novamente.' });
          return false;
        }
        if (!resposta.ok) throw new Error(dados.error || 'Não foi possível carregar as notificações.');
        if (!Array.isArray(dados.notificacoes) || !Number.isSafeInteger(dados.naoLidas) || dados.naoLidas < 0) {
          throw new Error('Não foi possível carregar as notificações.');
        }
        setEstado(prev => ({ ...prev, notificacoes: dados.notificacoes, naoLidas: dados.naoLidas, erro: '' }));
        return true;
      } catch (falha) {
        if (atual() && (falha.name !== 'AbortError' || operacao.expirou)) {
          setEstado(prev => ({ ...prev, erro: operacao.expirou
            ? 'O servidor demorou para responder. Tente novamente.'
            : 'Não foi possível atualizar as notificações. Tente novamente.' }));
        }
        return false;
      } finally {
        window.clearTimeout(timeout);
        if (atual()) {
          sessao.leitura = null;
          setEstado(prev => ({ ...prev, carregando: false, atualizando: false }));
        }
      }
    })();
    return operacao.promessa;
  }, [usuarioId]);

  useEffect(() => {
    const sessao = { usuarioId, ativa: !!usuarioId, expirada: false, leitura: null, escrita: null };
    sessaoRef.current = sessao;
    setEstado(estadoInicial(usuarioId));
    if (!usuarioId) return;

    atualizar();
    const aoRetornar = () => {
      if (document.visibilityState === 'visible') atualizar();
    };
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'hidden' && sessao.leitura) {
        sessao.leitura.controlador.abort();
      } else {
        aoRetornar();
      }
    };
    const intervalo = window.setInterval(aoRetornar, INTERVALO_ATUALIZACAO);
    window.addEventListener('focus', aoRetornar);
    document.addEventListener('visibilitychange', aoMudarVisibilidade);

    return () => {
      // Invalida também respostas já recebidas quando há logout ou troca de conta.
      sessao.ativa = false;
      sessao.leitura?.controlador.abort();
      sessao.escrita?.controlador.abort();
      window.clearInterval(intervalo);
      window.removeEventListener('focus', aoRetornar);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    };
  }, [usuarioId, atualizar]);

  const salvarLeitura = useCallback(async (id = null) => {
    const sessao = sessaoRef.current;
    if (!sessao?.ativa || sessao.expirada || sessao.usuarioId !== usuarioId || sessao.escrita) return false;
    if (id !== null && (!Number.isSafeInteger(id) || id < 1)) return false;

    // Um GET anterior não pode restaurar o estado de não lida após o PATCH.
    sessao.leitura?.controlador.abort();
    sessao.leitura = null;
    const operacao = { controlador: new AbortController(), expirou: false };
    sessao.escrita = operacao;
    const atual = () => sessao.ativa && sessaoRef.current === sessao && sessao.escrita === operacao;
    setEstado(prev => ({ ...prev, salvando: true, atualizando: false, carregando: false, erro: '' }));
    const timeout = window.setTimeout(() => {
      operacao.expirou = true;
      operacao.controlador.abort();
    }, TEMPO_LIMITE);
    let sucesso = false;

    try {
      const caminho = id === null ? 'marcar-todas-lidas' : `${id}/lida`;
      const resposta = await fetch(`${API_URL}/api/notificacoes/${caminho}`, {
        method: 'PATCH', credentials: 'include', signal: operacao.controlador.signal,
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!atual()) return false;
      if (resposta.status === 401 || resposta.status === 403) {
        sessao.expirada = true;
        setEstado({ ...estadoInicial(usuarioId), carregando: false, sessaoEncerrada: true, erro: 'Sua sessão expirou. Entre novamente.' });
        return false;
      }
      if (!resposta.ok) throw new Error(dados.error || 'Não foi possível marcar a notificação como lida.');
      setEstado(prev => {
        const jaLida = prev.notificacoes.find(item => item.id === id)?.lida;
        return {
          ...prev,
          notificacoes: prev.notificacoes.map(item => id === null || item.id === id ? { ...item, lida: true } : item),
          naoLidas: id === null ? 0 : Math.max(0, prev.naoLidas - (jaLida === false ? 1 : 0)),
        };
      });
      sucesso = true;
    } catch (falha) {
      if (atual() && (falha.name !== 'AbortError' || operacao.expirou)) {
        setEstado(prev => ({ ...prev, erro: operacao.expirou
          ? 'O servidor demorou para responder. Atualize para conferir a leitura.'
          : 'Não foi possível marcar como lida. Tente novamente.' }));
      }
    } finally {
      window.clearTimeout(timeout);
      if (atual()) {
        sessao.escrita = null;
        setEstado(prev => ({ ...prev, salvando: false }));
      }
    }
    if (sucesso) await atualizar();
    return sucesso;
  }, [usuarioId, atualizar]);

  const marcarLida = useCallback((id) => salvarLeitura(id), [salvarLeitura]);
  const marcarTodasLidas = useCallback(() => salvarLeitura(), [salvarLeitura]);
  const visivel = estado.usuarioId === usuarioId ? estado : estadoInicial(usuarioId);

  return { ...visivel, marcarLida, marcarTodasLidas, atualizar };
}
