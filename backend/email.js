const TEMPO_LIMITE_EMAIL_MS = 10000;

function escaparHtml(valor) {
    const entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(valor).replace(/[&<>"']/g, caractere => entidades[caractere]);
}

function criarHtmlEmail(titulo, mensagem, opcoes = {}) {
    const opts = (typeof opcoes === 'object' && opcoes !== null) ? opcoes : {};
    
    const tituloEscapado = escaparHtml(titulo || 'Notificação - Recanto Camargo');
    
    // Evita saudações duplicadas caso a mensagem já contenha "Olá, Nome!" ou "Olá!"
    let mensagemCorpo = String(mensagem || '').trim();
    if (opts.nome) {
        const nomeEscapadoRegex = String(opts.nome).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexSaudacao = new RegExp(`^olá,?\\s*(?:${nomeEscapadoRegex})?[!.]?\\s*\\n*`, 'i');
        mensagemCorpo = mensagemCorpo.replace(regexSaudacao, '');
    } else {
        mensagemCorpo = mensagemCorpo.replace(/^olá[!.]?\\s*\\n*/i, '');
    }
    const mensagemEscapada = escaparHtml(mensagemCorpo).replace(/\n/g, '<br>');
    
    // Status Badge
    let badgeTexto = opts.badge || 'Notificação';
    let badgeCorFundo = '#e8f0fe';
    let badgeCorTexto = '#1a73e8';
    
    const tLower = (titulo || '').toLowerCase();
    
    if (opts.badge) {
        badgeTexto = opts.badge;
        if (opts.badgeCorFundo) badgeCorFundo = opts.badgeCorFundo;
        if (opts.badgeCorTexto) badgeCorTexto = opts.badgeCorTexto;
    } else if (tLower.includes('alerta') || tLower.includes('seguran') || tLower.includes('suspeit')) {
        badgeTexto = '⚠️ Alerta de Segurança';
        badgeCorFundo = '#fce8e6';
        badgeCorTexto = '#c5221f';
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
                <td style="padding: 11px 16px; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${escaparHtml(d.rotulo || d.chave || '')}</td>
                <td style="padding: 11px 16px; color: #0f172a; font-size: 14px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${escaparHtml(d.valor || '')}</td>
            </tr>
        `).join('');

        tabelaDetalhesHtml = `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 22px 0; border: 1px solid #cbd5e1; border-radius: 10px; border-collapse: separate; border-spacing: 0; overflow: hidden; background-color: #f8fafc;">
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
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Cabeçalho Navy Premium com Logo Oficial (Opção 1 - Centralização Vertical Nobre) -->
          <tr>
            <td align="center" style="background-color: #1e3a5f; padding: 26px 20px; border-bottom: 3px solid #f59e0b;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto; text-align: center;">
                <tr>
                  <td align="center">
                    <img src="${logoUrlEscapada}" alt="Recanto Camargo" width="44" height="65" style="display: block; margin: 0 auto 10px auto; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; background-color: #1e3a5f;" />
                    <span style="display: block; color: #ffffff; font-size: 21px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; line-height: 1.2;">Recanto Camargo</span>
                    <span style="display: block; color: #cbd5e1; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-top: 5px;">Hospedagem Exclusiva &bull; Aparecida - SP</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo do Card -->
          <tr>
            <td style="padding: 32px 28px;">
              
              <!-- Badge de Status -->
              <div style="margin-bottom: 18px;">
                <span style="display: inline-block; background-color: ${badgeCorFundo}; color: ${badgeCorTexto}; font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 20px; letter-spacing: 0.3px;">
                  ${badgeEscapado}
                </span>
              </div>

              <!-- Título da Ação -->
              <h1 style="margin: 0 0 14px 0; color: #0f172a; font-size: 22px; font-weight: 800; line-height: 1.35;">
                ${tituloEscapado}
              </h1>

              <!-- Saudação e Mensagem -->
              <p style="margin: 0 0 14px 0; color: #334155; font-size: 15px; line-height: 1.6;">
                ${saudacao}
              </p>
              <p style="margin: 0 0 18px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                ${mensagemEscapada}
              </p>

              ${tabelaDetalhesHtml}

              <!-- Botão de Ação CTA -->
              ${opts.semBotao ? '' : `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 26px 0 10px 0;">
                <tr>
                  <td align="center">
                    <a href="${botaoUrlEscapada}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); background-color: #f59e0b; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 13px 32px; border-radius: 50px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25); text-align: center;">
                      ${botaoTexto}
                    </a>
                  </td>
                </tr>
              </table>
              `}

            </td>
          </tr>

          <!-- Rodapé do Card -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; font-weight: 500;">
                Recanto Camargo &bull; Aparecida - SP
              </p>
              <p style="margin: 0 0 10px 0;">
                <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer" style="color: #059669; text-decoration: none; font-size: 13px; font-weight: 600;">
                  WhatsApp Suporte &rarr;
                </a>
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                &copy; 2026 Recanto Camargo. Todos os direitos reservados.
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

function criarEmailBoasVindas(opcoes = {}) {
    const opts = (typeof opcoes === 'object' && opcoes !== null) ? opcoes : {};
    const nome = escaparHtml(opts.nome || 'Hóspede');
    const email = escaparHtml(opts.email || '');
    const telefone = opts.telefone ? escaparHtml(opts.telefone) : '';
    const frontendUrl = escaparHtml((opts.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''));
    const logoUrl = escaparHtml(opts.logoUrl || process.env.LOGO_URL || 'https://raw.githubusercontent.com/RafaelRizzoo/recanto-camargo/main/src/assets/img/artes/santa-navy.png');
    const whatsappUrl = escaparHtml(opts.whatsappUrl || 'https://wa.me/5512997193233?text=Ol%C3%A1!%20Acabei%20de%20criar%20minha%20conta%20no%20Recanto%20Camargo%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida.');

    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo(a) ao Recanto Camargo!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Cabeçalho Navy Premium com Logo (Opção 1 - Centralização Vertical Nobre) -->
          <tr>
            <td align="center" style="background-color: #1e3a5f; padding: 26px 20px; border-bottom: 3px solid #f59e0b;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto; text-align: center;">
                <tr>
                  <td align="center">
                    <img src="${logoUrl}" alt="Recanto Camargo" width="44" height="65" style="display: block; margin: 0 auto 10px auto; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; background-color: #1e3a5f;" />
                    <span style="display: block; color: #ffffff; font-size: 21px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; line-height: 1.2;">Recanto Camargo</span>
                    <span style="display: block; color: #cbd5e1; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-top: 5px;">Hospedagem Exclusiva &bull; Aparecida - SP</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo do E-mail -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              
              <!-- Badge de Boas-Vindas Estilo Hotelaria -->
              <div style="margin-bottom: 20px;">
                <span style="display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; letter-spacing: 0.8px; text-transform: uppercase; border: 1px solid #a7f3d0;">
                  ✨ Bem-vindo(a) à família Recanto Camargo
                </span>
              </div>

              <!-- Título de Impacto -->
              <h1 style="margin: 0 0 16px 0; color: #0f172a; font-size: 24px; font-weight: 800; line-height: 1.3;">
                Sua casa em Aparecida está de portas abertas!
              </h1>

              <!-- Texto de Acolhimento -->
              <p style="margin: 0 0 14px 0; color: #334155; font-size: 15px; line-height: 1.6;">
                Olá, <strong>${nome}</strong>! É uma alegria imensa ter você conosco.
              </p>
              <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.65;">
                O <strong>Recanto Camargo</strong> foi pensado com muito carinho para ser o seu refúgio exclusivo de paz, aconchego e fé em Aparecida do Norte. Seja para uma romaria com a família, uma visita ao Santuário Nacional ou um fim de semana de descanso, preparamos cada detalhe para você se sentir em casa desde o primeiro instante.
              </p>

              <!-- Seção de Vantagens da Plataforma (Estilo Airbnb / Booking) -->
              <div style="margin: 28px 0 24px 0;">
                <h2 style="margin: 0 0 14px 0; color: #0f172a; font-size: 16px; font-weight: 700; letter-spacing: -0.2px;">
                  O que você pode fazer agora no seu painel:
                </h2>
                
                <!-- Card 1: Espaço Inteiro -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
                  <tr>
                    <td width="48" valign="top" style="padding: 14px 0 14px 14px; font-size: 24px; line-height: 1; text-align: center;">
                      🏡
                    </td>
                    <td valign="middle" style="padding: 14px 14px 14px 8px;">
                      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">Espaço Inteiro com Privacidade Absoluta</div>
                      <div style="font-size: 13px; color: #64748b; line-height: 1.45;">Chalé completo para até 10 pessoas, quartos climatizados, cozinha equipada, jardim de inverno e área gourmet com churrasqueira.</div>
                    </td>
                  </tr>
                </table>

                <!-- Card 2: Calendário em Tempo Real -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
                  <tr>
                    <td width="48" valign="top" style="padding: 14px 0 14px 14px; font-size: 24px; line-height: 1; text-align: center;">
                      📅
                    </td>
                    <td valign="middle" style="padding: 14px 14px 14px 8px;">
                      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">Disponibilidade &amp; Calendário Interativo</div>
                      <div style="font-size: 13px; color: #64748b; line-height: 1.45;">Consulte datas disponíveis em tempo real, calcule diárias na hora e garanta o período perfeito para a sua família.</div>
                    </td>
                  </tr>
                </table>

                <!-- Card 3: Cupons e Benefícios -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
                  <tr>
                    <td width="48" valign="top" style="padding: 14px 0 14px 14px; font-size: 24px; line-height: 1; text-align: center;">
                      🏷️
                    </td>
                    <td valign="middle" style="padding: 14px 14px 14px 8px;">
                      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">Cupons de Desconto &amp; Ofertas Exclusivas</div>
                      <div style="font-size: 13px; color: #64748b; line-height: 1.45;">Como membro cadastrado, você tem acesso em primeira mão a cupons promocionais para romarias e feriados.</div>
                    </td>
                  </tr>
                </table>

                <!-- Card 4: Atendimento Direto -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
                  <tr>
                    <td width="48" valign="top" style="padding: 14px 0 14px 14px; font-size: 24px; line-height: 1; text-align: center;">
                      💬
                    </td>
                    <td valign="middle" style="padding: 14px 14px 14px 8px;">
                      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">Atendimento Direto com o Anfitrião</div>
                      <div style="font-size: 13px; color: #64748b; line-height: 1.45;">Fale conosco pelo WhatsApp a qualquer momento para tirar dúvidas, pedir dicas locais ou combinar detalhes da chegada.</div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Cartão de Credenciais do Usuário -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 26px 0; border: 1px solid #cbd5e1; border-radius: 12px; border-collapse: separate; border-spacing: 0; overflow: hidden; background-color: #f8fafc;">
                <thead>
                  <tr>
                    <th colspan="2" align="left" style="padding: 12px 18px; background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
                      📋 Resumo do Seu Perfil
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 10px 18px; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">Titular da Conta</td>
                    <td style="padding: 10px 18px; color: #0f172a; font-size: 14px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${nome}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 18px; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">E-mail Cadastrado</td>
                    <td style="padding: 10px 18px; color: #0f172a; font-size: 14px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${email}</td>
                  </tr>
                  ${telefone ? `
                  <tr>
                    <td style="padding: 10px 18px; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">Telefone / WhatsApp</td>
                    <td style="padding: 10px 18px; color: #0f172a; font-size: 14px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${telefone}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding: 10px 18px; color: #64748b; font-size: 14px; font-weight: 500;">Status do Cadastro</td>
                    <td style="padding: 10px 18px; color: #15803d; font-size: 14px; text-align: right; font-weight: 700;">Hóspede Ativo ✓</td>
                  </tr>
                </tbody>
              </table>

              <!-- Botão de Ação CTA Marcante -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0 18px 0;">
                <tr>
                  <td align="center">
                    <a href="${frontendUrl}/#/" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #e65100 0%, #f57c00 100%); background-color: #e65100; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 38px; border-radius: 30px; box-shadow: 0 4px 16px rgba(230, 81, 0, 0.35); text-align: center; letter-spacing: 0.3px;">
                      Conhecer o Chalé &amp; Ver Datas Disponíveis →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Dica do Anfitrião (Callout Dourado) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; margin: 24px 0 6px 0;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.55;">
                      💡 <strong>Dica do Anfitrião:</strong> Por ser um chalé exclusivo para apenas um grupo de hóspedes por vez, as datas para fins de semana e feriados religiosos (como a Festa da Padroeira) costumam ser bastante concorridas. Se você já tem uma data planejada, recomendamos reservar com antecedência para garantir seu refúgio!
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Rodapé Completo e Confiável -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; color: #334155; font-size: 14px; font-weight: 700;">
                Chalé Recanto Camargo
              </p>
              <p style="margin: 0 0 14px 0; color: #64748b; font-size: 13px;">
                Aparecida - SP &bull; A poucos minutos da Basílica Nacional
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto;">
                <tr>
                  <td style="padding: 0 8px;">
                    <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #25d366; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 7px 16px; border-radius: 20px;">
                      WhatsApp do Anfitrião
                    </a>
                  </td>
                  <td style="padding: 0 8px;">
                    <a href="${frontendUrl}/#/" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 7px 16px; border-radius: 20px;">
                      Acessar Site Oficial
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #94a3b8; font-size: 11px; line-height: 1.4;">
                Você recebeu esta mensagem porque efetuou cadastro no site oficial do Recanto Camargo.<br>
                &copy; 2026 Recanto Camargo. Todos os direitos reservados.
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

function criarEmailCupomExclusivo(opcoes = {}) {
    const opts = (typeof opcoes === 'object' && opcoes !== null) ? opcoes : {};
    const nome = escaparHtml(opts.nome || 'Hóspede');
    const codigo = escaparHtml(opts.codigo || 'CUPOM');
    const tipo = opts.tipoDesconto === 'FIXO' ? 'FIXO' : 'PERCENTUAL';
    const valor = Number(opts.valorDesconto || 0);
    const descontoTexto = tipo === 'PERCENTUAL' ? `${valor}% OFF` : `R$ ${valor.toFixed(2)} OFF`;
    const validadeFormatada = opts.validoAte
        ? escaparHtml(new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date(opts.validoAte + 'T12:00:00')))
        : 'Tempo Limitado';
    const minimoNoites = Number(opts.minimoNoites) > 1 ? `${opts.minimoNoites} noites` : 'Sem estadia mínima';
    const valorMinimo = Number(opts.valorMinimo) > 0 ? `R$ ${Number(opts.valorMinimo).toFixed(2)}` : 'Sem valor mínimo';

    const frontendUrl = escaparHtml((opts.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''));
    const logoUrl = escaparHtml(opts.logoUrl || process.env.LOGO_URL || 'https://raw.githubusercontent.com/RafaelRizzoo/recanto-camargo/main/src/assets/img/artes/santa-navy.png');
    const whatsappUrl = escaparHtml(opts.whatsappUrl || 'https://wa.me/5512997193233?text=Ol%C3%A1!%20Recebi%20meu%20cupom%20exclusivo%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida.');

    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Você ganhou um cupom de desconto exclusivo! 🎁</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Cabeçalho Navy Premium com Logo (Opção 1 - Centralização Vertical Nobre) -->
          <tr>
            <td align="center" style="background-color: #1e3a5f; padding: 26px 20px; border-bottom: 3px solid #f59e0b;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto; text-align: center;">
                <tr>
                  <td align="center">
                    <img src="${logoUrl}" alt="Recanto Camargo" width="44" height="65" style="display: block; margin: 0 auto 10px auto; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; background-color: #1e3a5f;" />
                    <span style="display: block; color: #ffffff; font-size: 21px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; line-height: 1.2;">Recanto Camargo</span>
                    <span style="display: block; color: #cbd5e1; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-top: 5px;">Hospedagem Exclusiva &bull; Aparecida - SP</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo do E-mail -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              
              <!-- Badge Presente VIP -->
              <div style="margin-bottom: 20px;">
                <span style="display: inline-block; background-color: #fef3c7; color: #b45309; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; letter-spacing: 0.8px; text-transform: uppercase; border: 1px solid #fde68a;">
                  🎁 Presente Exclusivo para Você
                </span>
              </div>

              <!-- Título -->
              <h1 style="margin: 0 0 16px 0; color: #0f172a; font-size: 23px; font-weight: 800; line-height: 1.3;">
                Um desconto especial para sua próxima viagem a Aparecida!
              </h1>

              <!-- Texto de Acolhimento -->
              <p style="margin: 0 0 14px 0; color: #334155; font-size: 15px; line-height: 1.6;">
                Olá, <strong>${nome}</strong>! Preparamos uma condição exclusiva e imperdível para que você e sua família venham viver dias inesquecíveis de fé, descanso e aconchego no <strong>Recanto Camargo</strong>.
              </p>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Você foi contemplado(a) com um cupom nominal e intransferível, pronto para ser utilizado na sua próxima reserva.
              </p>

              <!-- Voucher / Cupom Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: #fffbeb; border: 2px dashed #f59e0b; border-radius: 14px; text-align: center; overflow: hidden;">
                <tr>
                  <td style="padding: 24px 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                      Seu Código de Desconto Exclusivo
                    </div>
                    <div style="display: inline-block; background-color: #ffffff; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 24px; font-size: 26px; font-weight: 900; letter-spacing: 3px; color: #1e3a5f; margin-bottom: 12px; font-family: monospace;">
                      ${codigo}
                    </div>
                    <div style="font-size: 20px; font-weight: 800; color: #b45309; margin-bottom: 6px;">
                      ${descontoTexto}
                    </div>
                    <div style="font-size: 13px; color: #78350f;">
                      Válido até <strong>${validadeFormatada}</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Regras e Condições do Cupom -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 22px 0; border: 1px solid #cbd5e1; border-radius: 10px; border-collapse: separate; border-spacing: 0; overflow: hidden; background-color: #f8fafc;">
                <thead>
                  <tr>
                    <th colspan="2" align="left" style="padding: 10px 16px; background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
                      📋 Regras de Utilização
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 9px 16px; color: #64748b; font-size: 13px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">Titular Elegível</td>
                    <td style="padding: 9px 16px; color: #0f172a; font-size: 13px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${nome} (Intransferível)</td>
                  </tr>
                  <tr>
                    <td style="padding: 9px 16px; color: #64748b; font-size: 13px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">Estadia Mínima</td>
                    <td style="padding: 9px 16px; color: #0f172a; font-size: 13px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${minimoNoites}</td>
                  </tr>
                  <tr>
                    <td style="padding: 9px 16px; color: #64748b; font-size: 13px; font-weight: 500;">Valor Mínimo da Estadia</td>
                    <td style="padding: 9px 16px; color: #0f172a; font-size: 13px; text-align: right; font-weight: 600;">${valorMinimo}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Botão CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="${frontendUrl}/#/Reserva" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #e65100 0%, #f57c00 100%); background-color: #e65100; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 15px 36px; border-radius: 30px; box-shadow: 0 4px 16px rgba(230, 81, 0, 0.35); text-align: center; letter-spacing: 0.3px;">
                      Aproveitar Meu Desconto &amp; Reservar Agora →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Dica de Como Usar -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 1px solid #dcfce7; border-left: 4px solid #16a34a; border-radius: 8px; margin: 20px 0 6px 0;">
                <tr>
                  <td style="padding: 12px 14px;">
                    <p style="margin: 0; color: #166534; font-size: 13px; line-height: 1.5;">
                      💡 <strong>Como aplicar:</strong> Na tela de reserva, basta digitar o código <strong>${codigo}</strong> no campo de cupom antes de confirmar sua reserva para que o desconto seja aplicado automaticamente no valor total da sua estadia.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background-color: #f8fafc; padding: 22px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; color: #334155; font-size: 14px; font-weight: 700;">
                Chalé Recanto Camargo
              </p>
              <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px;">
                Aparecida - SP &bull; A poucos minutos da Basílica Nacional
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 14px auto;">
                <tr>
                  <td style="padding: 0 8px;">
                    <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #25d366; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 7px 16px; border-radius: 20px;">
                      WhatsApp do Anfitrião
                    </a>
                  </td>
                  <td style="padding: 0 8px;">
                    <a href="${frontendUrl}/#/" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 7px 16px; border-radius: 20px;">
                      Acessar Site Oficial
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #94a3b8; font-size: 11px; line-height: 1.4;">
                Você recebeu esta mensagem porque efetuou cadastro no site oficial do Recanto Camargo.<br>
                &copy; 2026 Recanto Camargo. Todos os direitos reservados.
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

module.exports = { criarServicoEmail, criarHtmlEmail, criarEmailBoasVindas, criarEmailCupomExclusivo, escaparHtml };
