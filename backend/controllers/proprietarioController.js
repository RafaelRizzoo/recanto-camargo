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
                'SELECT Imo_Id, Pro_Proprietario_Usu_Id FROM imo_imovel WHERE Imo_Id = ? FOR UPDATE',
                [referencias[0].Imo_Id]
            );
            if (imoveis.length === 0 || Number(imoveis[0].Pro_Proprietario_Usu_Id) !== Number(req.usuario.id)) {
                throw new ErroHttp(403, 'Você não pode decidir reservas de outro proprietário.');
            }

            const [reservas] = await conexao.query(
                `SELECT Res_Status, Hos_Hospede_Usu_Id,
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


            const aprovada = novoStatus === 'CONFIRMADA';
            const titulo = aprovada ? 'Reserva Aprovada' : 'Reserva Recusada';
            const mensagem = `Sua reserva #${reservaId}, de ${reserva.checkin} a ${reserva.checkout}, foi ${aprovada ? 'aprovada' : 'recusada'} pelo proprietário.${motivo ? ` Motivo: ${motivo}` : ''}`;
            const notificacoes = req.app.get('notificacoes');
            await notificacoes.criarNotificacao(
                reserva.Hos_Hospede_Usu_Id, titulo, mensagem,
                aprovada ? 'SUCESSO' : 'AVISO',
                aprovada ? 'bi-calendar-check' : 'bi-exclamation-circle', conexao
            );
            const [hospedes] = await conexao.query(
                'SELECT Usu_Email FROM usu_usuario WHERE Usu_Id = ?',
                [reserva.Hos_Hospede_Usu_Id]
            );
            await conexao.commit();
            transacaoAtiva = false;
            conexao.release();
            conexao = null;

            res.json({ message: `${titulo} com sucesso.`, reservaId, status: novoStatus });
            if (hospedes[0]?.Usu_Email) {
                const { enviarEmail, criarHtmlEmail } = req.app.get('emailService');
                void Promise.resolve().then(() => enviarEmail(
                    hospedes[0].Usu_Email, titulo, criarHtmlEmail(titulo, mensagem),
                    `reserva/${reservaId}/${aprovada ? 'confirmada' : 'recusada'}/hospede`
                )).catch(() => console.error('Falha ao processar email da decisão da reserva já salva.'));
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
            console.error('Erro ao decidir reserva.');
            res.status(500).json({ error: 'Não foi possível salvar a decisão da reserva.' });
        } finally {
            if (conexao && !conexaoDestruida) conexao.release();
        }
    };
}

exports.aprovarReserva = decidirReserva('CONFIRMADA');
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
                r.Res_QuantidadeDeHospedes as quantidadeHospedes,
                r.Res_DataCheckIn as checkin,
                r.Res_DataCheckOut as checkout,
                r.Res_ValorTotal as total,
                r.Res_Status as status,
                r.Res_DataReserva as criadaEm,
                (SELECT His_Motivo FROM his_historicoreservastatus hhs WHERE hhs.Res_Id = r.Res_Id ORDER BY hhs.His_DataAlteracao DESC LIMIT 1) as motivo
            FROM res_reserva r
            JOIN imo_imovel i ON r.Imo_Id = i.Imo_Id
            JOIN hos_hospede h ON r.Hos_Hospede_Usu_Id = h.Usu_Id
            JOIN usu_usuario u ON h.Usu_Id = u.Usu_Id
            WHERE i.Pro_Proprietario_Usu_Id = ?
            ORDER BY r.Res_DataCheckIn ASC
        `;
        const [reservas] = await db.query(query, [proprietarioId]);

        const statusMap = {
            'PENDENTE': 'pendente',
            'CONFIRMADA': 'aprovada',
            'CANCELADA': 'cancelada',
            'RECUSADA': 'recusada',
            'CONCLUIDA': 'concluida'
        };

        const reservasFormatadas = reservas.map(r => ({
            ...r,
            id: r.id.toString(),
            hospede: r.hospede,
            hospedes: r.quantidadeHospedes,
            checkin: r.checkin.toISOString().split('T')[0],
            checkout: r.checkout.toISOString().split('T')[0],
            criadaEm: r.criadaEm.toISOString().split('T')[0],
            total: Number(r.total),
            status: statusMap[r.status] || 'pendente'
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
        const comentario = normalizarComentario(req.body?.comentario, true);
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
