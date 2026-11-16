process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

let estado = { consultas: [] };
const bancoMock = {
    async getConnection() { return this; },
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    destroy() {},
    async query(sql, parametros = []) {
        estado.consultas.push({ sql, parametros });
        const texto = sql.replace(/\s+/g, ' ').trim();
        if (texto.startsWith('SELECT r.Res_Id')) {
            return [[{
                Res_Id: 1,
                Res_ValorTotal: '450.00',
                Res_Status: 'PENDENTE',
                Hos_Hospede_Usu_Id: 41,
                Usu_Nome: 'Hospede Teste',
                Usu_Email: 'hospede@teste.com'
            }]];
        }
        if (texto.startsWith('SELECT * FROM pag_pagamento')) {
            return [[]];
        }
        if (texto.startsWith('INSERT INTO pag_pagamento')) {
            return [{ insertId: 10 }];
        }
        if (texto.startsWith('SELECT Hos_Hospede_Usu_Id, Res_Status FROM res_reserva')) {
            return [[{ Hos_Hospede_Usu_Id: 41, Res_Status: 'PENDENTE' }]];
        }
        return [[]];
    }
};

const caminhoDb = require.resolve('../config/db');
const dbAnterior = require.cache[caminhoDb];
require.cache[caminhoDb] = { id: caminhoDb, filename: caminhoDb, loaded: true, exports: bancoMock };

const app = require('../server');

if (dbAnterior) require.cache[caminhoDb] = dbAnterior;
else delete require.cache[caminhoDb];

let servidor;
let base;
const JWT_TEST = process.env.JWT_SECRET || 'segredo-de-teste-local';

test.before(async () => {
    servidor = await new Promise(resolve => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    base = `http://127.0.0.1:${servidor.address().port}`;
});

test.after(async () => {
    await new Promise(resolve => servidor.close(resolve));
});

function cookie(id = 41, tipo = 'hospede') {
    return `token=${jwt.sign({ id, tipo }, JWT_TEST, { expiresIn: '5m' })}`;
}

test('Pagamento: recusa criação de preferência sem autenticação (401)', async () => {
    const res = await fetch(`${base}/api/pagamentos/criar-preferencia/999`, {
        method: 'POST'
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.match(data.error, /Acesso negado/);
});

test('Pagamento: recusa consulta de status sem autenticação (401)', async () => {
    const res = await fetch(`${base}/api/pagamentos/status/999`, {
        method: 'GET'
    });
    assert.equal(res.status, 401);
});

test('Pagamento: rejeita ID de reserva não numérico (400)', async () => {
    const res = await fetch(`${base}/api/pagamentos/criar-preferencia/abc`, {
        method: 'POST',
        headers: { Cookie: cookie(41) }
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /inválido/i);
});

test('Pagamento: webhook responde 200 OK mesmo para eventos sem dados', async () => {
    const res = await fetch(`${base}/api/pagamentos/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test' })
    });
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.equal(text, 'OK');
});

test('Pagamento: consulta status de reserva com autenticação do hóspede titular (200)', async () => {
    const res = await fetch(`${base}/api/pagamentos/status/1`, {
        method: 'GET',
        headers: { Cookie: cookie(41) }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.temPagamento, false);
    assert.equal(data.reservaStatus, 'PENDENTE');
});

test('Pagamento: impede consulta de status por hóspede que não seja o dono da reserva (403)', async () => {
    const res = await fetch(`${base}/api/pagamentos/status/1`, {
        method: 'GET',
        headers: { Cookie: cookie(999) }
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /Acesso negado/);
});

// ---- Assinatura do webhook (x-signature) ----
const crypto = require('node:crypto');
const { validarAssinaturaWebhook } = require('../services/mercadoPagoService');

function assinar(segredo, { dataId, requestId, ts }) {
    const manifesto = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
    return crypto.createHmac('sha256', segredo).update(manifesto).digest('hex');
}

test('Webhook: aceita assinatura HMAC válida', () => {
    const v1 = assinar('segredo-teste', { dataId: 'ABC123', requestId: 'req-1', ts: '1700000000' });
    const r = validarAssinaturaWebhook(
        { headers: { 'x-signature': `ts=1700000000,v1=${v1}`, 'x-request-id': 'req-1' }, query: { 'data.id': 'ABC123' } },
        'segredo-teste'
    );
    assert.equal(r.valida, true);
});

test('Webhook: rejeita assinatura adulterada, id trocado ou segredo errado', () => {
    const v1 = assinar('segredo-teste', { dataId: '123', requestId: 'req-1', ts: '1700000000' });
    const headers = { 'x-signature': `ts=1700000000,v1=${v1}`, 'x-request-id': 'req-1' };
    assert.equal(validarAssinaturaWebhook({ headers, query: { 'data.id': '999' } }, 'segredo-teste').valida, false);
    assert.equal(validarAssinaturaWebhook({ headers, query: { 'data.id': '123' } }, 'outro-segredo').valida, false);
    assert.equal(validarAssinaturaWebhook({ headers: {}, query: { 'data.id': '123' } }, 'segredo-teste').motivo, 'assinatura_ausente');
});

test('Webhook: sem segredo configurado a validação falha de forma explícita', () => {
    assert.equal(validarAssinaturaWebhook({ headers: {}, query: {} }, '').motivo, 'segredo_nao_configurado');
});

test('Webhook: com segredo configurado, requisição sem assinatura é rejeitada (401)', async () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'segredo-teste';
    try {
        const res = await fetch(`${base}/api/pagamentos/webhook?type=payment&data.id=123`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'payment', data: { id: '123' } })
        });
        assert.equal(res.status, 401);
    } finally {
        delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    }
});
