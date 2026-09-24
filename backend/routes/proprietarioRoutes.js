const express = require('express');
const router = express.Router();
const proprietarioController = require('../controllers/proprietarioController');
const { verificarToken, verificarProprietario } = require('../middlewares/authMiddleware');

router.patch('/reservas/:id/aprovar', verificarToken, verificarProprietario, proprietarioController.aprovarReserva);
router.patch('/reservas/:id/recusar', verificarToken, verificarProprietario, proprietarioController.recusarReserva);
router.patch('/reservas/:id/concluir', verificarToken, verificarProprietario, proprietarioController.concluirReserva);
router.get('/reservas', verificarToken, verificarProprietario, proprietarioController.listarReservas);
router.get('/avaliacoes/pendentes', verificarToken, verificarProprietario, proprietarioController.listarAvaliacoesPendentes);
router.patch('/avaliacoes/:id/responder', verificarToken, verificarProprietario, proprietarioController.responderAvaliacao);

// Métricas da Dashboard
router.get('/metricas', verificarToken, verificarProprietario, proprietarioController.obterMetricasDashboard);

// Gestão de Bloqueios de Datas
router.get('/bloqueios', verificarToken, verificarProprietario, proprietarioController.listarBloqueios);
router.post('/bloqueios', verificarToken, verificarProprietario, proprietarioController.criarBloqueio);
router.delete('/bloqueios/:id', verificarToken, verificarProprietario, proprietarioController.removerBloqueio);

// Gestão de Cupons
router.get('/cupons', verificarToken, verificarProprietario, proprietarioController.listarCuponsProprietario);
router.post('/cupons', verificarToken, verificarProprietario, proprietarioController.criarCupom);
router.patch('/cupons/:id/status', verificarToken, verificarProprietario, proprietarioController.atualizarStatusCupom);

module.exports = router;

