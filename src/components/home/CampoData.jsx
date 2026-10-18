import PropTypes from "prop-types";
import { usePreferencias } from "../../hooks/usePreferencias";
import { formatarData } from "./links";

function CampoData({ id, rotulo, valor, aberto, onAbrir, onFechar, children }) {
  const { t } = usePreferencias();
  return (
    <div className="rc-field">
      <label id={`${id}-rotulo`} htmlFor={id}>{rotulo}</label>
      <button
        type="button"
        id={id}
        className="rc-fieldbtn"
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-labelledby={`${id}-rotulo ${id}`}
        onClick={aberto ? onFechar : onAbrir}
      >
        {valor ? formatarData(valor) : <span className="rc-placeholder">{t("Selecionar")}</span>}
      </button>
      {children}
    </div>
  );
}

CampoData.propTypes = {
  id: PropTypes.string.isRequired,
  rotulo: PropTypes.string.isRequired,
  valor: PropTypes.string,
  aberto: PropTypes.bool.isRequired,
  onAbrir: PropTypes.func.isRequired,
  onFechar: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default CampoData;
