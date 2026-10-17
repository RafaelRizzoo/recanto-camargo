import { Link, useLocation } from "react-router-dom";
import "./footer.css";
import { contato, linksFooter } from "../data/conteudoSite";

const REDES = [
  { id: "instagram", label: "Instagram", href: contato.instagram, icone: "bi-instagram" },
  { id: "airbnb", label: "Airbnb", href: contato.airbnb, icone: "bi-airbnb" },
  { id: "google", label: "Avaliações no Google", href: contato.google, icone: "bi-google" },
];

function Footer() {
  const location = useLocation();

  const lidarCliqueLink = (destino) => {
    const atual = (location.pathname || "").toLowerCase();
    const dest = (destino || "").toLowerCase();

    const ehMesmaPagina =
      atual === dest ||
      (dest === "/" && (atual === "/" || atual === "" || window.location.hash === "#/" || window.location.hash === ""));

    if (ehMesmaPagina) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      const rootEl = document.getElementById("root");
      if (rootEl) rootEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="footer-recanto">
      <div className="footer-conteudo">
        <div className="footer-grade">
          <div>
            <p className="footer-marca fonte-logo">Recanto Camargo</p>
            <p className="footer-texto">
              Hospedagem familiar em Aparecida, a cerca de 5 minutos a pé da Basílica Nacional.
            </p>
          </div>

          <nav aria-label="Rodapé">
            <h2 className="footer-titulo">Navegação</h2>
            <ul className="footer-links">
              {linksFooter.map((link) => (
                <li key={link.id}>
                  <Link to={link.to} onClick={() => lidarCliqueLink(link.to)}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="footer-titulo">Contato</h2>
            <ul className="footer-links">
              <li>
                <a href={`https://wa.me/${contato.whatsapp}`} target="_blank" rel="noopener noreferrer">
                  <i className="bi bi-whatsapp" aria-hidden="true" /> {contato.telefone}
                </a>
              </li>
              <li>
                <span><i className="bi bi-geo-alt" aria-hidden="true" /> {contato.endereco}, {contato.cidade}</span>
              </li>
              {REDES.map((r) => (
                <li key={r.id}>
                  <a href={r.href} target="_blank" rel="noopener noreferrer">
                    <i className={`bi ${r.icone}`} aria-hidden="true" /> {r.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-legal">
          <span>© 2026 Recanto Camargo</span>
          <span>
            <Link to="/TermosDeUso">Termos de Uso</Link> · <Link to="/Privacidade">Privacidade (LGPD)</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
