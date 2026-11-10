import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { usePreferencias } from "../../hooks/usePreferencias";

// Painel modal para os detalhes que saíram da tela de reserva (comodidades, mapa, avaliações).
function PainelDetalhes({ titulo, aoFechar, children }) {
  const { t } = usePreferencias();
  const botaoFechar = useRef(null);

  useEffect(() => {
    const anterior = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    botaoFechar.current?.focus();
    const aoTeclar = (e) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", aoTeclar);
      anterior?.focus?.();
    };
  }, [aoFechar]);

  return createPortal(
    <div className="rc-home rc-painel" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="rc-painel-caixa" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="rc-painel-topo">
          <h2>{titulo}</h2>
          <button type="button" ref={botaoFechar} className="rc-painel-fechar" onClick={aoFechar} aria-label={t("Fechar")}>
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
        <div className="rc-painel-corpo">{children}</div>
      </div>
    </div>,
    document.body
  );
}

PainelDetalhes.propTypes = {
  titulo: PropTypes.string.isRequired,
  aoFechar: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default PainelDetalhes;
