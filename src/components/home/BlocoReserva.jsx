import PropTypes from "prop-types";
import BuscaDisponibilidade from "./BuscaDisponibilidade";
import { linkWhats } from "./links";

function BlocoReserva({ consulta }) {
  return (
    <section id="reservar" style={{ paddingTop: 20 }}>
      <div className="rc-wrap">
        <div className="rc-book rc-rv">
          <span className="rc-eyebrow">Reserva direta</span>
          <h2>Sua próxima estadia começa aqui.</h2>
          <p className="rc-lead">Escolha a unidade e as datas para consultar a disponibilidade. Sem intermediários.</p>
          <BuscaDisponibilidade origem="bloco" {...consulta} rotuloBotao="Consultar disponibilidade" />
          <p className="rc-hero-note">
            <i className="bi bi-shield-check" aria-hidden="true" /> Reserva direta segura ·{" "}
            <a className="rc-link-inline" href={linkWhats()} target="_blank" rel="noopener noreferrer">
              prefere falar no WhatsApp?
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
