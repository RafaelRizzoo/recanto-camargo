const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { encryptCPF, hashCPF } = require('../utils/crypto');

function validarComplexidadeSenha(senha) {
    if (!senha || typeof senha !== 'string') {
        return 'Senha inválida.';
    }
    if (senha.length < 8) {
        return 'A senha deve ter no mínimo 8 caracteres.';
    }
    if (senha.length > 100) {
        return 'A senha não pode exceder 100 caracteres.';
    }
    if (!/[A-Z]/.test(senha)) {
        return 'A senha deve conter pelo menos uma letra maiúscula.';
    }
    if (!/[a-z]/.test(senha)) {
        return 'A senha deve conter pelo menos uma letra minúscula.';
    }
    if (!/\d/.test(senha)) {
        return 'A senha deve conter pelo menos um número.';
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(senha)) {
        return 'A senha deve conter pelo menos um caractere especial (!@#$%...).';
    }
    return null;
}

exports.cadastrar = async (req, res) => {
    let conexao;
    try {
        conexao = await db.getConnection();
        let { nome, cpf, email, telefone, senha, aceitouTermos } = req.body;
        
        if (!nome || !cpf || !email || !senha) {
            return res.status(400).json({ error: 'Preencha todos os dados obrigatórios.' });
        }

        if (aceitouTermos === false) {
            return res.status(400).json({ error: 'Você precisa ler e aceitar os Termos de Uso e a Política de Privacidade.' });
        }

        const cpfLimpo = String(cpf).replace(/\D/g, '');
        const telefoneLimpo = telefone ? String(telefone).replace(/\D/g, '') : '';
        
        if (cpfLimpo.length !== 11) {
            return res.status(400).json({ error: 'CPF inválido. Deve conter exatamente 11 números.' });
        }
        if (telefoneLimpo && (telefoneLimpo.length < 10 || telefoneLimpo.length > 11)) {
            return res.status(400).json({ error: 'Telefone inválido. Deve conter 10 ou 11 números (com DDD).' });
        }
        if (String(nome).length > 100) {
            return res.status(400).json({ error: 'O nome não pode exceder 100 caracteres.' });
        }
        if (String(email).length > 255) {
            return res.status(400).json({ error: 'O E-mail excede o limite máximo permitido (255 caracteres).' });
        }

        const erroSenha = validarComplexidadeSenha(senha);
        if (erroSenha) {
            return res.status(400).json({ error: erroSenha });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);
        const cpfEncriptado = encryptCPF(cpfLimpo); 
        const cpfHash = hashCPF(cpfLimpo); 

        await conexao.beginTransaction();

        const ipOrigem = req.headers['x-forwarded-for'] 
            ? String(req.headers['x-forwarded-for']).split(',')[0].trim() 
            : (req.socket?.remoteAddress || req.ip || '127.0.0.1');
        const versaoTermos = typeof req.body.versaoTermos === 'string' && req.body.versaoTermos.trim() 
            ? req.body.versaoTermos.trim().slice(0, 10) 
            : 'v1.0';

        const queryUsuario = `
            INSERT INTO usu_usuario 
            (Usu_Nome, Usu_CPF, Usu_CPF_Hash, Usu_Email, Usu_Telefone, Usu_SenhaHash, Usu_Status, Usu_DataAceiteTermos, Usu_IpAceite, Usu_VersaoTermosAceitos) 
            VALUES (?, ?, ?, ?, ?, ?, 'ATIVO', NOW(), ?, ?)
        `;
        const valoresUsuario = [nome, cpfEncriptado, cpfHash, email, telefone || '', senhaHash, String(ipOrigem).slice(0, 45), versaoTermos];
        const [resultadoUsuario] = await conexao.query(queryUsuario, valoresUsuario);
        
        const novoUsuarioId = resultadoUsuario.insertId;

        const queryHospede = `INSERT INTO hos_hospede (Usu_Id) VALUES (?)`;
        await conexao.query(queryHospede, [novoUsuarioId]);

        // Notificação de boas-vindas in-app (Sino do Painel)
        const notificacoes = req.app.get('notificacoes');
        if (notificacoes?.criarNotificacao) {
            await notificacoes.criarNotificacao(
                novoUsuarioId,
                'Bem-vindo ao Recanto Camargo!',
                `Olá, ${nome}! Sua conta foi criada com sucesso. Estamos prontos para receber você e sua família com todo carinho e conforto em Aparecida-SP.`,
                'SUCESSO',
                'bi-house-heart',
                conexao
            );
        }

        await conexao.commit();
        res.status(201).json({ message: 'Conta de Hóspede criada com sucesso!' });

        // Disparo assíncrono do e-mail de Boas-Vindas estilo plataforma de hospedagem
        const emailService = req.app.get('emailService');
        if (emailService?.enviarEmail && email) {
            const { enviarEmail, criarEmailBoasVindas, criarHtmlEmail } = emailService;
            const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
            const tituloEmail = 'Bem-vindo(a) ao Recanto Camargo! 🏡';

            const htmlCorpo = typeof criarEmailBoasVindas === 'function'
                ? criarEmailBoasVindas({
                    nome,
                    email,
                    telefone,
                    frontendUrl
                })
                : (criarHtmlEmail ? criarHtmlEmail(tituloEmail, 'Bem-vindo ao Recanto Camargo!', { nome }) : '<p>Bem-vindo ao Recanto Camargo!</p>');

            void Promise.resolve().then(() => enviarEmail(
                email,
                tituloEmail,
                htmlCorpo,
                `cadastro/boas-vindas/${novoUsuarioId}`
            )).catch((errEmail) => console.error('Erro ao enviar e-mail de boas-vindas no cadastro:', errEmail));
        }
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

// =============================================================================
// MONITOR DE TENTATIVAS DE LOGIN E ALERTA ANTI-BRUTE FORCE / PHISHING (OWASP A07)
// =============================================================================
const tentativasFalhasPorUsuario = new Map();
const LIMITE_TENTATIVAS_ALERTA = 5;
const JANELA_TENTATIVAS_MS = 15 * 60 * 1000; // 15 minutos
const COOLDOWN_ALERTA_MS = 24 * 60 * 60 * 1000; // 24 horas entre e-mails de alerta

function extrairIpCliente(req) {
    const rawIp = req?.headers?.['x-forwarded-for']
        ? String(req.headers['x-forwarded-for']).split(',')[0].trim()
        : (req?.socket?.remoteAddress || req?.ip || '127.0.0.1');
    return String(rawIp || '127.0.0.1').replace(/^::ffff:/, '');
}

async function registrarFalhaLogin(usuario, req) {
    const agora = Date.now();
    const usuId = usuario.Usu_Id;
    let registro = tentativasFalhasPorUsuario.get(usuId);

    if (!registro || (agora - registro.primeiraFalhaEm) > JANELA_TENTATIVAS_MS) {
        registro = {
            tentativas: 1,
            primeiraFalhaEm: agora,
            ultimoAvisoEm: registro?.ultimoAvisoEm || 0
        };
    } else {
        registro.tentativas += 1;
    }

    tentativasFalhasPorUsuario.set(usuId, registro);

    // Quando atinge o limite de 5 tentativas consecutivas na janela de 15 minutos
    if (registro.tentativas >= LIMITE_TENTATIVAS_ALERTA) {
        registro.bloqueadoAte = agora + JANELA_TENTATIVAS_MS;
        tentativasFalhasPorUsuario.set(usuId, registro);

        const podeEnviarAlerta = (agora - registro.ultimoAvisoEm) >= COOLDOWN_ALERTA_MS;
        if (podeEnviarAlerta) {
            registro.ultimoAvisoEm = agora;
            tentativasFalhasPorUsuario.set(usuId, registro);

            const emailService = req?.app?.get ? req.app.get('emailService') : null;
            if (emailService) {
                const { enviarEmail, criarHtmlEmail } = emailService;
                const ipOrigem = extrairIpCliente(req);
                const dataHoraFormatada = new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'medium',
                    timeZone: 'America/Sao_Paulo'
                }).format(new Date());

                const tituloAlerta = 'Alerta de Segurança — Tentativas de Acesso Incomuns';
                const mensagemAlerta = `Identificamos ${registro.tentativas} tentativas consecutivas de acesso com senha incorreta à sua conta no Recanto Camargo.\n\nSe foi você quem tentou entrar e esqueceu a senha, desconsidere este aviso ou utilize a recuperação de conta no site oficial.\n\nCaso você NÃO reconheça essa atividade, acerte sua proteção acessando o site oficial diretamente pelo seu navegador e altere sua senha imediatamente.\n\n🛡️ Segurança Anti-Phishing: Por precaução, este e-mail NÃO contém botões nem links clicáveis de login ou redefinição. O Recanto Camargo NUNCA solicita sua senha, tokens ou pagamentos por e-mail, telefone ou WhatsApp.`;

                const htmlCorpo = criarHtmlEmail(tituloAlerta, mensagemAlerta, {
                    nome: usuario.Usu_Nome,
                    badge: '⚠️ Alerta de Segurança',
                    badgeCorFundo: '#fce8e6',
                    badgeCorTexto: '#c5221f',
                    semBotao: true,
                    detalhes: [
                        { rotulo: 'Conta / E-mail', valor: usuario.Usu_Email },
                        { rotulo: 'Data e Horário', valor: dataHoraFormatada },
                        { rotulo: 'Endereço IP Detectado', valor: ipOrigem },
                        { rotulo: 'Status da Conta', valor: 'Protegida (Trava ativa)' },
                        { rotulo: 'Ação Recomendada', valor: 'Acessar o site oficial pelo navegador' }
                    ]
                });

                const diaChave = new Date().toISOString().slice(0, 10);
                return Promise.resolve().then(() => {
                    return enviarEmail(
                        usuario.Usu_Email,
                        tituloAlerta,
                        htmlCorpo,
                        `alerta-seguranca/${usuId}/${diaChave}`
                    );
                }).catch(err => console.error('Falha ao disparar e-mail de alerta de segurança:', err.message));
            }
        }
    }
    return Promise.resolve();
}

function estaContaBloqueada(usuarioId) {
    const registro = tentativasFalhasPorUsuario.get(usuarioId);
    if (!registro) return false;
    const agora = Date.now();
    if (registro.bloqueadoAte && agora < registro.bloqueadoAte) {
        return true;
    }
    return false;
}

function limparFalhasLogin(usuarioId) {
    const registro = tentativasFalhasPorUsuario.get(usuarioId);
    if (registro) {
        registro.tentativas = 0;
        registro.bloqueadoAte = 0;
        tentativasFalhasPorUsuario.set(usuarioId, registro);
    }
}

exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) return res.status(400).json({ error: 'Forneça email e senha.' });

        const [rows] = await db.query('SELECT * FROM usu_usuario WHERE Usu_Email = ?', [email]);
        const usuario = rows[0];

        if (!usuario) return res.status(401).json({ error: 'Credenciais inválidas.' });
        if (usuario.Usu_Status !== 'ATIVO') return res.status(403).json({ error: 'Esta conta encontra-se inativa ou bloqueada.' });

        // Camada 2: Proteção Temporal por Conta (Dual-Layer OWASP A07 contra VPNs e bots)
        if (estaContaBloqueada(usuario.Usu_Id)) {
            return res.status(429).json({ 
                error: 'Esta conta está temporariamente protegida devido a múltiplas tentativas incorretas. Tente novamente em 15 minutos.' 
            });
        }

        const senhaCorreta = await bcrypt.compare(senha, usuario.Usu_SenhaHash);
        if (!senhaCorreta) {
            await registrarFalhaLogin(usuario, req);
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        limparFalhasLogin(usuario.Usu_Id);

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

exports.obterPerfil = async (req, res) => {
    try {
        const [usuarios] = await db.query(
            'SELECT Usu_Id AS id, Usu_Nome AS nome, Usu_Email AS email, Usu_Telefone AS telefone FROM usu_usuario WHERE Usu_Id = ? AND Usu_Status = "ATIVO"',
            [req.usuario.id]
        );
        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado ou inativo.' });
        }
        res.json({ usuario: { ...usuarios[0], tipo: req.usuario.tipo } });
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ error: 'Erro interno ao buscar perfil.' });
    }
};

exports.atualizarPerfil = async (req, res) => {
    try {
        const { nome, telefone } = req.body;
        if (!nome || !nome.trim()) {
            return res.status(400).json({ error: 'O nome é obrigatório.' });
        }
        if (String(nome).length > 100) {
            return res.status(400).json({ error: 'O nome não pode exceder 100 caracteres.' });
        }
        const telefoneLimpo = telefone ? String(telefone).replace(/\D/g, '') : '';
        if (telefoneLimpo && (telefoneLimpo.length < 10 || telefoneLimpo.length > 11)) {
            return res.status(400).json({ error: 'Telefone inválido. Deve conter 10 ou 11 números com DDD.' });
        }

        await db.query(
            'UPDATE usu_usuario SET Usu_Nome = ?, Usu_Telefone = ? WHERE Usu_Id = ?',
            [nome.trim(), telefone ? telefone.trim() : '', req.usuario.id]
        );

        const novoPayload = {
            id: req.usuario.id,
            nome: nome.trim(),
            tipo: req.usuario.tipo
        };
        const token = jwt.sign(novoPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            message: 'Perfil atualizado com sucesso!',
            usuario: { ...novoPayload, telefone: telefone || '' }
        });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar perfil.' });
    }
};

exports.alterarSenha = async (req, res) => {
    try {
        const { senhaAtual, novaSenha } = req.body;
        if (!senhaAtual || !novaSenha) {
            return res.status(400).json({ error: 'Preencha a senha atual e a nova senha.' });
        }
        const erroSenha = validarComplexidadeSenha(novaSenha);
        if (erroSenha) {
            return res.status(400).json({ error: erroSenha });
        }

        const [usuarios] = await db.query(
            'SELECT Usu_SenhaHash FROM usu_usuario WHERE Usu_Id = ?',
            [req.usuario.id]
        );
        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        const senhaCorreta = await bcrypt.compare(senhaAtual, usuarios[0].Usu_SenhaHash);
        if (!senhaCorreta) {
            return res.status(400).json({ error: 'Senha atual incorreta.' });
        }

        const salt = await bcrypt.genSalt(10);
        const novoHash = await bcrypt.hash(novaSenha, salt);

        await db.query(
            'UPDATE usu_usuario SET Usu_SenhaHash = ? WHERE Usu_Id = ?',
            [novoHash, req.usuario.id]
        );

        res.json({ message: 'Senha alterada com sucesso!' });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({ error: 'Erro interno ao alterar senha.' });
    }
};

// Test hooks para inspeção em testes automatizados
exports._testHooks = {
    tentativasFalhasPorUsuario,
    registrarFalhaLogin,
    estaContaBloqueada,
    limparFalhasLogin,
    extrairIpCliente,
    LIMITE_TENTATIVAS_ALERTA,
    JANELA_TENTATIVAS_MS,
    COOLDOWN_ALERTA_MS
};

