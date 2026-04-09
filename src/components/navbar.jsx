import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import Botao from "./UI/Botao";
import logoPng from "../assets/img/artes/santa.png";
import "./navbar.css";

function IconeHome() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconeFoto() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconeLogin() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function IconeEstrela() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconeReserva() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}

function IconeMenu() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

const linksNavegacao = [
  { to: "/", label: "Início", icone: <IconeHome /> },
  { to: "/Fotos", label: "Fotos e Vídeos", icone: <IconeFoto /> },
  { to: "/Avaliacoes", label: "Avaliações", icone: <IconeEstrela /> },
  { to: "/Login", label: "Login", icone: <IconeLogin /> },
];

function ItemNavegacao({ to, label, icone, onClick }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link-moderna ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      <span className="nav-icon">{icone}</span>
      <span>{label}</span>
    </NavLink>
  );
}

function BarraDesktop() {
  return (
    <nav className="navbar-moderna navbar-topo" aria-label="Navegação principal">
      <div className="navbar-shell">
        <NavLink to="/" className="navbar-brand-moderna">
          <img src={logoPng} alt="Recanto Camargo" className="navbar-logo" />
          <span className="brand-text">RECANTO CAMARGO</span>
        </NavLink>

        <div className="navbar-conteudo">
          <div className="navbar-links-list">
            {linksNavegacao.map((link) => (
              <ItemNavegacao
                key={link.to}
                to={link.to}
                label={link.label}
                icone={link.icone}
              />
            ))}
          </div>

          <NavLink to="/Reserva" className="navbar-reserva-link">
            <Botao
              tipo="button"
              variante="warning"
              efeitoOnda={false}
              className="btn-inline navbar-botao-reserva"
            >
              <span className="nav-icon">
                <IconeReserva />
              </span>
              <span>Reservar</span>
            </Botao>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

function BarraMobile({ aberto, onToggle, onNavigate }) {
  return (
    <nav className="navbar-moderna navbar-mobile" aria-label="Navegação principal">
      <div className="navbar-shell">
        <div className="navbar-header">
          <NavLink to="/" className="navbar-brand-moderna">
            <img src={logoPng} alt="Recanto Camargo" className="navbar-logo" />
            <span className="brand-text">RECANTO CAMARGO</span>
          </NavLink>

          <button
            type="button"
            className="navbar-toggle"
            aria-label={aberto ? "Recolher menu" : "Expandir menu"}
            aria-expanded={aberto}
            onClick={onToggle}
          >
            <IconeMenu />
          </button>
        </div>

        <div className={`navbar-conteudo-mobile ${aberto ? "is-open" : ""}`}>
          <div className="navbar-links-list">
            {linksNavegacao.map((link) => (
              <ItemNavegacao
                key={link.to}
                to={link.to}
                label={link.label}
                icone={link.icone}
                onClick={onNavigate}
              />
            ))}
          </div>

          <NavLink to="/Reserva" className="navbar-reserva-link">
            <Botao
              tipo="button"
              variante="warning"
              efeitoOnda={false}
              className="btn-inline navbar-botao-reserva"
            >
              <span className="nav-icon">
                <IconeReserva />
              </span>
              <span>Reservar</span>
            </Botao>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

function Menu() {
  const [ehDesktop, setEhDesktop] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.innerWidth >= 992;
  });
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  useEffect(() => {
    const atualizarLayout = () => {
      const desktop = window.innerWidth >= 992;
      setEhDesktop(desktop);

      if (desktop) {
        setMenuMobileAberto(false);
      }
    };

    atualizarLayout();
    window.addEventListener("resize", atualizarLayout);

    return () => {
      window.removeEventListener("resize", atualizarLayout);
    };
  }, []);

  if (ehDesktop) {
    return <BarraDesktop />;
  }

  return (
    <BarraMobile
      aberto={menuMobileAberto}
      onToggle={() => setMenuMobileAberto((estadoAnterior) => !estadoAnterior)}
      onNavigate={() => setMenuMobileAberto(false)}
    />
  );
}

export default Menu;
