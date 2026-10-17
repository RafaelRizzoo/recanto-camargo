const { formatarDataBr } = require('./lembreteService');

async function processarCancelamentoReservasAbandonadas({ db, emailService, notificacoes, logger = console } = {}) {
    if (!db) {
        throw new Error('Instância do banco de dados não fornecida para o serviço de housekeeping.');
    }

    const query = `
        SELECT r.Res_Id, r.Res_Status, r.Res_DataCheckIn, r.Res_DataCheckOut, r.Res_DataReserva,
               u.Usu_Id, u.Usu_Nome, u.Usu_Email,
               i.Imo_Nome,
               COALESCE(
                   (SELECT MAX(h.His_DataAlteracao) 
                    FROM his_historicoreservastatus h 
                    WHERE h.Res_Id = r.Res_Id AND h.His_StatusAtual = 'PAGAMENTO_PENDENTE'),
                   r.Res_DataReserva
               ) AS dataUltimaTransicao
        FROM res_reserva r
        JOIN usu_usuario u ON r.Hos_Hospede_Usu_Id = u.Usu_Id
        LEFT JOIN imo_imovel i ON i.Imo_Id = r.Imo_Id
        WHERE (
            (r.Res_Status = 'PAGAMENTO_PENDENTE' AND (
                COALESCE(
                    (SELECT MAX(h.His_DataAlteracao) 
                     FROM his_historicoreservastatus h 
                     WHERE h.Res_Id = r.Res_Id AND h.His_StatusAtual = 'PAGAMENTO_PENDENTE'),
                    r.Res_DataReserva
                ) <= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                OR r.Res_DataCheckIn <= NOW()
            ))
            OR
            (r.Res_Status = 'PENDENTE' AND (
                r.Res_DataReserva <= DATE_SUB(NOW(), INTERVAL 48 HOUR)
                OR r.Res_DataCheckIn <= NOW()
            ))
        )
        LIMIT 50
    `;

    const [expiradas] = await db.query(query);
    const resultados = [];

    for (const reserva of expiradas) {
        let conexao = null;
        let usarTransacao = typeof db.getConnection === 'function';

        try {
            if (usarTransacao) {
                conexao = await db.getConnection();
                await conexao.beginTransaction();
            }
            const executor = conexao || db;

            // 1. Atualiza status para CANCELADA
            await executor.query(
                'UPDATE res_reserva SET Res_Status = "CANCELADA" WHERE Res_Id = ? AND Res_Status = ?',
                [reserva.Res_Id, reserva.Res_Status]
            );

            // 2. Registra na auditoria (his_historicoreservastatus)
            const motivo = reserva.Res_Status === 'PAGAMENTO_PENDENTE'
                ? 'Cancelamento automático: prazo de pagamento expirado (24h)'
                : 'Cancelamento automático: solicitação expirada sem resposta (48h)';

            await executor.query(`
                INSERT INTO his_historicoreservastatus 
                (Res_Id, His_DataAlteracao, His_StatusAnterior, His_StatusAtual, His_Motivo) 
                VALUES (?, NOW(), ?, 'CANCELADA', ?)
            `, [reserva.Res_Id, reserva.Res_Status, motivo]);

            const checkinFmt = formatarDataBr(reserva.Res_DataCheckIn);
            const checkoutFmt = formatarDataBr(reserva.Res_DataCheckOut);

            // 3. Notificação in-app (Sino do Painel)
            if (notificacoes?.criarNotificacao) {
                const tituloNotif = 'Reserva Expirada — Datas Liberadas';
                const msgNotif = reserva.Res_Status === 'PAGAMENTO_PENDENTE'
                    ? `Sua pré-reserva #${reserva.Res_Id} (${checkinFmt} a ${checkoutFmt}) expirou após 24h sem pagamento. As datas foram liberadas no calendário.`
                    : `Sua solicitação de reserva #${reserva.Res_Id} (${checkinFmt} a ${checkoutFmt}) expirou. As datas foram reabertas no calendário.`;

                await notificacoes.criarNotificacao(
                    reserva.Usu_Id,
                    tituloNotif,
                    msgNotif,
                    'AVISO',
                    'bi-clock-history',
                    conexao
                );
            }

            if (usarTransacao && conexao) {
                await conexao.commit();
            }

            // 4. E-mail informativo ao cliente
            if (emailService) {
                const { enviarEmail, criarHtmlEmail } = emailService;
                const tituloEmail = 'Sua Pré-Reserva Expirou — Recanto Camargo';
                const msgEmail = reserva.Res_Status === 'PAGAMENTO_PENDENTE'
                    ? `O prazo de 24 horas para efetuar o pagamento da sua pré-reserva #${reserva.Res_Id} se encerrou, e as datas selecionadas voltaram a ficar disponíveis no nosso calendário para novos hóspedes.\n\nSe você ainda deseja se hospedar no Recanto Camargo, sinta-se à vontade para realizar uma nova solicitação no nosso site quando preferir!`
                    : `Sua solicitação de reserva #${reserva.Res_Id} expirou sem confirmação, e as datas foram reabertas no calendário.\n\nCaso ainda tenha interesse em descansar conosco em Aparecida, convidamos você a escolher um novo período disponível no nosso site!`;

                const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
                const htmlCorpo = criarHtmlEmail(tituloEmail, msgEmail, {
                    nome: reserva.Usu_Nome,
                    badge: '● Prazo Expirado',
                    badgeCorFundo: '#fce8e6',
                    badgeCorTexto: '#c5221f',
                    detalhes: [
                        { rotulo: 'Reserva', valor: `#${reserva.Res_Id}` },
                        { rotulo: 'Unidade', valor: reserva.Imo_Nome || 'Recanto Camargo' },
                        { rotulo: 'Período', valor: `${checkinFmt} a ${checkoutFmt}` },
                        { rotulo: 'Status Anterior', valor: reserva.Res_Status === 'PAGAMENTO_PENDENTE' ? 'Pagamento Pendente' : 'Pendente' },
                        { rotulo: 'Ação Realizada', valor: 'Cancelada automaticamente por tempo limite' },
                        { rotulo: 'Calendário', valor: 'Datas liberadas para locação' }
                    ],
                    botaoTexto: 'Ver Calendário Disponível',
                    botaoUrl: `${frontendUrl}/#/`
                });

                await enviarEmail(
                    reserva.Usu_Email,
                    tituloEmail,
                    htmlCorpo,
                    `housekeeping/expirada/${reserva.Res_Id}`
                );
            }

            logger.info?.(`[Housekeeping] Reserva #${reserva.Res_Id} cancelada por expiração (${reserva.Res_Status}). Datas liberadas.`);
            resultados.push({ id: reserva.Res_Id, sucesso: true });
        } catch (erro) {
            if (usarTransacao && conexao) {
                await conexao.rollback().catch(() => {});
            }
            logger.error(`Falha no housekeeping da reserva #${reserva.Res_Id}:`, erro.message);
            resultados.push({ id: reserva.Res_Id, sucesso: false, erro: erro.message });
        } finally {
            if (usarTransacao && conexao) {
                conexao.release();
            }
        }
    }

    return { total: expiradas.length, resultados };
}

module.exports = {
    processarCancelamentoReservasAbandonadas
};
