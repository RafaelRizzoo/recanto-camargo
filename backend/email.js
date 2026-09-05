const TEMPO_LIMITE_EMAIL_MS = 10000;

function escaparHtml(valor) {
    const entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(valor).replace(/[&<>"']/g, caractere => entidades[caractere]);
}

function criarHtmlEmail(titulo, mensagem) {
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body>
        <h1>${escaparHtml(titulo)}</h1>
        <p>${escaparHtml(mensagem)}</p>
        <p>Consulte os detalhes no painel do Recanto Camargo.</p>
        </body></html>`;
}

function criarServicoEmail({ env = process.env, logger = console, ResendClass } = {}) {
    let cliente;
    let chaveAtual;
    let avisoSemChave = false;
    let avisoSemRemetente = false;

    async function enviarEmail(destinatario, assunto, corpoHtml, chaveIdempotencia) {
        try {
            const apiKey = env.RESEND_API_KEY?.trim();
            if (!apiKey) {
                if (!avisoSemChave) logger.warn('RESEND_API_KEY não configurada, pulando envio de email');
                avisoSemChave = true;
                return { enviado: false, motivo: 'sem_chave' };
            }
            const remetente = env.RESEND_FROM_EMAIL?.trim();
            if (!remetente) {
                if (!avisoSemRemetente) logger.warn('RESEND_FROM_EMAIL não configurado, pulando envio de email');
                avisoSemRemetente = true;
                return { enviado: false, motivo: 'sem_remetente' };
            }
            if (typeof destinatario !== 'string' || destinatario.length > 255
                || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(destinatario)
                || typeof assunto !== 'string' || /[\r\n]/.test(assunto)
                || typeof corpoHtml !== 'string'
                || typeof chaveIdempotencia !== 'string' || !chaveIdempotencia
                || chaveIdempotencia.length > 256) {
                logger.error('Email não enviado: parâmetros internos inválidos.');
                return { enviado: false, motivo: 'parametros_invalidos' };
            }

            if (!cliente || chaveAtual !== apiKey) {
                const ClienteResend = ResendClass || require('resend').Resend;
                cliente = new ClienteResend(apiKey);
                // Resend 6.x imprime respostas brutas de erro em desenvolvimento.
                // Silencia somente esse logger interno; os avisos sanitizados ficam abaixo.
                if (typeof cliente.logError === 'function') cliente.logError = () => {};
                chaveAtual = apiKey;
            }

            const resultado = await cliente.emails.send({
                from: remetente,
                to: [destinatario],
                subject: assunto,
                html: corpoHtml
            }, {
                idempotencyKey: chaveIdempotencia,
                signal: AbortSignal.timeout(TEMPO_LIMITE_EMAIL_MS)
            });

            // O SDK também retorna falhas em { error }, sem lançar uma exceção.
            if (resultado?.error || !resultado?.data?.id) {
                logger.error('Email não enviado: o provedor recusou ou não confirmou o envio.');
                return { enviado: false, motivo: 'falha_provedor' };
            }
            return { enviado: true };
        } catch {
            // Erros do provedor podem conter destinatários e dados de autenticação.
            logger.error('Email não enviado: falha de comunicação com o provedor.');
            return { enviado: false, motivo: 'falha_comunicacao' };
        }
    }

    return { enviarEmail };
}

module.exports = { criarServicoEmail, criarHtmlEmail, escaparHtml };
