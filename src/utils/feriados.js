export function obterFeriados(ano) {
  const feriadosFixos = [
    '01-01', // Confraternização Universal
    '04-21', // Tiradentes
    '05-01', // Dia do Trabalho
    '07-09', // Revolução Constitucionalista (Estadual SP)
    '09-07', // Independência do Brasil
    '10-12', // Nossa Senhora Aparecida (Nacional e Padroeira de Aparecida)
    '11-02', // Finados
    '11-15', // Proclamação da República
    '11-20', // Consciência Negra
    '12-17', // Emancipação de Aparecida (Municipal)
    '12-25', // Natal
  ];

  // Cálculo da Páscoa (Algoritmo de Meeus/Jones/Butcher)
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mesPascoa = Math.floor((h + l - 7 * m + 114) / 31);
  const diaPascoa = ((h + l - 7 * m + 114) % 31) + 1;

  const pascoa = new Date(ano, mesPascoa - 1, diaPascoa);
  
  const sextaSanta = new Date(pascoa);
  sextaSanta.setDate(pascoa.getDate() - 2);
  
  const carnaval = new Date(pascoa);
  carnaval.setDate(pascoa.getDate() - 47);
  
  const corpusChristi = new Date(pascoa);
  corpusChristi.setDate(pascoa.getDate() + 60);

  const formatar = (d) => {
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${mes}-${dia}`;
  };

  const feriadosMoveis = [
    formatar(sextaSanta),
    formatar(carnaval),
    formatar(corpusChristi)
  ];

  return [...feriadosFixos, ...feriadosMoveis].map(d => `${ano}-${d}`);
}

export function verificarSeFeriado(data) {
  const ano = data.getFullYear();
  const feriadosDoAno = obterFeriados(ano);
  const dataStr = data.toISOString().split('T')[0];
  return feriadosDoAno.includes(dataStr);
}
