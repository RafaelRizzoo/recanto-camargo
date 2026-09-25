import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { verificarSeFeriado } from '../../utils/feriados';
import { API_BASE, IS_API_AVAILABLE } from '../../utils/api';

const CHAVE_RESERVAS = 'recanto_camargo_reservas';

function CalendarioCustom({ valor, onChange, minDate }) {
  const [reservas, setReservas] = useState([]);

  useEffect(() => {
    if (IS_API_AVAILABLE) {
      fetch(`${API_BASE}/api/reservas/datas-ocupadas`)
        .then(res => res.json())
        .then(data => setReservas(Array.isArray(data) ? data : []))
        .catch(err => console.error('Erro ao carregar datas ocupadas:', err));
    } else {
      try {
        const locais = JSON.parse(localStorage.getItem(CHAVE_RESERVAS) || '[]');
        setReservas(Array.isArray(locais) ? locais : []);
      } catch {
        setReservas([]);
      }
    }
  }, []);

  const handleCalendarChange = (range) => {
    if (Array.isArray(range) && range[0] && range[1]) {
      const startIso = new Date(range[0].getTime() - range[0].getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const endIso = new Date(range[1].getTime() - range[1].getTimezoneOffset() * 60000).toISOString().split('T')[0];
      
      const conflito = reservas.some(r => {
        if (r.status === 'cancelada') return false;
        return startIso < r.checkout && endIso > r.checkin;
      });

      if (conflito) {
        alert('O período selecionado cruza com datas já reservadas. Por favor, ajuste sua seleção.');
        return;
      }
    }
    onChange?.(range);
  };

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null;
    let classes = [];
    
    const dIso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    // Dia inteiramente ocupado (no meio de uma reserva ou com troca no mesmo dia)
    const ocupadoMeio = reservas.some(r => r.status !== 'cancelada' && dIso > r.checkin && dIso < r.checkout);
    const temCheckin = reservas.some(r => r.status !== 'cancelada' && dIso === r.checkin);
    const temCheckout = reservas.some(r => r.status !== 'cancelada' && dIso === r.checkout);
    
    const isBooked = ocupadoMeio || (temCheckin && temCheckout);
    const isCheckin = !isBooked && temCheckin;
    const isCheckout = !isBooked && temCheckout;

    if (isBooked) classes.push('react-calendar__tile--reservado');
    else if (isCheckin) classes.push('dia-checkin-ocupado');
    else if (isCheckout) classes.push('dia-checkout-ocupado');

    if (verificarSeFeriado(date)) classes.push('dia-feriado');
    if (date.getDay() === 0 || date.getDay() === 6) classes.push('dia-fim-semana');
    
    return classes.join(' ');
  };

  const tileDisabled = ({ date, view }) => {
    if (view !== 'month') return false;
    const dIso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    const ocupadoMeio = reservas.some(r => r.status !== 'cancelada' && dIso > r.checkin && dIso < r.checkout);
    const temCheckin = reservas.some(r => r.status !== 'cancelada' && dIso === r.checkin);
    const temCheckout = reservas.some(r => r.status !== 'cancelada' && dIso === r.checkout);
    
    return ocupadoMeio || (temCheckin && temCheckout);
  };

  return (
    <>
      <Calendar
        className="custom-calendar-home"
        onChange={handleCalendarChange}
        value={valor}
        selectRange={true}
        minDate={minDate || new Date()}
        tileClassName={tileClassName}
        tileDisabled={tileDisabled}
        locale="pt-BR"
        showFixedNumberOfWeeks={true}
      />
      <div className="calendario-legenda mt-2 d-flex flex-wrap gap-2">
        <div className="legenda-item"><div className="legenda-cor selecionado"></div> Selecionado</div>
        <div className="legenda-item"><div className="legenda-cor reservado"></div> Indisponível</div>
        <div className="legenda-item"><div className="legenda-cor checkout-ocupado"></div> Saída</div>
        <div className="legenda-item"><div className="legenda-cor checkin-ocupado"></div> Entrada</div>
        <div className="legenda-item"><div className="legenda-cor feriado"></div> Feriado</div>
      </div>
    </>
  );
}

export default CalendarioCustom;
