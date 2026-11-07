import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { usePreferencias } from "../../hooks/usePreferencias";
import { linkWhats, irPara } from "./links";

const CAMPOS = ["INPUT", "SELECT", "TEXTAREA"];

// Barra fixa de "Reservar" + WhatsApp (só aparece em telas pequenas, via CSS).
// Some enquanto um campo está em foco, para não competir com o teclado, e também
// enquanto o elemento de `esconderQuandoVisivel` estiver na tela (ex.: o próprio card de reserva).
function BarraMobile({ aoReservar, rotuloReservar, esconderQuandoVisivel }) {
  const { t } = usePreferencias();
  const [campoEmFoco, setCampoEmFoco] = useState(false);
  const [alvoVisivel, setAlvoVisivel] = useState(false);

  useEffect(() => {
    const aoFocar = (e) => CAMPOS.includes(e.target.tagName) && setCampoEmFoco(true);
    const aoSair = () => setCampoEmFoco(false);
    document.addEventListener("focusin", aoFocar);
    document.addEventListener("focusout", aoSair);
    document.body.classList.add("rc-mbar-ativa");
    return () => {
      document.removeEventListener("focusin", aoFocar);
      document.removeEventListener("focusout", aoSair);
      document.body.classList.remove("rc-mbar-ativa");
    };
  }, []);

  useEffect(() => {
    if (!esconderQuandoVisivel || typeof IntersectionObserver === "undefined") return undefined;
    let observador;
    let tentativas = 0;
    // O alvo pode ainda não existir no primeiro render (conteúdo carregado depois).
    const iniciar = () => {
      const alvo = document.querySelector(esconderQuandoVisivel);
      if (!alvo) {
        if (tentativas++ < 20) temporizador = setTimeout(iniciar, 250);
        return;
      }
      observador = new IntersectionObserver(([entrada]) => setAlvoVisivel(entrada.isIntersecting), { threshold: 0.15 });
      observador.observe(alvo);
    };
    let temporizador = setTimeout(iniciar, 0);
    return () => {
      clearTimeout(temporizador);
      observador?.disconnect();
    };
  }, [esconderQuandoVisivel]);

  const oculta = campoEmFoco || alvoVisivel;

  return (
    <div className={`rc-mbar${oculta ? " rc-mbar-oculta" : ""}`} role="navigation" aria-label={t("Ações rápidas")} aria-hidden={oculta || undefined}>
      <button type="button" className="rc-btn rc-btn-primary" onClick={aoReservar || (() => irPara("reservar"))} tabIndex={oculta ? -1 : undefined}>
        {t(rotuloReservar || "Reservar")}
      </button>
      <a className="rc-btn rc-btn-line" href={linkWhats()} target="_blank" rel="noopener noreferrer" tabIndex={oculta ? -1 : undefined}>
        <i className="bi bi-whatsapp" aria-hidden="true" /> WhatsApp
      </a>
    </div>
  );
}

BarraMobile.propTypes = {
  aoReservar: PropTypes.func,
  rotuloReservar: PropTypes.string,
  esconderQuandoVisivel: PropTypes.string,
};

export default BarraMobile;
