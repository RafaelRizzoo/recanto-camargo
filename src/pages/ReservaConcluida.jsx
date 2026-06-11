import { useEffect, useState } from 'react';
import { Container, Button, Card } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';

const CHAVE_RESERVAS = 'recanto_camargo_reservas';

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
    try {
      const reservasStr = localStorage.getItem(CHAVE_RESERVAS);
      if (!reservasStr) throw new Error('Nenhuma reserva encontrada');
      const reservas = JSON.parse(reservasStr);
      const res = reservas.find(r => r.id.toString() === id);
      if (!res) throw new Error('Reserva não encontrada');
      setReserva(res);
    } catch {
      setErro(true);
    }
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
    <div className="py-5" style={{ backgroundColor: '#f4f7fb', minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
      <Container>
        <Card className="border-0 shadow-lg mx-auto" style={{ maxWidth: '600px', borderRadius: '24px', overflow: 'hidden' }}>
          {/* Header Superior Premium */}
          <div style={{ backgroundColor: '#1a3c6d', padding: '40px 20px', textAlign: 'center', color: '#fff' }}>
            <div 
              style={{
                width: '80px', height: '80px', backgroundColor: '#4caf50', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto',
                boxShadow: '0 0 0 10px rgba(76, 175, 80, 0.2)'
              }}
            >
              <i className="bi bi-check-lg" style={{ fontSize: '3rem', color: '#fff' }} />
            </div>
            <h2 style={{ fontWeight: 700, margin: 0, fontSize: '2rem' }}>Reserva Solicitada!</h2>
            <p style={{ opacity: 0.9, marginTop: '10px', fontSize: '1.1rem' }}>Falta pouco para garantir seus momentos inesquecíveis.</p>
          </div>

          {/* Corpo do Recibo */}
          <Card.Body className="p-4 p-md-5 bg-white position-relative">
            {/* Efeito visual "denteado" de recibo */}
            <div style={{ position: 'absolute', top: '-10px', left: 0, right: 0, height: '20px', background: 'radial-gradient(circle at 10px 0, transparent 10px, white 11px) repeat-x 0 0', backgroundSize: '20px 20px' }}></div>
            
            <h5 className="text-muted mb-4 text-center fw-bold text-uppercase" style={{ letterSpacing: '1px' }}>Detalhes da Reserva</h5>
            
            <div className="d-flex justify-content-between mb-3 pb-3 border-bottom border-light">
              <span className="text-muted">Código</span>
              <strong style={{ color: '#1a3c6d' }}>#{reserva.id}</strong>
            </div>
            <div className="d-flex justify-content-between mb-3 pb-3 border-bottom border-light">
              <span className="text-muted">Hóspede</span>
              <strong style={{ color: '#1a3c6d' }}>{reserva.nome}</strong>
            </div>
            <div className="d-flex justify-content-between mb-3 pb-3 border-bottom border-light">
              <span className="text-muted">Check-in</span>
              <strong style={{ color: '#1a3c6d' }}>{formatarData(reserva.checkin)} a partir das 12h</strong>
            </div>
            <div className="d-flex justify-content-between mb-3 pb-3 border-bottom border-light">
              <span className="text-muted">Check-out</span>
              <strong style={{ color: '#1a3c6d' }}>{formatarData(reserva.checkout)} até as 10h</strong>
            </div>
            
            {/* Bloco de Valor Destacado */}
            <div className="mt-4 p-4 rounded text-center" style={{ backgroundColor: '#fff3e0', border: '1px solid #ffe0b2' }}>
              <span className="text-muted d-block mb-1">Valor Total</span>
              <h1 className="mb-0" style={{ color: '#f37321', fontWeight: 800 }}>{formatarMoeda(reserva.total)}</h1>
            </div>



            <div className="text-center mt-4">
              <Button
                variant="link"
                className="text-muted text-decoration-none"
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
