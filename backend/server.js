const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const db = require('./config/db');
const { criarServicoNotificacoes } = require('./notificacoes');
const { criarServicoEmail, criarHtmlEmail } = require('./email');
const { errorHandler } = require('./middlewares/errorHandler');

// --- ROTAS ---
const authRoutes = require('./routes/authRoutes');
const imovelRoutes = require('./routes/imovelRoutes');
const reservaRoutes = require('./routes/reservaRoutes');
const cupomRoutes = require('./routes/cupomRoutes');
const notificacaoRoutes = require('./routes/notificacaoRoutes');
const avaliacaoRoutes = require('./routes/avaliacaoRoutes');
const hospedeRoutes = require('./routes/hospedeRoutes');
const proprietarioRoutes = require('./routes/proprietarioRoutes');

const app = express();

// Configurações iniciais 
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// --- SERVIÇOS COMPARTILHADOS (acessíveis via req.app.get) ---
const notificacoes = criarServicoNotificacoes(db);
const { enviarEmail } = criarServicoEmail();
app.set('notificacoes', notificacoes);
app.set('emailService', { enviarEmail, criarHtmlEmail });

// --- MONTAGEM DAS ROTAS ---
app.use('/api/usuarios', authRoutes);
app.use('/api/imoveis', imovelRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/cupons', cupomRoutes);
app.use('/api/notificacoes', notificacaoRoutes);
app.use('/api/avaliacoes', avaliacaoRoutes);
app.use('/api/hospede', hospedeRoutes);
app.use('/api/proprietario', proprietarioRoutes);

// --- MIDDLEWARE DE ERRO GLOBAL ---
app.use(errorHandler);

// --- INICIALIZAÇÃO ---
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
}

module.exports = app;
