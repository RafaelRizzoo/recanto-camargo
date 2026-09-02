import { createContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

export const AuthContext = createContext(null);

export function ContextoAutenticacao({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Quando o app carregar, verificar se existe um cookie de sessão válido no Back-end
  useEffect(() => {
    fetch('http://localhost:3000/api/usuarios/sessao', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Não autenticado');
        return res.json();
      })
      .then(data => {
        setUsuario(data.usuario);
      })
      .catch(() => {
        setUsuario(null);
      })
      .finally(() => {
        setCarregando(false);
      });
  }, []);

  const login = useCallback(async (email, senha) => {
    try {
      const res = await fetch('http://localhost:3000/api/usuarios/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok) {
        setUsuario(data.usuario);
        return { sucesso: true };
      } else {
        return { sucesso: false, mensagem: data.error || 'Email ou senha inválidos.' };
      }
    } catch (e) {
      console.error('Erro no login:', e);
      return { sucesso: false, mensagem: 'Erro de conexão com o servidor.' };
    }
  }, []);

  const registrar = useCallback(async (dados) => {
    try {
      const resCadastro = await fetch('http://localhost:3000/api/usuarios/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });

      const dataCadastro = await resCadastro.json();

      if (resCadastro.ok) {
        // Como o cadastro não devolve token, fazemos o login automaticamente
        return await login(dados.email, dados.senha);
      } else {
        return { sucesso: false, mensagem: dataCadastro.error || 'Erro ao criar conta.' };
      }
    } catch (e) {
      console.error('Erro no registro:', e);
      return { sucesso: false, mensagem: 'Erro de conexão com o servidor.' };
    }
  }, [login]);

  const logout = useCallback(async () => {
    try {
      await fetch('http://localhost:3000/api/usuarios/logout', { 
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.error('Erro ao fazer logout:', e);
    }
    setUsuario(null);
  }, []);

  if (carregando) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: 'var(--azul-escuro)' }}>
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ usuario, autenticado: !!usuario, tipo: usuario?.tipo, login, registrar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

ContextoAutenticacao.propTypes = {
  children: PropTypes.node.isRequired
};
