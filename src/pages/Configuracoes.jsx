import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { usePreferencias } from '../hooks/usePreferencias';
import { API_BASE, IS_API_AVAILABLE } from '../utils/api';
import '../components/home/home.css';
import './Configuracoes.css';

const REGRAS_SENHA = [
  { teste: (s) => s.length >= 8, msg: 'A nova senha deve ter no mínimo 8 caracteres.' },
  { teste: (s) => /[A-Z]/.test(s), msg: 'A nova senha deve conter pelo menos uma letra maiúscula.' },
  { teste: (s) => /[a-z]/.test(s), msg: 'A nova senha deve conter pelo menos uma letra minúscula.' },
  { teste: (s) => /\d/.test(s), msg: 'A nova senha deve conter pelo menos um número.' },
  { teste: (s) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(s), msg: 'A nova senha deve conter pelo menos um caractere especial (!@#$%...).' },
];

function CampoSenha({ id, rotulo, valor, onChange, autoComplete }) {
  const { t } = usePreferencias();
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="cfg-campo">
      <label htmlFor={id}>{t(rotulo)}</label>
      <div className="cfg-senha">
        <input
          id={id}
          type={visivel ? 'text' : 'password'}
          value={valor}
          onChange={onChange}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="cfg-olho"
          onClick={() => setVisivel(v => !v)}
          aria-label={visivel ? t('Ocultar senha') : t('Mostrar senha')}
        >
          <i className={`bi ${visivel ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function Configuracoes() {
  const { usuario, tipo, atualizarUsuario } = useAutenticacao();
  const { t } = usePreferencias();
  const ehProprietario = tipo === 'proprietario';
  const [abaAtiva, setAbaAtiva] = useState('perfil');
  const [feedback, setFeedback] = useState({ tipo: '', msg: '' });
  const [salvando, setSalvando] = useState(false);

  const [perfil, setPerfil] = useState({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    telefone: usuario?.telefone || '',
  });
  const [senhas, setSenhas] = useState({ atual: '', nova: '', confirmar: '' });

  useEffect(() => {
    if (!IS_API_AVAILABLE) return undefined;
    let ativo = true;
    fetch(`${API_BASE}/api/usuarios/perfil`, { credentials: 'include' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (ativo && data?.usuario) {
          setPerfil({
            nome: data.usuario.nome || '',
            email: data.usuario.email || '',
            telefone: data.usuario.telefone || '',
          });
        }
      })
      .catch(() => {});
    return () => { ativo = false; };
  }, []);

  const mostrarFeedback = (tipoMsg, msg) => {
    setFeedback({ tipo: tipoMsg, msg });
    setTimeout(() => setFeedback({ tipo: '', msg: '' }), 4000);
  };

  const trocarAba = (id) => {
    setAbaAtiva(id);
    setFeedback({ tipo: '', msg: '' });
  };

  const salvarPerfil = async (e) => {
    e.preventDefault();
    if (!perfil.nome.trim()) return mostrarFeedback('erro', t('Nome não pode estar vazio.'));
    if (!IS_API_AVAILABLE) return mostrarFeedback('sucesso', t('Perfil atualizado (modo demonstração)!'));

    setSalvando(true);
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/perfil`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nome: perfil.nome.trim(), telefone: perfil.telefone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('Erro ao salvar perfil.'));
      if (atualizarUsuario) atualizarUsuario({ nome: perfil.nome.trim(), telefone: perfil.telefone.trim() });
      mostrarFeedback('sucesso', t('Perfil atualizado com sucesso!'));
    } catch (err) {
      mostrarFeedback('erro', err.message || t('Erro ao salvar perfil. Tente novamente.'));
    } finally {
      setSalvando(false);
    }
    return undefined;
  };

  const alterarSenha = async (e) => {
    e.preventDefault();
    if (!senhas.atual || !senhas.nova || !senhas.confirmar) {
      return mostrarFeedback('erro', t('Preencha todos os campos de senha.'));
    }
    if (senhas.nova !== senhas.confirmar) {
      setSenhas(p => ({ ...p, confirmar: '' }));
      return mostrarFeedback('erro', t('A nova senha e a confirmação não coincidem.'));
    }
    const falha = REGRAS_SENHA.find(r => !r.teste(senhas.nova));
    if (falha) return mostrarFeedback('erro', t(falha.msg));

    if (!IS_API_AVAILABLE) {
      setSenhas({ atual: '', nova: '', confirmar: '' });
      return mostrarFeedback('sucesso', t('Senha alterada (modo demonstração)!'));
    }

    setSalvando(true);
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/senha`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ senhaAtual: senhas.atual, novaSenha: senhas.nova }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('Erro ao alterar senha.'));
      setSenhas({ atual: '', nova: '', confirmar: '' });
      mostrarFeedback('sucesso', t('Senha alterada com sucesso!'));
    } catch (err) {
      mostrarFeedback('erro', err.message || t('Erro ao alterar senha. Tente novamente.'));
    } finally {
      setSalvando(false);
    }
    return undefined;
  };

  const abas = [
    { id: 'perfil', label: 'Dados Cadastrais', icone: 'bi-person-vcard' },
    { id: 'seguranca', label: 'Senha e Acesso', icone: 'bi-shield-lock' },
    { id: 'notificacoes', label: 'Notificações', icone: 'bi-bell' },
  ];

  const avisoFeedback = feedback.msg ? (
    <div className={`cfg-feedback ${feedback.tipo}`} role="status">
      <i className={`bi ${feedback.tipo === 'sucesso' ? 'bi-check-circle' : 'bi-exclamation-triangle'}`} aria-hidden="true" />
      {feedback.msg}
    </div>
  ) : null;

  const renderConteudo = () => {
    if (abaAtiva === 'perfil') {
      return (
        <form className="cfg-card" onSubmit={salvarPerfil}>
          <h2>{t(ehProprietario ? 'Dados do Responsável' : 'Dados Pessoais')}</h2>
          <p className="cfg-desc">
            {t(ehProprietario
              ? 'Informações de contato do responsável pelo imóvel.'
              : 'Seus dados para identificação e contato durante a reserva.')}
          </p>
          <div className="cfg-grid">
            <div className="cfg-campo">
              <label htmlFor="cfg-nome">{t('Nome completo')}</label>
              <input
                id="cfg-nome"
                type="text"
                autoComplete="name"
                value={perfil.nome}
                onChange={e => setPerfil(p => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div className="cfg-campo">
              <label htmlFor="cfg-tel">{t('Telefone / WhatsApp')}</label>
              <input
                id="cfg-tel"
                type="tel"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                value={perfil.telefone}
                onChange={e => setPerfil(p => ({ ...p, telefone: e.target.value }))}
              />
            </div>
            <div className="cfg-campo cfg-campo-largo">
              <label htmlFor="cfg-email">{t('E-mail de acesso')}</label>
              <input id="cfg-email" type="email" value={perfil.email} readOnly disabled />
              <small>{t('O e-mail é usado para entrar na conta e não pode ser alterado aqui.')}</small>
            </div>
          </div>
          {avisoFeedback}
          <button type="submit" className="rc-btn rc-btn-primary cfg-btn" disabled={salvando}>
            {salvando ? t('Salvando...') : t('Salvar alterações')}
          </button>
        </form>
      );
    }

    if (abaAtiva === 'seguranca') {
      return (
        <form className="cfg-card" onSubmit={alterarSenha}>
          <h2>{t('Alterar senha')}</h2>
          <p className="cfg-desc">
            {t(ehProprietario ? 'Mantenha a segurança do painel administrativo.' : 'Proteja sua conta e suas reservas.')}
          </p>
          <CampoSenha
            id="cfg-senha-atual"
            rotulo="Senha atual"
            autoComplete="current-password"
            valor={senhas.atual}
            onChange={e => setSenhas(p => ({ ...p, atual: e.target.value }))}
          />
          <CampoSenha
            id="cfg-senha-nova"
            rotulo="Nova senha"
            autoComplete="new-password"
            valor={senhas.nova}
            onChange={e => setSenhas(p => ({ ...p, nova: e.target.value }))}
          />
          <small className="cfg-dica">
            {t('Mínimo de 8 caracteres, com letra maiúscula, minúscula, número e símbolo (!@#$%).')}
          </small>
          <CampoSenha
            id="cfg-senha-confirmar"
            rotulo="Confirmar nova senha"
            autoComplete="new-password"
            valor={senhas.confirmar}
            onChange={e => setSenhas(p => ({ ...p, confirmar: e.target.value }))}
          />
          {avisoFeedback}
          <button type="submit" className="rc-btn rc-btn-primary cfg-btn" disabled={salvando}>
            {salvando ? t('Atualizando...') : t('Atualizar senha')}
          </button>
        </form>
      );
    }

    return (
      <div className="cfg-card">
        <h2>{t('Como você recebe os avisos')}</h2>
        <p className="cfg-desc">{t('Os avisos importantes chegam automaticamente, sem precisar configurar nada.')}</p>
        <ul className="cfg-avisos">
          <li>
            <i className="bi bi-bell" aria-hidden="true" />
            <div>
              <strong>{t('No site')}</strong>
              <span>{t('Pelo sino no topo da página, sempre que entrar na sua conta.')}</span>
            </div>
          </li>
          <li>
            <i className="bi bi-envelope" aria-hidden="true" />
            <div>
              <strong>{t('Por e-mail')}</strong>
              <span>
                {t(ehProprietario
                  ? 'Novas solicitações de reserva, pagamentos e cancelamentos.'
                  : 'Confirmação da reserva, pagamento e lembrete antes do check-in.')}
              </span>
            </div>
          </li>
          <li>
            <i className="bi bi-whatsapp" aria-hidden="true" />
            <div>
              <strong>{t('Pelo WhatsApp')}</strong>
              <span>{t('Para combinar detalhes da chegada, fale direto com o Recanto.')}</span>
            </div>
          </li>
        </ul>
      </div>
    );
  };

  return (
    <div className="rc-home cfg-pagina">
      <div className="rc-wrap">
        <header className="cfg-head">
          <Link to={ehProprietario ? '/DashboardAdministrador' : '/DashboardCliente'} className="cfg-voltar">
            <i className="bi bi-arrow-left" aria-hidden="true" /> {t('Voltar ao painel')}
          </Link>
          <span className="rc-eyebrow">{t('Sua conta')}</span>
          <h1>{t('Configurações')}</h1>
          <p className="rc-lead">{t('Gerencie seus dados e a segurança da sua conta.')}</p>
        </header>

        <div className="cfg-layout">
          <nav className="cfg-nav" aria-label={t('Seções de configurações')}>
            {abas.map(aba => (
              <button
                key={aba.id}
                type="button"
                className={`cfg-nav-item${abaAtiva === aba.id ? ' ativo' : ''}`}
                aria-current={abaAtiva === aba.id ? 'page' : undefined}
                onClick={() => trocarAba(aba.id)}
              >
                <i className={`bi ${aba.icone}`} aria-hidden="true" />
                <span>{t(aba.label)}</span>
              </button>
            ))}
          </nav>

          <div className="cfg-conteudo">
            {renderConteudo()}

            <aside className="cfg-lgpd">
              <i className="bi bi-shield-check" aria-hidden="true" />
              <div>
                <strong>{t('Proteção de dados (LGPD)')}</strong>
                <p>
                  {t('Seus dados ficam guardados com segurança no sistema do Recanto Camargo e são usados apenas para suas reservas. O CPF é armazenado criptografado e nada é compartilhado para fins de marketing.')}
                  {' '}
                  <Link to="/Privacidade">{t('Ver Política de Privacidade')}</Link>
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Configuracoes;
