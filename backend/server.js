const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { criarServicoNotificacoes, validarId: validarIdNotificacao } = require('./notificacoes');
const { criarServicoEmail, criarHtmlEmail } = require('./email');

const notificacoes = criarServicoNotificacoes(db);
const { enviarEmail } = criarServicoEmail();

const app = express();

// Configurações iniciais 
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
    
    next(); // Acesso Liberado para Proprietário.
};

class ErroHttp extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'ErroHttp';
        this.status = status;
    }
}

async function garantirHospede(executor, usuarioId, bloquear = false) {
    const lock = bloquear ? ' FOR UPDATE' : '';
    const [hospedes] = await executor.query(
        `SELECT h.Usu_Id
         FROM hos_hospede h
         INNER JOIN usu_usuario u ON u.Usu_Id = h.Usu_Id
         WHERE h.Usu_Id = ? AND u.Usu_Status = ?
         LIMIT 1${lock}`,
        [usuarioId, 'ATIVO']
    );

    if (hospedes.length === 0) {
        throw new ErroHttp(403, 'Acesso permitido apenas a hóspedes.');
    }
}

async function garantirProprietario(executor, usuarioId, bloquear = false) {
    const lock = bloquear ? ' FOR UPDATE' : '';
    const [proprietarios] = await executor.query(
        `SELECT p.Usu_Id
         FROM pro_proprietario p
         INNER JOIN usu_usuario u ON u.Usu_Id = p.Usu_Id
         WHERE p.Usu_Id = ? AND u.Usu_Status = ?
         LIMIT 1${lock}`,
        [usuarioId, 'ATIVO']
    );

    if (proprietarios.length === 0) {
        throw new ErroHttp(403, 'Acesso permitido apenas a proprietários ativos.');
    }
}

function normalizarIdPositivo(valor, nomeCampo) {
    const validoComoNumero = typeof valor === 'number'
        && Number.isSafeInteger(valor)
        && valor > 0;
    const validoComoTexto = typeof valor === 'string'
        && /^[1-9]\d*$/.test(valor.trim())
        && Number.isSafeInteger(Number(valor));

    if (!validoComoNumero && !validoComoTexto) {
        throw new ErroHttp(400, `${nomeCampo} inválido.`);
    }

    return Number(valor);
}

function normalizarNota(valor) {
    const nota = typeof valor === 'number'
        ? valor
        : (typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : NaN);

    if (!Number.isFinite(nota) || nota < 1 || nota > 5 || !Number.isInteger(nota * 2)) {
        throw new ErroHttp(400, 'A nota deve estar entre 1 e 5, em intervalos de meio ponto.');
    }

    return nota;
}

function normalizarComentario(valor, obrigatorio = false) {
    if (valor !== undefined && valor !== null && typeof valor !== 'string') {
        throw new ErroHttp(400, 'O comentário deve ser um texto válido.');
    }

    const comentario = typeof valor === 'string' ? valor.trim() : '';

    if (obrigatorio && comentario.length === 0) {
        throw new ErroHttp(400, 'Informe um comentário para a resposta.');
    }
    if (comentario.length > 255) {
        throw new ErroHttp(400, 'O comentário deve ter no máximo 255 caracteres.');
    }

    return comentario;
}

function normalizarRespostaProprietario(avaliacao, incluirNota = true) {
    const semResposta = avaliacao.respostaNota === null
        && avaliacao.respostaComentario === null
        && avaliacao.respostaData === null;

    if (semResposta) return null;

    const resposta = {
        comentario: avaliacao.respostaComentario || '',
        data: avaliacao.respostaData
    };

    if (incluirNota) resposta.nota = Number(avaliacao.respostaNota);

    return resposta;
}

function normalizarAvaliacao(avaliacao, incluirNotaProprietario = true) {
    return {
        id: Number(avaliacao.id),
        nota: Number(avaliacao.nota),
        comentario: avaliacao.comentario || '',
        data: avaliacao.data,
        respostaProprietario: normalizarRespostaProprietario(avaliacao, incluirNotaProprietario)
    };
}

function normalizarCupom(cupom) {
    const id = Number(cupom.Cup_Id);
    const valorDesconto = Number(cupom.Cup_ValorDoDesconto);
    const limiteUso = Number(cupom.Cup_LimiteUso);
    const tipoDesconto = cupom.Cup_TipoDesconto;

    const idInvalido = !Number.isSafeInteger(id) || id <= 0;
    const percentualInvalido = tipoDesconto === 'PERCENTUAL' && valorDesconto > 100;
    const tipoInvalido = !['PERCENTUAL', 'FIXO'].includes(tipoDesconto);
    const valorInvalido = !Number.isFinite(valorDesconto) || valorDesconto <= 0;
    const limiteInvalido = !Number.isSafeInteger(limiteUso) || limiteUso <= 0;

    if (idInvalido || tipoInvalido || valorInvalido || percentualInvalido || limiteInvalido) {
        throw new ErroHttp(409, 'Este cupom possui uma configuração inválida.');
    }

    return {
        id,
        codigo: cupom.Cup_Codigo,
        tipoDesconto,
        valorDesconto,
        validoAte: cupom.Cup_DataValidade,
        limiteUso
    };
}

async function buscarCupomPorCodigo(executor, codigo) {
    const [cupons] = await executor.query(
        `SELECT
            Cup_Id,
            Cup_Codigo,
            Cup_TipoDesconto,
            Cup_ValorDoDesconto,
            DATE_FORMAT(Cup_DataValidade, '%Y-%m-%d') AS Cup_DataValidade,
            Cup_LimiteUso,
            (Cup_DataValidade < CURDATE()) AS Cup_Expirado
         FROM cup_cupom
         WHERE UPPER(Cup_Codigo) = UPPER(?)
         LIMIT 2`,
        [codigo]
    );

    if (cupons.length === 0) {
        throw new ErroHttp(404, 'Cupom não encontrado.');
    }

    // O schema atual ainda não possui UNIQUE em Cup_Codigo; em caso de
    // ambiguidade, falhamos de forma fechada em vez de escolher um cupom ao acaso.
    if (cupons.length > 1) {
        console.error('Inconsistência de integridade: código de cupom duplicado.');
        throw new ErroHttp(409, 'Não foi possível validar este cupom.');
    }

    return cupons[0];
}

async function buscarCupomPorIdComLock(executor, cupomId) {
    const [cupons] = await executor.query(
        `SELECT
            Cup_Id,
            Cup_Codigo,
            Cup_TipoDesconto,
            Cup_ValorDoDesconto,
            DATE_FORMAT(Cup_DataValidade, '%Y-%m-%d') AS Cup_DataValidade,
            Cup_LimiteUso,
            (Cup_DataValidade < CURDATE()) AS Cup_Expirado
         FROM cup_cupom
         WHERE Cup_Id = ?
         FOR UPDATE`,
        [cupomId]
    );

    if (cupons.length === 0) {
        throw new ErroHttp(404, 'Cupom não encontrado.');
    }

    return cupons[0];
}

async function validarRegrasCupom(executor, cupomDb, hospedeId, bloquearUsos = false) {
    if (Number(cupomDb.Cup_Expirado) === 1) {
        throw new ErroHttp(400, 'Este cupom expirou.');
    }

    const cupom = normalizarCupom(cupomDb);

    const [contagensCodigo] = await executor.query(
        'SELECT COUNT(*) AS totalCodigos FROM cup_cupom WHERE UPPER(Cup_Codigo) = UPPER(?)',
        [cupom.codigo]
    );
    const totalCodigos = Number(contagensCodigo[0].totalCodigos);

    // Também falha fechado quando um cliente tenta pular /api/cupons/validar
    // e envia diretamente o ID de um cupom cujo código está duplicado.
    if (!Number.isSafeInteger(totalCodigos) || totalCodigos !== 1) {
        console.error('Inconsistência de integridade: código de cupom duplicado ou inválido.');
        throw new ErroHttp(409, 'Não foi possível validar este cupom.');
    }

    // Regra provisória de produto: qualquer reserva vinculada consome o cupom,
    // inclusive CANCELADA, até a definição final do fluxo de cancelamento.
    const consultaUsos = bloquearUsos
        ? `SELECT Hos_Hospede_Usu_Id
           FROM res_reserva
           WHERE Cup_Id = ?
           FOR UPDATE`
        : `SELECT Hos_Hospede_Usu_Id
           FROM res_reserva
           WHERE Cup_Id = ?`;
    const [usos] = await executor.query(consultaUsos, [cupom.id]);

    if (usos.some(uso => Number(uso.Hos_Hospede_Usu_Id) === Number(hospedeId))) {
        throw new ErroHttp(400, 'Você já utilizou este cupom.');
    }

    const totalUsos = usos.length;

    if (!Number.isSafeInteger(totalUsos) || totalUsos < 0) {
        throw new ErroHttp(409, 'Não foi possível verificar o limite deste cupom.');
    }
    if (totalUsos >= cupom.limiteUso) {
        throw new ErroHttp(400, 'Este cupom atingiu o limite de utilização.');
    }

    return cupom;
}

// ==========================================
// ROTAS DE CUPONS
// ==========================================

app.get('/api/cupons/meus', verificarToken, async (req, res) => {
    try {
        await garantirHospede(db, req.usuario.id);

        const [cupons] = await db.query(
            `SELECT
                c.Cup_Id,
                c.Cup_Codigo,
                c.Cup_TipoDesconto,
                c.Cup_ValorDoDesconto,
                DATE_FORMAT(c.Cup_DataValidade, '%Y-%m-%d') AS Cup_DataValidade,
                c.Cup_LimiteUso,
                EXISTS (
                    SELECT 1
                    FROM res_reserva usada
                    WHERE usada.Cup_Id = c.Cup_Id
                      AND usada.Hos_Hospede_Usu_Id = ?
                ) AS Cup_Usado
             FROM cup_cupom c
             WHERE c.Cup_DataValidade >= CURDATE()
               AND c.Cup_LimiteUso > (
                   SELECT COUNT(*) FROM res_reserva r WHERE r.Cup_Id = c.Cup_Id
               )
               AND c.Cup_ValorDoDesconto > ?
               AND (
                   (c.Cup_TipoDesconto = ? AND c.Cup_ValorDoDesconto <= ?)
                   OR c.Cup_TipoDesconto = ?
               )
               AND (
                   SELECT COUNT(*)
                   FROM cup_cupom duplicado
                   WHERE UPPER(duplicado.Cup_Codigo) = UPPER(c.Cup_Codigo)
               ) = ?
             ORDER BY c.Cup_DataValidade ASC, c.Cup_Id ASC`,
            [req.usuario.id, 0, 'PERCENTUAL', 100, 'FIXO', 1]
        );

        const resposta = cupons.map(cupom => {
            const normalizado = normalizarCupom(cupom);
            return {
                cupomId: normalizado.id,
                codigo: normalizado.codigo,
                tipoDesconto: normalizado.tipoDesconto,
                valorDesconto: normalizado.valorDesconto,
                validoAte: normalizado.validoAte,
                usado: Number(cupom.Cup_Usado) === 1
            };
        });

        res.json(resposta);
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao buscar cupons:', error);
        res.status(500).json({ error: 'Erro interno ao buscar cupons.' });
    }
});

app.post('/api/cupons/validar', verificarToken, async (req, res) => {
    try {
        await garantirHospede(db, req.usuario.id);

        const codigo = typeof req.body?.codigo === 'string' ? req.body.codigo.trim() : '';
        if (!codigo || codigo.length > 45) {
            return res.status(400).json({ error: 'Informe um código de cupom válido.' });
        }

        const cupomDb = await buscarCupomPorCodigo(db, codigo);
        const cupom = await validarRegrasCupom(db, cupomDb, req.usuario.id);

        res.json({
            cupomId: cupom.id,
            codigo: cupom.codigo,
            tipoDesconto: cupom.tipoDesconto,
            valorDesconto: cupom.valorDesconto
        });
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao validar cupom:', error);
        res.status(500).json({ error: 'Erro interno ao validar cupom.' });
    }
});

// ==========================================
// ROTAS DE NOTIFICAÇÕES
// ==========================================

async function verificarUsuarioAtivoNotificacoes(req, res, next) {
    res.set('Cache-Control', 'no-store');
    try {
        const usuarioId = validarIdNotificacao(req.usuario.id);
        const [usuarios] = await db.query(
            'SELECT Usu_Id FROM usu_usuario WHERE Usu_Id = ? AND Usu_Status = ? LIMIT 1',
            [usuarioId, 'ATIVO']
        );
        if (usuarios.length === 0) {
            return res.status(403).json({ error: 'Esta conta encontra-se inativa ou indisponível.' });
        }
        req.usuarioNotificacaoId = usuarioId;
        next();
    } catch (error) {
        if (error instanceof TypeError) {
            return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
        }
        console.error('Erro ao verificar acesso às notificações.');
        res.status(500).json({ error: 'Não foi possível acessar as notificações.' });
    }
}

app.get('/api/notificacoes', verificarToken, verificarUsuarioAtivoNotificacoes, async (req, res) => {
    try {
        res.json(await notificacoes.listarNotificacoes(req.usuarioNotificacaoId));
    } catch {
        console.error('Erro ao buscar notificações.');
        res.status(500).json({ error: 'Não foi possível carregar as notificações.' });
    }
});

app.patch('/api/notificacoes/marcar-todas-lidas', verificarToken, verificarUsuarioAtivoNotificacoes, async (req, res) => {
    try {
        await notificacoes.marcarTodasLidas(req.usuarioNotificacaoId);
        res.json({ message: 'Notificações marcadas como lidas.' });
    } catch {
        console.error('Erro ao marcar notificações como lidas.');
        res.status(500).json({ error: 'Não foi possível atualizar as notificações.' });
    }
});

app.patch('/api/notificacoes/:id/lida', verificarToken, verificarUsuarioAtivoNotificacoes, async (req, res) => {
    let notificacaoId;
    try {
        notificacaoId = validarIdNotificacao(req.params.id);
    } catch {
        return res.status(400).json({ error: 'Identificador de notificação inválido.' });
    }

    try {
        const pertenceAoUsuario = await notificacoes.marcarLida(req.usuarioNotificacaoId, notificacaoId);
        if (!pertenceAoUsuario) {
            return res.status(404).json({ error: 'Notificação não encontrada.' });
        }
        res.json({ message: 'Notificação marcada como lida.' });
    } catch {
        console.error('Erro ao marcar notificação como lida.');
        res.status(500).json({ error: 'Não foi possível atualizar a notificação.' });
    }
});

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

// Rota Pública para o Front-end checar se a data está livre (Usada na Home)
app.get('/api/reservas/disponibilidade', async (req, res) => {
    try {
        const { checkin, checkout } = req.query;
        if (!checkin || !checkout) {
            return res.status(400).json({ error: 'Forneça checkin e checkout.' });
        }

        const imoId = 1;
        const queryConflito = `
            SELECT Res_Id FROM res_reserva 
            WHERE Imo_Id = ? 
            AND Res_Status IN ('CONFIRMADA', 'PENDENTE')
            AND (Res_DataCheckIn < ?) 
            AND (Res_DataCheckOut > ?)
        `;
        const valoresConflito = [imoId, checkout, checkin];
        const [reservasConflitantes] = await db.query(queryConflito, valoresConflito);

        if (reservasConflitantes.length > 0) {
            return res.json({ disponivel: false });
        }
        
        return res.json({ disponivel: true });
    } catch (error) {
        console.error('Erro ao checar disponibilidade:', error);
        res.status(500).json({ error: 'Erro interno ao checar disponibilidade.' });
    }
});

// Rota Pública para o Calendário pintar os dias ocupados
app.get('/api/reservas/datas-ocupadas', async (req, res) => {
    try {
        const imoId = 1;
        const query = `
            SELECT 
                DATE_FORMAT(Res_DataCheckIn, '%Y-%m-%d') as checkin, 
                DATE_FORMAT(Res_DataCheckOut, '%Y-%m-%d') as checkout 
            FROM res_reserva 
            WHERE Imo_Id = ? 
            AND Res_Status IN ('CONFIRMADA', 'PENDENTE')
            AND Res_DataCheckOut >= CURDATE()
        `;
        const [datas] = await db.query(query, [imoId]);
        res.json(datas);
    } catch (error) {
        console.error('Erro ao buscar datas ocupadas:', error);
        res.status(500).json({ error: 'Erro interno ao buscar datas ocupadas.' });
    }
});

// Passamos o verificarToken aqui! A rota agora é protegida.
app.post('/api/reservas', verificarToken, async (req, res) => {
    // Ignoramos COMPLETAMENTE o 'valorTotal' que o front-end envia (Proteção contra Fraude)
    const { checkin, checkout, hospedes, observacoes, cupomId } = req.body || {};
    
    const imoId = 1; // Imóvel padrão (Futuramente dinâmico)
    const hospedeId = req.usuario.id; // Pegando do token JWT inviolável

    const cupomFoiInformado = cupomId !== undefined && cupomId !== null;
    const cupomIdValidoComoNumero = typeof cupomId === 'number'
        && Number.isSafeInteger(cupomId)
        && cupomId > 0;
    const cupomIdValidoComoTexto = typeof cupomId === 'string'
        && /^[1-9]\d*$/.test(cupomId.trim())
        && Number.isSafeInteger(Number(cupomId));

    if (cupomFoiInformado && !cupomIdValidoComoNumero && !cupomIdValidoComoTexto) {
        return res.status(400).json({ error: 'Identificador de cupom inválido.' });
    }
    const cupomIdSeguro = cupomFoiInformado ? Number(cupomId) : null;

    // 1. Pegamos uma conexão EXCLUSIVA para esta transação
    const conexao = await db.getConnection();

    try {
        await garantirHospede(conexao, hospedeId);

        if (!checkin || !checkout || !hospedes) {
            conexao.release();
            return res.status(400).json({ error: 'Dados incompletos para a reserva.' });
        }

        // --- VALIDAÇÃO DE DATAS ---
        const dataCheckin = new Date(checkin);
        const dataCheckout = new Date(checkout);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (dataCheckin < hoje) {
            conexao.release();
            return res.status(400).json({ error: 'Você não pode reservar uma data no passado.' });
        }
        if (dataCheckout <= dataCheckin) {
            conexao.release();
            return res.status(400).json({ error: 'A data de checkout deve ser maior que o check-in.' });
        }

        // =========================================================
        // INÍCIO DA BLINDAGEM ANTI-OVERBOOKING (PESSIMISTIC LOCK)
        // =========================================================
        await conexao.beginTransaction();

        // PASSO 1: A CAMADA FÍSICA (LOCK)
        // O "FOR UPDATE" no final cria um muro em volta deste imóvel.
        const [imoveis] = await conexao.query(
            'SELECT Imo_ValorFixo FROM imo_imovel WHERE Imo_Id = ? AND Imo_Status = "ATIVO" FOR UPDATE', 
            [imoId]
        );

        if (imoveis.length === 0) {
            await conexao.rollback();
            conexao.release();
            return res.status(404).json({ error: 'Imóvel não encontrado ou inativo.' });
        }
        const precoDiariaDb = parseFloat(imoveis[0].Imo_ValorFixo);

        // PASSO 2: A CAMADA MATEMÁTICA (SOBREPOSIÇÃO)
        // Agora que somos os únicos olhando para este imóvel, verificamos se as datas batem.
        const queryConflito = `
            SELECT Res_Id FROM res_reserva 
            WHERE Imo_Id = ? 
            AND Res_Status IN ('CONFIRMADA', 'PENDENTE')
            AND (Res_DataCheckIn < ?) 
            AND (Res_DataCheckOut > ?)
        `;
        const valoresConflito = [imoId, checkout, checkin];
        const [reservasConflitantes] = await conexao.query(queryConflito, valoresConflito);

        if (reservasConflitantes.length > 0) {
            // Se achou conflito, aborta a transação, destranca o imóvel e avisa o usuário
            await conexao.rollback();
            conexao.release();
            return res.status(409).json({ error: 'As datas selecionadas já foram reservadas por outro hóspede.' });
        }

        // =========================================================
        // FIM DA BLINDAGEM - SE CHEGAMOS AQUI, A DATA É NOSSA!
        // =========================================================

        // --- CÁLCULO SEGURO DO PREÇO ---
        const msPorDia = 1000 * 60 * 60 * 24;
        const diffTime = Math.abs(dataCheckout - dataCheckin);
        const quantidadeNoites = Math.ceil(diffTime / msPorDia);
        // TODO(próxima sprint): valorFinalSeguro não inclui a taxa de limpeza;
        // alinhar a divergência com o total exibido no frontend.
        let valorFinalSeguro = quantidadeNoites * precoDiariaDb;
        let cupomAplicadoId = null;

        if (cupomIdSeguro !== null) {
            // Mantém a ordem oficial de locks: primeiro imóvel, depois cupom.
            // O lock do cupom serializa a revalidação do limite e do uso por hóspede.
            const cupomDb = await buscarCupomPorIdComLock(conexao, cupomIdSeguro);
            const cupom = await validarRegrasCupom(conexao, cupomDb, hospedeId, true);

            const subtotalCentavos = Math.round(valorFinalSeguro * 100);
            if (!Number.isSafeInteger(subtotalCentavos) || subtotalCentavos < 0) {
                throw new ErroHttp(400, 'Não foi possível calcular o valor da reserva.');
            }

            const descontoCentavos = cupom.tipoDesconto === 'PERCENTUAL'
                ? Math.round(subtotalCentavos * (cupom.valorDesconto / 100))
                : Math.round(cupom.valorDesconto * 100);

            valorFinalSeguro = Math.max(0, subtotalCentavos - descontoCentavos) / 100;
            cupomAplicadoId = cupom.id;
        }
        
        // 4. Salva a fotografia do momento na reserva
        const queryInsert = `
            INSERT INTO res_reserva 
            (Cup_Id, Imo_Id, Hos_Hospede_Usu_Id, Res_DataCheckIn, Res_DataCheckOut, Res_QuantidadeDeHospedes, Res_ValorTotal, Res_Status, Res_DataReserva, Res_ObsHospede)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMADA', NOW(), ?)
        `;
        const valoresInsert = [cupomAplicadoId, imoId, hospedeId, checkin, checkout, hospedes, valorFinalSeguro, observacoes || null];
        const [resultado] = await conexao.query(queryInsert, valoresInsert);

        const [destinatarios] = await conexao.query(
            `SELECT p.Usu_Id AS proprietarioId, proprietario.Usu_Email AS proprietarioEmail,
                    hospede.Usu_Email AS hospedeEmail
             FROM imo_imovel i
             INNER JOIN pro_proprietario p ON p.Usu_Id = i.Pro_Proprietario_Usu_Id
             INNER JOIN usu_usuario proprietario ON proprietario.Usu_Id = p.Usu_Id
             INNER JOIN usu_usuario hospede ON hospede.Usu_Id = ?
             WHERE i.Imo_Id = ?`,
            [hospedeId, imoId]
        );
        if (destinatarios.length !== 1) {
            throw new ErroHttp(409, 'Não foi possível identificar o responsável pelo imóvel.');
        }

        const destinatario = destinatarios[0];
        const formatoData = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
        const periodo = `${formatoData.format(dataCheckin)} a ${formatoData.format(dataCheckout)}`;
        const tituloHospede = 'Reserva confirmada';
        const mensagemHospede = `Sua reserva #${resultado.insertId}, de ${periodo}, foi confirmada. Consulte os detalhes no seu painel.`;
        const tituloProprietario = 'Nova reserva';
        const mensagemProprietario = `A reserva #${resultado.insertId}, de ${periodo}, foi confirmada para o seu imóvel. Consulte os detalhes no seu painel.`;

        // Reserva e avisos persistem juntos; nenhum email é enviado antes do commit.
        await notificacoes.criarNotificacao(hospedeId, tituloHospede, mensagemHospede, 'SUCESSO', 'bi-calendar-check', conexao);
        await notificacoes.criarNotificacao(destinatario.proprietarioId, tituloProprietario, mensagemProprietario, 'INFO', 'bi-calendar-plus', conexao);
        
        // Sucesso absoluto! Salva definitivamente no banco e destranca o imóvel para o próximo da fila.
        await conexao.commit();
        conexao.release();

        res.status(201).json({ message: 'Reserva criada com sucesso no MySQL!', reservaId: resultado.insertId });

        // Efeito colateral isolado: indisponibilidade do Resend não altera a reserva confirmada.
        // TODO: adotar uma outbox persistente para retentar envios após falha/reinício do processo.
        void Promise.resolve().then(() => Promise.all([
            enviarEmail(destinatario.hospedeEmail, tituloHospede, criarHtmlEmail(tituloHospede, mensagemHospede), `reserva/${resultado.insertId}/confirmada/hospede`),
            enviarEmail(destinatario.proprietarioEmail, tituloProprietario, criarHtmlEmail(tituloProprietario, mensagemProprietario), `reserva/${resultado.insertId}/confirmada/proprietario`)
        ])).catch(() => console.error('Falha ao processar emails da reserva já confirmada.'));
    } catch (error) {
        // Se qualquer coisa der errado (banco cair, erro de digitação, etc), desfaz tudo e destranca o chalé.
        try {
            await conexao.rollback();
            conexao.release();
        } catch (rollbackError) {
            console.error('Erro ao desfazer a transação da reserva:', rollbackError);
            conexao.destroy();
        }

        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

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
// ROTAS DE AVALIAÇÕES
// ==========================================

app.post('/api/avaliacoes', verificarToken, async (req, res) => {
    let conexao;
    let transacaoAtiva = false;
    let conexaoDestruida = false;

    try {
        const reservaId = normalizarIdPositivo(req.body?.reservaId, 'Identificador da reserva');
        const nota = normalizarNota(req.body?.nota);
        const comentario = normalizarComentario(req.body?.comentario);
        const hospedeId = req.usuario.id;

        conexao = await db.getConnection();
        await conexao.beginTransaction();
        transacaoAtiva = true;

        await garantirHospede(conexao, hospedeId, true);

        const [reservas] = await conexao.query(
            `SELECT Res_Id, Imo_Id, Hos_Hospede_Usu_Id, Res_Status
             FROM res_reserva
             WHERE Res_Id = ?
             FOR UPDATE`,
            [reservaId]
        );

        if (reservas.length === 0) {
            throw new ErroHttp(404, 'Reserva não encontrada.');
        }

        const reserva = reservas[0];
        if (Number(reserva.Hos_Hospede_Usu_Id) !== Number(hospedeId)) {
            throw new ErroHttp(403, 'Você não pode avaliar uma reserva de outro hóspede.');
        }
        if (reserva.Res_Status !== 'CONCLUIDA') {
            throw new ErroHttp(400, 'A reserva precisa estar concluída antes de ser avaliada.');
        }

        // Serializa avaliações do mesmo imóvel para impedir atualização perdida da média.
        const [imoveis] = await conexao.query(
            'SELECT Imo_Id FROM imo_imovel WHERE Imo_Id = ? FOR UPDATE',
            [reserva.Imo_Id]
        );
        if (imoveis.length === 0) {
            throw new ErroHttp(404, 'Imóvel da reserva não encontrado.');
        }

        // O lock da reserva serializa duplicatas da mesma reserva. Esta leitura
        // permanece sem FOR UPDATE para não criar gap locks no índice UNIQUE.
        const [avaliacoesExistentes] = await conexao.query(
            'SELECT Ava_Id FROM ava_avaliacao WHERE Res_Id = ? LIMIT 1',
            [reservaId]
        );
        if (avaliacoesExistentes.length > 0) {
            throw new ErroHttp(409, 'Esta reserva já foi avaliada.');
        }

        const [resultado] = await conexao.query(
            `INSERT INTO ava_avaliacao
             (Imo_Id, Res_Id, Usu_Hos_Id, Ava_Nota, Ava_Comentario, Ava_Data)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [reserva.Imo_Id, reservaId, hospedeId, nota, comentario]
        );

        await conexao.query(
            `UPDATE imo_imovel
             SET Imo_NotaMedial = (
                 SELECT ROUND(AVG(Ava_Nota), 1)
                 FROM ava_avaliacao
                 WHERE Imo_Id = ?
             )
             WHERE Imo_Id = ?`,
            [reserva.Imo_Id, reserva.Imo_Id]
        );

        const [avaliacoesCriadas] = await conexao.query(
            `SELECT
                Ava_Id AS id,
                Ava_Nota AS nota,
                Ava_Comentario AS comentario,
                DATE_FORMAT(Ava_Data, '%Y-%m-%d') AS data,
                Ava_NotaPropietario AS respostaNota,
                Ava_ComentarioPropietario AS respostaComentario,
                DATE_FORMAT(Ava_DataPropietario, '%Y-%m-%d') AS respostaData
             FROM ava_avaliacao
             WHERE Ava_Id = ?`,
            [resultado.insertId]
        );

        await conexao.commit();
        transacaoAtiva = false;

        res.status(201).json({
            message: 'Avaliação enviada com sucesso.',
            avaliacao: normalizarAvaliacao(avaliacoesCriadas[0])
        });
    } catch (error) {
        if (transacaoAtiva && conexao) {
            try {
                await conexao.rollback();
            } catch (rollbackError) {
                console.error('Erro ao desfazer a transação da avaliação:', rollbackError);
                conexao.destroy();
                conexaoDestruida = true;
            }
        }

        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Esta reserva já foi avaliada.' });
        }

        console.error('Erro ao criar avaliação:', error);
        res.status(500).json({ error: 'Erro interno ao criar avaliação.' });
    } finally {
        if (conexao && !conexaoDestruida) conexao.release();
    }
});

app.get('/api/avaliacoes/imovel/:imoId', async (req, res) => {
    try {
        const imovelId = normalizarIdPositivo(req.params.imoId, 'Identificador do imóvel');
        const [avaliacoes] = await db.query(
            `SELECT
                a.Ava_Id AS id,
                a.Ava_Nota AS nota,
                a.Ava_Comentario AS comentario,
                DATE_FORMAT(a.Ava_Data, '%Y-%m-%d') AS data,
                NULL AS respostaNota,
                a.Ava_ComentarioPropietario AS respostaComentario,
                DATE_FORMAT(a.Ava_DataPropietario, '%Y-%m-%d') AS respostaData
             FROM ava_avaliacao a
             INNER JOIN res_reserva r
                ON r.Res_Id = a.Res_Id
                AND r.Imo_Id = a.Imo_Id
                AND r.Hos_Hospede_Usu_Id = a.Usu_Hos_Id
             WHERE a.Imo_Id = ? AND r.Res_Status = ?
             ORDER BY a.Ava_Data DESC, a.Ava_Id DESC`,
            [imovelId, 'CONCLUIDA']
        );

        // Esta resposta pública não consulta nem expõe IDs de reserva/hóspede ou PII.
        res.json(avaliacoes.map(avaliacao => normalizarAvaliacao(avaliacao, false)));
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao buscar avaliações públicas:', error);
        res.status(500).json({ error: 'Erro interno ao buscar avaliações.' });
    }
});

app.get('/api/proprietario/avaliacoes/pendentes', verificarToken, verificarProprietario, async (req, res) => {
    try {
        const proprietarioId = req.usuario.id;
        await garantirProprietario(db, proprietarioId);

        const [avaliacoes] = await db.query(
            `SELECT
                a.Ava_Id AS id,
                a.Ava_Nota AS nota,
                a.Ava_Comentario AS comentario,
                DATE_FORMAT(a.Ava_Data, '%Y-%m-%d') AS data,
                i.Imo_Id AS imovelId,
                i.Imo_Nome AS imovelNome,
                r.Res_Id AS reservaId,
                DATE_FORMAT(r.Res_DataCheckIn, '%Y-%m-%d') AS checkin,
                DATE_FORMAT(r.Res_DataCheckOut, '%Y-%m-%d') AS checkout,
                u.Usu_Nome AS hospedeNome
             FROM ava_avaliacao a
             INNER JOIN imo_imovel i ON i.Imo_Id = a.Imo_Id
             INNER JOIN res_reserva r
                ON r.Res_Id = a.Res_Id
                AND r.Imo_Id = a.Imo_Id
                AND r.Hos_Hospede_Usu_Id = a.Usu_Hos_Id
             INNER JOIN usu_usuario u ON u.Usu_Id = a.Usu_Hos_Id
             WHERE i.Pro_Proprietario_Usu_Id = ?
               AND r.Res_Status = ?
               AND a.Ava_NotaPropietario IS NULL
               AND a.Ava_ComentarioPropietario IS NULL
               AND a.Ava_DataPropietario IS NULL
             ORDER BY a.Ava_Data ASC, a.Ava_Id ASC`,
            [proprietarioId, 'CONCLUIDA']
        );

        res.json(avaliacoes.map(avaliacao => ({
            id: Number(avaliacao.id),
            nota: Number(avaliacao.nota),
            comentario: avaliacao.comentario || '',
            data: avaliacao.data,
            imovel: {
                id: Number(avaliacao.imovelId),
                nome: avaliacao.imovelNome
            },
            reserva: {
                id: Number(avaliacao.reservaId),
                checkin: avaliacao.checkin,
                checkout: avaliacao.checkout
            },
            hospede: { nome: avaliacao.hospedeNome }
        })));
    } catch (error) {
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao buscar avaliações pendentes:', error);
        res.status(500).json({ error: 'Erro interno ao buscar avaliações pendentes.' });
    }
});

app.patch('/api/proprietario/avaliacoes/:id/responder', verificarToken, verificarProprietario, async (req, res) => {
    let conexao;
    let transacaoAtiva = false;
    let conexaoDestruida = false;

    try {
        const avaliacaoId = normalizarIdPositivo(req.params.id, 'Identificador da avaliação');
        const nota = normalizarNota(req.body?.nota);
        const comentario = normalizarComentario(req.body?.comentario, true);
        const proprietarioId = req.usuario.id;

        conexao = await db.getConnection();
        await conexao.beginTransaction();
        transacaoAtiva = true;

        await garantirProprietario(conexao, proprietarioId, true);

        const [avaliacoes] = await conexao.query(
            `SELECT
                a.Ava_Id,
                a.Ava_NotaPropietario,
                a.Ava_ComentarioPropietario,
                a.Ava_DataPropietario,
                r.Res_Status
             FROM ava_avaliacao a
             INNER JOIN imo_imovel i ON i.Imo_Id = a.Imo_Id
             INNER JOIN res_reserva r
                ON r.Res_Id = a.Res_Id
                AND r.Imo_Id = a.Imo_Id
                AND r.Hos_Hospede_Usu_Id = a.Usu_Hos_Id
             WHERE a.Ava_Id = ? AND i.Pro_Proprietario_Usu_Id = ?
             FOR UPDATE`,
            [avaliacaoId, proprietarioId]
        );

        if (avaliacoes.length === 0) {
            throw new ErroHttp(404, 'Avaliação não encontrada para este proprietário.');
        }

        const avaliacao = avaliacoes[0];
        if (avaliacao.Res_Status !== 'CONCLUIDA') {
            throw new ErroHttp(400, 'Somente avaliações de reservas concluídas podem ser respondidas.');
        }

        const jaRespondida = avaliacao.Ava_NotaPropietario !== null
            || avaliacao.Ava_ComentarioPropietario !== null
            || avaliacao.Ava_DataPropietario !== null;
        if (jaRespondida) {
            throw new ErroHttp(409, 'Esta avaliação já foi respondida.');
        }

        const [resultado] = await conexao.query(
            `UPDATE ava_avaliacao
             SET Ava_NotaPropietario = ?,
                 Ava_ComentarioPropietario = ?,
                 Ava_DataPropietario = NOW()
             WHERE Ava_Id = ?
               AND Ava_NotaPropietario IS NULL
               AND Ava_ComentarioPropietario IS NULL
               AND Ava_DataPropietario IS NULL`,
            [nota, comentario, avaliacaoId]
        );

        if (resultado.affectedRows !== 1) {
            throw new ErroHttp(409, 'Esta avaliação já foi respondida.');
        }

        const [respostas] = await conexao.query(
            `SELECT
                Ava_NotaPropietario AS nota,
                Ava_ComentarioPropietario AS comentario,
                DATE_FORMAT(Ava_DataPropietario, '%Y-%m-%d') AS data
             FROM ava_avaliacao
             WHERE Ava_Id = ?`,
            [avaliacaoId]
        );

        await conexao.commit();
        transacaoAtiva = false;

        res.json({
            message: 'Resposta enviada com sucesso.',
            respostaProprietario: {
                nota: Number(respostas[0].nota),
                comentario: respostas[0].comentario,
                data: respostas[0].data
            }
        });
    } catch (error) {
        if (transacaoAtiva && conexao) {
            try {
                await conexao.rollback();
            } catch (rollbackError) {
                console.error('Erro ao desfazer a resposta da avaliação:', rollbackError);
                conexao.destroy();
                conexaoDestruida = true;
            }
        }

        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao responder avaliação:', error);
        res.status(500).json({ error: 'Erro interno ao responder avaliação.' });
    } finally {
        if (conexao && !conexaoDestruida) conexao.release();
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
                i.Imo_ValorFixo as valorDiaria,
                a.Ava_Id as avaliacaoId,
                a.Ava_Nota as avaliacaoNota,
                a.Ava_Comentario as avaliacaoComentario,
                DATE_FORMAT(a.Ava_Data, '%Y-%m-%d') as avaliacaoData,
                a.Ava_NotaPropietario as respostaNota,
                a.Ava_ComentarioPropietario as respostaComentario,
                DATE_FORMAT(a.Ava_DataPropietario, '%Y-%m-%d') as respostaData
            FROM res_reserva r
            JOIN imo_imovel i ON r.Imo_Id = i.Imo_Id
            LEFT JOIN ava_avaliacao a
                ON a.Res_Id = r.Res_Id
                AND a.Imo_Id = r.Imo_Id
                AND a.Usu_Hos_Id = r.Hos_Hospede_Usu_Id
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
        const reservasFormatadas = reservas.map(r => {
            const {
                avaliacaoId,
                avaliacaoNota,
                avaliacaoComentario,
                avaliacaoData,
                respostaNota,
                respostaComentario,
                respostaData,
                ...reserva
            } = r;

            return {
                ...reserva,
                id: reserva.id.toString(), // Frontend espera string (ex: '5')
                checkin: reserva.checkin.toISOString().split('T')[0],
                checkout: reserva.checkout.toISOString().split('T')[0],
                criadaEm: reserva.criadaEm.toISOString().split('T')[0],
                status: statusMap[reserva.status] || 'pendente',
                formaPagamento: 'PIX', // Mock por enquanto
                avaliacao: avaliacaoId === null ? null : normalizarAvaliacao({
                    id: avaliacaoId,
                    nota: avaliacaoNota,
                    comentario: avaliacaoComentario,
                    data: avaliacaoData,
                    respostaNota,
                    respostaComentario,
                    respostaData
                })
            };
        });

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
        const proprietarioId = req.usuario.id;
        await garantirProprietario(db, proprietarioId);

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
            JOIN imo_imovel i ON r.Imo_Id = i.Imo_Id
            JOIN hos_hospede h ON r.Hos_Hospede_Usu_Id = h.Usu_Id
            JOIN usu_usuario u ON h.Usu_Id = u.Usu_Id
            WHERE i.Pro_Proprietario_Usu_Id = ?
            ORDER BY r.Res_DataCheckIn ASC
        `;
        const [reservas] = await db.query(query, [proprietarioId]);

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
        if (error instanceof ErroHttp) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao buscar reservas para o proprietário:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// ==========================================
// OUTRAS ROTAS
// ==========================================

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
}

module.exports = app;
