import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { comodidadesGrupos, depoimentos, galeriaPorUnidade, mapaEmbedSrc, unidades, MAX_HOSPEDES } from '../data/conteudoSite';
import CalendarioCustom from '../components/UI/CalendarioCustom';
import CampoData from '../components/home/CampoData';
import MosaicoFotos from '../components/home/MosaicoFotos';
import { linkWhats } from '../components/home/links';
import { useAjustarPopover } from '../components/home/useAjustarPopover';
import { useAvaliacoesGoogle } from '../hooks/useAvaliacoesGoogle';
import { API_BASE } from '../utils/api';
import '../components/home/home.css';
import './Reserva.css';

const DIARIA = 270;
const TAXA_LIMPEZA = 80;
const MAPS_URL = 'https://www.google.com/maps?q=Recanto+Camargo+Aparecida+SP';

function calcularNoites(checkin, checkout) {
  if (!checkin || !checkout) return 0;
  const diff = Math.round((new Date(checkout) - new Date(checkin)) / 86400000);
  return diff > 0 ? diff : 0;
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Reserva() {
  const { usuario, autenticado } = useAutenticacao();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [unidadeId, setUnidadeId] = useState(1);
  const unidade = unidades.find((u) => u.id === unidadeId) ?? unidades[0];
  const { nota: notaMedia, total: totalGoogle, erro: erroGoogle, carregando: carregandoGoogle } = useAvaliacoesGoogle();
  const areaCalendario = useRef(null);

  const [datas, setDatas] = useState({
    checkin: searchParams.get('checkin') || '',
    checkout: searchParams.get('checkout') || '',
  });
  const [observacoes, setObservacoes] = useState('');
  const [hospedes, setHospedes] = useState(searchParams.get('hospedes') || '');
  const [erros, setErros] = useState({});
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  useAjustarPopover(mostrarCalendario, areaCalendario);
  
  const [cupomInput, setCupomInput] = useState('');
  const [cupomAplicado, setCupomAplicado] = useState(null);
  const [erroCupom, setErroCupom] = useState('');
  const [validandoCupom, setValidandoCupom] = useState(false);

  const noites = calcularNoites(datas.checkin, datas.checkout);
  const subtotal = noites * DIARIA;

  // Apenas PREVIEW para o usuário; o valor definitivo é sempre recalculado no servidor.
  const valorBasePreview = subtotal + TAXA_LIMPEZA;
  let desconto = 0;
  if (cupomAplicado) {
    if (cupomAplicado.tipoDesconto === 'PERCENTUAL') {
      desconto = valorBasePreview * (cupomAplicado.valorDesconto / 100);
    } else if (cupomAplicado.tipoDesconto === 'FIXO') {
      desconto = cupomAplicado.valorDesconto;
    }
  }

  desconto = Math.min(valorBasePreview, Math.max(0, desconto));
  const total = noites > 0 ? Math.max(0, valorBasePreview - desconto) : 0;

  // Validação dinâmica: se as datas mudarem após aplicar cupom e violarem o mínimo de noites ou valor
  useEffect(() => {
    if (cupomAplicado && noites > 0) {
      if (cupomAplicado.minimoNoites > 1 && noites < cupomAplicado.minimoNoites) {
        setErroCupom(`O cupom ${cupomAplicado.codigo} exige no mínimo ${cupomAplicado.minimoNoites} noites e foi removido.`);
        setCupomAplicado(null);
      } else if (cupomAplicado.valorMinimo > 0 && valorBasePreview < cupomAplicado.valorMinimo) {
        setErroCupom(`O cupom ${cupomAplicado.codigo} exige um valor mínimo de R$ ${cupomAplicado.valorMinimo.toFixed(2)} e foi removido.`);
        setCupomAplicado(null);
      }
    }
  }, [noites, valorBasePreview, cupomAplicado]);

  async function aplicarCupom() {
    setErroCupom('');
    const codigo = cupomInput.trim();
    if (!codigo) {
      setErroCupom('Informe um código de cupom.');
      return;
    }
    if (noites <= 0) {
      setErroCupom('Selecione as datas de check-in e check-out antes de aplicar o cupom.');
      return;
    }

    setValidandoCupom(true);

    try {
      const resposta = await fetch(`${API_BASE}/api/cupons/validar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          codigo,
          noites,
          subtotal: valorBasePreview
        }),
      });
      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(dados?.error || 'Erro ao validar cupom.');
      }
      if (!dados || !Number.isSafeInteger(Number(dados.cupomId)) || Number(dados.cupomId) <= 0
        || !['PERCENTUAL', 'FIXO'].includes(dados.tipoDesconto)) {
        throw new Error('Resposta inválida ao validar cupom.');
      }

      const valorDesconto = Number(dados.valorDesconto);
      if (!Number.isFinite(valorDesconto) || valorDesconto < 0) {
        throw new Error('Resposta inválida ao validar cupom.');
      }

      const minNoites = Number(dados.minimoNoites || 1);
      const valMin = Number(dados.valorMinimo || 0);

      if (minNoites > 1 && noites < minNoites) {
        throw new Error(`Este cupom exige uma estadia mínima de ${minNoites} noites.`);
      }
      if (valMin > 0 && valorBasePreview < valMin) {
        throw new Error(`Este cupom exige um valor mínimo de R$ ${valMin.toFixed(2)}.`);
      }

      setCupomAplicado({
        cupomId: Number(dados.cupomId),
        codigo: dados.codigo,
        tipoDesconto: dados.tipoDesconto,
        valorDesconto,
        minimoNoites: minNoites,
        valorMinimo: valMin,
      });
      setCupomInput('');
    } catch (erro) {
      setCupomAplicado(null);
      setErroCupom(erro.message || 'Erro ao validar cupom.');
    } finally {
      setValidandoCupom(false);
    }
  }

  function removerCupom() {
    setCupomAplicado(null);
    setErroCupom('');
  }

  function escolherUnidade(id) {
    setUnidadeId(id);
    setMostrarCalendario(false);
  }

  useEffect(() => {
    if (!mostrarCalendario) return undefined;
    const fecharFora = (e) => {
      if (areaCalendario.current && !areaCalendario.current.contains(e.target)) setMostrarCalendario(false);
    };
    const fecharEsc = (e) => e.key === 'Escape' && setMostrarCalendario(false);
    document.addEventListener('mousedown', fecharFora);
    document.addEventListener('keydown', fecharEsc);
    return () => {
      document.removeEventListener('mousedown', fecharFora);
      document.removeEventListener('keydown', fecharEsc);
    };
  }, [mostrarCalendario]);

  function handleCalendarChange(range) {
    if (Array.isArray(range) && range[0] && range[1]) {
      const start = range[0];
      const end = range[1];
      
      const startIso = new Date(start.getTime() - start.getTimezoneOffset() * 60000);
      const checkinStr = startIso.toISOString().split('T')[0];
      
      const endIso = new Date(end.getTime() - end.getTimezoneOffset() * 60000);
      const checkoutStr = endIso.toISOString().split('T')[0];
      
      setDatas({ checkin: checkinStr, checkout: checkoutStr });
      setErros(er => ({ ...er, checkin: undefined, checkout: undefined, conflito: undefined }));
      setMostrarCalendario(false);
    }
  }

  function irParaLogin() {
    navigate('/Login', { state: { from: location.pathname + location.search } });
  }

  async function handleSubmit(evt) {
    evt.preventDefault();
    const errosNovos = {};
    if (!datas.checkin) errosNovos.checkin = 'Selecione a data de check-in.';
    if (!datas.checkout) errosNovos.checkout = 'Selecione a data de check-out.';
    if (datas.checkin && datas.checkout && noites <= 0) {
      errosNovos.checkout = 'O check-out deve ser depois do check-in.';
    }
    if (!hospedes || hospedes < 1 || hospedes > 10) {
      errosNovos.hospedes = 'Informe um número válido de hóspedes (1 a 10).';
    }
    if (Object.keys(errosNovos).length > 0) {
      setErros(errosNovos);
      return;
    }

    try {
      // 1. Enviar para o nosso Back-end de verdade (MySQL)
      const resposta = await fetch(`${API_BASE}/api/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ESSENCIAL: Envia o Cookie JWT do usuário!
        body: JSON.stringify({
          checkin: datas.checkin + ' 14:00:00', // Check-in a partir das 14h
          checkout: datas.checkout + ' 11:00:00', // Check-out até as 11h
          hospedes: parseInt(hospedes, 10),
          observacoes,
          ...(cupomAplicado ? { cupomId: cupomAplicado.cupomId } : {}),
        })
      });

      if (!resposta.ok) {
        const errorData = await resposta.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao comunicar com a API');
      }

      const dadosAPI = await resposta.json();
      console.log('✅ Retorno da API:', dadosAPI);

      navigate('/ReservaConcluida/' + dadosAPI.reservaId);
    } catch (erro) {
      console.error(erro);
      setErros({ geral: erro.message || 'Erro ao salvar reserva no Banco de Dados.' });
    }
  }


  const reservaOnline = unidade.consultaOnline;
  const notaGoogle = !carregandoGoogle && !erroGoogle && notaMedia != null && totalGoogle;
  const localTexto = unidade.id === 1 ? 'Ponte Alta, Aparecida - SP' : 'Aparecida, SP';

  return (
    <div className="rc-home rc-reserva">
      <div className="rc-wrap">

        <header className="rc-res-head">
          <span className="rc-eyebrow">Reserva direta</span>
          <h1>{unidade.nome}</h1>
          <div className="rc-res-meta">
            <span className="rc-res-nota">
              <i className="bi bi-star-fill" aria-hidden="true" />
              {notaGoogle
                ? <>{notaMedia.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} no Google · {totalGoogle} avaliações</>
                : <>{depoimentos.length} avaliações de hóspedes</>}
            </span>
            <span aria-hidden="true">·</span>
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="rc-res-local">
              <i className="bi bi-geo-alt-fill" aria-hidden="true" /> {localTexto}
            </a>
          </div>

          <div className="rc-tabs" role="tablist" aria-label="Unidade">
            {unidades.map((u) => (
              <button
                type="button"
                role="tab"
                key={u.id}
                className="rc-tab"
                aria-selected={unidade.id === u.id}
                onClick={() => escolherUnidade(u.id)}
              >
                <i className="rc-dot" style={{ '--c': u.cor }} aria-hidden="true" /> {u.nome}
              </button>
            ))}
          </div>
        </header>

        <MosaicoFotos fotos={galeriaPorUnidade[unidade.id]} rotulo={unidade.selo} />

        <div className="rc-res-grid">
          <div className="rc-res-main">

            <section className="rc-res-bloco">
              <h2>Sobre o {unidade.nome}</h2>
              {unidade.id === 1 ? (
                <>
                  <p>
                    Casa aconchegante com 2 quartos, localizada no bairro Ponte Alta, a apenas 5 minutos
                    a pé do Santuário Nacional de Aparecida. Ideal para famílias e grupos de peregrinos
                    que buscam conforto, privacidade e uma estadia tranquila na cidade da Padroeira do Brasil.
                  </p>
                  <p>
                    A casa conta com cozinha completa, churrasqueira, Wi-Fi, Smart TVs, garagem e enxoval
                    incluso. Os anfitriões Rafael e dona Sônia estão sempre disponíveis para garantir a
                    melhor experiência possível.
                  </p>
                </>
              ) : (
                <>
                  <p>{unidade.resumo}</p>
                  <p>
                    Os anfitriões Rafael e dona Sônia estão sempre disponíveis para garantir a melhor
                    experiência possível.
                  </p>
                </>
              )}
            </section>

            <section className="rc-res-bloco">
              <h2>O que este lugar oferece</h2>
              <div className="rc-am rc-am-reserva">
                {comodidadesGrupos.map((g) => (
                  <div className="rc-g" key={g.id}>
                    <h3>{g.titulo}</h3>
                    <ul>
                      {g.itens.map((item) => (
                        <li key={item.texto}><i className={`bi ${item.icone}`} aria-hidden="true" />{item.texto}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section className="rc-res-bloco">
              <h2>Localização</h2>
              <p>{localTexto} — cerca de 5 min a pé do Santuário Nacional</p>
              {unidade.id === 1 && (
                <>
                  <div className="rc-res-mapa">
                    <iframe title="Localização do Recanto Camargo no mapa" loading="lazy" src={mapaEmbedSrc} />
                  </div>
                  <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="rc-res-local rc-res-maps">
                    <i className="bi bi-geo-alt-fill" aria-hidden="true" /> Ver no Google Maps
                  </a>
                </>
              )}
            </section>
          </div>

          <aside className="rc-res-side" aria-label="Reservar">
            <div className="rc-res-card">
              {!reservaOnline ? (
                <>
                  <h2 className="rc-res-card-titulo">Reservar o {unidade.nome}</h2>
                  <p className="rc-res-card-texto">
                    A reserva online do {unidade.nome} ainda não está disponível. Fale com a gente pelo WhatsApp
                    para consultar datas e valores.
                  </p>
                  <a
                    className="rc-btn rc-btn-primary rc-res-cta"
                    href={linkWhats(`Olá! Gostaria de reservar o ${unidade.nome}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="bi bi-whatsapp" aria-hidden="true" /> Falar no WhatsApp
                  </a>
                </>
              ) : (
                <>
                  <div className="rc-res-preco">
                    <strong>{formatarMoeda(DIARIA)}</strong> <span>/ noite</span>
                  </div>

                  <div className="rc-res-datas-wrap" ref={areaCalendario}>
                    <div className={`rc-res-datas${erros.checkin || erros.checkout ? ' rc-invalid' : ''}`}>
                      <CampoData
                        id="res-checkin"
                        rotulo="Check-in"
                        valor={datas.checkin}
                        aberto={mostrarCalendario}
                        onAbrir={() => setMostrarCalendario(true)}
                        onFechar={() => setMostrarCalendario(false)}
                      />
                      <CampoData
                        id="res-checkout"
                        rotulo="Check-out"
                        valor={datas.checkout}
                        aberto={mostrarCalendario}
                        onAbrir={() => setMostrarCalendario(true)}
                        onFechar={() => setMostrarCalendario(false)}
                      />
                    </div>

                    {mostrarCalendario && (
                      <>
                        <div className="rc-pop-backdrop" onClick={() => setMostrarCalendario(false)} aria-hidden="true" />
                        <div className="rc-pop rc-pop-card" role="dialog" aria-label="Selecione as datas">
                          <div className="rc-pop-head">
                            <span>Selecione as datas</span>
                            <button type="button" onClick={() => setMostrarCalendario(false)} aria-label="Fechar calendário">
                              <i className="bi bi-x-lg" aria-hidden="true" />
                            </button>
                          </div>
                          <CalendarioCustom
                            onChange={handleCalendarChange}
                            valor={(datas.checkin && datas.checkout) ? [new Date(datas.checkin + 'T12:00:00'), new Date(datas.checkout + 'T12:00:00')] : null}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="rc-res-campo">
                    <label htmlFor="res-hospedes">Hóspedes</label>
                    <select
                      id="res-hospedes"
                      className={erros.hospedes ? 'rc-invalid' : ''}
                      value={hospedes}
                      aria-invalid={Boolean(erros.hospedes)}
                      onChange={(e) => {
                        setHospedes(e.target.value);
                        setErros(er => ({ ...er, hospedes: undefined }));
                      }}
                    >
                      <option value="">Quantidade de pessoas</option>
                      {Array.from({ length: MAX_HOSPEDES }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} {num === 1 ? 'hóspede' : 'hóspedes'}</option>
                      ))}
                    </select>
                    {erros.hospedes && (
                      <p className="rc-res-erro" role="alert"><i className="bi bi-exclamation-circle" aria-hidden="true" /> {erros.hospedes}</p>
                    )}
                  </div>

                  {(erros.checkin || erros.checkout) && (
                    <p className="rc-res-erro" role="alert">
                      <i className="bi bi-exclamation-circle" aria-hidden="true" /> {erros.checkin || erros.checkout}
                    </p>
                  )}

                  {erros.conflito && (
                    <p className="rc-res-erro rc-res-alerta" role="alert">
                      <i className="bi bi-calendar-x" aria-hidden="true" /> {erros.conflito}
                    </p>
                  )}

                  {noites > 0 && (
                    <div className="rc-res-valores">
                      <div><span>{formatarMoeda(DIARIA)} × {noites} {noites === 1 ? 'noite' : 'noites'}</span><span>{formatarMoeda(subtotal)}</span></div>
                      <div><span>Taxa de limpeza</span><span>{formatarMoeda(TAXA_LIMPEZA)}</span></div>
                      {cupomAplicado && (
                        <div className="rc-res-desconto"><span>Desconto ({cupomAplicado.codigo})</span><span>-{formatarMoeda(desconto)}</span></div>
                      )}
                      <div className="rc-res-total"><span>Total</span><span>{formatarMoeda(total)}</span></div>
                    </div>
                  )}

                  {autenticado && noites > 0 && (
                    <div className="rc-res-campo">
                      {cupomAplicado ? (
                        <div className="rc-res-cupom-ok">
                          <span><i className="bi bi-tag-fill" aria-hidden="true" /> {cupomAplicado.codigo}</span>
                          <button type="button" onClick={removerCupom}>Remover</button>
                        </div>
                      ) : (
                        <>
                          <label htmlFor="res-cupom">Cupom de desconto</label>
                          <div className="rc-res-cupom">
                            <input
                              id="res-cupom"
                              type="text"
                              placeholder="Código do cupom"
                              value={cupomInput}
                              onChange={(e) => setCupomInput(e.target.value)}
                              disabled={validandoCupom}
                              style={{ textTransform: 'uppercase' }}
                            />
                            <button type="button" className="rc-btn rc-btn-line" onClick={aplicarCupom} disabled={validandoCupom}>
                              {validandoCupom ? 'Validando...' : 'Aplicar'}
                            </button>
                          </div>
                          {erroCupom && (
                            <p className="rc-res-erro" role="alert"><i className="bi bi-exclamation-circle" aria-hidden="true" /> {erroCupom}</p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {autenticado && (
                    <div className="rc-res-campo">
                      <label htmlFor="res-obs">Observações (opcional)</label>
                      <textarea
                        id="res-obs"
                        rows={2}
                        value={observacoes}
                        onChange={e => setObservacoes(e.target.value)}
                        placeholder="Ex: Berço, pet, chegada noturna..."
                      />
                    </div>
                  )}

                  {erros.geral && (
                    <p className="rc-res-erro rc-res-alerta" role="alert">{erros.geral}</p>
                  )}

                  {autenticado ? (
                    <button type="button" className="rc-btn rc-btn-primary rc-res-cta" onClick={handleSubmit}>
                      Solicitar reserva
                    </button>
                  ) : (
                    <>
                      <button type="button" className="rc-btn rc-btn-dark rc-res-cta" onClick={irParaLogin}>
                        <i className="bi bi-person-circle" aria-hidden="true" /> Faça login para reservar
                      </button>
                      <p className="rc-res-nota-pequena">Você pode ver datas e valores sem fazer login.</p>
                    </>
                  )}
                </>
              )}

              <ul className="rc-res-beneficios">
                <li><i className="bi bi-check-circle-fill" aria-hidden="true" /> Cancelamento gratuito até 7 dias antes</li>
                <li><i className="bi bi-check-circle-fill" aria-hidden="true" /> Sem taxas extras do Airbnb</li>
              </ul>

              {autenticado && reservaOnline && (
                <p className="rc-res-usuario">
                  <i className="bi bi-person-check-fill" aria-hidden="true" /> Reservando como <strong>{usuario.nome}</strong>
                </p>
              )}
            </div>
          </aside>
        </div>

        <section className="rc-res-bloco rc-res-avaliacoes">
          <h2>
            <i className="bi bi-star-fill" aria-hidden="true" />{' '}
            {notaGoogle
              ? `${notaMedia.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} · ${totalGoogle} avaliações no Google`
              : `${depoimentos.length} avaliações de hóspedes`}
          </h2>
          <div className="rc-rev">
            {depoimentos.slice(0, 6).map(dep => (
              <figure className="rc-q" key={dep.id}>
                <span className="rc-stars" role="img" aria-label={`${dep.estrelas} de 5 estrelas`}>{'★'.repeat(dep.estrelas)}</span>
                <blockquote style={{ margin: 0 }}><p>“{dep.texto}”</p></blockquote>
                <figcaption className="rc-who"><b>{dep.nome}</b>{dep.local}</figcaption>
              </figure>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

export default Reserva;
