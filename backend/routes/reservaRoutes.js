const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.get('/disponibilidade', reservaController.checarDisponibilidade);
router.get('/datas-ocupadas', reservaController.datasOcupadas);
router.post('/', verificarToken, reservaController.criarReserva);
router.get('/:id', verificarToken, reservaController.buscarPorId);

module.exports = router;
