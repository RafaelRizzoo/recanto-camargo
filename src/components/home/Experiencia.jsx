import { fotosExperiencia, numerosExperiencia } from "../../data/conteudoSite";

function Experiencia() {
  const [principal, secundaria] = fotosExperiencia;
  return (
    <section>
      <div className="rc-wrap rc-exp">
        <div className="rc-collage rc-rv">
          <img className="rc-a" src={principal.src} alt={principal.alt} loading="lazy" decoding="async" />
          <img className="rc-b" src={secundaria.src} alt={secundaria.alt} loading="lazy" decoding="async" />
        </div>
        <div className="rc-rv">
          <span className="rc-eyebrow">Experiência</span>
          <h2>Mais do que uma estadia, um lugar para se sentir em casa.</h2>
          <p className="rc-lead">
            Ambientes pensados para famílias e grupos de romeiros: espaço para todos, tudo à mão e uma anfitriã que
            recebe pessoalmente.
          </p>
          <div className="rc-stats">
            {numerosExperiencia.map((n) => (
              <div className="rc-stat" key={n.texto}>
                <b aria-hidden="true">{n.valor}</b>
                <span>{n.valor !== "+" && <span className="rc-sr">{n.valor} </span>}{n.texto}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Experiencia;
