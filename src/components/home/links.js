import { contato } from "../../data/conteudoSite";

export function linkWhats(texto = contato.mensagemPadrao) {
  return `https://wa.me/${contato.whatsapp}?text=${encodeURIComponent(texto)}`;
}

export function irPara(id) {
  const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const comportamento = reduzir ? "auto" : "smooth";
  if (id === "topo") {
    window.scrollTo({ top: 0, behavior: comportamento });
    return;
  }
  document.getElementById(id)?.scrollIntoView({ behavior: comportamento, block: "start" });
}

export function formatarData(iso) {
  return iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "";
}
