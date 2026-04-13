import { useState } from 'react';
import { Form } from 'react-bootstrap';
import LayoutAutenticacao from '../components/UI/LayoutAutenticacao';
import Entrada from '../components/UI/Entrada';
import Botao from '../components/UI/Botao';
import LinkAutenticacao from '../components/UI/LinkAutenticacao';
import logoPng from '../assets/img/artes/logo.png';
import basilicaPng from '../assets/img/artes/basilica.png';

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
      setEtapa(2);
    } else if (etapa === 2) {
      if (dados.codigo !== '123456') return setErro('Código incorreto. Use 123456.');
      setEtapa(3);
    } else if (etapa === 3) {
      if (dados.senha.length < 6) return setErro('Mínimo 6 caracteres.');
      if (dados.senha !== dados.confirmar) return setErro('Senhas não coincidem.');
      setEtapa(4);
    }
  };

  const renderEtapa = () => {
    switch (etapa) {
      case 1: return (
        <>
          <Entrada tipo="email" nome="email" placeholder="Seu email cadastrado" valor={dados.email} onChange={handleChange} required />
          <Botao larguraTotal type="submit">Enviar Código</Botao>
          <div className="text-center mt-3"><LinkAutenticacao para="/Login" variante="secundario">Voltar ao Login</LinkAutenticacao></div>
        </>
      );
      case 2: return (
        <>
          <Entrada nome="codigo" placeholder="Código de verificação (123456)" valor={dados.codigo} onChange={handleChange} required />
          <Botao larguraTotal type="submit">Verificar</Botao>
          <button type="button" className="btn-link-recuperar mt-2" onClick={() => setEtapa(1)}>Trocar email</button>
        </>
      );
      case 3: return (
        <>
          <Entrada tipo="password" nome="senha" placeholder="Nova senha" valor={dados.senha} onChange={handleChange} required />
          <Entrada tipo="password" nome="confirmar" placeholder="Confirmar nova senha" valor={dados.confirmar} onChange={handleChange} required />
          <Botao larguraTotal type="submit">Redefinir Senha</Botao>
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