require('dotenv').config();
const mysql = require('mysql2');

// Criando o Pool de Conexões (OWASP: Melhor performance e evita sobrecarga)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    // Banco hospedado (ex.: TiDB Cloud) usa porta própria e exige TLS. Local: nada muda.
    port: Number(process.env.DB_PORT) || 3306,
    ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    enableKeepAlive: true,
    maxIdle: 2,
    idleTimeout: 60000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convertendo para o formato de Promises, que é muito mais moderno e fácil de ler
const db = pool.promise();

// Testando a conexão inicialmente
db.getConnection()
    .then(connection => {
        console.log('✅ Conexão com o MySQL (Recanto Camargo) estabelecida com sucesso!');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Erro ao conectar com o banco de dados:', err.message);
    });

module.exports = db;
