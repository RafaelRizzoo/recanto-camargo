import PropTypes from "prop-types";
import { usePreferencias } from "../../hooks/usePreferencias";
import { fotosHero } from "../../data/conteudoSite";
import BuscaDisponibilidade from "./BuscaDisponibilidade";
import LinkAncora from "./LinkAncora";

function HeroHome({ consulta }) {
  const { t } = usePreferencias();
  return (
    <div id="topo" className="rc-hero">
      <div className="rc-hero-img">
        <img src={fotosHero.src} alt={t(fotosHero.alt)} fetchpriority="high" decoding="async" />
        <div className="rc-hero-copy">
          <h1>{t("Sua casa em Aparecida.")}</h1>
          <p className="rc-sub">{t("Conforto para toda a família a poucos minutos da Basílica Nacional.")}</p>
          <div className="rc-hero-cta">
            <LinkAncora para="reservar" className="rc-btn rc-btn-primary">{t("Consultar disponibilidade")}</LinkAncora>
            <LinkAncora para="hospedagens" className="rc-btn rc-btn-ghost">{t("Conhecer as hospedagens")}</LinkAncora>
          </div>
          <span className="rc-pin">
            <i className="bi bi-geo-alt-fill" aria-hidden="true" /> {t("Aparecida, SP • A cerca de 5 minutos da Basílica")}
          </span>
        </div>
      </div>
      <BuscaDisponibilidade origem="hero" {...consulta} rotuloBotao={t("Consultar")} />
    </div>
  );
}

HeroHome.propTypes = {
  consulta: PropTypes.object.isRequired,
};

export default HeroHome;
