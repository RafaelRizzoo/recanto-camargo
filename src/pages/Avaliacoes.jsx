import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { depoimentos } from '../data/conteudoSite';
import { API_BASE, IS_API_AVAILABLE } from '../utils/api';
import { useAvaliacoesGoogle } from '../hooks/useAvaliacoesGoogle';
import '../components/home/home.css';
import './Avaliacoes.css';

const CRITERIOS = [
  { chave: 'limpeza', rotulo: 'Limpeza', icone: 'bi-stars' },
  { chave: 'comunicacao', rotulo: 'Comunicação', icone: 'bi-chat-dots' },
  { chave: 'localizacao', rotulo: 'Localização', icone: 'bi-geo-alt' },
  { chave: 'custoBeneficio', rotulo: 'Custo-benefício', icone: 'bi-tag' },
];

function formatarData(data) {
  if (!data) return '';
  const [ano, mes, dia] = String(data).slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
}

function formatarNota(valor, casas = 1) {
  return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: 2 });
}

function Estrelas({ nota }) {
  const valor = Math.min(5, Math.max(0, Number(nota) || 0));

  return (
    <span className="rc-av-estrelas" role="img" aria-label={`${formatarNota(valor)} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map(posicao => {
        const classe = valor >= posicao ? 'bi-star-fill' : valor >= posicao - 0.5 ? 'bi-star-half' : 'bi-star';
        return <i key={posicao} className={`bi ${classe}`} aria-hidden="true" />;
      })}
    </span>
  );
}

Estrelas.propTypes = { nota: PropTypes.oneOfType([PropTypes.number, PropTypes.string]) };

function CardAvaliacao({ item }) {
  const [expandido, setExpandido] = useState(false);
  const resposta = item.respostaProprietario;
  const doSite = Boolean(item.doSite);

  const nomeCompleto = item.hospede?.nome || 'Hóspede';
  const partesNome = nomeCompleto.trim().split(' ');
  const iniciais = partesNome.length > 1
    ? `${partesNome[0][0]}${partesNome[partesNome.length - 1][0]}`.toUpperCase()
    : partesNome[0].slice(0, 2).toUpperCase();

  const textoLongo = item.comentario && item.comentario.length > 180;
  const textoExibido = !expandido && textoLongo ? `${item.comentario.slice(0, 180)}...` : item.comentario;

  // Subcritérios só existem quando vêm da API; nunca são inventados.
  const temSubcriterios = !doSite && CRITERIOS.every(c => item[c.chave] !== undefined);
  const notaExibida = temSubcriterios
    ? CRITERIOS.reduce((soma, c) => soma + Number(item[c.chave]), 0) / CRITERIOS.length
    : Number(item.nota || 5);

  return (
    <article className="rc-q rc-av-card">
      <div className="rc-av-topo">
        <div className="rc-av-avatar" aria-hidden="true">{iniciais}</div>
        <div className="rc-av-quem">
          <strong>{nomeCompleto}</strong>
          <span>{doSite ? item.periodo : formatarData(item.data)}</span>
        </div>
        {!doSite && (
          <span className="rc-av-verificado" title="Hóspede verificado">
            <i className="bi bi-patch-check-fill" aria-hidden="true" /> Verificado
          </span>
        )}
      </div>

      <div className="rc-av-nota">
        <Estrelas nota={notaExibida} />
        <strong>{formatarNota(notaExibida)}</strong>
      </div>

      {temSubcriterios && (
        <ul className="rc-av-criterios">
          {CRITERIOS.map(c => (
            <li key={c.chave}><i className={`bi ${c.icone}`} aria-hidden="true" /> {c.rotulo} {Number(item[c.chave]).toFixed(1)}</li>
          ))}
        </ul>
      )}

      <blockquote className="rc-av-texto"><p>“{textoExibido}”</p></blockquote>

      {textoLongo && (
        <button type="button" className="rc-link-inline rc-av-mais" onClick={() => setExpandido(atual => !atual)} aria-expanded={expandido}>
          {expandido ? 'Mostrar menos' : 'Mostrar mais'}
        </button>
      )}

      {resposta && (
        <div className="rc-av-resposta">
          <div className="rc-av-resposta-topo">
            <span><i className="bi bi-reply-fill" aria-hidden="true" /> Resposta do Recanto Camargo</span>
            <span>{formatarData(resposta.data)}</span>
          </div>
          <p>{resposta.comentario}</p>
        </div>
      )}
    </article>
  );
}

CardAvaliacao.propTypes = { item: PropTypes.object.isRequired };

function Avaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [filtroEstrela, setFiltroEstrela] = useState(null);
  const { nota: notaGoogle, total: totalGoogle, erro: erroGoogle, carregando: carregandoGoogle } = useAvaliacoesGoogle();

  // Depoimentos reais cadastrados no site. Só o que existe de fato: nome, nota, texto e período.
  const obterFallback = useCallback(() => {
    return (depoimentos || []).map(d => ({
      id: d.id,
      doSite: true,
      hospede: { nome: d.nome },
      nota: d.estrelas || 5,
      comentario: d.texto,
      periodo: d.local,
      respostaProprietario: null,
    }));
  }, []);

  const buscarAvaliacoes = useCallback(async (signal) => {
    setCarregando(true);
    setErro('');

    // Sem API (ex.: preview estático), usa os depoimentos reais sem tentar localhost nem provocar avisos PNA
    if (!IS_API_AVAILABLE) {
      setAvaliacoes(obterFallback());
      setCarregando(false);
      return;
    }

    try {
      const resposta = await fetch(`${API_BASE}/api/avaliacoes/imovel/1`, { signal });
      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) throw new Error(dados.error || 'Não foi possível carregar as avaliações.');
      if (!Array.isArray(dados)) throw new Error('O servidor retornou um formato de avaliações inválido.');

      setAvaliacoes(dados.length > 0 ? dados : obterFallback());
    } catch (falha) {
      if (falha.name !== 'AbortError') {
        setAvaliacoes(obterFallback());
      }
    } finally {
      if (!signal?.aborted) setCarregando(false);
    }
  }, [obterFallback]);

  useEffect(() => {
    const controlador = new AbortController();
    buscarAvaliacoes(controlador.signal);
    return () => controlador.abort();
  }, [buscarAvaliacoes]);

  const total = avaliacoes.length;
  const dadosCompletos = total > 0 && avaliacoes.every(a => !a.doSite);
  const media = (chave) => (total > 0
    ? avaliacoes.reduce((acc, a) => acc + Number(a[chave] || a.nota || 5), 0) / total
    : 5);
  const mediaGeral = media('nota');

  const distribuicao = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  avaliacoes.forEach(a => {
    const estrela = Math.max(1, Math.min(5, Math.round(Number(a.nota || 5))));
    distribuicao[estrela] += 1;
  });
  const percentual = (estrela) => (total > 0 ? Math.round((distribuicao[estrela] / total) * 100) : 0);

  const avaliacoesFiltradas = filtroEstrela
    ? avaliacoes.filter(a => Math.round(Number(a.nota || 5)) === filtroEstrela)
    : avaliacoes;

  const notaGoogleOk = !carregandoGoogle && !erroGoogle && notaGoogle != null && totalGoogle;

  return (
    <div className="rc-home rc-avaliacoes">
      <div className="rc-wrap">
        <header className="rc-av-head">
          <span className="rc-eyebrow">Avaliações</span>
          <h1>Quem já se hospedou.</h1>
          <p className="rc-lead">Relatos reais de hóspedes do Recanto Camargo.</p>
          {!carregando && total > 0 && !dadosCompletos && (
            <span className="rc-rating">
              <i className="bi bi-chat-heart" aria-hidden="true" />
              {total} depoimentos de hóspedes
            </span>
          )}
          {notaGoogleOk && (
            <span className="rc-rating">
              <i className="bi bi-star-fill" aria-hidden="true" />
              {formatarNota(notaGoogle, 1)} no Google · {totalGoogle} avaliações
            </span>
          )}
        </header>

        {!carregando && dadosCompletos && (
          <section className="rc-av-resumo" aria-label="Resumo das avaliações">
            <div className="rc-av-geral">
                <span className="rc-av-score">{formatarNota(mediaGeral, 1)}</span>
                <Estrelas nota={mediaGeral} />
                <span className="rc-av-total">{total} {total === 1 ? 'estadia avaliada' : 'estadias avaliadas'}</span>
            </div>

              <ul className="rc-av-barras" aria-label="Filtrar por nota">
                {[5, 4, 3, 2, 1].map(estrela => {
                  const ativa = filtroEstrela === estrela;
                  return (
                    <li key={estrela}>
                      <button
                        type="button"
                        className={`rc-av-barra${ativa ? ' rc-ativa' : ''}`}
                        aria-pressed={ativa}
                        onClick={() => setFiltroEstrela(atual => (atual === estrela ? null : estrela))}
                        title={`Filtrar por ${estrela} estrela${estrela > 1 ? 's' : ''}`}
                      >
                        <span>{estrela} <i className="bi bi-star-fill" aria-hidden="true" /></span>
                        <span className="rc-av-trilha"><span style={{ width: `${percentual(estrela)}%` }} /></span>
                        <span>{percentual(estrela)}%</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <ul className="rc-av-subnotas">
                {CRITERIOS.map(c => (
                  <li key={c.chave}>
                    <i className={`bi ${c.icone}`} aria-hidden="true" />
                    <strong>{formatarNota(media(c.chave), 1)}</strong>
                    <span>{c.rotulo}</span>
                  </li>
                ))}
              </ul>
          </section>
        )}

        {filtroEstrela && (
          <p className="rc-av-filtro">
            <i className="bi bi-funnel-fill" aria-hidden="true" /> Filtrando por {filtroEstrela} estrela{filtroEstrela > 1 ? 's' : ''} ({distribuicao[filtroEstrela]})
            <button type="button" className="rc-link-inline" onClick={() => setFiltroEstrela(null)}>Limpar filtro</button>
          </p>
        )}

        {carregando && (
          <div className="rc-av-estado" role="status" aria-live="polite">
            <span className="spinner-border" aria-hidden="true" />
            <span>Carregando avaliações...</span>
          </div>
        )}

        {!carregando && erro && (
          <div className="rc-av-estado" role="alert">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" />
            <p>{erro}</p>
            <button type="button" className="rc-btn rc-btn-line" onClick={() => buscarAvaliacoes()}>Tentar novamente</button>
          </div>
        )}

        {!carregando && !erro && total === 0 && (
          <div className="rc-av-estado">
            <i className="bi bi-chat-square-heart" aria-hidden="true" />
            <h2>Ainda não há avaliações publicadas</h2>
            <p>As avaliações de estadias concluídas aparecerão aqui.</p>
          </div>
        )}

        {!carregando && !erro && total > 0 && (
          avaliacoesFiltradas.length === 0 ? (
            <div className="rc-av-estado">
              <i className="bi bi-search" aria-hidden="true" />
              <h2>Nenhuma avaliação com {filtroEstrela} estrela{filtroEstrela > 1 ? 's' : ''}</h2>
              <p>Tente outra classificação ou limpe o filtro.</p>
              <button type="button" className="rc-btn rc-btn-line" onClick={() => setFiltroEstrela(null)}>
                Ver todas as avaliações ({total})
              </button>
            </div>
          ) : (
            <div className="rc-av-grade">
              {avaliacoesFiltradas.map(item => <CardAvaliacao key={item.id} item={item} />)}
            </div>
          )
        )}

        <div className="rc-av-final">
          <p>Pronto para se hospedar?</p>
          <Link to="/Reserva" className="rc-btn rc-btn-primary">Consultar disponibilidade</Link>
        </div>
      </div>
    </div>
  );
}

export default Avaliacoes;
