const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const pagamentoController = require('../controllers/pagamentoController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Limites contra teste de cartões (card testing) e abuso da API do Mercado Pago. Desligados só nos testes
// automatizados. A chave é o usuário autenticado (e a reserva), não o IP.
const emTeste = () => process.env.NODE_ENV === 'test';
const chaveUsuario = (req) => `u${req.usuario?.id ?? 'anon'}`;
const chaveUsuarioReserva = (req) => `${chaveUsuario(req)}:r${req.params?.reservaId ?? ''}`;

const limitadorTentativas = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    keyGenerator: chaveUsuarioReserva,
    standardHeaders: true,
    legacyHeaders: false,
    skip: emTeste,
    validate: { keyGeneratorIpFallback: false },
    message: { error: 'Muitas tentativas de pagamento. Aguarde alguns minutos e tente novamente.' }
});

const limitadorPagamentos = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    keyGenerator: chaveUsuario,
    standardHeaders: true,
    legacyHeaders: false,
    skip: emTeste,
    validate: { keyGeneratorIpFallback: false },
    message: { error: 'Muitas requisições. Aguarde alguns minutos e tente novamente.' }
});

// Webhook é público (o Mercado Pago chama): limite generoso por IP, só para conter abuso.
const limitadorWebhook = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: emTeste,
    validate: { xForwardedForHeader: false }
});

// Cria ou obtém preferência de pagamento no Mercado Pago para a reserva
router.post('/criar-preferencia/:reservaId', verificarToken, limitadorTentativas, pagamentoController.criarPreferencia);

// Checkout Transparente (Payment Brick): dados para montar o Brick (valor do banco + chave pública)
router.get('/checkout/:reservaId', verificarToken, limitadorPagamentos, pagamentoController.obterDadosCheckout);

// Checkout Transparente (Payment Brick): processa cartão/Pix dentro do site
router.post('/processar/:reservaId', verificarToken, limitadorTentativas, pagamentoController.processarPagamento);

// Consulta o status do pagamento no banco para a reserva
router.get('/status/:reservaId', verificarToken, limitadorPagamentos, pagamentoController.consultarStatus);

// Simula aprovação de pagamento (para testes locais em desenvolvimento)
router.post('/simular-aprovacao/:reservaId', verificarToken, limitadorPagamentos, pagamentoController.simularAprovacao);

// Webhook para retorno assíncrono do Mercado Pago (público para o Mercado Pago chamar)
router.post('/webhook', limitadorWebhook, pagamentoController.receberWebhook);

module.exports = router;
