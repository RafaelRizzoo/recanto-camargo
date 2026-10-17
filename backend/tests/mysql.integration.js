const test = require('node:test');
const assert = require('node:assert/strict');
const { criarAmbienteMySQL } = require('./support/mysql-harness');

test('MySQL real: reserva pendente, persistência, isolamento, concorrência e desempenho', {
    skip: process.env.RUN_MYSQL_INTEGRATION !== '1'
}, async t => {
    const qa = await criarAmbienteMySQL();
    try {
        const guest = await qa.login(2);
        const other = await qa.login(3);
        const owner = await qa.login(1);
        const api = async (caminho, cookie, method = 'GET', body) => {
            const res = await fetch(`${qa.url}${caminho}`, {
                method, headers: { ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json' },
                ...(body ? { body: JSON.stringify(body) } : {})
            });
            return { status: res.status, data: await res.json(), headers: res.headers };
        };
        await t.test('sem sessão recebe 401 e lista inicial vazia', async () => {
            assert.equal((await api('/api/notificacoes')).status, 401);
            const lista = await api('/api/notificacoes', guest);
            assert.deepEqual(lista.data, { notificacoes: [], naoLidas: 0 });
            assert.match(lista.headers.get('cache-control'), /no-store/);
        });
        const checkin = new Date();
        checkin.setUTCFullYear(checkin.getUTCFullYear() + 1);
        const dataEntrada = checkin.toISOString().slice(0, 10);
        const dataSaida = new Date(checkin.getTime() + 86400000).toISOString().slice(0, 10);
        let reservaId;
        await t.test('reserva nasce pendente com preço do servidor e persiste dois avisos', async () => {
            const reserva = await api('/api/reservas', guest, 'POST', {
                checkin: dataEntrada, checkout: dataSaida, hospedes: 2, valorTotal: 1
            });
            assert.equal(reserva.status, 201);
            reservaId = reserva.data.reservaId;
            const [rows] = await qa.admin.query('SELECT Res_Status, Res_ValorTotal FROM res_reserva WHERE Res_Id = ?', [reservaId]);
            assert.equal(rows[0].Res_Status, 'PENDENTE');
            assert.equal(Number(rows[0].Res_ValorTotal), 200);
            const [avisos] = await qa.admin.query('SELECT Usu_Id FROM not_notificacao ORDER BY Usu_Id');
            assert.deepEqual(avisos.map(n => n.Usu_Id), [1, 2]);
            assert.equal((await api('/api/notificacoes', other)).data.notificacoes.length, 0);
        });
        await t.test('conflito de datas não duplica reserva ou avisos', async () => {
            const tentativa = await api('/api/reservas', other, 'POST', { checkin: dataEntrada, checkout: dataSaida, hospedes: 2 });
            assert.equal(tentativa.status, 409);
            const [contagem] = await qa.admin.query('SELECT COUNT(*) AS total FROM not_notificacao');
            assert.equal(contagem[0].total, 2);
        });
        await t.test('leitura persiste em outra sessão e IDs de terceiros são rejeitados', async () => {
            const lista = (await api('/api/notificacoes', guest)).data;
            const id = lista.notificacoes[0].id;
            assert.equal((await api(`/api/notificacoes/${id}/lida`, other, 'PATCH')).status, 404);
            assert.equal((await api('/api/notificacoes/1%20OR%201=1/lida', guest, 'PATCH')).status, 400);
            assert.equal((await api(`/api/notificacoes/${id}/lida`, guest, 'PATCH')).status, 200);
            assert.equal((await api(`/api/notificacoes/${id}/lida`, guest, 'PATCH')).status, 200);
            const outraSessao = await qa.login(2);
            assert.equal((await api('/api/notificacoes', outraSessao)).data.naoLidas, 0);
            assert.equal((await api('/api/notificacoes', owner)).data.naoLidas, 1);
        });
        await t.test('limite 50 com contagem global e marcar todas limitado ao usuário', async () => {
            for (let i = 0; i < 60; i++) {
                await qa.admin.query('INSERT INTO not_notificacao (Usu_Id, Not_Titulo, Not_Mensagem) VALUES (?, ?, ?)', [2, `QA ${i}`, 'Mensagem fictícia']);
            }
            const lista = (await api('/api/notificacoes', guest)).data;
            assert.equal(lista.notificacoes.length, 50);
            assert.equal(lista.naoLidas, 60);
            assert.equal((await api('/api/notificacoes/marcar-todas-lidas', guest, 'PATCH')).status, 200);
            assert.equal((await api('/api/notificacoes', guest)).data.naoLidas, 0);
            assert.equal((await api('/api/notificacoes', owner)).data.naoLidas, 1);
        });
        await t.test('escritas concorrentes continuam idempotentes e proprietário continua isolado', async () => {
            const id = (await api('/api/notificacoes', owner)).data.notificacoes[0].id;
            const respostas = await Promise.all(Array.from({ length: 10 }, () => api(`/api/notificacoes/${id}/lida`, owner, 'PATCH')));
            assert.ok(respostas.every(r => r.status === 200));
            assert.equal((await api('/api/notificacoes', owner)).data.naoLidas, 0);
        });
        await t.test('sessão de conta bloqueada perde acesso', async () => {
            await qa.admin.query('UPDATE usu_usuario SET Usu_Status = ? WHERE Usu_Id = ?', ['BLOQUEADO', 3]);
            assert.equal((await api('/api/notificacoes', other)).status, 403);
        });
        await t.test('Resend real com transporte 403 simulado não reverte reserva no MySQL', async () => {
            const fetchOriginal = globalThis.fetch;
            let tentativas = 0;
            process.env.RESEND_API_KEY = 're_invalid_qa';
            process.env.RESEND_FROM_EMAIL = 'QA <qa@example.invalid>';
            globalThis.fetch = async (url, options) => {
                if (String(url).startsWith('https://api.resend.com/')) {
                    tentativas += 1;
                    return new Response(JSON.stringify({ name: 'validation_error', message: 'API key inválida para QA' }), {
                        status: 403, headers: { 'Content-Type': 'application/json' }
                    });
                }
                return fetchOriginal(url, options);
            };
            try {
                const entrada = new Date(checkin.getTime() + 7 * 86400000).toISOString().slice(0, 10);
                const saida = new Date(checkin.getTime() + 8 * 86400000).toISOString().slice(0, 10);
                const reserva = await api('/api/reservas', guest, 'POST', { checkin: entrada, checkout: saida, hospedes: 2 });
                assert.equal(reserva.status, 201);
                for (let i = 0; i < 50 && tentativas < 2; i++) await new Promise(resolve => setImmediate(resolve));
                assert.equal(tentativas, 2);
                const [rows] = await qa.admin.query('SELECT Res_Status FROM res_reserva WHERE Res_Id = ?', [reserva.data.reservaId]);
                assert.equal(rows[0].Res_Status, 'PENDENTE');
                const [avisos] = await qa.admin.query('SELECT COUNT(*) AS total FROM not_notificacao');
                assert.equal(avisos[0].total, 64);
            } finally {
                globalThis.fetch = fetchOriginal;
                process.env.RESEND_API_KEY = '';
                process.env.RESEND_FROM_EMAIL = '';
            }
        });
        await t.test('amostra local de latência com 20 requisições simultâneas', async () => {
            const tempos = await Promise.all(Array.from({ length: 20 }, async () => {
                const inicio = performance.now();
                const resposta = await api('/api/notificacoes', guest);
                assert.equal(resposta.status, 200);
                return performance.now() - inicio;
            }));
            tempos.sort((a, b) => a - b);
            t.diagnostic(`GET local: p50=${tempos[9].toFixed(1)}ms; p95=${tempos[18].toFixed(1)}ms; 20 chamadas; 64 avisos sintéticos.`);
        });
    } finally {
        await qa.fechar();
    }
});
