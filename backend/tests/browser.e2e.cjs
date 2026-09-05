const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { criarAmbienteMySQL } = require('./support/mysql-harness');

async function main() {
  process.env.QA_API_PORT = '3000';
  const qa = await criarAmbienteMySQL();
  let browser;
  const resultados = [];
  const capturas = fs.mkdtempSync(path.join(os.tmpdir(), 'recanto-notificacoes-qa-'));
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const guestContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const ownerContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const guest = await guestContext.newPage();
    const owner = await ownerContext.newPage();
    const erros = [];
    for (const page of [guest, owner]) page.on('pageerror', erro => erros.push(erro.message));
    const base = 'http://localhost:5173/recanto-camargo/#';
    async function login(page, id) {
      await page.goto(`${base}/Login`);
      await page.getByPlaceholder('Insira seu email').fill(`qa${id}@example.invalid`);
      await page.getByPlaceholder('Insira sua senha').fill(qa.senha);
      const respostaLogin = page.waitForResponse(r => r.url().endsWith('/api/usuarios/login'));
      await page.locator('button[type="submit"]').click();
      assert.equal((await respostaLogin).status(), 200);
      await page.waitForURL(url => url.hash === '#/');
      await page.goto(`${base}/${id === 1 ? 'DashboardAdministrador' : 'DashboardCliente'}`);
      await page.locator('.notif-sino').waitFor();
    }
    await login(guest, 2);
    await login(owner, 1);
    console.log('QA: login dos dois papéis concluído.');
    await owner.locator('.notif-sino').click();
    await owner.getByText('Nenhuma notificação', { exact: true }).waitFor();
    assert.equal(await owner.getByRole('button', { name: /^Aprovar/ }).count(), 0);
    assert.equal(await owner.getByRole('button', { name: /^Recusar/ }).count(), 0);
    const futura = new Date();
    futura.setUTCFullYear(futura.getUTCFullYear() + 1);
    const entrada = futura.toISOString().slice(0, 10);
    const saida = new Date(futura.getTime() + 86400000).toISOString().slice(0, 10);
    await guest.goto(`${base}/Reserva?checkin=${entrada}&checkout=${saida}`);
    await guest.locator('select').first().selectOption('2');
    const reservaResponse = guest.waitForResponse(r => r.url().endsWith('/api/reservas') && r.request().method() === 'POST');
    await guest.getByRole('button', { name: 'Confirmar Reserva', exact: true }).click();
    assert.equal((await reservaResponse).status(), 201);
    await guest.waitForURL(/ReservaConcluida/);
    console.log('QA: reserva confirmada pela interface.');
    const inicioPolling = performance.now();
    await owner.locator('.notif-titulo-item').filter({ hasText: 'Nova reserva' }).waitFor({ timeout: 20000 });
    await owner.locator('table').getByText('Hóspede QA', { exact: true }).waitFor();
    resultados.push({ teste: 'reserva pela UI + aviso do proprietário via polling', ms: Math.round(performance.now() - inicioPolling) });
    await guest.goto(`${base}/DashboardCliente`);
    await guest.locator('.notif-sino').click();
    await guest.locator('.notif-titulo-item').filter({ hasText: 'Reserva confirmada' }).waitFor();
    assert.equal(await guest.evaluate(() => localStorage.getItem('recanto_notificacoes')), null);
    await guest.getByRole('button', { name: 'Reserva confirmada. Marcar como lida' }).press('Enter');
    await guest.waitForFunction(() => !document.querySelector('.notif-dot'));
    await guest.reload();
    await guest.locator('.notif-sino').click();
    await guest.locator('.notif-titulo-item').waitFor();
    assert.equal(await guest.locator('.notif-dot').count(), 0);
    const secondContext = await browser.newContext();
    const secondGuest = await secondContext.newPage();
    await login(secondGuest, 2);
    await secondGuest.locator('.notif-sino').click();
    await secondGuest.locator('.notif-titulo-item').waitFor();
    assert.equal(await secondGuest.locator('.notif-dot').count(), 0);
    resultados.push({ teste: 'persistência de leitura após refresh e em navegador/contexto independente', ok: true });
    await secondContext.close();
    console.log('QA: persistência entre contextos concluída.');

    for (const [papel, page] of [['hospede', guest], ['proprietario', owner]]) {
      for (const [width, height] of [[320, 568], [375, 667], [768, 1024], [1366, 768], [1920, 1080], [3840, 2160], [667, 375]]) {
        await page.setViewportSize({ width, height });
        if (await page.locator('.notif-sino').getAttribute('aria-expanded') !== 'true') await page.locator('.notif-sino').click();
        await page.waitForTimeout(280);
        const medidas = await page.locator('.notif-dropdown').evaluate(el => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, scroll: document.documentElement.scrollWidth, largura: innerWidth };
        });
        assert.ok(medidas.x >= 0 && medidas.right <= width + 1, `${papel} dropdown fora da largura ${width}: ${JSON.stringify(medidas)}`);
        assert.ok(medidas.y >= 0 && medidas.bottom <= height + 1, `${papel} dropdown fora da altura ${height}: ${JSON.stringify(medidas)}`);
        resultados.push({ teste: 'responsividade', papel, width, height, overflowPagina: medidas.scroll > width + 1 });
        if ([375, 1366].includes(width)) await page.screenshot({ path: path.join(capturas, `${papel}-${width}.png`) });
      }
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.notif-dropdown').count(), 0);
      assert.equal(await page.locator('.notif-sino').evaluate(el => el === document.activeElement), true);
    }

    await guest.setViewportSize({ width: 1366, height: 900 });
    await guest.route('**/api/notificacoes', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Teste indisponível"}' }), { times: 1 });
    await guest.locator('.notif-sino').click();
    await guest.getByRole('alert').waitFor();
    await guest.getByRole('button', { name: 'Tentar novamente' }).click();
    await guest.getByRole('alert').waitFor({ state: 'detached' });
    resultados.push({ teste: 'falha de rede/API mostra erro e permite recuperar', ok: true });
    let requisicoes = 0;
    guest.on('request', req => { if (req.url().endsWith('/api/notificacoes')) requisicoes += 1; });
    await guest.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    const antes = requisicoes;
    await guest.waitForTimeout(16000);
    assert.equal(requisicoes, antes);
    await guest.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    await guest.waitForResponse(r => r.url().endsWith('/api/notificacoes'));
    resultados.push({ teste: 'polling pausado em aba oculta e retorno imediato', ok: true });
    await qa.admin.query('UPDATE usu_usuario SET Usu_Status = ? WHERE Usu_Id = ?', ['BLOQUEADO', 2]);
    await guest.evaluate(() => window.dispatchEvent(new Event('focus')));
    await guest.getByRole('alert').waitFor();
    assert.equal(await guest.locator('.notif-titulo-item').count(), 0);
    assert.equal(await guest.getByRole('button', { name: 'Tentar novamente' }).count(), 0);
    resultados.push({ teste: 'conta bloqueada perde cache de notificações', ok: true });
    assert.deepEqual(erros, []);
    console.log(JSON.stringify({ resultados, errosJavascript: erros, screenshots: capturas }, null, 2));
  } finally {
    if (browser) await browser.close();
    await qa.fechar();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
