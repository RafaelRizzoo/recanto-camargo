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

module.exports = router;
