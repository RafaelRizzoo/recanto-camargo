const mysql = require('mysql2/promise');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('node:path');

// Usa apenas o schema do banco de origem. Nenhum dado de cliente é copiado.
async function criarAmbienteMySQL() {
    const config = dotenv.config({ path: process.env.QA_ENV_FILE || path.join(__dirname, '../../.env'), quiet: true }).parsed;
    if (!config?.DB_NAME) throw new Error('Configure QA_ENV_FILE com um .env local para o teste MySQL.');
    const origem = config.DB_NAME;
    const nome = `recanto_notif_qa_${randomBytes(6).toString('hex')}`;
    const admin = await mysql.createConnection({ host: config.DB_HOST, user: config.DB_USER, password: config.DB_PASSWORD });
    let pool;
    let server;
    let criado = false;
    async function fechar() {
        if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
        if (pool) await pool.end();
        if (criado) {
            if (!/^recanto_notif_qa_[a-f0-9]{12}$/.test(nome) || nome === origem) throw new Error('Nome de banco de teste inválido.');
            await admin.query(`DROP DATABASE ${mysql.escapeId(nome)}`);
        }
        await admin.end();
    }
    try {
        const [tabelas] = await admin.query(
            'SELECT TABLE_NAME AS nome FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ?',
            [origem, 'BASE TABLE']
        );
        const [vinculos] = await admin.query(
            'SELECT TABLE_NAME AS origem, REFERENCED_TABLE_NAME AS destino, REFERENCED_TABLE_SCHEMA AS bancoDestino FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL',
            [origem]
        );
        if (vinculos.some(v => v.bancoDestino !== origem)) throw new Error('Teste não aceita FKs entre bancos.');
        const ordenadas = [];
        const restantes = new Set(tabelas.map(t => t.nome));
        while (restantes.size) {
            const disponivel = [...restantes].find(t => vinculos.filter(v => v.origem === t).every(v => !restantes.has(v.destino)));
            if (!disponivel) throw new Error('Schema possui dependências cíclicas; não é possível clonar com este teste.');
            ordenadas.push(disponivel);
            restantes.delete(disponivel);
        }
        await admin.query(`CREATE DATABASE ${mysql.escapeId(nome)} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
        criado = true;
        await admin.query(`USE ${mysql.escapeId(nome)}`);
        const [bancoSelecionado] = await admin.query('SELECT DATABASE() AS nome');
        if (bancoSelecionado[0].nome !== nome) throw new Error('Banco descartável não selecionado.');
        for (const tabela of ordenadas) {
            const [ddl] = await admin.query(`SHOW CREATE TABLE ${mysql.escapeId(origem)}.${mysql.escapeId(tabela)}`);
            await admin.query(ddl[0]['Create Table'].replace(/ AUTO_INCREMENT=\d+/g, ''));
        }

        // Contas e imóvel inteiramente fictícios, restritos ao banco descartável.
        const senha = `QA-${randomBytes(16).toString('hex')}`;
        const senhaHash = await bcrypt.hash(senha, 4);
        for (const [id, nomeUsuario] of [[1, 'Proprietário QA'], [2, 'Hóspede QA'], [3, 'Outro Hóspede QA']]) {
            await admin.query(
                'INSERT INTO usu_usuario (Usu_Id, Usu_Nome, Usu_CPF, Usu_CPF_Hash, Usu_Email, Usu_Telefone, Usu_SenhaHash, Usu_Status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [id, nomeUsuario, 'FICTICIO', `FICTICIO-${id}`, `qa${id}@example.invalid`, '', senhaHash, 'ATIVO']
            );
        }
        await admin.query('INSERT INTO pro_proprietario (Usu_Id) VALUES (?)', [1]);
        await admin.query('INSERT INTO hos_hospede (Usu_Id) VALUES (?), (?)', [2, 3]);
        await admin.query(
            'INSERT INTO imo_imovel (Imo_Id, Pro_Proprietario_Usu_Id, Imo_Nome, Imo_Endereco, Imo_Descricao, Imo_ValorFixo, Imo_Status, Imo_NotaMedial) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [1, 1, 'Imóvel de QA', 'Endereço fictício', 'Teste automatizado isolado', 200, 'ATIVO', 0]
        );
        Object.assign(process.env, {
            DB_HOST: config.DB_HOST, DB_USER: config.DB_USER, DB_PASSWORD: config.DB_PASSWORD,
            DB_NAME: nome, JWT_SECRET: randomBytes(32).toString('hex'),
            RESEND_API_KEY: '', RESEND_FROM_EMAIL: '', NODE_ENV: 'test'
        });
        const app = require('../../server');
        pool = require('../../db');
        const [bancoApp] = await pool.query('SELECT DATABASE() AS nome');
        if (bancoApp[0].nome !== nome) throw new Error('A aplicação não está usando o banco descartável.');
        server = app.listen(Number(process.env.QA_API_PORT || 0), '127.0.0.1');
        await once(server, 'listening');
        const url = `http://127.0.0.1:${server.address().port}`;
        async function login(id) {
            const resposta = await fetch(`${url}/api/usuarios/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: `qa${id}@example.invalid`, senha })
            });
            if (!resposta.ok) throw new Error('Falha no login da conta sintética.');
            return resposta.headers.get('set-cookie').split(';')[0];
        }
        return { admin, pool, url, login, nome, fechar, senha };
    } catch (error) {
        await fechar();
        throw error;
    }
}

module.exports = { criarAmbienteMySQL };
