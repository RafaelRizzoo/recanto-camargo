const TEMPO_LIMITE_EMAIL_MS = 10000;

function escaparHtml(valor) {
    const entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(valor).replace(/[&<>"']/g, caractere => entidades[caractere]);
}

function criarHtmlEmail(titulo, mensagem, opcoes = {}) {
    const opts = (typeof opcoes === 'object' && opcoes !== null) ? opcoes : {};
    
    const tituloEscapado = escaparHtml(titulo || 'Notificação - Recanto Camargo');
    const mensagemEscapada = escaparHtml(mensagem || '').replace(/\n/g, '<br>');
    
    // Status Badge
    let badgeTexto = opts.badge || 'Notificação';
    let badgeCorFundo = '#e8f0fe';
    let badgeCorTexto = '#1a73e8';
    
    const tLower = (titulo || '').toLowerCase();
    
    if (opts.badge) {
        badgeTexto = opts.badge;
    } else if (tLower.includes('confirmad') || tLower.includes('garantid') || tLower.includes('aprovad')) {
        badgeTexto = '✓ Reserva Confirmada';
        badgeCorFundo = '#e6f4ea';
        badgeCorTexto = '#137333';
    } else if (tLower.includes('reembolso') || tLower.includes('estorno')) {
        badgeTexto = '✓ Reembolso Processado';
        badgeCorFundo = '#e8f0fe';
        badgeCorTexto = '#1a73e8';
    } else if (tLower.includes('cancelad') || tLower.includes('recusad')) {
        badgeTexto = '● Cancelamento';
        badgeCorFundo = '#fce8e6';
        badgeCorTexto = '#c5221f';
    } else if (tLower.includes('recebid') || tLower.includes('aguardando') || tLower.includes('pendente')) {
        badgeTexto = '⏱ Aguardando Confirmação';
        badgeCorFundo = '#fef7e0';
        badgeCorTexto = '#b06000';
    } else if (tLower.includes('avaliação') || tLower.includes('avaliacao')) {
        badgeTexto = '★ Avaliação';
        badgeCorFundo = '#fef7e0';
        badgeCorTexto = '#b06000';
    }

    const badgeEscapado = escaparHtml(badgeTexto);

    // Saudação
    const saudacao = opts.nome ? `Olá, <strong>${escaparHtml(opts.nome)}</strong>!` : 'Olá!';

    // URL do painel / botão
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const botaoTexto = escaparHtml(opts.botaoTexto || 'Acessar Meu Painel');
    const botaoUrl = opts.botaoUrl || `${frontendUrl}/#/DashboardCliente`;
    const botaoUrlEscapada = escaparHtml(botaoUrl);

    // Logo URL oficial (PNG otimizado para clientes de e-mail sobre fundo #223a5e)
    const logoUrl = opts.logoUrl || process.env.LOGO_URL || 'https://raw.githubusercontent.com/RafaelRizzoo/recanto-camargo/main/src/assets/img/artes/santa-navy.png';
    const logoUrlEscapada = escaparHtml(logoUrl);

    // Detalhes (tabela)
    let tabelaDetalhesHtml = '';
    if (Array.isArray(opts.detalhes) && opts.detalhes.length > 0) {
        const linhas = opts.detalhes.map(d => `
            <tr>
                <td style="padding: 10px 14px; color: #5f6368; font-size: 14px; border-bottom: 1px solid #e8eaed; font-weight: 500;">${escaparHtml(d.rotulo || d.chave || '')}</td>
                <td style="padding: 10px 14px; color: #202124; font-size: 14px; border-bottom: 1px solid #e8eaed; text-align: right; font-weight: 600;">${escaparHtml(d.valor || '')}</td>
            </tr>
        `).join('');

        tabelaDetalhesHtml = `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 22px 0; border: 1px solid #dadce0; border-radius: 8px; border-collapse: separate; border-spacing: 0; overflow: hidden; background-color: #fafbfc;">
                <tbody>
                    ${linhas}
                </tbody>
            </table>
        `;
    }

    const whatsappLink = opts.whatsappUrl || 'https://wa.me/5512997193233';

    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tituloEscapado}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f3f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f3f4; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e0e0e0;">
          
          <!-- Cabeçalho Navy com Logo Oficial -->
          <tr>
            <td align="center" style="background-color: #223a5e; padding: 26px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td valign="middle" style="padding-right: 14px; vertical-align: middle;">
                    <img src="${logoUrlEscapada}" alt="Recanto Camargo" width="40" height="59" style="display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; background-color: #223a5e;" />
                  </td>
                  <td valign="middle" align="left" style="vertical-align: middle; line-height: 1.18;">
                    <span style="display: block; color: #ffffff; font-size: 19px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Recanto</span>
                    <span style="display: block; color: #ffffff; font-size: 19px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Camargo</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo do Card -->
          <tr>
            <td style="padding: 28px 24px;">
              
              <!-- Badge de Status -->
              <div style="margin-bottom: 18px;">
                <span style="display: inline-block; background-color: ${badgeCorFundo}; color: ${badgeCorTexto}; font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 20px; letter-spacing: 0.3px;">
                  ${badgeEscapado}
                </span>
              </div>

              <!-- Título da Ação -->
              <h1 style="margin: 0 0 14px 0; color: #202124; font-size: 21px; font-weight: 700; line-height: 1.35;">
                ${tituloEscapado}
              </h1>

              <!-- Saudação e Mensagem -->
              <p style="margin: 0 0 14px 0; color: #3c4043; font-size: 15px; line-height: 1.5;">
                ${saudacao}
              </p>
              <p style="margin: 0 0 18px 0; color: #3c4043; font-size: 15px; line-height: 1.55;">
                ${mensagemEscapada}
              </p>

              ${tabelaDetalhesHtml}

              <!-- Botão de Ação CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 26px 0 10px 0;">
                <tr>
                  <td align="center">
                    <a href="${botaoUrlEscapada}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #e65100 0%, #f57c00 100%); background-color: #e65100; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 13px 32px; border-radius: 24px; box-shadow: 0 2px 8px rgba(230, 81, 0, 0.3); text-align: center;">
                      ${botaoTexto}
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Rodapé do Card -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 18px 24px; border-top: 1px solid #e8eaed; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #5f6368; font-size: 13px; font-weight: 500;">
                Recanto do Camargo &bull; Aparecida - SP
              </p>
              <p style="margin: 0 0 10px 0;">
                <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer" style="color: #198754; text-decoration: none; font-size: 13px; font-weight: 600;">
                  WhatsApp Suporte &rarr;
                </a>
              </p>
              <p style="margin: 0; color: #80868b; font-size: 11px;">
                &copy; 2026 Recanto do Camargo. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

            const overrideEmail = env.RESEND_OVERRIDE_EMAIL?.trim();
            const destinatarioFinal = overrideEmail || destinatario;
            const assuntoFinal = overrideEmail ? `[${destinatario}] ${assunto}` : assunto;

            const resultado = await cliente.emails.send({
                from: remetente,
                to: [destinatarioFinal],
                subject: assuntoFinal,
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
