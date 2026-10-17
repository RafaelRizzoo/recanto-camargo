import "./BotaoWhats.css";
import { contato } from "../../data/conteudoSite";

function BotaoWhats() {
  const linkWhats = `https://wa.me/${contato.whatsapp}?text=${encodeURIComponent(contato.mensagemPadrao)}`;

  return (
    <a
      href={linkWhats}
      className="btn-whats-flutuante"
      target="_blank"
      rel="noopener noreferrer"
      title="Fale conosco no WhatsApp"
      aria-label="Fale conosco no WhatsApp"
    >
      <i className="bi bi-whatsapp"></i>
    </a>
  );
}

export default BotaoWhats;
