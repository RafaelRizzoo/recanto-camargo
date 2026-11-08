import { useEffect } from "react";

const ALTURA_CABECALHO = 96;

// Ao abrir o calendário, ajusta a posição para ele caber na tela, sem esconder o campo atrás do
// cabeçalho fixo. No hero a barra fica no pé da primeira tela: se há espaço acima dela o painel abre
// para cima; senão abre para baixo e a página rola o necessário. No celular o painel é fixo.
export function useAjustarPopover(aberto, ancoraRef) {
  useEffect(() => {
    if (!aberto || window.innerWidth <= 640) return undefined;
    const t = setTimeout(() => {
      const ancora = ancoraRef.current;
      const pop = ancora?.querySelector(".rc-pop");
      if (!pop) return;

      if (ancora.closest(".rc-hero")) {
        const espacoAcima = ancora.getBoundingClientRect().top - ALTURA_CABECALHO - 12;
        if (espacoAcima >= pop.offsetHeight) {
          pop.classList.add("rc-pop-cima");
          return;
        }
      }

      const folgaInferior = pop.getBoundingClientRect().bottom - (window.innerHeight - 16);
      const folgaSuperior = ancora.getBoundingClientRect().top - (ALTURA_CABECALHO);
      const delta = Math.min(folgaInferior, folgaSuperior);
      if (delta > 0) window.scrollBy({ top: delta, behavior: "smooth" });
    }, 30);
    return () => clearTimeout(t);
  }, [aberto, ancoraRef]);
}
