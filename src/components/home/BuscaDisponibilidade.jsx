import { useEffect, useRef, useState } from "react";
import { usePreferencias } from "../../hooks/usePreferencias";
import PropTypes from "prop-types";
import { MAX_HOSPEDES, unidades } from "../../data/conteudoSite";
import ListaSelecao from "../UI/ListaSelecao";
import CampoQuando from "./CampoQuando";
import SeletorDatas from "./SeletorDatas";
import { useAjustarPopover } from "./useAjustarPopover";

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
  const { t } = usePreferencias();
  const [calAberto, setCalAberto] = useState(false);
  const raiz = useRef(null);
  const temporizador = useRef(null);
  useAjustarPopover(calAberto, raiz);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  useEffect(() => {
    if (!calAberto) return undefined;
    const fecharFora = (e) => {
      if (raiz.current && !raiz.current.contains(e.target)) setCalAberto(false);
    };
    const fecharEsc = (e) => e.key === "Escape" && setCalAberto(false);
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", fecharEsc);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", fecharEsc);
    };
  }, [calAberto]);

  const mensagem = resultado && resultado.origem === origem ? resultado : null;
  const opcoesUnidade = unidades.map((u) => ({ valor: String(u.id), texto: u.nome, cor: u.cor }));
  const opcoesHospedes = Array.from({ length: MAX_HOSPEDES }, (_, i) => ({
    valor: String(i + 1),
    texto: t(i ? "{n} hóspedes" : "{n} hóspede", { n: i + 1 }),
  }));

  return (
    <div className="rc-search-wrap" ref={raiz}>
      <form
        className="rc-search rc-search-quando"
        aria-label={t("Consultar disponibilidade")}
        onSubmit={(e) => {
          e.preventDefault();
          setCalAberto(false);
          consultar(origem);
        }}
      >
        <div className="rc-field">
          <ListaSelecao
            id={`${origem}-unidade`}
            rotulo={t("Unidade")}
            valor={String(busca.unidade)}
            opcoes={opcoesUnidade}
            aoMudar={(v) => atualizar({ unidade: v })}
          />
        </div>

        <CampoQuando
          id={`${origem}-quando`}
          checkin={busca.checkin}
          checkout={busca.checkout}
          aberto={calAberto}
          aoAbrir={() => setCalAberto(true)}
          aoFechar={() => setCalAberto(false)}
          aoLimpar={() => atualizar({ checkin: "", checkout: "" })}
        />

        <div className="rc-field">
          <ListaSelecao
            id={`${origem}-hospedes`}
            rotulo={t("Hóspedes")}
            valor={String(busca.hospedes || "")}
            opcoes={opcoesHospedes}
            placeholder={t("Quantos?")}
            aoMudar={(v) => atualizar({ hospedes: v })}
          />
        </div>

        <button type="submit" className={`rc-btn ${botaoClasse}`} disabled={carregando}>
          {carregando ? t("Consultando...") : rotuloBotao}
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
                {t(mensagem.msg, mensagem.vars)}{" "}
                {mensagem.whatsapp && (
                  <a href={mensagem.whatsapp} target="_blank" rel="noopener noreferrer">{t("Consultar pelo WhatsApp")}</a>
                )}
              </span>
            </>
          )}
        </div>
      </form>

      {calAberto && (
        <>
          <div className="rc-pop-backdrop" onClick={() => setCalAberto(false)} aria-hidden="true" />
          <div className="rc-pop rc-pop-datas" role="dialog" aria-label={t("Selecione as datas")}>
            <SeletorDatas
              imovelId={busca.unidade}
              checkin={busca.checkin}
              checkout={busca.checkout}
              aoMudar={(datas) => atualizar(datas)}
              aoConcluir={() => {
                clearTimeout(temporizador.current);
                temporizador.current = setTimeout(() => setCalAberto(false), 450);
              }}
              aoFechar={() => setCalAberto(false)}
            />
          </div>
        </>
      )}
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
