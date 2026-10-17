/**
 * Utilitário central de configuração da API do Recanto Camargo.
 * Evita chamadas a 'http://localhost:3000' quando o app está publicado na internet (ex: GitHub Pages),
 * impedindo o aviso de segurança do navegador ("solicitando permissão para acessar outros apps").
 */

export function getApiBaseUrl() {
  // Se houver uma variável de ambiente definida no build (.env / CI/CD)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }

  // Verifica se está rodando localmente (desenvolvimento / teste)
  const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.local')
  );

  if (isLocal) {
    return 'http://localhost:3000';
  }

  // Em produção estática (GitHub Pages) sem backend remoto configurado,
  // retorna vazio para evitar que o navegador acione Private Network Access (PNA)
  return '';
}

export const API_BASE = getApiBaseUrl();
export const IS_API_AVAILABLE = Boolean(API_BASE);
