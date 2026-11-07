import PropTypes from "prop-types";
import { usePreferencias } from "../../hooks/usePreferencias";
import { formatarPeriodo } from "./SeletorDatas";
import "./SeletorDatas.css";

// Campo único "Quando?" (entrada e saída juntas), que abre o painel de datas.
function CampoQuando({ id, checkin, checkout, aberto, aoAbrir, aoFechar, aoLimpar, invalido = false, className = "" }) {
  const { t, idioma } = usePreferencias();
  const texto = formatarPeriodo(checkin, checkout, idioma);
  return (
    <div className={`rc-field rc-quando${aberto ? " rc-quando-aberto" : ""}${invalido ? " rc-invalid" : ""} ${className}`}>
      <label id={`${id}-rotulo`} htmlFor={id}>{t("Quando?")}</label>
      <button
        type="button"
        id={id}
        className="rc-fieldbtn"
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-labelledby={`${id}-rotulo ${id}`}
        onClick={aberto ? aoFechar : aoAbrir}
      >
        {texto || <span className="rc-placeholder">{t("Adicionar datas")}</span>}
      </button>
      {checkin && aoLimpar && (
        <button type="button" className="rc-quando-limpar" onClick={aoLimpar} aria-label={t("Limpar datas")}>
          <i className="bi bi-x" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

CampoQuando.propTypes = {
  id: PropTypes.string.isRequired,
  checkin: PropTypes.string,
  checkout: PropTypes.string,
  aberto: PropTypes.bool.isRequired,
  aoAbrir: PropTypes.func.isRequired,
  aoFechar: PropTypes.func.isRequired,
  aoLimpar: PropTypes.func,
  invalido: PropTypes.bool,
  className: PropTypes.string,
};

export default CampoQuando;
