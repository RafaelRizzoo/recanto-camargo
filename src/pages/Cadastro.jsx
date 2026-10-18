import { useState } from 'react';
import { usePreferencias } from '../hooks/usePreferencias';
import { useNavigate } from 'react-router-dom';
import { Form } from 'react-bootstrap';
import LayoutAutenticacao from '../components/UI/LayoutAutenticacao';
import Entrada from '../components/UI/Entrada';
import EntradaSenha from '../components/UI/EntradaSenha';
import Botao from '../components/UI/Botao';
import LinkAutenticacao from '../components/UI/LinkAutenticacao';
import { useAutenticacao } from '../hooks/useAutenticacao';
import logoPng from '../assets/img/artes/logo.webp';
import basilicaPng from '../assets/img/artes/basilica.webp';

function Cadastro() {
  const { t } = usePreferencias();
  const [dados, setDados] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    senha: '',
    confirmacaoSenha: '',
    aceitouTermos: false
  });
  const [erro, setErro] = useState('');
  const { registrar } = useAutenticacao();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDados(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (dados.senha !== dados.confirmacaoSenha) {
      setDados(prev => ({ ...prev, senha: '', confirmacaoSenha: '' }));
      setErro(t('As senhas não coincidem!'));
      return;
    }

    if (dados.senha.length < 8) {
      setDados(prev => ({ ...prev, senha: '', confirmacaoSenha: '' }));
      setErro(t('A senha deve ter no mínimo 8 caracteres.'));
      return;
    }

    if (!/[A-Z]/.test(dados.senha)) {
      setDados(prev => ({ ...prev, senha: '', confirmacaoSenha: '' }));
      setErro(t('A senha deve conter pelo menos uma letra maiúscula.'));
      return;
    }

    if (!/[a-z]/.test(dados.senha)) {
      setDados(prev => ({ ...prev, senha: '', confirmacaoSenha: '' }));
      setErro(t('A senha deve conter pelo menos uma letra minúscula.'));
      return;
    }

    if (!/\d/.test(dados.senha)) {
      setDados(prev => ({ ...prev, senha: '', confirmacaoSenha: '' }));
      setErro(t('A senha deve conter pelo menos um número.'));
      return;
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(dados.senha)) {
      setDados(prev => ({ ...prev, senha: '', confirmacaoSenha: '' }));
      setErro(t('A senha deve conter pelo menos um caractere especial (!@#$%...).'));
      return;
    }

    if (!dados.aceitouTermos) {
      setErro(t('Você precisa ler e aceitar os Termos de Uso e a Política de Privacidade para criar sua conta.'));
      return;
    }

    if (!dados.cpf || dados.cpf.length < 11) {
      setErro(t('Digite um CPF válido.'));
      return;
    }

    // Como agora o registrar bate no Back-end e devolve uma Promise, colocamos await
    const resultado = await registrar({
      nome: dados.nome,
      email: dados.email,
      cpf: dados.cpf,
      telefone: dados.telefone,
      senha: dados.senha,
      aceitouTermos: dados.aceitouTermos,
      versaoTermos: 'v1.0'
    });

    if (resultado.sucesso) {
      navigate('/');
    } else {
      setDados(prev => ({ ...prev, senha: '', confirmacaoSenha: '' }));
      setErro(resultado.mensagem);
    }
  };

  return (
    <LayoutAutenticacao
      imagemFundo={basilicaPng}
      imagemLogo={logoPng}
      titulo={t("Crie sua conta")}
      subtitulo={t("Junte-se ao Recanto Camargo")}
      compacto={true}
    >
      <Form onSubmit={handleSubmit}>
        {erro && <div className="alerta-erro mb-3">{erro}</div>}
        
        <Entrada
          tipo="text"
          nome="nome"
          placeholder={t("Seu nome completo")}
          valor={dados.nome}
          onChange={handleChange}
          required
        />
        
        <Entrada
          tipo="text"
          nome="cpf"
          placeholder={t("Seu CPF (somente números)")}
          valor={dados.cpf}
          onChange={handleChange}
          required
        />
        
        <Entrada
          tipo="email"
          nome="email"
          placeholder={t("Insira seu email")}
          valor={dados.email}
          onChange={handleChange}
          required
        />
        
        <Entrada
          tipo="tel"
          nome="telefone"
          placeholder={t("Insira seu telefone")}
          valor={dados.telefone}
          onChange={handleChange}
          required
        />

        <EntradaSenha
          nome="senha"
          placeholder={t("Crie uma senha forte (mín. 8 caracteres)")}
          valor={dados.senha}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />
        <small className="texto-ajuda-senha text-white-50 d-block mb-2">
          {t("Mínimo 8 caracteres com maiúscula, minúscula, número e símbolo especial (!@#$%).")}
        </small>

        <EntradaSenha
          nome="confirmacaoSenha"
          placeholder={t("Repita sua senha")}
          valor={dados.confirmacaoSenha}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />

        <div className="form-check text-start my-2 d-flex align-items-center gap-2" style={{ paddingLeft: 0 }}>
          <input
            type="checkbox"
            id="aceitouTermos"
            name="aceitouTermos"
            className="form-check-input m-0"
            checked={dados.aceitouTermos}
            onChange={handleChange}
            style={{ cursor: 'pointer', accentColor: '#ff9211', width: '18px', height: '18px', flexShrink: 0 }}
            required
          />
          <label htmlFor="aceitouTermos" className="form-check-label text-white-50" style={{ fontSize: '0.8rem', lineHeight: '1.3', cursor: 'pointer' }}>
            {t('Li e concordo com os')}{' '}
            <LinkAutenticacao para="/TermosDeUso" target="_blank" variante="secundario" style={{ textDecoration: 'underline' }}>
              {t("Termos de Uso")}
            </LinkAutenticacao>{' '}
            {t('e a')}{' '}
            <LinkAutenticacao para="/Privacidade" target="_blank" variante="secundario" style={{ textDecoration: 'underline' }}>
              {t("Política de Privacidade")}
            </LinkAutenticacao>.
          </label>
        </div>

        <Botao larguraTotal efeitoOnda type="submit">
          {t("Cadastrar")}
        </Botao>

        <div className="container-link-autenticacao text-center mt-2 mb-2">
          <span className="text-white">{t("Já tem conta?")} </span>
          <LinkAutenticacao para="/Login" variante="destaque">
            {t("Fazer login")}
          </LinkAutenticacao>
        </div>

        <div className="text-center mt-2 pt-1">
          <div className="d-flex justify-content-center align-items-center gap-2">
            <LinkAutenticacao para="/TermosDeUso" variante="secundario" style={{ fontSize: '0.82rem', opacity: 0.85 }}>
              {t("Termos de Uso")}
            </LinkAutenticacao>
            <span className="text-white-50" style={{ fontSize: '0.75rem' }}>•</span>
            <LinkAutenticacao para="/Privacidade" variante="secundario" style={{ fontSize: '0.82rem', opacity: 0.85 }}>
              {t("Privacidade")}
            </LinkAutenticacao>
          </div>
        </div>

        <div className="d-lg-none">
          <hr className="border-white opacity-25 my-4" />
          <div className="text-center mb-4">
            <LinkAutenticacao para="/" variante="secundario">
              <i className="bi bi-arrow-left me-2"></i>
              {t("Voltar para o site")}
            </LinkAutenticacao>
          </div>
        </div>
      </Form>
    </LayoutAutenticacao>
  );
}

export default Cadastro;