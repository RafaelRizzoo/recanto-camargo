const db = require('../config/db');
const { ErroHttp } = require('../middlewares/errorHandler');
const {
    garantirHospede,
    buscarCupomPorIdComLock,
    validarRegrasCupom,
    conciliarReservasConcluidas,
    normalizarAvaliacao
} = require('../services/helpers');

exports.checarDisponibilidade = async (req, res) => {
    try {
        const { checkin, checkout } = req.query;
        if (!checkin || !checkout) {
            return res.status(400).json({ error: 'Forneça checkin e checkout.' });
        }

        const imoId = 1;
        const queryConflito = `
            SELECT Res_Id FROM res_reserva 
            WHERE Imo_Id = ? 
            AND Res_Status IN ('CONFIRMADA', 'PENDENTE')
            AND (Res_DataCheckIn < ?) 
            AND (Res_DataCheckOut > ?)
        `;
        const valoresConflito = [imoId, checkout, checkin];
        const [reservasConflitantes] = await db.query(queryConflito, valoresConflito);

        if (reservasConflitantes.length > 0) {
            return res.json({ disponivel: false, motivo: 'Data já reservada.' });
        }

        // Verifica bloqueios manuais do proprietário
        const [bloqueios] = await db.query(
            `SELECT Bld_Id FROM bld_bloqueiodata
             WHERE Imo_Id = ? AND Bld_Status = 'ATIVO' AND Bld_Data >= ? AND Bld_Data < ?`,
            [imoId, checkin, checkout]
        );

        if (bloqueios.length > 0) {
            return res.json({ disponivel: false, motivo: 'Data bloqueada para manutenção pelo proprietário.' });
        }
        
        return res.json({ disponivel: true });
    } catch (error) {
        console.error('Erro ao checar disponibilidade:', error);
        res.status(500).json({ error: 'Erro interno ao checar disponibilidade.' });
    }
};

exports.datasOcupadas = async (req, res) => {
    try {
        const imoId = 1;
        const query = `
            SELECT 
                DATE_FORMAT(Res_DataCheckIn, '%Y-%m-%d') as checkin, 
                DATE_FORMAT(Res_DataCheckOut, '%Y-%m-%d') as checkout 
            FROM res_reserva 
            WHERE Imo_Id = ? 
            AND Res_Status IN ('CONFIRMADA', 'PENDENTE')
            AND Res_DataCheckOut >= CURDATE()
        `;
        const [datas] = await db.query(query, [imoId]);

        const [bloqueios] = await db.query(
            `SELECT DATE_FORMAT(Bld_Data, '%Y-%m-%d') as data
             FROM bld_bloqueiodata
             WHERE Imo_Id = ? AND Bld_Status = 'ATIVO' AND Bld_Data >= CURDATE()
             ORDER BY Bld_Data ASC`,
            [imoId]
        );

        const bloqueiosFormatados = bloqueios.map(b => {
            const dt = new Date(b.data + 'T12:00:00Z');
            dt.setUTCDate(dt.getUTCDate() + 1);
            const checkoutBloqueio = dt.toISOString().slice(0, 10);
            return { checkin: b.data, checkout: checkoutBloqueio, tipo: 'MANUTENCAO' };
        });

        res.json([...datas, ...bloqueiosFormatados]);
    } catch (error) {
        console.error('Erro ao buscar datas ocupadas:', error);
        res.status(500).json({ error: 'Erro interno ao buscar datas ocupadas.' });
    }
};

exports.criarReserva = async (req, res) => {
    const { checkin, checkout, hospedes, observacoes, cupomId } = req.body || {};
    
    const imoId = 1;
    const hospedeId = req.usuario.id;

    const cupomFoiInformado = cupomId !== undefined && cupomId !== null;
    const cupomIdValidoComoNumero = typeof cupomId === 'number'
        && Number.isSafeInteger(cupomId)
        && cupomId > 0;
    const cupomIdValidoComoTexto = typeof cupomId === 'string'
        && /^[1-9]\d*$/.test(cupomId.trim())
        && Number.isSafeInteger(Number(cupomId));

    if (cupomFoiInformado && !cupomIdValidoComoNumero && !cupomIdValidoComoTexto) {
        return res.status(400).json({ error: 'Identificador de cupom inválido.' });
    }
    const cupomIdSeguro = cupomFoiInformado ? Number(cupomId) : null;

    const conexao = await db.getConnection();

    try {
        await garantirHospede(conexao, hospedeId);

        if (!checkin || !checkout || !hospedes) {
            conexao.release();
            return res.status(400).json({ error: 'Dados incompletos para a reserva.' });
        }

        const dataCheckin = new Date(checkin);
        const dataCheckout = new Date(checkout);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (dataCheckin < hoje) {
            conexao.release();
            return res.status(400).json({ error: 'Você não pode reservar uma data no passado.' });
        }
        if (dataCheckout <= dataCheckin) {
            conexao.release();
            return res.status(400).json({ error: 'A data de checkout deve ser maior que o check-in.' });
        }

        await conexao.beginTransaction();

        const [imoveis] = await conexao.query(
            'SELECT Imo_ValorFixo FROM imo_imovel WHERE Imo_Id = ? AND Imo_Status = "ATIVO" FOR UPDATE', 
            [imoId]
        );

        if (imoveis.length === 0) {
            await conexao.rollback();
            conexao.release();
            return res.status(404).json({ error: 'Imóvel não encontrado ou inativo.' });
        }
        const precoDiariaDb = parseFloat(imoveis[0].Imo_ValorFixo);

        const queryConflito = `
            SELECT Res_Id FROM res_reserva 
            WHERE Imo_Id = ? 
            AND Res_Status IN ('CONFIRMADA', 'PENDENTE')
            AND (Res_DataCheckIn < ?) 
            AND (Res_DataCheckOut > ?)
        `;
        const valoresConflito = [imoId, checkout, checkin];
        const [reservasConflitantes] = await conexao.query(queryConflito, valoresConflito);

        if (reservasConflitantes.length > 0) {
            await conexao.rollback();
            conexao.release();
            return res.status(409).json({ error: 'As datas selecionadas já foram reservadas por outro hóspede.' });
        }

        // Verifica bloqueios manuais do proprietário
        const [bloqueiosConflitantes] = await conexao.query(
            `SELECT Bld_Id FROM bld_bloqueiodata
             WHERE Imo_Id = ? AND Bld_Status = 'ATIVO' AND Bld_Data >= ? AND Bld_Data < ?`,
            [imoId, checkin, checkout]
        );

        if (bloqueiosConflitantes.length > 0) {
            await conexao.rollback();
            conexao.release();
            return res.status(409).json({ error: 'As datas selecionadas estão bloqueadas para manutenção pelo proprietário.' });
        }

        const msPorDia = 1000 * 60 * 60 * 24;
        const diffTime = Math.abs(dataCheckout - dataCheckin);
        const quantidadeNoites = Math.ceil(diffTime / msPorDia);
        
        const TAXA_LIMPEZA = 80;
        let valorFinalSeguro = (quantidadeNoites * precoDiariaDb) + TAXA_LIMPEZA;
        let cupomAplicadoId = null;

        if (cupomIdSeguro !== null) {
            const cupomDb = await buscarCupomPorIdComLock(conexao, cupomIdSeguro);
            const cupom = await validarRegrasCupom(conexao, cupomDb, hospedeId, true, {
                noites: quantidadeNoites,
                subtotal: valorFinalSeguro
            });

            const subtotalCentavos = Math.round(valorFinalSeguro * 100);
            if (!Number.isSafeInteger(subtotalCentavos) || subtotalCentavos < 0) {
                throw new ErroHttp(400, 'Não foi possível calcular o valor da reserva.');
            }

            const descontoCentavos = cupom.tipoDesconto === 'PERCENTUAL'
                ? Math.round(subtotalCentavos * (cupom.valorDesconto / 100))
                : Math.round(cupom.valorDesconto * 100);

            valorFinalSeguro = Math.max(0, subtotalCentavos - descontoCentavos) / 100;
            cupomAplicadoId = cupom.id;
        }
        
        const queryInsert = `
            INSERT INTO res_reserva 
            (Cup_Id, Imo_Id, Hos_Hospede_Usu_Id, Res_DataCheckIn, Res_DataCheckOut, Res_QuantidadeDeHospedes, Res_ValorTotal, Res_Status, Res_DataReserva, Res_ObsHospede)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDENTE', NOW(), ?)
        `;
        const valoresInsert = [cupomAplicadoId, imoId, hospedeId, checkin, checkout, hospedes, valorFinalSeguro, observacoes || null];
        const [resultado] = await conexao.query(queryInsert, valoresInsert);
        const reservaCriadaId = resultado.insertId;

        await conexao.query(`
            INSERT INTO his_historicoreservastatus 
            (Res_Id, His_DataAlteracao, His_StatusAnterior, His_StatusAtual, His_Motivo) 
            VALUES (?, NOW(), 'CRIACAO', 'PENDENTE', NULL)
        `, [reservaCriadaId]);

        const [destinatarios] = await conexao.query(
            `SELECT p.Usu_Id AS proprietarioId, proprietario.Usu_Email AS proprietarioEmail,
                    hospede.Usu_Email AS hospedeEmail
             FROM imo_imovel i
             INNER JOIN pro_proprietario p ON p.Usu_Id = i.Pro_Proprietario_Usu_Id
             INNER JOIN usu_usuario proprietario ON proprietario.Usu_Id = p.Usu_Id
             INNER JOIN usu_usuario hospede ON hospede.Usu_Id = ?
             WHERE i.Imo_Id = ?`,
            [hospedeId, imoId]
        );
        if (destinatarios.length !== 1) {
            throw new ErroHttp(409, 'Não foi possível identificar o responsável pelo imóvel.');
        }

        const destinatario = destinatarios[0];
        const formatoData = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
        const periodo = `${formatoData.format(dataCheckin)} a ${formatoData.format(dataCheckout)}`;
        const tituloHospede = 'Reserva Recebida — Aguardando Aprovação';
        const mensagemHospede = `Sua reserva #${resultado.insertId}, de ${periodo}, foi recebida e aguarda aprovação do proprietário. Acompanhe pelo seu painel.`;
        const tituloProprietario = 'Nova reserva';
        const mensagemProprietario = `A reserva #${resultado.insertId}, de ${periodo}, aguarda sua aprovação ou recusa. Consulte os detalhes no seu painel.`;

        const notificacoes = req.app.get('notificacoes');
        await notificacoes.criarNotificacao(hospedeId, tituloHospede, mensagemHospede, 'INFO', 'bi-info-circle', conexao);
        await notificacoes.criarNotificacao(destinatario.proprietarioId, tituloProprietario, mensagemProprietario, 'INFO', 'bi-calendar-plus', conexao);
        
        await conexao.commit();
        conexao.release();

        res.status(201).json({ message: 'Reserva criada com sucesso no MySQL!', reservaId: resultado.insertId });

        const { enviarEmail, criarHtmlEmail } = req.app.get('emailService');
        void Promise.resolve().then(() => Promise.all([
            enviarEmail(destinatario.hospedeEmail, tituloHospede, criarHtmlEmail(tituloHospede, mensagemHospede), `reserva/${resultado.insertId}/pendente/hospede`),
            enviarEmail(destinatario.proprietarioEmail, tituloProprietario, criarHtmlEmail(tituloProprietario, mensagemProprietario), `reserva/${resultado.insertId}/pendente/proprietario`)
        ])).catch(() => console.error('Falha ao processar emails da reserva já salva.'));
    } catch (error) {
        try {
            await conexao.rollback();
            conexao.release();
        } catch (rollbackError) {
            console.error('Erro ao desfazer a transação da reserva:', rollbackError);
            conexao.destroy();
        }

        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao criar reserva:', error);
        res.status(500).json({ error: 'Erro interno ao criar reserva.' });
    }
};

exports.buscarPorId = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const { id } = req.params;
        const query = `
            SELECT r.Res_Id as id, r.Res_DataCheckIn as checkin, r.Res_DataCheckOut as checkout, r.Res_ValorTotal as total, u.Usu_Nome as nome,
                   r.Hos_Hospede_Usu_Id as titularId
            FROM res_reserva r JOIN usu_usuario u ON r.Hos_Hospede_Usu_Id = u.Usu_Id WHERE r.Res_Id = ?
        `;
        const [rows] = await db.query(query, [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Reserva não encontrada no banco' });
        const { titularId, ...comprovante } = rows[0];
        if (Number(titularId) !== Number(req.usuario.id)) {
            return res.status(403).json({ error: 'Você não tem permissão para acessar esta reserva.' });
        }
        res.json(comprovante);
    } catch (error) {
        console.error('Erro ao buscar reserva:', error);
        res.status(500).json({ error: 'Erro interno ao buscar a reserva.' });
    }
};
