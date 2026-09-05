const test = require('node:test');
const assert = require('node:assert/strict');
const { criarServicoNotificacoes, normalizarNotificacao, validarId } = require('../notificacoes');

function criarBancoMemoria(linhas = []) {
    const registros = linhas.map(linha => ({ ...linha }));
    const consultas = [];
    return {
        registros,
        consultas,
        async query(sql, parametros = []) {
            const consulta = sql.replace(/\s+/g, ' ').trim();
            consultas.push({ sql: consulta, parametros });
            assert.ok(Array.isArray(parametros), 'Parâmetros SQL precisam ser separados da consulta.');
            if (/^SELECT/i.test(consulta)) {
                assert.match(consulta, /Usu_Id\s*=\s*\?/i, 'Toda leitura deve restringir o usuário.');
                const idParam = /Not_Id\s*=\s*\?[\s\S]*Usu_Id\s*=\s*\?/i.test(consulta) ? 1 : 0;
                let resultado = registros.filter(linha => linha.Usu_Id === parametros[idParam]);
                if (/Not_Id\s*=\s*\?/i.test(consulta)) resultado = resultado.filter(linha => linha.Not_Id === parametros[1 - idParam]);
                if (/Not_Lida\s*=\s*(?:0|\?)/i.test(consulta)) resultado = resultado.filter(linha => linha.Not_Lida === 0);
                if (/COUNT\s*\(/i.test(consulta)) {
                    const alias = consulta.match(/COUNT\s*\([^)]*\)\s+(?:AS\s+)?([a-zA-Z_]+)/i)?.[1] || 'total';
                    return [[{ [alias]: resultado.length }]];
                }
                if (/ORDER BY/i.test(consulta)) {
                    assert.match(consulta, /Not_CriadaEm\s+DESC\s*,\s*(?:\w+\.)?Not_Id\s+DESC/i);
                    resultado.sort((a, b) => b.Not_CriadaEm - a.Not_CriadaEm || b.Not_Id - a.Not_Id);
                }
                if (/LIMIT\s+(?:50|\?)/i.test(consulta)) resultado = resultado.slice(0, 50);
                return [resultado.map(linha => ({ ...linha }))];
            }
            if (/^UPDATE/i.test(consulta)) {
                assert.match(consulta, /WHERE[\s\S]*Usu_Id\s*=\s*\?/i, 'Toda alteração deve restringir o usuário.');
                const temId = /WHERE[\s\S]*Not_Id\s*=\s*\?/i.test(consulta);
                const idPrimeiro = /WHERE[\s\S]*Not_Id\s*=\s*\?[\s\S]*Usu_Id\s*=\s*\?/i.test(consulta);
                const deslocamento = /SET\s+Not_Lida\s*=\s*\?/i.test(consulta) ? 1 : 0;
                const usuario = temId ? parametros[deslocamento + (idPrimeiro ? 1 : 0)] : parametros[deslocamento];
                const id = temId ? parametros[deslocamento + (idPrimeiro ? 0 : 1)] : null;
                let afetados = 0;
                for (const linha of registros) {
                    if (linha.Usu_Id !== usuario || (temId && linha.Not_Id !== id)) continue;
                    if (/WHERE[\s\S]*Not_Lida\s*=\s*0/i.test(consulta) && linha.Not_Lida !== 0) continue;
                    linha.Not_Lida = 1;
                    afetados += 1;
                }
                return [{ affectedRows: afetados }];
            }
            if (/^INSERT INTO\s+not_notificacao/i.test(consulta)) return [{ insertId: 987 }];
            throw new Error(`Consulta inesperada no teste: ${consulta}`);
        },
    };
}

function linha(id, usuario, lida = 0) {
    return {
        Not_Id: id, Usu_Id: usuario, Not_Titulo: `Título ${id}`, Not_Mensagem: `Mensagem ${id}`,
        Not_Tipo: 'SUCESSO', Not_Icone: 'bi-calendar-check', Not_Lida: lida,
        Not_CriadaEm: new Date('2026-09-04T15:00:00.000Z'),
    };
}

test('IDs aceitam somente inteiros positivos compatíveis com INT do MySQL', () => {
    for (const valor of [0, -1, 1.5, 2147483648, NaN, Infinity, null, undefined, [], {}, true, '', '1 OR 1=1']) {
        assert.throws(() => validarId(valor), TypeError, `Deveria rejeitar ${String(valor)}`);
    }
    assert.equal(validarId(1), 1);
    assert.equal(validarId('42'), 42);
    assert.equal(validarId(2147483647), 2147483647);
});

test('DTO público do sino contém apenas campos necessários e normaliza booleano', () => {
    const dto = normalizarNotificacao({ ...linha(1, 41, 1), Usu_Email: 'privado@example.com', Usu_CPF: 'privado' });
    assert.deepEqual(Object.keys(dto).sort(), ['criadaEm', 'icone', 'id', 'lida', 'mensagem', 'tipo', 'titulo']);
    assert.equal(dto.lida, true);
    assert.equal(dto.tipo, 'sucesso');
    assert.equal(dto.criadaEm, '2026-09-04T15:00:00.000Z');
});

test('lista apenas as 50 mais recentes do dono com desempate por ID, mas conta todas as não lidas', async () => {
    const banco = criarBancoMemoria([
        ...Array.from({ length: 60 }, (_, i) => linha(i + 1, 41)),
        ...Array.from({ length: 4 }, (_, i) => linha(100 + i, 99)),
    ]);
    const resultado = await criarServicoNotificacoes(banco).listarNotificacoes(41);
    assert.equal(resultado.notificacoes.length, 50);
    assert.equal(resultado.naoLidas, 60);
    assert.deepEqual(resultado.notificacoes.map(n => n.id), Array.from({ length: 50 }, (_, i) => 60 - i));
    assert.equal(banco.consultas.length, 2, 'Polling deve usar quantidade constante de consultas, sem N+1.');
});

test('marcar como lida bloqueia ID de outro usuário e permanece idempotente', async () => {
    const banco = criarBancoMemoria([linha(1, 41), linha(2, 99)]);
    const servico = criarServicoNotificacoes(banco);
    assert.equal(await servico.marcarLida(41, 2), false);
    assert.equal(banco.registros.find(n => n.Not_Id === 2).Not_Lida, 0);
    assert.equal(await servico.marcarLida(41, 1), true);
    assert.equal(await servico.marcarLida(41, 1), true);
    assert.equal(await servico.marcarLida(41, 999), false);
});

test('marcar todas atualiza exclusivamente o dono autenticado', async () => {
    const banco = criarBancoMemoria([linha(1, 41), linha(2, 41, 1), linha(3, 99)]);
    await criarServicoNotificacoes(banco).marcarTodasLidas(41);
    assert.deepEqual(banco.registros.map(n => n.Not_Lida), [1, 1, 0]);
});

test('inserção interna utiliza parâmetros e o executor da transação fornecida', async () => {
    const banco = criarBancoMemoria();
    const transacao = criarBancoMemoria();
    const titulo = "Reserva ' confirmada";
    const mensagem = 'Seu período foi confirmado.';
    await criarServicoNotificacoes(banco).criarNotificacao(41, titulo, mensagem, 'SUCESSO', 'bi-calendar-check', transacao);
    assert.equal(banco.consultas.length, 0);
    assert.equal(transacao.consultas.length, 1);
    assert.ok(transacao.consultas[0].parametros.includes(titulo));
    assert.ok(transacao.consultas[0].parametros.includes(mensagem));
    assert.equal(transacao.consultas[0].sql.includes(titulo), false);
});

test('entradas inválidas são rejeitadas antes de qualquer consulta', async () => {
    const banco = criarBancoMemoria();
    const servico = criarServicoNotificacoes(banco);
    await assert.rejects(() => servico.listarNotificacoes('1 OR 1=1'));
    await assert.rejects(() => servico.marcarLida(41, -1));
    await assert.rejects(() => servico.marcarTodasLidas(0));
    assert.equal(banco.consultas.length, 0);
});

test('criação restringe tamanho, tipo e ícone antes de inserir, incluindo texto unicode', async () => {
    const banco = criarBancoMemoria();
    const servico = criarServicoNotificacoes(banco);
    for (const argumentos of [
        [41, '', 'Mensagem'],
        [41, 'A'.repeat(121), 'Mensagem'],
        [41, 'Título', '😀'.repeat(501)],
        [41, 'Título', 'Mensagem', 'TIPO_INEXISTENTE'],
        [41, 'Título', 'Mensagem', 'INFO', 'bi-bell classe-arbitraria'],
    ]) await assert.rejects(() => servico.criarNotificacao(...argumentos));
    assert.equal(banco.consultas.length, 0);
    await servico.criarNotificacao(41, '😀'.repeat(120), '😀'.repeat(500));
    assert.equal(banco.consultas.length, 1, 'Os limites contam caracteres unicode como utf8mb4.');
});
