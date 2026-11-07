import { useEffect } from "react";
import PropTypes from "prop-types";
import { usePreferencias } from "../../hooks/usePreferencias";
import CalendarioCustom from "../UI/CalendarioCustom";
import "./SeletorDatas.css";

const paraData = (iso) => (iso ? new Date(`${iso}T12:00:00`) : null);

export function paraIso(data) {
  return new Date(data.getTime() - data.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

export function contarNoites(checkin, checkout) {
  if (!checkin || !checkout) return 0;
  return Math.max(0, Math.round((paraData(checkout) - paraData(checkin)) / 86400000));
}

// "7 de nov. – 9 de nov." (ou "Nov 7 – Nov 9" em inglês)
export function formatarPeriodo(checkin, checkout, idioma) {
  const loc = idioma === "en" ? "en-US" : "pt-BR";
  const f = (iso) => paraData(iso).toLocaleDateString(loc, { day: "numeric", month: "short" });
  if (checkin && checkout) return `${f(checkin)} – ${f(checkout)}`;
  if (checkin) return `${f(checkin)} – …`;
  return "";
}

// Conteúdo do painel de datas (estilo Airbnb): resumo no topo, calendário de dois meses e ações.
// 1º clique escolhe a entrada, 2º clique a saída.
function SeletorDatas({ imovelId, checkin, checkout, aoMudar, aoConcluir, aoFechar }) {
  const { t, idioma } = usePreferencias();
  const noites = contarNoites(checkin, checkout);

  // Enquanto o painel está aberto, a barra fixa do celular sai e o painel fica por cima de tudo.
  useEffect(() => {
    document.body.classList.add("rc-pop-aberto");
    return () => document.body.classList.remove("rc-pop-aberto");
  }, []);

  // Início e fim do dia, para o calendário marcar entrada e saída como pontas do período.
  const valor = checkin && checkout
    ? [new Date(`${checkin}T00:00:00`), new Date(`${checkout}T23:59:59.999`)]
    : (checkin ? new Date(`${checkin}T00:00:00`) : null);

  const aoEscolher = (intervalo) => {
    if (!Array.isArray(intervalo) || !intervalo[0]) return;
    if (!intervalo[1]) {
      aoMudar({ checkin: paraIso(intervalo[0]), checkout: "" });
      return;
    }
    const novo = { checkin: paraIso(intervalo[0]), checkout: paraIso(intervalo[1]) };
    if (novo.checkout <= novo.checkin) {
      aoMudar({ checkin: novo.checkin, checkout: "" });
      return;
    }
    aoMudar(novo);
    aoConcluir?.(novo);
  };

  let titulo;
  if (noites > 0) titulo = t(noites === 1 ? "{n} noite" : "{n} noites", { n: noites });
  else if (checkin) titulo = t("Selecione a data de saída");
  else titulo = t("Selecione a data de entrada");

  return (
    <div className="rc-datas">
      <div className="rc-datas-topo">
        <div>
          <strong className="rc-datas-titulo">{titulo}</strong>
          <span className="rc-datas-sub">
            {checkin ? formatarPeriodo(checkin, checkout, idioma) : t("Mínimo de 1 noite. Entrada às 14h, saída às 11h.")}
          </span>
        </div>
        <button type="button" className="rc-datas-x" onClick={aoFechar} aria-label={t("Fechar calendário")}>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>

      <CalendarioCustom duplo imovelId={imovelId} valor={valor} onChange={aoEscolher} />

      <div className="rc-datas-acoes">
        <button
          type="button"
          className="rc-datas-limpar"
          onClick={() => aoMudar({ checkin: "", checkout: "" })}
          disabled={!checkin}
        >
          {t("Limpar datas")}
        </button>
        <button type="button" className="rc-btn rc-btn-dark rc-datas-fechar" onClick={aoFechar}>
          {t("Fechar")}
        </button>
      </div>
    </div>
  );
}

SeletorDatas.propTypes = {
  imovelId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  checkin: PropTypes.string,
  checkout: PropTypes.string,
  aoMudar: PropTypes.func.isRequired,
  aoConcluir: PropTypes.func,
  aoFechar: PropTypes.func.isRequired,
};

export default SeletorDatas;
