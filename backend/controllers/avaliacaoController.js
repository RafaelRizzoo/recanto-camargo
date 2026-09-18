const db = require('../config/db');
const { ErroHttp } = require('../middlewares/errorHandler');
const {
    normalizarIdPositivo,
    normalizarNota,
    normalizarComentario,
    normalizarAvaliacao,
    garantirHospede,
    garantirProprietario
} = require('../services/helpers');

exports.criarAvaliacao = async (req, res) => {
    let conexao;
    let transacaoAtiva = false;
    let conexaoDestruida = false;

    try {
        const reservaId = normalizarIdPositivo(req.body?.reservaId, 'Identificador da reserva');
        const nota = normalizarNota(req.body?.nota);
        const comentario = normalizarComentario(req.body?.comentario);
        const hospedeId = req.usuario.id;

        conexao = await db.getConnection();
        await conexao.beginTransaction();
        transacaoAtiva = true;

        await garantirHospede(conexao, hospedeId, true);

        const [reservas] = await conexao.query(
            `SELECT Res_Id, Imo_Id, Hos_Hospede_Usu_Id, Res_Status
             FROM res_reserva
             WHERE Res_Id = ?
             FOR UPDATE`,
            [reservaId]
        );

        if (reservas.length === 0) {
            throw new ErroHttp(404, 'Reserva não encontrada.');
        }

        const reserva = reservas[0];
        if (Number(reserva.Hos_Hospede_Usu_Id) !== Number(hospedeId)) {
            throw new ErroHttp(403, 'Você não pode avaliar uma reserva de outro hóspede.');
        }
        if (reserva.Res_Status !== 'CONCLUIDA') {
            throw new ErroHttp(400, 'A reserva precisa estar concluída antes de ser avaliada.');
        }

        const [imoveis] = await conexao.query(
            'SELECT Imo_Id FROM imo_imovel WHERE Imo_Id = ? FOR UPDATE',
            [reserva.Imo_Id]
        );
        if (imoveis.length === 0) {
            throw new ErroHttp(404, 'Imóvel da reserva não encontrado.');
        }

        const [avaliacoesExistentes] = await conexao.query(
            'SELECT Ava_Id FROM ava_avaliacao WHERE Res_Id = ? LIMIT 1',
            [reservaId]
        );
        if (avaliacoesExistentes.length > 0) {
            throw new ErroHttp(409, 'Esta reserva já foi avaliada.');
        }

        const [resultado] = await conexao.query(
            `INSERT INTO ava_avaliacao
             (Imo_Id, Res_Id, Usu_Hos_Id, Ava_Nota, Ava_Comentario, Ava_Data)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [reserva.Imo_Id, reservaId, hospedeId, nota, comentario]
        );

        await conexao.query(
            `UPDATE imo_imovel
             SET Imo_NotaMedial = (
                 SELECT ROUND(AVG(Ava_Nota), 1)
                 FROM ava_avaliacao
                 WHERE Imo_Id = ?
             )
             WHERE Imo_Id = ?`,
            [reserva.Imo_Id, reserva.Imo_Id]
        );

        const [avaliacoesCriadas] = await conexao.query(
            `SELECT
                Ava_Id AS id,
                Ava_Nota AS nota,
                Ava_Comentario AS comentario,
                DATE_FORMAT(Ava_Data, '%Y-%m-%d') AS data,
                Ava_NotaPropietario AS respostaNota,
                Ava_ComentarioPropietario AS respostaComentario,
                DATE_FORMAT(Ava_DataPropietario, '%Y-%m-%d') AS respostaData
             FROM ava_avaliacao
             WHERE Ava_Id = ?`,
            [resultado.insertId]
        );

        const [destinatariosProprietario] = await conexao.query(
            `SELECT p.Usu_Id AS proprietarioId, u.Usu_Email AS proprietarioEmail
             FROM imo_imovel i
             INNER JOIN pro_proprietario p ON p.Usu_Id = i.Pro_Proprietario_Usu_Id
             INNER JOIN usu_usuario u ON u.Usu_Id = p.Usu_Id
             WHERE i.Imo_Id = ?`,
            [reserva.Imo_Id]
        );

        if (destinatariosProprietario.length > 0) {
            const proprietario = destinatariosProprietario[0];
            const tituloAviso = 'Nova Avaliação Recebida';
            const mensagemAviso = `Seu imóvel recebeu uma nova avaliação de ${nota.toFixed(1)} estrelas.${comentario ? ` Comentário: "${comentario}"` : ''}`;
            const notificacoes = req.app.get('notificacoes');
            await notificacoes.criarNotificacao(
                proprietario.proprietarioId, tituloAviso, mensagemAviso,
                'INFO', 'bi-info-circle', conexao
            );
        }

        await conexao.commit();
        transacaoAtiva = false;

        res.status(201).json({
            message: 'Avaliação enviada com sucesso.',
            avaliacao: normalizarAvaliacao(avaliacoesCriadas[0])
        });

        if (destinatariosProprietario[0]?.proprietarioEmail) {
            const { enviarEmail, criarHtmlEmail } = req.app.get('emailService');
            void Promise.resolve().then(() => enviarEmail(
                destinatariosProprietario[0].proprietarioEmail,
                'Nova Avaliação Recebida',
                criarHtmlEmail('Nova Avaliação Recebida', `Seu imóvel recebeu uma nova avaliação de ${nota.toFixed(1)} estrelas.`),
                `avaliacao/${resultado.insertId}/notificacao/proprietario`
            )).catch(() => console.error('Falha ao processar email de avaliação já salva.'));
        }
    } catch (error) {
        if (transacaoAtiva && conexao) {
            try {
                await conexao.rollback();
            } catch (rollbackError) {
                console.error('Erro ao desfazer a transação da avaliação:', rollbackError);
                conexao.destroy();
                conexaoDestruida = true;
            }
        }

        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Esta reserva já foi avaliada.' });
        }

        console.error('Erro ao criar avaliação:', error);
        res.status(500).json({ error: 'Erro interno ao criar avaliação.' });
    } finally {
        if (conexao && !conexaoDestruida) conexao.release();
    }
};

exports.listarPublicas = async (req, res) => {
    try {
        const imovelId = normalizarIdPositivo(req.params.imoId, 'Identificador do imóvel');
        const [avaliacoes] = await db.query(
            `SELECT
                a.Ava_Id AS id,
                a.Ava_Nota AS nota,
                a.Ava_Comentario AS comentario,
                DATE_FORMAT(a.Ava_Data, '%Y-%m-%d') AS data,
                NULL AS respostaNota,
                a.Ava_ComentarioPropietario AS respostaComentario,
                DATE_FORMAT(a.Ava_DataPropietario, '%Y-%m-%d') AS respostaData
             FROM ava_avaliacao a
             INNER JOIN res_reserva r
                ON r.Res_Id = a.Res_Id
                AND r.Imo_Id = a.Imo_Id
                AND r.Hos_Hospede_Usu_Id = a.Usu_Hos_Id
             WHERE a.Imo_Id = ? AND r.Res_Status = ?
             ORDER BY a.Ava_Data DESC, a.Ava_Id DESC`,
            [imovelId, 'CONCLUIDA']
        );

        res.json(avaliacoes.map(avaliacao => normalizarAvaliacao(avaliacao, false)));
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao buscar avaliações públicas:', error);
        res.status(500).json({ error: 'Erro interno ao buscar avaliações.' });
    }
};
