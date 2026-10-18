import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, IS_API_AVAILABLE } from "../../utils/api";
import { MAX_HOSPEDES, unidades } from "../../data/conteudoSite";
import { formatarData, linkWhats } from "./links";

const ESTADO_INICIAL = { unidade: "1", checkin: "", checkout: "", hospedes: "" };

// Mantém a regra de consulta existente. Sem API (preview) ou sem suporte à unidade,
// nunca simula disponibilidade: oferece o WhatsApp.
export function useConsultaDisponibilidade() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState(ESTADO_INICIAL);
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const temporizador = useRef(null);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const atualizar = useCallback((parcial) => {
    setBusca((b) => ({ ...b, ...parcial }));
    setResultado(null);
  }, []);

  const consultar = useCallback(
    async (origem) => {
      const falha = (msg, vars) => setResultado({ tipo: "erro", msg, vars, origem });
      const { checkin, checkout, hospedes } = busca;

      if (!checkin || !checkout) return falha("Selecione as datas de entrada e saída.");
      if (!hospedes) return falha("Informe o número de hóspedes.");
      if (Number(hospedes) > MAX_HOSPEDES) return falha("O limite é de {max} hóspedes por unidade.", { max: MAX_HOSPEDES });
      if (new Date(`${checkout}T12:00:00`) <= new Date(`${checkin}T12:00:00`)) {
        return falha("A saída deve ser depois da entrada.");
      }

      const unidade = unidades.find((u) => String(u.id) === String(busca.unidade)) ?? unidades[0];
      const textoZap = `Olá! Gostaria de consultar o ${unidade.nome} de ${formatarData(checkin)} a ${formatarData(checkout)} para ${hospedes} hóspede${Number(hospedes) > 1 ? "s" : ""}.`;
      const whatsapp = linkWhats(textoZap);

      if (!unidade.consultaOnline) {
        return setResultado({
          tipo: "info",
          msg: "A consulta online ainda não está disponível para o {nome}.",
          vars: { nome: unidade.nome },
          whatsapp,
          origem,
        });
      }
      if (!IS_API_AVAILABLE) {
        return setResultado({
          tipo: "info",
          msg: "A consulta online não está ativa neste ambiente.",
          whatsapp,
          origem,
        });
      }

      setCarregando(true);
      try {
        const resposta = await fetch(`${API_BASE}/api/reservas/disponibilidade?checkin=${checkin}&checkout=${checkout}`);
        const dados = await resposta.json();
        if (!dados.disponivel) return falha("Período indisponível. Escolha outras datas.");

        const noites = Math.round(
          (new Date(`${checkout}T12:00:00`) - new Date(`${checkin}T12:00:00`)) / 86400000
        );
        setResultado({
          tipo: "ok",
          msg: noites > 1
            ? "Reserva de {n} noites disponível! Check-in: {ci} | Check-out: {co}"
            : "Reserva de {n} noite disponível! Check-in: {ci} | Check-out: {co}",
          vars: { n: noites, ci: formatarData(checkin), co: formatarData(checkout) },
          origem,
        });
        temporizador.current = setTimeout(() => {
          navigate(`/Reserva?checkin=${checkin}&checkout=${checkout}&hospedes=${hospedes}`);
        }, 2000);
      } catch (erro) {
        console.error(erro);
        falha("Erro ao consultar servidor.");
      } finally {
        setCarregando(false);
      }
    },
    [busca, navigate]
  );

  return { busca, atualizar, resultado, carregando, consultar };
}
