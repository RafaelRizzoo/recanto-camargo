import { useState } from "react";
import { usePreferencias } from "../../hooks/usePreferencias";
import { pontosTuristicos } from "../../data/conteudoSite";

const CATEGORIAS = ["Todos", ...new Set(pontosTuristicos.map((p) => p.categoria))];

function ExploreAparecida() {
  const { t } = usePreferencias();
  const [categoria, setCategoria] = useState("Todos");
  const itens = pontosTuristicos.filter((p) => categoria === "Todos" || p.categoria === categoria);

  return (
    <section>
      <div className="rc-wrap">
        <div className="rc-rv">
          <span className="rc-eyebrow">{t("Explore Aparecida")}</span>
          <h2>{t("Perto de tudo que importa.")}</h2>
          <div className="rc-tabs" role="tablist" aria-label={t("Categorias")}>
            {CATEGORIAS.map((c) => (
              <button
                type="button"
                role="tab"
                key={c}
                className="rc-tab"
                aria-selected={categoria === c}
                onClick={() => setCategoria(c)}
              >
                {t(c)}
              </button>
            ))}
          </div>
        </div>

        <div className="rc-cards">
          {itens.map((p) => (
            <a key={p.id} href={p.linkMaps} target="_blank" rel="noopener noreferrer">
              <img src={p.imagem} alt={t(p.alt)} loading="lazy" decoding="async" width="400" height="267" />
              <div className="rc-cin">
                <span className="rc-cat">{t(p.categoria)}</span>
                <h3>{t(p.titulo)}</h3>
                <p style={{ color: "var(--rc-muted)", fontSize: ".92rem" }}>{t(p.descricao)}</p>
                <div className="rc-tm">
                  <span><i className="bi bi-clock" aria-hidden="true" /> {p.tempo}</span>
                  <span>{t("Ver rota")} <i className="bi bi-arrow-right-short" aria-hidden="true" /></span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ExploreAparecida;
