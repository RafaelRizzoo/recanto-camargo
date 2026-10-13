const db = require('../config/db');
const { criarPreferenciaPagamento, consultarPagamento, buscarPagamentoPorReserva } = require('../services/mercadoPagoService');

/**
 * Helper para efetivar a aprovação de pagamento de uma reserva no banco
 */
async function efetivarAprovacaoPagamento(reservaId, transacaoId, metodo = 'PIX', app = null) {
    let metodoBanco = 'PIX';
    const m = String(metodo).toLowerCase();
    if (m.includes('card') || m.includes('credit') || m.includes('master') || m.includes('visa')) {
        metodoBanco = 'CARTAO_CREDITO';
    } else if (m.includes('bol')) {
        metodoBanco = 'BOLETO';
    }

    const [pagamentos] = await db.query(
        `SELECT Pag_Id FROM pag_pagamento WHERE Res_Id = ?`,
        [reservaId]
    );

    if (pagamentos.length === 0) {
        await db.query(
            `INSERT INTO pag_pagamento 
             (Res_Id, Pag_Metodo, Pag_Status, Pag_Valor, Pag_DataHora, Pag_TransacaoId)
             VALUES (?, ?, 'APROVADO', 0, NOW(), ?)`,
            [reservaId, metodoBanco, String(transacaoId)]
        );
    } else {
        await db.query(
            `UPDATE pag_pagamento 
             SET Pag_Status = 'APROVADO', Pag_Metodo = ?, Pag_TransacaoId = ?, Pag_DataHora = NOW()
             WHERE Res_Id = ?`,
            [metodoBanco, String(transacaoId), reservaId]
        );
    }

    const [reservaAtual] = await db.query(
        `SELECT r.Res_Status, r.Hos_Hospede_Usu_Id, r.Res_ValorTotal,
                u.Usu_Nome AS hospedeNome,
                u.Usu_Email AS hospedeEmail,
                i.Pro_Proprietario_Usu_Id,
                prop.Usu_Email AS proprietarioEmail
         FROM res_reserva r
         LEFT JOIN usu_usuario u ON u.Usu_Id = r.Hos_Hospede_Usu_Id
         LEFT JOIN imo_imovel i ON i.Imo_Id = r.Imo_Id
         LEFT JOIN usu_usuario prop ON prop.Usu_Id = i.Pro_Proprietario_Usu_Id
         WHERE r.Res_Id = ?`,
        [reservaId]
    );

    if (reservaAtual.length > 0 && reservaAtual[0].Res_Status !== 'CONFIRMADA') {
        const dadosReserva = reservaAtual[0];
        const statusAnterior = dadosReserva.Res_Status;
        await db.query(
            `UPDATE res_reserva SET Res_Status = 'CONFIRMADA' WHERE Res_Id = ?`,
            [reservaId]
        );

        await db.query(
            `INSERT INTO his_historicoreservastatus 
             (Res_Id, His_DataAlteracao, His_StatusAnterior, His_StatusAtual, His_Motivo)
             VALUES (?, NOW(), ?, 'CONFIRMADA', 'Pagamento aprovado via Mercado Pago')`,
            [reservaId, statusAnterior]
        );

        if (app) {
            const notificacoes = app.get('notificacoes');
            const emailService = app.get('emailService');
            const valorFormatado = Number(dadosReserva.Res_ValorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const nomeHospede = dadosReserva.hospedeNome || 'Hóspede';

            const tituloHospede = 'Pagamento Confirmado — Reserva Garantida!';
            const msgHospede = `O pagamento da sua reserva #${reservaId} (${valorFormatado}) foi aprovado com sucesso via Mercado Pago. Sua estadia está confirmada!`;

            const tituloProprietario = 'Pagamento Recebido — Reserva Confirmada!';
            const msgProprietario = `O hóspede ${nomeHospede} efetuou o pagamento da reserva #${reservaId} (${valorFormatado}) via Mercado Pago. A reserva está confirmada!`;

            if (notificacoes) {
                // 1. Notifica o Hóspede
                await notificacoes.criarNotificacao(
                    dadosReserva.Hos_Hospede_Usu_Id,
                    'Pagamento Confirmado!',
                    msgHospede,
                    'SUCESSO',
                    'bi-check-circle'
                );

                // 2. Notifica o Proprietário
                if (dadosReserva.Pro_Proprietario_Usu_Id) {
                    await notificacoes.criarNotificacao(
                        dadosReserva.Pro_Proprietario_Usu_Id,
                        'Pagamento Recebido!',
                        msgProprietario,
                        'SUCESSO',
                        'bi-check-circle'
                    );
                }
            }

            if (emailService) {
                const { enviarEmail, criarHtmlEmail } = emailService;
                void Promise.resolve().then(async () => {
                    if (dadosReserva.hospedeEmail) {
                        await enviarEmail(
                            dadosReserva.hospedeEmail,
                            tituloHospede,
                            criarHtmlEmail(tituloHospede, msgHospede),
                            `reserva/${reservaId}/pagamento_confirmado/hospede`
                        );
                    }
                    if (dadosReserva.proprietarioEmail) {
                        await enviarEmail(
                            dadosReserva.proprietarioEmail,
                            tituloProprietario,
                            criarHtmlEmail(tituloProprietario, msgProprietario),
                            `reserva/${reservaId}/pagamento_confirmado/proprietario`
                        );
                    }
                }).catch(errEmail => console.error('Falha ao processar emails de confirmação de pagamento:', errEmail));
            }
        }
    }
}

/**
 * Cria ou recupera a preferência do Mercado Pago para uma reserva
 * POST /api/pagamentos/criar-preferencia/:reservaId
 */
exports.criarPreferencia = async (req, res) => {
    try {
        const { reservaId } = req.params;
        const usuarioId = req.usuario.id;

        if (!reservaId || isNaN(Number(reservaId))) {
            return res.status(400).json({ error: 'Identificador de reserva inválido.' });
        }

        // 1. Busca a reserva e valida titularidade (Prevenção IDOR)
        const [reservas] = await db.query(
            `SELECT r.Res_Id, r.Res_ValorTotal, r.Res_Status, r.Hos_Hospede_Usu_Id,
                    u.Usu_Nome, u.Usu_Email
             FROM res_reserva r
             INNER JOIN usu_usuario u ON u.Usu_Id = r.Hos_Hospede_Usu_Id
             WHERE r.Res_Id = ?`,
            [reservaId]
        );

        if (reservas.length === 0) {
            return res.status(404).json({ error: 'Reserva não encontrada.' });
        }

        const reserva = reservas[0];

        // Apenas o próprio hóspede titular ou proprietário pode gerar o pagamento
        if (reserva.Hos_Hospede_Usu_Id !== usuarioId && req.usuario.tipo !== 'proprietario') {
            return res.status(403).json({ error: 'Acesso negado: você não tem permissão para esta reserva.' });
        }

        if (reserva.Res_Status === 'CANCELADA' || reserva.Res_Status === 'RECUSADA') {
            return res.status(400).json({ error: `Esta reserva encontra-se ${reserva.Res_Status.toLowerCase()} e não pode receber pagamentos.` });
        }

        // 2. Verifica se já existe um pagamento aprovado para esta reserva
        const [pagamentosExistentes] = await db.query(
            `SELECT * FROM pag_pagamento WHERE Res_Id = ? ORDER BY Pag_Id DESC LIMIT 1`,
            [reservaId]
        );

        if (pagamentosExistentes.length > 0 && pagamentosExistentes[0].Pag_Status === 'APROVADO') {
            return res.status(400).json({ error: 'Esta reserva já possui um pagamento aprovado.' });
        }

        // 3. Cria a preferência no Mercado Pago
        const dadosPreferencia = await criarPreferenciaPagamento(reserva, {
            Usu_Nome: reserva.Usu_Nome,
            Usu_Email: reserva.Usu_Email
        });

        // 4. Salva ou atualiza os dados na tabela pag_pagamento
        if (pagamentosExistentes.length > 0 && pagamentosExistentes[0].Pag_Status === 'PENDENTE') {
            await db.query(
                `UPDATE pag_pagamento 
                 SET Pag_PreferenciaId = ?, Pag_LinkPagamento = ?, Pag_Valor = ?, Pag_DataHora = NOW()
                 WHERE Pag_Id = ?`,
                [dadosPreferencia.preferenceId, dadosPreferencia.initPoint, reserva.Res_ValorTotal, pagamentosExistentes[0].Pag_Id]
            );
        } else {
            await db.query(
                `INSERT INTO pag_pagamento 
                 (Res_Id, Pag_Metodo, Pag_Status, Pag_Valor, Pag_DataHora, Pag_PreferenciaId, Pag_LinkPagamento)
                 VALUES (?, 'PIX', 'PENDENTE', ?, NOW(), ?, ?)`,
                [reservaId, reserva.Res_ValorTotal, dadosPreferencia.preferenceId, dadosPreferencia.initPoint]
            );
        }

        return res.status(200).json({
            message: 'Preferência de pagamento criada com sucesso!',
            reservaId: Number(reservaId),
            valor: Number(reserva.Res_ValorTotal),
            preferenceId: dadosPreferencia.preferenceId,
            initPoint: dadosPreferencia.initPoint,
            sandboxInitPoint: dadosPreferencia.sandboxInitPoint,
            publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || ''
        });
    } catch (error) {
        console.error('Erro ao criar preferência no Mercado Pago:', error);
        const status = error.status || 500;
        return res.status(status).json({
            error: error.message || 'Erro interno ao processar gateway de pagamento.'
        });
    }
};

/**
 * Consulta o status de pagamento de uma reserva
 * GET /api/pagamentos/status/:reservaId
 */
exports.consultarStatus = async (req, res) => {
    try {
        const { reservaId } = req.params;
        const usuarioId = req.usuario.id;

        const [reservas] = await db.query(
            `SELECT Hos_Hospede_Usu_Id, Res_Status FROM res_reserva WHERE Res_Id = ?`,
            [reservaId]
        );

        if (reservas.length === 0) {
            return res.status(404).json({ error: 'Reserva não encontrada.' });
        }

        if (reservas[0].Hos_Hospede_Usu_Id !== usuarioId && req.usuario.tipo !== 'proprietario') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        let reservaStatus = reservas[0].Res_Status;

        // Se ainda não estiver confirmada, verifica ativamente na API do Mercado Pago
        if ((reservaStatus === 'PAGAMENTO_PENDENTE' || reservaStatus === 'PENDENTE') && process.env.NODE_ENV !== 'test') {
            const pagamentoMP = await buscarPagamentoPorReserva(reservaId);
            if (pagamentoMP && pagamentoMP.status === 'approved') {
                await efetivarAprovacaoPagamento(
                    reservaId,
                    pagamentoMP.id,
                    pagamentoMP.payment_method_id || 'CARTAO_CREDITO',
                    req.app
                );
                reservaStatus = 'CONFIRMADA';
            }
        }

        const [pagamentos] = await db.query(
            `SELECT Pag_Id, Res_Id, Pag_Metodo, Pag_Status, Pag_Valor, Pag_DataHora, Pag_PreferenciaId, Pag_LinkPagamento, Pag_TransacaoId
             FROM pag_pagamento WHERE Res_Id = ? ORDER BY Pag_Id DESC LIMIT 1`,
            [reservaId]
        );

        if (pagamentos.length === 0) {
            return res.status(200).json({
                temPagamento: false,
                status: 'NAO_INICIADO',
                reservaStatus
            });
        }

        return res.status(200).json({
            temPagamento: true,
            pagamento: pagamentos[0],
            reservaStatus
        });
    } catch (error) {
        console.error('Erro ao consultar status de pagamento:', error);
        return res.status(500).json({ error: 'Erro ao consultar status do pagamento.' });
    }
};

/**
 * Webhook para notificações assíncronas do Mercado Pago
 * POST /api/pagamentos/webhook
 */
exports.receberWebhook = async (req, res) => {
    // Mercado Pago exige retorno 200 rápido para não reenviar Webhook
    res.status(200).send('OK');

    try {
        const query = req.query || {};
        const body = req.body || {};

        // Identifica o ID da transação
        const paymentId = query['data.id'] || query.id || body.data?.id;
        const type = query.type || body.type;

        if (!paymentId || (type && type !== 'payment')) {
            return;
        }

        // Consulta os dados do pagamento no Mercado Pago
        const pagamentoMP = await consultarPagamento(paymentId);
        if (!pagamentoMP) return;

        const reservaId = pagamentoMP.external_reference;
        const statusMP = pagamentoMP.status;

        if (!reservaId) return;

        if (statusMP === 'approved') {
            await efetivarAprovacaoPagamento(
                reservaId,
                paymentId,
                pagamentoMP.payment_method_id || 'CARTAO_CREDITO',
                req.app
            );
        } else {
            let statusBanco = 'PENDENTE';
            if (statusMP === 'rejected' || statusMP === 'cancelled') statusBanco = 'RECUSADO';
            else if (statusMP === 'refunded') statusBanco = 'REEMBOLSADO';

            await db.query(
                `UPDATE pag_pagamento 
                 SET Pag_Status = ?, Pag_TransacaoId = ?, Pag_DataHora = NOW()
                 WHERE Res_Id = ?`,
                [statusBanco, String(paymentId), reservaId]
            );
        }
    } catch (error) {
        console.error('Erro ao processar Webhook do Mercado Pago:', error);
    }
};

/**
 * Simula a aprovação imediata do pagamento para testes em ambiente de desenvolvimento
 * POST /api/pagamentos/simular-aprovacao/:reservaId
 */
exports.simularAprovacao = async (req, res) => {
    try {
        const { reservaId } = req.params;
        const usuarioId = req.usuario.id;

        if (!reservaId || isNaN(Number(reservaId))) {
            return res.status(400).json({ error: 'Identificador de reserva inválido.' });
        }

        const [reservas] = await db.query(
            `SELECT Res_Id, Res_Status, Hos_Hospede_Usu_Id FROM res_reserva WHERE Res_Id = ?`,
            [reservaId]
        );

        if (reservas.length === 0) {
            return res.status(404).json({ error: 'Reserva não encontrada.' });
        }

        const reserva = reservas[0];
        if (reserva.Hos_Hospede_Usu_Id !== usuarioId && req.usuario.tipo !== 'proprietario') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const transacaoSimulada = `SIM_${Date.now()}`;
        await efetivarAprovacaoPagamento(reservaId, transacaoSimulada, 'PIX', req.app);

        return res.status(200).json({
            message: 'Pagamento simulado com sucesso! Reserva confirmada.',
            reservaId: Number(reservaId),
            novoStatus: 'CONFIRMADA'
        });
    } catch (error) {
        console.error('Erro ao simular aprovação de pagamento:', error);
        return res.status(500).json({ error: 'Erro ao simular aprovação do pagamento.' });
    }
};

exports.efetivarAprovacaoPagamento = efetivarAprovacaoPagamento;
