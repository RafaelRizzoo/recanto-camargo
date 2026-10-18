import { useState } from "react";
import { usePreferencias } from "../../hooks/usePreferencias";
import PropTypes from "prop-types";
import Lightbox from "../UI/Lightbox";

// Mosaico (desktop) / carrossel com snap (mobile) com lightbox. Reutilizado na Home e na Reserva.
function MosaicoFotos({ fotos, rotulo, className = "" }) {
  const { t } = usePreferencias();
  const [indiceAberto, setIndiceAberto] = useState(null);
  const midias = fotos.map((f) => ({ ...f, alt: t(f.alt), categoria: rotulo }));

  return (
    <div className={`rc-gal-wrap ${className}`}>
      <div className="rc-gal" role="list">
        {fotos.map((f, i) => (
          <button
            type="button"
            role="listitem"
            key={`${rotulo}-${f.alt}`}
            onClick={() => setIndiceAberto(i)}
            aria-label={t("Ampliar foto: {alt}, {rotulo}", { alt: t(f.alt), rotulo })}
          >
            <img src={f.src} alt={t("{alt} do {rotulo}", { alt: t(f.alt), rotulo })} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
            <span className="rc-cap">{t(f.alt)} · {rotulo}</span>
          </button>
        ))}
      </div>
      <button type="button" className="rc-btn rc-btn-light rc-galmore" onClick={() => setIndiceAberto(0)}>
        <i className="bi bi-grid-3x3-gap" aria-hidden="true" /> {t("Ver todas as fotos")}
      </button>

      {indiceAberto !== null && (
        <Lightbox midias={midias} indiceInicial={indiceAberto} aoFechar={() => setIndiceAberto(null)} />
      )}
    </div>
  );
}

MosaicoFotos.propTypes = {
  fotos: PropTypes.array.isRequired,
  rotulo: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default MosaicoFotos;
