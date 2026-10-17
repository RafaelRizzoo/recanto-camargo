import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import CalendarioCustom from "../UI/CalendarioCustom";
import { MAX_HOSPEDES, unidades } from "../../data/conteudoSite";
import CampoData from "./CampoData";
import { useAjustarPopover } from "./useAjustarPopover";

function paraIso(data) {
  return new Date(data.getTime() - data.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

const CLASSE_MENSAGEM = { erro: "rc-err", info: "rc-warn", ok: "rc-ok" };
const ICONE_MENSAGEM = { erro: "bi-exclamation-circle", info: "bi-info-circle", ok: "bi-check-circle-fill" };

function BuscaDisponibilidade({
  origem,
  busca,
  atualizar,
  resultado,
  carregando,
  consultar,
  rotuloBotao = "Consultar",
  botaoClasse = "rc-btn-primary",
}) {
  const [calAberto, setCalAberto] = useState(null);
  const raiz = useRef(null);
  useAjustarPopover(Boolean(calAberto), raiz);

  useEffect(() => {
    if (!calAberto) return undefined;
    const fecharFora = (e) => {
      if (raiz.current && !raiz.current.contains(e.target)) setCalAberto(null);
    };
    const fecharEsc = (e) => e.key === "Escape" && setCalAberto(null);
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", fecharEsc);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", fecharEsc);
    };
  }, [calAberto]);

  const aoEscolherDatas = (intervalo) => {
    if (Array.isArray(intervalo) && intervalo[0] && intervalo[1]) {
      atualizar({ checkin: paraIso(intervalo[0]), checkout: paraIso(intervalo[1]) });
      setCalAberto(null);
    }
  };

  const popover = (
    <>
      <div className="rc-pop-backdrop" onClick={() => setCalAberto(null)} aria-hidden="true" />
      <div className="rc-pop" role="dialog" aria-label="Selecione as datas">
        <div className="rc-pop-head">
          <span>Selecione as datas</span>
          <button type="button" onClick={() => setCalAberto(null)} aria-label="Fechar calendário">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
        <CalendarioCustom
          valor={
            busca.checkin && busca.checkout
              ? [new Date(`${busca.checkin}T12:00:00`), new Date(`${busca.checkout}T12:00:00`)]
              : null
          }
          onChange={aoEscolherDatas}
        />
      </div>
    </>
  );

  const mensagem = resultado && resultado.origem === origem ? resultado : null;
  const idUnidade = `${origem}-unidade`;
  const idHospedes = `${origem}-hospedes`;

  return (
    <div className="rc-search-wrap" ref={raiz}>
      <form
        className="rc-search"
        aria-label="Consultar disponibilidade"
        onSubmit={(e) => {
          e.preventDefault();
          consultar(origem);
        }}
      >
        <div className="rc-field">
          <label htmlFor={idUnidade}>Unidade</label>
          <select id={idUnidade} value={busca.unidade} onChange={(e) => atualizar({ unidade: e.target.value })}>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
        </div>

        <CampoData
          id={`${origem}-checkin`}
          rotulo="Check-in"
          valor={busca.checkin}
          aberto={calAberto === "checkin"}
          onAbrir={() => setCalAberto("checkin")}
          onFechar={() => setCalAberto(null)}
        >
          {calAberto === "checkin" && popover}
        </CampoData>

        <CampoData
          id={`${origem}-checkout`}
          rotulo="Check-out"
          valor={busca.checkout}
          aberto={calAberto === "checkout"}
          onAbrir={() => setCalAberto("checkout")}
          onFechar={() => setCalAberto(null)}
        >
          {calAberto === "checkout" && popover}
        </CampoData>

        <div className="rc-field">
          <label htmlFor={idHospedes}>Hóspedes</label>
          <select id={idHospedes} value={busca.hospedes} onChange={(e) => atualizar({ hospedes: e.target.value })}>
            <option value="">Quantos?</option>
            {Array.from({ length: MAX_HOSPEDES }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1} hóspede{i ? "s" : ""}</option>
            ))}
          </select>
        </div>

        <button type="submit" className={`rc-btn ${botaoClasse}`} disabled={carregando}>
          {carregando ? "Consultando..." : rotuloBotao}
        </button>

        <div
          className={`rc-search-msg${mensagem ? ` rc-show ${CLASSE_MENSAGEM[mensagem.tipo]}` : ""}`}
          role="status"
          aria-live="polite"
        >
          {mensagem && (
            <>
              <i className={`bi ${ICONE_MENSAGEM[mensagem.tipo]}`} aria-hidden="true" />
              <span>
                {mensagem.msg}{" "}
                {mensagem.whatsapp && (
                  <a href={mensagem.whatsapp} target="_blank" rel="noopener noreferrer">Consultar pelo WhatsApp</a>
                )}
              </span>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

BuscaDisponibilidade.propTypes = {
  origem: PropTypes.string.isRequired,
  busca: PropTypes.object.isRequired,
  atualizar: PropTypes.func.isRequired,
  resultado: PropTypes.object,
  carregando: PropTypes.bool,
  consultar: PropTypes.func.isRequired,
  rotuloBotao: PropTypes.string,
  botaoClasse: PropTypes.string,
};

export default BuscaDisponibilidade;
