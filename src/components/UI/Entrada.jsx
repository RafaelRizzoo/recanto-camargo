import { Form } from 'react-bootstrap';
import PropTypes from 'prop-types';
import './Entrada.css';

// Ícone de Email
const IconeEmail = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

// Ícone de Usuário
const IconeUsuario = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// Ícone de Cadeado 🔒
const IconeCadeado = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

function Entrada({ 
  tipo = 'text',
  placeholder,
  nome,
  valor,
  onChange,
  erro,
  icone,
  onCliqueIcone,
  mostrarIconeEsquerdo = true,
  ...props 
}) {
  // Define ícone padrão baseado no tipo/nome
  const iconePadrao = () => {
    if (nome === 'email') return <IconeEmail />;
    if (nome === 'usuario' || nome === 'nome') return <IconeUsuario />;
    if (nome === 'senha' || tipo === 'password') return <IconeCadeado />;
    return null;
  };

  return (
    <Form.Group className="mb-3 grupo-entrada-animado">
      <div className="wrapper-entrada">
        {mostrarIconeEsquerdo && iconePadrao() && (
          <span className="icone-esquerdo">
            {iconePadrao()}
          </span>
        )}
        
        <Form.Control
          type={tipo}
          name={nome}
          placeholder={placeholder}
          value={valor}
          onChange={onChange}
          className="form-controle-custom"
          isInvalid={!!erro}
          {...props}
        />
        
        {icone && (
          <button 
            type="button"
            className="botao-icone-entrada"
            onClick={onCliqueIcone}
            tabIndex={-1}
          >
            {icone}
          </button>
        )}
      </div>
      
      {erro && (
        <Form.Text className="text-danger mt-1">
          {erro}
        </Form.Text>
      )}
    </Form.Group>
  );
}

Entrada.propTypes = {
  tipo: PropTypes.string,
  placeholder: PropTypes.string,
  nome: PropTypes.string,
  valor: PropTypes.string,
  onChange: PropTypes.func,
  erro: PropTypes.string,
  icone: PropTypes.node,
  onCliqueIcone: PropTypes.func,
  mostrarIconeEsquerdo: PropTypes.bool,
};

export default Entrada;