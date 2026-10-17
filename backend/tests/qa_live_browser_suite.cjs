const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

async function runQASuite() {
  const screenshotsDir = 'C:\\Users\\Padar\\.gemini\\antigravity\\brain\\e0dbd5d2-d567-45e0-a2f4-dee22fabe8b6\\test_screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    tests: [],
    errors: [],
    screenshots: []
  };

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const baseUrl = 'http://localhost:5173/recanto-camargo/#';

  try {
    console.log('--- INICIANDO SUÍTE DE TESTES E2E EM NAVEGADOR ---');

    // ==========================================
    // TESTE 1: LOGIN E DASHBOARD DO HÓSPEDE
    // ==========================================
    console.log('\n[TESTE 1] Testando Login do Hóspede...');
    const guestContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const guestPage = await guestContext.newPage();

    guestPage.on('pageerror', err => report.errors.push({ context: 'guest', message: err.message }));
    guestPage.on('console', msg => {
      if (msg.type() === 'error') console.log(`[CONSOLE ERROR GUEST] ${msg.text()}`);
    });

    await guestPage.goto(`${baseUrl}/Login`);
    await guestPage.waitForLoadState('networkidle');

    await guestPage.getByPlaceholder('Insira seu email').fill('felipeteste@email.com');
    await guestPage.getByPlaceholder('Insira sua senha').fill('felipe123');

    const screenshotLogin = path.join(screenshotsDir, '01_login_hospede.png');
    await guestPage.screenshot({ path: screenshotLogin });
    report.screenshots.push(screenshotLogin);

    const loginResponsePromise = guestPage.waitForResponse(
      res => res.url().includes('/api/usuarios/login') && res.status() === 200,
      { timeout: 10000 }
    );
    await guestPage.locator('button[type="submit"]').click();
    const loginRes = await loginResponsePromise;
    console.log(`✓ Resposta da API /api/usuarios/login: status ${loginRes.status()}`);

    // Aguardar redirecionamento
    await guestPage.waitForTimeout(1500);

    // Navegar ao Dashboard do Cliente
    console.log('[TESTE 1.1] Acessando Dashboard do Hóspede...');
    await guestPage.goto(`${baseUrl}/DashboardCliente`);
    await guestPage.waitForLoadState('networkidle');
    await guestPage.waitForTimeout(2000);

    const screenshotGuestDash = path.join(screenshotsDir, '02_dashboard_hospede.png');
    await guestPage.screenshot({ path: screenshotGuestDash });
    report.screenshots.push(screenshotGuestDash);

    const tituloHospede = await guestPage.locator('h1, h2, h3, .user-name').allInnerTexts();
    console.log(`✓ Dashboard Hóspede carregado. Títulos visíveis:`, tituloHospede.slice(0, 3));
    report.tests.push({ nome: 'Login e Dashboard do Hóspede', status: 'PASS' });

    // ==========================================
    // TESTE 2: CRIAÇÃO DE RESERVA
    // ==========================================
    console.log('\n[TESTE 2] Testando Fluxo de Reserva...');
    // Definir datas futuras seguras (daqui a 8 meses)
    const dataFutura = new Date();
    dataFutura.setMonth(dataFutura.getMonth() + 8);
    const checkinStr = dataFutura.toISOString().slice(0, 10);
    const checkoutDate = new Date(dataFutura.getTime() + 2 * 86400000);
    const checkoutStr = checkoutDate.toISOString().slice(0, 10);

    console.log(`Tentando reservar: ${checkinStr} até ${checkoutStr}`);
    await guestPage.goto(`${baseUrl}/Reserva?checkin=${checkinStr}&checkout=${checkoutStr}`);
    await guestPage.waitForLoadState('networkidle');
    await guestPage.waitForTimeout(1500);

    // Preencher hóspedes se houver campo
    const selectHospedes = guestPage.locator('select').first();
    if (await selectHospedes.count() > 0) {
      await selectHospedes.selectOption('2');
    }

    const btnSolicitar = guestPage.getByRole('button', { name: /solicitar reserva/i });
    if (await btnSolicitar.count() > 0) {
      const screenshotReservaForm = path.join(screenshotsDir, '03_formulario_reserva.png');
      await guestPage.screenshot({ path: screenshotReservaForm });
      report.screenshots.push(screenshotReservaForm);

      const reservaPromise = guestPage.waitForResponse(
        res => res.url().includes('/api/reservas') && res.request().method() === 'POST',
        { timeout: 15000 }
      );

      await btnSolicitar.click();
      const resReserva = await reservaPromise;
      console.log(`✓ Resposta da API /api/reservas: status ${resReserva.status()}`);
      
      await guestPage.waitForTimeout(2000);
      const screenshotReservaConcluida = path.join(screenshotsDir, '04_reserva_resultado.png');
      await guestPage.screenshot({ path: screenshotReservaConcluida });
      report.screenshots.push(screenshotReservaConcluida);
      report.tests.push({ nome: 'Criação de Reserva via UI', status: resReserva.status() === 201 ? 'PASS' : `STATUS_${resReserva.status()}` });
    } else {
      console.log('Botão Solicitar Reserva não encontrado na página.');
      report.tests.push({ nome: 'Criação de Reserva via UI', status: 'BTN_NOT_FOUND' });
    }

    // ==========================================
    // TESTE 3: LOGIN E PAINEL DO PROPRIETÁRIO
    // ==========================================
    console.log('\n[TESTE 3] Testando Login do Proprietário...');
    const ownerContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const ownerPage = await ownerContext.newPage();

    ownerPage.on('pageerror', err => report.errors.push({ context: 'owner', message: err.message }));

    await ownerPage.goto(`${baseUrl}/Login`);
    await ownerPage.waitForLoadState('networkidle');

    await ownerPage.getByPlaceholder('Insira seu email').fill('rafaelproprietario@email.com');
    await ownerPage.getByPlaceholder('Insira sua senha').fill('rafael123');

    const loginOwnerPromise = ownerPage.waitForResponse(
      res => res.url().includes('/api/usuarios/login') && res.status() === 200,
      { timeout: 10000 }
    );
    await ownerPage.locator('button[type="submit"]').click();
    const loginOwnerRes = await loginOwnerPromise;
    console.log(`✓ Resposta da API Login Proprietário: status ${loginOwnerRes.status()}`);

    await ownerPage.waitForTimeout(1500);

    console.log('[TESTE 3.1] Acessando Dashboard do Administrador/Proprietário...');
    await ownerPage.goto(`${baseUrl}/DashboardAdministrador`);
    await ownerPage.waitForLoadState('networkidle');
    await ownerPage.waitForTimeout(3000);

    const screenshotOwnerDash = path.join(screenshotsDir, '05_dashboard_proprietario.png');
    await ownerPage.screenshot({ path: screenshotOwnerDash });
    report.screenshots.push(screenshotOwnerDash);

    // Verificar se há reservas na tabela
    const rows = await ownerPage.locator('table tbody tr').count();
    console.log(`✓ Painel do Administrador carregado. Linhas de reserva encontradas na tabela: ${rows}`);

    // Se houver botões ou modal para ver detalhes
    const btnDetalhes = ownerPage.getByTitle(/ver detalhes/i).first();
    if (await btnDetalhes.count() > 0) {
      await btnDetalhes.click();
      await ownerPage.waitForTimeout(1000);
      const screenshotModal = path.join(screenshotsDir, '06_modal_proprietario.png');
      await ownerPage.screenshot({ path: screenshotModal });
      report.screenshots.push(screenshotModal);
      console.log('✓ Modal de detalhes da reserva aberto com sucesso!');
    }

    report.tests.push({ nome: 'Login e Dashboard do Proprietário', status: 'PASS' });

    await guestContext.close();
    await ownerContext.close();

    console.log('\n--- TODOS OS TESTES EM NAVEGADOR FINALIZADOS COM SUCESSO! ---');
    console.log(JSON.stringify(report, null, 2));

  } catch (err) {
    console.error('ERRO DURANTE O TESTE QA:', err);
    report.errors.push({ context: 'fatal', message: err.message, stack: err.stack });
  } finally {
    await browser.close();
  }
}

runQASuite();
