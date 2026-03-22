import { useState } from 'react';
import Entrada from './Entrada';
import PropTypes from 'prop-types';

const IconeOlhoAberto = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="22" 
    height="22" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconeOlhoFechado = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="22" 
    height="22" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

function EntradaSenha({ 
  placeholder = 'Insira sua senha',
  nome = 'senha',
  valor,
  onChange,
  erro,
  mostrarAlternar = true,
  ...props 
}) {
  const [mostrarSenha, setMostrarSenha] = useState(false);

  return (
    <Entrada
      tipo={mostrarSenha ? 'text' : 'password'}
      placeholder={placeholder}
      nome={nome}
      valor={valor}
      onChange={onChange}
      erro={erro}
      icone={mostrarAlternar ? (
        mostrarSenha ? (
          <IconeOlhoAberto />
        ) : (
          <IconeOlhoFechado />
        )
      ) : null}
      onCliqueIcone={() => setMostrarSenha(!mostrarSenha)}
      {...props}
    />
  );
}

EntradaSenha.propTypes = {
  placeholder: PropTypes.string,
  nome: PropTypes.string,
  valor: PropTypes.string,
  onChange: PropTypes.func,
  erro: PropTypes.string,
  mostrarAlternar: PropTypes.bool,
};

export default EntradaSenha;