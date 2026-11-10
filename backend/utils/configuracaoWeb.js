// Configuração de CORS e do cookie de sessão, controlada por variáveis de ambiente.
// Em desenvolvimento nada precisa ser configurado (localhost:5173). Em produção, defina:
//   NODE_ENV=production
//   CORS_ORIGINS=https://rafaelrizzoo.github.io          (separe vários com vírgula)
//   COOKIE_SAMESITE=none                                   (padrão em produção; use "lax" se front e API ficarem no mesmo site)

const ORIGEM_PADRAO = 'http://localhost:5173';

function normalizarOrigem(valor) {
    try {
        return new URL(String(valor).trim()).origin;
    } catch {
        return null;
    }
}

// Lista de origens (protocolo + domínio + porta) autorizadas a chamar a API com cookies.
function listarOrigensPermitidas(env = process.env) {
    const bruto = env.CORS_ORIGINS || env.FRONTEND_URL || ORIGEM_PADRAO;
    const origens = String(bruto).split(',').map(normalizarOrigem).filter(Boolean);
    if (env.NODE_ENV !== 'production' && !origens.includes(ORIGEM_PADRAO)) origens.push(ORIGEM_PADRAO);
    return [...new Set(origens)];
}

// Função aceita pelo pacote cors: libera chamadas sem Origin (curl, testes) e as origens da lista.
function criarVerificadorOrigem(env = process.env) {
    const permitidas = listarOrigensPermitidas(env);
    return (origem, callback) => callback(null, !origem || permitidas.includes(origem));
}

// Opções do cookie da sessão. Em produção exige HTTPS (secure) e, por padrão, sameSite=none,
// necessário quando o site (GitHub Pages) e a API ficam em domínios diferentes.
function opcoesCookieSessao(env = process.env) {
    const producao = env.NODE_ENV === 'production';
    const permitidos = ['lax', 'strict', 'none'];
    const informado = String(env.COOKIE_SAMESITE || '').toLowerCase();
    let sameSite = permitidos.includes(informado) ? informado : (producao ? 'none' : 'lax');
    const secure = producao || sameSite === 'none';
    if (sameSite === 'none' && !secure) sameSite = 'lax';
    return { httpOnly: true, secure, sameSite };
}

module.exports = { listarOrigensPermitidas, criarVerificadorOrigem, opcoesCookieSessao };
