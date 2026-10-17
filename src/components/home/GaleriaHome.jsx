import { useState } from "react";
import PropTypes from "prop-types";
import Lightbox from "../UI/Lightbox";
import { galeriaPorUnidade, unidades } from "../../data/conteudoSite";

function GaleriaHome({ unidade, onMudarUnidade }) {
  const [indiceAberto, setIndiceAberto] = useState(null);
  const fotos = galeriaPorUnidade[unidade];
  const rotulo = unidades.find((u) => u.id === unidade)?.selo ?? "";
  const midias = fotos.map((f) => ({ ...f, categoria: rotulo }));

  return (
    <section id="galeria" style={{ paddingTop: 20 }}>
      <div className="rc-wrap">
        <div className="rc-rv">
          <span className="rc-eyebrow">Galeria</span>
          <h2>Cada cantinho,<br />como ele é.</h2>
          <div className="rc-tabs" role="tablist" aria-label="Unidade">
            {unidades.map((u) => (
              <button
                type="button"
                role="tab"
                key={u.id}
                className="rc-tab"
                aria-selected={unidade === u.id}
                onClick={() => onMudarUnidade(u.id)}
              >
                {u.selo}
              </button>
            ))}
          </div>
        </div>

        <div className="rc-gal-wrap rc-rv">
          <div className="rc-gal" role="list">
            {fotos.map((f, i) => (
              <button
                type="button"
                role="listitem"
                key={`${unidade}-${f.alt}`}
                onClick={() => setIndiceAberto(i)}
                aria-label={`Ampliar foto: ${f.alt}, ${rotulo}`}
              >
                <img src={f.src} alt={`${f.alt} do ${rotulo}`} loading="lazy" decoding="async" />
                <span className="rc-cap">{f.alt} · {rotulo}</span>
              </button>
            ))}
          </div>
          <button type="button" className="rc-btn rc-btn-light rc-galmore" onClick={() => setIndiceAberto(0)}>
            <i className="bi bi-grid-3x3-gap" aria-hidden="true" /> Ver todas as fotos
          </button>
        </div>
      </div>

      {indiceAberto !== null && (
        <Lightbox midias={midias} indiceInicial={indiceAberto} aoFechar={() => setIndiceAberto(null)} />
      )}
    </section>
  );
}

GaleriaHome.propTypes = {
  unidade: PropTypes.number.isRequired,
  onMudarUnidade: PropTypes.func.isRequired,
};

export default GaleriaHome;
