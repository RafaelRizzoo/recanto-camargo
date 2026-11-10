const test = require('node:test');
const assert = require('node:assert/strict');
const { emailValido, cpfValido } = require('../utils/validacoes');

test('Validação: CPF aceita número com dígitos verificadores corretos (com ou sem máscara)', () => {
    assert.equal(cpfValido('52998224725'), true);
    assert.equal(cpfValido('529.982.247-25'), true);
});

test('Validação: CPF rejeita tamanho errado, dígitos errados e sequências repetidas', () => {
    assert.equal(cpfValido('123'), false);
    assert.equal(cpfValido('12345678901'), false);
    assert.equal(cpfValido('52998224726'), false);
    assert.equal(cpfValido('11111111111'), false);
    assert.equal(cpfValido(''), false);
    assert.equal(cpfValido(undefined), false);
});

test('Validação: e-mail aceita formato comum e rejeita texto sem @, sem domínio ou com espaço', () => {
    assert.equal(emailValido('rafael@tecnored.com.br'), true);
    assert.equal(emailValido('nome.sobrenome+teste@dominio.com'), true);
    assert.equal(emailValido('abc'), false);
    assert.equal(emailValido('a@b'), false);
    assert.equal(emailValido('a b@c.com'), false);
    assert.equal(emailValido(''), false);
    assert.equal(emailValido(null), false);
});
