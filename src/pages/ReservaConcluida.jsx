import { useEffect, useState } from 'react';
import { usePreferencias } from '../hooks/usePreferencias';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_BASE } from '../utils/api';
import '../components/home/home.css';
import './ReservaConcluida.css';

function formatarData(dataISO) {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ReservaConcluida() {
  const { t } = usePreferencias();
  const { id } = useParams();
  const navigate = useNavigate();
  const [reserva, setReserva] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const url = API_BASE ? `${API_BASE}/api/reservas/${id}` : `http://localhost:3000/api/reservas/${id}`;
    fetch(url, { credentials: 'include' })
      .then(resposta => {
        if (!resposta.ok) {
          throw new Error('Reserva não encontrada no Banco de Dados');
        }
        return resposta.json();
      })
      .then(dadosAPI => {
        // O MySQL devolve a data completa (ex: 2026-09-04T14:00:00.000Z)
        // Vamos extrair apenas a parte da data "YYYY-MM-DD" para a função de formatação não quebrar
        const checkinLimpo = dadosAPI.checkin.split('T')[0];
        const checkoutLimpo = dadosAPI.checkout.split('T')[0];
        
        setReserva({
          id: dadosAPI.id,
          nome: dadosAPI.nome,
          total: dadosAPI.total,
          checkin: checkinLimpo,
          checkout: checkoutLimpo
        });
      })
      .catch(err => {
        console.error('Erro ao carregar recibo:', err);
        setErro(true);
      });
  }, [id]);

  if (erro) {
    return (
      <div className="rc-home rc-concluida">
        <div className="rc-conc-card rc-conc-estado" role="alert">
          <Link to="/" className="rc-conc-marca fonte-logo">Recanto Camargo</Link>
          <i className="bi bi-exclamation-circle rc-conc-icone-erro" aria-hidden="true" />
          <h1>{t("Reserva não encontrada")}</h1>
          <p>{t("Não conseguimos localizar a reserva solicitada.")}</p>
          <Link to="/" className="rc-btn rc-btn-primary">{t("Voltar ao início")}</Link>
        </div>
      </div>
    );
  }

  if (!reserva) {
    return (
      <div className="rc-home rc-concluida">
        <div className="rc-conc-card rc-conc-estado" role="status" aria-live="polite">
          <span className="spinner-border" aria-hidden="true" />
          <p>{t("Carregando detalhes da reserva...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rc-home rc-concluida">
      <div className="rc-conc-card">
        <Link to="/" className="rc-conc-marca fonte-logo">Recanto Camargo</Link>

        <div className="rc-conc-selo" aria-hidden="true">
          <i className="bi bi-check-lg" />
        </div>
        <h1>{t("Reserva solicitada!")}</h1>
        <p className="rc-conc-texto">
          {t("A solicitação foi recebida para análise do proprietário. Acompanhe o status e realize o pagamento no seu painel.")}
        </p>

        <dl className="rc-conc-detalhes">
          <div><dt>{t("Código")}</dt><dd>#{reserva.id}</dd></div>
          <div><dt>{t("Hóspede")}</dt><dd>{reserva.nome}</dd></div>
          <div><dt>{t("Check-in")}</dt><dd>{formatarData(reserva.checkin)} <small>({t("a partir das 14h")})</small></dd></div>
          <div><dt>{t("Check-out")}</dt><dd>{formatarData(reserva.checkout)} <small>({t("até às 11h")})</small></dd></div>
        </dl>

        <div className="rc-conc-total">
          <span>{t("Valor total previsto")}</span>
          <strong>{formatarMoeda(reserva.total)}</strong>
        </div>

        <div className="rc-conc-acoes">
          <button type="button" className="rc-btn rc-btn-primary" onClick={() => navigate('/DashboardCliente')}>
            <i className="bi bi-speedometer2" aria-hidden="true" /> {t("Acompanhar no meu painel")}
          </button>
          <button type="button" className="rc-link-inline" onClick={() => navigate('/')}>
            {t("Voltar para a página inicial")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReservaConcluida;
