import { EN } from "./en";

// O texto-fonte do site é o português: t("Sua casa em Aparecida.") devolve o mesmo texto em "pt"
// e a tradução cadastrada em en.js quando o idioma é inglês. Texto sem tradução cai no português
// (nunca aparece uma chave quebrada). Variáveis: t("{n} noites", { n: 2 }).
export function traduzir(idioma, texto, variaveis) {
  if (typeof texto !== "string") return texto;
  let resultado = idioma === "en" ? EN[texto] ?? texto : texto;
  if (variaveis) {
    resultado = resultado.replace(/\{(\w+)\}/g, (trecho, chave) => (variaveis[chave] ?? trecho));
  }
  return resultado;
}

export function detectarIdiomaInicial() {
  try {
    const salvo = window.localStorage.getItem("rc-idioma");
    if (salvo === "pt" || salvo === "en") return salvo;
  } catch {
    // armazenamento indisponível (modo privado): segue para a detecção
  }
  return typeof navigator !== "undefined" && /^en\b/i.test(navigator.language || "") ? "en" : "pt";
}

export function detectarTemaInicial() {
  try {
    const salvo = window.localStorage.getItem("rc-tema");
    if (salvo === "claro" || salvo === "escuro") return salvo;
  } catch {
    // armazenamento indisponível (modo privado): segue para a detecção
  }
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "escuro"
    : "claro";
}
