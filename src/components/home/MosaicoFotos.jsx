import { useState } from "react";
import PropTypes from "prop-types";
import Lightbox from "../UI/Lightbox";

// Mosaico (desktop) / carrossel com snap (mobile) com lightbox. Reutilizado na Home e na Reserva.
function MosaicoFotos({ fotos, rotulo, className = "" }) {
  const [indiceAberto, setIndiceAberto] = useState(null);
  const midias = fotos.map((f) => ({ ...f, categoria: rotulo }));

  return (
    <div className={`rc-gal-wrap ${className}`}>
      <div className="rc-gal" role="list">
        {fotos.map((f, i) => (
          <button
            type="button"
            role="listitem"
            key={`${rotulo}-${f.alt}`}
            onClick={() => setIndiceAberto(i)}
            aria-label={`Ampliar foto: ${f.alt}, ${rotulo}`}
          >
            <img src={f.src} alt={`${f.alt} do ${rotulo}`} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
            <span className="rc-cap">{f.alt} · {rotulo}</span>
          </button>
        ))}
      </div>
      <button type="button" className="rc-btn rc-btn-light rc-galmore" onClick={() => setIndiceAberto(0)}>
        <i className="bi bi-grid-3x3-gap" aria-hidden="true" /> Ver todas as fotos
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
