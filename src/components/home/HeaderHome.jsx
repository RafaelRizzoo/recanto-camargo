import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MenuUsuario from "../UI/MenuUsuario";
import { useAutenticacao } from "../../hooks/useAutenticacao";
import { linksNavegacaoHome } from "../../data/conteudoSite";
import LinkAncora from "./LinkAncora";
import { irPara } from "./links";

function HeaderHome() {
  const { autenticado } = useAutenticacao();
  const [rolado, setRolado] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolado(window.scrollY > 40);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  useEffect(() => {
    if (!aberto) return undefined;
    const aoTeclar = (e) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  const ir = (id) => {
    setAberto(false);
    irPara(id);
  };

  return (
    <header className={`rc-header${rolado || aberto ? " rc-solid" : ""}${aberto ? " rc-aberto" : ""}`}>
      <div className="rc-wrap rc-bar">
        <button type="button" className="rc-brand" onClick={() => ir("topo")} aria-label="Recanto Camargo, voltar ao início">
          Recanto Camargo
        </button>

        <nav className="rc-links" aria-label="Principal">
          {linksNavegacaoHome.map((l) => (
            <button type="button" key={l.id} onClick={() => ir(l.id)}>{l.label}</button>
          ))}
        </nav>

        <div className="rc-actions-h">
          {!autenticado && <Link className="rc-entrar" to="/Login">Entrar</Link>}
          {autenticado && <span className="rc-user-desktop"><MenuUsuario /></span>}
          <LinkAncora para="reservar" className="rc-btn rc-btn-primary rc-hd">Reservar</LinkAncora>
          <button
            type="button"
            className="rc-burger"
            aria-label={aberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={aberto}
            aria-controls="rc-menu-mobile"
            onClick={() => setAberto((v) => !v)}
          >
            <i className={`bi ${aberto ? "bi-x-lg" : "bi-list"}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div id="rc-menu-mobile" className={`rc-drawer${aberto ? " rc-open" : ""}`}>
        {linksNavegacaoHome.map((l) => (
          <button type="button" className="rc-drawer-item" key={l.id} onClick={() => ir(l.id)}>{l.label}</button>
        ))}
        {!autenticado && <Link to="/Login" onClick={() => setAberto(false)}>Entrar</Link>}
        {autenticado && <div className="rc-user"><MenuUsuario /></div>}
      </div>
    </header>
  );
}

export default HeaderHome;
