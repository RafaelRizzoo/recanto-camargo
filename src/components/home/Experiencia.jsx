import { fotosExperiencia, numerosExperiencia } from "../../data/conteudoSite";
import { usePreferencias } from "../../hooks/usePreferencias";

function Experiencia() {
  const { t } = usePreferencias();
  const [principal, secundaria] = fotosExperiencia;
  return (
    <section>
      <div className="rc-wrap rc-exp">
        <div className="rc-collage rc-rv">
          <img className="rc-a" src={principal.src} alt={t(principal.alt)} loading="lazy" decoding="async" />
          <img className="rc-b" src={secundaria.src} alt={t(secundaria.alt)} loading="lazy" decoding="async" />
        </div>
        <div className="rc-rv">
          <span className="rc-eyebrow">{t("Experiência")}</span>
          <h2>{t("Mais do que uma estadia, um lugar para se sentir em casa.")}</h2>
          <p className="rc-lead">
            {t("Ambientes pensados para famílias e grupos de romeiros: espaço para todos, tudo à mão e uma anfitriã que recebe pessoalmente.")}
          </p>
          <div className="rc-stats">
            {numerosExperiencia.map((n) => (
              <div className="rc-stat" key={n.texto}>
                <b aria-hidden="true">{n.valor}</b>
                <span>{n.valor !== "+" && <span className="rc-sr">{n.valor} </span>}{t(n.texto)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Experiencia;
