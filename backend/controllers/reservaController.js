const db = require('../config/db');
const { ErroHttp } = require('../middlewares/errorHandler');
const {
    garantirHospede,
    buscarCupomPorIdComLock,
    validarRegrasCupom
} = require('../services/helpers');
const { processarLembretesPreCheckin, processarConvitesPosCheckoutAvaliacao } = require('../services/lembreteService');
const { processarCancelamentoReservasAbandonadas } = require('../services/housekeepingService');

exports.checarDisponibilidade = async (req, res) => {
    try {
        const { checkin, checkout } = req.query;
        if (!checkin || !checkout) {
            return res.status(400).json({ error: 'Forneça checkin e checkout.' });
        }

        const checkinStr = String(checkin).split(' ')[0].split('T')[0];
        const checkoutStr = String(checkout).split(' ')[0].split('T')[0];

        if (!/^\d{4}-\d{2}-\d{2}$/.test(checkinStr) || !/^\d{4}-\d{2}-\d{2}$/.test(checkoutStr)) {
            return res.status(400).json({ error: 'Formato de data inválido. Use AAAA-MM-DD.' });
        }

        if (checkoutStr <= checkinStr) {
            return res.status(400).json({ error: 'A data de checkout deve ser maior que o check-in.' });
        }

        const checkinComHora = `${checkinStr} 14:00:00`;
        const checkoutComHora = `${checkoutStr} 11:00:00`;

        const imoId = 1;
        const queryConflito = `
            SELECT Res_Id FROM res_reserva 
            WHERE Imo_Id = ? 
            AND Res_Status IN ('CONFIRMADA', 'PENDENTE', 'PAGAMENTO_PENDENTE')
            AND (Res_DataCheckIn < ?) 
            AND (Res_DataCheckOut > ?)
        `;
        const valoresConflito = [imoId, checkoutComHora, checkinComHora];
        const [reservasConflitantes] = await db.query(queryConflito, valoresConflito);

        if (reservasConflitantes.length > 0) {
            return res.json({ disponivel: false, motivo: 'As datas selecionadas estão indisponíveis.' });
        }

        // Verifica bloqueios manuais do proprietário (comparação de diárias estritas: checkin às 14h, checkout às 11h)
        const [bloqueios] = await db.query(
            `SELECT Bld_Id FROM bld_bloqueiodata
             WHERE Imo_Id = ? AND Bld_Status = 'ATIVO' AND Bld_Data >= DATE(?) AND Bld_Data < DATE(?)`,
            [imoId, checkinStr, checkoutStr]
        );

        if (bloqueios.length > 0) {
            return res.json({ disponivel: false, motivo: 'As datas selecionadas estão indisponíveis.' });
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
            AND Res_Status IN ('CONFIRMADA', 'PENDENTE', 'PAGAMENTO_PENDENTE')
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

        const checkinStr = String(checkin).split(' ')[0].split('T')[0];
        const checkoutStr = String(checkout).split(' ')[0].split('T')[0];

        if (!/^\d{4}-\d{2}-\d{2}$/.test(checkinStr) || !/^\d{4}-\d{2}-\d{2}$/.test(checkoutStr)) {
            conexao.release();
            return res.status(400).json({ error: 'Formato de data inválido. Use AAAA-MM-DD.' });
        }

        const checkinComHora = `${checkinStr} 14:00:00`;
        const checkoutComHora = `${checkoutStr} 11:00:00`;

        const dataCheckin = new Date(checkinStr + 'T12:00:00Z');
        const dataCheckout = new Date(checkoutStr + 'T12:00:00Z');
        const hojeStr = new Date().toISOString().slice(0, 10);

        if (checkinStr < hojeStr) {
            conexao.release();
            return res.status(400).json({ error: 'Você não pode reservar uma data no passado.' });
        }
        if (checkoutStr <= checkinStr) {
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
            AND Res_Status IN ('CONFIRMADA', 'PENDENTE', 'PAGAMENTO_PENDENTE')
            AND (Res_DataCheckIn < ?) 
            AND (Res_DataCheckOut > ?)
        `;
        const valoresConflito = [imoId, checkoutComHora, checkinComHora];
        const [reservasConflitantes] = await conexao.query(queryConflito, valoresConflito);

        if (reservasConflitantes.length > 0) {
            await conexao.rollback();
            conexao.release();
            return res.status(409).json({ error: 'As datas selecionadas estão indisponíveis.' });
        }

        // Verifica bloqueios manuais do proprietário (comparação de diárias estritas: checkin às 14h, checkout às 11h)
        const [bloqueiosConflitantes] = await conexao.query(
            `SELECT Bld_Id FROM bld_bloqueiodata
             WHERE Imo_Id = ? AND Bld_Status = 'ATIVO' AND Bld_Data >= DATE(?) AND Bld_Data < DATE(?)`,
            [imoId, checkinStr, checkoutStr]
        );

        if (bloqueiosConflitantes.length > 0) {
            await conexao.rollback();
            conexao.release();
            return res.status(409).json({ error: 'As datas selecionadas estão indisponíveis.' });
        }

        // Verifica se o hóspede possui restrição/bloqueio com o proprietário
        const [hospedeBloqueado] = await conexao.query(
            `SELECT Blo_Id FROM blo_bloqueiohospede
             WHERE Imo_Id = ? AND Usu_Id = ?`,
            [imoId, hospedeId]
        );

        if (hospedeBloqueado.length > 0) {
            await conexao.rollback();
            conexao.release();
            return res.status(403).json({ error: 'Você possui restrição de reserva com o proprietário deste imóvel.' });
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
        const valoresInsert = [cupomAplicadoId, imoId, hospedeId, checkinComHora, checkoutComHora, hospedes, valorFinalSeguro, observacoes || null];
        const [resultado] = await conexao.query(queryInsert, valoresInsert);
        const reservaCriadaId = resultado.insertId;

        await conexao.query(`
            INSERT INTO his_historicoreservastatus 
            (Res_Id, His_DataAlteracao, His_StatusAnterior, His_StatusAtual, His_Motivo) 
            VALUES (?, NOW(), 'CRIACAO', 'PENDENTE', NULL)
        `, [reservaCriadaId]);

        const [destinatarios] = await conexao.query(
            `SELECT p.Usu_Id AS proprietarioId, proprietario.Usu_Nome AS proprietarioNome, proprietario.Usu_Email AS proprietarioEmail,
                    hospede.Usu_Nome AS hospedeNome, hospede.Usu_Email AS hospedeEmail,
                    i.Imo_Nome AS imovelNome
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
        const checkinFmt = formatoData.format(dataCheckin);
        const checkoutFmt = formatoData.format(dataCheckout);
        const periodo = `${checkinFmt} a ${checkoutFmt}`;
        const imovelNome = destinatario.imovelNome || 'Recanto Camargo';
        const valorTotalFmt = `R$ ${Number(valorFinalSeguro).toFixed(2).replace('.', ',')}`;

        const tituloHospede = 'Reserva Recebida — Aguardando Aprovação';
        const mensagemHospede = `Sua reserva #${resultado.insertId}, de ${periodo}, foi recebida e aguarda aprovação do proprietário. Acompanhe pelo seu painel.`;
        const tituloProprietario = `Nova reserva — ${destinatario.hospedeNome}`;
        const mensagemProprietario = `A reserva #${resultado.insertId}, de ${periodo}, foi solicitada por ${destinatario.hospedeNome} e aguarda sua aprovação ou recusa.`;

        const notificacoes = req.app.get('notificacoes');
        await notificacoes.criarNotificacao(hospedeId, tituloHospede, mensagemHospede, 'INFO', 'bi-info-circle', conexao);
        await notificacoes.criarNotificacao(destinatario.proprietarioId, 'Nova reserva', mensagemProprietario, 'INFO', 'bi-calendar-plus', conexao);
        
        await conexao.commit();
        conexao.release();

        res.status(201).json({ message: 'Reserva criada com sucesso no MySQL!', reservaId: resultado.insertId });

        const { enviarEmail, criarHtmlEmail } = req.app.get('emailService');
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

        const opcoesEmailHospede = {
            nome: destinatario.hospedeNome,
            badge: '⏱ Aguardando Confirmação',
            badgeCorFundo: '#fef7e0',
            badgeCorTexto: '#b06000',
            detalhes: [
                { rotulo: 'Reserva', valor: `#${resultado.insertId}` },
                { rotulo: 'Unidade', valor: imovelNome },
                { rotulo: 'Entrada (Check-in)', valor: `${checkinFmt} (a partir das 14h)` },
                { rotulo: 'Saída (Check-out)', valor: `${checkoutFmt} (até às 11h)` },
                { rotulo: 'Duração', valor: `${quantidadeNoites} ${quantidadeNoites === 1 ? 'diária' : 'diárias'}` },
                { rotulo: 'Hóspedes', valor: `${hospedes} ${Number(hospedes) === 1 ? 'pessoa' : 'pessoas'}` },
                { rotulo: 'Valor Total', valor: valorTotalFmt }
            ],
            botaoTexto: 'Acessar Meu Painel',
            botaoUrl: `${frontendUrl}/#/DashboardCliente`
        };

        const opcoesEmailProprietario = {
            nome: destinatario.proprietarioNome,
            badge: '🔔 Nova Solicitação de Reserva',
            badgeCorFundo: '#e8f0fe',
            badgeCorTexto: '#1a73e8',
            detalhes: [
                { rotulo: 'Reserva', valor: `#${resultado.insertId}` },
                { rotulo: 'Hóspede', valor: `${destinatario.hospedeNome} (${destinatario.hospedeEmail})` },
                { rotulo: 'Unidade', valor: imovelNome },
                { rotulo: 'Entrada (Check-in)', valor: `${checkinFmt} (a partir das 14h)` },
                { rotulo: 'Saída (Check-out)', valor: `${checkoutFmt} (até às 11h)` },
                { rotulo: 'Duração', valor: `${quantidadeNoites} ${quantidadeNoites === 1 ? 'diária' : 'diárias'}` },
                { rotulo: 'Hóspedes', valor: `${hospedes} ${Number(hospedes) === 1 ? 'pessoa' : 'pessoas'}` },
                { rotulo: 'Valor Total', valor: valorTotalFmt }
            ],
            botaoTexto: 'Avaliar Solicitação',
            botaoUrl: `${frontendUrl}/#/DashboardAdministrador`
        };

        const corpoHtmlHospede = criarHtmlEmail(
            tituloHospede,
            `Sua solicitação de reserva #${resultado.insertId} para a unidade "${imovelNome}" foi recebida com sucesso e aguarda aprovação do proprietário. Confira os dados da sua estadia abaixo e acompanhe pelo seu painel.`,
            opcoesEmailHospede
        );

        const corpoHtmlProprietario = criarHtmlEmail(
            tituloProprietario,
            `O hóspede ${destinatario.hospedeNome} (${destinatario.hospedeEmail}) enviou uma solicitação de reserva para a unidade "${imovelNome}". Confira os detalhes abaixo e acesse seu painel para aprovar ou recusar.`,
            opcoesEmailProprietario
        );

        void Promise.resolve().then(async () => {
            await Promise.all([
                enviarEmail(destinatario.hospedeEmail, tituloHospede, corpoHtmlHospede, `reserva/${resultado.insertId}/pendente/hospede`),
                enviarEmail(destinatario.proprietarioEmail, tituloProprietario, corpoHtmlProprietario, `reserva/${resultado.insertId}/pendente/proprietario`)
            ]);
        }).catch(() => console.error('Falha ao processar emails da reserva já salva.'));
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

exports.dispararLembretesCheckin = async (req, res) => {
    try {
        const emailService = req.app.get('emailService');
        const notificacoes = req.app.get('notificacoes');
        const resultado = await processarLembretesPreCheckin({ db, emailService, notificacoes });
        res.json({
            message: 'Lembretes pré-checkin processados com sucesso.',
            totalProcessadas: resultado.total,
            detalhes: resultado.resultados
        });
    } catch (error) {
        console.error('Erro ao disparar lembretes pré-checkin:', error);
        res.status(500).json({ error: 'Erro interno ao disparar lembretes de check-in.' });
    }
};

exports.dispararConvitesAvaliacao = async (req, res) => {
    try {
        const emailService = req.app.get('emailService');
        const notificacoes = req.app.get('notificacoes');
        const resultado = await processarConvitesPosCheckoutAvaliacao({ db, emailService, notificacoes });
        res.json({
            message: 'Convites de avaliação pós-checkout processados com sucesso.',
            totalProcessadas: resultado.total,
            detalhes: resultado.resultados
        });
    } catch (error) {
        console.error('Erro ao disparar convites de avaliação:', error);
        res.status(500).json({ error: 'Erro interno ao disparar convites de avaliação.' });
    }
};

exports.executarHousekeeping = async (req, res) => {
    try {
        const emailService = req.app.get('emailService');
        const notificacoes = req.app.get('notificacoes');
        const resultado = await processarCancelamentoReservasAbandonadas({ db, emailService, notificacoes });
        res.json({
            message: 'Rotina de housekeeping executada com sucesso.',
            totalCanceladas: resultado.total,
            detalhes: resultado.resultados
        });
    } catch (error) {
        console.error('Erro na rotina de housekeeping:', error);
        res.status(500).json({ error: 'Erro interno ao executar housekeeping de reservas.' });
    }
};

