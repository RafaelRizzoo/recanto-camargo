import { Button as BootstrapButton } from 'react-bootstrap';
import PropTypes from 'prop-types';
import './Botao.css';

function Botao({ 
  children, 
  variante = 'warning', 
  tipo = 'submit',
  larguraTotal = false,
  onClick,
  className = '',
  efeitoOnda = true,
  ...props 
}) {
  return (
    <BootstrapButton
      type={tipo}
      variant={variante}
      className={`btn-autenticacao ${larguraTotal ? 'w-100' : ''} ${className} ${efeitoOnda ? 'com-onda' : ''}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </BootstrapButton>
  );
}

Botao.propTypes = {
  children: PropTypes.node.isRequired,
  variante: PropTypes.string,
  tipo: PropTypes.string,
  larguraTotal: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
  efeitoOnda: PropTypes.bool,
};

export default Botao;