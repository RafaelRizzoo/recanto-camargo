import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import './MenuUsuario.css';

function MenuUsuario() {
  const [aberto, setAberto] = useState(false);
  const { usuario, logout, tipo } = useAutenticacao();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  // Fecha ao clicar fora - VERSÃO CORRIGIDA
  useEffect(() => {
    const handler = (e) => {
      if (!menuRef.current) return;
      
      // Verifica se o clique foi DENTRO do menu
      if (menuRef.current.contains(e.target)) {
        return; // Não faz nada - clique foi dentro
      }
      
      // Clique foi fora - fecha o menu
      setAberto(false);
    };
    
    // Adiciona o listener SEMPRE que o menu abrir
    if (aberto) {
      document.addEventListener('mousedown', handler);
    }
    
    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, [aberto]); // Re-cria o listener quando 'aberto' mudar

  const handleLogout = () => {
    logout();
    setAberto(false);
    navigate('/');
  };

  const inicial = usuario?.nome?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="menu-usuario-wrapper" ref={menuRef}>
      <button 
        className="avatar-usuario" 
        onClick={(e) => {
          e.stopPropagation();
          setAberto(!aberto);
        }}
        aria-label="Menu do usuário"
        aria-expanded={aberto}
        type="button"
      >
        {inicial}
      </button>

      {aberto && (
        <div className="menu-usuario-dropdown">
          <div className="menu-header">
            <div className="menu-avatar-lg">{inicial}</div>
            <div className="menu-info">
              <div className="menu-nome">{usuario?.nome}</div>
              <div className="menu-email">{usuario?.email}</div>
              <span className={`menu-badge ${tipo}`}>{tipo === 'admin' ? 'Proprietário' : 'Hóspede'}</span>
            </div>
          </div>

          <div className="menu-itens">
            {tipo === 'hospede' && (
              <>
                <button className="menu-item" onClick={() => { navigate('/DashboardCliente'); setAberto(false); }}>
                  <i className="bi bi-person-circle"></i> Minha Conta
                </button>
              </>
            )}
            
            {tipo === 'admin' && (
              <>
                <button className="menu-item" onClick={() => { navigate('/DashboardAdministrador'); setAberto(false); }}>
                  <i className="bi bi-speedometer2"></i> Painel Admin
                </button>
              </>
            )}

            <button className="menu-item" onClick={() => { navigate('/Configuracoes'); setAberto(false); }}>
              <i className="bi bi-gear"></i> Configurações
            </button>

            <div className="menu-divider"></div>

            <button className="menu-item menu-sair" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right"></i> Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MenuUsuario;