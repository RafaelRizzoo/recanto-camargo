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
                EXISTS (
                    SELECT 1
                    FROM res_reserva usada
                    WHERE usada.Cup_Id = c.Cup_Id
                      AND usada.Hos_Hospede_Usu_Id = ?
                ) AS Cup_Usado
             FROM cup_cupom c
             WHERE c.Cup_DataValidade >= CURDATE()
               AND c.Cup_LimiteUso > (
                   SELECT COUNT(*) FROM res_reserva r WHERE r.Cup_Id = c.Cup_Id
               )
               AND c.Cup_ValorDoDesconto > ?
               AND (
                   (c.Cup_TipoDesconto = ? AND c.Cup_ValorDoDesconto <= ?)
                   OR c.Cup_TipoDesconto = ?
               )
               AND (
                   SELECT COUNT(*)
                   FROM cup_cupom duplicado
                   WHERE UPPER(duplicado.Cup_Codigo) = UPPER(c.Cup_Codigo)
               ) = ?
             ORDER BY c.Cup_DataValidade ASC, c.Cup_Id ASC`,
            [req.usuario.id, 0, 'PERCENTUAL', 100, 'FIXO', 1]
        );

        const resposta = cupons.map(cupom => {
            const normalizado = normalizarCupom(cupom);
            return {
                cupomId: normalizado.id,
                codigo: normalizado.codigo,
                tipoDesconto: normalizado.tipoDesconto,
                valorDesconto: normalizado.valorDesconto,
                validoAte: normalizado.validoAte,
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
        if (!codigo || codigo.length > 45) {
            return res.status(400).json({ error: 'Informe um código de cupom válido.' });
        }

        const cupomDb = await buscarCupomPorCodigo(db, codigo);
        const cupom = await validarRegrasCupom(db, cupomDb, req.usuario.id);

        res.json({
            cupomId: cupom.id,
            codigo: cupom.codigo,
            tipoDesconto: cupom.tipoDesconto,
            valorDesconto: cupom.valorDesconto
        });
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao validar cupom:', error);
        res.status(500).json({ error: 'Erro interno ao validar cupom.' });
    }
};
