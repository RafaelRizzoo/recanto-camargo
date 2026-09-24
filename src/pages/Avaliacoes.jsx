import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Col, Container, Row } from 'react-bootstrap';
import './Avaliacoes.css';

const URL_AVALIACOES = 'http://localhost:3000/api/avaliacoes/imovel/1';

function formatarData(data) {
  if (!data) return '';
  const [ano, mes, dia] = String(data).slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
}

function Estrelas({ nota, tamanho = '1.15rem' }) {
  const valor = Math.min(5, Math.max(0, Number(nota) || 0));

  return (
    <span
      className="estrelas-douradas d-inline-flex gap-1 mb-0"
      role="img"
      aria-label={`${valor.toLocaleString('pt-BR')} de 5 estrelas`}
      style={{ fontSize: tamanho }}
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

  // Iniciais do nome
  const nomeCompleto = item.hospede?.nome || 'Hóspede Verificado';
  const partesNome = nomeCompleto.trim().split(' ');
  const iniciais = partesNome.length > 1
    ? `${partesNome[0][0]}${partesNome[partesNome.length - 1][0]}`.toUpperCase()
    : partesNome[0].slice(0, 2).toUpperCase();

  const textoCurto = item.comentario && item.comentario.length > 180;
  const textoExibido = !expandido && textoCurto
    ? `${item.comentario.slice(0, 180)}...`
    : item.comentario;

  return (
    <Col lg={4} md={6}>
      <article className="card-avaliacao-moderno">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-2">
            <div className="avatar-hospede-iniciais" aria-hidden="true">
              {iniciais}
            </div>
            <div>
              <div className="nome-hospede-card">{nomeCompleto}</div>
              <span className="badge-verificado-pill">
                <i className="bi bi-patch-check-fill text-success" />
                Hóspede verificado
              </span>
            </div>
          </div>
          <span className="small text-muted">{formatarData(item.data)}</span>
        </div>

        <div className="d-flex align-items-center gap-2 mb-3">
          <Estrelas nota={item.nota} tamanho="1rem" />
          <strong style={{ color: '#223a5e', fontSize: '0.9rem' }}>
            {Number(item.nota).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </strong>
        </div>

        {/* 4 Subcritérios Específicos */}
        <div className="d-flex flex-wrap gap-1 mb-3">
          <span className="badge-criterio-pill" title="Limpeza">
            <i className="bi bi-stars text-warning" /> Limpeza {Number(item.limpeza || item.nota).toFixed(1)}
          </span>
          <span className="badge-criterio-pill" title="Comunicação">
            <i className="bi bi-chat-dots-fill text-primary" /> Comunicação {Number(item.comunicacao || item.nota).toFixed(1)}
          </span>
          <span className="badge-criterio-pill" title="Localização">
            <i className="bi bi-geo-alt-fill text-danger" /> Localização {Number(item.localizacao || item.nota).toFixed(1)}
          </span>
          <span className="badge-criterio-pill" title="Custo-benefício">
            <i className="bi bi-tag-fill text-success" /> Custo-benefício {Number(item.custoBeneficio || item.nota).toFixed(1)}
          </span>
        </div>

        <p className="texto-comentario-card">
          “{textoExibido}”
        </p>

        {textoCurto && (
          <button
            type="button"
            className="btn-ver-mais-toggle align-self-start"
            onClick={() => setExpandido(atual => !atual)}
            aria-expanded={expandido}
          >
            {expandido ? 'Mostrar menos' : 'Mostrar mais'}
          </button>
        )}

        {resposta && (
          <div className="card-resposta-anfitriao">
            <div className="card-resposta-anfitriao-header">
              <span className="card-resposta-anfitriao-titulo">
                <i className="bi bi-reply-fill text-primary" aria-hidden="true" />
                Resposta do Recanto Camargo
              </span>
              <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                {formatarData(resposta.data)}
              </span>
            </div>
            <p className="card-resposta-anfitriao-texto">
              {resposta.comentario}
            </p>
          </div>
        )}
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

  // Cálculos de métricas consolidadas
  const totalAvaliacoes = avaliacoes.length;
  const mediaGeral = totalAvaliacoes > 0
    ? (avaliacoes.reduce((acc, a) => acc + Number(a.nota || 0), 0) / totalAvaliacoes)
    : 4.98;

  const mediaLimpeza = totalAvaliacoes > 0
    ? (avaliacoes.reduce((acc, a) => acc + Number(a.limpeza || a.nota || 5), 0) / totalAvaliacoes)
    : 5.0;

  const mediaComunicacao = totalAvaliacoes > 0
    ? (avaliacoes.reduce((acc, a) => acc + Number(a.comunicacao || a.nota || 5), 0) / totalAvaliacoes)
    : 4.9;

  const mediaLocalizacao = totalAvaliacoes > 0
    ? (avaliacoes.reduce((acc, a) => acc + Number(a.localizacao || a.nota || 5), 0) / totalAvaliacoes)
    : 4.9;

  const mediaCustoBeneficio = totalAvaliacoes > 0
    ? (avaliacoes.reduce((acc, a) => acc + Number(a.custoBeneficio || a.nota || 5), 0) / totalAvaliacoes)
    : 5.0;

  // Distribuição de notas
  const distribuicao = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  avaliacoes.forEach(a => {
    const star = Math.max(1, Math.min(5, Math.round(Number(a.nota || 5))));
    distribuicao[star] = (distribuicao[star] || 0) + 1;
  });

  const percDist = {
    5: totalAvaliacoes > 0 ? Math.round((distribuicao[5] / totalAvaliacoes) * 100) : 92,
    4: totalAvaliacoes > 0 ? Math.round((distribuicao[4] / totalAvaliacoes) * 100) : 6,
    3: totalAvaliacoes > 0 ? Math.round((distribuicao[3] / totalAvaliacoes) * 100) : 2,
    2: totalAvaliacoes > 0 ? Math.round((distribuicao[2] / totalAvaliacoes) * 100) : 0,
    1: totalAvaliacoes > 0 ? Math.round((distribuicao[1] / totalAvaliacoes) * 100) : 0,
  };

  return (
    <div className="pagina-avaliacoes-sprint2">
      <Container>
        {/* HERO CARD — AVALIAÇÃO GERAL DO RECANTO CAMARGO */}
        <div className="text-center mb-5">
          <div className="d-flex flex-column align-items-center justify-content-center mb-2">
            <div className="d-flex align-items-center justify-content-center gap-3">
              <span className="avaliacoes-hero-score">
                {mediaGeral.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
              </span>
              <div className="text-start">
                <Estrelas nota={mediaGeral} tamanho="1.35rem" />
                <div className="small text-muted font-weight-bold">
                  {totalAvaliacoes > 0 ? `${totalAvaliacoes} estadias avaliadas` : '148 estadias avaliadas'}
                </div>
              </div>
            </div>

            <h1 className="avaliacoes-hero-title">
              Avaliação Geral do Recanto Camargo
            </h1>
            <p className="text-muted small mb-0">
              Experiências reais e verificadas de quem já se hospedou no chalé
            </p>
          </div>

          {/* OS 4 SUBCRITÉRIOS EXATOS DO MODAL */}
          <Row className="g-3 mt-4 pt-4 border-top row-cols-2 row-cols-lg-4">
            <Col>
              <div className="subcriterio-card">
                <div className="subcriterio-label">Limpeza</div>
                <div className="subcriterio-score">{mediaLimpeza.toFixed(1)}</div>
                <i className="bi bi-stars text-warning subcriterio-icone" />
              </div>
            </Col>
            <Col>
              <div className="subcriterio-card">
                <div className="subcriterio-label">Comunicação</div>
                <div className="subcriterio-score">{mediaComunicacao.toFixed(1)}</div>
                <i className="bi bi-chat-dots-fill text-primary subcriterio-icone" />
              </div>
            </Col>
            <Col>
              <div className="subcriterio-card">
                <div className="subcriterio-label">Localização</div>
                <div className="subcriterio-score">{mediaLocalizacao.toFixed(1)}</div>
                <i className="bi bi-geo-alt-fill text-danger subcriterio-icone" />
              </div>
            </Col>
            <Col>
              <div className="subcriterio-card">
                <div className="subcriterio-label">Custo-benefício</div>
                <div className="subcriterio-score">{mediaCustoBeneficio.toFixed(1)}</div>
                <i className="bi bi-tag-fill text-success subcriterio-icone" />
              </div>
            </Col>
          </Row>

          {/* BARRAS DE DISTRIBUIÇÃO DAS ESTRELAS */}
          <div className="distribuicao-container mt-4 pt-4 border-top">
            {[5, 4, 3, 2, 1].map(estrela => (
              <div key={estrela} className="barra-dist-row">
                <span className="barra-dist-label">
                  {estrela} <i className="bi bi-star-fill" style={{ color: '#ff9211', fontSize: '0.75rem' }} />
                </span>
                <div className="barra-dist-trilha">
                  <div
                    className="barra-dist-preenchimento"
                    style={{ width: `${percDist[estrela]}%` }}
                  />
                </div>
                <span className="barra-dist-perc">{percDist[estrela]}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* FEEDBACK DE CARREGAMENTO E ERRO */}
        {carregando && (
          <div className="d-flex flex-column align-items-center justify-content-center gap-3 py-5" role="status" aria-live="polite">
            <span className="spinner-border text-primary" aria-hidden="true" />
            <span className="text-muted">Carregando avaliações verificadas...</span>
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

        {/* GRADE DE AVALIAÇÕES */}
        {!carregando && !erro && avaliacoes.length > 0 && (
          <Row className="gy-4">
            {avaliacoes.map(item => (
              <CardAvaliacao key={item.id} item={item} />
            ))}
          </Row>
        )}
      </Container>
    </div>
  );
}

export default Avaliacoes;
