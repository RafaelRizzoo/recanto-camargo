/**
 * useNotificacoes.js
 * Hook de notificações local — localStorage, sem dependências externas.
 */
import { useState, useCallback, useEffect } from 'react';

const CHAVE = 'recanto_notificacoes';

function lerStorage() {
  try {
    const raw = localStorage.getItem(CHAVE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function salvarStorage(lista) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch { /* storage cheio */ }
}

/**
 * Cria notificação fora do hook (ex: dentro de callbacks).
 * Dispara evento para o sino reagir sem re-render global.
 */
export function criarNotificacao({ titulo, mensagem, tipo = 'info', icone = 'bi-bell' }) {
  const lista = lerStorage();
  const nova = {
    id: `N${Date.now()}`,
    titulo, mensagem, tipo, icone,
    lida: false,
    criadaEm: new Date().toISOString(),
  };
  salvarStorage([nova, ...lista]);
  window.dispatchEvent(new CustomEvent('recanto:notificacao', { detail: nova }));
  return nova;
}

export function useNotificacoes() {
  const [notificacoes, setNotificacoes] = useState(lerStorage);

  // Reage quando criarNotificacao() dispara o evento
  useEffect(() => {
    const sync = () => setNotificacoes(lerStorage());
    window.addEventListener('recanto:notificacao', sync);
    return () => window.removeEventListener('recanto:notificacao', sync);
  }, []);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const adicionar = useCallback(({ titulo, mensagem, tipo = 'info', icone = 'bi-bell' }) => {
    const nova = {
      id: `N${Date.now()}`,
      titulo, mensagem, tipo, icone,
      lida: false,
      criadaEm: new Date().toISOString(),
    };
    setNotificacoes(prev => {
      const next = [nova, ...prev];
      salvarStorage(next);
      return next;
    });
    return nova;
  }, []);

  const marcarLida = useCallback((id) => {
    setNotificacoes(prev => {
      const next = prev.map(n => n.id === id ? { ...n, lida: true } : n);
      salvarStorage(next);
      return next;
    });
  }, []);

  const marcarTodasLidas = useCallback(() => {
    setNotificacoes(prev => {
      const next = prev.map(n => ({ ...n, lida: true }));
      salvarStorage(next);
      return next;
    });
  }, []);

  const remover = useCallback((id) => {
    setNotificacoes(prev => {
      const next = prev.filter(n => n.id !== id);
      salvarStorage(next);
      return next;
    });
  }, []);

  const limparTodas = useCallback(() => {
    salvarStorage([]);
    setNotificacoes([]);
  }, []);

  return { notificacoes, naoLidas, adicionar, marcarLida, marcarTodasLidas, remover, limparTodas };
}
