import PropTypes from "prop-types";
import { usePreferencias } from "../../hooks/usePreferencias";
import BuscaDisponibilidade from "./BuscaDisponibilidade";
import { linkWhats } from "./links";

function BlocoReserva({ consulta }) {
  const { t } = usePreferencias();
  return (
    <section id="reservar" style={{ paddingTop: 20 }}>
      <div className="rc-wrap">
        <div className="rc-book rc-rv">
          <span className="rc-eyebrow">{t("Reserva direta")}</span>
          <h2>{t("Sua próxima estadia começa aqui.")}</h2>
          <p className="rc-lead">{t("Escolha a unidade e as datas para consultar a disponibilidade. Sem intermediários.")}</p>
          <BuscaDisponibilidade origem="bloco" {...consulta} rotuloBotao={t("Consultar disponibilidade")} />
          <p className="rc-hero-note">
            <i className="bi bi-shield-check" aria-hidden="true" /> {t("Reserva direta segura")} ·{" "}
            <a className="rc-link-inline" href={linkWhats()} target="_blank" rel="noopener noreferrer">
              {t("prefere falar no WhatsApp?")}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

BlocoReserva.propTypes = {
  consulta: PropTypes.object.isRequired,
};

export default BlocoReserva;
