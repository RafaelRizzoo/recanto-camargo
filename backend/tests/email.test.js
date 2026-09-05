const test = require('node:test');
const assert = require('node:assert/strict');
const { criarServicoEmail, criarHtmlEmail, escaparHtml } = require('../email');

function capturarLog() {
    const mensagens = [];
    const registrar = (...args) => mensagens.push(args);
    return { mensagens, logger: { log: registrar, warn: registrar, error: registrar, info: registrar } };
}

const env = { RESEND_API_KEY: 're_chave_ficticia_para_teste', RESEND_FROM_EMAIL: 'Recanto <reservas@example.com>' };

test('HTML escapa conteúdo dinâmico contra injeção de tags/atributos', () => {
    assert.equal(escaparHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
    const html = criarHtmlEmail('<script>alert(1)</script>', '<img src=x onerror="alert(1)">');
    assert.equal(html.includes('<script>'), false);
    assert.equal(html.includes('<img src=x'), false);
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('&lt;img'));
});

test('ausência de chave pula envio, informa configuração uma vez e nunca instancia SDK', async () => {
    const log = capturarLog();
    class ResendInesperado { constructor() { throw new Error('Não deve instanciar.'); } }
    const { enviarEmail } = criarServicoEmail({ env: {}, logger: log.logger, ResendClass: ResendInesperado });
    assert.equal((await enviarEmail('qa@example.com', 'Teste', '<p>Teste</p>')).enviado, false);
    assert.equal((await enviarEmail('qa@example.com', 'Teste', '<p>Teste</p>')).enviado, false);
    assert.equal(log.mensagens.filter(args => args.join(' ').includes('RESEND_API_KEY não configurada, pulando envio de email')).length, 1);
});

test('envio bem-sucedido usa remetente configurado e chave de idempotência', async () => {
    const envios = [];
    class ResendFake {
        constructor(chave) {
            assert.equal(chave, env.RESEND_API_KEY);
            this.emails = { send: async (...args) => { envios.push(args); return { data: { id: 'teste' }, error: null }; } };
        }
    }
    const { enviarEmail } = criarServicoEmail({ env, ResendClass: ResendFake, logger: capturarLog().logger });
    assert.equal((await enviarEmail('qa@example.com', 'Reserva confirmada', '<p>Confirmada.</p>', 'reserva-123-hospede')).enviado, true);
    assert.equal(envios.length, 1);
    assert.equal(envios[0][0].from, env.RESEND_FROM_EMAIL);
    assert.equal(envios[0][0].subject, 'Reserva confirmada');
    assert.equal(envios[0][1].idempotencyKey, 'reserva-123-hospede');
});

for (const modo of ['erro retornado pela API', 'exceção de rede']) {
    test(`${modo} não propaga falha nem registra chave, destinatário ou corpo`, async () => {
        const log = capturarLog();
        const segredo = 'qa-privado@example.com segredo-corpo re_chave_ficticia_para_teste';
        let tentativas = 0;
        class ResendFalho {
            constructor() {
                this.emails = { send: async () => {
                    tentativas += 1;
                    if (modo === 'exceção de rede') throw new Error(segredo);
                    return { data: null, error: { name: 'validation_error', message: segredo, statusCode: 403 } };
                } };
            }
        }
        const { enviarEmail } = criarServicoEmail({ env, ResendClass: ResendFalho, logger: log.logger });
        const resultado = await enviarEmail('qa-privado@example.com', 'Assunto', '<p>segredo-corpo</p>', 'reserva-123-hospede');
        assert.equal(resultado.enviado, false);
        assert.equal(tentativas, 1, 'O teste precisa alcançar a chamada ao provedor.');
        assert.ok(log.mensagens.length > 0);
        const textoLog = JSON.stringify(log.mensagens);
        assert.equal(textoLog.includes('qa-privado@example.com'), false);
        assert.equal(textoLog.includes('segredo-corpo'), false);
        assert.equal(textoLog.includes(env.RESEND_API_KEY), false);
    });
}

test('remetente ausente não resulta em envio de rede ou rejeição da operação chamadora', async () => {
    let instancias = 0;
    class ResendFake { constructor() { instancias += 1; } }
    const { enviarEmail } = criarServicoEmail({ env: { RESEND_API_KEY: env.RESEND_API_KEY }, ResendClass: ResendFake, logger: capturarLog().logger });
    assert.equal((await enviarEmail('qa@example.com', 'Teste', '<p>Teste</p>')).enviado, false);
    assert.equal(instancias, 0);
});

test('SDK Resend instalado recebe abort signal e idempotência, sem vazar corpo de erro do provedor', async () => {
    const { Resend } = require('resend');
    const log = capturarLog();
    const fetchAnterior = global.fetch;
    const consoleAnterior = console.error;
    const consoleBruto = [];
    const chamadas = [];
    console.error = (...args) => consoleBruto.push(args);
    global.fetch = async (url, options) => {
        chamadas.push({ url, options });
        return new Response(JSON.stringify({ name: 'validation_error', message: 'qa-privado@example.com segredo-corpo', statusCode: 403 }), {
            status: 403, headers: { 'Content-Type': 'application/json' },
        });
    };
    try {
        const { enviarEmail } = criarServicoEmail({ env, ResendClass: Resend, logger: log.logger });
        const resultado = await enviarEmail('qa-privado@example.com', 'Reserva', '<p>segredo-corpo</p>', 'reserva-123-hospede');
        assert.equal(resultado.enviado, false);
        assert.equal(chamadas.length, 1, 'O SDK deve alcançar o fetch substituído, sem enviar rede real.');
        assert.ok(chamadas[0].options.signal instanceof AbortSignal);
        assert.equal(chamadas[0].options.headers.get('Idempotency-Key'), 'reserva-123-hospede');
        assert.deepEqual(consoleBruto, [], 'O logger interno do SDK não deve expor a resposta bruta.');
        assert.equal(JSON.stringify(log.mensagens).includes('qa-privado@example.com'), false);
        assert.equal(JSON.stringify(log.mensagens).includes('segredo-corpo'), false);
    } finally {
        global.fetch = fetchAnterior;
        console.error = consoleAnterior;
    }
});

test('parâmetros de email inválidos não alcançam o provedor', async () => {
    let chamadas = 0;
    class ResendFake { constructor() { this.emails = { send: async () => { chamadas += 1; return { data: { id: 'x' } }; } }; } }
    const { enviarEmail } = criarServicoEmail({ env, ResendClass: ResendFake, logger: capturarLog().logger });
    for (const argumentos of [
        ['invalid-email', 'Reserva', '<p>Teste</p>', 'reserva-123'],
        ['qa@example.com', 'Reserva\r\nBcc: atacante@example.com', '<p>Teste</p>', 'reserva-123'],
        ['qa@example.com', 'Reserva', '<p>Teste</p>', ''],
    ]) assert.equal((await enviarEmail(...argumentos)).enviado, false);
    assert.equal(chamadas, 0);
});
