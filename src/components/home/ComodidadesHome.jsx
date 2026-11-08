import { comodidadesGrupos, destaquesComodidades } from "../../data/conteudoSite";
import { usePreferencias } from "../../hooks/usePreferencias";

function ComodidadesHome() {
  const { t } = usePreferencias();
  return (
    <section className="rc-faixa rc-faixa-suave">
      <div className="rc-wrap">
        <div className="rc-rv">
          <span className="rc-eyebrow">{t("Comodidades")}</span>
          <h2>{t("Tudo o que você precisa.")}</h2>
        </div>
        <ul className="rc-am-destaques rc-rv">
          {destaquesComodidades.map((d) => (
            <li key={d.texto}>
              <i className={`bi ${d.icone}`} aria-hidden="true" />
              {t(d.texto)}
            </li>
          ))}
        </ul>
        <div className="rc-am rc-am-home rc-rv">
          {comodidadesGrupos.map((g) => (
            <div className={`rc-g rc-g-${g.id}`} key={g.id}>
              <h3>
                <i className={`bi ${g.icone} rc-g-icone`} aria-hidden="true" />
                {t(g.titulo)}
              </h3>
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
        <p className="rc-am-nota rc-rv">
          <i className="bi bi-droplet-half" aria-hidden="true" />
          {t("Recanto 1: 1 banheiro · Recanto 2: 2 banheiros com chuveiro e 2 lavabos")}
        </p>
      </div>
    </section>
  );
}

export default ComodidadesHome;
