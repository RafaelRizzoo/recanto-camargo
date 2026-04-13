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

function Login() {
  const [dados, setDados] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState('');
  const { login } = useAutenticacao();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDados(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro('');
    const resultado = login(dados.email, dados.senha);
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
      titulo="Acesse sua conta"
      subtitulo="Bem-vindo ao seu recanto de paz"
    >
      <Form onSubmit={handleSubmit}>
        {erro && <div className="alerta-erro mb-3">{erro}</div>}
        
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
          <LinkAutenticacao para="/RecuperarSenha" variante="secundario">
            Esqueceu a senha?
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

export default Login;