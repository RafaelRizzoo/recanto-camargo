class ErroHttp extends Error {
    constructor(status, mensagem) {
        super(mensagem);
        this.status = status;
        this.name = 'ErroHttp';
    }
}

function errorHandler(err, req, res, next) {
    if (err instanceof ErroHttp) {
        return res.status(err.status).json({ error: err.message });
    }
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno no servidor.' });
}

module.exports = { ErroHttp, errorHandler };
