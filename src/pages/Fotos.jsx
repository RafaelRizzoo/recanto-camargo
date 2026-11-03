import { useMemo, useState } from "react";
import { usePreferencias } from '../hooks/usePreferencias';
import Lightbox from "../components/UI/Lightbox";
import { galeriaPorUnidade, midiasGaleria, unidades } from "../data/conteudoSite";
import "../components/home/home.css";
import "./Fotos.css";

const VIDEOS = midiasGaleria.filter((m) => m.ehVideo);

function Fotos() {
  const { t } = usePreferencias();
  const [unidade, setUnidade] = useState(1);
  const [categoria, setCategoria] = useState("Todos");
  const [indiceAberto, setIndiceAberto] = useState(null);

  const selo = unidades.find((u) => u.id === unidade)?.selo ?? "";
  const fotos = galeriaPorUnidade[unidade];

  const categorias = useMemo(
    () => ["Todos", ...new Set(fotos.map((f) => f.categoria)), "Vídeos"],
    [fotos]
  );

  const itens = useMemo(() => {
    const doRecanto = fotos.map((f) => ({ ...f, categoria: f.categoria, selo }));
    const videos = VIDEOS.map((v) => ({ ...v, categoria: "Vídeos", selo: "Vídeo" }));
    if (categoria === "Todos") return [...doRecanto, ...videos];
    if (categoria === "Vídeos") return videos;
    return doRecanto.filter((f) => f.categoria === categoria);
  }, [fotos, categoria, selo]);

  const midiasLightbox = itens.map((i) =>
    i.ehVideo ? { ...i, alt: t(i.alt), categoria: t(i.categoria) } : { src: i.src, alt: `${t(i.alt)} · ${i.selo}`, categoria: t(i.categoria) }
  );

  const mudarUnidade = (id) => {
    setUnidade(id);
    setCategoria("Todos");
  };

  return (
    <div className="rc-home rc-fotos">
      <div className="rc-wrap">
        <div className="rc-fotos-head">
          <span className="rc-eyebrow">{t("Álbum do Recanto")}</span>
          <h1>{t("Cada cantinho do seu conforto")}</h1>
          <p className="rc-lead">
            {t("Fotos reais das duas unidades. Escolha a hospedagem e explore os ambientes antes de reservar.")}
          </p>
        </div>

        <div className="rc-tabs" role="tablist" aria-label={t("Unidade")}>
          {unidades.map((u) => (
            <button
              type="button"
              role="tab"
              key={u.id}
              className="rc-tab"
              aria-selected={unidade === u.id}
              onClick={() => mudarUnidade(u.id)}
            >
              <i className="rc-dot" style={{ "--c": u.cor }} aria-hidden="true" /> {u.nome}
            </button>
          ))}
        </div>

        <div className="rc-chips-filtro" role="group" aria-label={t("Filtrar por ambiente")}>
          {categorias.map((c) => (
            <button
              type="button"
              key={c}
              className="rc-filtro"
              aria-pressed={categoria === c}
              onClick={() => setCategoria(c)}
            >
              {t(c)}
            </button>
          ))}
        </div>

        <p className="rc-contagem" aria-live="polite">
          {itens.length} {t(categoria === "Vídeos" ? (itens.length === 1 ? "vídeo" : "vídeos") : itens.length === 1 ? "item" : "itens")}
          {categoria !== "Vídeos" && ` · ${selo}`}
        </p>

        <ul className="rc-fgrid">
          {itens.map((item, i) => (
            <li key={`${unidade}-${item.id ?? item.alt}`}>
              <button
                type="button"
                className="rc-fitem"
                onClick={() => setIndiceAberto(i)}
                aria-label={item.ehVideo ? t("Assistir vídeo: {alt}", { alt: t(item.alt) }) : t("Ampliar foto: {alt}, {rotulo}", { alt: t(item.alt), rotulo: item.selo })}
              >
                <img
                  src={item.ehVideo ? `https://img.youtube.com/vi/${item.youtubeId}/${item.ehShort ? "sddefault" : "hqdefault"}.jpg` : item.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                {item.ehVideo && <i className="bi bi-play-circle-fill rc-play" aria-hidden="true" />}
                <span className="rc-cap">{item.ehVideo ? t("Vídeo") : `${t(item.alt)} · ${item.selo}`}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {indiceAberto !== null && (
        <Lightbox midias={midiasLightbox} indiceInicial={indiceAberto} aoFechar={() => setIndiceAberto(null)} />
      )}
    </div>
  );
}

export default Fotos;
