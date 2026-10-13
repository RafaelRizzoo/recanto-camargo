const express = require('express');
const router = express.Router();
const pagamentoController = require('../controllers/pagamentoController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Cria ou obtém preferência de pagamento no Mercado Pago para a reserva
router.post('/criar-preferencia/:reservaId', verificarToken, pagamentoController.criarPreferencia);

// Consulta o status do pagamento no banco para a reserva
router.get('/status/:reservaId', verificarToken, pagamentoController.consultarStatus);

// Simula aprovação de pagamento (para testes locais em desenvolvimento)
router.post('/simular-aprovacao/:reservaId', verificarToken, pagamentoController.simularAprovacao);

// Webhook para retorno assíncrono do Mercado Pago (público para o Mercado Pago chamar)
router.post('/webhook', pagamentoController.receberWebhook);

module.exports = router;
