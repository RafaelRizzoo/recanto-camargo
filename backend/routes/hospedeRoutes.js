const express = require('express');
const router = express.Router();
const hospedeController = require('../controllers/hospedeController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.patch('/reservas/:id/cancelar', verificarToken, hospedeController.cancelarReserva);
router.get('/reservas', verificarToken, hospedeController.listarReservas);

module.exports = router;
