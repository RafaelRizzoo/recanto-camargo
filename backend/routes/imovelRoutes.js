const express = require('express');
const router = express.Router();
const imovelController = require('../controllers/imovelController');

router.get('/', imovelController.listarImoveis);

module.exports = router;
