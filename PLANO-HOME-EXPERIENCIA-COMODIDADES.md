# Plano: seções "Experiência" e "Comodidades" da Home

Escopo: só frontend e só visual (CSS, tokens `--rc-*`, layout e dados estáticos em `src/data/conteudoSite.js`).
Sem mexer em rotas, API, lógica de reserva ou HashRouter. Manter tema claro/escuro, mobile e barra fixa de CTA.
Arquivos envolvidos: `Experiencia.jsx`, `ComodidadesHome.jsx`, `home.css`, `conteudoSite.js` (`fotosExperiencia`, `numerosExperiencia`, `comodidadesGrupos`), `src/i18n/en.js` (textos novos em inglês).

## 1. Diagnóstico
- **Experiência:** só 2 fotos estáticas em colagem + lista de números. Vazia e estática, e a coluna da direita é só texto.
- **Comodidades:** 3 cartões quase vazios (2, 3 e 4 itens), com muito espaço sobrando. Faltam vários itens que a casa tem.
- **Site em geral:** pouca "vida": quase tudo parado, sem movimento nem prova social.

## 2. Comodidades ("Tudo o que você precisa.")
Lista completa informada pelo Rafael, agrupada em 5 cartões:

| Grupo | Itens |
|---|---|
| Dormir bem | Roupas de cama, travesseiros, mantas, toalhas de banho, ventilador de teto em todos os cômodos |
| Cozinha completa | Utensílios, louças, panelas e frigideiras, panela de arroz, sanduicheira, cafeteira, air fryer |
| Área gourmet | Churrasqueira, kit churrasco |
| Conforto e praticidade | Smart TV em todos os cômodos, secador de cabelo, ferro de passar roupa |
| Para toda a família | Garagem, aceitamos pets |

Layout proposto:
- Grade de 5 cartões, com o cartão "Cozinha completa" maior (é o que tem mais itens) e itens em 1 ou 2 colunas.
- Ícone maior por item (Bootstrap Icons já usados) e um ícone grande no título de cada grupo.
- Destaque no topo, em "pílulas": Wi-Fi, Pets, Garagem, Air fryer, Churrasqueira (o que mais pesa na decisão).
- Entrada em cascata ao rolar (`.rc-rv` já existe) e leve elevação no hover.
- Verificar contraste do azul claro dos títulos nos dois temas.

## 3. Experiência ("Mais do que uma estadia...")
Minha opinião: não precisa ser um carrossel clássico. Recomendo **galeria viva** em vez de 2 fotos paradas:

- **Opção A (recomendada): colagem com troca automática.** As 2 fotos viram uma colagem que alterna entre 4 a 6 fotos reais (crossfade lento, ~5s, pausa no hover, respeita `prefers-reduced-motion`), com pontinhos de navegação e setas no desktop.
- **Opção B: faixa de fotos deslizante (marquee).** Uma fileira horizontal de fotos que rola devagar embaixo do bloco, com os números por cima.
- **Opção C: números que contam.** Os números (10 hóspedes, 2 quartos, 1 cozinha) animam de 0 até o valor ao entrar na tela; combina com A ou B.

Sugestão: **A + C**. Dá vida sem poluir.

## 4. "Pontos vivos" no resto do site (ideias, escolher quais entram)
1. Prova social: faixa com nota média e 2 ou 3 depoimentos rotativos (usar as avaliações que já existem no site).
2. Mini selo "Anfitriã que recebe pessoalmente" com foto/ícone.
3. Faixa "Perto da Basílica" com distância e tempo a pé/carro (dado fixo).
4. Pequeno vídeo/loop curto no hero ou numa faixa (se houver material).
5. Microanimações: cartões de hospedagem com zoom suave na foto, botões com brilho no hover.

## 5. Ordem de execução
1. Atualizar `comodidadesGrupos` com a lista completa e traduzir em `en.js`.
2. Novo layout de Comodidades (`ComodidadesHome.jsx` + `home.css`), testar tema claro/escuro e mobile.
3. Experiência: galeria alternando fotos (precisa decidir quais fotos entram) + contagem animada.
4. Escolher e implementar 1 ou 2 "pontos vivos" da seção 4.
5. Verificação: desktop 1280/1440, tablet, mobile 375, tema escuro, inglês, `prefers-reduced-motion`, `npm run build`.
6. Commits separados por seção (`style(home): ...`); push só pelo Rafael.

## 6. Perguntas em aberto
1. Experiência: prefere A, B, C ou a combinação A + C?
2. Quais fotos entram na galeria? Podem ser de ambas as unidades, ou só de uma?
3. Algum material extra (vídeo curto, depoimentos reais) para os pontos vivos?
4. Os itens da lista de comodidades valem para as duas unidades ou há diferença entre Recanto 1 e 2?
5. Ordem de prioridade: Comodidades primeiro (mais simples) e depois Experiência?
