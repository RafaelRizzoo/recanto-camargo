import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form } from 'react-bootstrap';
import LayoutAutenticacao from '../components/UI/LayoutAutenticacao';
import Entrada from '../components/UI/Entrada';
import EntradaSenha from '../components/UI/EntradaSenha';
import Botao from '../components/UI/Botao';
import LinkAutenticacao from '../components/UI/LinkAutenticacao';
import { useAutenticacao } from '../hooks/useAutenticacao';
import logoPng from '../assets/img/artes/logo.png';
import basilicaPng from '../assets/img/artes/basilica.png';

function Cadastro() {
  const [dados, setDados] = useState({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
    confirmacaoSenha: ''
  });
  const [erro, setErro] = useState('');
  const { registrar } = useAutenticacao();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDados(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro('');

    if (dados.senha !== dados.confirmacaoSenha) {
      setErro('As senhas não coincidem!');
      return;
    }

    if (dados.senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    const resultado = registrar({
      nome: dados.nome,
      email: dados.email,
      telefone: dados.telefone,
      senha: dados.senha
    });

    if (resultado.sucesso) {
      navigate('/');
    } else {
      setErro(resultado.mensagem);
    }
  };

  return (
    <LayoutAutenticacao
      imagemFundo={basilicaPng}
      imagemLogo={logoPng}
      titulo="Crie sua conta"
      subtitulo="Junte-se ao Recanto Camargo"
    >
      <Form onSubmit={handleSubmit}>
        {erro && <div className="alerta-erro mb-3">{erro}</div>}
        
        <Entrada
          tipo="text"
          nome="nome"
          placeholder="Seu nome completo"
          valor={dados.nome}
          onChange={handleChange}
          required
        />
        
        <Entrada
          tipo="email"
          nome="email"
          placeholder="Insira seu email"
          valor={dados.email}
          onChange={handleChange}
          required
        />
        
        <Entrada
          tipo="tel"
          nome="telefone"
          placeholder="Insira seu telefone"
          valor={dados.telefone}
          onChange={handleChange}
          required
        />

        <EntradaSenha
          nome="senha"
          placeholder="Insira sua senha"
          valor={dados.senha}
          onChange={handleChange}
          required
        />

        <EntradaSenha
          nome="confirmacaoSenha"
          placeholder="Repita sua senha"
          valor={dados.confirmacaoSenha}
          onChange={handleChange}
          required
        />

        <Botao larguraTotal efeitoOnda type="submit">
          Cadastrar
        </Botao>

        <div className="container-link-autenticacao text-center mt-3 mb-3">
          <span className="text-white">Já tem conta? </span>
          <LinkAutenticacao para="/Login" variante="destaque">
            Fazer login
          </LinkAutenticacao>
        </div>

        <div className="d-lg-none">
          <hr className="border-white opacity-25 my-4" />
          <div className="text-center mb-4">
            <LinkAutenticacao para="/" variante="secundario">
              <i className="bi bi-arrow-left me-2"></i>
              Voltar para o site
            </LinkAutenticacao>
          </div>
        </div>
      </Form>
    </LayoutAutenticacao>
  );
}

export default Cadastro;