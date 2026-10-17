const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verificarToken } = require('../middlewares/authMiddleware');
const { criarServicoNotificacoes, validarId: validarIdNotificacao } = require('../notificacoes');

const notificacoes = criarServicoNotificacoes(db);

async function verificarUsuarioAtivoNotificacoes(req, res, next) {
    res.set('Cache-Control', 'no-store');
    try {
        const usuarioId = validarIdNotificacao(req.usuario.id);
        const [usuarios] = await db.query(
            'SELECT Usu_Id FROM usu_usuario WHERE Usu_Id = ? AND Usu_Status = ? LIMIT 1',
            [usuarioId, 'ATIVO']
        );
        if (usuarios.length === 0) {
            return res.status(403).json({ error: 'Esta conta encontra-se inativa ou indisponível.' });
        }
        req.usuarioNotificacaoId = usuarioId;
        next();
    } catch (error) {
        if (error instanceof TypeError) {
            return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
        }
        console.error('Erro ao verificar acesso às notificações.');
        res.status(500).json({ error: 'Não foi possível acessar as notificações.' });
    }
}

router.get('/', verificarToken, verificarUsuarioAtivoNotificacoes, async (req, res) => {
    try {
        res.json(await notificacoes.listarNotificacoes(req.usuarioNotificacaoId));
    } catch {
        console.error('Erro ao buscar notificações.');
        res.status(500).json({ error: 'Não foi possível carregar as notificações.' });
    }
});

router.patch('/marcar-todas-lidas', verificarToken, verificarUsuarioAtivoNotificacoes, async (req, res) => {
    try {
        await notificacoes.marcarTodasLidas(req.usuarioNotificacaoId);
        res.json({ message: 'Notificações marcadas como lidas.' });
    } catch {
        console.error('Erro ao marcar notificações como lidas.');
        res.status(500).json({ error: 'Não foi possível atualizar as notificações.' });
    }
});

router.patch('/:id/lida', verificarToken, verificarUsuarioAtivoNotificacoes, async (req, res) => {
    let notificacaoId;
    try {
        notificacaoId = validarIdNotificacao(req.params.id);
    } catch {
        return res.status(400).json({ error: 'Identificador de notificação inválido.' });
    }

    try {
        const pertenceAoUsuario = await notificacoes.marcarLida(req.usuarioNotificacaoId, notificacaoId);
        if (!pertenceAoUsuario) {
            return res.status(404).json({ error: 'Notificação não encontrada.' });
        }
        res.json({ message: 'Notificação marcada como lida.' });
    } catch {
        console.error('Erro ao marcar notificação como lida.');
        res.status(500).json({ error: 'Não foi possível atualizar a notificação.' });
    }
});

module.exports = router;
