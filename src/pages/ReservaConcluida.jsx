import { useEffect, useState } from 'react';
import { Container, Button, Card } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_BASE, IS_API_AVAILABLE } from '../utils/api';

function formatarData(dataISO) {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ReservaConcluida() {
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
      <Container className="py-5 text-center mt-5">
        <h2 className="text-danger">Ops! Reserva não encontrada.</h2>
        <p className="text-muted">Não conseguimos localizar a reserva solicitada.</p>
        <Link to="/" className="btn btn-primary mt-3">Voltar ao Início</Link>
      </Container>
    );
  }

  if (!reserva) {
    return (
      <Container className="py-5 text-center mt-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3">Carregando detalhes da reserva...</p>
      </Container>
    );
  }

  return (
    <div style={{ backgroundColor: '#f4f7fb', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 0.75rem' }}>
      <Container className="d-flex justify-content-center">
        <Card className="border-0 shadow-lg" style={{ maxWidth: '520px', width: '100%', borderRadius: '20px', overflow: 'hidden' }}>
          {/* Header Superior Compacto & Elegante */}
          <div style={{ backgroundColor: '#1a3c6d', padding: '22px 20px 18px', textAlign: 'center', color: '#fff' }}>
            <div 
              style={{
                width: '54px', height: '54px', backgroundColor: '#4caf50', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto',
                boxShadow: '0 0 0 6px rgba(76, 175, 80, 0.2)'
              }}
            >
              <i className="bi bi-check-lg" style={{ fontSize: '2rem', color: '#fff' }} />
            </div>
            <h2 style={{ fontWeight: 700, margin: 0, fontSize: '1.45rem' }}>Reserva Solicitada!</h2>
            <p style={{ opacity: 0.9, marginTop: '6px', fontSize: '0.88rem', lineHeight: 1.4, marginBottom: 0 }}>
              A solicitação foi recebida para análise do proprietário. Acompanhe o status e realize o pagamento no seu painel.
            </p>
          </div>

          {/* Corpo do Recibo Compacto */}
          <Card.Body className="p-3 p-md-4 bg-white position-relative">
            {/* Efeito visual "denteado" de recibo */}
            <div style={{ position: 'absolute', top: '-10px', left: 0, right: 0, height: '20px', background: 'radial-gradient(circle at 10px 0, transparent 10px, white 11px) repeat-x 0 0', backgroundSize: '20px 20px' }}></div>
            
            <h6 className="text-muted mb-3 text-center fw-bold text-uppercase small" style={{ letterSpacing: '0.8px', fontSize: '0.78rem' }}>
              Detalhes da Reserva
            </h6>
            
            <div className="d-flex justify-content-between mb-2 pb-2 border-bottom border-light small">
              <span className="text-muted">Código</span>
              <strong style={{ color: '#1a3c6d' }}>#{reserva.id}</strong>
            </div>
            <div className="d-flex justify-content-between mb-2 pb-2 border-bottom border-light small">
              <span className="text-muted">Hóspede</span>
              <strong style={{ color: '#1a3c6d' }}>{reserva.nome}</strong>
            </div>
            <div className="d-flex justify-content-between mb-2 pb-2 border-bottom border-light small">
              <span className="text-muted">Check-in</span>
              <strong style={{ color: '#1a3c6d' }}>{formatarData(reserva.checkin)} (a partir das 12h)</strong>
            </div>
            <div className="d-flex justify-content-between mb-2 pb-2 border-bottom border-light small">
              <span className="text-muted">Check-out</span>
              <strong style={{ color: '#1a3c6d' }}>{formatarData(reserva.checkout)} (até as 10h)</strong>
            </div>
            
            {/* Bloco de Valor Horizontal Compacto */}
            <div className="mt-3 p-2 px-3 rounded d-flex align-items-center justify-content-between" style={{ backgroundColor: '#fff3e0', border: '1px solid #ffe0b2' }}>
              <span className="text-muted fw-semibold small">Valor Total Previsto</span>
              <span style={{ color: '#f37321', fontWeight: 800, fontSize: '1.35rem' }}>{formatarMoeda(reserva.total)}</span>
            </div>

            {/* Ações */}
            <div className="d-flex flex-column gap-2 mt-3 pt-1">
              <Button
                variant="primary"
                onClick={() => navigate('/DashboardCliente')}
                style={{ borderRadius: '50px', background: '#ff9211', borderColor: '#ff9211', fontWeight: 700, padding: '0.55rem 1.25rem' }}
                className="d-inline-flex align-items-center justify-content-center shadow-sm"
              >
                <i className="bi bi-speedometer2 me-2" /> Acompanhar no Meu Painel
              </Button>
              <Button
                variant="link"
                className="text-muted text-decoration-none small py-1"
                onClick={() => navigate('/')}
                style={{ fontWeight: 600 }}
              >
                Voltar para a página inicial
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}

export default ReservaConcluida;
