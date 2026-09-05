const TIPOS = new Set(['SUCESSO', 'ERRO', 'AVISO', 'INFO']);
const ICONES = new Set(['bi-calendar-check', 'bi-calendar-plus', 'bi-info-circle', 'bi-exclamation-circle', 'bi-check-circle']);

function validarId(valor) {
    const numero = typeof valor === 'string' && /^[1-9]\d*$/.test(valor)
        ? Number(valor)
        : valor;
    if (!Number.isInteger(numero) || numero <= 0 || numero > 2147483647) {
        throw new TypeError('Identificador de notificação ou usuário inválido.');
    }
    return numero;
}

function validarTexto(valor, limite) {
    if (typeof valor !== 'string' || !valor.trim() || [...valor].length > limite) {
        throw new TypeError('Conteúdo da notificação inválido.');
    }
    return valor.trim();
}

function normalizarNotificacao(linha) {
    return {
        id: Number(linha.Not_Id),
        titulo: linha.Not_Titulo,
        mensagem: linha.Not_Mensagem,
        tipo: TIPOS.has(linha.Not_Tipo) ? linha.Not_Tipo.toLowerCase() : 'info',
        icone: ICONES.has(linha.Not_Icone) ? linha.Not_Icone : 'bi-info-circle',
        lida: Number(linha.Not_Lida) === 1,
        criadaEm: new Date(linha.Not_CriadaEm).toISOString()
    };
}

function criarServicoNotificacoes(executor) {
    async function criarNotificacao(usuId, titulo, mensagem, tipo = 'INFO', icone = null, executorTransacao = executor) {
        const usuarioId = validarId(usuId);
        const tituloSeguro = validarTexto(titulo, 120);
        const mensagemSegura = validarTexto(mensagem, 500);
        if (!TIPOS.has(tipo) || (icone !== null && !ICONES.has(icone))) {
            throw new TypeError('Tipo ou ícone da notificação inválido.');
        }

        const [resultado] = await executorTransacao.query(
            `INSERT INTO not_notificacao
             (Usu_Id, Not_Titulo, Not_Mensagem, Not_Tipo, Not_Icone)
             VALUES (?, ?, ?, ?, ?)`,
            [usuarioId, tituloSeguro, mensagemSegura, tipo, icone]
        );
        return Number(resultado.insertId);
    }

    async function listarNotificacoes(usuId) {
        const usuarioId = validarId(usuId);
        const [[linhas], [totais]] = await Promise.all([
            executor.query(
                `SELECT Not_Id, Not_Titulo, Not_Mensagem, Not_Tipo, Not_Icone, Not_Lida, Not_CriadaEm
                 FROM not_notificacao
                 WHERE Usu_Id = ?
                 ORDER BY Not_CriadaEm DESC, Not_Id DESC
                 LIMIT ?`,
                [usuarioId, 50]
            ),
            executor.query(
                'SELECT COUNT(*) AS naoLidas FROM not_notificacao WHERE Usu_Id = ? AND Not_Lida = ?',
                [usuarioId, 0]
            )
        ]);
        return {
            notificacoes: linhas.map(normalizarNotificacao),
            // O badge inclui também as não lidas anteriores às 50 exibidas.
            naoLidas: Number(totais[0].naoLidas)
        };
    }

    async function marcarLida(usuId, id) {
        const usuarioId = validarId(usuId);
        const notificacaoId = validarId(id);
        const [resultado] = await executor.query(
            'UPDATE not_notificacao SET Not_Lida = ? WHERE Not_Id = ? AND Usu_Id = ?',
            [1, notificacaoId, usuarioId]
        );
        if (resultado.affectedRows > 0) return true;

        // A operação permanece idempotente mesmo com CLIENT_FOUND_ROWS desabilitado.
        const [existentes] = await executor.query(
            'SELECT Not_Id FROM not_notificacao WHERE Not_Id = ? AND Usu_Id = ? LIMIT 1',
            [notificacaoId, usuarioId]
        );
        return existentes.length > 0;
    }

    async function marcarTodasLidas(usuId) {
        const usuarioId = validarId(usuId);
        await executor.query(
            'UPDATE not_notificacao SET Not_Lida = ? WHERE Usu_Id = ? AND Not_Lida = ?',
            [1, usuarioId, 0]
        );
    }

    return { criarNotificacao, listarNotificacoes, marcarLida, marcarTodasLidas };
}

module.exports = { criarServicoNotificacoes, normalizarNotificacao, validarId };
