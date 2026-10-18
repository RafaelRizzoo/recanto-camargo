import { fotoBasilica, mapaEmbedSrc, pontosTuristicos } from "../../data/conteudoSite";
import { usePreferencias } from "../../hooks/usePreferencias";

function LocalizacaoHome() {
  const { t } = usePreferencias();
  const basilica = pontosTuristicos.find((p) => p.id === "basilica");

  return (
    <section id="localizacao" style={{ padding: 0, margin: "20px 0" }}>
      <div className="rc-loc">
        <div className="rc-wrap rc-loc-grid">
          <div className="rc-rv">
            <span className="rc-eyebrow">{t("Localização privilegiada")}</span>
            <h2>{t("A poucos passos da sua experiência de fé.")}</h2>
            <div className="rc-route">
              <span className="rc-n">{t("Recanto Camargo")}</span>
              <span className="rc-t">
                <i className="bi bi-arrow-right" aria-hidden="true" /> {t("cerca de 5 min a pé")}{" "}
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </span>
              <span className="rc-n">{t("Basílica Nacional")}</span>
            </div>
            <p style={{ opacity: 0.85, maxWidth: "46ch", marginBottom: 26 }}>
              {t("Fique perto de tudo: Santuário, Passarela da Fé e comércio local, com a tranquilidade de uma casa de família.")}
            </p>
            <a className="rc-btn rc-btn-light" href={basilica.linkMaps} target="_blank" rel="noopener noreferrer">
              <i className="bi bi-signpost-2" aria-hidden="true" /> {t("Ver rota no Google Maps")}
            </a>
          </div>

          <div className="rc-map rc-rv">
            <iframe title={t("Localização do Recanto Camargo no mapa")} loading="lazy" src={mapaEmbedSrc} />
            <img className="rc-photo" src={fotoBasilica} alt={t("Basílica Nacional de Aparecida")} loading="lazy" decoding="async" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default LocalizacaoHome;
