const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Acesso negado. Faça login para continuar.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded; 
        next(); 
    } catch (err) {
        res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }
};

const verificarProprietario = (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ error: 'Acesso negado.' });
    
    if (req.usuario.tipo !== 'proprietario') {
        return res.status(403).json({ error: 'Acesso negado. Esta área é restrita aos proprietários.' });
    }
    
    next(); 
};

// Se precisar do verificarUsuarioAtivoNotificacoes, importaremos o db aqui, mas por enquanto:
module.exports = {
    verificarToken,
    verificarProprietario
};
