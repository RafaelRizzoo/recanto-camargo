// Semeia o banco de TESTE hospedado: 1 proprietário + os 2 imóveis. Não copia dados pessoais do banco local.
// Uso (usa as variáveis DB_* e CPF_* do ambiente / .env; use o .env do banco de TESTE):
//   SEED_EMAIL=... SEED_SENHA=... SEED_CPF=<CPF válido de teste> node deploy/semear-teste.js
// Idempotente: se o e-mail já existir, reaproveita o usuário e só garante o papel e os imóveis.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { encryptCPF, hashCPF } = require('../utils/crypto');

(async () => {
    const { SEED_EMAIL, SEED_SENHA, SEED_CPF } = process.env;
    if (!SEED_EMAIL || !SEED_SENHA || !SEED_CPF) throw new Error('Defina SEED_EMAIL, SEED_SENHA e SEED_CPF.');
    const cpf = SEED_CPF.replace(/\D/g, '');
    let [[u]] = await db.query('SELECT Usu_Id FROM usu_usuario WHERE Usu_Email = ?', [SEED_EMAIL]);
    if (!u) {
        const [r] = await db.query(
            `INSERT INTO usu_usuario (Usu_Nome, Usu_CPF, Usu_CPF_Hash, Usu_Email, Usu_Telefone, Usu_SenhaHash, Usu_Status, Usu_DataAceiteTermos, Usu_VersaoTermosAceitos)
             VALUES (?, ?, ?, ?, ?, ?, 'ATIVO', NOW(), '1.0')`,
            ['Proprietário Teste', encryptCPF(cpf), hashCPF(cpf), SEED_EMAIL, encryptCPF('11999999999'), await bcrypt.hash(SEED_SENHA, 10)]);
        u = { Usu_Id: r.insertId };
    }
    await db.query('INSERT IGNORE INTO pro_proprietario (Usu_Id) VALUES (?)', [u.Usu_Id]);
    const imoveis = [
        [1, 'Recanto Camargo 1', 'Rua José Ourives, 76 - Ponte Alta, Aparecida/SP', 'Casa completa a 5 min a pé da Basílica: 2 quartos, sala com sofás-cama, cozinha equipada, área gourmet com churrasqueira e garagem. Até 10 hóspedes.'],
        [2, 'Recanto Camargo 2', 'Américo Ferreira Iria, 240 - Ponte Alta, Aparecida/SP', 'Casa completa na Ponte Alta, perto da Basílica: 2 quartos com ventilador de teto, sala, cozinha equipada e área gourmet com churrasqueira no terraço. Até 10 hóspedes.'],
    ];
    for (const [id, nome, end, desc] of imoveis) {
        await db.query(
            `INSERT IGNORE INTO imo_imovel (Imo_Id, Pro_Proprietario_Usu_Id, Imo_Nome, Imo_Endereco, Imo_Descricao, Imo_ValorFixo, Imo_ValorFimSemana, Imo_Status, Imo_NotaMedial)
             VALUES (?, ?, ?, ?, ?, 350.00, 450.00, 'ATIVO', 5.0)`, [id, u.Usu_Id, nome, end, desc]);
    }
    console.log('Seed concluído: proprietário id', u.Usu_Id, '+ 2 imóveis.');
    process.exit(0);
})().catch(e => { console.error('Falha:', e.message); process.exit(1); });
