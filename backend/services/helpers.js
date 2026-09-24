const { ErroHttp } = require('../middlewares/errorHandler');

async function garantirHospede(executor, usuarioId, bloquear = false) {
    const lock = bloquear ? ' FOR UPDATE' : '';
    const [hospedes] = await executor.query(
        `SELECT h.Usu_Id
         FROM hos_hospede h
         INNER JOIN usu_usuario u ON u.Usu_Id = h.Usu_Id
         WHERE h.Usu_Id = ? AND u.Usu_Status = ?
         LIMIT 1${lock}`,
        [usuarioId, 'ATIVO']
    );

    if (hospedes.length === 0) {
        throw new ErroHttp(403, 'Acesso permitido apenas a hóspedes.');
    }
}

async function garantirProprietario(executor, usuarioId, bloquear = false) {
    const lock = bloquear ? ' FOR UPDATE' : '';
    const [proprietarios] = await executor.query(
        `SELECT p.Usu_Id
         FROM pro_proprietario p
         INNER JOIN usu_usuario u ON u.Usu_Id = p.Usu_Id
         WHERE p.Usu_Id = ? AND u.Usu_Status = ?
         LIMIT 1${lock}`,
        [usuarioId, 'ATIVO']
    );

    if (proprietarios.length === 0) {
        throw new ErroHttp(403, 'Acesso permitido apenas a proprietários ativos.');
    }
}

function normalizarIdPositivo(valor, nomeCampo) {
    const validoComoNumero = typeof valor === 'number'
        && Number.isSafeInteger(valor)
        && valor > 0;
    const validoComoTexto = typeof valor === 'string'
        && /^[1-9]\d*$/.test(valor.trim())
        && Number.isSafeInteger(Number(valor));

    if (!validoComoNumero && !validoComoTexto) {
        throw new ErroHttp(400, `${nomeCampo} inválido.`);
    }

    return Number(valor);
}

function normalizarNota(valor) {
    const nota = typeof valor === 'number'
        ? valor
        : (typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : NaN);

    if (!Number.isFinite(nota) || nota < 1 || nota > 5 || !Number.isInteger(nota * 2)) {
        throw new ErroHttp(400, 'A nota deve estar entre 1 e 5, em intervalos de meio ponto.');
    }

    return nota;
}

function normalizarComentario(valor, obrigatorio = false) {
    if (valor !== undefined && valor !== null && typeof valor !== 'string') {
        throw new ErroHttp(400, 'O comentário deve ser um texto válido.');
    }

    const comentario = typeof valor === 'string' ? valor.trim() : '';

    if (obrigatorio && comentario.length === 0) {
        throw new ErroHttp(400, 'Informe um comentário para a resposta.');
    }
    if (comentario.length > 255) {
        throw new ErroHttp(400, 'O comentário deve ter no máximo 255 caracteres.');
    }

    return comentario;
}

function normalizarRespostaProprietario(avaliacao, incluirNota = true) {
    const semResposta = avaliacao.respostaNota === null
        && avaliacao.respostaComentario === null
        && avaliacao.respostaData === null;

    if (semResposta) return null;

    const resposta = {
        comentario: avaliacao.respostaComentario || '',
        data: avaliacao.respostaData
    };

    if (incluirNota) resposta.nota = Number(avaliacao.respostaNota);

    return resposta;
}

function normalizarAvaliacao(avaliacao, incluirNotaProprietario = true) {
    return {
        id: Number(avaliacao.id),
        nota: Number(avaliacao.nota),
        comentario: avaliacao.comentario || '',
        data: avaliacao.data,
        respostaProprietario: normalizarRespostaProprietario(avaliacao, incluirNotaProprietario)
    };
}

function normalizarCupom(cupom) {
    const id = Number(cupom.Cup_Id);
    const valorDesconto = Number(cupom.Cup_ValorDoDesconto);
    const limiteUso = Number(cupom.Cup_LimiteUso);
    const tipoDesconto = cupom.Cup_TipoDesconto;

    const idInvalido = !Number.isSafeInteger(id) || id <= 0;
    const percentualInvalido = tipoDesconto === 'PERCENTUAL' && valorDesconto > 100;
    const tipoInvalido = !['PERCENTUAL', 'FIXO'].includes(tipoDesconto);
    const valorInvalido = !Number.isFinite(valorDesconto) || valorDesconto <= 0;
    const limiteInvalido = !Number.isSafeInteger(limiteUso) || limiteUso <= 0;

    if (idInvalido || tipoInvalido || valorInvalido || percentualInvalido || limiteInvalido) {
        throw new ErroHttp(409, 'Este cupom possui uma configuração inválida.');
    }

    return {
        id,
        codigo: cupom.Cup_Codigo,
        tipoDesconto,
        valorDesconto,
        validoAte: cupom.Cup_DataValidade,
        limiteUso,
        publicoAlvo: cupom.Cup_PublicoAlvo || 'TODOS',
        clienteId: cupom.Cup_Cliente_Usu_Id ? Number(cupom.Cup_Cliente_Usu_Id) : null,
        minimoNoites: cupom.Cup_MinimoNoites ? Number(cupom.Cup_MinimoNoites) : 1,
        valorMinimo: cupom.Cup_ValorMinimo ? Number(cupom.Cup_ValorMinimo) : 0
    };
}

async function buscarCupomPorCodigo(executor, codigo) {
    const [cupons] = await executor.query(
        `SELECT
            Cup_Id,
            Cup_Codigo,
            Cup_TipoDesconto,
            Cup_ValorDoDesconto,
            DATE_FORMAT(Cup_DataValidade, '%Y-%m-%d') AS Cup_DataValidade,
            Cup_LimiteUso,
            Cup_PublicoAlvo,
            Cup_Cliente_Usu_Id,
            Cup_MinimoNoites,
            Cup_ValorMinimo,
            (Cup_DataValidade < CURDATE()) AS Cup_Expirado
         FROM cup_cupom
         WHERE UPPER(Cup_Codigo) = UPPER(?)
         LIMIT 2`,
        [codigo]
    );

    if (cupons.length === 0) {
        throw new ErroHttp(404, 'Cupom não encontrado.');
    }

    if (cupons.length > 1) {
        console.error('Inconsistência de integridade: código de cupom duplicado.');
        throw new ErroHttp(409, 'Não foi possível validar este cupom.');
    }

    return cupons[0];
}

async function buscarCupomPorIdComLock(executor, cupomId) {
    const [cupons] = await executor.query(
        `SELECT
            Cup_Id,
            Cup_Codigo,
            Cup_TipoDesconto,
            Cup_ValorDoDesconto,
            DATE_FORMAT(Cup_DataValidade, '%Y-%m-%d') AS Cup_DataValidade,
            Cup_LimiteUso,
            Cup_PublicoAlvo,
            Cup_Cliente_Usu_Id,
            Cup_MinimoNoites,
            Cup_ValorMinimo,
            (Cup_DataValidade < CURDATE()) AS Cup_Expirado
         FROM cup_cupom
         WHERE Cup_Id = ?
         FOR UPDATE`,
        [cupomId]
    );

    if (cupons.length === 0) {
        throw new ErroHttp(404, 'Cupom não encontrado.');
    }

    return cupons[0];
}

async function validarRegrasCupom(executor, cupomDb, hospedeId, bloquearUsos = false, reservaContexto = {}) {
    if (Number(cupomDb.Cup_Expirado) === 1) {
        throw new ErroHttp(400, 'Este cupom expirou.');
    }

    const cupom = normalizarCupom(cupomDb);

    const [contagensCodigo] = await executor.query(
        'SELECT COUNT(*) AS totalCodigos FROM cup_cupom WHERE UPPER(Cup_Codigo) = UPPER(?)',
        [cupom.codigo]
    );
    const totalCodigos = Number(contagensCodigo[0].totalCodigos);

    if (!Number.isSafeInteger(totalCodigos) || totalCodigos !== 1) {
        console.error('Inconsistência de integridade: código de cupom duplicado ou inválido.');
        throw new ErroHttp(409, 'Não foi possível validar este cupom.');
    }

    // Regra 1: Público Alvo - Cliente Específico
    if (cupom.publicoAlvo === 'CLIENTE_ESPECIFICO') {
        if (cupom.clienteId && Number(cupom.clienteId) !== Number(hospedeId)) {
            throw new ErroHttp(403, 'Este cupom é exclusivo e intransferível para outro destinatário.');
        }
    }

    // Regra 2: Público Alvo - Primeira Reserva
    if (cupom.publicoAlvo === 'PRIMEIRA_RESERVA') {
        const [reservasAnteriores] = await executor.query(
            `SELECT Res_Id FROM res_reserva 
             WHERE Hos_Hospede_Usu_Id = ? 
               AND Res_Status IN ('CONFIRMADA', 'CONCLUIDA')
             LIMIT 1`,
            [hospedeId]
        );
        if (reservasAnteriores.length > 0) {
            throw new ErroHttp(400, 'Este cupom é válido apenas na primeira reserva do hóspede.');
        }
    }

    if (cupom.publicoAlvo === 'CLIENTE_RETORNANTE') {
        const [reservasRetorno] = await executor.query(
            `SELECT 
                SUM(CASE WHEN Res_Status = 'CONCLUIDA' THEN 1 ELSE 0 END) as totalConcluidas,
                SUM(CASE WHEN Res_Status = 'CONCLUIDA' AND Res_DataCheckOut >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) THEN 1 ELSE 0 END) as totalRecentes
             FROM res_reserva
             WHERE Hos_Hospede_Usu_Id = ?`,
            [hospedeId]
        );
        
        if (Number(reservasRetorno[0].totalConcluidas) === 0) {
            throw new ErroHttp(400, 'Este cupom é válido apenas para clientes retornantes com reservas anteriores.');
        }
        if (Number(reservasRetorno[0].totalRecentes) > 0) {
            throw new ErroHttp(400, 'Este cupom é para clientes que não reservam há mais de 6 meses.');
        }
    }

    if (cupom.publicoAlvo === 'CLIENTE_RECORRENTE') {
        const [reservasRecorrentes] = await executor.query(
            `SELECT COUNT(*) as total FROM res_reserva 
             WHERE Hos_Hospede_Usu_Id = ? 
               AND Res_Status IN ('CONFIRMADA', 'CONCLUIDA')`,
            [hospedeId]
        );
        if (Number(reservasRecorrentes[0].total) < 2) {
            throw new ErroHttp(400, 'Este cupom é válido apenas para clientes recorrentes (2 ou mais reservas).');
        }
    }

    // Regra 3: Mínimo de noites (se informado no contexto)
    if (reservaContexto.noites && Number(cupom.minimoNoites) > 1) {
        if (Number(reservaContexto.noites) < Number(cupom.minimoNoites)) {
            throw new ErroHttp(400, `Este cupom exige uma estadia mínima de ${cupom.minimoNoites} noites.`);
        }
    }

    // Regra 4: Valor mínimo de reserva (se informado no contexto)
    if (reservaContexto.subtotal && Number(cupom.valorMinimo) > 0) {
        if (Number(reservaContexto.subtotal) < Number(cupom.valorMinimo)) {
            throw new ErroHttp(400, `Este cupom exige um valor mínimo de R$ ${Number(cupom.valorMinimo).toFixed(2)}.`);
        }
    }

    const consultaUsos = bloquearUsos
        ? `SELECT Hos_Hospede_Usu_Id
           FROM res_reserva
           WHERE Cup_Id = ?
           FOR UPDATE`
        : `SELECT Hos_Hospede_Usu_Id
           FROM res_reserva
           WHERE Cup_Id = ?`;
    const [usos] = await executor.query(consultaUsos, [cupom.id]);

    if (usos.some(uso => Number(uso.Hos_Hospede_Usu_Id) === Number(hospedeId))) {
        throw new ErroHttp(400, 'Você já utilizou este cupom.');
    }

    const totalUsos = usos.length;

    if (!Number.isSafeInteger(totalUsos) || totalUsos < 0) {
        throw new ErroHttp(409, 'Não foi possível verificar o limite deste cupom.');
    }
    if (totalUsos >= cupom.limiteUso) {
        throw new ErroHttp(400, 'Este cupom atingiu o limite de utilização.');
    }

    return cupom;
}

async function conciliarReservasConcluidas(executor, db, notificacoes) {
    try {
        const [expiradas] = await executor.query(
            `SELECT r.Res_Id, r.Hos_Hospede_Usu_Id, i.Imo_Nome,
                    u.Usu_Email AS hospedeEmail
             FROM res_reserva r
             JOIN imo_imovel i ON i.Imo_Id = r.Imo_Id
             JOIN usu_usuario u ON u.Usu_Id = r.Hos_Hospede_Usu_Id
             WHERE r.Res_Status = 'CONFIRMADA'
               AND r.Res_DataCheckOut < NOW()
             LIMIT 50`
        );

        for (const r of expiradas) {
            let conexao;
            try {
                conexao = await db.getConnection();
                await conexao.beginTransaction();
                const [res] = await conexao.query(
                    'UPDATE res_reserva SET Res_Status = "CONCLUIDA" WHERE Res_Id = ? AND Res_Status = "CONFIRMADA"',
                    [r.Res_Id]
                );
                if (res.affectedRows === 1) {
                    await conexao.query(`
                        INSERT INTO his_historicoreservastatus 
                        (Res_Id, His_DataAlteracao, His_StatusAnterior, His_StatusAtual, His_Motivo) 
                        VALUES (?, NOW(), 'CONFIRMADA', 'CONCLUIDA', 'Conclusão automática pelo sistema')
                    `, [r.Res_Id]);

                    const titulo = 'Estadia Concluída - Como foi sua experiência?';
                    const mensagem = `Sua estadia no Chalé Recanto Camargo referente à reserva #${r.Res_Id} foi concluída. Conte-nos como foi avaliando sua experiência no painel!`;
                    await notificacoes.criarNotificacao(
                        r.Hos_Hospede_Usu_Id, titulo, mensagem,
                        'SUCESSO', 'bi-calendar-check', conexao
                    );
                }
                await conexao.commit();
            } catch (err) {
                if (conexao) await conexao.rollback().catch(() => {});
                console.error(`Erro ao auto-concluir reserva #${r.Res_Id}:`, err.message);
            } finally {
                if (conexao) conexao.release();
            }
        }
    } catch (err) {
        console.error('Erro na conciliação de reservas concluídas:', err.message);
    }
}

module.exports = {
    garantirHospede,
    garantirProprietario,
    normalizarIdPositivo,
    normalizarNota,
    normalizarComentario,
    normalizarRespostaProprietario,
    normalizarAvaliacao,
    normalizarCupom,
    buscarCupomPorCodigo,
    buscarCupomPorIdComLock,
    validarRegrasCupom,
    conciliarReservasConcluidas
};
