const test = require('node:test');
const assert = require('node:assert/strict');
const { processarCancelamentoReservasAbandonadas } = require('../services/housekeepingService');

function capturarLog() {
    const mensagens = [];
    const registrar = (...args) => mensagens.push(args);
    return { mensagens, logger: { log: registrar, warn: registrar, error: registrar, info: registrar } };
}

test('processarCancelamentoReservasAbandonadas rejeita execução sem banco de dados', async () => {
    await assert.rejects(
        async () => { await processarCancelamentoReservasAbandonadas(); },
        { message: /Instância do banco de dados não fornecida/ }
    );
});

test('processarCancelamentoReservasAbandonadas retorna zero quando não há reservas expiradas', async () => {
    const mockDb = {
        query: async (sql) => {
            if (/SELECT[\s\S]*FROM res_reserva/i.test(sql)) {
                return [[]];
            }
            throw new Error(`Consulta inesperada: ${sql}`);
        }
    };

    const resultado = await processarCancelamentoReservasAbandonadas({ db: mockDb });
    assert.equal(resultado.total, 0);
    assert.deepEqual(resultado.resultados, []);
});

test('processarCancelamentoReservasAbandonadas cancela PAGAMENTO_PENDENTE expirada (>24h), grava histórico e notifica', async () => {
    const reservaExpirada = {
        Res_Id: 801,
        Res_Status: 'PAGAMENTO_PENDENTE',
        Res_DataCheckIn: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        Res_DataCheckOut: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        Res_DataReserva: new Date(Date.now() - 30 * 60 * 60 * 1000),
        Usu_Id: 91,
        Usu_Nome: 'Marcos Oliveira',
        Usu_Email: 'marcos@example.com',
        dataUltimaTransicao: new Date(Date.now() - 26 * 60 * 60 * 1000) // 26h atrás
    };

    const statusAtualizado = [];
    const historicoInserido = [];

    const mockDb = {
        query: async (sql, params = []) => {
            if (/SELECT[\s\S]*FROM res_reserva/i.test(sql)) {
                return [[reservaExpirada]];
            }
            if (/UPDATE res_reserva SET Res_Status = "CANCELADA"/i.test(sql)) {
                statusAtualizado.push({ sql, params });
                return [{ affectedRows: 1 }];
            }
            if (/INSERT INTO his_historicoreservastatus/i.test(sql)) {
                historicoInserido.push({ sql, params });
                return [{ insertId: 901 }];
            }
            throw new Error(`Consulta inesperada: ${sql}`);
        }
    };

    const notificacoesEnviadas = [];
    const mockNotificacoes = {
        criarNotificacao: async (...args) => {
            notificacoesEnviadas.push(args);
            return { insertId: 44 };
        }
    };

    const emailsEnviados = [];
    const mockEmailService = {
        criarHtmlEmail: (titulo, mensagem, opts) => {
            return `<html><body><h1>${titulo}</h1><p>${mensagem}</p><pre>${JSON.stringify(opts)}</pre></body></html>`;
        },
        enviarEmail: async (para, assunto, html, chave) => {
            emailsEnviados.push({ para, assunto, html, chave });
            return { enviado: true, id: 'msg_expirada_1' };
        }
    };

    const resultado = await processarCancelamentoReservasAbandonadas({
        db: mockDb,
        emailService: mockEmailService,
        notificacoes: mockNotificacoes
    });

    assert.equal(resultado.total, 1);
    assert.equal(resultado.resultados[0].id, 801);
    assert.equal(resultado.resultados[0].sucesso, true);

    // 1. Status alterado para CANCELADA
    assert.equal(statusAtualizado.length, 1);
    assert.equal(statusAtualizado[0].params[0], 801);
    assert.equal(statusAtualizado[0].params[1], 'PAGAMENTO_PENDENTE');

    // 2. Histórico registrado com motivo de prazo de pagamento
    assert.equal(historicoInserido.length, 1);
    assert.equal(historicoInserido[0].params[0], 801);
    assert.equal(historicoInserido[0].params[1], 'PAGAMENTO_PENDENTE');
    assert.match(historicoInserido[0].params[2], /prazo de pagamento expirado \(24h\)/i);

    // 3. Notificação in-app criada
    assert.equal(notificacoesEnviadas.length, 1);
    assert.equal(notificacoesEnviadas[0][0], 91); // Usu_Id
    assert.match(notificacoesEnviadas[0][1], /Reserva Expirada/i);
    assert.equal(notificacoesEnviadas[0][4], 'bi-clock-history');

    // 4. E-mail enviado
    assert.equal(emailsEnviados.length, 1);
    assert.equal(emailsEnviados[0].para, 'marcos@example.com');
    assert.match(emailsEnviados[0].assunto, /Sua Pré-Reserva Expirou/i);
    assert.equal(emailsEnviados[0].chave, 'housekeeping/expirada/801');
    assert.ok(emailsEnviados[0].html.includes('#801'));
    assert.ok(emailsEnviados[0].html.includes('Prazo Expirado'));
});

test('processarCancelamentoReservasAbandonadas cancela PENDENTE expirada (>48h) e continua se envio de email falhar', async () => {
    const reservaPendente = {
        Res_Id: 802,
        Res_Status: 'PENDENTE',
        Res_DataCheckIn: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        Res_DataCheckOut: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        Res_DataReserva: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50h atrás
        Usu_Id: 92,
        Usu_Nome: 'Fabio Teste',
        Usu_Email: 'fabio@example.com'
    };

    const statusAtualizado = [];
    const mockDb = {
        query: async (sql, params = []) => {
            if (/SELECT[\s\S]*FROM res_reserva/i.test(sql)) {
                return [[reservaPendente]];
            }
            if (/UPDATE res_reserva SET Res_Status = "CANCELADA"/i.test(sql)) {
                statusAtualizado.push({ sql, params });
                return [{ affectedRows: 1 }];
            }
            if (/INSERT INTO his_historicoreservastatus/i.test(sql)) {
                return [{ insertId: 902 }];
            }
            throw new Error(`Consulta inesperada: ${sql}`);
        }
    };

    const log = capturarLog();
    const mockEmailService = {
        criarHtmlEmail: () => '<html></html>',
        enviarEmail: async () => {
            throw new Error('Falha simulada no envio de e-mail');
        }
    };

    const resultado = await processarCancelamentoReservasAbandonadas({
        db: mockDb,
        emailService: mockEmailService,
        logger: log.logger
    });

    assert.equal(resultado.total, 1);
    assert.equal(resultado.resultados[0].id, 802);
    assert.equal(resultado.resultados[0].sucesso, false);
    assert.match(resultado.resultados[0].erro, /Falha simulada no envio de e-mail/);
    assert.equal(statusAtualizado.length, 1);
    assert.equal(statusAtualizado[0].params[0], 802);
});
