import PropTypes from "prop-types";
import { usePreferencias } from "../../hooks/usePreferencias";
import MosaicoFotos from "./MosaicoFotos";
import { galeriaPorUnidade, unidades } from "../../data/conteudoSite";

function GaleriaHome({ unidade, onMudarUnidade }) {
  const { t } = usePreferencias();
  const rotulo = unidades.find((u) => u.id === unidade)?.selo ?? "";

  return (
    <section id="galeria" style={{ paddingTop: 20 }}>
      <div className="rc-wrap">
        <div className="rc-rv">
          <span className="rc-eyebrow">{t("Galeria")}</span>
          <h2>{t("Cada cantinho, como ele é.")}</h2>
          <div className="rc-tabs" role="tablist" aria-label={t("Unidade")}>
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

        <MosaicoFotos className="rc-rv" fotos={galeriaPorUnidade[unidade]} rotulo={rotulo} />
      </div>
    </section>
  );
}

GaleriaHome.propTypes = {
  unidade: PropTypes.number.isRequired,
  onMudarUnidade: PropTypes.func.isRequired,
};

export default GaleriaHome;
