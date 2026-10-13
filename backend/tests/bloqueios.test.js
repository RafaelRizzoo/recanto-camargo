const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

let estado;
function reiniciar() {
    estado = {
        consultas: [],
        eventos: [],
        transacao: false,
        pendentes: [],
        bloqueios: [
            { Bld_Id: 10, Imo_Id: 1, Bld_Data: '2026-11-01', Bld_Motivo: 'Pintura', Bld_Status: 'ATIVO' },
            { Bld_Id: 11, Imo_Id: 1, Bld_Data: '2026-11-02', Bld_Motivo: 'Pintura', Bld_Status: 'ATIVO' },
        ],
        hospedesBloqueados: [
            { Blo_Id: 99, Imo_Id: 1, Usu_Id: 77, Blo_Motivo: 'Mau comportamento' }
        ],
        reservas: [],
        conflitoReserva: false,
    };
}
reiniciar();

const bancoMock = {
    async getConnection() { return this; },
    async beginTransaction() { estado.transacao = true; estado.eventos.push('begin'); },
    async commit() { estado.transacao = false; estado.eventos.push('commit'); },
    async rollback() { estado.transacao = false; estado.eventos.push('rollback'); },
    release() { estado.eventos.push('release'); },
    destroy() { estado.eventos.push('destroy'); },
    async query(sql, parametros = []) {
        const texto = sql.replace(/\s+/g, ' ').trim();
        estado.consultas.push({ sql: texto, parametros });

        // Validação de proprietário
        if (texto.startsWith('SELECT p.Usu_Id FROM pro_proprietario')) {
            const id = parametros[0];
            return id === 10 ? [[{ Usu_Id: 10 }]] : [[]];
        }

        // Validação de hóspede
        if (texto.startsWith('SELECT h.Usu_Id FROM hos_hospede')) {
            const id = parametros[0];
            return id === 77 || id === 41 ? [[{ Usu_Id: id }]] : [[]];
        }

        // Busca valor da diária
        if (texto.startsWith('SELECT Imo_ValorFixo')) {
            return [[{ Imo_ValorFixo: '200.00' }]];
        }

        // Conflito de reservas ao criar bloqueio
        if (texto.includes('FROM res_reserva') && texto.includes("Res_Status IN ('CONFIRMADA', 'PENDENTE'")) {
            if (estado.conflitoReserva) {
                return [[{ Res_Id: 50, Res_Status: 'CONFIRMADA', checkin: '10/11/2026', checkout: '15/11/2026' }]];
            }
            return [[]];
        }

        // Inserção em bld_bloqueiodata
        if (texto.startsWith('INSERT INTO bld_bloqueiodata')) {
            const [imoId, data, motivo] = parametros;
            const novoId = estado.bloqueios.length + 1;
            estado.bloqueios.push({ Bld_Id: novoId, Imo_Id: imoId, Bld_Data: data, Bld_Motivo: motivo, Bld_Status: 'ATIVO' });
            return [{ insertId: novoId }];
        }

        // Listagem de bloqueios ativos
        if (texto.startsWith('SELECT Bld_Id AS id,') && texto.includes('FROM bld_bloqueiodata')) {
            const ativos = estado.bloqueios
                .filter(b => b.Bld_Status === 'ATIVO')
                .map(b => ({ id: b.Bld_Id, data: b.Bld_Data, motivo: b.Bld_Motivo }));
            return [ativos];
        }

        // Remoção / Cancelamento de bloqueio
        if (texto.startsWith("UPDATE bld_bloqueiodata SET Bld_Status = 'CANCELADO'")) {
            const id = parametros[0];
            const item = estado.bloqueios.find(b => b.Bld_Id === id && b.Bld_Status === 'ATIVO');
            if (item) {
                item.Bld_Status = 'CANCELADO';
                return [{ affectedRows: 1 }];
            }
            return [{ affectedRows: 0 }];
        }

        // Checagem de bld_bloqueiodata na reserva
        if (texto.startsWith('SELECT Bld_Id FROM bld_bloqueiodata')) {
            const [imoId, checkin, checkout] = parametros;
            const conflitos = estado.bloqueios.filter(b => b.Bld_Status === 'ATIVO' && b.Bld_Data >= checkin && b.Bld_Data < checkout);
            return [conflitos];
        }

        // Checagem de blo_bloqueiohospede na reserva
        if (texto.startsWith('SELECT Blo_Id FROM blo_bloqueiohospede')) {
            const [imoId, usuId] = parametros;
            const bloqueados = estado.hospedesBloqueados.filter(b => b.Usu_Id === usuId);
            return [bloqueados];
        }

        // Criação de reserva
        if (texto.startsWith('INSERT INTO res_reserva')) {
            return [{ insertId: 101 }];
        }

        // Busca e-mails para notificações
        if (texto.startsWith('SELECT p.Usu_Id AS proprietarioId')) {
            return [[{ proprietarioId: 10, proprietarioEmail: 'prop@recanto.com', hospedeEmail: 'hosp@recanto.com' }]];
        }

        // Inserção de notificação
        if (texto.startsWith('INSERT INTO not_notificacao')) {
            return [{ insertId: 501 }];
        }

        return [[]];
    }
};

const caminhoDb = require.resolve('../config/db');
const dbAnterior = require.cache[caminhoDb];
const jwtAnterior = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'segredo-de-teste-bloqueios';
require.cache[caminhoDb] = { id: caminhoDb, filename: caminhoDb, loaded: true, exports: bancoMock };
const app = require('../server');
if (dbAnterior) require.cache[caminhoDb] = dbAnterior;
else delete require.cache[caminhoDb];

let servidor;
let base;

test.before(async () => {
    servidor = await new Promise(resolve => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    base = `http://127.0.0.1:${servidor.address().port}`;
});

test.beforeEach(() => reiniciar());

test.after(async () => {
    await new Promise(resolve => servidor.close(resolve));
    if (jwtAnterior === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = jwtAnterior;
});

function tokenProprietario(id = 10) {
    const t = jwt.sign({ id, tipo: 'proprietario' }, process.env.JWT_SECRET, { expiresIn: '10m' });
    return `token=${t}`;
}

function tokenHospede(id = 41) {
    const t = jwt.sign({ id, tipo: 'hospede' }, process.env.JWT_SECRET, { expiresIn: '10m' });
    return `token=${t}`;
}

async function requisicao(caminho, { method = 'GET', cookie, body } = {}) {
    const res = await fetch(`${base}${caminho}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(cookie ? { Cookie: cookie } : {})
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    const dados = await res.json().catch(() => ({}));
    return { status: res.status, dados };
}

// ─── TESTES DE BLOQUEIO DE CALENDÁRIO (bld_bloqueiodata) ─────────────────────

test('Bloqueio: recusa criação sem autenticação de proprietário', async () => {
    const semToken = await requisicao('/api/proprietario/bloqueios', {
        method: 'POST',
        body: { dataInicio: '2026-11-10', dataFim: '2026-11-12' }
    });
    assert.equal(semToken.status, 401);

    const comTokenHospede = await requisicao('/api/proprietario/bloqueios', {
        method: 'POST',
        cookie: tokenHospede(41),
        body: { dataInicio: '2026-11-10', dataFim: '2026-11-12' }
    });
    assert.equal(comTokenHospede.status, 403);
});

test('Bloqueio: validações de entrada rejeitam datas ausentes ou invertidas', async () => {
    const semInicio = await requisicao('/api/proprietario/bloqueios', {
        method: 'POST',
        cookie: tokenProprietario(),
        body: {}
    });
    assert.equal(semInicio.status, 400);
    assert.match(semInicio.dados.error, /data de início/i);

    const formatoInvalido = await requisicao('/api/proprietario/bloqueios', {
        method: 'POST',
        cookie: tokenProprietario(),
        body: { dataInicio: '10/11/2026' }
    });
    assert.equal(formatoInvalido.status, 400);
    assert.match(formatoInvalido.dados.error, /formato de data/i);

    const datasInvertidas = await requisicao('/api/proprietario/bloqueios', {
        method: 'POST',
        cookie: tokenProprietario(),
        body: { dataInicio: '2026-11-15', dataFim: '2026-11-10' }
    });
    assert.equal(datasInvertidas.status, 400);
    assert.match(datasInvertidas.dados.error, /não pode ser posterior/i);
});

test('Bloqueio: rejeita bloqueio quando há reserva ativa no período (409)', async () => {
    estado.conflitoReserva = true;
    const resposta = await requisicao('/api/proprietario/bloqueios', {
        method: 'POST',
        cookie: tokenProprietario(),
        body: { dataInicio: '2026-11-10', dataFim: '2026-11-15', motivo: 'Reforma' }
    });
    assert.equal(resposta.status, 409);
    assert.match(resposta.dados.error, /reservas ativas ou pendentes/i);
});

test('Bloqueio: cria bloqueio com sucesso para intervalo de dias (201)', async () => {
    const resposta = await requisicao('/api/proprietario/bloqueios', {
        method: 'POST',
        cookie: tokenProprietario(),
        body: { dataInicio: '2026-11-20', dataFim: '2026-11-22', motivo: 'Uso Familiar' }
    });
    assert.equal(resposta.status, 201);
    assert.equal(resposta.dados.totalDias, 2);
    assert.equal(resposta.dados.motivo, 'Uso Familiar');
});

test('Bloqueio: lista bloqueios ativos do proprietário', async () => {
    const resposta = await requisicao('/api/proprietario/bloqueios', {
        cookie: tokenProprietario()
    });
    assert.equal(resposta.status, 200);
    assert.ok(Array.isArray(resposta.dados));
    assert.equal(resposta.dados.length, 2);
    assert.equal(resposta.dados[0].motivo, 'Pintura');
});

test('Bloqueio: remoção cancela o bloqueio com sucesso', async () => {
    const invalido = await requisicao('/api/proprietario/bloqueios/abc', {
        method: 'DELETE',
        cookie: tokenProprietario()
    });
    assert.equal(invalido.status, 400);

    const inexistente = await requisicao('/api/proprietario/bloqueios/9999', {
        method: 'DELETE',
        cookie: tokenProprietario()
    });
    assert.equal(inexistente.status, 404);

    const sucesso = await requisicao('/api/proprietario/bloqueios/10', {
        method: 'DELETE',
        cookie: tokenProprietario()
    });
    assert.equal(sucesso.status, 200);
    assert.equal(estado.bloqueios.find(b => b.Bld_Id === 10).Bld_Status, 'CANCELADO');
});

// ─── TESTES DE INTEGRAÇÃO COM RESERVAS ───────────────────────────────────────

test('Reserva: impede criação em data bloqueada no calendário pelo proprietário (409)', async () => {
    const resposta = await requisicao('/api/reservas', {
        method: 'POST',
        cookie: tokenHospede(41),
        body: {
            checkin: '2026-11-01',
            checkout: '2026-11-03',
            hospedes: 2
        }
    });
    assert.equal(resposta.status, 409);
    assert.match(resposta.dados.error, /bloqueadas para manutenção/i);
});

test('Reserva: impede criação para hóspede restrito em blo_bloqueiohospede (403)', async () => {
    const resposta = await requisicao('/api/reservas', {
        method: 'POST',
        cookie: tokenHospede(77), // Hóspede 77 está bloqueado no mock
        body: {
            checkin: '2026-12-10',
            checkout: '2026-12-15',
            hospedes: 2
        }
    });
    assert.equal(resposta.status, 403);
    assert.match(resposta.dados.error, /restrição de reserva/i);
});
