# Guia técnico do Recanto Camargo (para a apresentação)

Revisado em 10/11/2026 a partir do código da `main` (PR #16) e de testes feitos no sistema rodando localmente.

## 1. Visão geral em uma frase
Site próprio do Recanto Camargo (duas casas em Aparecida-SP) com vitrine, consulta de disponibilidade, reserva direta com aprovação do proprietário, pagamento, cancelamento com política de reembolso e painel administrativo. Não é um marketplace: existe uma única marca, com duas unidades (Recanto 1 e Recanto 2).

## 2. Arquitetura
```
Navegador (React 18 + Vite)  ──HTTP/JSON + cookie JWT──▶  API Express 5 (Node)  ──mysql2──▶  MySQL
        │                                                      │
  GitHub Pages (produção estática)                      e-mail (Resend), pagamento (Mercado Pago)
  Vercel (previews por branch)                          rotinas automáticas a cada 1 hora
```
- **Front-end:** React 18, Vite 5, react-bootstrap/Bootstrap 5, react-router-dom 7 com **HashRouter** (necessário no GitHub Pages), react-calendar (calendário), Headless UI (listas), bootstrap-icons. Idioma PT/EN e tema claro/escuro.
- **Back-end:** Node.js + Express 5, mysql2 (pool de 10 conexões), jsonwebtoken, bcryptjs, express-rate-limit, cookie-parser, cors, mercadopago, resend.
- **Banco:** MySQL 8, 16 tabelas.
- **Deploy:** o workflow `.github/workflows/static.yml` publica o front no GitHub Pages a cada push na `main` (Node 20, `npm ci`, `npm run build`). A Vercel gera um preview por branch (só o front). **O back-end ainda não está hospedado**: em produção estática o site funciona como vitrine, e login e reserva só funcionam com o back-end rodando.

## 3. Estrutura de pastas
```
recanto-camargo/
├─ src/                         front-end
│  ├─ pages/                    Home, Fotos, Avaliacoes, Reserva, ReservaConcluida, Login, Cadastro,
│  │                            RecuperarSenha, Configuracoes, DashboardCliente, DashboardAdministrador,
│  │                            TermosDeUso, Privacidade
│  ├─ components/home/          seções da Home (Hero, Busca, Comodidades, Experiência, Explore Aparecida...)
│  ├─ components/UI/            Entrada, Botao, CalendarioCustom, ListaSelecao, Lightbox, Notificacoes...
│  ├─ context/                  ContextoAutenticacao (sessão) e ContextoPreferencias (idioma e tema)
│  ├─ hooks/                    useAutenticacao, usePreferencias, useNotificacoes, useAvaliacoesGoogle
│  ├─ i18n/en.js                dicionário PT→EN usado pela função t()
│  ├─ data/conteudoSite.js      textos, fotos, comodidades, pontos turísticos, depoimentos
│  └─ utils/                    api.js (URL da API), feriados.js (nacionais, SP e Aparecida)
└─ backend/
   ├─ server.js                 monta o Express, rotas e rotinas automáticas
   ├─ routes/                   9 arquivos (auth, imóveis, reservas, cupons, notificações, avaliações,
   │                            hóspede, proprietário, pagamentos)
   ├─ controllers/              regra de negócio de cada rota
   ├─ services/                 helpers (preço, imóvel), política de cancelamento, Mercado Pago,
   │                            lembretes e housekeeping
   ├─ middlewares/              authMiddleware (verificarToken, verificarProprietario), errorHandler
   ├─ utils/crypto.js           criptografia e hash do CPF
   ├─ config/db.js              pool MySQL
   ├─ migrations/               2 migrações SQL (notificações; Recanto 2 e preços)
   └─ tests/                    testes automatizados (node --test) e scripts E2E
```

## 4. Fluxo de uma reserva (o mais provável de ser perguntado)
1. O visitante escolhe unidade, datas ("Quando?") e hóspedes. O front consulta `GET /api/reservas/datas-ocupadas` (pinta o calendário) e `GET /api/reservas/cotacao` (mostra o valor).
2. Para reservar é preciso estar logado (`POST /api/reservas`, protegido por cookie JWT).
3. O servidor, **dentro de uma transação**, trava a linha do imóvel (`SELECT ... FOR UPDATE`), confere conflito de datas com reservas ativas, bloqueios do proprietário e restrição do hóspede, **recalcula o preço sozinho** (nunca confia no valor do front), aplica o cupom e grava a reserva como `PENDENTE`, com histórico e notificações para hóspede e proprietário.
4. O proprietário **aprova** (vira `PAGAMENTO_PENDENTE`) ou **recusa** (`RECUSADA`). Tem 48 horas; depois disso o sistema cancela sozinho.
5. O hóspede paga (Mercado Pago Checkout Pro). A confirmação chega por webhook e vira `CONFIRMADA`. Sem pagamento em 24 horas, a reserva é cancelada automaticamente.
6. Depois da estadia o proprietário marca `CONCLUIDA`, e o hóspede é convidado a avaliar.

Estados: `PENDENTE → PAGAMENTO_PENDENTE → CONFIRMADA → CONCLUIDA`, com saídas para `RECUSADA` e `CANCELADA`.

## 5. Regras de negócio
- **Preço por noite:** data especial (feriado/festa, tabela `dat_datadinamica`) > fim de semana (noites de **sexta e sábado**) > dia de semana. Hoje: R$ 350 semana, R$ 450 fim de semana, nas duas unidades. Taxa de limpeza fixa de R$ 80.
- **Conflito de datas:** `checkin < saída existente E checkout > entrada existente`. Check-in às 14h, check-out às 11h, então uma reserva pode começar no dia em que outra termina.
- **Capacidade:** 1 a 10 hóspedes (validado no servidor).
- **Cupons:** percentual ou valor fixo; público (todos, primeira reserva, cliente específico, etc.), limite de usos, mínimo de noites, validade. O desconto incide sobre o total, incluindo a taxa de limpeza. O cupom fica preso à reserva pendente e volta a valer se ela for recusada ou cancelada (testado).
- **Cancelamento pelo hóspede:** 7 dias ou mais = 100% de reembolso; de 48 horas a 7 dias = 50%; menos de 48 horas = 0%. Cancelamento pelo proprietário = 100% sempre.
- **Avaliações:** o hóspede avalia a estadia, o proprietário responde, e também avalia o hóspede.
- **Rotinas automáticas (a cada 1 hora):** lembrete de check-in (48 h antes), convite de avaliação (24 h após o checkout, até 30 dias) e limpeza de reservas abandonadas.

## 6. Segurança (o que existe)
- **Senhas:** bcrypt (custo 10) e exigência de complexidade mínima (8 caracteres ou mais).
- **CPF:** criptografado com AES-256-GCM (IV aleatório) e um hash HMAC-SHA256 separado, usado para detectar duplicidade sem expor o CPF.
- **Sessão:** JWT em cookie `httpOnly` (JavaScript da página não lê o token), `sameSite=lax`, validade de 7 dias.
- **Autorização:** `verificarToken` e `verificarProprietario`; o hóspede só acessa reservas, pagamento e cancelamento dos próprios dados (testado com duas contas: 403/404).
- **SQL Injection:** todas as consultas usam parâmetros (`?`). Testado em datas, imóvel, cupom, login e observações: nenhuma injeção funcionou.
- **XSS:** o React escapa o texto. Testado com `<img onerror>` e `<script>` nas observações: aparece como texto, nada é executado.
- **Limite de tentativas de login:** 5 falhas por 15 minutos (só falhas contam).
- **Pagamento simulado:** a rota só existe com `PAGAMENTO_SIMULADO=true` no `.env` local; sem isso responde 404.
- **LGPD:** aceite de termos com data, IP e versão; páginas de Termos e Privacidade.
- **Segredos:** `.env` e dumps `.sql` fora do Git.

## 7. Banco de dados (16 tabelas)
Usuários: `usu_usuario`, `hos_hospede`, `pro_proprietario`, `adm_administrador`. Imóveis e preços: `imo_imovel` (com `Imo_ValorFixo` e `Imo_ValorFimSemana`), `hit_historicovalores`, `dat_datadinamica` (datas especiais), `fot_fotos`. Reservas: `res_reserva`, `his_historicoreservastatus`, `pag_pagamento`, `cup_cupom`. Disponibilidade: `bld_bloqueiodata` (bloqueios do calendário), `blo_bloqueiohospede` (hóspedes restritos). Outros: `ava_avaliacao`, `not_notificacao`.

## 8. Rotas da API (resumo)
- `/api/usuarios`: cadastro, login, sessão, logout, perfil, senha.
- `/api/imoveis`, `/api/reservas`: listagem, disponibilidade, datas ocupadas, cotação, criar, buscar.
- `/api/hospede`: minhas reservas, cancelar, reputação.
- `/api/proprietario`: aprovar/recusar/concluir/cancelar com estorno, métricas, bloqueios, preços, datas especiais, cupons (criar, editar, pausar), avaliações.
- `/api/cupons`, `/api/notificacoes`, `/api/avaliacoes`, `/api/pagamentos` (criar preferência, status, webhook, simulação).

## 9. Testes que foram feitos
- **Automatizados:** 66 testes (`npm test` no back-end). Na cópia limpa da `main`, 55 passam e 11 falham. As 11 falhas são do banco simulado dos testes, que ficou desatualizado após o Recanto 2 (a consulta nova do imóvel não existe no mock). Os mesmos fluxos foram testados de verdade e funcionaram.
- **Build de produção:** `npm run build` passa.
- **Manuais no navegador (10/11/2026):** login de hóspede e proprietário; reserva; cotação; datas ocupadas, manutenção e conflito (409); data passada e capacidade (400); aprovação; pagamento simulado; cancelamento de reserva pendente e confirmada; bloqueio de datas, data especial e cupom (criar, validar, pausar); controle de acesso entre contas; SQL injection; XSS; validações de cadastro e login; páginas sem erro no console (exceto o mapa do Google no localhost).

## 10. Limitações conhecidas e próximos passos (diga isso antes que perguntem)
1. **Back-end ainda não hospedado.** O site publicado é vitrine; a reserva roda local. O CORS está fixo em `http://localhost:5173` e precisa virar variável de ambiente no deploy.
2. **Mercado Pago:** integração pronta no código, falta a conta de testes e as credenciais. Hoje a confirmação usa a simulação local.
3. **Cookies com `secure: false`:** deve ser `true` em produção com HTTPS.
4. **Validações do cadastro no servidor:** o formato do e-mail e os dígitos verificadores do CPF não são conferidos (só o tamanho); o aceite dos termos só é recusado se vier explicitamente `false`.
5. **Recuperação de senha:** só a tela; falta o envio de e-mail (chave do Resend) e alinhar com o colega que começou essa parte.
6. **Testes automatizados** precisam de atualização do banco simulado, e o script `npm run lint` não tem arquivo de configuração do ESLint.
7. **Código grande:** `DashboardAdministrador.jsx` (~3.500 linhas) e `proprietarioController.js` (~1.700 linhas) merecem ser quebrados em módulos.
8. **Migrações:** só 2 versionadas; o esquema completo veio de um dump do colega. Convém versionar tudo.
9. **Mapa do Google** só funciona no domínio autorizado, não no localhost.
10. **Planta baixa 3D e tour por cômodos** (inspirados no Airbnb): projeto futuro.

## 11. Perguntas prováveis e respostas curtas
- **Por que HashRouter?** O GitHub Pages não faz redirecionamento de rotas; com o hash (`#/Reserva`) o site funciona sem configurar servidor.
- **Como evitam reserva dupla?** Transação com trava na linha do imóvel (`FOR UPDATE`) e checagem de conflito antes de gravar.
- **O preço pode ser adulterado pelo navegador?** Não: o servidor recalcula tudo, inclusive cupom.
- **Onde fica o CPF?** Criptografado (AES-256-GCM); a busca por duplicidade usa um hash HMAC.
- **Como funciona o pagamento?** Mercado Pago Checkout Pro: o back-end cria a preferência, o hóspede paga na página do Mercado Pago, e o webhook confirma a reserva. Em teste local há uma rota de simulação protegida por variável de ambiente.
- **E se o proprietário não responder?** Em 48 horas a reserva é cancelada automaticamente e o hóspede é avisado.
- **Como trocam o preço ou criam feriados?** Aba "Diária" do painel: preço de semana, de fim de semana e datas especiais com preço próprio. Reservas já feitas mantêm o valor combinado.
- **Por que duas unidades no mesmo sistema?** O parâmetro `imovelId` percorre todas as rotas; calendário, preços, datas especiais e bloqueios funcionam por unidade.
- **O que impede um hóspede de ver dados de outro?** O servidor confere o dono da reserva em cada rota; testado com duas contas.
