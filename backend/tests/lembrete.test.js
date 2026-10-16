const test = require('node:test');
const assert = require('node:assert/strict');
const { processarLembretesPreCheckin, processarConvitesPosCheckoutAvaliacao, formatarDataBr } = require('../services/lembreteService');

function capturarLog() {
    const mensagens = [];
    const registrar = (...args) => mensagens.push(args);
    return { mensagens, logger: { log: registrar, warn: registrar, error: registrar, info: registrar } };
}

test('formatarDataBr formata datas corretamente no padrão pt-BR', () => {
    assert.equal(formatarDataBr(null), '');
    assert.equal(formatarDataBr(undefined), '');
    const dataIso = new Date('2026-11-03T15:00:00.000Z');
    const formatada = formatarDataBr(dataIso);
    assert.match(formatada, /03\/11\/2026/);
});

test('processarLembretesPreCheckin rejeita execução sem banco de dados fornecido', async () => {
    await assert.rejects(
        async () => { await processarLembretesPreCheckin(); },
        { message: /Instância do banco de dados não fornecida/ }
    );
});

test('processarLembretesPreCheckin retorna vazio quando não há reservas elegíveis', async () => {
    const mockDb = {
        query: async (sql) => {
            if (/SELECT[\s\S]*FROM res_reserva/i.test(sql)) {
                return [[]]; // nenhuma reserva
            }
            throw new Error(`Consulta inesperada: ${sql}`);
        }
    };

    const resultado = await processarLembretesPreCheckin({ db: mockDb });
    assert.equal(resultado.total, 0);
    assert.deepEqual(resultado.resultados, []);
});

test('processarLembretesPreCheckin processa reservas dentro da janela de 48h, insere histórico, notificação e envia email', async () => {
    const reservasFalsas = [
        {
            Res_Id: 201,
            Res_DataCheckIn: new Date(Date.now() + 24 * 60 * 60 * 1000), // daqui a 24h
            Res_DataCheckOut: new Date(Date.now() + 72 * 60 * 60 * 1000),
            Res_QuantidadeDeHospedes: 3,
            Res_ValorTotal: 850.00,
            Usu_Id: 42,
            Usu_Nome: 'Carlos Eduardo',
            Usu_Email: 'carlos@example.com'
        }
    ];

    const historicoInserido = [];
    const mockDb = {
        query: async (sql, params = []) => {
            if (/SELECT[\s\S]*FROM res_reserva/i.test(sql)) {
                return [reservasFalsas];
            }
            if (/INSERT INTO his_historicoreservastatus/i.test(sql)) {
                historicoInserido.push({ sql, params });
                return [{ insertId: 99 }];
            }
            throw new Error(`Consulta inesperada: ${sql}`);
        }
    };

    const notificacoesEnviadas = [];
    const mockNotificacoes = {
        criarNotificacao: async (...args) => {
            notificacoesEnviadas.push(args);
            return { insertId: 55 };
        }
    };

    const emailsEnviados = [];
    const mockEmailService = {
        criarHtmlEmail: (titulo, mensagem, opts) => {
            return `<html><body><h1>${titulo}</h1><p>${mensagem}</p><pre>${JSON.stringify(opts)}</pre></body></html>`;
        },
        enviarEmail: async (para, assunto, html, chaveIdempotencia) => {
            emailsEnviados.push({ para, assunto, html, chaveIdempotencia });
            return { enviado: true, id: 'msg_123' };
        }
    };

    const resultado = await processarLembretesPreCheckin({
        db: mockDb,
        emailService: mockEmailService,
        notificacoes: mockNotificacoes
    });

    assert.equal(resultado.total, 1);
    assert.equal(resultado.resultados.length, 1);
    assert.equal(resultado.resultados[0].sucesso, true);
    assert.equal(resultado.resultados[0].id, 201);

    // 1. Histórico inserido no DB para evitar reenvio
    assert.equal(historicoInserido.length, 1);
    assert.equal(historicoInserido[0].params[0], 201);

    // 2. Notificação in-app criada
    assert.equal(notificacoesEnviadas.length, 1);
    assert.equal(notificacoesEnviadas[0][0], 42); // Usu_Id
    assert.match(notificacoesEnviadas[0][1], /viagem está chegando/i);
    assert.equal(notificacoesEnviadas[0][4], 'bi-calendar-check');

    // 3. Email enviado com chave de idempotência
    assert.equal(emailsEnviados.length, 1);
    assert.equal(emailsEnviados[0].para, 'carlos@example.com');
    assert.match(emailsEnviados[0].assunto, /Sua Estadia Está Chegando/i);
    assert.equal(emailsEnviados[0].chaveIdempotencia, 'lembrete-pre-checkin/201');
    assert.ok(emailsEnviados[0].html.includes('#201'));
    assert.ok(emailsEnviados[0].html.includes('3 pessoas'));
});

test('processarLembretesPreCheckin continua processando lote se o email de uma reserva falhar', async () => {
    const reservasFalsas = [
        {
            Res_Id: 301,
            Res_DataCheckIn: new Date(Date.now() + 20 * 60 * 60 * 1000),
            Res_DataCheckOut: new Date(Date.now() + 60 * 60 * 1000),
            Res_QuantidadeDeHospedes: 2,
            Res_ValorTotal: 500.00,
            Usu_Id: 51,
            Usu_Nome: 'Ana Falha',
            Usu_Email: 'ana@falha.com'
        },
        {
            Res_Id: 302,
            Res_DataCheckIn: new Date(Date.now() + 22 * 60 * 60 * 1000),
            Res_DataCheckOut: new Date(Date.now() + 65 * 60 * 1000),
            Res_QuantidadeDeHospedes: 4,
            Res_ValorTotal: 900.00,
            Usu_Id: 52,
            Usu_Nome: 'Beatriz Sucesso',
            Usu_Email: 'beatriz@sucesso.com'
        }
    ];

    const mockDb = {
        query: async (sql) => {
            if (/SELECT[\s\S]*FROM res_reserva/i.test(sql)) {
                return [reservasFalsas];
            }
            if (/INSERT INTO his_historicoreservastatus/i.test(sql)) {
                return [{ insertId: 100 }];
            }
            throw new Error(`Consulta inesperada: ${sql}`);
        }
    };

    const log = capturarLog();
    const emailsEnviados = [];
    const mockEmailService = {
        criarHtmlEmail: () => '<html></html>',
        enviarEmail: async (para, assunto, html, chave) => {
            if (para === 'ana@falha.com') {
                throw new Error('Falha simulada de rede SMTP');
            }
            emailsEnviados.push({ para, chave });
            return { enviado: true };
        }
    };

    const resultado = await processarLembretesPreCheckin({
        db: mockDb,
        emailService: mockEmailService,
        logger: log.logger
    });

    assert.equal(resultado.total, 2);
    assert.equal(resultado.resultados[0].id, 301);
    assert.equal(resultado.resultados[0].sucesso, false);
    assert.match(resultado.resultados[0].erro, /Falha simulada de rede/);

    assert.equal(resultado.resultados[1].id, 302);
    assert.equal(resultado.resultados[1].sucesso, true);

    assert.equal(emailsEnviados.length, 1);
    assert.equal(emailsEnviados[0].para, 'beatriz@sucesso.com');
});

test('processarConvitesPosCheckoutAvaliacao rejeita execução sem banco de dados fornecido', async () => {
    await assert.rejects(
        async () => { await processarConvitesPosCheckoutAvaliacao(); },
        { message: /Instância do banco de dados não fornecida/ }
    );
});

test('processarConvitesPosCheckoutAvaliacao retorna vazio quando não há reservas pós-checkout', async () => {
    const mockDb = {
        query: async (sql) => {
            if (/SELECT[\s\S]*FROM res_reserva/i.test(sql)) {
                return [[]];
            }
            throw new Error(`Consulta inesperada: ${sql}`);
        }
    };

    const resultado = await processarConvitesPosCheckoutAvaliacao({ db: mockDb });
    assert.equal(resultado.total, 0);
    assert.deepEqual(resultado.resultados, []);
});

test('processarConvitesPosCheckoutAvaliacao dispara convites para estadias finalizadas, grava histórico e notificação bi-star', async () => {
    const reservasFalsas = [
        {
            Res_Id: 501,
            Res_Status: 'CONCLUIDA',
            Res_DataCheckIn: new Date(Date.now() - 72 * 60 * 60 * 1000),
            Res_DataCheckOut: new Date(Date.now() - 26 * 60 * 60 * 1000), // checkout há 26h
            Res_QuantidadeDeHospedes: 2,
            Usu_Id: 77,
            Usu_Nome: 'Juliana Silva',
            Usu_Email: 'juliana@example.com'
        }
    ];

    const historicoInserido = [];
    const mockDb = {
        query: async (sql, params = []) => {
            if (/SELECT[\s\S]*FROM res_reserva/i.test(sql)) {
                return [reservasFalsas];
            }
            if (/INSERT INTO his_historicoreservastatus/i.test(sql)) {
                historicoInserido.push({ sql, params });
                return [{ insertId: 701 }];
            }
            throw new Error(`Consulta inesperada: ${sql}`);
        }
    };

    const notificacoesEnviadas = [];
    const mockNotificacoes = {
        criarNotificacao: async (...args) => {
            notificacoesEnviadas.push(args);
            return { insertId: 88 };
        }
    };

    const emailsEnviados = [];
    const mockEmailService = {
        criarHtmlEmail: (titulo, mensagem, opts) => {
            return `<html><body><h1>${titulo}</h1><p>${mensagem}</p><pre>${JSON.stringify(opts)}</pre></body></html>`;
        },
        enviarEmail: async (para, assunto, html, chaveIdempotencia) => {
            emailsEnviados.push({ para, assunto, html, chaveIdempotencia });
            return { enviado: true, id: 'msg_convite_1' };
        }
    };

    const resultado = await processarConvitesPosCheckoutAvaliacao({
        db: mockDb,
        emailService: mockEmailService,
        notificacoes: mockNotificacoes
    });

    assert.equal(resultado.total, 1);
    assert.equal(resultado.resultados[0].id, 501);
    assert.equal(resultado.resultados[0].sucesso, true);

    // 1. Histórico gravado
    assert.equal(historicoInserido.length, 1);
    assert.equal(historicoInserido[0].params[0], 501);
    assert.equal(historicoInserido[0].params[1], 'CONCLUIDA');

    // 2. Notificação in-app criada
    assert.equal(notificacoesEnviadas.length, 1);
    assert.equal(notificacoesEnviadas[0][0], 77); // Usu_Id
    assert.match(notificacoesEnviadas[0][1], /experiência no Recanto Camargo/i);
    assert.equal(notificacoesEnviadas[0][4], 'bi-star');

    // 3. Email com chave de idempotência de avaliação
    assert.equal(emailsEnviados.length, 1);
    assert.equal(emailsEnviados[0].para, 'juliana@example.com');
    assert.match(emailsEnviados[0].assunto, /experiência no Recanto Camargo/i);
    assert.equal(emailsEnviados[0].chaveIdempotencia, 'convite-avaliacao/501');
    assert.ok(emailsEnviados[0].html.includes('#501'));
    assert.ok(emailsEnviados[0].html.includes('Avaliar Minha Estadia'));
});
