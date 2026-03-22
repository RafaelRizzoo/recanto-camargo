import { useState } from 'react';
import { Form } from 'react-bootstrap';
import LayoutAutenticacao from '../components/UI/LayoutAutenticacao';
import Entrada from '../components/UI/Entrada';
import EntradaSenha from '../components/UI/EntradaSenha';
import Botao from '../components/UI/Botao';
import LinkAutenticacao from '../components/UI/LinkAutenticacao';
import logoPng from '../assets/img/artes/logo.png';
import basilicaPng from '../assets/img/artes/basilica.png';

function Cadastro() {
  const [dados, setDados] = useState({
    email: '',
    senha: '',
    confirmacaoSenha: ''
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

    if (dados.senha !== dados.confirmacaoSenha) {
      alert('As senhas não coincidem!');
      return;
    }

    console.log('Cadastro:', dados);
  };

  return (
    <LayoutAutenticacao
      imagemFundo={basilicaPng}
      imagemLogo={logoPng}
      titulo="Crie sua conta"
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

        <EntradaSenha
          nome="confirmacaoSenha"
          placeholder="Repita sua senha"
          valor={dados.confirmacaoSenha}
          onChange={handleChange}
          required
        />

        <Botao larguraTotal>
          Cadastrar
        </Botao>

        <div className="container-link-autenticacao text-center mt-3">
          <span className="text-white">Voltar para o </span>
          <LinkAutenticacao para="/Login" variante="destaque">
            Login
          </LinkAutenticacao>
        </div>
        
        <hr className="border-white opacity-25 my-4" />

        <div className="text-center">
          <LinkAutenticacao para="/" variante="secundario">
            <i className="bi bi-arrow-left me-2"></i>
            Voltar para o site
          </LinkAutenticacao>
        </div>
      </Form>
    </LayoutAutenticacao>
  );
}

export default Cadastro;