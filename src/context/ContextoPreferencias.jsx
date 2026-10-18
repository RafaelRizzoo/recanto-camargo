import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { detectarIdiomaInicial, detectarTemaInicial, traduzir } from "../i18n";

export const PreferenciasContext = createContext(null);

// Guarda tema (claro/escuro) e idioma (pt/en) e lembra a escolha no navegador.
export function ContextoPreferencias({ children }) {
  const [tema, setTema] = useState(detectarTemaInicial);
  const [idioma, setIdioma] = useState(detectarIdiomaInicial);

  useEffect(() => {
    document.documentElement.lang = idioma === "en" ? "en" : "pt-BR";
    try {
      window.localStorage.setItem("rc-idioma", idioma);
    } catch {
      // sem armazenamento: a preferência vale só nesta visita
    }
  }, [idioma]);

  useEffect(() => {
    try {
      window.localStorage.setItem("rc-tema", tema);
    } catch {
      // sem armazenamento: a preferência vale só nesta visita
    }
  }, [tema]);

  const alternarTema = useCallback(() => setTema((t) => (t === "escuro" ? "claro" : "escuro")), []);
  const alternarIdioma = useCallback(() => setIdioma((i) => (i === "en" ? "pt" : "en")), []);
  const t = useCallback((texto, variaveis) => traduzir(idioma, texto, variaveis), [idioma]);

  const valor = useMemo(
    () => ({ tema, idioma, alternarTema, alternarIdioma, t }),
    [tema, idioma, alternarTema, alternarIdioma, t]
  );

  return <PreferenciasContext.Provider value={valor}>{children}</PreferenciasContext.Provider>;
}

ContextoPreferencias.propTypes = { children: PropTypes.node.isRequired };
