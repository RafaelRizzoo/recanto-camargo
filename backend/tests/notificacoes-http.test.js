const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const emailOriginal = require('../email');

let estado;
function reiniciar() {
    estado = {
        consultas: [], eventos: [], transacao: false, gravados: [], pendentes: [], emails: [],
        notificacoes: [
            { Not_Id: 1, Usu_Id: 41, Not_Titulo: 'Sua reserva', Not_Mensagem: 'Confirmada', Not_Tipo: 'SUCESSO', Not_Icone: 'bi-calendar-check', Not_Lida: 0, Not_CriadaEm: new Date() },
            { Not_Id: 2, Usu_Id: 99, Not_Titulo: 'Outra reserva', Not_Mensagem: 'Privada', Not_Tipo: 'INFO', Not_Icone: null, Not_Lida: 0, Not_CriadaEm: new Date() },
        ],
    };
}
reiniciar();

const banco = {
    async getConnection() { return this; },
    async beginTransaction() { estado.transacao = true; estado.eventos.push('begin'); },
    async commit() { estado.gravados.push(...estado.pendentes); estado.pendentes = []; estado.transacao = false; estado.eventos.push('commit'); },
    async rollback() { estado.pendentes = []; estado.transacao = false; estado.eventos.push('rollback'); },
    release() { estado.eventos.push('release'); },
    destroy() { estado.eventos.push('destroy'); },
    async query(sql, parametros) {
        const texto = sql.replace(/\s+/g, ' ').trim();
        estado.consultas.push({ sql: texto, parametros });
        if (texto.startsWith('SELECT Usu_Id FROM usu_usuario')) return [[...(parametros[0] === 666 ? [] : [{ Usu_Id: parametros[0] }])]];
        if (texto.startsWith('SELECT h.Usu_Id')) return [[{ Usu_Id: parametros[0] }]];
        if (texto.startsWith('SELECT Imo_ValorFixo')) {
            assert.ok(estado.transacao);
            assert.match(texto, /FOR UPDATE$/);
            return [[{ Imo_ValorFixo: '150.00' }]];
        }
        if (texto.startsWith('SELECT Res_Id FROM res_reserva')) return [estado.conflito ? [{ Res_Id: 500 }] : []];
        if (texto.startsWith('INSERT INTO res_reserva')) {
            assert.ok(estado.transacao);
            assert.match(texto, /'PENDENTE'/);
            estado.pendentes.push({ tipo: 'reserva', parametros });
            return [{ insertId: 123 }];
        }
        if (texto.startsWith('SELECT p.Usu_Id AS proprietarioId')) {
            assert.deepEqual(parametros, [41, 1]);
            return [[{ proprietarioId: 99, proprietarioEmail: 'owner@example.com', hospedeEmail: 'guest@example.com' }]];
        }
        if (texto.startsWith('INSERT INTO not_notificacao')) {
            assert.ok(estado.transacao, 'Notificações do evento devem compartilhar a transação.');
            if (estado.falhaNotificacao) throw new Error('Falha de inserção simulada.');
            estado.pendentes.push({ tipo: 'notificacao', parametros });
            return [{ insertId: 800 + estado.pendentes.length }];
        }
        if (texto.startsWith('SELECT COUNT(*)')) return [[{ naoLidas: estado.notificacoes.filter(n => n.Usu_Id === parametros[0] && n.Not_Lida === 0).length }]];
        if (texto.startsWith('SELECT Not_Id, Not_Titulo')) {
            assert.match(texto, /WHERE Usu_Id = \?/);
            return [estado.notificacoes.filter(n => n.Usu_Id === parametros[0]).slice(0, parametros[1])];
        }
        if (texto.startsWith('UPDATE not_notificacao')) {
            const porId = texto.includes('WHERE Not_Id = ?');
            const idUsuario = parametros[porId ? 2 : 1];
            const alvo = estado.notificacoes.filter(n => n.Usu_Id === idUsuario && (!porId || n.Not_Id === parametros[1]));
            const alteradas = alvo.filter(n => n.Not_Lida === 0);
            alteradas.forEach(n => { n.Not_Lida = 1; });
            return [{ affectedRows: alteradas.length }];
        }
        if (texto.startsWith('SELECT Not_Id FROM not_notificacao')) return [estado.notificacoes.filter(n => n.Not_Id === parametros[0] && n.Usu_Id === parametros[1])];
        throw new Error(`Consulta inesperada: ${texto}`);
    },
};

const caminhoDb = require.resolve('../db');
const caminhoEmail = require.resolve('../email');
const dbAnterior = require.cache[caminhoDb];
const emailAnterior = require.cache[caminhoEmail];
const jwtAnterior = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'segredo-de-teste-local-sem-valor-em-producao';
require.cache[caminhoDb] = { id: caminhoDb, filename: caminhoDb, loaded: true, exports: banco };
require.cache[caminhoEmail] = { id: caminhoEmail, filename: caminhoEmail, loaded: true, exports: {
    ...emailOriginal,
    criarServicoEmail: () => ({ enviarEmail: (...parametros) => {
        assert.ok(estado.eventos.includes('commit'), 'O provedor não pode ser chamado antes do commit.');
        estado.emails.push(parametros);
        estado.eventos.push('email');
        if (estado.falhaEmail === 'sincrona') throw new Error('Erro síncrono simulado.');
        if (estado.falhaEmail === 'rejeicao') return Promise.reject(new Error('Erro assíncrono simulado.'));
        if (estado.falhaEmail === 'pendente') return new Promise(() => {});
        return Promise.resolve({ enviado: false, motivo: 'sem_chave' });
    } }),
} };
const app = require('../server');
if (dbAnterior) require.cache[caminhoDb] = dbAnterior;
else delete require.cache[caminhoDb];
require.cache[caminhoEmail] = emailAnterior;

let servidor;
let base;
test.before(async () => {
    servidor = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    base = `http://127.0.0.1:${servidor.address().port}`;
});
test.beforeEach(() => reiniciar());
test.after(async () => {
    await new Promise(resolve => servidor.close(resolve));
    if (jwtAnterior === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = jwtAnterior;
});

function cookie(id = 41, extras = {}) {
    return `token=${jwt.sign({ id, tipo: 'hospede', ...extras }, process.env.JWT_SECRET, { expiresIn: '5m' })}`;
}
async function chamar(caminho, { id = 41, token, method = 'GET', body } = {}) {
    const resposta = await fetch(`${base}${caminho}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token === null ? {} : { Cookie: token || cookie(id) }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: resposta.status, headers: resposta.headers, body: await resposta.json() };
}

test('HTTP: as três rotas recusam sessão ausente e token inválido', async () => {
    for (const [path, method] of [['/api/notificacoes', 'GET'], ['/api/notificacoes/1/lida', 'PATCH'], ['/api/notificacoes/marcar-todas-lidas', 'PATCH']]) {
        assert.equal((await chamar(path, { method, token: null })).status, 401);
        assert.equal((await chamar(path, { method, token: 'token=invalido' })).status, 401);
    }
    assert.equal(estado.consultas.length, 0);
});

test('HTTP: usuário inativo e identificador inválido na sessão não acessam notificações', async () => {
    assert.equal((await chamar('/api/notificacoes', { id: 666 })).status, 403);
    assert.equal((await chamar('/api/notificacoes', { id: '1 OR 1=1' })).status, 401);
});

test('HTTP: GET ignora usuário forjado e impede cache da resposta privada', async () => {
    const resposta = await chamar('/api/notificacoes?Usu_Id=99&usuarioId=99');
    assert.equal(resposta.status, 200);
    assert.equal(resposta.headers.get('cache-control'), 'no-store');
    assert.deepEqual(resposta.body.notificacoes.map(n => n.id), [1]);
    assert.equal(resposta.body.naoLidas, 1);
    assert.equal(JSON.stringify(resposta.body).includes('Privada'), false);
});

test('HTTP: IDOR é 404, IDs inválidos são 400 e leitura repetida é 200', async () => {
    assert.equal((await chamar('/api/notificacoes/2/lida', { method: 'PATCH', body: { Usu_Id: 99 } })).status, 404);
    assert.equal(estado.notificacoes[1].Not_Lida, 0);
    for (const id of ['0', '-1', '1.5', '2147483648', '1%20OR%201=1']) {
        assert.equal((await chamar(`/api/notificacoes/${id}/lida`, { method: 'PATCH' })).status, 400);
    }
    assert.equal((await chamar('/api/notificacoes/1/lida', { method: 'PATCH' })).status, 200);
    assert.equal((await chamar('/api/notificacoes/1/lida', { method: 'PATCH' })).status, 200);
});

test('HTTP: marcar-todas ignora Usu_Id no corpo e altera apenas usuário autenticado', async () => {
    assert.equal((await chamar('/api/notificacoes/marcar-todas-lidas', { method: 'PATCH', body: { Usu_Id: 99 } })).status, 200);
    assert.deepEqual(estado.notificacoes.map(n => n.Not_Lida), [1, 0]);
});

function reserva() {
    const checkin = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const checkout = new Date(Date.now() + 32 * 86400000).toISOString().slice(0, 10);
    return { checkin, checkout, hospedes: 2, observacoes: 'Observação privada: não deve ir ao email.', valorTotal: 0.01, proprietarioId: 666, hospedeEmail: 'intruso@example.com' };
}

test('reserva nasce pendente com preço do servidor e duas notificações na mesma transação', async () => {
    const resposta = await chamar('/api/reservas', { method: 'POST', body: reserva() });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(resposta.status, 201);
    assert.equal(resposta.body.reservaId, 123);
    assert.deepEqual(estado.gravados.map(r => r.tipo), ['reserva', 'notificacao', 'notificacao']);
    assert.equal(estado.gravados[0].parametros[6], 300);
    assert.deepEqual(estado.gravados.slice(1).map(r => r.parametros[0]), [41, 99]);
    assert.deepEqual(estado.emails.map(e => e[0]), ['guest@example.com', 'owner@example.com']);
    assert.equal(JSON.stringify(estado.emails).includes('Observação privada'), false);
    assert.equal(JSON.stringify(estado.emails).includes('intruso@example.com'), false);
    assert.equal(estado.eventos.filter(e => e === 'commit').length, 1);
    assert.equal(estado.eventos.filter(e => e === 'release').length, 1);
    assert.equal(estado.eventos.includes('rollback'), false);
});

for (const falha of ['sincrona', 'rejeicao']) {
    test(`reserva permanece pendente quando email falha (${falha})`, async () => {
        estado.falhaEmail = falha;
        const logs = [];
        const logAnterior = console.error;
        console.error = (...args) => logs.push(args);
        try {
            const resposta = await chamar('/api/reservas', { method: 'POST', body: reserva() });
            await new Promise(resolve => setImmediate(resolve));
            assert.equal(resposta.status, 201);
            assert.equal(estado.gravados.length, 3);
            assert.ok(estado.emails.length > 0);
            assert.equal(estado.eventos.includes('rollback'), false);
            assert.ok(logs.length > 0);
        } finally { console.error = logAnterior; }
    });
}

test('resposta HTTP e conexão do banco são liberadas sem esperar o provedor de email', { timeout: 2000 }, async () => {
    estado.falhaEmail = 'pendente';
    const resposta = await chamar('/api/reservas', { method: 'POST', body: reserva() });
    assert.equal(resposta.status, 201);
    assert.equal(estado.gravados.length, 3);
    assert.equal(estado.emails.length, 2);
    assert.equal(estado.eventos.filter(e => e === 'release').length, 1);
    assert.equal(estado.eventos.includes('rollback'), false);
});

test('conflito de datas não cria avisos nem tenta enviar email', async () => {
    estado.conflito = true;
    assert.equal((await chamar('/api/reservas', { method: 'POST', body: reserva() })).status, 409);
    assert.deepEqual(estado.gravados, []);
    assert.deepEqual(estado.emails, []);
    assert.equal(estado.eventos.includes('commit'), false);
    assert.equal(estado.eventos.filter(e => e === 'rollback').length, 1);
});

test('falha ao persistir aviso reverte reserva e não produz email de sucesso', async () => {
    estado.falhaNotificacao = true;
    const logAnterior = console.error;
    console.error = () => {};
    try {
        assert.equal((await chamar('/api/reservas', { method: 'POST', body: reserva() })).status, 500);
        assert.deepEqual(estado.gravados, []);
        assert.deepEqual(estado.emails, []);
        assert.equal(estado.eventos.includes('commit'), false);
        assert.equal(estado.eventos.filter(e => e === 'rollback').length, 1);
    } finally { console.error = logAnterior; }
});
