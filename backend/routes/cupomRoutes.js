const express = require('express');
const router = express.Router();
const cupomController = require('../controllers/cupomController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.get('/meus', verificarToken, cupomController.listarMeus);
router.post('/validar', verificarToken, cupomController.validar);

module.exports = router;
