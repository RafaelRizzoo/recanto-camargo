import { createContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

export const AuthContext = createContext(null);

const USUARIOS_MOCK = [
  { id: 1, nome: 'Administrador', email: 'admin@admin.com', senha: 'admin123', tipo: 'admin', telefone: '(12) 99999-0001' },
  { id: 2, nome: 'Cliente Teste', email: 'cliente@cliente.com', senha: 'cliente123', tipo: 'hospede', telefone: '(12) 99999-0002' }
];

const CHAVE_SESSION = 'recanto_camargo_session';
const CHAVE_DB = 'recanto_camargo_db';

function inicializarDB() {
  try {
    const dbExistente = localStorage.getItem(CHAVE_DB);
    if (!dbExistente) {
      localStorage.setItem(CHAVE_DB, JSON.stringify(USUARIOS_MOCK));
      console.log('✅ DB mock inicializado');
      return USUARIOS_MOCK;
    }
    return JSON.parse(dbExistente);
  } catch (e) {
    console.error('❌ Erro ao inicializar DB:', e);
    localStorage.setItem(CHAVE_DB, JSON.stringify(USUARIOS_MOCK));
    return USUARIOS_MOCK;
  }
}

export function ContextoAutenticacao({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Inicializa DB sincronamente
    inicializarDB();

    // Tenta restaurar sessão
    try {
      const sessaoSalva = localStorage.getItem(CHAVE_SESSION);
      if (sessaoSalva) {
        const dados = JSON.parse(sessaoSalva);
        setUsuario(dados);
        console.log('🔐 Sessão restaurada:', dados.email);
      }
    } catch (e) {
      console.error('❌ Erro ao restaurar sessão:', e);
      localStorage.removeItem(CHAVE_SESSION);
    }
    setCarregando(false);
  }, []);

  const login = useCallback((email, senha) => {
    console.log('🔍 Tentando login:', { email, senha });
    
    try {
      const dbRaw = localStorage.getItem(CHAVE_DB);
      if (!dbRaw) {
        console.error('❌ DB não encontrado');
        return { sucesso: false, mensagem: 'Erro interno. Tente novamente.' };
      }
      
      const db = JSON.parse(dbRaw);
      const encontrado = db.find(u => u.email === email && u.senha === senha);

      if (encontrado) {
        const { senha: _, ...dadosSeguros } = encontrado;
        setUsuario(dadosSeguros);
        localStorage.setItem(CHAVE_SESSION, JSON.stringify(dadosSeguros));
        console.log('✅ Login sucesso:', dadosSeguros);
        return { sucesso: true };
      }
      
      console.log('❌ Credenciais inválidas');
      return { sucesso: false, mensagem: 'Email ou senha inválidos.' };
    } catch (e) {
      console.error('❌ Erro no login:', e);
      return { sucesso: false, mensagem: 'Erro ao processar login.' };
    }
  }, []);

  const registrar = useCallback((dados) => {
    try {
      const db = JSON.parse(localStorage.getItem(CHAVE_DB) || '[]');
      
      if (db.find(u => u.email === dados.email)) {
        return { sucesso: false, mensagem: 'Este email já está cadastrado.' };
      }

      const novoUsuario = { id: Date.now(), tipo: 'hospede', ...dados };
      db.push(novoUsuario);
      localStorage.setItem(CHAVE_DB, JSON.stringify(db));

      const { senha: _, ...dadosSeguros } = novoUsuario;
      setUsuario(dadosSeguros);
      localStorage.setItem(CHAVE_SESSION, JSON.stringify(dadosSeguros));
      return { sucesso: true };
    } catch (e) {
      console.error('❌ Erro no registro:', e);
      return { sucesso: false, mensagem: 'Erro ao criar conta.' };
    }
  }, []);

  const logout = useCallback(() => {
    setUsuario(null);
    localStorage.removeItem(CHAVE_SESSION);
    console.log('🚪 Logout realizado');
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