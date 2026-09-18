const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { encryptCPF, hashCPF } = require('../utils/crypto');

exports.cadastrar = async (req, res) => {
    let conexao;
    try {
        conexao = await db.getConnection();
        let { nome, cpf, email, telefone, senha } = req.body;
        
        if (!nome || !cpf || !email || !senha) {
            return res.status(400).json({ error: 'Preencha todos os dados obrigatórios.' });
        }

        const cpfLimpo = String(cpf).replace(/\D/g, '');
        const telefoneLimpo = telefone ? String(telefone).replace(/\D/g, '') : '';
        
        if (cpfLimpo.length !== 11) {
            return res.status(400).json({ error: 'CPF inválido. Deve conter exatamente 11 números.' });
        }
        if (telefoneLimpo && (telefoneLimpo.length < 10 || telefoneLimpo.length > 11)) {
            return res.status(400).json({ error: 'Telefone inválido. Deve conter 10 ou 11 números (com DDD).' });
        }
        if (String(nome).length > 100 || String(senha).length > 100) {
            return res.status(400).json({ error: 'Nome ou Senha excedem o limite de 100 caracteres.' });
        }
        if (String(email).length > 255) {
            return res.status(400).json({ error: 'O E-mail excede o limite máximo permitido (255 caracteres).' });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);
        const cpfEncriptado = encryptCPF(cpfLimpo); 
        const cpfHash = hashCPF(cpfLimpo); 

        await conexao.beginTransaction();

        const queryUsuario = `
            INSERT INTO usu_usuario 
            (Usu_Nome, Usu_CPF, Usu_CPF_Hash, Usu_Email, Usu_Telefone, Usu_SenhaHash, Usu_Status) 
            VALUES (?, ?, ?, ?, ?, ?, 'ATIVO')
        `;
        const valoresUsuario = [nome, cpfEncriptado, cpfHash, email, telefone || '', senhaHash];
        const [resultadoUsuario] = await conexao.query(queryUsuario, valoresUsuario);
        
        const novoUsuarioId = resultadoUsuario.insertId;

        const queryHospede = `INSERT INTO hos_hospede (Usu_Id) VALUES (?)`;
        await conexao.query(queryHospede, [novoUsuarioId]);

        await conexao.commit();
        res.status(201).json({ message: 'Conta de Hóspede criada com sucesso!' });
    } catch (error) {
        if (conexao) await conexao.rollback();
        console.error('Erro no cadastro:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Este e-mail ou CPF já está cadastrado no sistema.' });
        }
        res.status(500).json({ error: 'Erro interno ao criar conta.' });
    } finally {
        if (conexao) conexao.release();
    }
};

exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) return res.status(400).json({ error: 'Forneça email e senha.' });

        const [rows] = await db.query('SELECT * FROM usu_usuario WHERE Usu_Email = ?', [email]);
        const usuario = rows[0];

        if (!usuario) return res.status(401).json({ error: 'Credenciais inválidas.' });
        if (usuario.Usu_Status !== 'ATIVO') return res.status(403).json({ error: 'Esta conta encontra-se inativa ou bloqueada.' });

        const senhaCorreta = await bcrypt.compare(senha, usuario.Usu_SenhaHash);
        if (!senhaCorreta) return res.status(401).json({ error: 'Credenciais inválidas.' });

        const [adminRows] = await db.query('SELECT * FROM pro_proprietario WHERE Usu_Id = ?', [usuario.Usu_Id]);
        const isAdmin = adminRows.length > 0;

        const payload = { 
            id: usuario.Usu_Id, 
            nome: usuario.Usu_Nome,
            tipo: isAdmin ? 'proprietario' : 'hospede'
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: false, 
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        res.json({ message: 'Login realizado!', usuario: payload });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

exports.sessao = (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Não autenticado.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ usuario: decoded });
    } catch (err) {
        res.status(401).json({ error: 'Sessão expirada.' });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    });
    res.json({ message: 'Logout realizado com sucesso!' });
};
