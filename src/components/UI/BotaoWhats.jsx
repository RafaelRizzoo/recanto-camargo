import "./BotaoWhats.css";
import { usePreferencias } from "../../hooks/usePreferencias";
import { contato } from "../../data/conteudoSite";

function BotaoWhats() {
  const { t } = usePreferencias();
  const linkWhats = `https://wa.me/${contato.whatsapp}?text=${encodeURIComponent(contato.mensagemPadrao)}`;

  return (
    <a
      href={linkWhats}
      className="btn-whats-flutuante"
      target="_blank"
      rel="noopener noreferrer"
      title={t("Fale conosco no WhatsApp")}
      aria-label={t("Fale conosco no WhatsApp")}
    >
      <i className="bi bi-whatsapp"></i>
    </a>
  );
}

export default BotaoWhats;
