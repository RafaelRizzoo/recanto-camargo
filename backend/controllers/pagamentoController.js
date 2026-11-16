const crypto = require('crypto');
const db = require('../config/db');
const {
    criarPreferenciaPagamento,
    criarPagamento,
    consultarPagamento,
    buscarPagamentoPorReserva,
    reembolsarPagamento,
    validarAssinaturaWebhook,
    formatarDataMercadoPago
} = require('../services/mercadoPagoService');

/**
 * Confere se o valor pago no Mercado Pago bate com o total da reserva (tolerância de 1 centavo),
 * evitando confirmar uma reserva com pagamento de valor menor.
 */
async function valorPagoConfere(reservaId, pagamentoMP) {
    const [linhas] = await db.query(`SELECT Res_ValorTotal FROM res_reserva WHERE Res_Id = ?`, [reservaId]);
    if (linhas.length === 0) return false;
    const esperado = Number(linhas[0].Res_ValorTotal);
    const pago = Number(pagamentoMP.transaction_amount);
    if (!Number.isFinite(esperado) || !Number.isFinite(pago) || Math.abs(esperado - pago) > 0.01) {
        console.error(`Pagamento ${pagamentoMP.id} ignorado: valor pago (${pagamentoMP.transaction_amount}) difere do total da reserva ${reservaId} (${linhas[0].Res_ValorTotal}).`);
        return false;
    }
    return true;
}

const PIX_VALIDADE_MINUTOS = 30; // mínimo aceito pela API do Mercado Pago
const PIX_MARGEM_SEGUNDOS = 60;  // folga para relógio/latência não ficar abaixo do mínimo

/**
 * Converte o método do Mercado Pago para o valor gravado em pag_pagamento.Pag_Metodo.
 * Aceita o objeto do pagamento ({ payment_type_id, payment_method_id }) ou, por compatibilidade,
 * apenas uma string (ex.: 'PIX', 'visa', 'bolbradesco').
 * O payment_type_id é a fonte confiável: elo/hipercard/amex também são credit_card.
 */
function mapearMetodoBanco(metodo) {
    const tipo = metodo && typeof metodo === 'object' ? String(metodo.payment_type_id || '').toLowerCase() : '';
    if (tipo === 'credit_card') return 'CARTAO_CREDITO';
    // O enum de Pag_Metodo conhecido no código não tem débito; o Brick está configurado sem débito.
    if (tipo === 'debit_card') return 'CARTAO_CREDITO';
    if (tipo === 'bank_transfer') return 'PIX';
    if (tipo === 'ticket') return 'BOLETO';

    // Compatibilidade com chamadas antigas (simularAprovacao, Checkout Pro sem payment_type_id)
    const bruto = metodo && typeof metodo === 'object' ? metodo.payment_method_id : metodo;
    const m = String(bruto || '').toLowerCase();
    if (m.includes('card') || m.includes('credit') || m.includes('master') || m.includes('visa')) return 'CARTAO_CREDITO';
    if (m.includes('bol')) return 'BOLETO';
    return 'PIX';
}

/**
 * Grava (insere ou atualiza) o pagamento da reserva em pag_pagamento.
 */
async function gravarPagamento(reservaId, status, metodoBanco, valor, transacaoId) {
    const [pagamentos] = await db.query(
        `SELECT Pag_Id FROM pag_pagamento WHERE Res_Id = ?`,
        [reservaId]
    );

    if (pagamentos.length === 0) {
        await db.query(
            `INSERT INTO pag_pagamento
             (Res_Id, Pag_Metodo, Pag_Status, Pag_Valor, Pag_DataHora, Pag_TransacaoId)
             VALUES (?, ?, ?, ?, NOW(), ?)`,
            [reservaId, metodoBanco, status, valor, String(transacaoId)]
        );
    } else {
        await db.query(
            `UPDATE pag_pagamento
             SET Pag_Status = ?, Pag_Metodo = ?, Pag_TransacaoId = ?, Pag_Valor = ?, Pag_DataHora = NOW()
             WHERE Res_Id = ?`,
            [status, metodoBanco, String(transacaoId), valor, reservaId]
        );
    }
}

/**
 * Pagamento aprovado para uma reserva que já foi CANCELADA/RECUSADA (ex.: Pix pago depois da expiração
 * da reserva). As datas podem já estar com outro hóspede, então a reserva NÃO é reconfirmada: o valor é
 * estornado por completo. Se o estorno falhar, o pagamento fica APROVADO para tratamento manual.
 * Idempotente: um estorno já registrado para a mesma transação não é repetido.
 */
async function tratarPagamentoDeReservaInativa(reservaId, transacaoId, metodoBanco, valor) {
    const [anterior] = await db.query(
        `SELECT Pag_Status, Pag_TransacaoId FROM pag_pagamento WHERE Res_Id = ?`,
        [reservaId]
    );
    if (anterior[0] && anterior[0].Pag_Status === 'REEMBOLSADO' && String(anterior[0].Pag_TransacaoId) === String(transacaoId)) {
        return { confirmada: false, motivo: 'reserva_inativa', estornado: true };
    }

    let estornado = false;
    let reembolsoId = null;
    if (!String(transacaoId).startsWith('SIM_')) { // pagamento simulado não existe no Mercado Pago
        try {
            const resultado = await reembolsarPagamento(transacaoId);
            reembolsoId = resultado?.id ? String(resultado.id) : null;
            estornado = true;
        } catch (erro) {
            console.error(`ATENÇÃO: pagamento ${transacaoId} aprovado para a reserva inativa #${reservaId} e o estorno automático falhou. Estorne manualmente.`, erro?.message || erro);
        }
    }

    await gravarPagamento(reservaId, estornado ? 'REEMBOLSADO' : 'APROVADO', metodoBanco, valor, transacaoId);
    if (estornado) {
        await db.query(
            `UPDATE pag_pagamento SET Pag_ValorReembolsado = ?, Pag_ReembolsoId = ? WHERE Res_Id = ?`,
            [valor, reembolsoId, reservaId]
        );
    }
    console.warn(`Reserva #${reservaId} inativa recebeu pagamento ${transacaoId}: ${estornado ? 'estornado integralmente' : 'estorno pendente (manual)'}.`);
    return { confirmada: false, motivo: 'reserva_inativa', estornado };
}

/**
 * Helper para efetivar a aprovação de pagamento de uma reserva no banco.
 * Idempotente: a confirmação da reserva é atômica, então notificações/e-mails saem uma única vez
 * mesmo que o mesmo pagamento seja processado duas vezes (webhook repetido, polling + webhook).
 * Reserva CANCELADA/RECUSADA nunca é reconfirmada: o pagamento é estornado.
 * @param {string|number} reservaId
 * @param {string|number} transacaoId
 * @param {string|{payment_type_id?: string, payment_method_id?: string}} metodo
 * @returns {Promise<{ confirmada: boolean, motivo?: string, estornado?: boolean }>}
 */
async function efetivarAprovacaoPagamento(reservaId, transacaoId, metodo = 'PIX', app = null) {
    const metodoBanco = mapearMetodoBanco(metodo);

    const [valores] = await db.query(`SELECT Res_ValorTotal, Res_Status FROM res_reserva WHERE Res_Id = ?`, [reservaId]);
    const valorReserva = valores.length > 0 ? Number(valores[0].Res_ValorTotal) || 0 : 0;

    if (valores.length > 0 && (valores[0].Res_Status === 'CANCELADA' || valores[0].Res_Status === 'RECUSADA')) {
        return tratarPagamentoDeReservaInativa(reservaId, transacaoId, metodoBanco, valorReserva);
    }

    await gravarPagamento(reservaId, 'APROVADO', metodoBanco, valorReserva, transacaoId);

    const [reservaAtual] = await db.query(
        `SELECT r.Res_Status, r.Hos_Hospede_Usu_Id, r.Res_ValorTotal,
                u.Usu_Nome AS hospedeNome,
                u.Usu_Email AS hospedeEmail,
                i.Pro_Proprietario_Usu_Id,
                prop.Usu_Email AS proprietarioEmail
         FROM res_reserva r
         LEFT JOIN usu_usuario u ON u.Usu_Id = r.Hos_Hospede_Usu_Id
         LEFT JOIN imo_imovel i ON i.Imo_Id = r.Imo_Id
         LEFT JOIN usu_usuario prop ON prop.Usu_Id = i.Pro_Proprietario_Usu_Id
         WHERE r.Res_Id = ?`,
        [reservaId]
    );

    if (reservaAtual.length > 0 && reservaAtual[0].Res_Status !== 'CONFIRMADA') {
        const dadosReserva = reservaAtual[0];
        const statusAnterior = dadosReserva.Res_Status;
        // Transição atômica: só quem de fato mudou o status segue para histórico, notificações e e-mails.
        const [atualizacao] = await db.query(
            `UPDATE res_reserva SET Res_Status = 'CONFIRMADA' WHERE Res_Id = ? AND Res_Status NOT IN ('CONFIRMADA', 'CANCELADA', 'RECUSADA')`,
            [reservaId]
        );
        if (!atualizacao || !atualizacao.affectedRows) return { confirmada: true };

        await db.query(
            `INSERT INTO his_historicoreservastatus 
             (Res_Id, His_DataAlteracao, His_StatusAnterior, His_StatusAtual, His_Motivo)
             VALUES (?, NOW(), ?, 'CONFIRMADA', 'Pagamento aprovado via Mercado Pago')`,
            [reservaId, statusAnterior]
        );

        if (app) {
            const notificacoes = app.get('notificacoes');
            const emailService = app.get('emailService');
            const valorFormatado = Number(dadosReserva.Res_ValorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const nomeHospede = dadosReserva.hospedeNome || 'Hóspede';

            const tituloHospede = 'Pagamento Confirmado — Reserva Garantida!';
            const msgHospede = `O pagamento da sua reserva #${reservaId} (${valorFormatado}) foi aprovado com sucesso via Mercado Pago. Sua estadia está confirmada!`;

            const tituloProprietario = 'Pagamento Recebido — Reserva Confirmada!';
            const msgProprietario = `O hóspede ${nomeHospede} efetuou o pagamento da reserva #${reservaId} (${valorFormatado}) via Mercado Pago. A reserva está confirmada!`;

            if (notificacoes) {
                // 1. Notifica o Hóspede
                await notificacoes.criarNotificacao(
                    dadosReserva.Hos_Hospede_Usu_Id,
                    'Pagamento Confirmado!',
                    msgHospede,
                    'SUCESSO',
                    'bi-check-circle'
                );

                // 2. Notifica o Proprietário
                if (dadosReserva.Pro_Proprietario_Usu_Id) {
                    await notificacoes.criarNotificacao(
                        dadosReserva.Pro_Proprietario_Usu_Id,
                        'Pagamento Recebido!',
                        msgProprietario,
                        'SUCESSO',
                        'bi-check-circle'
                    );
                }
            }

            if (emailService) {
                const { enviarEmail, criarHtmlEmail } = emailService;
                void Promise.resolve().then(async () => {
                    if (dadosReserva.hospedeEmail) {
                        await enviarEmail(
                            dadosReserva.hospedeEmail,
                            tituloHospede,
                            criarHtmlEmail(tituloHospede, msgHospede),
                            `reserva/${reservaId}/pagamento_confirmado/hospede`
                        );
                    }
                    if (dadosReserva.proprietarioEmail) {
                        await enviarEmail(
                            dadosReserva.proprietarioEmail,
                            tituloProprietario,
                            criarHtmlEmail(tituloProprietario, msgProprietario),
                            `reserva/${reservaId}/pagamento_confirmado/proprietario`
                        );
                    }
                }).catch(errEmail => console.error('Falha ao processar emails de confirmação de pagamento:', errEmail));
            }
        }
    }

    return { confirmada: true };
}

/**
 * Cria ou recupera a preferência do Mercado Pago para uma reserva
 * POST /api/pagamentos/criar-preferencia/:reservaId
 */
exports.criarPreferencia = async (req, res) => {
    try {
        const { reservaId } = req.params;
        const usuarioId = req.usuario.id;

        if (!reservaId || isNaN(Number(reservaId))) {
            return res.status(400).json({ error: 'Identificador de reserva inválido.' });
        }

        // 1. Busca a reserva e valida titularidade (Prevenção IDOR)
        const [reservas] = await db.query(
            `SELECT r.Res_Id, r.Res_ValorTotal, r.Res_Status, r.Hos_Hospede_Usu_Id,
                    u.Usu_Nome, u.Usu_Email
             FROM res_reserva r
             INNER JOIN usu_usuario u ON u.Usu_Id = r.Hos_Hospede_Usu_Id
             WHERE r.Res_Id = ?`,
            [reservaId]
        );

        if (reservas.length === 0) {
            return res.status(404).json({ error: 'Reserva não encontrada.' });
        }

        const reserva = reservas[0];

        // Apenas o próprio hóspede titular ou proprietário pode gerar o pagamento
        if (reserva.Hos_Hospede_Usu_Id !== usuarioId && req.usuario.tipo !== 'proprietario') {
            return res.status(403).json({ error: 'Acesso negado: você não tem permissão para esta reserva.' });
        }

        if (reserva.Res_Status === 'CANCELADA' || reserva.Res_Status === 'RECUSADA') {
            return res.status(400).json({ error: `Esta reserva encontra-se ${reserva.Res_Status.toLowerCase()} e não pode receber pagamentos.` });
        }

        // 2. Verifica se já existe um pagamento aprovado para esta reserva
        const [pagamentosExistentes] = await db.query(
            `SELECT * FROM pag_pagamento WHERE Res_Id = ? ORDER BY Pag_Id DESC LIMIT 1`,
            [reservaId]
        );

        if (pagamentosExistentes.length > 0 && pagamentosExistentes[0].Pag_Status === 'APROVADO') {
            return res.status(400).json({ error: 'Esta reserva já possui um pagamento aprovado.' });
        }

        // 3. Cria a preferência no Mercado Pago
        const dadosPreferencia = await criarPreferenciaPagamento(reserva, {
            Usu_Nome: reserva.Usu_Nome,
            Usu_Email: reserva.Usu_Email
        });

        // 4. Salva ou atualiza os dados na tabela pag_pagamento
        if (pagamentosExistentes.length > 0 && pagamentosExistentes[0].Pag_Status === 'PENDENTE') {
            await db.query(
                `UPDATE pag_pagamento 
                 SET Pag_PreferenciaId = ?, Pag_LinkPagamento = ?, Pag_Valor = ?, Pag_DataHora = NOW()
                 WHERE Pag_Id = ?`,
                [dadosPreferencia.preferenceId, dadosPreferencia.initPoint, reserva.Res_ValorTotal, pagamentosExistentes[0].Pag_Id]
            );
        } else {
            await db.query(
                `INSERT INTO pag_pagamento 
                 (Res_Id, Pag_Metodo, Pag_Status, Pag_Valor, Pag_DataHora, Pag_PreferenciaId, Pag_LinkPagamento)
                 VALUES (?, 'PIX', 'PENDENTE', ?, NOW(), ?, ?)`,
                [reservaId, reserva.Res_ValorTotal, dadosPreferencia.preferenceId, dadosPreferencia.initPoint]
            );
        }

        return res.status(200).json({
            message: 'Preferência de pagamento criada com sucesso!',
            reservaId: Number(reservaId),
            valor: Number(reserva.Res_ValorTotal),
            preferenceId: dadosPreferencia.preferenceId,
            initPoint: dadosPreferencia.initPoint,
            sandboxInitPoint: dadosPreferencia.sandboxInitPoint,
            publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || ''
        });
    } catch (error) {
        console.error('Erro ao criar preferência no Mercado Pago:', error);
        const status = error.status || 500;
        return res.status(status).json({
            error: error.message || 'Erro interno ao processar gateway de pagamento.'
        });
    }
};

/**
 * Carrega a reserva e aplica as mesmas regras de acesso/estado do Checkout Pro (criarPreferencia):
 * reserva existe, pertence ao hóspede (ou é proprietário), não está CANCELADA/RECUSADA e não foi paga.
 * @returns {Promise<{ erro?: {status: number, mensagem: string}, reserva?: Object, pagamentoExistente?: Object }>}
 */
async function carregarReservaParaPagamento(reservaId, req) {
    if (!reservaId || isNaN(Number(reservaId))) {
        return { erro: { status: 400, mensagem: 'Identificador de reserva inválido.' } };
    }

    const [reservas] = await db.query(
        `SELECT r.Res_Id, r.Res_ValorTotal, r.Res_Status, r.Hos_Hospede_Usu_Id,
                u.Usu_Nome, u.Usu_Email
         FROM res_reserva r
         INNER JOIN usu_usuario u ON u.Usu_Id = r.Hos_Hospede_Usu_Id
         WHERE r.Res_Id = ?`,
        [reservaId]
    );
    if (reservas.length === 0) {
        return { erro: { status: 404, mensagem: 'Reserva não encontrada.' } };
    }

    const reserva = reservas[0];
    if (reserva.Hos_Hospede_Usu_Id !== req.usuario.id && req.usuario.tipo !== 'proprietario') {
        return { erro: { status: 403, mensagem: 'Acesso negado: você não tem permissão para esta reserva.' } };
    }
    if (reserva.Res_Status === 'CANCELADA' || reserva.Res_Status === 'RECUSADA') {
        return { erro: { status: 400, mensagem: `Esta reserva encontra-se ${reserva.Res_Status.toLowerCase()} e não pode receber pagamentos.` } };
    }

    const [pagamentos] = await db.query(
        `SELECT * FROM pag_pagamento WHERE Res_Id = ? ORDER BY Pag_Id DESC LIMIT 1`,
        [reservaId]
    );
    const pagamentoExistente = pagamentos[0] || null;
    if (pagamentoExistente && pagamentoExistente.Pag_Status === 'APROVADO') {
        return { erro: { status: 400, mensagem: 'Esta reserva já possui um pagamento aprovado.' } };
    }

    return { reserva, pagamentoExistente };
}

/**
 * Dados para montar o Payment Brick: valor SEMPRE do banco e chave pública (nunca o Access Token).
 * GET /api/pagamentos/checkout/:reservaId
 */
exports.obterDadosCheckout = async (req, res) => {
    try {
        const { erro, reserva } = await carregarReservaParaPagamento(req.params.reservaId, req);
        if (erro) return res.status(erro.status).json({ error: erro.mensagem });

        return res.status(200).json({
            reservaId: Number(reserva.Res_Id),
            valor: Number(reserva.Res_ValorTotal),
            reservaStatus: reserva.Res_Status,
            publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || '',
            email: reserva.Usu_Email || '',
            // Só existe para testes locais (mesma trava de simularAprovacao)
            simuladoDisponivel: process.env.PAGAMENTO_SIMULADO === 'true'
        });
    } catch (error) {
        console.error('Erro ao obter dados do checkout:', error);
        return res.status(500).json({ error: 'Erro ao preparar o pagamento.' });
    }
};

// Mensagens amigáveis por status_detail de pagamento recusado (sem vazar detalhes internos)
const MENSAGENS_RECUSA = {
    cc_rejected_bad_filled_card_number: 'Confira o número do cartão e tente novamente.',
    cc_rejected_bad_filled_date: 'Confira a data de validade do cartão e tente novamente.',
    cc_rejected_bad_filled_security_code: 'Confira o código de segurança do cartão e tente novamente.',
    cc_rejected_bad_filled_other: 'Confira os dados do cartão e tente novamente.',
    cc_rejected_call_for_authorize: 'Seu banco precisa autorizar este pagamento. Fale com o emissor do cartão ou use outro meio de pagamento.',
    cc_rejected_card_disabled: 'Este cartão está desativado. Ative-o com o banco emissor ou use outro cartão.',
    cc_rejected_insufficient_amount: 'Saldo ou limite insuficiente no cartão. Use outro cartão ou o Pix.',
    cc_rejected_invalid_installments: 'Este cartão não aceita o número de parcelas escolhido. Escolha outra opção de parcelamento.',
    cc_rejected_max_attempts: 'Limite de tentativas atingido. Use outro cartão ou o Pix.',
    cc_rejected_duplicated_payment: 'Já existe um pagamento igual a este. Use outro cartão ou meio de pagamento.',
    cc_rejected_card_type_not_allowed: 'Este tipo de cartão não é aceito. Use outro cartão ou o Pix.',
    cc_rejected_high_risk: 'Não foi possível aprovar este pagamento. Tente o Pix ou outro meio de pagamento.',
    cc_rejected_3ds_mandatory: 'Este pagamento exige autenticação adicional do banco. Tente outro cartão ou o Pix.'
};
const MENSAGEM_RECUSA_PADRAO = 'Pagamento não aprovado. Tente novamente com outro cartão ou use o Pix.';

function mensagemRecusa(statusDetail) {
    return MENSAGENS_RECUSA[statusDetail] || MENSAGEM_RECUSA_PADRAO;
}

/**
 * Valida e normaliza o formData do Payment Brick. Só repassa campos conhecidos: valor, referência
 * e URL de notificação NUNCA vêm do cliente.
 * @returns {{ erro?: string, dados?: Object }}
 */
function normalizarFormData(formData) {
    if (!formData || typeof formData !== 'object') return { erro: 'Dados de pagamento ausentes.' };

    const metodo = String(formData.payment_method_id || '').trim().toLowerCase();
    if (!/^[a-z0-9_]{2,40}$/.test(metodo)) return { erro: 'Meio de pagamento inválido.' };

    const ehPix = metodo === 'pix';
    const dados = { payment_method_id: metodo, ehPix };

    const email = String(formData.payer?.email || '').trim();
    if (email) {
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: 'E-mail do pagador inválido.' };
        dados.email = email;
    }

    const ident = formData.payer?.identification;
    if (ident && ident.type && ident.number) {
        const tipo = String(ident.type).trim().toUpperCase();
        const numero = String(ident.number).replace(/\D/g, '');
        if (!/^[A-Z]{2,10}$/.test(tipo) || numero.length < 5 || numero.length > 20) {
            return { erro: 'Documento do pagador inválido.' };
        }
        dados.identification = { type: tipo, number: numero };
    }

    if (!ehPix) {
        const token = String(formData.token || '').trim();
        if (!token || token.length > 200) return { erro: 'Dados do cartão inválidos. Revise e tente novamente.' };
        dados.token = token;

        const parcelas = Number(formData.installments || 1);
        if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12) return { erro: 'Número de parcelas inválido.' };
        dados.installments = parcelas;

        if (formData.issuer_id !== undefined && formData.issuer_id !== null && formData.issuer_id !== '') {
            const emissor = String(formData.issuer_id).trim();
            if (!/^\d{1,12}$/.test(emissor)) return { erro: 'Emissor do cartão inválido.' };
            dados.issuer_id = emissor;
        }
    }

    return { dados };
}

/**
 * Chave de idempotência determinística: o mesmo envio (clique duplo/reenvio) gera a mesma chave
 * e o Mercado Pago devolve o mesmo pagamento em vez de cobrar duas vezes.
 * Cartão: o token é de uso único, então identifica a tentativa. Pix: janela de 1 minuto.
 */
function gerarChaveIdempotencia(reservaId, dados) {
    const tentativa = dados.ehPix ? `pix:${Math.floor(Date.now() / 60000)}` : `cartao:${dados.token}`;
    return crypto.createHash('sha256').update(`reserva:${reservaId}|${tentativa}`).digest('hex').slice(0, 48);
}

/**
 * Registra o resultado de uma tentativa que NÃO foi aprovada (a aprovação passa por efetivarAprovacaoPagamento).
 */
async function registrarTentativaPagamento(reservaId, pagamentoMP, valor, pagamentoExistente) {
    const statusMP = pagamentoMP.status;
    const statusBanco = (statusMP === 'rejected' || statusMP === 'cancelled') ? 'RECUSADO' : 'PENDENTE';
    const metodoBanco = mapearMetodoBanco(pagamentoMP);

    if (pagamentoExistente) {
        await db.query(
            `UPDATE pag_pagamento
             SET Pag_Status = ?, Pag_Metodo = ?, Pag_Valor = ?, Pag_TransacaoId = ?, Pag_DataHora = NOW()
             WHERE Pag_Id = ?`,
            [statusBanco, metodoBanco, valor, String(pagamentoMP.id), pagamentoExistente.Pag_Id]
        );
    } else {
        await db.query(
            `INSERT INTO pag_pagamento
             (Res_Id, Pag_Metodo, Pag_Status, Pag_Valor, Pag_DataHora, Pag_TransacaoId)
             VALUES (?, ?, ?, ?, NOW(), ?)`,
            [reservaId, metodoBanco, statusBanco, valor, String(pagamentoMP.id)]
        );
    }
}

/**
 * Processa o pagamento enviado pelo Payment Brick (Checkout Transparente: cartão e Pix).
 * POST /api/pagamentos/processar/:reservaId
 */
exports.processarPagamento = async (req, res) => {
    try {
        const { reservaId } = req.params;
        const { erro, reserva, pagamentoExistente } = await carregarReservaParaPagamento(reservaId, req);
        if (erro) return res.status(erro.status).json({ error: erro.mensagem });

        const { erro: erroForm, dados } = normalizarFormData(req.body?.formData ?? req.body);
        if (erroForm) return res.status(400).json({ error: erroForm });

        // O valor vem SEMPRE do banco; transaction_amount enviado pelo front é ignorado.
        const valor = Number(reserva.Res_ValorTotal);
        if (!Number.isFinite(valor) || valor <= 0) {
            return res.status(400).json({ error: 'Valor inválido para a reserva.' });
        }

        const corpo = {
            transaction_amount: Number(valor.toFixed(2)),
            description: `Reserva Chalé Recanto Camargo #${reserva.Res_Id}`,
            payment_method_id: dados.payment_method_id,
            external_reference: String(reserva.Res_Id),
            payer: { email: dados.email || reserva.Usu_Email }
        };
        if (dados.identification) corpo.payer.identification = dados.identification;

        // O Mercado Pago só aceita notification_url pública; em localhost o webhook não é alcançável.
        const urlBackend = (process.env.BACKEND_URL || '').replace(/\/$/, '');
        if (urlBackend.startsWith('https://')) {
            corpo.notification_url = `${urlBackend}/api/pagamentos/webhook`;
        }

        if (dados.ehPix) {
            const expira = new Date(Date.now() + (PIX_VALIDADE_MINUTOS * 60 + PIX_MARGEM_SEGUNDOS) * 1000);
            corpo.date_of_expiration = formatarDataMercadoPago(expira);
        } else {
            corpo.token = dados.token;
            corpo.installments = dados.installments;
            if (dados.issuer_id) corpo.issuer_id = dados.issuer_id;
        }

        let pagamentoMP;
        try {
            pagamentoMP = await criarPagamento(corpo, gerarChaveIdempotencia(reserva.Res_Id, dados));
        } catch (erroMP) {
            console.error(`Erro ao criar pagamento da reserva ${reserva.Res_Id} no Mercado Pago:`, erroMP?.message || erroMP);
            const status = Number(erroMP?.status);
            if (status >= 400 && status < 500) {
                return res.status(400).json({ error: 'Não foi possível validar os dados do pagamento. Revise e tente novamente.' });
            }
            return res.status(502).json({ error: 'Pagamento online indisponível no momento. Tente novamente em instantes ou use o Checkout do Mercado Pago.' });
        }

        const statusMP = pagamentoMP?.status;

        if (statusMP === 'approved') {
            if (!(await valorPagoConfere(reserva.Res_Id, pagamentoMP))) {
                return res.status(502).json({ error: 'Não foi possível confirmar o pagamento automaticamente. Nossa equipe vai verificar.' });
            }
            const efetivacao = await efetivarAprovacaoPagamento(reserva.Res_Id, pagamentoMP.id, pagamentoMP, req.app);
            if (!efetivacao.confirmada) {
                return res.status(409).json({
                    status: 'reserva_indisponivel',
                    error: efetivacao.estornado
                        ? 'Esta reserva não está mais disponível. O valor pago será estornado.'
                        : 'Esta reserva não está mais disponível. Entre em contato para o estorno do valor pago.'
                });
            }
            return res.status(200).json({
                status: 'approved',
                reservaId: Number(reserva.Res_Id),
                paymentId: String(pagamentoMP.id)
            });
        }

        if (statusMP === 'rejected' || statusMP === 'cancelled') {
            await registrarTentativaPagamento(reserva.Res_Id, pagamentoMP, valor, pagamentoExistente);
            return res.status(402).json({
                status: 'rejected',
                error: mensagemRecusa(pagamentoMP.status_detail)
            });
        }

        // pending (Pix), in_process / authorized (análise do cartão)
        await registrarTentativaPagamento(reserva.Res_Id, pagamentoMP, valor, pagamentoExistente);

        const transacao = pagamentoMP?.point_of_interaction?.transaction_data;
        if (dados.ehPix && transacao?.qr_code) {
            return res.status(200).json({
                status: 'pending',
                reservaId: Number(reserva.Res_Id),
                paymentId: String(pagamentoMP.id),
                pix: {
                    qrCode: transacao.qr_code,
                    qrCodeBase64: transacao.qr_code_base64 || '',
                    ticketUrl: transacao.ticket_url || '',
                    expiraEm: pagamentoMP.date_of_expiration || null
                }
            });
        }

        return res.status(200).json({
            status: statusMP === 'pending' ? 'pending' : 'in_process',
            reservaId: Number(reserva.Res_Id),
            paymentId: String(pagamentoMP.id),
            mensagem: 'Pagamento em análise. Você será avisado assim que for confirmado.'
        });
    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        return res.status(500).json({ error: 'Erro interno ao processar o pagamento.' });
    }
};

/**
 * Consulta o status de pagamento de uma reserva
 * GET /api/pagamentos/status/:reservaId
 */
exports.consultarStatus = async (req, res) => {
    try {
        const { reservaId } = req.params;
        const usuarioId = req.usuario.id;

        const [reservas] = await db.query(
            `SELECT Hos_Hospede_Usu_Id, Res_Status FROM res_reserva WHERE Res_Id = ?`,
            [reservaId]
        );

        if (reservas.length === 0) {
            return res.status(404).json({ error: 'Reserva não encontrada.' });
        }

        if (reservas[0].Hos_Hospede_Usu_Id !== usuarioId && req.usuario.tipo !== 'proprietario') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        let reservaStatus = reservas[0].Res_Status;

        // Se ainda não estiver confirmada, verifica ativamente na API do Mercado Pago
        if ((reservaStatus === 'PAGAMENTO_PENDENTE' || reservaStatus === 'PENDENTE') && process.env.NODE_ENV !== 'test') {
            const pagamentoMP = await buscarPagamentoPorReserva(reservaId);
            if (pagamentoMP && pagamentoMP.status === 'approved' && await valorPagoConfere(reservaId, pagamentoMP)) {
                await efetivarAprovacaoPagamento(
                    reservaId,
                    pagamentoMP.id,
                    pagamentoMP,
                    req.app
                );
                reservaStatus = 'CONFIRMADA';
            }
        }

        const [pagamentos] = await db.query(
            `SELECT Pag_Id, Res_Id, Pag_Metodo, Pag_Status, Pag_Valor, Pag_DataHora, Pag_PreferenciaId, Pag_LinkPagamento, Pag_TransacaoId
             FROM pag_pagamento WHERE Res_Id = ? ORDER BY Pag_Id DESC LIMIT 1`,
            [reservaId]
        );

        if (pagamentos.length === 0) {
            return res.status(200).json({
                temPagamento: false,
                status: 'NAO_INICIADO',
                reservaStatus
            });
        }

        return res.status(200).json({
            temPagamento: true,
            pagamento: pagamentos[0],
            reservaStatus
        });
    } catch (error) {
        console.error('Erro ao consultar status de pagamento:', error);
        return res.status(500).json({ error: 'Erro ao consultar status do pagamento.' });
    }
};

/**
 * Webhook para notificações assíncronas do Mercado Pago
 * POST /api/pagamentos/webhook
 */
exports.receberWebhook = async (req, res) => {
    const query = req.query || {};
    const body = req.body || {};

    // Autenticidade: só processa notificações assinadas pelo Mercado Pago.
    // Sem segredo configurado, só é tolerado fora de produção (desenvolvimento/testes).
    const assinatura = validarAssinaturaWebhook({ headers: req.headers, query, body });
    if (!assinatura.valida) {
        if (assinatura.motivo === 'segredo_nao_configurado' && process.env.NODE_ENV !== 'production') {
            console.warn('Webhook do Mercado Pago aceito sem validação: defina MERCADO_PAGO_WEBHOOK_SECRET.');
        } else {
            console.error(`Webhook do Mercado Pago rejeitado: ${assinatura.motivo}.`);
            return res.status(401).send('Assinatura inválida');
        }
    }

    // Mercado Pago exige retorno 200 rápido para não reenviar Webhook
    res.status(200).send('OK');

    try {
        // Identifica o ID da transação
        const paymentId = query['data.id'] || query.id || body.data?.id;
        const type = query.type || body.type;

        if (!paymentId || (type && type !== 'payment')) {
            return;
        }

        // Consulta os dados do pagamento no Mercado Pago
        const pagamentoMP = await consultarPagamento(paymentId);
        if (!pagamentoMP) return;

        const reservaId = pagamentoMP.external_reference;
        const statusMP = pagamentoMP.status;

        if (!reservaId) return;

        if (statusMP === 'approved') {
            if (!(await valorPagoConfere(reservaId, pagamentoMP))) return;
            await efetivarAprovacaoPagamento(
                reservaId,
                paymentId,
                pagamentoMP,
                req.app
            );
        } else {
            let statusBanco = 'PENDENTE';
            if (statusMP === 'rejected' || statusMP === 'cancelled') statusBanco = 'RECUSADO';
            else if (statusMP === 'refunded') statusBanco = 'REEMBOLSADO';

            // Notificações podem chegar fora de ordem: nunca rebaixa um pagamento já aprovado (exceto
            // estorno) nem deixa a notificação de uma tentativa antiga sobrescrever a tentativa atual.
            const protegeAprovado = statusBanco === 'REEMBOLSADO' ? '' : `AND Pag_Status <> 'APROVADO'`;
            await db.query(
                `UPDATE pag_pagamento
                 SET Pag_Status = ?, Pag_TransacaoId = ?, Pag_DataHora = NOW()
                 WHERE Res_Id = ? ${protegeAprovado}
                   AND (Pag_TransacaoId IS NULL OR Pag_TransacaoId = ?)`,
                [statusBanco, String(paymentId), reservaId, String(paymentId)]
            );
        }
    } catch (error) {
        console.error('Erro ao processar Webhook do Mercado Pago:', error);
    }
};

/**
 * Simula a aprovação imediata do pagamento para testes em ambiente de desenvolvimento
 * POST /api/pagamentos/simular-aprovacao/:reservaId
 */
exports.simularAprovacao = async (req, res) => {
    // Só existe para testes locais. Sem PAGAMENTO_SIMULADO=true no .env, a rota se comporta como inexistente,
    // impedindo que um hóspede confirme a própria reserva sem pagar em produção.
    if (process.env.PAGAMENTO_SIMULADO !== 'true') {
        return res.status(404).json({ error: 'Rota não encontrada.' });
    }

    try {
        const { reservaId } = req.params;
        const usuarioId = req.usuario.id;

        if (!reservaId || isNaN(Number(reservaId))) {
            return res.status(400).json({ error: 'Identificador de reserva inválido.' });
        }

        const [reservas] = await db.query(
            `SELECT Res_Id, Res_Status, Hos_Hospede_Usu_Id FROM res_reserva WHERE Res_Id = ?`,
            [reservaId]
        );

        if (reservas.length === 0) {
            return res.status(404).json({ error: 'Reserva não encontrada.' });
        }

        const reserva = reservas[0];
        if (reserva.Hos_Hospede_Usu_Id !== usuarioId && req.usuario.tipo !== 'proprietario') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const transacaoSimulada = `SIM_${Date.now()}`;
        await efetivarAprovacaoPagamento(reservaId, transacaoSimulada, 'PIX', req.app);

        return res.status(200).json({
            message: 'Pagamento simulado com sucesso! Reserva confirmada.',
            reservaId: Number(reservaId),
            novoStatus: 'CONFIRMADA'
        });
    } catch (error) {
        console.error('Erro ao simular aprovação de pagamento:', error);
        return res.status(500).json({ error: 'Erro ao simular aprovação do pagamento.' });
    }
};

exports.efetivarAprovacaoPagamento = efetivarAprovacaoPagamento;
exports.mapearMetodoBanco = mapearMetodoBanco;
