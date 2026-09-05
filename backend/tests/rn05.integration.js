const test = require('node:test');
const assert = require('node:assert/strict');
const { criarAmbienteMySQL } = require('./support/mysql-harness');

test('RN05: decisões reais com titularidade, concorrência e regressões', {
    skip: process.env.RUN_MYSQL_INTEGRATION !== '1'
}, async t => {
    const qa = await criarAmbienteMySQL();
    try {
        const guest = await qa.login(2);
        const otherGuest = await qa.login(3);
        const owner = await qa.login(1);
        const api = async (path, cookie, method = 'GET', body) => {
            const response = await fetch(`${qa.url}${path}`, {
                method,
                headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
                ...(body !== undefined ? { body: JSON.stringify(body) } : {})
            });
            return { status: response.status, data: await response.json() };
        };
        const dates = offset => {
            const day = Date.now() + (365 + offset) * 86400000;
            return { checkin: new Date(day).toISOString().slice(0, 10), checkout: new Date(day + 86400000).toISOString().slice(0, 10), hospedes: 2 };
        };
        const create = async offset => {
            const response = await api('/api/reservas', guest, 'POST', { ...dates(offset), valorTotal: 0.01 });
            assert.equal(response.status, 201, JSON.stringify(response.data));
            return response.data.reservaId;
        };
        const status = async id => {
            const [rows] = await qa.admin.query('SELECT Res_Status, Res_ValorTotal FROM res_reserva WHERE Res_Id = ?', [id]);
            return rows[0];
        };
        const notices = async () => {
            const [rows] = await qa.admin.query('SELECT Not_Titulo, Not_Mensagem FROM not_notificacao WHERE Usu_Id = ? ORDER BY Not_Id', [2]);
            return rows;
        };
        let first;
        await t.test('nova reserva é pendente e mantém cálculo seguro e conflito de datas', async () => {
            first = await create(0);
            assert.equal((await status(first)).Res_Status, 'PENDENTE');
            assert.equal(Number((await status(first)).Res_ValorTotal), 200);
            assert.match(JSON.stringify(await notices()), /aguardando|aprova/i);
            assert.equal((await api('/api/reservas', otherGuest, 'POST', dates(0))).status, 409);
        });
        await t.test('comprovante mantém 200 titular, 403 terceiro e 401 sem sessão', async () => {
            assert.equal((await api(`/api/reservas/${first}`, guest)).status, 200);
            const thirdParty = await api(`/api/reservas/${first}`, otherGuest);
            assert.equal(thirdParty.status, 403);
            assert.deepEqual(Object.keys(thirdParty.data), ['error']);
            assert.equal((await api(`/api/reservas/${first}`)).status, 401);
        });
        await t.test('decisão exige sessão e papel de proprietário', async () => {
            for (const action of ['aprovar', 'recusar']) {
                assert.equal((await api(`/api/proprietario/reservas/${first}/${action}`, undefined, 'PATCH', {})).status, 401);
                assert.equal((await api(`/api/proprietario/reservas/${first}/${action}`, guest, 'PATCH', {})).status, 403);
            }
            assert.equal((await status(first)).Res_Status, 'PENDENTE');
        });
        await qa.admin.query('INSERT INTO pro_proprietario (Usu_Id) VALUES (?)', [3]);
        const foreignOwner = await qa.login(3);
        await t.test('outro proprietário não pode aprovar nem recusar imóvel alheio', async () => {
            for (const action of ['aprovar', 'recusar']) {
                const response = await api(`/api/proprietario/reservas/${first}/${action}`, foreignOwner, 'PATCH', {});
                assert.equal(response.status, 403);
                assert.deepEqual(Object.keys(response.data), ['error']);
            }
            assert.equal((await status(first)).Res_Status, 'PENDENTE');
        });
        await t.test('aprovação confirma e gera exatamente um novo aviso', async () => {
            const count = (await notices()).length;
            assert.equal((await api(`/api/proprietario/reservas/${first}/aprovar`, owner, 'PATCH', {})).status, 200);
            assert.equal((await status(first)).Res_Status, 'CONFIRMADA');
            const rows = await notices();
            assert.equal(rows.length, count + 1);
            assert.match(rows.at(-1).Not_Titulo, /Reserva Aprovada/i);
        });
        await t.test('decisões repetidas não sobrescrevem nem duplicam avisos', async () => {
            const count = (await notices()).length;
            for (const action of ['aprovar', 'recusar']) {
                const response = await api(`/api/proprietario/reservas/${first}/${action}`, owner, 'PATCH', {});
                assert.equal(response.status, 400);
                assert.equal(typeof response.data.error, 'string');
            }
            assert.equal((await status(first)).Res_Status, 'CONFIRMADA');
            assert.equal((await notices()).length, count);
        });
        await t.test('recusa persiste RECUSADA, inclui motivo e impede aprovação posterior', async () => {
            const id = await create(3);
            const count = (await notices()).length;
            const motivo = 'Período indisponível para manutenção.';
            assert.equal((await api(`/api/proprietario/reservas/${id}/recusar`, owner, 'PATCH', { motivo })).status, 200);
            assert.equal((await status(id)).Res_Status, 'RECUSADA');
            const rows = await notices();
            assert.equal(rows.length, count + 1);
            assert.match(rows.at(-1).Not_Titulo, /Reserva Recusada/i);
            assert.ok(rows.at(-1).Not_Mensagem.includes(motivo));
            assert.equal((await api(`/api/proprietario/reservas/${id}/aprovar`, owner, 'PATCH', {})).status, 400);
        });
        await t.test('recusa sem motivo também funciona', async () => {
            const id = await create(6);
            assert.equal((await api(`/api/proprietario/reservas/${id}/recusar`, owner, 'PATCH', {})).status, 200);
            assert.equal((await status(id)).Res_Status, 'RECUSADA');
        });
        await t.test('aprovar e recusar simultaneamente produzem um vencedor e um aviso', async () => {
            const id = await create(9);
            const count = (await notices()).length;
            const responses = await Promise.all(['aprovar', 'recusar'].map(action => api(`/api/proprietario/reservas/${id}/${action}`, owner, 'PATCH', {})));
            assert.deepEqual(responses.map(response => response.status).sort(), [200, 400]);
            assert.ok(['CONFIRMADA', 'RECUSADA'].includes((await status(id)).Res_Status));
            assert.equal((await notices()).length, count + 1);
        });
        await t.test('cupom é recalculado pelo servidor e revalidado antes de uma segunda reserva', async () => {
            const [coupon] = await qa.admin.query(
                'INSERT INTO cup_cupom (Cup_Codigo, Cup_TipoDesconto, Cup_ValorDoDesconto, Cup_DataValidade, Cup_LimiteUso) VALUES (?, ?, ?, ?, ?)',
                ['RN05QA', 'PERCENTUAL', 15, dates(30).checkout, 10]
            );
            const firstCoupon = await api('/api/reservas', guest, 'POST', {
                ...dates(12), cupomId: coupon.insertId, valorTotal: 0.01, desconto: 199
            });
            assert.equal(firstCoupon.status, 201);
            const [rows] = await qa.admin.query('SELECT Res_Status, Res_ValorTotal, Cup_Id FROM res_reserva WHERE Res_Id = ?', [firstCoupon.data.reservaId]);
            assert.equal(rows[0].Res_Status, 'PENDENTE');
            assert.equal(Number(rows[0].Res_ValorTotal), 170);
            assert.equal(rows[0].Cup_Id, coupon.insertId);
            const reused = await api('/api/reservas', guest, 'POST', { ...dates(15), cupomId: coupon.insertId });
            assert.equal(reused.status, 400);
            assert.match(reused.data.error, /utilizou/i);
        });
        await t.test('falha do provedor de email não reverte decisão persistida', async () => {
            const id = await create(18);
            const originalFetch = globalThis.fetch;
            let attempts = 0;
            process.env.RESEND_API_KEY = 're_invalid_rn05_qa';
            process.env.RESEND_FROM_EMAIL = 'QA <qa@example.invalid>';
            globalThis.fetch = async (url, options) => {
                if (String(url).startsWith('https://api.resend.com/')) {
                    attempts += 1;
                    return new Response(JSON.stringify({ name: 'validation_error', message: 'Falha simulada de QA' }), {
                        status: 403, headers: { 'Content-Type': 'application/json' }
                    });
                }
                return originalFetch(url, options);
            };
            try {
                const response = await api(`/api/proprietario/reservas/${id}/aprovar`, owner, 'PATCH', {});
                assert.equal(response.status, 200);
                for (let i = 0; i < 100 && attempts < 1; i++) await new Promise(resolve => setImmediate(resolve));
                assert.equal(attempts, 1);
                assert.equal((await status(id)).Res_Status, 'CONFIRMADA');
            } finally {
                globalThis.fetch = originalFetch;
                process.env.RESEND_API_KEY = '';
                process.env.RESEND_FROM_EMAIL = '';
            }
        });
    } finally {
        await qa.fechar();
    }
});
