const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const app = express();

// Configurações iniciais (Proteção Sênior)
app.use(cors({
    origin: 'http://localhost:5173', // Apenas o nosso front-end tem acesso
    credentials: true // Permite a troca de cookies seguros
}));
app.use(express.json()); // Permite que a API receba dados no formato JSON
app.use(cookieParser()); // Habilita a leitura de cookies seguros do JWT

// --- FUNÇÕES DE CRIPTOGRAFIA DO CPF ---
// Criptografia Reversível (Para poder ler depois) - AES-256-GCM
function encryptCPF(cpfPlano) {
    const iv = crypto.randomBytes(12);
    const key = Buffer.from(process.env.CPF_ENCRYPTION_KEY, 'hex');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(cpfPlano, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

// Criptografia Irreversível (Para buscar no banco sem revelar) - HMAC-SHA256
function hashCPF(cpfPlano) {
    return crypto.createHmac('sha256', process.env.CPF_HMAC_SECRET)
                 .update(cpfPlano)
                 .digest('hex');
}

// --- PROTEÇÃO CONTRA FORÇA BRUTA (RATE LIMITING) ---
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Bloqueia após 5 tentativas incorretas
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos para proteger sua conta.' }
});


// ==========================================
// ROTAS DE AUTENTICAÇÃO E SEGURANÇA
// ==========================================

// 1. Rota de Cadastro de Usuário
app.post('/api/usuarios/cadastro', async (req, res) => {
    const conexao = await db.getConnection(); // Pega uma conexão exclusiva para a Transação
    try {
        let { nome, cpf, email, telefone, senha } = req.body;
        
        if (!nome || !cpf || !email || !senha) {
            conexao.release();
            return res.status(400).json({ error: 'Preencha todos os dados obrigatórios.' });
        }

        // --- BLINDAGEM DE ENTRADA (Prevenção contra Payload e XSS) ---
        // 1. Limpa tudo que não for número (Sanitização)
        const cpfLimpo = String(cpf).replace(/\D/g, '');
        const telefoneLimpo = telefone ? String(telefone).replace(/\D/g, '') : '';
        
        // 2. Trava de tamanho (Proteção contra Buffer Overflow)
        if (cpfLimpo.length !== 11) {
            conexao.release();
            return res.status(400).json({ error: 'CPF inválido. Deve conter exatamente 11 números.' });
        }
        if (telefoneLimpo && (telefoneLimpo.length < 10 || telefoneLimpo.length > 11)) {
            conexao.release();
            return res.status(400).json({ error: 'Telefone inválido. Deve conter 10 ou 11 números (com DDD).' });
        }
        if (String(nome).length > 100 || String(senha).length > 100) {
            conexao.release();
            return res.status(400).json({ error: 'Nome ou Senha excedem o limite de 100 caracteres.' });
        }
        if (String(email).length > 255) {
            conexao.release();
            return res.status(400).json({ error: 'O E-mail excede o limite máximo permitido (255 caracteres).' });
        }
        // -------------------------------------------------------------

        // A. Criptografia Pesada da Senha (Bcrypt)
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        // B. Mascaramento e Blind Index do CPF
        const cpfEncriptado = encryptCPF(cpfLimpo); 
        const cpfHash = hashCPF(cpfLimpo); 

        // INÍCIO DA TRANSAÇÃO SQL (Tudo ou Nada)
        await conexao.beginTransaction();

        // C. Salvar na Tabela Geral (usu_usuario)
        const queryUsuario = `
            INSERT INTO usu_usuario 
            (Usu_Nome, Usu_CPF, Usu_CPF_Hash, Usu_Email, Usu_Telefone, Usu_SenhaHash, Usu_Status) 
            VALUES (?, ?, ?, ?, ?, ?, 'ATIVO')
        `;
        const valoresUsuario = [nome, cpfEncriptado, cpfHash, email, telefone || '', senhaHash];
        const [resultadoUsuario] = await conexao.query(queryUsuario, valoresUsuario);
        
        const novoUsuarioId = resultadoUsuario.insertId;

        // D. Salvar na Tabela Específica (hos_hospede)
        const queryHospede = `INSERT INTO hos_hospede (Usu_Id) VALUES (?)`;
        await conexao.query(queryHospede, [novoUsuarioId]);

        // Tudo deu certo! Salva as duas tabelas no banco definitivamente.
        await conexao.commit();
        conexao.release();

        res.status(201).json({ message: 'Conta de Hóspede criada com sucesso!' });
    } catch (error) {
        // Deu erro no meio do caminho? Desfaz tudo! Ninguém vira "fantasma" no banco.
        await conexao.rollback();
        conexao.release();

        console.error('Erro no cadastro:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Este e-mail ou CPF já está cadastrado no sistema.' });
        }
        res.status(500).json({ error: 'Erro interno ao criar conta.' });
    }
});

// 2. Rota de Login Segura
app.post('/api/usuarios/login', loginLimiter, async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ error: 'Forneça email e senha.' });
        }

        // Buscar usuário (Sem revelar se o erro é no email ou na senha)
        const [rows] = await db.query('SELECT * FROM usu_usuario WHERE Usu_Email = ?', [email]);
        const usuario = rows[0];

        if (!usuario) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        if (usuario.Usu_Status !== 'ATIVO') {
            return res.status(403).json({ error: 'Esta conta encontra-se inativa ou bloqueada.' });
        }

        // Comparação Matemática da Senha (A regra do Arquiteto: COMPARE, NUNCA DECRIPTE)
        const senhaCorreta = await bcrypt.compare(senha, usuario.Usu_SenhaHash);
        if (!senhaCorreta) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        // 2.5 Consultar o Banco para saber se o Usuário tem "Crachá" de Proprietário
        const [adminRows] = await db.query('SELECT * FROM pro_proprietario WHERE Usu_Id = ?', [usuario.Usu_Id]);
        const isAdmin = adminRows.length > 0;

        // Montar a "Pulseira VIP" (Token JWT limpo, sem senhas ou cpfs)
        const payload = { 
            id: usuario.Usu_Id, 
            nome: usuario.Usu_Nome,
            tipo: isAdmin ? 'proprietario' : 'hospede' // A mágica acontece aqui (Atualizado para a arquitetura correta!)
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Devolver a Pulseira direto no Bolso (Cookie HttpOnly - Imune a Roubo via XSS)
        res.cookie('token', token, {
            httpOnly: true,
            secure: false, // Para HTTPS verdadeiro seria true
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
        });

        res.json({ message: 'Login realizado!', usuario: payload });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// 3. Rota para Validar a Sessão Ativa (Quando o usuário entra no site)
app.get('/api/usuarios/sessao', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Não autenticado.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ usuario: decoded });
    } catch (err) {
        res.status(401).json({ error: 'Sessão expirada.' });
    }
});

// 4. Rota de Logout (Rasgar a pulseira)
app.post('/api/usuarios/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout concluído.' });
});


// ==========================================
// MIDDLEWARES DE SEGURANÇA
// ==========================================

// Catraca: Só deixa passar quem tiver a Pulseira VIP (Cookie JWT) válida
const verificarToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Acesso negado. Faça login para continuar.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded; // Colocamos os dados do usuário dentro da requisição
        next(); // Pode passar!
    } catch (err) {
        res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }
};

// Catraca 2: Só deixa passar se além da Pulseira, a pessoa for Proprietária
const verificarProprietario = (req, res, next) => {
    // Primeiro garante que passou pelo verificarToken
    if (!req.usuario) return res.status(401).json({ error: 'Acesso negado.' });
    
    if (req.usuario.tipo !== 'proprietario') {
        return res.status(403).json({ error: 'Acesso negado. Esta área é restrita aos proprietários.' });
    }
    
    next(); // Pode passar, chefia!
};

// ==========================================
// ROTAS DE IMÓVEIS E RESERVAS
// ==========================================

app.get('/api/imoveis', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT Imo_Id, Imo_Nome, Imo_ValorFixo, Imo_NotaMedial FROM imo_imovel WHERE Imo_Status = ?', ['ATIVO']);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar os imóveis' });
    }
});

// Passamos o verificarToken aqui! A rota agora é protegida.
app.post('/api/reservas', verificarToken, async (req, res) => {
    // Ignoramos COMPLETAMENTE o 'valorTotal' que o front-end envia (Proteção contra Fraude)
    const { checkin, checkout, hospedes, observacoes } = req.body;
    
    const imoId = 1; // Chalé padrão (Futuramente dinâmico)
    const hospedeId = req.usuario.id; // Pegando do token JWT inviolável

    try {
        if (!checkin || !checkout || !hospedes) {
            return res.status(400).json({ error: 'Dados incompletos para a reserva.' });
        }

        // --- VALIDAÇÃO DE DATAS ---
        const dataCheckin = new Date(checkin);
        const dataCheckout = new Date(checkout);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (dataCheckin < hoje) {
            return res.status(400).json({ error: 'Você não pode reservar uma data no passado.' });
        }
        if (dataCheckout <= dataCheckin) {
            return res.status(400).json({ error: 'A data de checkout deve ser maior que o check-in.' });
        }

        // --- CÁLCULO SEGURO DO PREÇO (BLINDADO) ---
        // 1. Busca o preço oficial atualizado direto da "vitrine" (Tabela Imóvel)
        const [imoveis] = await db.query('SELECT Imo_ValorFixo FROM imo_imovel WHERE Imo_Id = ? AND Imo_Status = "ATIVO"', [imoId]);
        if (imoveis.length === 0) {
            return res.status(404).json({ error: 'Imóvel não encontrado ou inativo.' });
        }
        const precoDiariaDb = parseFloat(imoveis[0].Imo_ValorFixo);

        // 2. Calcula matematicamente quantas noites a pessoa vai ficar
        const msPorDia = 1000 * 60 * 60 * 24;
        const diffTime = Math.abs(dataCheckout - dataCheckin);
        const quantidadeNoites = Math.ceil(diffTime / msPorDia);

        // 3. O Servidor gera o preço final inviolável
        const valorFinalSeguro = quantidadeNoites * precoDiariaDb;
        // -------------------------------------------------------------
        
        // 4. Salva a fotografia do momento na reserva
        const query = `
            INSERT INTO res_reserva 
            (Imo_Id, Hos_Hospede_Usu_Id, Res_DataCheckIn, Res_DataCheckOut, Res_QuantidadeDeHospedes, Res_ValorTotal, Res_Status, Res_DataReserva, Res_ObsHospede) 
            VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMADA', NOW(), ?)
        `;
        const valores = [imoId, hospedeId, checkin, checkout, hospedes, valorFinalSeguro, observacoes || null];
        const [resultado] = await db.query(query, valores);
        
        res.status(201).json({ message: 'Reserva criada com sucesso no MySQL!', reservaId: resultado.insertId });
    } catch (error) {
        console.error('Erro ao criar reserva:', error);
        res.status(500).json({ error: 'Erro interno ao criar reserva.' });
    }
});

app.get('/api/reservas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT r.Res_Id as id, r.Res_DataCheckIn as checkin, r.Res_DataCheckOut as checkout, r.Res_ValorTotal as total, u.Usu_Nome as nome
            FROM res_reserva r JOIN usu_usuario u ON r.Hos_Hospede_Usu_Id = u.Usu_Id WHERE r.Res_Id = ?
        `;
        const [rows] = await db.query(query, [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Reserva não encontrada no banco' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar reserva:', error);
        res.status(500).json({ error: 'Erro interno ao buscar a reserva.' });
    }
});

// ==========================================
// ROTAS DO HÓSPEDE (DASHBOARD)
// ==========================================
app.get('/api/hospede/reservas', verificarToken, async (req, res) => {
    try {
        const hospedeId = req.usuario.id;
        
        // Puxa as reservas do hóspede, incluindo nome do imóvel
        const query = `
            SELECT 
                r.Res_Id as id,
                r.Res_DataCheckIn as checkin,
                r.Res_DataCheckOut as checkout,
                r.Res_QuantidadeDeHospedes as hospedes,
                r.Res_ValorTotal as valorTotal,
                r.Res_Status as status,
                r.Res_DataReserva as criadaEm,
                r.Res_ObsHospede as observacao,
                i.Imo_Nome as imovel,
                'Ponte Alta, Aparecida - SP' as localizacao,
                i.Imo_ValorFixo as valorDiaria
            FROM res_reserva r
            JOIN imo_imovel i ON r.Imo_Id = i.Imo_Id
            WHERE r.Hos_Hospede_Usu_Id = ?
            ORDER BY r.Res_DataCheckIn DESC
        `;
        
        const [reservas] = await db.query(query, [hospedeId]);
        
        // Mapeamento de status BD -> Frontend
        const statusMap = {
            'PENDENTE': 'pendente',
            'CONFIRMADA': 'aprovada', // Frontend usa 'aprovada'
            'CANCELADA': 'cancelada',
            'CONCLUIDA': 'concluida'
        };

        // Formatar datas para o padrão do frontend YYYY-MM-DD
        const reservasFormatadas = reservas.map(r => ({
            ...r,
            id: r.id.toString(), // Frontend espera string (ex: '5')
            checkin: r.checkin.toISOString().split('T')[0],
            checkout: r.checkout.toISOString().split('T')[0],
            criadaEm: r.criadaEm.toISOString().split('T')[0],
            status: statusMap[r.status] || 'pendente',
            formaPagamento: 'PIX', // Mock por enquanto
            avaliacao: null // Mock por enquanto
        }));

        res.json(reservasFormatadas);
    } catch (error) {
        console.error('Erro ao buscar reservas do hóspede:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// ==========================================
// ROTAS DO PROPRIETÁRIO (PAINEL DE ADMIN)
// ==========================================

app.get('/api/proprietario/reservas', verificarToken, verificarProprietario, async (req, res) => {
    try {
        const query = `
            SELECT 
                r.Res_Id as id,
                u.Usu_Nome as hospede,
                r.Res_QuantidadeDeHospedes as quantidadeHospedes,
                r.Res_DataCheckIn as checkin,
                r.Res_DataCheckOut as checkout,
                r.Res_ValorTotal as total,
                r.Res_Status as status,
                r.Res_DataReserva as criadaEm
            FROM res_reserva r
            JOIN hos_hospede h ON r.Hos_Hospede_Usu_Id = h.Usu_Id
            JOIN usu_usuario u ON h.Usu_Id = u.Usu_Id
            ORDER BY r.Res_DataCheckIn ASC
        `;
        const [reservas] = await db.query(query);

        const statusMap = {
            'PENDENTE': 'pendente',
            'CONFIRMADA': 'aprovada',
            'CANCELADA': 'recusada', // No painel do proprietário eles usam recusada
            'CONCLUIDA': 'concluida'
        };

        const reservasFormatadas = reservas.map(r => ({
            ...r,
            id: r.id.toString(),
            hospede: r.hospede, // Nome real do banco
            hospedes: r.quantidadeHospedes, // Quantidade
            checkin: r.checkin.toISOString().split('T')[0],
            checkout: r.checkout.toISOString().split('T')[0],
            criadaEm: r.criadaEm.toISOString().split('T')[0],
            total: Number(r.total), // Converte a string do MySQL para número, resolvendo o R$ NaN
            status: statusMap[r.status] || 'pendente'
        }));

        res.json(reservasFormatadas);
    } catch (error) {
        console.error('Erro ao buscar reservas para o proprietário:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// ==========================================
// OUTRAS ROTAS
// ==========================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
