import { useEffect } from "react";

// Fade-in discreto: o conteúdo só fica oculto quando o JS está ativo e há fallback por tempo.
export function useRevelar() {
  useEffect(() => {
    const raiz = document.documentElement;
    const elementos = [...document.querySelectorAll(".rc-rv")];
    const revelarTodos = () => elementos.forEach((el) => el.classList.add("rc-on"));

    if (!("IntersectionObserver" in window)) {
      revelarTodos();
      return undefined;
    }

    raiz.classList.add("rc-js");
    const observador = new IntersectionObserver(
      (entradas) =>
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("rc-on");
            observador.unobserve(e.target);
          }
        }),
      { threshold: 0.12 }
    );
    elementos.forEach((el) => observador.observe(el));
    const fallback = setTimeout(revelarTodos, 2500);

    return () => {
      observador.disconnect();
      clearTimeout(fallback);
      raiz.classList.remove("rc-js");
    };
  }, []);
}
