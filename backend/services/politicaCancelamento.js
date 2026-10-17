/**
 * Calcula a política de cancelamento e reembolso conforme Cláusula 4 dos Termos de Uso:
 * - Até 7 dias corridos antes do check-in: 100% de Reembolso
 * - Entre 6 e 2 dias antes do check-in (48h a 7 dias): 50% de Reembolso
 * - Menos de 48h antes do check-in: 0% de Reembolso (Retenção integral)
 *
 * @param {Date|string} dataCheckIn - Data de check-in da reserva
 * @param {number|string} valorTotal - Valor total pago na reserva
 * @param {Date} [dataReferencia=new Date()] - Momento do cancelamento
 * @returns {Object} Detalhes do cálculo
 */
function calcularPoliticaCancelamento(dataCheckIn, valorTotal, dataReferencia = new Date()) {
    const valorTotalNum = Math.max(0, Number(valorTotal) || 0);

    // Ajusta o horário do check-in para 14:00h do dia previsto (conforme Cláusula 2 dos Termos de Uso)
    const checkinDate = new Date(dataCheckIn);
    const ano = checkinDate.getUTCFullYear();
    const mes = checkinDate.getUTCMonth();
    const dia = checkinDate.getUTCDate();
    const dataCheckInHora = new Date(ano, mes, dia, 14, 0, 0, 0);

    const agora = new Date(dataReferencia);
    const diffMs = dataCheckInHora.getTime() - agora.getTime();
    const horasAntecedencia = Math.max(0, diffMs / (1000 * 60 * 60));
    const diasAntecedencia = Math.floor(horasAntecedencia / 24);

    let percentual = 0;
    let faixa = 'SEM_REEMBOLSO';
    let descricaoRegra = 'Menos de 48h antes do check-in: sem reembolso (retenção integral).';

    if (horasAntecedencia >= 7 * 24) { // >= 168 horas (7 dias ou mais)
        percentual = 100;
        faixa = 'INTEGRAL';
        descricaoRegra = 'Até 7 dias corridos antes do check-in: 100% de reembolso integral.';
    } else if (horasAntecedencia >= 48) { // entre 48h e 168h (2 a 7 dias)
        percentual = 50;
        faixa = 'PARCIAL';
        descricaoRegra = 'Entre 6 e 2 dias antes do check-in: 50% de reembolso (retenção de 50%).';
    } else {
        percentual = 0;
        faixa = 'SEM_REEMBOLSO';
        descricaoRegra = 'Menos de 48h antes do check-in: sem reembolso (retenção integral).';
    }

    const valorReembolso = Math.round((valorTotalNum * (percentual / 100)) * 100) / 100;
    const valorRetencao = Math.round((valorTotalNum - valorReembolso) * 100) / 100;

    return {
        horasAntecedencia: Number(horasAntecedencia.toFixed(1)),
        diasAntecedencia,
        percentual,
        faixa,
        descricaoRegra,
        valorTotal: valorTotalNum,
        valorReembolso,
        valorRetencao
    };
}

/**
 * Calcula o reembolso para cancelamento iniciado pelo PROPRIETÁRIO (Anfitrião):
 * - Como a iniciativa do cancelamento partiu do anfitrião, o hóspede tem direito a
 *   100% de reembolso integral imediato (retenção zero), independentemente do prazo.
 *
 * @param {number|string} valorTotal - Valor total da reserva
 * @returns {Object} Detalhes do cálculo para o proprietário
 */
function calcularCancelamentoProprietario(valorTotal) {
    const valorTotalNum = Math.max(0, Number(valorTotal) || 0);
    return {
        percentual: 100,
        faixa: 'INTEGRAL_PROPRIETARIO',
        descricaoRegra: 'Cancelamento pelo anfitrião: 100% de reembolso integral ao hóspede (retenção zero).',
        valorTotal: valorTotalNum,
        valorReembolso: valorTotalNum,
        valorRetencao: 0
    };
}

module.exports = { calcularPoliticaCancelamento, calcularCancelamentoProprietario };
