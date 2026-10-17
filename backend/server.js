const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const db = require('./config/db');
const { criarServicoNotificacoes } = require('./notificacoes');
const { criarServicoEmail, criarHtmlEmail, criarEmailBoasVindas, criarEmailCupomExclusivo } = require('./email');
const { errorHandler } = require('./middlewares/errorHandler');
const { processarLembretesPreCheckin, processarConvitesPosCheckoutAvaliacao } = require('./services/lembreteService');
const { processarCancelamentoReservasAbandonadas } = require('./services/housekeepingService');

// --- ROTAS ---
const authRoutes = require('./routes/authRoutes');
const imovelRoutes = require('./routes/imovelRoutes');
const reservaRoutes = require('./routes/reservaRoutes');
const cupomRoutes = require('./routes/cupomRoutes');
const notificacaoRoutes = require('./routes/notificacaoRoutes');
const avaliacaoRoutes = require('./routes/avaliacaoRoutes');
const hospedeRoutes = require('./routes/hospedeRoutes');
const proprietarioRoutes = require('./routes/proprietarioRoutes');
const pagamentoRoutes = require('./routes/pagamentoRoutes');

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
app.set('emailService', { enviarEmail, criarHtmlEmail, criarEmailBoasVindas, criarEmailCupomExclusivo });

// --- MONTAGEM DAS ROTAS ---
app.use('/api/usuarios', authRoutes);
app.use('/api/imoveis', imovelRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/cupons', cupomRoutes);
app.use('/api/notificacoes', notificacaoRoutes);
app.use('/api/avaliacoes', avaliacaoRoutes);
app.use('/api/hospede', hospedeRoutes);
app.use('/api/proprietario', proprietarioRoutes);
app.use('/api/pagamentos', pagamentoRoutes);

// --- MIDDLEWARE DE ERRO GLOBAL ---
app.use(errorHandler);

// --- INICIALIZAÇÃO ---
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);

        // Rotina periódica em segundo plano (Lembretes, Convites de Avaliação e Housekeeping - a cada 1h)
        const INTERVALO_ROTINAS_MS = 1 * 60 * 60 * 1000;
        const rodarRotinasAutomaticas = async () => {
            const emailService = app.get('emailService');
            const notificacoes = app.get('notificacoes');

            try {
                const resLembretes = await processarLembretesPreCheckin({ db, emailService, notificacoes });
                if (resLembretes && resLembretes.total > 0) {
                    console.log(`[Lembretes Pré-Checkin] ${resLembretes.total} lembrete(s) processado(s).`);
                }
            } catch (err) {
                console.error('[Lembretes Pré-Checkin] Erro na rotina automática:', err.message);
            }

            try {
                const resConvites = await processarConvitesPosCheckoutAvaliacao({ db, emailService, notificacoes });
                if (resConvites && resConvites.total > 0) {
                    console.log(`[Convites Avaliação] ${resConvites.total} convite(s) de avaliação processado(s).`);
                }
            } catch (err) {
                console.error('[Convites Avaliação] Erro na rotina automática:', err.message);
            }

            try {
                const resHousekeeping = await processarCancelamentoReservasAbandonadas({ db, emailService, notificacoes });
                if (resHousekeeping && resHousekeeping.total > 0) {
                    console.log(`[Housekeeping] ${resHousekeeping.total} reserva(s) abandonada(s) cancelada(s).`);
                }
            } catch (err) {
                console.error('[Housekeeping] Erro na rotina automática:', err.message);
            }
        };

        // Dispara 10s após inicialização para não competir com bootstrap, e depois a cada 12h
        setTimeout(rodarRotinasAutomaticas, 10000).unref();
        const timerAutomacoes = setInterval(rodarRotinasAutomaticas, INTERVALO_ROTINAS_MS);
        timerAutomacoes.unref();
    });
}

module.exports = app;
