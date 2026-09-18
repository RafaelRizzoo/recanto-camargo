const db = require('../config/db');
const { ErroHttp } = require('../middlewares/errorHandler');
const {
    conciliarReservasConcluidas,
    normalizarAvaliacao
} = require('../services/helpers');

exports.cancelarReserva = async (req, res) => {
    const conexao = await db.getConnection();
    try {
        const hospedeId = req.usuario.id;
        const reservaId = req.params.id;
        const { motivo } = req.body;

        await conexao.beginTransaction();

        const [reservas] = await conexao.query(`
            SELECT Res_Status, Imo_Id 
            FROM res_reserva 
            WHERE Res_Id = ? AND Hos_Hospede_Usu_Id = ? FOR UPDATE
        `, [reservaId, hospedeId]);

        if (reservas.length === 0) {
            conexao.release();
            return res.status(404).json({ error: 'Reserva não encontrada ou não pertence a você.' });
        }

        const statusAtual = reservas[0].Res_Status;
        if (statusAtual === 'CANCELADA' || statusAtual === 'RECUSADA' || statusAtual === 'CONCLUIDA') {
            conexao.release();
            return res.status(400).json({ error: `Não é possível cancelar uma reserva que já está ${statusAtual}.` });
        }

        await conexao.query(`
            UPDATE res_reserva 
            SET Res_Status = 'CANCELADA' 
            WHERE Res_Id = ?
        `, [reservaId]);

        await conexao.query(`
            INSERT INTO his_historicoreservastatus 
            (Res_Id, His_DataAlteracao, His_StatusAnterior, His_StatusAtual, His_Motivo) 
            VALUES (?, NOW(), ?, 'CANCELADA', ?)
        `, [reservaId, statusAtual, motivo || 'Não informado.']);

        const [imoveis] = await conexao.query(`
            SELECT Pro_Proprietario_Usu_Id 
            FROM imo_imovel 
            WHERE Imo_Id = ?
        `, [reservas[0].Imo_Id]);

        if (imoveis.length > 0) {
            const proprietarioId = imoveis[0].Pro_Proprietario_Usu_Id;
            const notificacoes = req.app.get('notificacoes');
            await notificacoes.criarNotificacao(
                proprietarioId, 
                'Reserva Cancelada', 
                `O hóspede cancelou a reserva #${reservaId}. Motivo: ${motivo || 'Não informado.'}`, 
                'AVISO', 
                'bi-exclamation-circle', 
                conexao
            );
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
            LEFT JOIN ava_avaliacao a
                ON a.Res_Id = r.Res_Id
                AND a.Imo_Id = r.Imo_Id
                AND a.Usu_Hos_Id = r.Hos_Hospede_Usu_Id
            WHERE r.Hos_Hospede_Usu_Id = ?
            ORDER BY r.Res_DataCheckIn DESC
        `;
        
        const [reservas] = await db.query(query, [hospedeId]);
        
        const statusMap = {
            'PENDENTE': 'pendente',
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
                avaliacao: avaliacaoId === null ? null : normalizarAvaliacao({
                    id: avaliacaoId,
                    nota: avaliacaoNota,
                    comentario: avaliacaoComentario,
                    data: avaliacaoData,
                    respostaNota,
                    respostaComentario,
                    respostaData
                })
            };
        });

        res.json(reservasFormatadas);
    } catch (error) {
        console.error('Erro ao buscar reservas do hóspede:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
};
