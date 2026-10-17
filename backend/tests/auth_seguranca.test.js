const test = require('node:test');
const assert = require('node:assert/strict');
const authController = require('../controllers/authController');
const { criarHtmlEmail } = require('../email');

const {
    tentativasFalhasPorUsuario,
    registrarFalhaLogin,
    estaContaBloqueada,
    limparFalhasLogin,
    extrairIpCliente,
    LIMITE_TENTATIVAS_ALERTA,
    COOLDOWN_ALERTA_MS
} = authController._testHooks;

test('extrairIpCliente: sanitiza IPv4, IPv6 e x-forwarded-for', () => {
    assert.equal(extrairIpCliente({ headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' } }), '203.0.113.195');
    assert.equal(extrairIpCliente({ socket: { remoteAddress: '::ffff:192.168.1.50' } }), '192.168.1.50');
    assert.equal(extrairIpCliente({ ip: '::ffff:10.0.0.1' }), '10.0.0.1');
    assert.equal(extrairIpCliente({}), '127.0.0.1');
    assert.equal(extrairIpCliente(null), '127.0.0.1');
});

test('Alerta Brute Force: dispara e-mail anti-phishing estritamente na 5ª tentativa', async () => {
    const usuarioTeste = {
        Usu_Id: 99991,
        Usu_Nome: 'Felipe Teste',
        Usu_Email: 'felipeteste@example.com'
    };
    tentativasFalhasPorUsuario.delete(usuarioTeste.Usu_Id);

    const envios = [];
    const mockEmailService = {
        criarHtmlEmail,
        enviarEmail: async (destinatario, assunto, html, chaveIdempotencia) => {
            envios.push({ destinatario, assunto, html, chaveIdempotencia });
            return { enviado: true };
        }
    };

    const reqMock = {
        headers: { 'x-forwarded-for': '187.55.21.90' },
        app: { get: (servico) => servico === 'emailService' ? mockEmailService : null }
    };

    // Tentativas 1 a 4: incrementam contador, NÃO disparam e-mail
    for (let i = 1; i <= 4; i++) {
        await registrarFalhaLogin(usuarioTeste, reqMock);
        assert.equal(envios.length, 0, `Tentativa ${i} não deveria enviar e-mail`);
        const reg = tentativasFalhasPorUsuario.get(usuarioTeste.Usu_Id);
        assert.equal(reg.tentativas, i);
    }

    // 5ª tentativa: dispara o e-mail de alerta
    await registrarFalhaLogin(usuarioTeste, reqMock);
    assert.equal(envios.length, 1, '5ª tentativa deve disparar 1 e-mail de alerta');

    const envio = envios[0];
    assert.equal(envio.destinatario, usuarioTeste.Usu_Email);
    assert.ok(envio.assunto.includes('Alerta de Segurança'));
    assert.ok(envio.chaveIdempotencia.startsWith(`alerta-seguranca/${usuarioTeste.Usu_Id}/`));

    // Validações Anti-Phishing no conteúdo HTML
    assert.ok(envio.html.includes('Felipe Teste'), 'Deve saudar o usuário pelo nome');
    assert.ok(envio.html.includes('187.55.21.90'), 'Deve exibir o IP de origem detectado');
    assert.ok(envio.html.includes('Protegida (Trava ativa)'), 'Deve conter o status de conta protegida');
    assert.ok(envio.html.includes('NUNCA solicita sua senha'), 'Deve conter aviso explícito anti-phishing');
    assert.ok(!envio.html.includes('Acessar Site Oficial'), 'Por segurança anti-phishing, e-mail de alerta não deve conter botões clicáveis');
    assert.ok(!envio.html.includes('#/Login'), 'E-mail de alerta não deve conter links de login direto');
    assert.ok(!envio.html.includes('token='), 'NÃO deve enviar links com token de reset direto no e-mail');

    // 6ª tentativa consecutiva: bloqueada pelo cooldown de 24 horas
    await registrarFalhaLogin(usuarioTeste, reqMock);
    assert.equal(envios.length, 1, '6ª tentativa deve ser suprimida pelo cooldown de 24h');

    const regFinal = tentativasFalhasPorUsuario.get(usuarioTeste.Usu_Id);
    assert.equal(regFinal.tentativas, 6);
    assert.ok(regFinal.ultimoAvisoEm > 0);

    // Limpa dados de teste
    tentativasFalhasPorUsuario.delete(usuarioTeste.Usu_Id);
});

test('Login bem-sucedido: zera contagem de tentativas consecutivas mantendo cooldown', () => {
    const usuId = 99992;
    const agora = Date.now();
    tentativasFalhasPorUsuario.set(usuId, {
        tentativas: 4,
        primeiraFalhaEm: agora,
        ultimoAvisoEm: agora - 1000
    });

    limparFalhasLogin(usuId);

    const reg = tentativasFalhasPorUsuario.get(usuId);
    assert.equal(reg.tentativas, 0, 'Contador de falhas deve ser zerado');
    assert.equal(reg.ultimoAvisoEm, agora - 1000, 'Timestamp de cooldown deve ser preservado');

    tentativasFalhasPorUsuario.delete(usuId);
});

test('Janela de 15 minutos: reinicia contador se a falha anterior ocorreu há mais de 15 min', async () => {
    const usuarioTeste = {
        Usu_Id: 99993,
        Usu_Nome: 'Usuario Janela',
        Usu_Email: 'janela@example.com'
    };
    const ha16Minutos = Date.now() - (16 * 60 * 1000);
    tentativasFalhasPorUsuario.set(usuarioTeste.Usu_Id, {
        tentativas: 4,
        primeiraFalhaEm: ha16Minutos,
        ultimoAvisoEm: 0
    });

    const reqMock = { headers: {}, app: { get: () => null } };
    await registrarFalhaLogin(usuarioTeste, reqMock);

    const reg = tentativasFalhasPorUsuario.get(usuarioTeste.Usu_Id);
    assert.equal(reg.tentativas, 1, 'Contador deve reiniciar em 1 após expirar janela de 15 min');

    tentativasFalhasPorUsuario.delete(usuarioTeste.Usu_Id);
});

test('Camada 2 (Dual-Layer): bloqueia conta após 5 falhas mesmo se atacante alternar IPs/VPNs', async () => {
    const usuarioTeste = {
        Usu_Id: 99994,
        Usu_Nome: 'Alvo Forca Bruta',
        Usu_Email: 'alvo@example.com'
    };
    tentativasFalhasPorUsuario.delete(usuarioTeste.Usu_Id);

    // Simula atacante alternando entre 5 IPs/VPNs diferentes (Brasil, Canadá, Japão, etc.)
    const ipsVpn = ['189.10.20.30', '198.51.100.22', '203.0.113.88', '45.33.32.156', '104.244.42.1'];
    for (let i = 0; i < 4; i++) {
        await registrarFalhaLogin(usuarioTeste, { headers: { 'x-forwarded-for': ipsVpn[i] }, app: { get: () => null } });
        assert.equal(estaContaBloqueada(usuarioTeste.Usu_Id), false, `Após tentativa ${i + 1}, conta ainda não deve estar bloqueada`);
    }

    // 5ª falha (vindo do 5º IP): atinge o limite e bloqueia a conta por 15 minutos
    await registrarFalhaLogin(usuarioTeste, { headers: { 'x-forwarded-for': ipsVpn[4] }, app: { get: () => null } });
    assert.equal(estaContaBloqueada(usuarioTeste.Usu_Id), true, '5ª falha deve acionar o bloqueio temporal da conta');

    // 6ª tentativa vindo de um IP 100% novo (ex: Alemanha)
    assert.equal(estaContaBloqueada(usuarioTeste.Usu_Id), true, 'Novo IP de VPN deve continuar encontrando a conta bloqueada');

    // Ao logar com sucesso, a conta é liberada
    limparFalhasLogin(usuarioTeste.Usu_Id);
    assert.equal(estaContaBloqueada(usuarioTeste.Usu_Id), false, 'Sucesso deve liberar a conta do bloqueio');

    tentativasFalhasPorUsuario.delete(usuarioTeste.Usu_Id);
});

test.after(async () => {
    const db = require('../config/db');
    try {
        await new Promise(resolve => setTimeout(resolve, 60));
        await db.end();
    } catch {
        // conexão já encerrada
    }
});


