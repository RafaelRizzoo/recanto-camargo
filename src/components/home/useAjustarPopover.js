import { useEffect } from "react";

// Ao abrir o calendário, rola a página só o necessário para ele caber na tela
// (sem esconder o campo atrás do cabeçalho fixo). No celular ele é um painel fixo e não precisa disso.
export function useAjustarPopover(aberto, ancoraRef) {
  useEffect(() => {
    if (!aberto || window.innerWidth <= 640) return undefined;
    const t = setTimeout(() => {
      const ancora = ancoraRef.current;
      const pop = ancora?.querySelector(".rc-pop");
      if (!pop) return;
      const folgaInferior = pop.getBoundingClientRect().bottom - (window.innerHeight - 16);
      const folgaSuperior = ancora.getBoundingClientRect().top - 96;
      const delta = Math.min(folgaInferior, folgaSuperior);
      if (delta > 0) window.scrollBy({ top: delta, behavior: "smooth" });
    }, 30);
    return () => clearTimeout(t);
  }, [aberto, ancoraRef]);
}
