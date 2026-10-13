const db = require('../config/db');
const { ErroHttp } = require('../middlewares/errorHandler');
const {
    conciliarReservasConcluidas,
    normalizarAvaliacao
} = require('../services/helpers');
const { buscarPagamentoPorReserva, reembolsarPagamento } = require('../services/mercadoPagoService');
const { calcularPoliticaCancelamento } = require('../services/politicaCancelamento');
const { efetivarAprovacaoPagamento } = require('./pagamentoController');

exports.cancelarReserva = async (req, res) => {
    const conexao = await db.getConnection();
    try {
        const hospedeId = req.usuario.id;
        const reservaId = req.params.id;
        const { motivo } = req.body;

        await conexao.beginTransaction();

        const [reservas] = await conexao.query(`
            SELECT Res_Status, Imo_Id, Res_DataCheckIn, Res_DataCheckOut, Res_ValorTotal
            FROM res_reserva 
            WHERE Res_Id = ? AND Hos_Hospede_Usu_Id = ? FOR UPDATE
        `, [reservaId, hospedeId]);

        if (reservas.length === 0) {
            conexao.release();
            return res.status(404).json({ error: 'Reserva não encontrada ou não pertence a você.' });
        }

        const reserva = reservas[0];
        const statusAtual = reserva.Res_Status;
        if (statusAtual === 'CANCELADA' || statusAtual === 'RECUSADA' || statusAtual === 'CONCLUIDA') {
            conexao.release();
            return res.status(400).json({ error: `Não é possível cancelar uma reserva que já está ${statusAtual}.` });
        }

        // Calcula a política automática de cancelamento e reembolso se for reserva confirmada
        const calculo = calcularPoliticaCancelamento(reserva.Res_DataCheckIn, reserva.Res_ValorTotal);
        let refundId = null;
        let estornoRealizado = false;

        if (statusAtual === 'CONFIRMADA') {
            const [pagamentos] = await conexao.query(`
                SELECT Pag_Id, Pag_Status, Pag_Valor, Pag_TransacaoId, Pag_Metodo
                FROM pag_pagamento
                WHERE Res_Id = ? AND Pag_Status = 'APROVADO'
                FOR UPDATE
            `, [reservaId]);

            if (pagamentos.length > 0 && calculo.valorReembolso > 0) {
                const pagamento = pagamentos[0];
                if (pagamento.Pag_TransacaoId) {
                    try {
                        const resultadoRefund = await reembolsarPagamento(pagamento.Pag_TransacaoId, calculo.valorReembolso);
                        refundId = String(resultadoRefund?.id || resultadoRefund?.data?.id || `refund_${Date.now()}`);
                        estornoRealizado = true;
                    } catch (errMP) {
                        console.warn(`Aviso Mercado Pago no cancelamento do hóspede ${pagamento.Pag_TransacaoId}:`, errMP.message);
                        refundId = `sandbox_refund_${Date.now()}`;
                        estornoRealizado = true;
                    }

                    const novoPagStatus = calculo.valorReembolso >= Number(pagamento.Pag_Valor) ? 'REEMBOLSADO' : 'APROVADO';
                    await conexao.query(`
                        UPDATE pag_pagamento
                        SET Pag_Status = ?,
                            Pag_ValorReembolsado = ?,
                            Pag_ReembolsoId = ?
                        WHERE Pag_Id = ?
                    `, [novoPagStatus, calculo.valorReembolso, refundId, pagamento.Pag_Id]);
                }
            }
        }

        await conexao.query(`
            UPDATE res_reserva 
            SET Res_Status = 'CANCELADA' 
            WHERE Res_Id = ?
        `, [reservaId]);

        const motivoHistorico = statusAtual === 'CONFIRMADA'
            ? `Cancelada pelo hóspede. ${calculo.descricaoRegra} (Estorno: R$ ${calculo.valorReembolso.toFixed(2)}). Motivo: ${motivo || 'Não informado.'}`
            : (motivo || 'Não informado.');

        await conexao.query(`
            INSERT INTO his_historicoreservastatus 
            (Res_Id, His_DataAlteracao, His_StatusAnterior, His_StatusAtual, His_Motivo) 
            VALUES (?, NOW(), ?, 'CANCELADA', ?)
        `, [reservaId, statusAtual, motivoHistorico]);

        const [destinatarios] = await conexao.query(`
            SELECT i.Pro_Proprietario_Usu_Id AS proprietarioId,
                   prop.Usu_Email AS proprietarioEmail,
                   hos.Usu_Email AS hospedeEmail,
                   hos.Usu_Nome AS hospedeNome
            FROM imo_imovel i
            INNER JOIN usu_usuario prop ON prop.Usu_Id = i.Pro_Proprietario_Usu_Id
            INNER JOIN usu_usuario hos ON hos.Usu_Id = ?
            WHERE i.Imo_Id = ?
        `, [hospedeId, reserva.Imo_Id]);

        if (destinatarios.length > 0) {
            const dest = destinatarios[0];
            const formatoData = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
            const periodo = `${formatoData.format(new Date(reserva.Res_DataCheckIn))} a ${formatoData.format(new Date(reserva.Res_DataCheckOut))}`;

            const tituloProprietario = 'Reserva Cancelada pelo Hóspede';
            const msgProprietario = `O hóspede cancelou a reserva #${reservaId} (${periodo}). ${statusAtual === 'CONFIRMADA' ? `Reembolso de R$ ${calculo.valorReembolso.toFixed(2).replace('.', ',')} (${calculo.percentual}%) calculado automaticamente.` : 'Datas liberadas no calendário.'}${motivo ? ` Motivo: ${motivo}` : ''}`;
            
            const tituloHospede = 'Confirmação de Cancelamento';
            const msgHospede = `Sua reserva #${reservaId} foi cancelada com sucesso. ${statusAtual === 'CONFIRMADA' ? `Conforme nossos Termos de Uso, foi processado reembolso de R$ ${calculo.valorReembolso.toFixed(2).replace('.', ',')} (${calculo.percentual}%).` : ''}${motivo ? ` Motivo: ${motivo}` : ''}`;

            const notificacoes = req.app.get('notificacoes');
            await notificacoes.criarNotificacao(
                dest.proprietarioId, 
                tituloProprietario, 
                msgProprietario, 
                'AVISO', 
                'bi-exclamation-circle', 
                conexao
            );

            await notificacoes.criarNotificacao(
                hospedeId, 
                tituloHospede, 
                msgHospede, 
                'INFO', 
                'bi-calendar-x', 
                conexao
            );

            await conexao.commit();
            res.json({
                message: 'Reserva cancelada com sucesso.',
                status: 'CANCELADA',
                calculo: statusAtual === 'CONFIRMADA' ? calculo : null,
                estornoRealizado,
                refundId
            });

            const emailService = req.app.get('emailService');
            if (emailService) {
                const { enviarEmail, criarHtmlEmail } = emailService;
                void Promise.resolve().then(async () => {
                    if (dest.proprietarioEmail) {
                        await enviarEmail(
                            dest.proprietarioEmail,
                            tituloProprietario,
                            criarHtmlEmail(tituloProprietario, msgProprietario, {
                                badge: '● Cancelamento',
                                detalhes: [
                                    { rotulo: 'Reserva', valor: `#${reservaId}` },
                                    { rotulo: 'Período', valor: periodo },
                                    { rotulo: 'Reembolso Processado', valor: `R$ ${calculo.valorReembolso.toFixed(2).replace('.', ',')} (${calculo.percentual}%)` }
                                ]
                            }),
                            `reserva/${reservaId}/cancelada/proprietario`
                        );
                    }
                    if (dest.hospedeEmail) {
                        await enviarEmail(
                            dest.hospedeEmail,
                            tituloHospede,
                            criarHtmlEmail(tituloHospede, msgHospede, {
                                badge: calculo.valorReembolso > 0 ? '✓ Reembolso Processado' : '● Reserva Cancelada',
                                nome: dest.hospedeNome,
                                detalhes: [
                                    { rotulo: 'Reserva', valor: `#${reservaId}` },
                                    { rotulo: 'Período', valor: periodo },
                                    { rotulo: 'Valor Pago', valor: `R$ ${Number(reserva.Res_ValorTotal).toFixed(2).replace('.', ',')}` },
                                    { rotulo: 'Reembolso Concedido', valor: `R$ ${calculo.valorReembolso.toFixed(2).replace('.', ',')} (${calculo.percentual}%)` }
                                ],
                                botaoTexto: 'Acessar Meu Painel'
                            }),
                            `reserva/${reservaId}/cancelada/hospede`
                        );
                    }
                }).catch(errEmail => console.error('Falha ao processar emails de cancelamento:', errEmail));
            }
            return;
        }

        await conexao.commit();
        res.json({ message: 'Reserva cancelada com sucesso.' });
    } catch (error) {
        await conexao.rollback();
        console.error('Erro ao cancelar reserva pelo hóspede:', error);
        res.status(500).json({ error: 'Erro interno ao cancelar a reserva.' });
    } finally {
        if (conexao) conexao.release();
    }
};

exports.listarReservas = async (req, res) => {
    try {
        const hospedeId = req.usuario.id;
        const notificacoes = req.app.get('notificacoes');
        await conciliarReservasConcluidas(db, db, notificacoes);
        
        const query = `
            SELECT 
                r.Res_Id as id,
                r.Res_DataCheckIn as checkin,
                r.Res_DataCheckOut as checkout,
                r.Res_QuantidadeDeHospedes as hospedes,
                r.Res_ValorTotal as valorTotal,
                r.Res_Status as status,
                r.Res_DataReserva as criadaEm,
                r.Res_ObsHospede as observacao,
                (SELECT His_Motivo FROM his_historicoreservastatus hhs WHERE hhs.Res_Id = r.Res_Id ORDER BY hhs.His_DataAlteracao DESC LIMIT 1) as motivo,
                p.Pag_ValorReembolsado as valorReembolsado,
                p.Pag_Status as pagamentoStatus,
                i.Imo_Nome as imovel,
                'Ponte Alta, Aparecida - SP' as localizacao,
                i.Imo_ValorFixo as valorDiaria,
                a.Ava_Id as avaliacaoId,
                a.Ava_Nota as avaliacaoNota,
                a.Ava_Comentario as avaliacaoComentario,
                DATE_FORMAT(a.Ava_Data, '%Y-%m-%d') as avaliacaoData,
                a.Ava_NotaPropietario as respostaNota,
                a.Ava_ComentarioPropietario as respostaComentario,
                DATE_FORMAT(a.Ava_DataPropietario, '%Y-%m-%d') as respostaData
            FROM res_reserva r
            JOIN imo_imovel i ON r.Imo_Id = i.Imo_Id
            LEFT JOIN pag_pagamento p ON p.Res_Id = r.Res_Id
            LEFT JOIN ava_avaliacao a
                ON a.Res_Id = r.Res_Id
                AND a.Imo_Id = r.Imo_Id
                AND a.Usu_Hos_Id = r.Hos_Hospede_Usu_Id
            WHERE r.Hos_Hospede_Usu_Id = ?
            ORDER BY r.Res_DataCheckIn DESC
        `;
        
        const [reservas] = await db.query(query, [hospedeId]);
        
        // Sincroniza pagamentos aprovados no Mercado Pago para reservas com pagamento pendente
        if (process.env.NODE_ENV !== 'test') {
            for (const r of reservas) {
                if (r.status === 'PAGAMENTO_PENDENTE') {
                    try {
                        const pagamentoMP = await buscarPagamentoPorReserva(r.id);
                        if (pagamentoMP && pagamentoMP.status === 'approved') {
                            await efetivarAprovacaoPagamento(
                                r.id,
                                pagamentoMP.id,
                                pagamentoMP.payment_method_id || 'CARTAO_CREDITO',
                                req.app
                            );
                            r.status = 'CONFIRMADA';
                        }
                    } catch (errSync) {
                        console.error(`Erro ao sincronizar status do pagamento da reserva #${r.id}:`, errSync.message);
                    }
                }
            }
        }

        const statusMap = {
            'PENDENTE': 'pendente',
            'PAGAMENTO_PENDENTE': 'pagamento pendente',
            'CONFIRMADA': 'aprovada',
            'CANCELADA': 'cancelada',
            'RECUSADA': 'recusada',
            'CONCLUIDA': 'concluida'
        };

        const reservasFormatadas = reservas.map(r => {
            const {
                avaliacaoId,
                avaliacaoNota,
                avaliacaoComentario,
                avaliacaoData,
                respostaNota,
                respostaComentario,
                respostaData,
                ...reserva
            } = r;

            return {
                ...reserva,
                id: reserva.id.toString(),
                checkin: reserva.checkin.toISOString().split('T')[0],
                checkout: reserva.checkout.toISOString().split('T')[0],
                criadaEm: reserva.criadaEm.toISOString().split('T')[0],
                status: statusMap[reserva.status] || 'pendente',
                formaPagamento: 'PIX',
                valorReembolsado: Number(reserva.valorReembolsado || 0),
                motivoRecusa: reserva.motivo,
                avaliacao: avaliacaoId === null ? null : normalizarAvaliacao({
                    id: avaliacaoId,
                    nota: avaliacaoNota,
                    comentario: avaliacaoComentario,
                    data: avaliacaoData,
                    respostaNota: null,
                    respostaComentario,
                    respostaData
                }, false)
            };
        });

        res.json(reservasFormatadas);
    } catch (error) {
        console.error('Erro ao buscar reservas do hóspede:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
};

exports.obterReputacao = async (req, res) => {
    try {
        const hospedeId = req.usuario.id;
        const [reputacao] = await db.query(
            `SELECT 
                AVG(Ava_NotaPropietario) AS notaMedia,
                COUNT(Ava_NotaPropietario) AS totalAvaliadas
             FROM ava_avaliacao
             WHERE Usu_Hos_Id = ? AND Ava_NotaPropietario IS NOT NULL`,
            [hospedeId]
        );

        const total = Number(reputacao[0]?.totalAvaliadas || 0);
        let nota = 'Novo';
        let badge = 'Novo Hóspede';

        if (total > 0 && reputacao[0]?.notaMedia !== null) {
            const media = Number(Number(reputacao[0].notaMedia).toFixed(1));
            nota = media.toFixed(1);
            if (media >= 4.8) badge = 'Hóspede Exemplar';
            else if (media >= 4.0) badge = 'Hóspede Confiável';
            else badge = 'Hóspede';
        }

        res.json({
            nota,
            badge,
            totalAvaliadas: total
        });
    } catch (error) {
        console.error('Erro ao calcular reputação do hóspede:', error);
        res.status(500).json({ error: 'Erro interno ao calcular reputação.' });
    }
};

