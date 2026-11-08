import { useEffect, useState } from "react";
import { galeriaExperiencia, numerosExperiencia } from "../../data/conteudoSite";
import { usePreferencias } from "../../hooks/usePreferencias";

const INTERVALO_MS = 4500;

function Experiencia() {
  const { t } = usePreferencias();
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = galeriaExperiencia.length;

  useEffect(() => {
    if (pausado) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = setInterval(() => setIndice((i) => (i + 1) % total), INTERVALO_MS);
    return () => clearInterval(id);
  }, [pausado, total]);

  const legenda = (f) => `${t(f.alt)} · ${f.unidade}`;

  return (
    <section className="rc-faixa rc-faixa-azul">
      <div className="rc-wrap rc-exp">
        <div
          className="rc-galexp rc-rv"
          role="group"
          aria-roledescription="carrossel"
          aria-label={t("Fotos das duas unidades")}
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
          onFocus={() => setPausado(true)}
          onBlur={() => setPausado(false)}
        >
          {galeriaExperiencia.map((f, k) => (
            <img
              key={f.src}
              src={f.src}
              alt={k === indice ? legenda(f) : ""}
              aria-hidden={k === indice ? undefined : "true"}
              className={k === indice ? "rc-galexp-ativa" : undefined}
              loading={k === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          ))}
          <div className="rc-galexp-sombra" aria-hidden="true" />
          <div className="rc-galexp-base">
            <span className="rc-galexp-legenda" aria-live="polite">{legenda(galeriaExperiencia[indice])}</span>
            <div className="rc-galexp-pontos">
              {galeriaExperiencia.map((f, k) => (
                <button
                  type="button"
                  key={f.src}
                  className={k === indice ? "rc-galexp-ponto rc-on" : "rc-galexp-ponto"}
                  aria-label={t("Ver foto {n}", { n: k + 1 })}
                  aria-current={k === indice ? "true" : undefined}
                  onClick={() => setIndice(k)}
                />
              ))}
            </div>
          </div>
          <div className="rc-galexp-setas">
            <button type="button" aria-label={t("Foto anterior")} onClick={() => setIndice((i) => (i + total - 1) % total)}>
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>
            <button type="button" aria-label={t("Próxima foto")} onClick={() => setIndice((i) => (i + 1) % total)}>
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </div>
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
