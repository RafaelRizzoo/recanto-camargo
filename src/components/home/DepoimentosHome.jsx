import { Link } from "react-router-dom";
import { usePreferencias } from "../../hooks/usePreferencias";
import { depoimentos, depoimentosDestaque } from "../../data/conteudoSite";
import { useAvaliacoesGoogle } from "../../hooks/useAvaliacoesGoogle";

function DepoimentosHome() {
  const { t, idioma } = usePreferencias();
  const { nota, total, erro, carregando } = useAvaliacoesGoogle();
  const destaques = depoimentosDestaque.map((id) => depoimentos.find((d) => d.id === id)).filter(Boolean);
  const notaGoogle = !carregando && !erro && nota != null && total;

  return (
    <section id="avaliacoes" style={{ paddingTop: 20 }}>
      <div className="rc-wrap">
        <div className="rc-rv">
          <span className="rc-eyebrow">{t("Avaliações")}</span>
          <h2>{t("Quem já se hospedou.")}</h2>
          {notaGoogle && (
            <span className="rc-rating">
              <i className="bi bi-star-fill" aria-hidden="true" />
              {nota.toLocaleString(idioma === "en" ? "en-US" : "pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} {t("no Google")} · {total} {t("avaliações")}
            </span>
          )}
        </div>

        <div className="rc-rev">
          {destaques.map((d) => (
            <figure className="rc-q rc-rv" key={d.id}>
              <span className="rc-stars" role="img" aria-label={t("{n} de 5 estrelas", { n: d.estrelas })}>
                {"★".repeat(d.estrelas)}
              </span>
              <blockquote style={{ margin: 0 }}>
                <p>“{d.texto}”</p>
              </blockquote>
              <figcaption className="rc-who"><b>{d.nome}</b>{t(d.local)}</figcaption>
            </figure>
          ))}
        </div>

        {idioma === "en" && <p className="rc-nota-original">{t("Depoimentos no idioma original dos hóspedes.")}</p>}
        <Link className="rc-btn rc-btn-line rc-more-link" to="/Avaliacoes">{t("Ver todas as avaliações")}</Link>
      </div>
    </section>
  );
}

export default DepoimentosHome;
