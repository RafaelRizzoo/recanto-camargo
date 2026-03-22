import "./BotaoWhats.css";

function BotaoWhats() {
  // Substitua pelo número real do Recanto Camargo (DDI + DDD + Número)
  const linkWhats =
    "https://wa.me/5512996297452?text=Olá! Gostaria de saber mais sobre a disponibilidade do Recanto Camargo.";

  return (
    <a
      href={linkWhats}
      className="btn-whats-flutuante"
      target="_blank"
      rel="noopener noreferrer"
      title="Fale conosco no WhatsApp"
    >
      <i className="bi bi-whatsapp"></i>
    </a>
  );
}

export default BotaoWhats;
