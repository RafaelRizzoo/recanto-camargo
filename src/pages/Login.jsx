import { useState } from 'react';
import { Form } from 'react-bootstrap';
import LayoutAutenticacao from '../components/UI/LayoutAutenticacao';
import Entrada from '../components/UI/Entrada';
import EntradaSenha from '../components/UI/EntradaSenha';
import Botao from '../components/UI/Botao';
import LinkAutenticacao from '../components/UI/LinkAutenticacao';

// Assets
import logoPng from '../assets/img/artes/logo.png';
import basilicaPng from '../assets/img/artes/basilica.png';

function Login() {
  const [dados, setDados] = useState({
    email: '',
    senha: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDados(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login solicitado:', dados);
  };

  return (
    <LayoutAutenticacao
      imagemFundo={basilicaPng}
      imagemLogo={logoPng}
      titulo="Acesse sua conta"
      subtitulo="Bem-vindo ao seu recanto de paz"
    >
      <Form onSubmit={handleSubmit}>
        <Entrada
          tipo="email"
          nome="email"
          placeholder="Insira seu email"
          valor={dados.email}
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

        <Botao larguraTotal efeitoOnda type="submit">
          Login
        </Botao>

        <div className="container-link-autenticacao text-center mt-3">
          <span className="text-white">Ainda não tem conta? </span>
          <LinkAutenticacao para="/Cadastro" variante="destaque">
            Criar conta
          </LinkAutenticacao>
        </div>

        <div className="text-center mt-2">
          <LinkAutenticacao para="/recuperar-senha" variante="secundario">
            Esqueceu sua senha?
          </LinkAutenticacao>
        </div>
      </Form>
    </LayoutAutenticacao>
  );
}

export default Login;