import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { usePreferencias } from '../hooks/usePreferencias';
import { API_BASE } from '../utils/api';
import '../components/home/home.css';
import './ReservaConcluida.css';
import './Pagamento.css';

const INTERVALO_POLLING_MS = 5000;

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarContagem(segundos) {
  const s = Math.max(0, segundos);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

async function lerJson(resposta) {
  return resposta.json().catch(() => null);
}

// Checkout Transparente (Payment Brick): cartão e Pix dentro do site, sem redirecionar o cliente.
// O Checkout Pro (redirecionamento ao Mercado Pago) continua disponível como alternativa.
function Pagamento() {
  const { t, tema } = usePreferencias();
  const { id } = useParams();
  const navigate = useNavigate();

  // carregando | pagando | pix | analise | indisponivel | erro
  const [fase, setFase] = useState('carregando');
  const [checkout, setCheckout] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [erroPagamento, setErroPagamento] = useState('');
  const [pix, setPix] = useState(null);
  const [restante, setRestante] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [abrindoMP, setAbrindoMP] = useState(false);
  const montado = useRef(true);

  const irParaConcluida = useCallback(() => {
    navigate(`/ReservaConcluida/${id}?pago=1`, { replace: true });
  }, [navigate, id]);

  // 1) Dados do checkout (valor SEMPRE vindo do banco + chave pública)
  useEffect(() => {
    montado.current = true;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/pagamentos/checkout/${id}`, { credentials: 'include' });
        const dados = await lerJson(resp);
        if (!montado.current) return;
        if (!resp.ok) {
          setMensagem(dados?.error || t('Não foi possível carregar o pagamento desta reserva.'));
          setFase('erro');
          return;
        }
        if (dados.reservaStatus === 'CONFIRMADA') {
          irParaConcluida();
          return;
        }
        setCheckout(dados);
        if (dados.publicKey) {
          initMercadoPago(dados.publicKey, { locale: 'pt-BR' });
          setFase('pagando');
        } else {
          setFase('indisponivel');
        }
      } catch (err) {
        console.error('Erro ao carregar checkout:', err);
        if (!montado.current) return;
        setMensagem(t('Não foi possível carregar o pagamento desta reserva.'));
        setFase('erro');
      }
    })();
    return () => { montado.current = false; };
  }, [id, irParaConcluida, t]);

  // 2) Envio do Payment Brick -> backend. Rejeitar a promise reabilita o formulário para nova tentativa.
  const aoEnviar = useCallback(async ({ formData }) => {
    setErroPagamento('');
    let resp;
    let dados;
    try {
      resp = await fetch(`${API_BASE}/api/pagamentos/processar/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ formData })
      });
      dados = await lerJson(resp);
    } catch (err) {
      console.error('Erro de rede ao processar pagamento:', err);
      setErroPagamento(t('Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.'));
      throw err;
    }

    if (!resp.ok) {
      setErroPagamento(dados?.error || t('Não foi possível processar o pagamento. Tente novamente.'));
      throw new Error(dados?.error || 'pagamento nao processado');
    }

    if (dados.status === 'approved') {
      irParaConcluida();
    } else if (dados.status === 'pending' && dados.pix) {
      setPix(dados.pix);
      setFase('pix');
    } else {
      setMensagem(dados.mensagem || t('Pagamento em análise. Você será avisado assim que for confirmado.'));
      setFase('analise');
    }
  }, [id, irParaConcluida, t]);

  // 3) Pix: contagem regressiva da validade
  useEffect(() => {
    if (fase !== 'pix' || !pix?.expiraEm) return undefined;
    const fim = new Date(pix.expiraEm).getTime();
    if (Number.isNaN(fim)) return undefined;
    const atualizar = () => setRestante(Math.max(0, Math.round((fim - Date.now()) / 1000)));
    atualizar();
    const timer = setInterval(atualizar, 1000);
    return () => clearInterval(timer);
  }, [fase, pix]);

  const pixExpirado = fase === 'pix' && restante === 0;

  // 4) Pix/análise: consulta o status a cada ~5 s até confirmar (o webhook é a fonte de verdade)
  useEffect(() => {
    if ((fase !== 'pix' && fase !== 'analise') || pixExpirado) return undefined;
    let ativo = true;
    const consultar = async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/pagamentos/status/${id}`, { credentials: 'include' });
        const dados = await lerJson(resp);
        if (ativo && resp.ok && dados?.reservaStatus === 'CONFIRMADA') irParaConcluida();
      } catch (err) {
        console.error('Erro ao consultar status do pagamento:', err);
      }
    };
    const timer = setInterval(consultar, INTERVALO_POLLING_MS);
    return () => { ativo = false; clearInterval(timer); };
  }, [fase, pixExpirado, id, irParaConcluida]);

  const copiarCodigo = useCallback(async () => {
    if (!pix?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (err) {
      console.error('Não foi possível copiar o código Pix:', err);
    }
  }, [pix]);

  const gerarNovoPix = useCallback(() => {
    setPix(null);
    setRestante(null);
    setErroPagamento('');
    setFase('pagando');
  }, []);

  // Alternativa: Checkout Pro (redireciona para o site do Mercado Pago)
  const abrirCheckoutPro = useCallback(async () => {
    try {
      setAbrindoMP(true);
      setErroPagamento('');
      const resp = await fetch(`${API_BASE}/api/pagamentos/criar-preferencia/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const dados = await lerJson(resp);
      if (!resp.ok) throw new Error(dados?.error || t('Não foi possível gerar a preferência de pagamento.'));
      const link = dados?.initPoint || dados?.sandboxInitPoint;
      if (!link) throw new Error(t('Link de pagamento não retornado pela operadora.'));
      window.open(link, '_blank');
    } catch (err) {
      console.error('Erro ao abrir Checkout Pro:', err);
      setErroPagamento(err.message || t('Erro ao abrir o checkout.'));
    } finally {
      setAbrindoMP(false);
    }
  }, [id, t]);

  // Somente desenvolvimento: o backend só habilita com PAGAMENTO_SIMULADO=true
  const simularAprovacao = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/pagamentos/simular-aprovacao/${id}`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!resp.ok) throw new Error((await lerJson(resp))?.error || 'Falha ao simular.');
      irParaConcluida();
    } catch (err) {
      setErroPagamento(err.message);
    }
  }, [id, irParaConcluida]);

  const initialization = useMemo(
    () => ({ amount: Number(checkout?.valor || 0), payer: checkout?.email ? { email: checkout.email } : undefined }),
    [checkout]
  );
  const customization = useMemo(() => ({
    paymentMethods: { creditCard: 'all', bankTransfer: 'all', maxInstallments: 12 },
    visual: { style: { theme: tema === 'escuro' ? 'dark' : 'default' } }
  }), [tema]);

  const aoFalharBrick = useCallback((erro) => {
    console.error('Erro no Payment Brick:', erro);
    setErroPagamento(t('Não foi possível carregar o formulário de pagamento. Use o checkout do Mercado Pago abaixo.'));
  }, [t]);

  const alternativas = (
    <div className="pg-alternativas">
      <button type="button" className="rc-link-inline" onClick={abrirCheckoutPro} disabled={abrindoMP}>
        {abrindoMP ? t('Abrindo...') : t('Prefiro pagar no site do Mercado Pago')}
      </button>
      {checkout?.simuladoDisponivel && (
        <button type="button" className="rc-link-inline pg-dev" onClick={simularAprovacao}>
          {t('Simular aprovação (somente desenvolvimento)')}
        </button>
      )}
    </div>
  );

  const cabecalho = (
    <Link to="/" className="rc-conc-marca fonte-logo">Recanto Camargo</Link>
  );

  if (fase === 'carregando') {
    return (
      <div className="rc-home rc-concluida">
        <div className="rc-conc-card rc-conc-estado" role="status" aria-live="polite">
          <span className="spinner-border" aria-hidden="true" />
          <p>{t('Preparando o pagamento...')}</p>
        </div>
      </div>
    );
  }

  if (fase === 'erro') {
    return (
      <div className="rc-home rc-concluida">
        <div className="rc-conc-card rc-conc-estado" role="alert">
          {cabecalho}
          <i className="bi bi-exclamation-circle rc-conc-icone-erro" aria-hidden="true" />
          <h1>{t('Pagamento indisponível')}</h1>
          <p>{mensagem}</p>
          <button type="button" className="rc-btn rc-btn-primary" onClick={() => navigate('/DashboardCliente')}>
            {t('Voltar ao meu painel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rc-home rc-concluida">
      <div className="rc-conc-card pg-card">
        {cabecalho}
        <h1>{t('Pagamento da reserva')}</h1>
        <p className="rc-conc-texto">
          {t('Reserva #{id}', { id: checkout?.reservaId })} · <strong>{formatarMoeda(checkout?.valor)}</strong>
        </p>

        {erroPagamento && (
          <div className="pg-aviso pg-aviso-erro" role="alert">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" /> {erroPagamento}
          </div>
        )}

        {fase === 'pagando' && (
          <>
            <div className="pg-brick">
              <Payment
                initialization={initialization}
                customization={customization}
                onSubmit={aoEnviar}
                onError={aoFalharBrick}
                locale="pt"
              />
            </div>
            {alternativas}
          </>
        )}

        {fase === 'indisponivel' && (
          <>
            <p className="rc-conc-texto">
              {t('O pagamento dentro do site não está disponível agora. Você pode pagar pelo checkout do Mercado Pago.')}
            </p>
            <button type="button" className="rc-btn rc-btn-primary" onClick={abrirCheckoutPro} disabled={abrindoMP}>
              <i className="bi bi-credit-card-2-front" aria-hidden="true" /> {abrindoMP ? t('Abrindo...') : t('Pagar no Mercado Pago')}
            </button>
            {checkout?.simuladoDisponivel && alternativas}
          </>
        )}

        {fase === 'pix' && pix && (
          <div className="pg-pix">
            {pixExpirado ? (
              <>
                <div className="pg-aviso pg-aviso-erro" role="alert">
                  <i className="bi bi-clock-history" aria-hidden="true" /> {t('O Pix expirou. Gere um novo código para pagar.')}
                </div>
                <button type="button" className="rc-btn rc-btn-primary" onClick={gerarNovoPix}>
                  {t('Gerar novo Pix')}
                </button>
              </>
            ) : (
              <>
                <p className="rc-conc-texto">{t('Escaneie o QR Code no app do seu banco ou copie o código Pix.')}</p>
                {pix.qrCodeBase64 && (
                  <img
                    className="pg-qr"
                    src={`data:image/png;base64,${pix.qrCodeBase64}`}
                    alt={t('QR Code para pagamento via Pix')}
                    width="220"
                    height="220"
                  />
                )}
                <div className="pg-copia">
                  <input type="text" readOnly value={pix.qrCode} aria-label={t('Código Pix copia e cola')} onFocus={(e) => e.target.select()} />
                  <button type="button" className="rc-btn rc-btn-primary" onClick={copiarCodigo}>
                    <i className={`bi ${copiado ? 'bi-check2' : 'bi-clipboard'}`} aria-hidden="true" /> {copiado ? t('Copiado!') : t('Copiar código')}
                  </button>
                </div>
                {restante !== null && (
                  <p className="pg-validade" role="timer" aria-live="off">
                    <i className="bi bi-hourglass-split" aria-hidden="true" /> {t('Expira em')} <strong>{formatarContagem(restante)}</strong>
                  </p>
                )}
                <p className="pg-espera" role="status" aria-live="polite">
                  <span className="spinner-border spinner-border-sm" aria-hidden="true" /> {t('Aguardando a confirmação do pagamento...')}
                </p>
                {pix.ticketUrl && (
                  <a className="rc-link-inline" href={pix.ticketUrl} target="_blank" rel="noopener noreferrer">
                    {t('Abrir página do Pix')}
                  </a>
                )}
              </>
            )}
          </div>
        )}

        {fase === 'analise' && (
          <div className="pg-pix">
            <p className="rc-conc-texto" role="status" aria-live="polite">
              <span className="spinner-border spinner-border-sm" aria-hidden="true" /> {mensagem}
            </p>
            <button type="button" className="rc-btn rc-btn-primary" onClick={() => navigate('/DashboardCliente')}>
              {t('Ir para o meu painel')}
            </button>
          </div>
        )}

        {fase !== 'pagando' && fase !== 'indisponivel' && fase !== 'analise' && !pixExpirado && fase !== 'pix' && alternativas}

        <button type="button" className="rc-link-inline pg-voltar" onClick={() => navigate('/DashboardCliente')}>
          {t('Voltar ao meu painel')}
        </button>
      </div>
    </div>
  );
}

export default Pagamento;
