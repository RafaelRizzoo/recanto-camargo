const test = require('node:test');
const assert = require('node:assert/strict');
const { listarOrigensPermitidas, criarVerificadorOrigem, opcoesCookieSessao } = require('../utils/configuracaoWeb');

test('CORS: sem configuração, libera somente o front local de desenvolvimento', () => {
    assert.deepEqual(listarOrigensPermitidas({}), ['http://localhost:5173']);
});

test('CORS: usa CORS_ORIGINS, aceita várias origens e ignora caminho e hash da URL', () => {
    const origens = listarOrigensPermitidas({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://rafaelrizzoo.github.io/recanto-camargo/#, https://recanto.exemplo.com.br'
    });
    assert.deepEqual(origens, ['https://rafaelrizzoo.github.io', 'https://recanto.exemplo.com.br']);
});

test('CORS: em produção não libera localhost por padrão', () => {
    const verificar = criarVerificadorOrigem({ NODE_ENV: 'production', CORS_ORIGINS: 'https://recanto.exemplo.com.br' });
    let liberado;
    verificar('http://localhost:5173', (_erro, ok) => { liberado = ok; });
    assert.equal(liberado, false);
    verificar('https://recanto.exemplo.com.br', (_erro, ok) => { liberado = ok; });
    assert.equal(liberado, true);
    verificar(undefined, (_erro, ok) => { liberado = ok; });
    assert.equal(liberado, true);
});

test('Cookie: em desenvolvimento usa sameSite=lax sem exigir HTTPS', () => {
    assert.deepEqual(opcoesCookieSessao({}), { httpOnly: true, secure: false, sameSite: 'lax' });
});

test('Cookie: em produção é secure e sameSite=none por padrão (site e API em domínios diferentes)', () => {
    assert.deepEqual(opcoesCookieSessao({ NODE_ENV: 'production' }), { httpOnly: true, secure: true, sameSite: 'none' });
});

test('Cookie: COOKIE_SAMESITE=lax em produção mantém secure e troca o sameSite', () => {
    assert.deepEqual(opcoesCookieSessao({ NODE_ENV: 'production', COOKIE_SAMESITE: 'lax' }), { httpOnly: true, secure: true, sameSite: 'lax' });
});

test('Cookie: sameSite=none nunca fica sem secure (o navegador recusaria o cookie)', () => {
    const opcoes = opcoesCookieSessao({ COOKIE_SAMESITE: 'none' });
    assert.equal(opcoes.secure, true);
});
