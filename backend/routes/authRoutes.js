const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

router.post('/cadastro', authController.cadastrar);
router.post('/login', loginLimiter, authController.login);
router.get('/sessao', authController.sessao);
router.post('/logout', authController.logout);

module.exports = router;
