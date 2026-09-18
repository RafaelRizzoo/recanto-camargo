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
        limiteUso
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

async function validarRegrasCupom(executor, cupomDb, hospedeId, bloquearUsos = false) {
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
