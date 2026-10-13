const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularPoliticaCancelamento, calcularCancelamentoProprietario } = require('../services/politicaCancelamento');

test('Política de Reembolso: mais de 7 dias antes do check-in concede 100% de reembolso integral', () => {
    // Check-in em 10 dias
    const agora = new Date('2026-10-10T10:00:00Z');
    const checkin = new Date('2026-10-20T17:00:00Z'); // 10 dias depois
    const resultado = calcularPoliticaCancelamento(checkin, 800.00, agora);

    assert.equal(resultado.percentual, 100);
    assert.equal(resultado.faixa, 'INTEGRAL');
    assert.equal(resultado.valorTotal, 800.00);
    assert.equal(resultado.valorReembolso, 800.00);
    assert.equal(resultado.valorRetencao, 0.00);
    assert.ok(resultado.horasAntecedencia >= 168);
});

test('Política de Reembolso: entre 48h e 7 dias antes do check-in concede 50% de reembolso parcial', () => {
    // Check-in em 3 dias (72 horas)
    const agora = new Date('2026-10-13T10:00:00Z');
    const checkin = new Date('2026-10-16T17:00:00Z');
    const resultado = calcularPoliticaCancelamento(checkin, 620.00, agora);

    assert.equal(resultado.percentual, 50);
    assert.equal(resultado.faixa, 'PARCIAL');
    assert.equal(resultado.valorTotal, 620.00);
    assert.equal(resultado.valorReembolso, 310.00);
    assert.equal(resultado.valorRetencao, 310.00);
    assert.ok(resultado.horasAntecedencia >= 48 && resultado.horasAntecedencia < 168);
});

test('Política de Reembolso: menos de 48h antes do check-in retém 100% (sem reembolso)', () => {
    // Check-in em 24 horas
    const agora = new Date('2026-10-13T10:00:00Z');
    const checkin = new Date('2026-10-14T17:00:00Z');
    const resultado = calcularPoliticaCancelamento(checkin, 500.00, agora);

    assert.equal(resultado.percentual, 0);
    assert.equal(resultado.faixa, 'SEM_REEMBOLSO');
    assert.equal(resultado.valorTotal, 500.00);
    assert.equal(resultado.valorReembolso, 0.00);
    assert.equal(resultado.valorRetencao, 500.00);
    assert.ok(resultado.horasAntecedencia < 48);
});

test('Política de Reembolso: check-in no passado ou no-show resulta em sem reembolso (0%)', () => {
    const agora = new Date('2026-10-13T10:00:00Z');
    const checkinPassado = new Date('2026-10-10T17:00:00Z');
    const resultado = calcularPoliticaCancelamento(checkinPassado, 400.00, agora);

    assert.equal(resultado.percentual, 0);
    assert.equal(resultado.faixa, 'SEM_REEMBOLSO');
    assert.equal(resultado.valorReembolso, 0.00);
    assert.equal(resultado.valorRetencao, 400.00);
});

test('Política de Reembolso: cancelamento pelo proprietário concede sempre 100% integral independente do prazo', () => {
    const resultado = calcularCancelamentoProprietario(620.00);

    assert.equal(resultado.percentual, 100);
    assert.equal(resultado.faixa, 'INTEGRAL_PROPRIETARIO');
    assert.equal(resultado.valorTotal, 620.00);
    assert.equal(resultado.valorReembolso, 620.00);
    assert.equal(resultado.valorRetencao, 0.00);
});

