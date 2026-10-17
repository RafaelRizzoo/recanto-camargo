const express = require('express');
const router = express.Router();
const avaliacaoController = require('../controllers/avaliacaoController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.post('/', verificarToken, avaliacaoController.criarAvaliacao);
router.get('/imovel/:imoId', avaliacaoController.listarPublicas);

module.exports = router;
