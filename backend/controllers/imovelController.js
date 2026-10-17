const db = require('../config/db');

exports.listarImoveis = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT Imo_Id, Imo_Nome, Imo_ValorFixo, Imo_NotaMedial FROM imo_imovel WHERE Imo_Status = ?', ['ATIVO']);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar os imóveis' });
    }
};

exports.dashboardImovel = async (req, res) => {
    // Placeholder para futuras rotas de dashboard do imóvel
    res.status(501).json({ error: 'Funcionalidade em desenvolvimento.' });
};
