const db = require('../config/db');
const { ErroHttp } = require('../middlewares/errorHandler');
const {
    garantirHospede,
    normalizarCupom,
    buscarCupomPorCodigo,
    buscarCupomPorIdComLock,
    validarRegrasCupom
} = require('../services/helpers');

exports.listarMeus = async (req, res) => {
    try {
        await garantirHospede(db, req.usuario.id);

        const [cupons] = await db.query(
            `SELECT
                c.Cup_Id,
                c.Cup_Codigo,
                c.Cup_TipoDesconto,
                c.Cup_ValorDoDesconto,
                DATE_FORMAT(c.Cup_DataValidade, '%Y-%m-%d') AS Cup_DataValidade,
                c.Cup_LimiteUso,
                c.Cup_PublicoAlvo,
                c.Cup_Cliente_Usu_Id,
                c.Cup_MinimoNoites,
                c.Cup_ValorMinimo,
                EXISTS (
                    SELECT 1
                    FROM res_reserva usada
                    WHERE usada.Cup_Id = c.Cup_Id
                      AND usada.Hos_Hospede_Usu_Id = ?
                      AND usada.Res_Status NOT IN ('CANCELADA', 'RECUSADA')
                ) AS Cup_Usado
             FROM cup_cupom c
             WHERE c.Cup_DataValidade >= CURDATE()
               AND c.Cup_LimiteUso > (
                   SELECT COUNT(*) 
                   FROM res_reserva r 
                   WHERE r.Cup_Id = c.Cup_Id
                     AND r.Res_Status NOT IN ('CANCELADA', 'RECUSADA')
               )
               AND c.Cup_ValorDoDesconto > ?
               AND (
                   (c.Cup_TipoDesconto = ? AND c.Cup_ValorDoDesconto <= ?)
                   OR c.Cup_TipoDesconto = ?
               )
               AND (
                   c.Cup_PublicoAlvo = 'TODOS'
                   OR (c.Cup_PublicoAlvo = 'CLIENTE_ESPECIFICO' AND c.Cup_Cliente_Usu_Id = ?)
                   OR (c.Cup_PublicoAlvo = 'PRIMEIRA_RESERVA' AND NOT EXISTS (
                       SELECT 1 FROM res_reserva r2 
                       WHERE r2.Hos_Hospede_Usu_Id = ? AND r2.Res_Status IN ('CONFIRMADA', 'CONCLUIDA')
                   ))
                   OR (c.Cup_PublicoAlvo = 'CLIENTE_RETORNANTE' AND EXISTS (
                       SELECT 1 FROM res_reserva r3
                       WHERE r3.Hos_Hospede_Usu_Id = ? AND r3.Res_Status = 'CONCLUIDA'
                   ) AND NOT EXISTS (
                       SELECT 1 FROM res_reserva r4
                       WHERE r4.Hos_Hospede_Usu_Id = ? AND r4.Res_Status = 'CONCLUIDA' AND r4.Res_DataCheckOut >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                   ))
                   OR (c.Cup_PublicoAlvo = 'CLIENTE_RECORRENTE' AND (
                       SELECT COUNT(*) FROM res_reserva r5
                       WHERE r5.Hos_Hospede_Usu_Id = ? AND r5.Res_Status IN ('CONFIRMADA', 'CONCLUIDA')
                   ) >= 2)
               )
               AND (
                   SELECT COUNT(*)
                   FROM cup_cupom duplicado
                   WHERE UPPER(duplicado.Cup_Codigo) = UPPER(c.Cup_Codigo)
               ) = ?
             ORDER BY c.Cup_DataValidade ASC, c.Cup_Id ASC`,
            [req.usuario.id, 0, 'PERCENTUAL', 100, 'FIXO', req.usuario.id, req.usuario.id, req.usuario.id, req.usuario.id, req.usuario.id, 1]
        );

        const resposta = cupons.map(cupom => {
            const normalizado = normalizarCupom(cupom);
            return {
                cupomId: normalizado.id,
                codigo: normalizado.codigo,
                tipoDesconto: normalizado.tipoDesconto,
                valorDesconto: normalizado.valorDesconto,
                validoAte: normalizado.validoAte,
                publicoAlvo: normalizado.publicoAlvo,
                minimoNoites: normalizado.minimoNoites,
                valorMinimo: normalizado.valorMinimo,
                usado: Number(cupom.Cup_Usado) === 1
            };
        });

        res.json(resposta);
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao buscar cupons:', error);
        res.status(500).json({ error: 'Erro interno ao buscar cupons.' });
    }
};

exports.validar = async (req, res) => {
    try {
        await garantirHospede(db, req.usuario.id);

        const codigo = typeof req.body?.codigo === 'string' ? req.body.codigo.trim() : '';
        const noites = Number(req.body?.noites || 0);
        const subtotal = Number(req.body?.subtotal || 0);

        if (!codigo || codigo.length > 45) {
            return res.status(400).json({ error: 'Informe um código de cupom válido.' });
        }

        const cupomDb = await buscarCupomPorCodigo(db, codigo);
        const cupom = await validarRegrasCupom(db, cupomDb, req.usuario.id, false, { noites, subtotal });

        res.json({
            cupomId: cupom.id,
            codigo: cupom.codigo,
            tipoDesconto: cupom.tipoDesconto,
            valorDesconto: cupom.valorDesconto,
            publicoAlvo: cupom.publicoAlvo,
            minimoNoites: cupom.minimoNoites,
            valorMinimo: cupom.valorMinimo
        });
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao validar cupom:', error);
        res.status(500).json({ error: 'Erro interno ao validar cupom.' });
    }
};
