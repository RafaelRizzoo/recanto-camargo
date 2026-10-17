const crypto = require('crypto');
require('dotenv').config();

function encryptCPF(cpfPlano) {
    const iv = crypto.randomBytes(12);
    const key = Buffer.from(process.env.CPF_ENCRYPTION_KEY, 'hex');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(cpfPlano, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function hashCPF(cpfPlano) {
    return crypto.createHmac('sha256', process.env.CPF_HMAC_SECRET)
                 .update(cpfPlano)
                 .digest('hex');
}

module.exports = { encryptCPF, hashCPF };
