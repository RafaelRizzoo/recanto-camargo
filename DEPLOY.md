# Deploy de TESTE (gratuito) — Recanto Camargo

Ambiente **de teste** para apresentação, não é produção. Usa só credenciais de **teste** do Mercado Pago.

| Peça | Serviço | URL |
|---|---|---|
| Front (estático) | GitHub Pages | `https://rafaelrizzoo.github.io/recanto-camargo/` |
| API Node/Express | Render (Web Service, plano Free) | `https://<nome-do-servico>.onrender.com` |
| Banco | TiDB Cloud Starter (MySQL-compatível, Free) | endpoint `gateway01.<regiao>.prod.aws.tidbcloud.com:4000` |

> Preencha as URLs reais depois de criar os serviços. Nunca coloque valores secretos neste arquivo nem no repositório.

## Limitações do plano gratuito (avisar a plateia)

- **Hibernação:** a API dorme após 15 min sem tráfego; o primeiro acesso leva ~1 min. **Abra a API ~2 min antes da apresentação** (`https://<api>/healthz`).
- 750 h/mês de instância no Render; disco efêmero; portas SMTP de saída bloqueadas (o e-mail usa a API HTTPS do Resend, ok).
- **TiDB Starter:** 5 GiB e 50 milhões de RUs/mês; se estourar, novas conexões são recusadas até o mês virar. Conexões com mais de 30 min são derrubadas (o pool já recicla conexões ociosas em 60 s).
- TiDB é **compatível** com MySQL, não é MySQL: o esquema é importado e o fluxo de reserva (`SELECT … FOR UPDATE`) precisa ser validado (ver "Validação").
- **Cookie de sessão entre domínios** (`github.io` → `onrender.com`, `SameSite=None`): navegadores que bloqueiam cookies de terceiros (Safari, janela anônima do Chrome, Brave) **não manterão o login**. Apresente em Chrome/Edge em janela normal.
- Planos e limites mudam; confira nas páginas oficiais antes de criar as contas.

## Arquivos de deploy neste repositório

- `render.yaml` — blueprint do serviço da API (variáveis secretas com `sync: false`).
- `.github/workflows/static.yml` — build do front; lê a variável de Actions `VITE_API_URL`.
- `backend/deploy/esquema_completo.sql` — esquema das 16 tabelas (sem dados), gerado por `backend/deploy/exportar-esquema.js` (já inclui as 2 migrações).
  (o `.gitignore` ignora `*.sql`; para versionar use `git add -f backend/deploy/esquema_completo.sql`. Não contém dados.)
- `backend/deploy/semear-teste.js` — cria 1 proprietário de teste e os 2 imóveis (sem dados pessoais do banco local).
- `backend/config/db.js` — passou a aceitar `DB_PORT` e `DB_SSL=true` (necessário para o TiDB).
- `backend/server.js` — `trust proxy` em produção e rota `/healthz`.

## Passo a passo

### 1. Banco (TiDB Cloud Starter) — você cria a conta
1. Crie a conta em tidbcloud.com (login com GitHub/Google ou e-mail) e uma instância **Starter** (gratuita, sem cartão). Anote região.
2. Em **Connect**, gere a senha do usuário e copie host, porta (4000), usuário e senha. Crie o banco `recanto_camargo` (ou use o padrão).
3. Importe o esquema, na raiz do repositório (qualquer cliente MySQL serve: MySQL Workbench, DBeaver, ou `mysql`):
   ```bash
   mysql --host=<host> --port=4000 --user=<user> -p --ssl-mode=VERIFY_IDENTITY <banco> < backend/deploy/esquema_completo.sql
   ```
   Alternativa sem cliente: abra o arquivo `.sql` no console SQL da própria TiDB Cloud (Chat2Query/SQL Editor) e execute.
   Se algum `COLLATE utf8mb4_0900_ai_ci` for recusado, troque por `utf8mb4_general_ci` no arquivo.

### 2. API (Render) — você cria a conta
1. Crie a conta em render.com (login com GitHub). Em **New → Blueprint**, aponte para este repositório (o `render.yaml` precisa estar na branch usada — ver "Branches").
2. Preencha as variáveis marcadas como "sync: false" (tabela abaixo). Gere os segredos de criptografia assim (cada comando uma vez, valores novos para este ambiente):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Aguarde o deploy e teste `https://<api>/healthz` → `{"ok":true}`.
4. Depois que souber a URL real da API, volte e preencha `BACKEND_URL`.

### 3. Semear o banco de teste
Na sua máquina, com um `.env` temporário **apontando para o TiDB** (não o seu `.env` local) ou variáveis no terminal:
```bash
cd backend
SEED_EMAIL=<email-de-teste> SEED_SENHA=<senha-forte> SEED_CPF=<cpf-valido-de-teste> \
DB_HOST=... DB_PORT=4000 DB_SSL=true DB_USER=... DB_PASSWORD=... DB_NAME=... \
CPF_ENCRYPTION_KEY=<a mesma do Render> CPF_HMAC_SECRET=<a mesma do Render> \
node deploy/semear-teste.js
```
`CPF_ENCRYPTION_KEY` e `CPF_HMAC_SECRET` **têm de ser iguais** aos do Render, senão o login do proprietário não acha o CPF.

### 4. Front (GitHub Pages)
1. No GitHub: **Settings → Secrets and variables → Actions → Variables → New repository variable**: `VITE_API_URL` = URL da API (sem barra final).
2. **Settings → Pages → Source: GitHub Actions** (já configurado hoje).
3. O workflow só roda em push na `main`; rode-o manualmente ou faça um push após definir a variável. O `base` do Vite (`/recanto-camargo/`) e o HashRouter já estão corretos para o Pages.

### 5. Webhook do Mercado Pago (você faz no painel)
1. Painel de desenvolvedores → sua aplicação → **Webhooks**, modo **teste**.
2. URL: `https://<api>/api/pagamentos/webhook`; evento: **Pagamentos**.
3. Copie a **chave secreta** gerada e cole em `MERCADO_PAGO_WEBHOOK_SECRET` no Render (redeploy automático).
4. Depois disso o túnel ngrok local pode ser encerrado.

## Variáveis de ambiente (API no Render)

| Variável | Valor / origem |
|---|---|
| `NODE_ENV` | `production` (no blueprint) — liga cookie `secure` e exige o segredo do webhook |
| `COOKIE_SAMESITE` | `none` (no blueprint) |
| `PAGAMENTO_SIMULADO` | `false` (no blueprint) |
| `DB_SSL` / `DB_PORT` | `true` / `4000` (no blueprint) |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | dados de conexão do TiDB |
| `JWT_SECRET` | gerado pelo Render |
| `CPF_ENCRYPTION_KEY` | 64 caracteres hexadecimais (32 bytes) gerados por você |
| `CPF_HMAC_SECRET` | string aleatória gerada por você |
| `FRONTEND_URL` | `https://rafaelrizzoo.github.io/recanto-camargo/#` (HTTPS, com `#` do HashRouter) |
| `CORS_ORIGINS` | `https://rafaelrizzoo.github.io` (só a origem, sem caminho) |
| `BACKEND_URL` | URL HTTPS da API no Render |
| `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY` | credenciais de **TESTE** da aplicação |
| `MERCADO_PAGO_WEBHOOK_SECRET` | chave secreta do webhook (passo 5) |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | do Resend (opcional para o teste; sem isso os e-mails não saem) |

Variável de Actions do front: `VITE_API_URL`.

## Branches

O deploy depende das correções de pagamento que estão na branch `feat/mercado-pago` (parte ainda não commitada). O Pages só publica a partir da `main`; é preciso commitar, abrir PR e fazer merge antes de o front hospedado existir, ou disparar o workflow a partir da branch escolhida.

## Como repetir o deploy

- **API:** push na branch ligada ao serviço no Render (deploy automático) ou "Manual Deploy" no painel.
- **Front:** push na `main` (ou rodar o workflow "Deploy Vite site to Pages").
- **Esquema novo:** gere de novo com `node backend/deploy/exportar-esquema.js` (usa o `.env` local) e aplique as migrações de `backend/migrations/` no TiDB.
- **Recriar o banco de teste:** repita os passos 1 e 3.

## Validação ponta a ponta

Registrar aqui o resultado real após o deploy (cadastro/login, consulta de datas, criar reserva, aprovar como proprietário, pagar com cartão de teste, confirmação via webhook, concorrência da reserva com `FOR UPDATE`). Nada disso foi executado ainda: as contas no Render e no TiDB não existem.
