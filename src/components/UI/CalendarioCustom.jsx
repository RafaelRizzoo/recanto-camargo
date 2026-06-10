import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { verificarSeFeriado } from '../../utils/feriados';

const CHAVE_RESERVAS = 'recanto_camargo_reservas';

function CalendarioCustom({ valor, onChange, minDate }) {
  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null;
    let classes = [];
    
    const dIso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const reservas = JSON.parse(localStorage.getItem(CHAVE_RESERVAS) || '[]');
    const isBooked = reservas.some(r => r.status !== 'cancelada' && dIso >= r.checkin && dIso < r.checkout);
    
    if (isBooked) classes.push('react-calendar__tile--reservado');
    if (verificarSeFeriado(date)) classes.push('dia-feriado');
    if (date.getDay() === 0 || date.getDay() === 6) classes.push('dia-fim-semana');
    
    return classes.join(' ');
  };

  const tileDisabled = ({ date, view }) => {
    if (view !== 'month') return false;
    const dIso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const reservas = JSON.parse(localStorage.getItem(CHAVE_RESERVAS) || '[]');
    return reservas.some(r => r.status !== 'cancelada' && dIso >= r.checkin && dIso < r.checkout);
  };

  return (
    <>
      <Calendar
        className="custom-calendar-home"
        onChange={onChange}
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
        <div className="legenda-item"><div className="legenda-cor feriado"></div> Feriado</div>
      </div>
    </>
  );
}

export default CalendarioCustom;
