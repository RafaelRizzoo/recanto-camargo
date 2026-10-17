import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import MenuUsuario from "../UI/MenuUsuario";
import { useAutenticacao } from "../../hooks/useAutenticacao";
import { linksNavegacaoHome } from "../../data/conteudoSite";
import LinkAncora from "./LinkAncora";
import { irPara } from "./links";

// Cabeçalho único do site. Na Home é transparente sobre o Hero e rola até as seções;
// nas demais páginas fica sólido e leva até a rota (ou volta à Home já na seção).
function HeaderSite({ emHome }) {
  const { autenticado } = useAutenticacao();
  const navigate = useNavigate();
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

  useEffect(() => setAberto(false), [emHome]);

  const ir = (link) => {
    setAberto(false);
    if (emHome) return irPara(link.id);
    if (link.rota) return navigate(link.rota);
    return navigate("/", { state: { ir: link.id } });
  };

  const solido = !emHome || rolado || aberto;

  return (
    <div className="rc-home rc-home-header">
      <header className={`rc-header${solido ? " rc-solid" : ""}${aberto ? " rc-aberto" : ""}`}>
        <div className="rc-wrap rc-bar">
          <button
            type="button"
            className="rc-brand"
            onClick={() => (emHome ? irPara("topo") : navigate("/"))}
            aria-label="Recanto Camargo, ir ao início"
          >
            Recanto Camargo
          </button>

          <nav className="rc-links" aria-label="Principal">
            {linksNavegacaoHome.map((l) => (
              <button type="button" key={l.id} onClick={() => ir(l)}>{l.label}</button>
            ))}
          </nav>

          <div className="rc-actions-h">
            {!autenticado && <Link className="rc-entrar" to="/Login">Entrar</Link>}
            {autenticado && <span className="rc-user-desktop"><MenuUsuario /></span>}
            {emHome ? (
              <LinkAncora para="reservar" className="rc-btn rc-btn-primary rc-hd">Reservar</LinkAncora>
            ) : (
              <Link to="/Reserva" className="rc-btn rc-btn-primary rc-hd">Reservar</Link>
            )}
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
            <button type="button" className="rc-drawer-item" key={l.id} onClick={() => ir(l)}>{l.label}</button>
          ))}
          {!emHome && <Link to="/Reserva" onClick={() => setAberto(false)}>Reservar</Link>}
          {!autenticado && <Link to="/Login" onClick={() => setAberto(false)}>Entrar</Link>}
          {autenticado && <div className="rc-user"><MenuUsuario /></div>}
        </div>
      </header>
    </div>
  );
}

HeaderSite.propTypes = {
  emHome: PropTypes.bool,
};

export default HeaderSite;
