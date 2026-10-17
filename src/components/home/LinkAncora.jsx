import PropTypes from "prop-types";
import { irPara } from "./links";

// HashRouter usa o hash para rotas; por isso a rolagem interna não altera a URL.
function LinkAncora({ para, onClick, children, ...props }) {
  return (
    <a
      href="#/"
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
        irPara(para);
      }}
      {...props}
    >
      {children}
    </a>
  );
}

LinkAncora.propTypes = {
  para: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  children: PropTypes.node.isRequired,
};

export default LinkAncora;
