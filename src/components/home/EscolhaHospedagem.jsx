import PropTypes from "prop-types";
import { unidades } from "../../data/conteudoSite";
import LinkAncora from "./LinkAncora";

function EscolhaHospedagem({ onVerGaleria, onVerDatas }) {
  return (
    <section id="hospedagens">
      <div className="rc-wrap">
        <div className="rc-rv">
          <span className="rc-eyebrow">Escolha sua hospedagem</span>
          <h2>Duas casas, o mesmo<br />jeito de receber.</h2>
        </div>

        <div className="rc-units">
          {unidades.map((u) => (
            <article className="rc-unit rc-rv" style={{ "--c": u.cor }} key={u.id}>
              <div className="rc-ph">
                <img src={u.foto} alt={u.alt} loading="lazy" decoding="async" />
                <span className="rc-badge"><i className="rc-dot" aria-hidden="true" />{u.selo}</span>
              </div>
              <div className="rc-body">
                <h3>{u.nome}</h3>
                <p style={{ color: "var(--rc-muted)" }}>{u.resumo}</p>
                <div className="rc-chips">
                  {u.destaques.map((d) => (
                    <span className="rc-chip" key={d.texto}><i className={`bi ${d.icone}`} aria-hidden="true" />{d.texto}</span>
                  ))}
                </div>
                <div className="rc-actions">
                  <LinkAncora
                    para="galeria"
                    className="rc-btn rc-btn-dark"
                    style={{ background: u.cor }}
                    onClick={() => onVerGaleria(u.id)}
                    aria-label={`Conhecer hospedagem ${u.nome}`}
                  >
                    Conhecer hospedagem
                  </LinkAncora>
                  <LinkAncora
                    para="reservar"
                    className="rc-btn rc-btn-line"
                    onClick={() => onVerDatas(u.id)}
                    aria-label={`Ver datas do ${u.nome}`}
                  >
                    Ver datas
                  </LinkAncora>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

EscolhaHospedagem.propTypes = {
  onVerGaleria: PropTypes.func.isRequired,
  onVerDatas: PropTypes.func.isRequired,
};

export default EscolhaHospedagem;
