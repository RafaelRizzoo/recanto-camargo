import { comodidadesGrupos } from "../../data/conteudoSite";
import { usePreferencias } from "../../hooks/usePreferencias";

function ComodidadesHome() {
  const { t } = usePreferencias();
  return (
    <section style={{ paddingTop: 20 }}>
      <div className="rc-wrap">
        <div className="rc-rv">
          <span className="rc-eyebrow">{t("Comodidades")}</span>
          <h2>{t("Tudo o que você precisa.")}</h2>
        </div>
        <div className="rc-am rc-rv">
          {comodidadesGrupos.map((g) => (
            <div className="rc-g" key={g.id}>
              <h3>{t(g.titulo)}</h3>
              <ul>
                {g.itens.map((item) => (
                  <li key={item.texto}>
                    <i className={`bi ${item.icone}`} aria-hidden="true" />
                    {t(item.texto)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ComodidadesHome;
