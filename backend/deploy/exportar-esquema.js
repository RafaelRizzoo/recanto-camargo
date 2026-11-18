// Exporta o ESQUEMA (CREATE TABLE) do banco configurado em backend/.env, sem dados.
// Uso: node deploy/exportar-esquema.js [arquivo-de-saida]
// Não imprime credenciais. Saída padrão: deploy/esquema_completo.sql
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
    const saida = process.argv[2] || path.join(__dirname, '..', 'deploy', 'esquema_completo.sql');
    const con = await mysql.createConnection({
        host: process.env.DB_HOST, port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    });
    const [tabelas] = await con.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
    const nomes = tabelas.map(t => Object.values(t)[0]);
    const partes = ['-- Esquema do Recanto Camargo (sem dados)', 'SET FOREIGN_KEY_CHECKS=0;', ''];
    const contagens = [];
    for (const nome of nomes) {
        const [[linha]] = await con.query(`SHOW CREATE TABLE \`${nome}\``);
        partes.push(linha['Create Table'].replace(/^CREATE TABLE/, 'CREATE TABLE IF NOT EXISTS') + ';', '');
        const [[c]] = await con.query(`SELECT COUNT(*) AS n FROM \`${nome}\``);
        contagens.push(`${nome}: ${c.n} linhas`);
    }
    partes.push('SET FOREIGN_KEY_CHECKS=1;', '');
    fs.writeFileSync(saida, partes.join('\n'));
    const [[v]] = await con.query('SELECT VERSION() AS v');
    console.log(`Versão: ${v.v}\nTabelas (${nomes.length}):\n  ` + contagens.join('\n  '));
    await con.end();
})().catch(e => { console.error('Falha:', e.message); process.exit(1); });
