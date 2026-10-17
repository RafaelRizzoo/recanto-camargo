import { useEffect, useState } from "react";
import { linkWhats, irPara } from "./links";

const CAMPOS = ["INPUT", "SELECT", "TEXTAREA"];

// Barra fixa (apenas em telas pequenas via CSS). Some enquanto um campo está em foco,
// para não competir com o teclado nem cobrir formulários.
function BarraMobile() {
  const [oculta, setOculta] = useState(false);

  useEffect(() => {
    const aoFocar = (e) => CAMPOS.includes(e.target.tagName) && setOculta(true);
    const aoSair = () => setOculta(false);
    document.addEventListener("focusin", aoFocar);
    document.addEventListener("focusout", aoSair);
    return () => {
      document.removeEventListener("focusin", aoFocar);
      document.removeEventListener("focusout", aoSair);
    };
  }, []);

  return (
    <div className={`rc-mbar${oculta ? " rc-mbar-oculta" : ""}`} role="navigation" aria-label="Ações rápidas">
      <button type="button" className="rc-btn rc-btn-primary" onClick={() => irPara("reservar")}>Reservar</button>
      <a className="rc-btn rc-btn-line" href={linkWhats()} target="_blank" rel="noopener noreferrer">
        <i className="bi bi-whatsapp" aria-hidden="true" /> WhatsApp
      </a>
    </div>
  );
}

export default BarraMobile;
