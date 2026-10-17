import { Link } from "react-router-dom";
import { depoimentos, depoimentosDestaque } from "../../data/conteudoSite";
import { useAvaliacoesGoogle } from "../../hooks/useAvaliacoesGoogle";

function DepoimentosHome() {
  const { nota, total, erro, carregando } = useAvaliacoesGoogle();
  const destaques = depoimentosDestaque.map((id) => depoimentos.find((d) => d.id === id)).filter(Boolean);
  const notaGoogle = !carregando && !erro && nota != null && total;

  return (
    <section id="avaliacoes" style={{ paddingTop: 20 }}>
      <div className="rc-wrap">
        <div className="rc-rv">
          <span className="rc-eyebrow">Avaliações</span>
          <h2>Quem já se hospedou.</h2>
          {notaGoogle && (
            <span className="rc-rating">
              <i className="bi bi-star-fill" aria-hidden="true" />
              {nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} no Google · {total} avaliações
            </span>
          )}
        </div>

        <div className="rc-rev">
          {destaques.map((d) => (
            <figure className="rc-q rc-rv" key={d.id}>
              <span className="rc-stars" role="img" aria-label={`${d.estrelas} de 5 estrelas`}>
                {"★".repeat(d.estrelas)}
              </span>
              <blockquote style={{ margin: 0 }}>
                <p>“{d.texto}”</p>
              </blockquote>
              <figcaption className="rc-who"><b>{d.nome}</b>{d.local}</figcaption>
            </figure>
          ))}
        </div>

        <Link className="rc-btn rc-btn-line rc-more-link" to="/Avaliacoes">Ver todas as avaliações</Link>
      </div>
    </section>
  );
}

export default DepoimentosHome;
