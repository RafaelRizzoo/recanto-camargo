const crypto = require('crypto');
const { MercadoPagoConfig, Preference, Payment, PaymentRefund } = require('mercadopago');

function obterClienteMercadoPago() {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken || !accessToken.trim()) {
        const erro = new Error('Gateway de pagamento não configurado: adicione MERCADO_PAGO_ACCESS_TOKEN no .env.');
        erro.status = 503;
        throw erro;
    }

    return new MercadoPagoConfig({
        accessToken: accessToken.trim(),
        options: { timeout: 7000 }
    });
}

/**
 * Cria uma Preferência de Pagamento no Mercado Pago (Checkout Pro)
 * @param {Object} reserva - Dados da reserva do banco (Res_Id, Res_ValorTotal, etc.)
 * @param {Object} usuario - Dados do hóspede pagador (Usu_Nome, Usu_Email)
 * @returns {Promise<{ preferenceId: string, initPoint: string, sandboxInitPoint: string }>}
 */
async function criarPreferenciaPagamento(reserva, usuario) {
    const client = obterClienteMercadoPago();
    const preference = new Preference(client);

    const valorTotal = Number(reserva.Res_ValorTotal);
    if (isNaN(valorTotal) || valorTotal <= 0) {
        const erro = new Error('Valor inválido para a reserva.');
        erro.status = 400;
        throw erro;
    }

    const appFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173/recanto-camargo/#';
    const appBackendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

    const preferenceBody = {
        items: [
            {
                id: String(reserva.Res_Id),
                title: `Reserva Chalé Recanto Camargo #${reserva.Res_Id}`,
                description: `Hospedagem no Recanto Camargo (Reserva #${reserva.Res_Id})`,
                quantity: 1,
                unit_price: valorTotal,
                currency_id: 'BRL'
            }
        ],
        payer: {
            name: usuario.Usu_Nome || 'Hóspede',
            email: usuario.Usu_Email || 'hospede@recantocamargo.com.br'
        },
        back_urls: {
            success: `${appFrontendUrl}/ReservaConcluida/${reserva.Res_Id}?pago=1`,
            failure: `${appFrontendUrl}/DashboardCliente`,
            pending: `${appFrontendUrl}/DashboardCliente`
        },
        notification_url: `${appBackendUrl}/api/pagamentos/webhook`,
        external_reference: String(reserva.Res_Id),
        payment_methods: {
            excluded_payment_types: [],
            installments: 12
        }
    };

    // Mercado Pago exige HTTPS para auto_return; em ambiente local (http://), não enviamos para evitar erro de validação da API
    if (preferenceBody.back_urls.success && preferenceBody.back_urls.success.startsWith('https://')) {
        preferenceBody.auto_return = 'approved';
    }

    const resultado = await preference.create({ body: preferenceBody });

    return {
        preferenceId: resultado.id,
        initPoint: resultado.init_point,
        sandboxInitPoint: resultado.sandbox_init_point || resultado.init_point
    };
}

/**
 * Consulta os detalhes de um pagamento no Mercado Pago pelo ID
 * @param {string|number} paymentId
 * @returns {Promise<Object>}
 */
async function consultarPagamento(paymentId) {
    const client = obterClienteMercadoPago();
    const payment = new Payment(client);
    return await payment.get({ id: String(paymentId) });
}

/**
 * Busca pagamento no Mercado Pago pelo ID da reserva (external_reference)
 * @param {string|number} reservaId
 * @returns {Promise<Object|null>}
 */
async function buscarPagamentoPorReserva(reservaId) {
    try {
        const client = obterClienteMercadoPago();
        const payment = new Payment(client);
        const res = await payment.search({
            options: {
                criteria: 'desc',
                external_reference: String(reservaId)
            }
        });
        if (res.results && res.results.length > 0) {
            return res.results[0];
        }
        return null;
    } catch (err) {
        console.error('Erro ao buscar pagamento por reserva:', err.message);
        return null;
    }
}

/**
 * Realiza o reembolso de um pagamento aprovado no Mercado Pago
 * @param {string|number} paymentId - ID da transação no Mercado Pago (ex: '182257126507')
 * @param {number|null} valorEstorno - Valor a ser reembolsado (se omitido ou null, efetua estorno total)
 * @returns {Promise<Object>} Resultado retornado pela API do Mercado Pago
 */
async function reembolsarPagamento(paymentId, valorEstorno = null) {
    const client = obterClienteMercadoPago();
    const paymentRefund = new PaymentRefund(client);

    const body = {};
    if (valorEstorno !== null && valorEstorno !== undefined && !isNaN(Number(valorEstorno)) && Number(valorEstorno) > 0) {
        body.amount = Number(Number(valorEstorno).toFixed(2));
    }

    try {
        const resultado = await paymentRefund.create({
            payment_id: String(paymentId),
            body
        });
        return resultado;
    } catch (erro) {
        console.error(`Erro ao processar estorno no Mercado Pago para o pagamento ${paymentId}:`, erro?.message || erro);
        throw erro;
    }
}

/**
 * Valida a assinatura (header x-signature) das notificações do Mercado Pago.
 * Manifesto: "id:<data.id em minúsculas>;request-id:<x-request-id>;ts:<ts>;" assinado com HMAC-SHA256.
 * @returns {{ valida: boolean, motivo?: string }}
 */
function validarAssinaturaWebhook({ headers = {}, query = {}, body = {} }, segredo = process.env.MERCADO_PAGO_WEBHOOK_SECRET) {
    if (!segredo || !segredo.trim()) {
        return { valida: false, motivo: 'segredo_nao_configurado' };
    }

    const assinatura = String(headers['x-signature'] || '');
    const requestId = String(headers['x-request-id'] || '');
    const partes = Object.fromEntries(
        assinatura.split(',').map(p => p.trim().split('=').map(s => s.trim())).filter(p => p.length === 2)
    );
    const { ts, v1 } = partes;
    if (!ts || !v1) return { valida: false, motivo: 'assinatura_ausente' };

    const dataId = String(query['data.id'] || body?.data?.id || '').toLowerCase();
    const manifesto = `${dataId ? `id:${dataId};` : ''}${requestId ? `request-id:${requestId};` : ''}ts:${ts};`;
    const esperado = crypto.createHmac('sha256', segredo.trim()).update(manifesto).digest('hex');

    const a = Buffer.from(esperado);
    const b = Buffer.from(v1);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return { valida: false, motivo: 'assinatura_invalida' };
    }
    return { valida: true };
}

/**
 * Cria um pagamento transparente (Payment Brick) na Payments API.
 * A chave de idempotência (X-Idempotency-Key) evita cobrança duplicada em reenvios/cliques duplos.
 * @param {Object} body - corpo conforme a Payments API (transaction_amount, token, payment_method_id, payer...)
 * @param {string} idempotencyKey
 */
async function criarPagamento(body, idempotencyKey) {
    const client = obterClienteMercadoPago();
    const payment = new Payment(client);
    return await payment.create({ body, requestOptions: { idempotencyKey } });
}

/**
 * Formata uma data para o padrão exigido pela API (yyyy-MM-dd'T'HH:mm:ss.SSSz), com fuso de Brasília (-03:00).
 */
function formatarDataMercadoPago(data) {
    const brasilia = new Date(data.getTime() - 3 * 60 * 60 * 1000);
    return brasilia.toISOString().replace('Z', '-03:00');
}

module.exports = {
    criarPagamento,
    formatarDataMercadoPago,
    validarAssinaturaWebhook,
    criarPreferenciaPagamento,
    consultarPagamento,
    buscarPagamentoPorReserva,
    reembolsarPagamento
};
