const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');
const { verificarToken, verificarProprietario } = require('../middlewares/authMiddleware');

router.get('/disponibilidade', reservaController.checarDisponibilidade);
router.get('/datas-ocupadas', reservaController.datasOcupadas);
router.post('/', verificarToken, reservaController.criarReserva);
router.post('/lembretes-checkin', verificarToken, verificarProprietario, reservaController.dispararLembretesCheckin);
router.post('/convites-avaliacao', verificarToken, verificarProprietario, reservaController.dispararConvitesAvaliacao);
router.post('/housekeeping', verificarToken, verificarProprietario, reservaController.executarHousekeeping);
router.get('/:id', verificarToken, reservaController.buscarPorId);

module.exports = router;
