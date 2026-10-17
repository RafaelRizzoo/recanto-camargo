function formatarDataBr(dataObj) {
    if (!dataObj) return '';
    const d = new Date(dataObj);
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeZone: 'America/Sao_Paulo'
    }).format(d);
}

async function processarLembretesPreCheckin({ db, emailService, notificacoes, logger = console } = {}) {
    if (!db) {
        throw new Error('Instância do banco de dados não fornecida para o serviço de lembretes.');
    }

    const query = `
        SELECT r.Res_Id, r.Res_DataCheckIn, r.Res_DataCheckOut, r.Res_QuantidadeDeHospedes, r.Res_ValorTotal,
               u.Usu_Id, u.Usu_Nome, u.Usu_Email,
               i.Imo_Nome
        FROM res_reserva r
        JOIN usu_usuario u ON r.Hos_Hospede_Usu_Id = u.Usu_Id
        LEFT JOIN imo_imovel i ON i.Imo_Id = r.Imo_Id
        WHERE r.Res_Status = 'CONFIRMADA'
          AND r.Res_DataCheckIn > NOW()
          AND r.Res_DataCheckIn <= DATE_ADD(NOW(), INTERVAL 48 HOUR)
          AND r.Res_Id NOT IN (
              SELECT h.Res_Id 
              FROM his_historicoreservastatus h 
              WHERE h.His_StatusAtual = 'LEMBRETE_CHECKIN'
          )
    `;

    const [reservas] = await db.query(query);
    const resultados = [];

    for (const reserva of reservas) {
        try {
            // 1. Registra no histórico para garantir que nunca seja enviado em duplicidade
            await db.query(`
                INSERT INTO his_historicoreservastatus 
                (Res_Id, His_DataAlteracao, His_StatusAnterior, His_StatusAtual, His_Motivo) 
                VALUES (?, NOW(), 'CONFIRMADA', 'LEMBRETE_CHECKIN', 'Lembrete automático pré-checkin 48h')
            `, [reserva.Res_Id]);

            const checkinFmt = formatarDataBr(reserva.Res_DataCheckIn);
            const checkoutFmt = formatarDataBr(reserva.Res_DataCheckOut);

            // 2. Notificação in-app (Sino do Painel)
            if (notificacoes?.criarNotificacao) {
                await notificacoes.criarNotificacao(
                    reserva.Usu_Id,
                    'Sua viagem está chegando!',
                    `Falta pouco para seu check-in no Recanto Camargo (${checkinFmt}). Confira as orientações de chegada no seu painel.`,
                    'INFO',
                    'bi-calendar-check'
                );
            }

            // 3. E-mail de Boas-Vindas e Instruções Pré-Check-in
            if (emailService) {
                const { enviarEmail, criarHtmlEmail } = emailService;
                const titulo = 'Sua Estadia Está Chegando — Recanto Camargo';
                const mensagem = `Falta pouco para o seu descanso no Recanto Camargo! Estamos preparando tudo com muito carinho para receber você em Aparecida.\n\nPara que sua chegada seja o mais agradável e tranquila possível, confira abaixo os dados da sua estadia e as orientações para o seu check-in.`;

                const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
                const htmlCorpo = criarHtmlEmail(titulo, mensagem, {
                    nome: reserva.Usu_Nome,
                    badge: '📅 Sua Viagem Está Chegando!',
                    badgeCorFundo: '#e6f4ea',
                    badgeCorTexto: '#137333',
                    detalhes: [
                        { rotulo: 'Reserva', valor: `#${reserva.Res_Id}` },
                        { rotulo: 'Unidade', valor: reserva.Imo_Nome || 'Recanto Camargo' },
                        { rotulo: 'Entrada (Check-in)', valor: `${checkinFmt} (a partir das 14h)` },
                        { rotulo: 'Saída (Check-out)', valor: `${checkoutFmt} (até às 11h)` },
                        { rotulo: 'Hóspedes', valor: `${reserva.Res_QuantidadeDeHospedes} pessoas` },
                        { rotulo: 'Horário de Silêncio', valor: 'Das 22h às 08h' }
                    ],
                    botaoTexto: 'Ver Minha Reserva',
                    botaoUrl: `${frontendUrl}/#/DashboardCliente`
                });

                await enviarEmail(
                    reserva.Usu_Email,
                    titulo,
                    htmlCorpo,
                    `lembrete-pre-checkin/${reserva.Res_Id}`
                );
            }

            resultados.push({ id: reserva.Res_Id, sucesso: true });
        } catch (erro) {
            logger.error(`Falha ao disparar lembrete para reserva #${reserva.Res_Id}:`, erro.message);
            resultados.push({ id: reserva.Res_Id, sucesso: false, erro: erro.message });
        }
    }

    return { total: reservas.length, resultados };
}

async function processarConvitesPosCheckoutAvaliacao({ db, emailService, notificacoes, logger = console } = {}) {
    if (!db) {
        throw new Error('Instância do banco de dados não fornecida para o serviço de convites de avaliação.');
    }

    const query = `
        SELECT r.Res_Id, r.Res_Status, r.Res_DataCheckIn, r.Res_DataCheckOut, r.Res_QuantidadeDeHospedes,
               u.Usu_Id, u.Usu_Nome, u.Usu_Email
        FROM res_reserva r
        JOIN usu_usuario u ON r.Hos_Hospede_Usu_Id = u.Usu_Id
        WHERE r.Res_Status IN ('CONFIRMADA', 'CONCLUIDA')
          AND r.Res_DataCheckOut <= DATE_SUB(NOW(), INTERVAL 24 HOUR)
          AND r.Res_DataCheckOut >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND r.Res_Id NOT IN (
              SELECT ava.Res_Id FROM ava_avaliacao ava WHERE ava.Res_Id IS NOT NULL
          )
          AND r.Res_Id NOT IN (
              SELECT h.Res_Id FROM his_historicoreservastatus h WHERE h.His_StatusAtual = 'CONVITE_AVALIACAO'
          )
    `;

    const [reservas] = await db.query(query);
    const resultados = [];

    for (const reserva of reservas) {
        try {
            // 1. Registra no histórico para garantir que nunca seja enviado em duplicidade
            await db.query(`
                INSERT INTO his_historicoreservastatus 
                (Res_Id, His_DataAlteracao, His_StatusAnterior, His_StatusAtual, His_Motivo) 
                VALUES (?, NOW(), ?, 'CONVITE_AVALIACAO', 'Convite automático pós-checkout para avaliação')
            `, [reserva.Res_Id, reserva.Res_Status]);

            const checkinFmt = formatarDataBr(reserva.Res_DataCheckIn);
            const checkoutFmt = formatarDataBr(reserva.Res_DataCheckOut);

            // 2. Notificação in-app (Sino do Painel)
            if (notificacoes?.criarNotificacao) {
                await notificacoes.criarNotificacao(
                    reserva.Usu_Id,
                    'Como foi sua experiência no Recanto Camargo?',
                    `Conte-nos como foi sua estadia finalizada em ${checkoutFmt} avaliando com estrelas e comentários!`,
                    'INFO',
                    'bi-star'
                );
            }

            // 3. E-mail de Convite para Avaliação
            if (emailService) {
                const { enviarEmail, criarHtmlEmail } = emailService;
                const titulo = 'Como foi sua experiência no Recanto Camargo? ⭐';
                const mensagem = `Esperamos que seus dias de descanso no Recanto Camargo tenham sido especiais e revigorantes!\n\nSua opinião é fundamental para continuarmos aprimorando cada detalhe da nossa casa em Aparecida. Poderia nos contar como foi sua estadia? Leva menos de 1 minuto!`;

                const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
                const htmlCorpo = criarHtmlEmail(titulo, mensagem, {
                    nome: reserva.Usu_Nome,
                    badge: '⭐ Sua Avaliação é Muito Importante',
                    badgeCorFundo: '#fef7e0',
                    badgeCorTexto: '#b06000',
                    detalhes: [
                        { rotulo: 'Reserva', valor: `#${reserva.Res_Id}` },
                        { rotulo: 'Entrada (Check-in)', valor: checkinFmt },
                        { rotulo: 'Saída (Check-out)', valor: checkoutFmt },
                        { rotulo: 'Hóspedes', valor: `${reserva.Res_QuantidadeDeHospedes} pessoas` },
                        { rotulo: 'Destino', valor: 'Chalé Recanto Camargo — Aparecida, SP' }
                    ],
                    botaoTexto: 'Avaliar Minha Estadia ⭐',
                    botaoUrl: `${frontendUrl}/#/DashboardCliente`
                });

                await enviarEmail(
                    reserva.Usu_Email,
                    titulo,
                    htmlCorpo,
                    `convite-avaliacao/${reserva.Res_Id}`
                );
            }

            resultados.push({ id: reserva.Res_Id, sucesso: true });
        } catch (erro) {
            logger.error(`Falha ao disparar convite de avaliação para reserva #${reserva.Res_Id}:`, erro.message);
            resultados.push({ id: reserva.Res_Id, sucesso: false, erro: erro.message });
        }
    }

    return { total: reservas.length, resultados };
}

module.exports = {
    processarLembretesPreCheckin,
    processarConvitesPosCheckoutAvaliacao,
    formatarDataBr
};
