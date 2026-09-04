import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Col, Container, Row } from 'react-bootstrap';

const URL_AVALIACOES = 'http://localhost:3000/api/avaliacoes/imovel/1';

function formatarData(data) {
  if (!data) return '';
  const [ano, mes, dia] = String(data).slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
}

function Estrelas({ nota }) {
  const valor = Math.min(5, Math.max(0, Number(nota) || 0));

  return (
    <span
      className="estrelas-douradas d-inline-flex gap-1 mb-0"
      role="img"
      aria-label={`${valor.toLocaleString('pt-BR')} de 5 estrelas`}
    >
      {[1, 2, 3, 4, 5].map(posicao => {
        const classe = valor >= posicao
          ? 'bi-star-fill'
          : valor >= posicao - 0.5
            ? 'bi-star-half'
            : 'bi-star';
        return <i key={posicao} className={`bi ${classe}`} aria-hidden="true" />;
      })}
    </span>
  );
}

function CardAvaliacao({ item }) {
  const [expandido, setExpandido] = useState(false);
  const resposta = item.respostaProprietario;

  return (
    <Col lg={4} md={6}>
      <article className={`card-depoimento-pagina h-100 p-4 shadow-sm bg-white ${expandido ? 'expandido' : ''}`}>
        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
          <Estrelas nota={item.nota} />
          <span className="small text-muted">{formatarData(item.data)}</span>
        </div>

        <div className={expandido ? 'texto-completo' : 'container-texto-cortado'}>
          <p className="texto-depoimento-pagina">{item.comentario}</p>
        </div>

        <button
          type="button"
          className="btn-ver-mais mb-3 align-self-start"
          onClick={() => setExpandido(atual => !atual)}
          aria-expanded={expandido}
        >
          {expandido ? 'Mostrar menos' : 'Mostrar mais'}
        </button>

        {resposta && (
          <div
            className="mb-4 p-3 rounded-3"
            style={{ background: '#f0f4ff', borderLeft: '4px solid #3b6399' }}
          >
            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
              <strong className="small" style={{ color: '#223a5e' }}>
                <i className="bi bi-reply-fill me-2" aria-hidden="true" />Resposta do Recanto Camargo
              </strong>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>{formatarData(resposta.data)}</span>
            </div>
            <p className="mb-0 small text-secondary" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {resposta.comentario}
            </p>
          </div>
        )}

        <div className="info-autor-avaliacoes mt-auto">
          <div className="avatar-avaliacoes" aria-hidden="true"><i className="bi bi-check2" /></div>
          <div>
            <h6 className="nome-autor-avaliacoes">Hóspede verificado</h6>
            <small className="text-muted">Estadia concluída no Recanto Camargo</small>
          </div>
        </div>
      </article>
    </Col>
  );
}

function Avaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const buscarAvaliacoes = useCallback(async (signal) => {
    setCarregando(true);
    setErro('');

    try {
      const resposta = await fetch(URL_AVALIACOES, { signal });
      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) throw new Error(dados.error || 'Não foi possível carregar as avaliações.');
      if (!Array.isArray(dados)) throw new Error('O servidor retornou um formato de avaliações inválido.');

      setAvaliacoes(dados);
    } catch (falha) {
      if (falha.name !== 'AbortError') {
        setErro(falha.message || 'Não foi possível carregar as avaliações.');
      }
    } finally {
      if (!signal?.aborted) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    buscarAvaliacoes(controlador.signal);
    return () => controlador.abort();
  }, [buscarAvaliacoes]);

  const media = avaliacoes.length > 0
    ? avaliacoes.reduce((total, item) => total + Number(item.nota || 0), 0) / avaliacoes.length
    : 0;

  return (
    <div className="pagina-avaliacoes py-5">
      <Container>
        <div className="text-center mb-5 titulo-container-avaliacoes">
          <h2 className="titulo-secao-azul">O que nossos hóspedes dizem</h2>
          <p className="text-muted mb-2">Experiências reais de estadias concluídas no Recanto Camargo</p>
          {!carregando && !erro && avaliacoes.length > 0 && (
            <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
              <Estrelas nota={media} />
              <strong style={{ color: '#223a5e' }}>
                {media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </strong>
              <span className="text-muted small">· {avaliacoes.length} avaliação(ões) verificada(s)</span>
            </div>
          )}
        </div>

        {carregando && (
          <div className="d-flex flex-column align-items-center justify-content-center gap-3 py-5" role="status" aria-live="polite">
            <span className="spinner-border text-primary" aria-hidden="true" />
            <span className="text-muted">Carregando avaliações...</span>
          </div>
        )}

        {!carregando && erro && (
          <Alert variant="danger" className="border-0 shadow-sm text-center py-4" role="alert">
            <i className="bi bi-exclamation-triangle fs-3 d-block mb-2" aria-hidden="true" />
            <p className="mb-3">{erro}</p>
            <Button variant="outline-danger" onClick={() => buscarAvaliacoes()}>Tentar novamente</Button>
          </Alert>
        )}

        {!carregando && !erro && avaliacoes.length === 0 && (
          <div className="bg-white rounded-4 shadow-sm text-center p-5">
            <i className="bi bi-chat-square-heart fs-1 text-secondary" aria-hidden="true" />
            <h5 className="mt-3" style={{ color: '#223a5e' }}>Ainda não há avaliações publicadas</h5>
            <p className="text-muted mb-0">As avaliações de estadias concluídas aparecerão aqui.</p>
          </div>
        )}

        {!carregando && !erro && avaliacoes.length > 0 && (
          <Row className="gy-4">
            {avaliacoes.map(item => <CardAvaliacao key={item.id} item={item} />)}
          </Row>
        )}
      </Container>
    </div>
  );
}

export default Avaliacoes;
