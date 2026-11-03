import { useContext } from "react";
import { PreferenciasContext } from "../context/ContextoPreferencias";

export function usePreferencias() {
  const contexto = useContext(PreferenciasContext);
  if (!contexto) throw new Error("usePreferencias deve ser usado dentro de ContextoPreferencias");
  return contexto;
}
