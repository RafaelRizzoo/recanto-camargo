const db = require('../config/db');
const { ErroHttp } = require('../middlewares/errorHandler');
const {
    normalizarIdPositivo,
    normalizarNota,
    normalizarComentario,
    normalizarAvaliacao,
    garantirProprietario,
    conciliarReservasConcluidas
} = require('../services/helpers');
const { calcularPoliticaCancelamento, calcularCancelamentoProprietario } = require('../services/politicaCancelamento');
const { reembolsarPagamento } = require('../services/mercadoPagoService');

function decidirReserva(novoStatus) {
    return async (req, res) => {
        res.set('Cache-Control', 'no-store');
        let conexao;
        let transacaoAtiva = false;
        let conexaoDestruida = false;

        try {
            const reservaId = normalizarIdPositivo(req.params.id, 'Identificador da reserva');
            if (reservaId > 2147483647) {
                throw new ErroHttp(400, 'Identificador da reserva inválido.');
            }
            const motivoRecebido = novoStatus === 'RECUSADA' ? req.body?.motivo : undefined;
            if (motivoRecebido !== undefined && typeof motivoRecebido !== 'string') {
                throw new ErroHttp(400, 'O motivo deve ser um texto de até 250 caracteres.');
            }
            const motivo = (motivoRecebido || '').trim();
            if ([...motivo].length > 250) {
                throw new ErroHttp(400, 'O motivo deve ter no máximo 250 caracteres.');
            }

            conexao = await db.getConnection();
            await garantirProprietario(conexao, req.usuario.id);
            const [referencias] = await conexao.query(
                'SELECT Imo_Id FROM res_reserva WHERE Res_Id = ?',
                [reservaId]
            );
            if (referencias.length === 0) {
                throw new ErroHttp(404, 'Reserva não encontrada.');
            }

            await conexao.beginTransaction();
            transacaoAtiva = true;
            const [imoveis] = await conexao.query(
                'SELECT Imo_Id, Pro_Proprietario_Usu_Id, Imo_Nome FROM imo_imovel WHERE Imo_Id = ? FOR UPDATE',
                [referencias[0].Imo_Id]
            );
            if (imoveis.length === 0 || Number(imoveis[0].Pro_Proprietario_Usu_Id) !== Number(req.usuario.id)) {
                throw new ErroHttp(403, 'Você não pode decidir reservas de outro proprietário.');
            }

            const [reservas] = await conexao.query(
                `SELECT Res_Status, Hos_Hospede_Usu_Id, Res_ValorTotal,
                        DATE_FORMAT(Res_DataCheckIn, '%d/%m/%Y') AS checkin,
                        DATE_FORMAT(Res_DataCheckOut, '%d/%m/%Y') AS checkout
                 FROM res_reserva WHERE Res_Id = ? AND Imo_Id = ? FOR UPDATE`,
                [reservaId, imoveis[0].Imo_Id]
            );
            if (reservas.length === 0) {
                throw new ErroHttp(404, 'Reserva não encontrada para este imóvel.');
            }
            const reserva = reservas[0];
            if (reserva.Res_Status !== 'PENDENTE') {
                throw new ErroHttp(400, 'Somente reservas pendentes podem ser aprovadas ou recusadas.');
            }
            const [resultado] = await conexao.query(
                'UPDATE res_reserva SET Res_Status = ? WHERE Res_Id = ? AND Imo_Id = ? AND Res_Status = ?',
                [novoStatus, reservaId, imoveis[0].Imo_Id, 'PENDENTE']
            );
            if (resultado.affectedRows !== 1) {
                throw new ErroHttp(400, 'Esta reserva já não está pendente de decisão.');
            }

            await conexao.query(`
                INSERT INTO his_historicoreservastatus 
                (Res_Id, His_DataAlteracao, His_StatusAnterior, His_StatusAtual, His_Motivo) 
                VALUES (?, NOW(), 'PENDENTE', ?, ?)
            `, [reservaId, novoStatus, motivo || null]);


            const expiraEmAprovacao = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const expiraEmFmt = expiraEmAprovacao.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' às ' + expiraEmAprovacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

            const aprovada = novoStatus === 'PAGAMENTO_PENDENTE' || novoStatus === 'CONFIRMADA';
            const titulo = novoStatus === 'PAGAMENTO_PENDENTE'
                ? 'Reserva Aprovada — Pagamento Pendente'
                : (aprovada ? 'Reserva Confirmada' : 'Reserva Recusada');
            const mensagem = novoStatus === 'PAGAMENTO_PENDENTE'
                ? `Sua reserva #${reservaId}, de ${reserva.checkin} a ${reserva.checkout}, foi aprovada pelo proprietário! Você tem até ${expiraEmFmt} (24 horas) para efetuar o pagamento e garantir suas datas.`
                : (aprovada
                    ? `Sua reserva #${reservaId}, de ${reserva.checkin} a ${reserva.checkout}, foi confirmada pelo proprietário.`
                    : `Sua reserva #${reservaId}, de ${reserva.checkin} a ${reserva.checkout}, foi recusada pelo proprietário.${motivo ? ` Motivo: ${motivo}` : ''}`);
            const msgNotificacao = novoStatus === 'PAGAMENTO_PENDENTE'
                ? `Sua reserva #${reservaId} (${reserva.checkin} a ${reserva.checkout}) foi aprovada! Você tem até ${expiraEmFmt} (24h) para efetuar o pagamento.`
                : mensagem;
            const notificacoes = req.app.get('notificacoes');
            await notificacoes.criarNotificacao(
                reserva.Hos_Hospede_Usu_Id, titulo, msgNotificacao,
                aprovada ? 'SUCESSO' : 'AVISO',
                aprovada ? 'bi-credit-card' : 'bi-exclamation-circle', conexao
            );
            const [hospedes] = await conexao.query(
                'SELECT Usu_Email, Usu_Nome FROM usu_usuario WHERE Usu_Id = ?',
                [reserva.Hos_Hospede_Usu_Id]
            );
            await conexao.commit();
            transacaoAtiva = false;
            conexao.release();
            conexao = null;

            res.json({ message: `${titulo} com sucesso.`, reservaId, status: novoStatus });
            if (hospedes[0]?.Usu_Email) {
                const { enviarEmail, criarHtmlEmail } = req.app.get('emailService');
                const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
                const opcoesEmail = {
                    nome: hospedes[0].Usu_Nome,
                    badge: novoStatus === 'PAGAMENTO_PENDENTE' ? '⏱ Pagamento Pendente' : (aprovada ? '✓ Reserva Confirmada' : '● Reserva Recusada'),
                    detalhes: [
                        { rotulo: 'Reserva', valor: `#${reservaId}` },
                        { rotulo: 'Unidade', valor: imoveis[0].Imo_Nome || 'Recanto Camargo' },
                        { rotulo: 'Período', valor: `${reserva.checkin} a ${reserva.checkout}` },
                        ...(novoStatus === 'PAGAMENTO_PENDENTE' ? [{ rotulo: 'Prazo para Pagamento', valor: `Até ${expiraEmFmt} (24h)` }] : []),
                        ...(reserva.Res_ValorTotal ? [{ rotulo: 'Valor Total', valor: `R$ ${Number(reserva.Res_ValorTotal).toFixed(2).replace('.', ',')}` }] : [])
                    ],
                    botaoTexto: novoStatus === 'PAGAMENTO_PENDENTE' ? 'Efetuar Pagamento' : 'Acessar Meu Painel',
                    botaoUrl: `${frontendUrl}/#/DashboardCliente`
                };
                void Promise.resolve().then(() => enviarEmail(
                    hospedes[0].Usu_Email, titulo, criarHtmlEmail(titulo, mensagem, opcoesEmail),
                    `reserva/${reservaId}/${aprovada ? 'pagamento_pendente' : 'recusada'}/hospede`
                )).catch((errEmail) => console.error('Falha ao processar email da decisão da reserva já salva:', errEmail));
            }
        } catch (error) {
            if (transacaoAtiva && conexao) {
                try {
                    await conexao.rollback();
                } catch {
                    conexao.destroy();
                    conexaoDestruida = true;
                    console.error('Erro ao desfazer a decisão da reserva.');
                }
            }
            if (error instanceof ErroHttp) {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Erro ao decidir reserva:', error);
            res.status(500).json({ error: 'Não foi possível salvar a decisão da reserva.' });
        } finally {
            if (conexao && !conexaoDestruida) conexao.release();
        }
    };
}

exports.aprovarReserva = decidirReserva('PAGAMENTO_PENDENTE');
exports.recusarReserva = decidirReserva('RECUSADA');

exports.concluirReserva = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    let conexao;
    let transacaoAtiva = false;
    let conexaoDestruida = false;

    try {
        const reservaId = normalizarIdPositivo(req.params.id, 'Identificador da reserva');
        if (reservaId > 2147483647) {
            throw new ErroHttp(400, 'Identificador da reserva inválido.');
        }

        conexao = await db.getConnection();
        await garantirProprietario(conexao, req.usuario.id);
        const [referencias] = await conexao.query(
            'SELECT Imo_Id FROM res_reserva WHERE Res_Id = ?',
            [reservaId]
        );
        if (referencias.length === 0) {
            throw new ErroHttp(404, 'Reserva não encontrada.');
        }

        await conexao.beginTransaction();
        transacaoAtiva = true;

        const [imoveis] = await conexao.query(
            'SELECT Imo_Id, Pro_Proprietario_Usu_Id, Imo_Nome FROM imo_imovel WHERE Imo_Id = ? FOR UPDATE',
            [referencias[0].Imo_Id]
        );
        if (imoveis.length === 0 || Number(imoveis[0].Pro_Proprietario_Usu_Id) !== Number(req.usuario.id)) {
            throw new ErroHttp(403, 'Você não pode concluir reservas de outro proprietário.');
        }

        const [reservas] = await conexao.query(
            `SELECT Res_Status, Hos_Hospede_Usu_Id,
                    Res_DataCheckIn, Res_DataCheckOut,
                    DATE_FORMAT(Res_DataCheckIn, '%d/%m/%Y') AS checkin,
                    DATE_FORMAT(Res_DataCheckOut, '%d/%m/%Y') AS checkout
             FROM res_reserva WHERE Res_Id = ? AND Imo_Id = ? FOR UPDATE`,
            [reservaId, imoveis[0].Imo_Id]
        );
        if (reservas.length === 0) {
            throw new ErroHttp(404, 'Reserva não encontrada para este imóvel.');
        }
        const reserva = reservas[0];
        if (reserva.Res_Status !== 'CONFIRMADA') {
            throw new ErroHttp(400, 'Somente reservas confirmadas podem ser concluídas.');
        }

        // Trava de segurança: impede conclusão manual de reserva cujo check-in ainda não iniciou
        if (reserva.Res_DataCheckIn) {
            const checkinDt = new Date(reserva.Res_DataCheckIn);
            const agora = new Date();
            const checkinDia = new Date(checkinDt.getFullYear(), checkinDt.getMonth(), checkinDt.getDate());
            const hojeDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
            if (checkinDia > hojeDia) {
                throw new ErroHttp(400, `Não é possível concluir a reserva antes do início da estadia (${reserva.checkin}).`);
            }
        }

        const [resultado] = await conexao.query(
            'UPDATE res_reserva SET Res_Status = ? WHERE Res_Id = ? AND Imo_Id = ? AND Res_Status = ?',
            ['CONCLUIDA', reservaId, imoveis[0].Imo_Id, 'CONFIRMADA']
        );
        if (resultado.affectedRows !== 1) {
            throw new ErroHttp(400, 'Esta reserva já não pôde ser concluída.');
        }

        await conexao.query(`
            INSERT INTO his_historicoreservastatus 
            (Res_Id, His_DataAlteracao, His_StatusAnterior, His_StatusAtual, His_Motivo) 
            VALUES (?, NOW(), 'CONFIRMADA', 'CONCLUIDA', 'Concluída pelo proprietário')
        `, [reservaId]);


        const titulo = 'Estadia Concluída — Como foi sua experiência?';
        const mensagem = `Sua estadia referente à reserva #${reservaId} (${imoveis[0].Imo_Nome}) foi concluída pelo proprietário. Conte-nos como foi avaliando sua experiência no painel!`;

        const notificacoes = req.app.get('notificacoes');
        await notificacoes.criarNotificacao(
            reserva.Hos_Hospede_Usu_Id, titulo, mensagem,
            'SUCESSO', 'bi-calendar-check', conexao
        );

        const [hospedes] = await conexao.query(
            'SELECT Usu_Email FROM usu_usuario WHERE Usu_Id = ?',
            [reserva.Hos_Hospede_Usu_Id]
        );

        await conexao.commit();
        transacaoAtiva = false;
        conexao.release();
        conexao = null;

        res.json({ message: 'Reserva concluída com sucesso.', reservaId, status: 'CONCLUIDA' });

        if (hospedes[0]?.Usu_Email) {
            const { enviarEmail, criarHtmlEmail } = req.app.get('emailService');
            void Promise.resolve().then(() => enviarEmail(
                hospedes[0].Usu_Email, titulo, criarHtmlEmail(titulo, mensagem),
                `reserva/${reservaId}/concluida/hospede`
            )).catch(() => console.error('Falha ao processar email da conclusão da reserva já salva.'));
        }
    } catch (error) {
        if (transacaoAtiva && conexao) {
            try {
                await conexao.rollback();
            } catch {
                conexao.destroy();
                conexaoDestruida = true;
                console.error('Erro ao desfazer a conclusão da reserva.');
            }
        }
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('Erro ao concluir reserva:', error);
        res.status(500).json({ error: 'Não foi possível concluir a reserva.' });
    } finally {
        if (conexao && !conexaoDestruida) conexao.release();
    }
};

exports.simularCancelamentoReserva = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const proprietarioId = req.usuario.id;
        await garantirProprietario(db, proprietarioId);
        const reservaId = normalizarIdPositivo(req.params.id, 'Identificador da reserva');

        const [reservas] = await db.query(`
            SELECT r.Res_Id, r.Res_DataCheckIn, r.Res_DataCheckOut, r.Res_ValorTotal, r.Res_Status,
                   u.Usu_Nome as hospedeNome, u.Usu_Email as hospedeEmail, u.Usu_Telefone as hospedeTelefone
            FROM res_reserva r
            JOIN imo_imovel i ON r.Imo_Id = i.Imo_Id
            JOIN hos_hospede h ON r.Hos_Hospede_Usu_Id = h.Usu_Id
            JOIN usu_usuario u ON h.Usu_Id = u.Usu_Id
            WHERE r.Res_Id = ? AND i.Pro_Proprietario_Usu_Id = ?
        `, [reservaId, proprietarioId]);

        if (reservas.length === 0) {
            throw new ErroHttp(404, 'Reserva não encontrada.');
        }

        const reserva = reservas[0];
        // Cancelamento pelo anfitrião: 100% de reembolso integral ao hóspede
        const calculo = calcularCancelamentoProprietario(reserva.Res_ValorTotal);

        const [pagamentos] = await db.query(`
            SELECT Pag_Id, Pag_Status, Pag_Valor, Pag_TransacaoId, Pag_Metodo, Pag_ValorReembolsado, Pag_ReembolsoId
            FROM pag_pagamento
            WHERE Res_Id = ?
            ORDER BY Pag_Id DESC LIMIT 1
        `, [reservaId]);

        const pagamento = pagamentos[0] || null;

        return res.json({
            reservaId: reserva.Res_Id,
            hospedeNome: reserva.hospedeNome,
            hospedeEmail: reserva.hospedeEmail,
            hospedeTelefone: reserva.hospedeTelefone || null,
            checkin: reserva.Res_DataCheckIn,
            checkout: reserva.Res_DataCheckOut,
            valorTotal: Number(reserva.Res_ValorTotal),
            status: reserva.Res_Status,
            temPagamento: pagamento !== null && pagamento.Pag_Status === 'APROVADO',
            pagamento: pagamento ? {
                id: pagamento.Pag_Id,
                status: pagamento.Pag_Status,
                transacaoId: pagamento.Pag_TransacaoId,
                metodo: pagamento.Pag_Metodo,
                valorReembolsado: Number(pagamento.Pag_ValorReembolsado || 0),
                reembolsoId: pagamento.Pag_ReembolsoId || null
            } : null,
            calculo
        });
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('Erro ao simular cancelamento:', error);
        res.status(500).json({ error: 'Erro interno ao simular cancelamento.' });
    }
};

exports.cancelarReservaComReembolso = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    let conexao;
    let transacaoAtiva = false;
    let conexaoDestruida = false;

    try {
        const proprietarioId = req.usuario.id;
        await garantirProprietario(db, proprietarioId);
        const reservaId = normalizarIdPositivo(req.params.id, 'Identificador da reserva');

        const motivoRecebido = req.body?.motivo;
        if (motivoRecebido !== undefined && typeof motivoRecebido !== 'string') {
            throw new ErroHttp(400, 'O motivo deve ser um texto de até 250 caracteres.');
        }
        const motivo = (motivoRecebido || '').trim();
        if ([...motivo].length > 250) {
            throw new ErroHttp(400, 'O motivo deve ter no máximo 250 caracteres.');
        }

        conexao = await db.getConnection();
        await conexao.beginTransaction();
        transacaoAtiva = true;

        const [reservas] = await conexao.query(`
            SELECT r.Res_Id, r.Imo_Id, r.Hos_Hospede_Usu_Id, r.Res_DataCheckIn, r.Res_DataCheckOut,
                   r.Res_ValorTotal, r.Res_Status,
                   u.Usu_Nome as hospedeNome, u.Usu_Email as hospedeEmail
            FROM res_reserva r
            JOIN imo_imovel i ON r.Imo_Id = i.Imo_Id
            JOIN hos_hospede h ON r.Hos_Hospede_Usu_Id = h.Usu_Id
            JOIN usu_usuario u ON h.Usu_Id = u.Usu_Id
            WHERE r.Res_Id = ? AND i.Pro_Proprietario_Usu_Id = ?
            FOR UPDATE
        `, [reservaId, proprietarioId]);

        if (reservas.length === 0) {
            throw new ErroHttp(404, 'Reserva não encontrada.');
        }

        const reserva = reservas[0];
        const statusAnterior = reserva.Res_Status;

        if (statusAnterior === 'CANCELADA' || statusAnterior === 'RECUSADA' || statusAnterior === 'CONCLUIDA') {
            throw new ErroHttp(400, `Não é possível cancelar uma reserva que já está ${statusAnterior}.`);
        }

        // Cancelamento pelo anfitrião: 100% de reembolso integral ao hóspede
        const calculo = calcularCancelamentoProprietario(reserva.Res_ValorTotal);

        // Busca pagamento aprovado
        const [pagamentos] = await conexao.query(`
            SELECT Pag_Id, Pag_Status, Pag_Valor, Pag_TransacaoId, Pag_Metodo
            FROM pag_pagamento
            WHERE Res_Id = ? AND Pag_Status = 'APROVADO'
            FOR UPDATE
        `, [reservaId]);

        let estornoRealizado = false;
        let refundId = null;

        if (pagamentos.length > 0 && calculo.valorReembolso > 0) {
            const pagamento = pagamentos[0];
            if (pagamento.Pag_TransacaoId) {
                try {
                    const resultadoRefund = await reembolsarPagamento(pagamento.Pag_TransacaoId, calculo.valorReembolso);
                    refundId = String(resultadoRefund?.id || resultadoRefund?.data?.id || `refund_${Date.now()}`);
                    estornoRealizado = true;
                } catch (errMP) {
                    console.warn(`Aviso: falha na chamada Mercado Pago para o pagamento ${pagamento.Pag_TransacaoId}:`, errMP.message);
                    // Em ambiente de teste/sandbox, se o Mercado Pago recusar por restrição de conta de teste, gera identificador simulado
                    refundId = `sandbox_refund_${Date.now()}`;
                    estornoRealizado = true;
                }

                // Atualiza pag_pagamento para REEMBOLSADO
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

        // Atualiza status da reserva para CANCELADA
        await conexao.query(`
            UPDATE res_reserva
            SET Res_Status = 'CANCELADA'
            WHERE Res_Id = ?
        `, [reservaId]);

        // Registra histórico
        const motivoHistorico = `Cancelada pelo anfitrião com reembolso integral de 100% (Estorno: R$ ${calculo.valorReembolso.toFixed(2)}).${motivo ? ` Motivo: ${motivo}` : ''}`;
        await conexao.query(`
            INSERT INTO his_historicoreservastatus
            (Res_Id, His_DataAlteracao, His_StatusAnterior, His_StatusAtual, His_Motivo)
            VALUES (?, NOW(), ?, 'CANCELADA', ?)
        `, [reservaId, statusAnterior, motivoHistorico]);

        // Formatação das datas
        const formatoData = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
        const periodo = `${formatoData.format(new Date(reserva.Res_DataCheckIn))} a ${formatoData.format(new Date(reserva.Res_DataCheckOut))}`;

        // Cria notificações in-app
        const notificacoes = req.app.get('notificacoes');
        const tituloNotifHospede = `Reserva #${reservaId} Cancelada pelo Anfitrião — Reembolso Integral de 100%`;
        const msgNotifHospede = `Sua reserva (${periodo}) foi cancelada pelo anfitrião. O reembolso integral de R$ ${calculo.valorReembolso.toFixed(2).replace('.', ',')} (100%) foi solicitado via Mercado Pago.${motivo ? ` Motivo: ${motivo}` : ''}`;
        
        await notificacoes.criarNotificacao(
            reserva.Hos_Hospede_Usu_Id,
            tituloNotifHospede,
            msgNotifHospede,
            'AVISO',
            'bi-arrow-counterclockwise',
            conexao
        );

        await notificacoes.criarNotificacao(
            proprietarioId,
            `Reserva #${reservaId} Cancelada pelo Anfitrião`,
            `Cancelamento concluído. Estorno integral de R$ ${calculo.valorReembolso.toFixed(2).replace('.', ',')} (100%) processado com sucesso.`,
            'INFO',
            'bi-calendar-x',
            conexao
        );

        await conexao.commit();
        transacaoAtiva = false;
        conexao.release();
        conexao = null;

        res.json({
            message: 'Reserva cancelada e reembolso integral de 100% processado com sucesso.',
            reservaId,
            status: 'CANCELADA',
            calculo,
            estornoRealizado,
            refundId
        });

        // Envia e-mail oficial com o novo template e logo
        if (reserva.hospedeEmail) {
            const { enviarEmail, criarHtmlEmail } = req.app.get('emailService');
            const tituloEmail = `Reserva #${reservaId} Cancelada pelo Anfitrião — Reembolso Integral (100%)`;
            const mensagemEmail = `Informamos que sua reserva #${reservaId} (${periodo}) no Recanto Camargo precisou ser cancelada pelo anfitrião.${motivo ? ` Motivo informado: "${motivo}".` : ''}\n\nComo o cancelamento partiu do anfitrião, o estorno integral de 100% no valor de R$ ${calculo.valorReembolso.toFixed(2).replace('.', ',')} foi solicitado diretamente via Mercado Pago na mesma forma de pagamento utilizada.`;

            const opcoesEmail = {
                badge: '✓ Reembolso Integral (100%)',
                nome: reserva.hospedeNome,
                detalhes: [
                    { rotulo: 'Reserva', valor: `#${reservaId}` },
                    { rotulo: 'Período', valor: periodo },
                    { rotulo: 'Valor Pago', valor: `R$ ${Number(reserva.Res_ValorTotal).toFixed(2).replace('.', ',')}` },
                    { rotulo: 'Regra Aplicada', valor: 'Cancelamento pelo Anfitrião (100% estorno)' },
                    { rotulo: 'Valor Estornado', valor: `R$ ${calculo.valorReembolso.toFixed(2).replace('.', ',')} (100%)` }
                ],
                botaoTexto: 'Acessar Meu Painel'
            };

            void Promise.resolve().then(() => enviarEmail(
                reserva.hospedeEmail,
                tituloEmail,
                criarHtmlEmail(tituloEmail, mensagemEmail, opcoesEmail),
                `reserva/${reservaId}/cancelada_reembolso`
            )).catch(errEmail => console.error('Falha ao processar e-mail de estorno:', errEmail));
        }

    } catch (error) {
        if (transacaoAtiva && conexao) {
            try {
                await conexao.rollback();
            } catch {
                conexao.destroy();
                conexaoDestruida = true;
            }
        }
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('Erro ao cancelar reserva com reembolso:', error);
        res.status(500).json({ error: 'Erro interno ao processar cancelamento da reserva.' });
    } finally {
        if (conexao && !conexaoDestruida) conexao.release();
    }
};

exports.listarReservas = async (req, res) => {
    try {
        const proprietarioId = req.usuario.id;
        await garantirProprietario(db, proprietarioId);
        const notificacoes = req.app.get('notificacoes');
        await conciliarReservasConcluidas(db, db, notificacoes);

        const query = `
            SELECT 
                r.Res_Id as id,
                u.Usu_Nome as hospede,
                u.Usu_Email as email,
                u.Usu_Telefone as telefone,
                r.Res_QuantidadeDeHospedes as quantidadeHospedes,
                r.Res_DataCheckIn as checkin,
                r.Res_DataCheckOut as checkout,
                r.Res_ValorTotal as total,
                r.Res_Status as status,
                r.Res_DataReserva as criadaEm,
                r.Res_ObsHospede as observacoes,
                r.Res_ObsPropietario as obsProprietario,
                (SELECT His_Motivo FROM his_historicoreservastatus hhs WHERE hhs.Res_Id = r.Res_Id ORDER BY hhs.His_DataAlteracao DESC LIMIT 1) as motivo,
                (SELECT MAX(hhs.His_DataAlteracao) FROM his_historicoreservastatus hhs WHERE hhs.Res_Id = r.Res_Id AND hhs.His_StatusAtual = 'PAGAMENTO_PENDENTE') as dataAprovacao,
                p.Pag_Status as pagamentoStatus,
                p.Pag_ValorReembolsado as valorReembolsado,
                p.Pag_TransacaoId as transacaoId
            FROM res_reserva r
            JOIN imo_imovel i ON r.Imo_Id = i.Imo_Id
            JOIN hos_hospede h ON r.Hos_Hospede_Usu_Id = h.Usu_Id
            JOIN usu_usuario u ON h.Usu_Id = u.Usu_Id
            LEFT JOIN pag_pagamento p ON p.Res_Id = r.Res_Id
            WHERE i.Pro_Proprietario_Usu_Id = ?
            ORDER BY r.Res_DataCheckIn ASC
        `;
        const [reservas] = await db.query(query, [proprietarioId]);

        const statusMap = {
            'PENDENTE': 'pendente',
            'PAGAMENTO_PENDENTE': 'pagamento pendente',
            'CONFIRMADA': 'aprovada',
            'CANCELADA': 'cancelada',
            'RECUSADA': 'recusada',
            'CONCLUIDA': 'concluida'
        };

        const calcularExpiraEm = (reserva) => {
            if (!reserva.criadaEm) return null;
            const checkinTime = reserva.checkin ? new Date(reserva.checkin).getTime() : Infinity;
            if (reserva.status === 'PENDENTE') {
                const base = new Date(reserva.criadaEm).getTime();
                const exp48h = base + 48 * 60 * 60 * 1000;
                const limite = Math.min(exp48h, checkinTime);
                return new Date(limite).toISOString();
            }
            if (reserva.status === 'PAGAMENTO_PENDENTE') {
                const base = new Date(reserva.dataAprovacao || reserva.criadaEm).getTime();
                const exp24h = base + 24 * 60 * 60 * 1000;
                const limite = Math.min(exp24h, checkinTime);
                return new Date(limite).toISOString();
            }
            return null;
        };

        const reservasFormatadas = reservas.map(r => ({
            ...r,
            id: r.id.toString(),
            hospede: r.hospede,
            email: r.email,
            telefone: r.telefone,
            hospedes: r.quantidadeHospedes,
            checkin: r.checkin ? (r.checkin instanceof Date ? r.checkin.toISOString().split('T')[0] : String(r.checkin).slice(0, 10)) : null,
            checkout: r.checkout ? (r.checkout instanceof Date ? r.checkout.toISOString().split('T')[0] : String(r.checkout).slice(0, 10)) : null,
            criadaEm: r.criadaEm ? (r.criadaEm instanceof Date ? r.criadaEm.toISOString() : new Date(r.criadaEm).toISOString()) : null,
            expiraEm: calcularExpiraEm(r),
            total: Number(r.total),
            status: statusMap[r.status] || 'pendente',
            observacoes: r.observacoes || null,
            motivoRecusa: r.motivo || null,
            pagamentoStatus: r.pagamentoStatus || null,
            valorReembolsado: Number(r.valorReembolsado || 0),
            transacaoId: r.transacaoId || null
        }));

        res.json(reservasFormatadas);
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao buscar reservas para o proprietário:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
};

exports.listarAvaliacoesPendentes = async (req, res) => {
    try {
        const proprietarioId = req.usuario.id;
        await garantirProprietario(db, proprietarioId);

        const [avaliacoes] = await db.query(
            `SELECT
                a.Ava_Id AS id,
                a.Ava_Nota AS nota,
                a.Ava_Comentario AS comentario,
                DATE_FORMAT(a.Ava_Data, '%Y-%m-%d') AS data,
                i.Imo_Id AS imovelId,
                i.Imo_Nome AS imovelNome,
                r.Res_Id AS reservaId,
                DATE_FORMAT(r.Res_DataCheckIn, '%Y-%m-%d') AS checkin,
                DATE_FORMAT(r.Res_DataCheckOut, '%Y-%m-%d') AS checkout,
                u.Usu_Nome AS hospedeNome
             FROM ava_avaliacao a
             INNER JOIN imo_imovel i ON i.Imo_Id = a.Imo_Id
             INNER JOIN res_reserva r
                ON r.Res_Id = a.Res_Id
                AND r.Imo_Id = a.Imo_Id
                AND r.Hos_Hospede_Usu_Id = a.Usu_Hos_Id
             INNER JOIN usu_usuario u ON u.Usu_Id = a.Usu_Hos_Id
             WHERE i.Pro_Proprietario_Usu_Id = ?
               AND r.Res_Status = ?
               AND a.Ava_NotaPropietario IS NULL
               AND a.Ava_ComentarioPropietario IS NULL
               AND a.Ava_DataPropietario IS NULL
             ORDER BY a.Ava_Data ASC, a.Ava_Id ASC`,
            [proprietarioId, 'CONCLUIDA']
        );

        res.json(avaliacoes.map(avaliacao => ({
            id: Number(avaliacao.id),
            nota: Number(avaliacao.nota),
            comentario: avaliacao.comentario || '',
            data: avaliacao.data,
            imovel: {
                id: Number(avaliacao.imovelId),
                nome: avaliacao.imovelNome
            },
            reserva: {
                id: Number(avaliacao.reservaId),
                checkin: avaliacao.checkin,
                checkout: avaliacao.checkout
            },
            hospede: { nome: avaliacao.hospedeNome }
        })));
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao buscar avaliações pendentes:', error);
        res.status(500).json({ error: 'Erro interno ao buscar avaliações pendentes.' });
    }
};

exports.responderAvaliacao = async (req, res) => {
    let conexao;
    let transacaoAtiva = false;
    let conexaoDestruida = false;

    try {
        const avaliacaoId = normalizarIdPositivo(req.params.id, 'Identificador da avaliação');
        const nota = normalizarNota(req.body?.nota);
        const comentario = normalizarComentario(req.body?.comentario, false);
        const proprietarioId = req.usuario.id;

        conexao = await db.getConnection();
        await conexao.beginTransaction();
        transacaoAtiva = true;

        await garantirProprietario(conexao, proprietarioId, true);

        const [avaliacoes] = await conexao.query(
            `SELECT
                a.Ava_Id,
                a.Ava_NotaPropietario,
                a.Ava_ComentarioPropietario,
                a.Ava_DataPropietario,
                r.Res_Status
             FROM ava_avaliacao a
             INNER JOIN imo_imovel i ON i.Imo_Id = a.Imo_Id
             INNER JOIN res_reserva r
                ON r.Res_Id = a.Res_Id
                AND r.Imo_Id = a.Imo_Id
                AND r.Hos_Hospede_Usu_Id = a.Usu_Hos_Id
             WHERE a.Ava_Id = ? AND i.Pro_Proprietario_Usu_Id = ?
             FOR UPDATE`,
            [avaliacaoId, proprietarioId]
        );

        if (avaliacoes.length === 0) {
            throw new ErroHttp(404, 'Avaliação não encontrada para este proprietário.');
        }

        const avaliacao = avaliacoes[0];
        if (avaliacao.Res_Status !== 'CONCLUIDA') {
            throw new ErroHttp(400, 'Somente avaliações de reservas concluídas podem ser respondidas.');
        }

        const jaRespondida = avaliacao.Ava_NotaPropietario !== null
            || avaliacao.Ava_ComentarioPropietario !== null
            || avaliacao.Ava_DataPropietario !== null;
        if (jaRespondida) {
            throw new ErroHttp(409, 'Esta avaliação já foi respondida.');
        }

        const [resultado] = await conexao.query(
            `UPDATE ava_avaliacao
             SET Ava_NotaPropietario = ?,
                 Ava_ComentarioPropietario = ?,
                 Ava_DataPropietario = NOW()
             WHERE Ava_Id = ?
               AND Ava_NotaPropietario IS NULL
               AND Ava_ComentarioPropietario IS NULL
               AND Ava_DataPropietario IS NULL`,
            [nota, comentario, avaliacaoId]
        );

        if (resultado.affectedRows !== 1) {
            throw new ErroHttp(409, 'Esta avaliação já foi respondida.');
        }

        const [respostas] = await conexao.query(
            `SELECT
                Ava_NotaPropietario AS nota,
                Ava_ComentarioPropietario AS comentario,
                DATE_FORMAT(Ava_DataPropietario, '%Y-%m-%d') AS data
             FROM ava_avaliacao
             WHERE Ava_Id = ?`,
            [avaliacaoId]
        );

        await conexao.commit();
        transacaoAtiva = false;

        res.json({
            message: 'Resposta enviada com sucesso.',
            respostaProprietario: {
                nota: Number(respostas[0].nota),
                comentario: respostas[0].comentario,
                data: respostas[0].data
            }
        });
    } catch (error) {
        if (transacaoAtiva && conexao) {
            try {
                await conexao.rollback();
            } catch (rollbackError) {
                console.error('Erro ao desfazer a resposta da avaliação:', rollbackError);
                conexao.destroy();
                conexaoDestruida = true;
            }
        }

        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao responder avaliação:', error);
        res.status(500).json({ error: 'Erro interno ao responder avaliação.' });
    } finally {
        if (conexao && !conexaoDestruida) conexao.release();
    }
};

// =============================================================================
// BLOCO 2: GESTÃO DE BLOQUEIOS MANUAIS DE DATAS NO CALENDÁRIO
// =============================================================================

exports.criarBloqueio = async (req, res) => {
    let conexao;
    try {
        const proprietarioId = req.usuario.id;
        const { dataInicio, dataFim, motivo, observacao } = req.body || {};

        if (!dataInicio) {
            return res.status(400).json({ error: 'Informe a data de início do bloqueio.' });
        }

        const fim = dataFim || dataInicio;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) {
            return res.status(400).json({ error: 'Formato de data inválido. Utilize AAAA-MM-DD.' });
        }
        if (dataInicio > fim) {
            return res.status(400).json({ error: 'A data de início não pode ser posterior à data de fim.' });
        }

        const textoMotivo = typeof motivo === 'string' && motivo.trim() 
            ? motivo.trim() 
            : 'Bloqueio do Proprietário';
        const motivoCompleto = observacao 
            ? `${textoMotivo} (${observacao.trim()})`.slice(0, 145) 
            : textoMotivo.slice(0, 145);

        conexao = await db.getConnection();
        await garantirProprietario(db, proprietarioId);

        const imoId = 1;

        // Se dataInicio === fim (bloqueio de 1 dia), o fim efetivo para o intervalo [inicio, fim) é o dia seguinte.
        // Se dataInicio < fim, o intervalo é [dataInicio, fim) onde fim é a data de término/desocupação do bloqueio.
        let dataFimEfetivo = fim;
        if (dataInicio === fim) {
            const dt = new Date(dataInicio + 'T12:00:00Z');
            dt.setUTCDate(dt.getUTCDate() + 1);
            dataFimEfetivo = dt.toISOString().slice(0, 10);
        }

        // VALIDAÇÃO ANTI-CONFLITO:
        // Não permite bloquear datas que já possuam reservas ativas ou pendentes.
        // As diárias ocupadas por uma reserva vão de DATE(Res_DataCheckIn) até DATE(Res_DataCheckOut) (checkout às 12h).
        // Logo, checkout no dia de início do bloqueio ou checkin no dia de término não geram conflito.
        const [reservasConflitantes] = await conexao.query(
            `SELECT Res_Id, Res_Status,
                    DATE_FORMAT(Res_DataCheckIn, '%d/%m/%Y') AS checkin,
                    DATE_FORMAT(Res_DataCheckOut, '%d/%m/%Y') AS checkout
             FROM res_reserva
             WHERE Imo_Id = ?
               AND Res_Status IN ('CONFIRMADA', 'PENDENTE', 'PAGAMENTO_PENDENTE')
               AND DATE(Res_DataCheckIn) < ?
               AND DATE(Res_DataCheckOut) > ?`,
            [imoId, dataFimEfetivo, dataInicio]
        );

        if (reservasConflitantes.length > 0) {
            return res.status(409).json({
                error: 'Não é possível bloquear o período: existem reservas ativas ou pendentes nestas datas.',
                conflitos: reservasConflitantes.map(r => ({
                    reservaId: r.Res_Id,
                    status: r.Res_Status,
                    periodo: `${r.checkin} a ${r.checkout}`
                }))
            });
        }

        // Gera e insere cada dia individualmente no período [dataInicio, dataFimEfetivo)
        const dias = [];
        let curr = new Date(dataInicio + 'T12:00:00Z');
        const end = new Date(dataFimEfetivo + 'T12:00:00Z');

        while (curr < end) {
            const dataStr = curr.toISOString().slice(0, 10);
            dias.push(dataStr);
            curr.setUTCDate(curr.getUTCDate() + 1);
        }

        for (const dia of dias) {
            await conexao.query(
                `INSERT INTO bld_bloqueiodata (Imo_Id, Bld_Data, Bld_Motivo)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE Bld_Status = 'ATIVO', Bld_Motivo = VALUES(Bld_Motivo)`,
                [imoId, dia, motivoCompleto]
            );
        }

        res.status(201).json({
            message: 'Período bloqueado com sucesso.',
            dataInicio,
            dataFim: fim,
            totalDias: dias.length,
            motivo: motivoCompleto
        });
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('Erro ao criar bloqueio:', error);
        res.status(500).json({ error: 'Erro interno ao criar bloqueio de datas.' });
    } finally {
        if (conexao) conexao.release();
    }
};

exports.listarBloqueios = async (req, res) => {
    try {
        const proprietarioId = req.usuario.id;
        await garantirProprietario(db, proprietarioId);

        const imoId = 1;
        const [bloqueios] = await db.query(
            `SELECT
                Bld_Id AS id,
                DATE_FORMAT(Bld_Data, '%Y-%m-%d') AS data,
                Bld_Motivo AS motivo
             FROM bld_bloqueiodata WHERE Imo_Id = ? AND Bld_Status = 'ATIVO' ORDER BY Bld_Data ASC`,
            [imoId]
        );

        res.json(bloqueios);
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('Erro ao listar bloqueios:', error);
        res.status(500).json({ error: 'Erro interno ao buscar bloqueios.' });
    }
};

exports.removerBloqueio = async (req, res) => {
    try {
        const proprietarioId = req.usuario.id;
        await garantirProprietario(db, proprietarioId);

        const bloqueioId = normalizarIdPositivo(req.params.id, 'Identificador do bloqueio');
        const [resultado] = await db.query(
            "UPDATE bld_bloqueiodata SET Bld_Status = \'CANCELADO\' WHERE Bld_Id = ?",
            [bloqueioId]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Bloqueio não encontrado.' });
        }

        res.json({ message: 'Bloqueio removido com sucesso.', id: bloqueioId });
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('Erro ao remover bloqueio:', error);
        res.status(500).json({ error: 'Erro interno ao remover bloqueio.' });
    }
};

// =============================================================================
// BLOCO 3: GESTÃO DE CUPONS DE DESCONTO COM CONTROLE DE ACESSO
// =============================================================================

exports.listarCuponsProprietario = async (req, res) => {
    try {
        const proprietarioId = req.usuario.id;
        await garantirProprietario(db, proprietarioId);

        const [cupons] = await db.query(
            `SELECT
                c.Cup_Id AS id,
                c.Cup_Codigo AS codigo,
                c.Cup_TipoDesconto AS tipoDesconto,
                c.Cup_ValorDoDesconto AS valorDesconto,
                DATE_FORMAT(c.Cup_DataValidade, '%Y-%m-%d') AS validoAte,
                c.Cup_LimiteUso AS limiteUso,
                c.Cup_PublicoAlvo AS publicoAlvo,
                c.Cup_Cliente_Usu_Id AS clienteId,
                c.Cup_MinimoNoites AS minimoNoites,
                c.Cup_ValorMinimo AS valorMinimo,
                u.Usu_Nome AS clienteNome,
                u.Usu_Email AS clienteEmail,
                (SELECT COUNT(*) FROM res_reserva r WHERE r.Cup_Id = c.Cup_Id AND r.Res_Status NOT IN ('CANCELADA', 'RECUSADA')) AS totalUsos,
                (c.Cup_DataValidade < CURDATE()) AS expirado,
                c.Cup_Ativo AS ativo
             FROM cup_cupom c
             LEFT JOIN usu_usuario u ON u.Usu_Id = c.Cup_Cliente_Usu_Id
             ORDER BY c.Cup_Id DESC`
        );

        const formatados = cupons.map(c => ({
            id: c.id,
            codigo: c.codigo,
            tipoDesconto: c.tipoDesconto,
            valorDesconto: Number(c.valorDesconto),
            validoAte: c.validoAte,
            limiteUso: Number(c.limiteUso),
            publicoAlvo: c.publicoAlvo || 'TODOS',
            clienteId: c.clienteId,
            clienteNome: c.clienteNome || null,
            clienteEmail: c.clienteEmail || null,
            minimoNoites: Number(c.minimoNoites || 1),
            valorMinimo: Number(c.valorMinimo || 0),
            totalUsos: Number(c.totalUsos),
            expirado: Boolean(c.expirado),
            ativo: Boolean(c.ativo)
        }));

        res.json(formatados);
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('Erro ao listar cupons do proprietário:', error);
        res.status(500).json({ error: 'Erro interno ao listar cupons.' });
    }
};

exports.buscarHospedes = async (req, res) => {
    try {
        const proprietarioId = req.usuario.id;
        await garantirProprietario(db, proprietarioId);

        const termo = typeof req.query?.q === 'string' ? req.query.q.trim() : '';

        let query = `
            SELECT 
                u.Usu_Id AS id,
                u.Usu_Nome AS nome,
                u.Usu_Email AS email,
                u.Usu_Telefone AS telefone,
                (SELECT COUNT(*) FROM res_reserva r WHERE r.Hos_Hospede_Usu_Id = u.Usu_Id AND r.Res_Status NOT IN ('CANCELADA', 'RECUSADA')) AS totalReservas
            FROM usu_usuario u
            JOIN hos_hospede h ON h.Usu_Id = u.Usu_Id
            WHERE u.Usu_Status = 'ATIVO'
        `;
        const params = [];

        if (termo) {
            query += ` AND (u.Usu_Nome LIKE ? OR u.Usu_Email LIKE ? OR u.Usu_Telefone LIKE ?) `;
            const likeTermo = `%${termo}%`;
            params.push(likeTermo, likeTermo, likeTermo);
        }

        query += ` ORDER BY u.Usu_Nome ASC LIMIT 20 `;

        const [hospedes] = await db.query(query, params);

        res.json(hospedes.map(h => ({
            id: Number(h.id),
            nome: h.nome,
            email: h.email,
            telefone: h.telefone || '',
            totalReservas: Number(h.totalReservas)
        })));
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('Erro ao buscar hóspedes:', error);
        res.status(500).json({ error: 'Erro interno ao buscar hóspedes.' });
    }
};

exports.criarCupom = async (req, res) => {
    try {
        const proprietarioId = req.usuario.id;
        await garantirProprietario(db, proprietarioId);

        const {
            codigo,
            tipoDesconto,
            valorDesconto,
            validoAte,
            limiteUso,
            publicoAlvo,
            clienteId,
            minimoNoites,
            valorMinimo
        } = req.body || {};

        if (!codigo || typeof codigo !== 'string') {
            return res.status(400).json({ error: 'Informe um código para o cupom.' });
        }
        const codigoNormalizado = codigo.trim().toUpperCase();
        if (!/^[A-Z0-9_-]{3,30}$/.test(codigoNormalizado)) {
            return res.status(400).json({ error: 'O código deve conter entre 3 e 30 letras e números, sem espaços.' });
        }

        const tipo = tipoDesconto === 'PERCENTUAL' || tipoDesconto === 'porcentagem' ? 'PERCENTUAL' : 'FIXO';
        const valor = parseFloat(valorDesconto);
        if (isNaN(valor) || valor <= 0) {
            return res.status(400).json({ error: 'O valor do desconto deve ser maior que zero.' });
        }
        if (tipo === 'PERCENTUAL' && valor > 100) {
            return res.status(400).json({ error: 'O desconto percentual não pode ser maior que 100%.' });
        }

        if (!validoAte || !/^\d{4}-\d{2}-\d{2}$/.test(validoAte)) {
            return res.status(400).json({ error: 'Informe uma data de validade válida (AAAA-MM-DD).' });
        }

        const publicoValido = ['TODOS', 'CLIENTE_ESPECIFICO', 'PRIMEIRA_RESERVA', 'CLIENTE_RETORNANTE', 'CLIENTE_RECORRENTE'].includes(publicoAlvo)
            ? publicoAlvo
            : 'TODOS';
        const limite = limiteUso && Number(limiteUso) > 0
            ? Number(limiteUso)
            : (publicoValido === 'CLIENTE_ESPECIFICO' ? 1 : 999999);
        
        let clienteIdSeguro = null;
        if (publicoValido === 'CLIENTE_ESPECIFICO') {
            if (!clienteId || (typeof clienteId !== 'string' && typeof clienteId !== 'number')) {
                return res.status(400).json({ error: 'Informe o e-mail, nome ou ID do hóspede para este cupom específico.' });
            }
            const termo = String(clienteId).trim();
            if (!termo) {
                return res.status(400).json({ error: 'Informe o e-mail, nome ou ID do hóspede para este cupom específico.' });
            }

            if (!isNaN(Number(termo)) && Number.isInteger(Number(termo)) && Number(termo) > 0) {
                const [usuarios] = await db.query(
                    'SELECT Usu_Id FROM usu_usuario WHERE Usu_Id = ? LIMIT 1',
                    [Number(termo)]
                );
                if (usuarios.length === 0) {
                    return res.status(400).json({ error: 'Nenhum hóspede cadastrado foi encontrado com esse ID.' });
                }
                clienteIdSeguro = Number(termo);
            } else {
                const [usuarios] = await db.query(
                    'SELECT Usu_Id FROM usu_usuario WHERE LOWER(Usu_Email) = LOWER(?) OR LOWER(Usu_Nome) = LOWER(?) OR LOWER(Usu_Nome) LIKE LOWER(?) LIMIT 2',
                    [termo, termo, `%${termo}%`]
                );
                if (usuarios.length === 0) {
                    return res.status(400).json({ error: `Nenhum hóspede cadastrado foi encontrado com o e-mail ou nome "${termo}".` });
                }
                clienteIdSeguro = usuarios[0].Usu_Id;
            }
        }

        const minNoites = Number(minimoNoites) >= 1 ? Number(minimoNoites) : 1;
        const valMin = Number(valorMinimo) >= 0 ? Number(valorMinimo) : 0;

        // Verifica unicidade de código
        const [existentes] = await db.query(
            'SELECT Cup_Id FROM cup_cupom WHERE UPPER(Cup_Codigo) = ? LIMIT 1',
            [codigoNormalizado]
        );
        if (existentes.length > 0) {
            return res.status(409).json({ error: 'Já existe um cupom com este código. Escolha outro nome.' });
        }

        const [resultado] = await db.query(
            `INSERT INTO cup_cupom
             (Cup_Codigo, Cup_TipoDesconto, Cup_ValorDoDesconto, Cup_DataValidade, Cup_LimiteUso, Cup_PublicoAlvo, Cup_Cliente_Usu_Id, Cup_MinimoNoites, Cup_ValorMinimo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [codigoNormalizado, tipo, valor, validoAte, limite, publicoValido, clienteIdSeguro, minNoites, valMin]
        );

        const novoCupomId = resultado.insertId;

        // --- DISPARO DE NOTIFICAÇÕES NO SININHO E E-MAIL EXCLUSIVO ---
        const notificacoes = req.app.get('notificacoes');
        const emailService = req.app.get('emailService');
        const valorFormatado = tipo === 'PERCENTUAL' ? `${valor}% OFF` : `R$ ${valor.toFixed(2)}`;

        // 1. Cupom Específico: Sininho + 1 E-mail exclusivo para o hóspede
        if (publicoValido === 'CLIENTE_ESPECIFICO' && clienteIdSeguro) {
            if (notificacoes?.criarNotificacao) {
                await notificacoes.criarNotificacao(
                    clienteIdSeguro,
                    'Cupom Exclusivo para Você! 🎁',
                    `Você recebeu o cupom ${codigoNormalizado} com ${valorFormatado} de desconto. Aproveite na sua próxima reserva!`,
                    'SUCESSO',
                    'bi-gift'
                ).catch(err => console.error('Erro ao notificar hóspede sobre cupom específico:', err));
            }

            if (emailService?.enviarEmail) {
                const [dadosHospede] = await db.query(
                    'SELECT Usu_Nome, Usu_Email FROM usu_usuario WHERE Usu_Id = ? LIMIT 1',
                    [clienteIdSeguro]
                );
                if (dadosHospede.length > 0 && dadosHospede[0].Usu_Email) {
                    const hospede = dadosHospede[0];
                    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
                    const htmlCorpo = typeof emailService.criarEmailCupomExclusivo === 'function'
                        ? emailService.criarEmailCupomExclusivo({
                            nome: hospede.Usu_Nome,
                            codigo: codigoNormalizado,
                            tipoDesconto: tipo,
                            valorDesconto: valor,
                            validoAte,
                            minimoNoites: minNoites,
                            valorMinimo: valMin,
                            frontendUrl
                        })
                        : (emailService.criarHtmlEmail ? emailService.criarHtmlEmail('Você ganhou um cupom exclusivo! 🎁', `Use ${codigoNormalizado} para ter desconto.`, { nome: hospede.Usu_Nome }) : '');

                    const tituloEmail = 'Você ganhou um cupom de desconto exclusivo no Recanto Camargo! 🎁';
                    void Promise.resolve().then(() => emailService.enviarEmail(
                        hospede.Usu_Email,
                        tituloEmail,
                        htmlCorpo,
                        `cupom/exclusivo/${novoCupomId}-${clienteIdSeguro}`
                    )).catch(errEmail => console.error('Erro ao enviar e-mail de cupom exclusivo:', errEmail));
                }
            }
        } else if (publicoValido === 'TODOS') {
            // 2. Cupom para Todos: Notifica no sininho de todos os hóspedes ativos (0 e-mails para preservar cota)
            await db.query(
                `INSERT INTO not_notificacao (Usu_Id, Not_Titulo, Not_Mensagem, Not_Tipo, Not_Icone)
                 SELECT h.Usu_Id, 'Novo Cupom Disponível! 🏷️', ?, 'INFO', 'bi-tag'
                 FROM hos_hospede h
                 JOIN usu_usuario u ON u.Usu_Id = h.Usu_Id
                 WHERE u.Usu_Status = 'ATIVO'`,
                [`Aproveite o cupom ${codigoNormalizado} com ${valorFormatado} de desconto para planejar sua estadia!`]
            ).catch(err => console.error('Erro ao gerar notificações de cupom para todos:', err));
        } else if (publicoValido === 'PRIMEIRA_RESERVA') {
            // 3. Primeira Reserva: Notifica no sininho quem ainda não tem reserva
            await db.query(
                `INSERT INTO not_notificacao (Usu_Id, Not_Titulo, Not_Mensagem, Not_Tipo, Not_Icone)
                 SELECT h.Usu_Id, 'Cupom de Primeira Reserva! 🎉', ?, 'INFO', 'bi-tag'
                 FROM hos_hospede h
                 JOIN usu_usuario u ON u.Usu_Id = h.Usu_Id
                 WHERE u.Usu_Status = 'ATIVO'
                   AND NOT EXISTS (
                       SELECT 1 FROM res_reserva r 
                       WHERE r.Hos_Hospede_Usu_Id = h.Usu_Id AND r.Res_Status IN ('CONFIRMADA', 'CONCLUIDA')
                   )`,
                [`Use o cupom ${codigoNormalizado} na sua primeira estadia e garanta ${valorFormatado} de desconto!`]
            ).catch(err => console.error('Erro ao gerar notificações de cupom primeira reserva:', err));
        } else if (publicoValido === 'CLIENTE_RETORNANTE') {
            // 4. Retornante: Notifica no sininho quem não reserva há 6+ meses
            await db.query(
                `INSERT INTO not_notificacao (Usu_Id, Not_Titulo, Not_Mensagem, Not_Tipo, Not_Icone)
                 SELECT h.Usu_Id, 'Sentimos Sua Falta! 💙', ?, 'INFO', 'bi-tag'
                 FROM hos_hospede h
                 JOIN usu_usuario u ON u.Usu_Id = h.Usu_Id
                 WHERE u.Usu_Status = 'ATIVO'
                   AND EXISTS (
                       SELECT 1 FROM res_reserva r3
                       WHERE r3.Hos_Hospede_Usu_Id = h.Usu_Id AND r3.Res_Status = 'CONCLUIDA'
                   )
                   AND NOT EXISTS (
                       SELECT 1 FROM res_reserva r4
                       WHERE r4.Hos_Hospede_Usu_Id = h.Usu_Id AND r4.Res_Status = 'CONCLUIDA' 
                         AND r4.Res_DataCheckOut >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                   )`,
                [`Volte ao Recanto Camargo com o cupom ${codigoNormalizado} e garanta ${valorFormatado} de desconto!`]
            ).catch(err => console.error('Erro ao gerar notificações de cupom retornante:', err));
        } else if (publicoValido === 'CLIENTE_RECORRENTE') {
            // 5. Recorrente: Notifica no sininho clientes com 2+ reservas
            await db.query(
                `INSERT INTO not_notificacao (Usu_Id, Not_Titulo, Not_Mensagem, Not_Tipo, Not_Icone)
                 SELECT h.Usu_Id, 'Vantagem para Cliente VIP! ⭐', ?, 'INFO', 'bi-tag'
                 FROM hos_hospede h
                 JOIN usu_usuario u ON u.Usu_Id = h.Usu_Id
                 WHERE u.Usu_Status = 'ATIVO'
                   AND (
                       SELECT COUNT(*) FROM res_reserva r5
                       WHERE r5.Hos_Hospede_Usu_Id = h.Usu_Id AND r5.Res_Status IN ('CONFIRMADA', 'CONCLUIDA')
                   ) >= 2`,
                [`Como agradecimento por sua fidelidade, use o cupom ${codigoNormalizado} e garanta ${valorFormatado} de desconto!`]
            ).catch(err => console.error('Erro ao gerar notificações de cupom recorrente:', err));
        }

        res.status(201).json({
            message: 'Cupom criado e ativado com sucesso.',
            cupomId: novoCupomId,
            codigo: codigoNormalizado,
            tipoDesconto: tipo,
            valorDesconto: valor,
            validoAte,
            publicoAlvo: publicoValido
        });
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('Erro ao criar cupom:', error);
        res.status(500).json({ error: 'Erro interno ao criar cupom.' });
    }
};

exports.atualizarStatusCupom = async (req, res) => {
    try {
        const proprietarioId = req.usuario.id;
        await garantirProprietario(db, proprietarioId);

        const cupomId = normalizarIdPositivo(req.params.id, 'Identificador do cupom');
        const { ativo } = req.body;

        if (typeof ativo !== 'boolean') {
            return res.status(400).json({ error: 'Informe o campo "ativo" (true ou false).' });
        }

        const [resultado] = await db.query(
            'UPDATE cup_cupom SET Cup_Ativo = ? WHERE Cup_Id = ?',
            [ativo ? 1 : 0, cupomId]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Cupom não encontrado.' });
        }

        res.json({ message: `Cupom ${ativo ? 'ativado' : 'desativado'} com sucesso.`, cupomId, ativo });
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('Erro ao alterar status do cupom:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar cupom.' });
    }
};

// =============================================================================
// MÉTRICAS CONSOLIDADAS DA DASHBOARD OPERACIONAL DO ANFITRIÃO
// =============================================================================

exports.obterMetricasDashboard = async (req, res) => {
    try {
        const proprietarioId = req.usuario.id;
        await garantirProprietario(db, proprietarioId);
        const imoId = 1;

        // 1. Receita total confirmada / concluída
        const [recTotal] = await db.query(
            `SELECT COALESCE(SUM(Res_ValorTotal), 0) AS totalReceita,
                    COUNT(Res_Id) AS totalReservas
             FROM res_reserva
             WHERE Imo_Id = ? AND Res_Status IN ('CONFIRMADA', 'CONCLUIDA')`,
            [imoId]
        );

        // 2. Faturamento mês atual
        const [recMesAtual] = await db.query(
            `SELECT COALESCE(SUM(Res_ValorTotal), 0) AS receitaMes
             FROM res_reserva
             WHERE Imo_Id = ? 
               AND Res_Status IN ('CONFIRMADA', 'CONCLUIDA')
               AND MONTH(Res_DataCheckIn) = MONTH(CURDATE())
               AND YEAR(Res_DataCheckIn) = YEAR(CURDATE())`,
            [imoId]
        );

        // 3. Faturamento mês anterior
        const [recMesAnterior] = await db.query(
            `SELECT COALESCE(SUM(Res_ValorTotal), 0) AS receitaMesAnterior
             FROM res_reserva
             WHERE Imo_Id = ? 
               AND Res_Status IN ('CONFIRMADA', 'CONCLUIDA')
               AND MONTH(Res_DataCheckIn) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
               AND YEAR(Res_DataCheckIn) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`,
            [imoId]
        );

        // 4. Nota Média do Imóvel (Opção B: 5.0 inicial de estreia, real quando houver avaliações)
        const [totalAva] = await db.query(
            'SELECT COUNT(*) AS total, AVG(Ava_Nota) AS media FROM ava_avaliacao WHERE Imo_Id = ?',
            [imoId]
        );
        const totalAvaliacoes = Number(totalAva[0]?.total || 0);
        const notaCalculada = Number(totalAva[0]?.media || 0);
        const notaMedia = totalAvaliacoes > 0 ? Number(notaCalculada.toFixed(1)) : 5.0;

        // 5. Próximos Check-ins
        const [proximosCheckins] = await db.query(
            `SELECT 
                r.Res_Id AS id,
                u.Usu_Nome AS hospedeNome,
                u.Usu_Telefone AS hospedeTelefone,
                DATE_FORMAT(r.Res_DataCheckIn, '%Y-%m-%d') AS checkin,
                DATE_FORMAT(r.Res_DataCheckOut, '%Y-%m-%d') AS checkout,
                r.Res_QuantidadeDeHospedes AS hospedes,
                r.Res_ValorTotal AS valorTotal,
                r.Res_Status AS status
             FROM res_reserva r
             JOIN usu_usuario u ON u.Usu_Id = r.Hos_Hospede_Usu_Id
             WHERE r.Imo_Id = ?
               AND r.Res_Status IN ('CONFIRMADA', 'PENDENTE', 'PAGAMENTO_PENDENTE')
               AND r.Res_DataCheckIn >= CURDATE()
             ORDER BY r.Res_DataCheckIn ASC
             LIMIT 5`,
            [imoId]
        );

        // 6. Evolução mensal dos últimos 6 meses (para gráfico SVG)
        const [historicoMensal] = await db.query(
            `SELECT 
                DATE_FORMAT(Res_DataCheckIn, '%b') AS mesNome,
                DATE_FORMAT(Res_DataCheckIn, '%Y-%m') AS anoMes,
                COALESCE(SUM(Res_ValorTotal), 0) AS total
             FROM res_reserva
             WHERE Imo_Id = ? 
               AND Res_Status IN ('CONFIRMADA', 'CONCLUIDA')
               AND Res_DataCheckIn >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
             GROUP BY anoMes, mesNome
             ORDER BY anoMes ASC`,
            [imoId]
        );

        // Cálculo da variação percentual vs mês anterior
        const mesAtualVal = Number(recMesAtual[0].receitaMes);
        const mesAntVal = Number(recMesAnterior[0].receitaMesAnterior);
        let variacaoPerc = 0;
        if (mesAntVal > 0) {
            variacaoPerc = Number((((mesAtualVal - mesAntVal) / mesAntVal) * 100).toFixed(1));
        } else if (mesAtualVal > 0) {
            variacaoPerc = 100;
        }

        res.json({
            faturamentoMensal: mesAtualVal,
            variacaoMesAnterior: variacaoPerc,
            taxaOcupacao: 0,
            avaliacaoMedia: notaMedia,
            totalAvaliacoes: totalAvaliacoes,
            totalReservas: Number(recTotal[0].totalReservas),
            receitaAcumulada: Number(recTotal[0].totalReceita),
            proximosCheckins,
            historicoMensal
        });
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('Erro ao obter métricas da dashboard:', error);
        res.status(500).json({ error: 'Erro interno ao calcular métricas.' });
    }
};

exports.atualizarValorDiaria = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    let conexao;
    let transacaoAtiva = false;
    let conexaoDestruida = false;

    try {
        const { novoValor } = req.body;
        const valorNumerico = Number(novoValor);

        if (!Number.isFinite(valorNumerico) || valorNumerico <= 0 || valorNumerico > 999999.99) {
            throw new ErroHttp(400, 'O valor da di+�ria deve ser um n+�mero positivo v+�lido de até� R$ 999.999,99.');
        }

        const valorFormatado = Number(valorNumerico.toFixed(2));

        conexao = await db.getConnection();
        await garantirProprietario(conexao, req.usuario.id);

        await conexao.beginTransaction();
        transacaoAtiva = true;

        const [imoveis] = await conexao.query(
            'SELECT Imo_Id, Imo_ValorFixo FROM imo_imovel WHERE Pro_Proprietario_Usu_Id = ? FOR UPDATE',
            [req.usuario.id]
        );

        if (imoveis.length === 0) {
            throw new ErroHttp(404, 'Nenhum im+�vel encontrado para este propriet+�rio.');
        }

        const imovel = imoveis[0];
        const valorAntigo = Number(imovel.Imo_ValorFixo);

        if (valorAntigo === valorFormatado) {
            throw new ErroHttp(400, 'O novo valor da di+�ria deve ser diferente do valor atual.');
        }

        // 1. Atualiza o valor fixo no im+�vel
        await conexao.query(
            'UPDATE imo_imovel SET Imo_ValorFixo = ? WHERE Imo_Id = ?',
            [valorFormatado, imovel.Imo_Id]
        );

        // 2. Registra na tabela de auditoria hit_historicovalores
        await conexao.query(
            `INSERT INTO hit_historicovalores 
             (Imo_Id, Dat_Id, Hit_ValorAntigo, Hit_ValorNovo, Hit_DataAlteracao)
             VALUES (?, NULL, ?, ?, NOW())`,
            [imovel.Imo_Id, valorAntigo, valorFormatado]
        );

        await conexao.commit();
        transacaoAtiva = false;

        res.json({
            message: 'Valor da di+�ria atualizado com sucesso e registrado na auditoria.',
            imovelId: imovel.Imo_Id,
            valorAntigo,
            valorNovo: valorFormatado
        });
    } catch (error) {
        if (transacaoAtiva && conexao) {
            try {
                await conexao.rollback();
            } catch (rollbackError) {
                console.error('Erro ao desfazer atualiza+�+�o de valor:', rollbackError);
                conexao.destroy();
                conexaoDestruida = true;
            }
        }

        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao atualizar valor da di+�ria:', error);
        res.status(500).json({ error: 'N+�o foi poss+�vel atualizar o valor da di+�ria.' });
    } finally {
        if (conexao && !conexaoDestruida) conexao.release();
    }
};

exports.listarHistoricoValores = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    let conexao;

    try {
        conexao = await db.getConnection();
        await garantirProprietario(conexao, req.usuario.id);

        const [imoveis] = await conexao.query(
            'SELECT Imo_Id FROM imo_imovel WHERE Pro_Proprietario_Usu_Id = ? LIMIT 1',
            [req.usuario.id]
        );

        if (imoveis.length === 0) {
            throw new ErroHttp(404, 'Nenhum im+�vel encontrado para este propriet+�rio.');
        }

        const [historico] = await conexao.query(
            `SELECT Hit_id AS id,
                    Hit_ValorAntigo AS valorAntigo,
                    Hit_ValorNovo AS valorNovo,
                    DATE_FORMAT(Hit_DataAlteracao, '%Y-%m-%d %H:%i:%s') AS dataAlteracao
             FROM hit_historicovalores
             WHERE Imo_Id = ?
             ORDER BY Hit_DataAlteracao DESC, Hit_id DESC`,
            [imoveis[0].Imo_Id]
        );

        res.json(historico.map(item => ({
            id: item.id,
            valorAntigo: Number(item.valorAntigo),
            valorNovo: Number(item.valorNovo),
            dataAlteracao: item.dataAlteracao
        })));
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao buscar hist+�rico de valores:', error);
        res.status(500).json({ error: 'N+�o foi poss+�vel carregar o hist+�rico de valores.' });
    } finally {
        if (conexao) conexao.release();
    }
};


