import { useState } from 'react';
import { Form } from 'react-bootstrap';
import LayoutAutenticacao from '../components/UI/LayoutAutenticacao';
import Entrada from '../components/UI/Entrada';
import Botao from '../components/UI/Botao';
import LinkAutenticacao from '../components/UI/LinkAutenticacao';
import logoPng from '../assets/img/artes/logo.webp';
import basilicaPng from '../assets/img/artes/basilica.webp';

const CHAVE_DB = 'recanto_camargo_db';
const CHAVE_CODIGO_SESSAO = 'recanto_camargo_codigo_recuperacao';
const TTL_CODIGO_MS = 10 * 60 * 1000; // 10 minutos

function gerarCodigo6Digitos() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function RecuperarSenha() {
  const [etapa, setEtapa] = useState(1);
  const [dados, setDados] = useState({ email: '', codigo: '', senha: '', confirmar: '' });
  const [erro, setErro] = useState('');

  const handleChange = e => setDados(p => ({ ...p, [e.target.name]: e.target.value }));

  const validarEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = e => {
    e.preventDefault();
    setErro('');

    if (etapa === 1) {
      if (!validarEmail(dados.email)) return setErro('Email inválido.');

      try {
        const db = JSON.parse(localStorage.getItem(CHAVE_DB) || '[]');
        const usuario = db.find(u => u.email === dados.email);
        if (!usuario) return setErro('Email não encontrado. Verifique e tente novamente.');
      } catch {
        return setErro('Erro ao verificar email. Tente novamente.');
      }

      const codigo = gerarCodigo6Digitos();
      sessionStorage.setItem(CHAVE_CODIGO_SESSAO, JSON.stringify({
        codigo,
        email: dados.email,
        expira: Date.now() + TTL_CODIGO_MS,
      }));

      // Em produção o código seria enviado por email; aqui usamos alerta temporário de desenvolvimento
      console.info(`[DEV] Código de recuperação: ${codigo}`);

      setEtapa(2);

    } else if (etapa === 2) {
      try {
        const salvo = JSON.parse(sessionStorage.getItem(CHAVE_CODIGO_SESSAO) || 'null');
        if (!salvo) return setErro('Sessão expirada. Reinicie o processo.');
        if (Date.now() > salvo.expira) {
          sessionStorage.removeItem(CHAVE_CODIGO_SESSAO);
          return setErro('Código expirado (10 min). Reinicie o processo.');
        }
        if (dados.codigo !== salvo.codigo) return setErro('Código incorreto. Verifique e tente novamente.');
      } catch {
        return setErro('Erro ao verificar código. Tente novamente.');
      }
      setEtapa(3);

    } else if (etapa === 3) {
      if (dados.senha.length < 6) return setErro('A senha deve ter pelo menos 6 caracteres.');
      if (dados.senha !== dados.confirmar) return setErro('Senhas não coincidem.');

      try {
        const salvo = JSON.parse(sessionStorage.getItem(CHAVE_CODIGO_SESSAO) || 'null');
        if (!salvo) return setErro('Sessão expirada. Reinicie o processo.');

        const db = JSON.parse(localStorage.getItem(CHAVE_DB) || '[]');
        const idx = db.findIndex(u => u.email === salvo.email);
        if (idx === -1) return setErro('Usuário não encontrado.');

        db[idx].senha = dados.senha;
        localStorage.setItem(CHAVE_DB, JSON.stringify(db));
        sessionStorage.removeItem(CHAVE_CODIGO_SESSAO);
      } catch {
        return setErro('Erro ao atualizar senha. Tente novamente.');
      }

      setEtapa(4);
    }
  };

  const renderEtapa = () => {
    switch (etapa) {
      case 1: return (
        <>
          <Entrada tipo="email" nome="email" placeholder="Seu email cadastrado" valor={dados.email} onChange={handleChange} required />
          <Botao larguraTotal tipo="submit">Enviar Código</Botao>
          <div className="text-center mt-3">
            <LinkAutenticacao para="/Login" variante="secundario">Voltar ao Login</LinkAutenticacao>
          </div>
        </>
      );

      case 2: return (
        <>
          <p className="text-white-50 small text-center mb-3">
            Verifique o console do navegador para obter o código (apenas em demonstração).
          </p>
          <Entrada nome="codigo" placeholder="Código de 6 dígitos" valor={dados.codigo} onChange={handleChange} required />
          <Botao larguraTotal tipo="submit">Verificar</Botao>
          <button type="button" className="btn-link-recuperar mt-2" onClick={() => { setEtapa(1); sessionStorage.removeItem(CHAVE_CODIGO_SESSAO); }}>
            Trocar email
          </button>
        </>
      );

      case 3: return (
        <>
          <Entrada tipo="password" nome="senha" placeholder="Nova senha (min. 6 caracteres)" valor={dados.senha} onChange={handleChange} required />
          <Entrada tipo="password" nome="confirmar" placeholder="Confirmar nova senha" valor={dados.confirmar} onChange={handleChange} required />
          <Botao larguraTotal tipo="submit">Redefinir Senha</Botao>
        </>
      );

      case 4: return (
        <div className="sucesso-msg">
          <i className="bi bi-check-circle-fill fs-1 text-success mb-3"></i>
          <h4>Senha alterada!</h4>
          <p className="text-white-50">Agora você pode acessar sua conta normalmente.</p>
          <LinkAutenticacao para="/Login" variante="destaque" className="btn-sucesso">Ir para o Login</LinkAutenticacao>
        </div>
      );

      default: return null;
    }
  };

  return (
    <LayoutAutenticacao
      imagemFundo={basilicaPng}
      imagemLogo={logoPng}
      titulo={etapa === 4 ? "Sucesso!" : "Recuperar Senha"}
      subtitulo={etapa === 4 ? "" : "Digite seu email para receber o código de verificação."}
      mostrarBotaoVoltar={etapa !== 4}
    >
      <Form onSubmit={handleSubmit}>
        {erro && <div className="alerta-erro mb-3">{erro}</div>}
        {renderEtapa()}
      </Form>
    </LayoutAutenticacao>
  );
}

export default RecuperarSenha;
