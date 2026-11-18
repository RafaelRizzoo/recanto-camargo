process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste-local';
process.env.MERCADO_PAGO_PUBLIC_KEY = 'TEST-public-key-fake';
process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-token-secreto-que-nao-pode-vazar';
process.env.BACKEND_URL = 'https://api.exemplo.com';
delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

// ---- Estado controlável pelos testes ----
let estado;
function resetar() {
    estado = {
        consultas: [],
        chamadasMP: [],
        respostaMP: null,
        erroMP: null,
        pagamentoExistente: null,
        statusReserva: 'PAGAMENTO_PENDENTE',
        valorReserva: '450.00',
        affectedRows: 1,
        statusAtualDb: 'PAGAMENTO_PENDENTE',
        reembolsos: [],
        erroReembolso: null,
        pagAnterior: null,
        statusRelido: null,
        rollbacks: 0,
        pagParaCancelar: null,
        checkinCancelamento: new Date(Date.now() + 30 * 24 * 3600 * 1000)
    };
}
resetar();

const bancoMock = {
    async getConnection() { return this; },
    async beginTransaction() {},
    async commit() {},
    async rollback() { estado.rollbacks++; },
    release() {},
    destroy() {},
    async query(sql, parametros = []) {
        estado.consultas.push({ sql: sql.replace(/\s+/g, ' ').trim(), parametros });
        const texto = sql.replace(/\s+/g, ' ').trim();
        if (texto.startsWith('SELECT r.Res_Id')) {
            return [[{
                Res_Id: 1,
                Res_ValorTotal: estado.valorReserva,
                Res_Status: estado.statusReserva,
                Hos_Hospede_Usu_Id: 41,
                Usu_Nome: 'Hospede Teste',
                Usu_Email: 'hospede@teste.com'
            }]];
        }
        if (texto.startsWith('SELECT * FROM pag_pagamento')) {
            return [estado.pagamentoExistente ? [estado.pagamentoExistente] : []];
        }
        if (texto.startsWith('SELECT Res_ValorTotal')) {
            return [[{ Res_ValorTotal: estado.valorReserva, Res_Status: estado.statusAtualDb }]];
        }
        if (texto.startsWith('SELECT Pag_Status, Pag_TransacaoId FROM pag_pagamento')) {
            return [estado.pagAnterior ? [estado.pagAnterior] : []];
        }
        if (texto.startsWith('SELECT Pag_Id FROM pag_pagamento')) {
            return [[]];
        }
        if (texto.startsWith('SELECT r.Res_Status, r.Hos_Hospede_Usu_Id')) {
            return [[{
                Res_Status: 'PAGAMENTO_PENDENTE',
                Hos_Hospede_Usu_Id: 41,
                Res_ValorTotal: estado.valorReserva,
                hospedeNome: 'Hospede Teste',
                hospedeEmail: 'hospede@teste.com',
                Pro_Proprietario_Usu_Id: 7,
                proprietarioEmail: 'dono@teste.com'
            }]];
        }
        if (texto.startsWith('SELECT Res_Status FROM res_reserva')) {
            return [estado.statusRelido ? [{ Res_Status: estado.statusRelido }] : []];
        }
        if (texto.startsWith('SELECT Res_Status, Imo_Id')) {
            return [[{
                Res_Status: 'CONFIRMADA',
                Imo_Id: 1,
                Res_DataCheckIn: estado.checkinCancelamento,
                Res_DataCheckOut: new Date(estado.checkinCancelamento.getTime() + 2 * 24 * 3600 * 1000),
                Res_ValorTotal: estado.valorReserva
            }]];
        }
        if (texto.startsWith('SELECT Pag_Id, Pag_Status, Pag_Valor')) {
            return [estado.pagParaCancelar ? [estado.pagParaCancelar] : []];
        }
        if (texto.startsWith('UPDATE res_reserva SET Res_Status')) {
            return [{ affectedRows: estado.affectedRows }];
        }
        if (texto.startsWith('INSERT')) {
            return [{ insertId: 10, affectedRows: 1 }];
        }
        return [[]];
    }
};

// ---- Mock do banco e do SDK do Mercado Pago (nenhuma chamada de rede) ----
const caminhoDb = require.resolve('../config/db');
const caminhoMP = require.resolve('../services/mercadoPagoService');
const dbAnterior = require.cache[caminhoDb];
const mpAnterior = require.cache[caminhoMP];

const mpReal = require('../services/mercadoPagoService');
require.cache[caminhoDb] = { id: caminhoDb, filename: caminhoDb, loaded: true, exports: bancoMock };
require.cache[caminhoMP] = {
    id: caminhoMP,
    filename: caminhoMP,
    loaded: true,
    exports: {
        ...mpReal,
        async reembolsarPagamento(paymentId, valor) {
            estado.reembolsos.push({ paymentId, valor });
            if (estado.erroReembolso) throw estado.erroReembolso;
            return { id: 'REF-1' };
        },
        async criarPagamento(body, idempotencyKey) {
            estado.chamadasMP.push({ body, idempotencyKey });
            if (estado.erroMP) throw estado.erroMP;
            return estado.respostaMP;
        }
    }
};

const app = require('../server');
const controller = require('../controllers/pagamentoController');

if (dbAnterior) require.cache[caminhoDb] = dbAnterior; else delete require.cache[caminhoDb];
if (mpAnterior) require.cache[caminhoMP] = mpAnterior; else delete require.cache[caminhoMP];

let servidor;
let base;

test.before(async () => {
    servidor = await new Promise(resolve => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(async () => {
    await new Promise(resolve => servidor.close(resolve));
});
test.beforeEach(() => resetar());

function cookie(id = 41, tipo = 'hospede') {
    return `token=${jwt.sign({ id, tipo }, process.env.JWT_SECRET, { expiresIn: '5m' })}`;
}

function processar(formData, usuario = 41, reservaId = 1) {
    return fetch(`${base}/api/pagamentos/processar/${reservaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie(usuario) },
        body: JSON.stringify({ formData })
    });
}

const formCartao = (extra = {}) => ({
    token: 'tok_abc123',
    issuer_id: '24',
    payment_method_id: 'elo',
    installments: 3,
    payer: { email: 'pagador@teste.com', identification: { type: 'CPF', number: '123.456.789-09' } },
    ...extra
});

// ---- Rota: POST /processar/:reservaId ----

test('processar: cartão aprovado confirma a reserva, grava valor real e método pelo payment_type_id', async () => {
    estado.respostaMP = { id: 777, status: 'approved', transaction_amount: 450, payment_type_id: 'credit_card', payment_method_id: 'elo' };

    const res = await processar(formCartao());
    assert.equal(res.status, 200);
    const dados = await res.json();
    assert.equal(dados.status, 'approved');
    assert.equal(dados.reservaId, 1);

    const insertPag = estado.consultas.find(c => c.sql.startsWith('INSERT INTO pag_pagamento'));
    assert.ok(insertPag, 'deve gravar o pagamento');
    assert.equal(insertPag.parametros[1], 'CARTAO_CREDITO', 'elo é credit_card, não PIX');
    assert.equal(insertPag.parametros[2], 'APROVADO');
    assert.equal(insertPag.parametros[3], 450, 'Pag_Valor real, não 0');
    assert.equal(insertPag.parametros[4], '777');
    assert.ok(estado.consultas.some(c => c.sql.startsWith('UPDATE res_reserva SET Res_Status')), 'deve confirmar a reserva');
});

test('processar: valor adulterado no body é ignorado — a cobrança usa o valor do banco', async () => {
    estado.respostaMP = { id: 778, status: 'approved', transaction_amount: 450, payment_type_id: 'credit_card' };

    const res = await processar(formCartao({ transaction_amount: 1, external_reference: '999', notification_url: 'https://evil.example/hook' }));
    assert.equal(res.status, 200);

    const { body } = estado.chamadasMP[0];
    assert.equal(body.transaction_amount, 450);
    assert.equal(body.external_reference, '1');
    assert.equal(body.notification_url, 'https://api.exemplo.com/api/pagamentos/webhook');
    assert.equal(body.token, 'tok_abc123');
    assert.equal(body.installments, 3);
    assert.deepEqual(body.payer.identification, { type: 'CPF', number: '12345678909' });
});

test('processar: pagamento aprovado com valor diferente do banco não confirma a reserva', async () => {
    estado.respostaMP = { id: 779, status: 'approved', transaction_amount: 10, payment_type_id: 'credit_card' };

    const res = await processar(formCartao());
    assert.equal(res.status, 502);
    assert.ok(!estado.consultas.some(c => c.sql.startsWith('UPDATE res_reserva SET Res_Status')));
    // SEC-006: o valor cobrado a mais/menos volta ao cliente em vez de ficar retido
    assert.deepEqual(estado.reembolsos, [{ paymentId: 779, valor: undefined }]);
    assert.match((await res.json()).error, /estornado/i);
});

test('processar: cartão recusado devolve mensagem amigável (402) sem vazar status_detail', async () => {
    estado.respostaMP = { id: 780, status: 'rejected', status_detail: 'cc_rejected_insufficient_amount', payment_type_id: 'credit_card' };

    const res = await processar(formCartao());
    assert.equal(res.status, 402);
    const texto = await res.text();
    assert.match(texto, /saldo|limite/i);
    assert.doesNotMatch(texto, /cc_rejected/);

    const gravacao = estado.consultas.find(c => c.sql.startsWith('INSERT INTO pag_pagamento'));
    assert.equal(gravacao.parametros[2], 'RECUSADO');
    assert.ok(!estado.consultas.some(c => c.sql.startsWith('UPDATE res_reserva SET Res_Status')));
});

test('processar: motivo de recusa desconhecido cai numa mensagem genérica', async () => {
    estado.respostaMP = { id: 781, status: 'rejected', status_detail: 'motivo_novo_qualquer', payment_type_id: 'credit_card' };
    const res = await processar(formCartao());
    assert.equal(res.status, 402);
    const dados = await res.json();
    assert.match(dados.error, /não aprovado/i);
});

test('processar: Pix pendente devolve QR Code, copia-e-cola, link e validade; envia expiração e não envia token', async () => {
    estado.respostaMP = {
        id: 900,
        status: 'pending',
        status_detail: 'pending_waiting_transfer',
        payment_type_id: 'bank_transfer',
        payment_method_id: 'pix',
        date_of_expiration: '2026-11-16T12:31:00.000-03:00',
        point_of_interaction: { transaction_data: { qr_code: '000201PIXCOPIAECOLA', qr_code_base64: 'iVBORw0KGgo=', ticket_url: 'https://www.mercadopago.com.br/payments/900/ticket' } }
    };

    const res = await processar({ payment_method_id: 'pix', payer: { email: 'pagador@teste.com' } });
    assert.equal(res.status, 200);
    const dados = await res.json();
    assert.equal(dados.status, 'pending');
    assert.equal(dados.pix.qrCode, '000201PIXCOPIAECOLA');
    assert.equal(dados.pix.qrCodeBase64, 'iVBORw0KGgo=');
    assert.match(dados.pix.ticketUrl, /^https:\/\/www\.mercadopago\.com\.br/);
    assert.equal(dados.pix.expiraEm, '2026-11-16T12:31:00.000-03:00');

    const { body } = estado.chamadasMP[0];
    assert.match(body.date_of_expiration, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-03:00$/);
    const minutos = (new Date(body.date_of_expiration) - Date.now()) / 60000;
    assert.ok(minutos >= 30 && minutos <= 32, `validade do Pix fora do esperado: ${minutos}`);
    assert.equal(body.token, undefined);
    assert.equal(body.installments, undefined);

    const gravacao = estado.consultas.find(c => c.sql.startsWith('INSERT INTO pag_pagamento'));
    assert.equal(gravacao.parametros[1], 'PIX');
    assert.equal(gravacao.parametros[2], 'PENDENTE');
    assert.ok(!estado.consultas.some(c => c.sql.startsWith('UPDATE res_reserva SET Res_Status')), 'Pix pendente não confirma a reserva');
});

test('processar: reserva de outro hóspede é negada (403) e nada é cobrado', async () => {
    const res = await processar(formCartao(), 999);
    assert.equal(res.status, 403);
    assert.equal(estado.chamadasMP.length, 0);
});

test('processar: reserva já paga é recusada (400) e nada é cobrado', async () => {
    estado.pagamentoExistente = { Pag_Id: 5, Res_Id: 1, Pag_Status: 'APROVADO' };
    const res = await processar(formCartao());
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /já possui um pagamento aprovado/i);
    assert.equal(estado.chamadasMP.length, 0);
});

test('processar: reserva cancelada não recebe pagamento (400)', async () => {
    estado.statusReserva = 'CANCELADA';
    const res = await processar(formCartao());
    assert.equal(res.status, 400);
    assert.equal(estado.chamadasMP.length, 0);
});

test('processar: sem autenticação (401) e ID inválido (400)', async () => {
    const semLogin = await fetch(`${base}/api/pagamentos/processar/1`, { method: 'POST' });
    assert.equal(semLogin.status, 401);

    const idInvalido = await processar(formCartao(), 41, 'abc');
    assert.equal(idInvalido.status, 400);
});

test('processar: cartão sem token ou com parcelas inválidas é rejeitado (400) antes de chamar o Mercado Pago', async () => {
    const semToken = await processar(formCartao({ token: '' }));
    assert.equal(semToken.status, 400);
    const parcelas = await processar(formCartao({ installments: 99 }));
    assert.equal(parcelas.status, 400);
    const metodo = await processar(formCartao({ payment_method_id: '../etc/passwd' }));
    assert.equal(metodo.status, 400);
    assert.equal(estado.chamadasMP.length, 0);
});

test('processar: falha do Mercado Pago vira erro amigável sem vazar detalhes internos', async () => {
    estado.erroMP = Object.assign(new Error('Gateway de pagamento não configurado: adicione MERCADO_PAGO_ACCESS_TOKEN no .env.'), { status: 503 });
    const res = await processar(formCartao());
    assert.equal(res.status, 502);
    const texto = await res.text();
    assert.doesNotMatch(texto, /ACCESS_TOKEN|\.env/);
});

test('processar: idempotência — mesmo envio gera a mesma chave; outro cartão gera chave diferente', async () => {
    estado.respostaMP = { id: 801, status: 'approved', transaction_amount: 450, payment_type_id: 'credit_card' };
    await processar(formCartao());
    await processar(formCartao());
    await processar(formCartao({ token: 'tok_outro' }));

    const [a, b, c] = estado.chamadasMP.map(x => x.idempotencyKey);
    assert.ok(a && a.length >= 32);
    assert.equal(a, b);
    assert.notEqual(a, c);
});

// ---- Rota: GET /checkout/:reservaId ----

test('checkout: devolve valor do banco e chave pública, nunca o Access Token', async () => {
    const res = await fetch(`${base}/api/pagamentos/checkout/1`, { headers: { Cookie: cookie(41) } });
    assert.equal(res.status, 200);
    const texto = await res.text();
    const dados = JSON.parse(texto);
    assert.equal(dados.valor, 450);
    assert.equal(dados.publicKey, 'TEST-public-key-fake');
    assert.doesNotMatch(texto, /APP_USR-token-secreto/);

    const outro = await fetch(`${base}/api/pagamentos/checkout/1`, { headers: { Cookie: cookie(999) } });
    assert.equal(outro.status, 403);
});

// ---- Mapeamento de método e idempotência da confirmação ----

test('mapearMetodoBanco: usa payment_type_id e mantém compatibilidade com strings antigas', () => {
    const { mapearMetodoBanco } = controller;
    assert.equal(mapearMetodoBanco({ payment_type_id: 'credit_card', payment_method_id: 'elo' }), 'CARTAO_CREDITO');
    assert.equal(mapearMetodoBanco({ payment_type_id: 'credit_card', payment_method_id: 'hipercard' }), 'CARTAO_CREDITO');
    assert.equal(mapearMetodoBanco({ payment_type_id: 'credit_card', payment_method_id: 'amex' }), 'CARTAO_CREDITO');
    assert.equal(mapearMetodoBanco({ payment_type_id: 'bank_transfer', payment_method_id: 'pix' }), 'PIX');
    assert.equal(mapearMetodoBanco({ payment_type_id: 'ticket', payment_method_id: 'bolbradesco' }), 'BOLETO');
    assert.equal(mapearMetodoBanco('PIX'), 'PIX');
    assert.equal(mapearMetodoBanco('visa'), 'CARTAO_CREDITO');
    assert.equal(mapearMetodoBanco('bolbradesco'), 'BOLETO');
});

test('efetivarAprovacaoPagamento: processar a mesma aprovação duas vezes notifica uma única vez', async () => {
    const notificacoesCriadas = [];
    const appFalso = {
        get(nome) {
            if (nome === 'notificacoes') return { criarNotificacao: async (...args) => { notificacoesCriadas.push(args); } };
            return null;
        }
    };

    estado.affectedRows = 1; // primeiro processamento muda o status
    await controller.efetivarAprovacaoPagamento(1, 'MP-1', { payment_type_id: 'bank_transfer' }, appFalso);
    const aposPrimeira = notificacoesCriadas.length;
    assert.equal(aposPrimeira, 2, 'hóspede + proprietário');

    estado.affectedRows = 0; // segundo (webhook repetido) já encontra CONFIRMADA
    await controller.efetivarAprovacaoPagamento(1, 'MP-1', { payment_type_id: 'bank_transfer' }, appFalso);
    assert.equal(notificacoesCriadas.length, aposPrimeira, 'não pode duplicar notificações');
});

// ---- Reserva cancelada/recusada que recebe pagamento: não reconfirma, estorna ----

test('efetivar: pagamento aprovado para reserva CANCELADA não reconfirma e estorna o valor integral', async () => {
    estado.statusAtualDb = 'CANCELADA';
    const resultado = await controller.efetivarAprovacaoPagamento(1, 'MP-50', { payment_type_id: 'bank_transfer' }, null);

    assert.equal(resultado.confirmada, false);
    assert.equal(resultado.estornado, true);
    assert.deepEqual(estado.reembolsos, [{ paymentId: 'MP-50', valor: undefined }]);
    assert.ok(!estado.consultas.some(c => c.sql.startsWith('UPDATE res_reserva SET Res_Status')), 'não pode reconfirmar');

    const gravacao = estado.consultas.find(c => c.sql.startsWith('INSERT INTO pag_pagamento'));
    assert.equal(gravacao.parametros[2], 'REEMBOLSADO');
    assert.ok(estado.consultas.some(c => c.sql.startsWith('UPDATE pag_pagamento SET Pag_ValorReembolsado')));
});

test('efetivar: se o estorno automático falhar, o pagamento fica APROVADO para tratamento manual', async () => {
    estado.statusAtualDb = 'RECUSADA';
    estado.erroReembolso = new Error('falha no gateway');
    const resultado = await controller.efetivarAprovacaoPagamento(1, 'MP-51', { payment_type_id: 'bank_transfer' }, null);

    assert.equal(resultado.confirmada, false);
    assert.equal(resultado.estornado, false);
    const gravacao = estado.consultas.find(c => c.sql.startsWith('INSERT INTO pag_pagamento'));
    assert.equal(gravacao.parametros[2], 'APROVADO');
});

test('efetivar: notificação repetida de reserva cancelada não estorna duas vezes', async () => {
    estado.statusAtualDb = 'CANCELADA';
    estado.pagAnterior = { Pag_Status: 'REEMBOLSADO', Pag_TransacaoId: 'MP-52' };
    const resultado = await controller.efetivarAprovacaoPagamento(1, 'MP-52', { payment_type_id: 'bank_transfer' }, null);

    assert.equal(resultado.estornado, true);
    assert.equal(estado.reembolsos.length, 0);
});

test('efetivar: pagamento simulado em reserva cancelada não tenta estornar no Mercado Pago', async () => {
    estado.statusAtualDb = 'CANCELADA';
    await controller.efetivarAprovacaoPagamento(1, 'SIM_123', 'PIX', null);
    assert.equal(estado.reembolsos.length, 0);
});

test('processar: reserva cancelada entre a cobrança e a confirmação devolve 409 e estorna', async () => {
    estado.statusAtualDb = 'CANCELADA'; // ficou inativa depois da validação inicial
    estado.respostaMP = { id: 990, status: 'approved', transaction_amount: 450, payment_type_id: 'bank_transfer', payment_method_id: 'pix' };

    const res = await processar({ payment_method_id: 'pix', payer: { email: 'pagador@teste.com' } });
    assert.equal(res.status, 409);
    assert.match((await res.json()).error, /não está mais disponível/i);
    assert.equal(estado.reembolsos.length, 1);
});


// ---- Correções do relatório do Guardian (SEC-001 a SEC-008) ----

test('SEC-002: reserva cancelada entre a leitura e a confirmação estorna e não deixa pagamento APROVADO', async () => {
    estado.affectedRows = 0;          // o UPDATE atômico não encontrou PAGAMENTO_PENDENTE
    estado.statusRelido = 'CANCELADA'; // outra rotina cancelou no intervalo
    const resultado = await controller.efetivarAprovacaoPagamento(1, 'MP-60', { payment_type_id: 'bank_transfer' }, null);

    assert.equal(resultado.confirmada, false);
    assert.equal(resultado.estornado, true);
    assert.deepEqual(estado.reembolsos, [{ paymentId: 'MP-60', valor: undefined }]);
});

test('SEC-002: se outra chamada já confirmou a reserva, nada é estornado (idempotente)', async () => {
    estado.affectedRows = 0;
    estado.statusRelido = 'CONFIRMADA';
    const resultado = await controller.efetivarAprovacaoPagamento(1, 'MP-61', { payment_type_id: 'bank_transfer' }, null);

    assert.equal(resultado.confirmada, true);
    assert.equal(estado.reembolsos.length, 0);
});

test('SEC-003: segundo pagamento aprovado da mesma reserva é estornado e não sobrescreve o primeiro', async () => {
    estado.pagAnterior = { Pag_Status: 'APROVADO', Pag_TransacaoId: 'MP-A' };
    const resultado = await controller.efetivarAprovacaoPagamento(1, 'MP-B', { payment_type_id: 'credit_card' }, null);

    assert.equal(resultado.duplicado, true);
    assert.equal(resultado.estornado, true);
    assert.deepEqual(estado.reembolsos, [{ paymentId: 'MP-B', valor: undefined }]);
    assert.ok(!estado.consultas.some(c => /^(INSERT INTO|UPDATE) pag_pagamento/.test(c.sql)), 'não pode gravar por cima do pagamento original');
    assert.ok(!estado.consultas.some(c => c.sql.startsWith('UPDATE res_reserva SET Res_Status')));
});

test('SEC-003: a mesma transação aprovada de novo não é tratada como duplicada', async () => {
    estado.pagAnterior = { Pag_Status: 'APROVADO', Pag_TransacaoId: 'MP-A' };
    const resultado = await controller.efetivarAprovacaoPagamento(1, 'MP-A', { payment_type_id: 'credit_card' }, null);

    assert.equal(resultado.duplicado, undefined);
    assert.equal(estado.reembolsos.length, 0);
});

test('SEC-004: reserva ainda PENDENTE (sem aprovação do proprietário) não recebe pagamento', async () => {
    estado.statusReserva = 'PENDENTE';
    estado.respostaMP = { id: 801, status: 'approved', transaction_amount: 450, payment_type_id: 'credit_card' };

    const res = await processar(formCartao());
    assert.equal(res.status, 409);
    assert.equal(estado.chamadasMP.length, 0, 'nada pode ser cobrado');
});

test('SEC-004: reserva CONFIRMADA responde 400 sem cobrar de novo', async () => {
    estado.statusReserva = 'CONFIRMADA';
    const res = await processar(formCartao());
    assert.equal(res.status, 400);
    assert.equal(estado.chamadasMP.length, 0);
});

test('SEC-004: aprovação que chega para reserva PENDENTE é estornada, não confirma pulando o proprietário', async () => {
    estado.statusAtualDb = 'PENDENTE';
    const resultado = await controller.efetivarAprovacaoPagamento(1, 'MP-70', { payment_type_id: 'bank_transfer' }, null);

    assert.equal(resultado.confirmada, false);
    assert.equal(estado.reembolsos.length, 1);
    assert.ok(!estado.consultas.some(c => c.sql.startsWith('UPDATE res_reserva SET Res_Status')));
});

test('SEC-004: o UPDATE de confirmação só atua sobre PAGAMENTO_PENDENTE', async () => {
    await controller.efetivarAprovacaoPagamento(1, 'MP-71', { payment_type_id: 'bank_transfer' }, null);
    const update = estado.consultas.find(c => c.sql.startsWith('UPDATE res_reserva SET Res_Status'));
    assert.match(update.sql, /Res_Status = 'PAGAMENTO_PENDENTE'/);
});

test('SEC-007: em produção a simulação de pagamento fica indisponível mesmo com PAGAMENTO_SIMULADO=true', async () => {
    const anterior = { env: process.env.NODE_ENV, sim: process.env.PAGAMENTO_SIMULADO };
    process.env.PAGAMENTO_SIMULADO = 'true';
    process.env.NODE_ENV = 'production';
    try {
        const sim = await fetch(`${base}/api/pagamentos/simular-aprovacao/1`, { method: 'POST', headers: { Cookie: cookie(41) } });
        assert.equal(sim.status, 404);
        const checkout = await fetch(`${base}/api/pagamentos/checkout/1`, { headers: { Cookie: cookie(41) } });
        assert.equal((await checkout.json()).simuladoDisponivel, false);
    } finally {
        process.env.NODE_ENV = anterior.env;
        if (anterior.sim === undefined) delete process.env.PAGAMENTO_SIMULADO; else process.env.PAGAMENTO_SIMULADO = anterior.sim;
    }
});

test('SEC-008: fora de desenvolvimento/teste o webhook sem segredo é rejeitado (401)', async () => {
    const anterior = process.env.NODE_ENV;
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    process.env.NODE_ENV = 'production';
    try {
        const res = await fetch(`${base}/api/pagamentos/webhook?type=payment&data.id=1`, { method: 'POST' });
        assert.equal(res.status, 401);
    } finally {
        process.env.NODE_ENV = anterior;
    }
});

// ---- SEC-001: cancelamento pelo hóspede nunca afirma estorno que não aconteceu ----

const hospedeController = require('../controllers/hospedeController');

function respostaFalsa() {
    return { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
}
function requisicaoCancelamento() {
    return { usuario: { id: 41, tipo: 'hospede' }, params: { id: '1' }, body: {}, app: { get: () => null } };
}

test('SEC-001: se o estorno falhar, o cancelamento é desfeito (502) e o pagamento continua APROVADO', async () => {
    estado.pagParaCancelar = { Pag_Id: 5, Pag_Status: 'APROVADO', Pag_Valor: '450.00', Pag_TransacaoId: 'MP-100', Pag_Metodo: 'CARTAO_CREDITO' };
    estado.erroReembolso = new Error('saldo insuficiente');
    const res = respostaFalsa();
    await hospedeController.cancelarReserva(requisicaoCancelamento(), res);

    assert.equal(res.code, 502);
    assert.match(res.body.error, /não foi cancelada/i);
    assert.ok(estado.rollbacks >= 1, 'a transação precisa ser desfeita');
    assert.ok(!estado.consultas.some(c => c.sql.startsWith('UPDATE pag_pagamento')), 'não pode marcar como reembolsado');
    assert.ok(!estado.consultas.some(c => /SET Res_Status = 'CANCELADA'/.test(c.sql)), 'a reserva não pode ser cancelada');
});

test('SEC-001: estorno confirmado pelo Mercado Pago cancela a reserva e grava o id real do estorno', async () => {
    estado.pagParaCancelar = { Pag_Id: 5, Pag_Status: 'APROVADO', Pag_Valor: '450.00', Pag_TransacaoId: 'MP-101', Pag_Metodo: 'CARTAO_CREDITO' };
    const res = respostaFalsa();
    await hospedeController.cancelarReserva(requisicaoCancelamento(), res);

    assert.equal(res.code, 200);
    assert.deepEqual(estado.reembolsos, [{ paymentId: 'MP-101', valor: 450 }]);
    const atualizacao = estado.consultas.find(c => c.sql.startsWith('UPDATE pag_pagamento'));
    assert.equal(atualizacao.parametros[0], 'REEMBOLSADO');
    assert.equal(atualizacao.parametros[2], 'REF-1');
});

test('SEC-001: pagamento simulado (SIM_) cancela sem chamar o Mercado Pago', async () => {
    estado.pagParaCancelar = { Pag_Id: 6, Pag_Status: 'APROVADO', Pag_Valor: '450.00', Pag_TransacaoId: 'SIM_123', Pag_Metodo: 'PIX' };
    const res = respostaFalsa();
    await hospedeController.cancelarReserva(requisicaoCancelamento(), res);

    assert.equal(res.code, 200);
    assert.equal(estado.reembolsos.length, 0);
});
