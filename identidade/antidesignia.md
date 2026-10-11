# VISUAL-FIRST & ANTI-AI-SLOP DESIGN RULE
### Módulo plugável para qualquer Design System
> Versão 3.0 Final — Baseado em pesquisa de 1.590 páginas reais (Adrian Krebs, 2026) + tendências anti-AI 2025–2026

---

## POR QUE ESSA REGRA EXISTE

Em abril de 2026, o designer Adrian Krebs auditou 1.590 landing pages usando Playwright para detectar padrões CSS e DOM de forma determinística. Resultado:

- **22%** = "heavy slop" — 4+ padrões de IA detectados
- **32%** = slop leve — 2–3 padrões
- **46%** = limpas — 0–1 padrão

Mais da metade dos produtos lançados hoje tem uma **impressão digital visual que grita "gerado por IA sem nenhuma opinião"**. O problema central não é que a IA é ruim. É que **a IA replica a média da internet** — e a média é esquecível.

Além disso, sites gerados por IA tendem a preencher interfaces com **texto como substituto de design**. O resultado: blocos densos de parágrafos, listas intermináveis, títulos empilhados — tudo comunicando falta de intenção visual.

Sites que parecem feitos por designers de verdade têm um padrão claro:
- Pouco texto, muito **impacto visual**
- Informação entregue por **componentes**, não por parágrafos
- Hierarquia criada por **espaço, cor e forma** — não só por tamanho de fonte
- Interatividade como linguagem — o usuário **sente** o produto antes de ler qualquer coisa

Esta regra existe para forçar **decisões deliberadas** sobre tudo que a IA defaulta automaticamente.

---

## PARTE 1 — OS 18 PADRÕES DE "AI SLOP" PROIBIDOS

Estes são os padrões detectáveis por script CSS/DOM que identificam um design como AI-generated. **Cada um deles é proibido por padrão.**

### BLOCO A — TIPOGRAFIA

**#1 — Inter em tudo**
Inter é a Helvetica da era dos LLMs. Todo gerador de código/design usa Inter como default. Se você está usando Inter sem ter escolhido ativamente, está usando o default da máquina.
> Alternativas: Geist, Söhne, Haas Grotesk, Untitled Sans, Satoshi, Cabinet Grotesk, Bricolage Grotesque, Plus Jakarta Sans.

**#2 — Combinações de fonte repetidas pela IA**
A IA repete os mesmos pares: Space Grotesk + Instrument Serif, Geist + qualquer coisa, Inter + Inter. Se sua combinação é a mesma de 40% dos SaaS lançados esse mês — é um default, não uma escolha de marca.

**#3 — Serif italic como accent de uma palavra**
"Build the *future*" — palavra em itálico serif no meio de headline Inter. Foi tendência em 2023. Agora é o sinal mais claro de output de IA sem edição.

---

### BLOCO B — CORES

**#4 — "VibeCode Purple" (lavanda como cor primária)**
Existe uma tonalidade específica de lavanda-roxo que vaza de geradores de imagem e ferramentas de IA. Se seu produto não é deliberadamente sobre essa cor, não use. A IA escolhe roxo porque é a cor mais "segura e moderna" no dataset de treinamento.

**#5 — Dark mode permanente com texto cinza médio + labels all-caps**
Dark mode + texto em `#999` ou `#888` + seções em ALL CAPS é o kit padrão de "parece profissional" da IA. Isoladamente cada um pode funcionar. Os três juntos = fingerprint AI.

**#6 — Contraste de texto quase-passando em dark mode**
Temas escuros gerados por IA frequentemente shippam com texto que mal passa no WCAG AA. A IA otimiza para "visualmente elegante" e falha em acessibilidade básica.
> Contraste mínimo: **4.5:1** para corpo, **3:1** para títulos grandes (WCAG AA).

**#7 — Gradientes em tudo**
Gradiente no hero. Nos botões. Nas bordas dos cards. No background. Cada gradiente individual pode funcionar. Todos juntos = a IA não sabia fazer escolha, então gradientou tudo.

**#8 — Colored glows gigantes e box-shadows coloridos**
O glow colorido atrás do mockup de produto. A shadow roxa no card. Eram tendência em 2022. São agora sinal de design gerado sem revisão humana.

---

### BLOCO C — LAYOUT

**#9 — Hero centralizado com headline genérica**
"Build the future of work." "Your all-in-one platform." "Scale without limits." A IA gera headlines gramaticalmente corretas, topicamente relevantes e completamente esquecíveis — porque foram geradas pela média de todas as headlines que já existiram. Hero centralizado + headline vaga + CTA duplo = template padrão de todo LLM.

**#10 — Badge acima do H1**
```
[ ✨ Novo: Lançamos a versão 2.0 ]
        Headline Principal
```
Ficou popular em 2022–2023 como social proof. A IA replicou em 100% dos casos. Agora é identificador, não diferenciador.

**#11 — Borda colorida na lateral ou topo dos cards**
A borda esquerda colorida em cards é *"quase tão confiável como sinal de design IA quanto o em-dash é para texto gerado por IA"* (Adrian Krebs, 2026). Uma vez que você vê, não consegue parar de ver.

**#12 — Feature cards idênticos com ícone no topo**
3 ou 4 cards com exatamente o mesmo tamanho, mesmo padding, ícone centralizado no topo, título, 2 linhas de descrição. Esse grid 3-colunas uniforme é o layout mais gerado por IA no planeta.

**#13 — Sequência numérica "1, 2, 3" para steps sem visual**
A seção "como funciona" com três steps numerados em linha, sem imagem, sem preview, só texto. Substitua por visual storytelling real: screenshot de cada step, mockup animado, ou diagrama.

**#14 — Stat banner horizontal uniforme**
```
| 10K+ usuários | 99.9% uptime | 4.9★ rating | $2M processados |
```
Apareceu em 22% das páginas auditadas. A forma de grid horizontal uniforme grita IA. Mova os stats para contextos com hierarquia visual.

**#15 — Nav ou sidebar com ícones emoji**
Emoji como ícones de navegação em dashboards é um shortcut que a IA usa porque é fácil de gerar. Em produto real parece amador.

**#16 — All-caps em headings e section labels automáticos**
FEATURES. PRICING. HOW IT WORKS. All-caps como separadores de seção, combinado com os outros padrões, completa o fingerprint. Use all-caps apenas com intenção tipográfica clara, nunca como padrão automático.

---

### BLOCO D — CSS E COMPONENTES

**#17 — shadcn/ui sem customização**
shadcn foi projetado para ser copy-paste por agentes de IA. Todo produto gerado por IA sem intervenção visual converge para o visual shadcn. Use a biblioteca — mas **customize tokens de cor, border-radius, shadows e tipografia antes** de qualquer coisa.

**#18 — Glassmorphism como default**
O card de vidro fosco com backdrop-blur teve seu momento em 2022. É o default LLM desde então. Use apenas com justificativa visual clara, nunca como primeiro instinto.

---

## PARTE 2 — A REGRA PRINCIPAL: VISUAL ANTES DE TEXTO

> **"Se pode ser um componente visual, não deve ser texto."**

Antes de escrever qualquer bloco de texto, pergunte:

| Você quer dizer... | Use isso — não texto |
|---|---|
| "Temos 3 vantagens" | 3 Cards com ícone + título curto |
| "Nosso processo tem etapas" | Visual stepper com screenshot por etapa |
| "Veja como funciona" | Mockup animado / carousel de telas |
| "Entregamos resultados" | Stat grid com números grandes + trend arrows |
| "Clientes satisfeitos" | Testimonial card: foto real + estrelas + quote curta |
| "Compare nossos planos" | Comparison table com visual highlight no recomendado |
| "Integra com suas ferramentas" | Logo grid / Integration badges reais |
| "Veja na prática" | Dashboard mockup interativo ou embedded preview |
| "Passo a passo" | Numbered steps com screenshot por passo |
| "Nossos clientes" | Avatar stack + logo wall compacto |
| "Crescimento/progresso" | Sparkline chart / barra de progresso com dado real |
| "Status ou estado" | Badge colorido / Dot indicator / Pill |

### Hierarquia visual obrigatória por seção

```
1. ÂNCORA VISUAL    → o olho chega aqui primeiro (mockup, stat, ícone, imagem)
2. DADO / LABEL     → confirmação imediata do que foi visto
3. TEXTO CURTO      → contexto mínimo (máx. 2 linhas)
4. AÇÃO / CTA       → próximo passo
```

**Nunca inverta essa ordem.** Texto não é âncora visual.

### Proporção visual-texto por tipo de página

| Tipo de página | Visual mínimo | Texto máximo |
|---|---|---|
| Hero section | 65% | 35% |
| Landing page completa | 70% | 30% |
| Dashboard | 80% | 20% |
| Feature section | 65% | 35% |
| Pricing page | 55% | 45% |
| Onboarding / steps | 70% | 30% |
| Blog / Docs | 35% | 65% |

**Regra prática:** mais de 3 linhas de texto sem elemento visual entre elas = quebre com um componente.

---

## PARTE 3 — COMPONENTES VISUAIS DE ALTO IMPACTO

### Stat Blocks (substituto de dados em texto)

```
┌──────────────────────────┐
│   +2.400                 │  ← número em destaque (font-size: 40–72px, bold)
│   usuários ativos        │  ← label pequeno (font-size: 12–13px, muted)
│   ↑ 34% esse mês        │  ← trend com cor semântica (verde/vermelho)
└──────────────────────────┘
```

Regras para stat blocks:
- Número sempre maior que qualquer outro texto na seção
- Label em no máximo 3 palavras
- Trend obrigatório quando o dado é temporal
- Nunca em linha horizontal uniforme (padrão #14) — varie tamanho e posição

### Feature Cards com Ícone (versão correta)

```
┌─────────────────────────┐
│  [ícone 32–48px]        │  ← colorido, não monocromático cinza
│                         │
│  Título da feature      │  ← máx. 1 linha, 4 palavras
│  Descrição curta em     │  ← máx. 2 linhas, 20–25 palavras
│  uma ou duas linhas.    │
└─────────────────────────┘
```

Regras para feature cards:
- Ícone: 32–48px, com cor do sistema — não cinza genérico
- Fundo: levemente diferenciado do background (border sutil, shadow leve, ou bg-muted)
- **Proibido:** borda colorida lateral (padrão #11), ícone centralizado em card idêntico a outros (padrão #12)
- **Correto:** tamanhos variados em bento grid, ícone alinhado à esquerda ou top-left

### Prova Social (sem parecer preenchimento de IA)

```
❌ IA gera:
"Adoramos o produto!" — João Silva, CEO da Empresa

✅ Design real usa:
[foto real] + nome + cargo + empresa + [3–5 estrelas]
Quote específica de no máximo 2 linhas com dado concreto
("Reduzimos o tempo de entrega em 40% no primeiro mês")
```

Elementos obrigatórios de prova social:
- Avatar real (foto ou ilustração com identidade) — nunca só nome em texto
- Star ratings visíveis em cada testimonial
- Contador de usuários como stat block, não como frase corrida
- Logo wall de clientes em grid compacto com tamanho proporcional

### Mockups de Produto como Hero Visual

O padrão mais diferenciador de 2026: **mostrar o produto, não falar sobre ele.**

Formatos eficazes:
- Screenshot em frame de browser/device com perspectiva 3D leve ou isométrico
- Animação de interação real (hover, clique, transição) como GIF ou Lottie
- Side-by-side before/after mostrando o problema sendo resolvido
- Dashboard com dados reais anonimizados
- Zoom em feature específica com callout visual e seta de destaque

---

## PARTE 4 — TIPOGRAFIA COM PONTO DE VISTA

> *"Tipografia pode ser a última coisa que a IA não consegue fingir."*
> — Creative Boom, 2026

### A regra das duas fontes

Toda identidade tipográfica forte tem **duas fontes**: uma com personalidade (display/headline) e uma funcional (body). A IA defaulta para uma fonte em tudo, ou para pares genéricos.

```
Display/Headline:  fonte com personalidade visual clara e adjetivo definível
Body/UI:           fonte legível e neutra — DIFERENTE da display
Mono (opcional):   para código, dados técnicos, números de precisão
```

**Critério de escolha:**
- Se você consegue descrever a fonte como "neutra e limpa" — é Inter. Escolha outra.
- A fonte deve ser descrita com um adjetivo de personalidade: editorial, enérgica, confiável, brutalist, quente, técnica, elegante.
- Fontes que funcionam: Playfair Display, Bricolage Grotesque, Cabinet Grotesk, Fraunces, Archivo Black, Unbounded, Clash Display, General Sans, DM Serif Display.

### Escala tipográfica obrigatória

| Elemento | Tamanho | Peso | Regra |
|---|---|---|---|
| Hero headline | 56–96px | 700–900 | Deve impactar antes de ser lido |
| Section headline | 32–48px | 600–700 | Máx. 2 linhas, 10 palavras |
| Card title | 18–24px | 600 | Máx. 1 linha, 4 palavras |
| Body text | 15–17px | 400 | Line-height 1.6–1.75 |
| Labels / captions | 11–13px | 500 | Com letter-spacing +0.05em |
| Stat / número | 40–72px | 700–800 | Contraste visual máximo |
| CTA button | 14–16px | 600 | 2–5 palavras |

### Anti-padrões tipográficos

```
❌ Inter para título E corpo (zero distinção hierárquica)
❌ Serif italic em UMA palavra de headline como "accent" (padrão #3)
❌ All-caps automático em section labels (padrão #16)
❌ Mais de 2 famílias tipográficas em uma página
❌ Escala sem sistema (saltar de 14px para 48px sem intermediários)
❌ Linha de corpo com mais de 75 caracteres (prejudica leitura)
❌ Headlines com mais de 12 palavras
```

---

## PARTE 5 — SISTEMA DE CORES COM INTENÇÃO

### Cor decorativa vs. cor semântica

A IA aplica cor **decorativamente** — o que "parece bom" estatisticamente. Design real aplica cor **semanticamente** — cada cor tem função.

**Sistema de tokens semânticos obrigatório:**

```css
/* Adapte para seu Design System */
--color-action-primary       /* botões de ação principal */
--color-action-secondary     /* botões secundários */
--color-feedback-success     /* confirmações, status positivo */
--color-feedback-warning     /* alertas */
--color-feedback-error       /* erros */
--color-surface-base         /* fundo principal */
--color-surface-raised       /* cards, modals */
--color-surface-sunken       /* inputs, áreas recuadas */
--color-surface-alt          /* seções alternadas */
--color-text-primary         /* texto principal */
--color-text-secondary       /* texto auxiliar / muted */
--color-text-disabled        /* estados desativados */
--color-border-default       /* bordas padrão */
--color-border-focus         /* estados de foco */
```

### Paletas com personalidade (que não são defaults de IA)

Fugir de lavanda não significa usar cores berrantes. Significa fazer **uma escolha deliberada** e construir o sistema a partir dela.

| Direção | Descrição | Tipo de marca |
|---|---|---|
| Earth tones | âmbar, terracota, verde-musgo | Humana, artesanal, sustentável |
| Alto contraste | preto fundo + 1 bright accent (amarelo, laranja, verde-limão) | Tech, criativa, direta |
| Cream-and-dark | off-white quente + tipografia quase-preta | Editorial, premium |
| Steel and copper | cinza frio + cobre/bronze | Tech premium, B2B |
| Monochromatic bold | 1 cor em múltiplas saturações e luminosidades | Foco, minimalismo |

### Anti-padrões de cor

```
❌ Purple/lavanda como cor primária sem justificativa de marca
❌ Gradiente azul→roxo como background padrão
❌ Glow colorido atrás de múltiplos elementos "premium"
❌ Dark mode com texto #888 em fundo #111 (contraste insuficiente — falha WCAG AA)
❌ 5+ cores distintas em uma página sem hierarquia semântica
❌ Cor como decoração sem função definida
❌ Border-radius uniforme em todos os elementos (ausência de hierarquia de forma)
```

### Variação de superfície entre seções

A IA gera tudo sobre um único fundo. Design com intenção cria **ritmo visual** variando superfície:

```
Seção 1: --color-surface-base     (principal: branco/off-white)
Seção 2: --color-surface-alt      (levemente diferente: cinza claro ou tom de marca baixa saturação)
Seção 3: --color-surface-base
Seção 4: --color-surface-dark     (inversão dark — seção de destaque)
Seção 5: --color-surface-base
```

---

## PARTE 6 — LAYOUT E COMPOSIÇÃO

### Bento grid em vez de grid uniforme

A IA gera grids perfeitamente uniformes porque é o mais fácil de codificar. Design real tem **variação hierárquica intencional**.

```
PROIBIDO — grid 3-colunas uniforme:
┌────────┐ ┌────────┐ ┌────────┐
│ card   │ │ card   │ │ card   │
└────────┘ └────────┘ └────────┘

CORRETO — bento grid com hierarquia:
┌─────────────────────┐ ┌───────┐
│  feature principal  │ │ small │
│  (tile grande)      │ └───────┘
└─────────────────────┘ ┌───────┐
┌───────────────┐       │ small │
│ segunda feat. │       └───────┘
└───────────────┘
```

O tamanho do tile comunica importância. Feature principal = tile maior. Funcionalidades de suporte = tiles menores.

### O princípio do primitivo único

> *"Os sites no grupo dos 46% mais limpos fazem uma coisa: escolhem um primitivo de layout e o repetem até ele virar a assinatura visual do site."*

Não sete tipos de card com sete tratamentos. Não três stat banners e quatro sequências de steps. **Um primitivo, repetido com consistência, cria reconhecimento de marca.**

Exemplos de primitivos únicos bem executados:
- **Linear:** tabelas horizontais minimalistas com densidade alta
- **Stripe:** seções wide-screen com produto à direita
- **Notion:** grid assimétrico com tipografia como elemento visual principal
- **Vercel:** dark mode com código como hero visual

### Espaçamento que respira

| Contexto | Valor |
|---|---|
| Espaçamento entre elementos dentro de seção | 16–24px |
| Gap entre cards em grid | 16–24px |
| Padding interno de card | 24–32px |
| Espaçamento entre seções de uma página | 80–128px |
| Padding lateral de seções (desktop) | 80–120px |
| Max-width de conteúdo (layout) | 1280px |
| Max-width de texto corrido | 720px |

**Regra de respiração:** se parece apertado, está apertado. Espaço em branco é elemento de design, não ausência dele.

---

## PARTE 7 — FOTOGRAFIA E IMAGENS

### O que a IA usa (e você não deve)

```
❌ Stock photos de pessoas sorridentes em laptops em escritórios impossíveis
❌ Blobs 3D abstratos flutuando como "hero visual"
❌ Ilustrações que poderiam pertencer a qualquer outro produto
❌ Mockups com dados placeholder óbvios ("Lorem Ipsum", "John Doe", "12/12/2023")
❌ Ícones de packs genéricos sem consistência de estilo entre si
```

### O que diferencia

```
✅ Screenshots reais do produto em frames de dispositivo (browser, mobile)
✅ Fotos reais da equipe, do processo, do escritório
✅ Ilustrações com estilo único e reconhecível — não poderia ser de outro produto
✅ Dados reais (anonimizados) em dashboards mockados
✅ Gravações de tela reais (GIF, vídeo autoplay) mostrando o produto funcionando
✅ Mockups em perspectiva 3D leve ou isométrico com conteúdo real
```

---

## PARTE 8 — MOTION E MICROINTERAÇÕES

### Por que a IA falha em motion

A IA não gera motion com personalidade porque motion requer entender **intenção**, não padrões estatísticos. O resultado típico: sem animação nenhuma, ou fade-in genérico em tudo com mesmo timing, ou botões que "snappam" em vez de easear.

### As 3 regras de motion

**Regra 1 — Todo motion deve comunicar, não decorar**
- Botão pressionado → feedback tátil (scale-down leve + ease)
- Cards entram → a direção do scroll determina de onde vêm
- Modal abre → não surge do nada, vem de onde faz sentido espacialmente

**Regra 2 — Motion reflete a personalidade da marca**
- Produto técnico/preciso → animações lineares, exatas, sem bounce
- Produto criativo/humano → spring physics, bounce sutil, caráter
- Produto financeiro/confiável → slow ease-out, zero surpresas

**Regra 3 — Microinterações em ordem de prioridade**

1. Botão CTA principal (hover + press states com transição visível)
2. Inputs de formulário (focus state animado, erro com shake, sucesso com check)
3. Cards (hover com elevation ou highlight sutil)
4. Links de nav (underline animado, não só mudança de cor)
5. Loading states (skeleton com shimmer — nunca spinner genérico)

### Timings de referência

| Tipo | Duração | Easing |
|---|---|---|
| Hover em botão | 120–150ms | ease-out |
| Press de botão | 80–100ms | ease-in |
| Abertura de modal | 200–280ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Fade-in de seção (scroll) | 400–600ms | ease-out |
| Transição de página | 300–400ms | ease-in-out |
| Spring / bounce | 500–700ms | spring physics |

---

## PARTE 9 — COPY E VOZ

### Como identificar copy de IA

A IA gera copy que é gramaticalmente correto, topicamente relevante e completamente esquecível — porque foi gerada pela média de tudo que já existiu.

**Frases e palavras proibidas (100% geradas por IA):**

```
❌ "leverage innovation"         ❌ "ensure seamless experiences"
❌ "cutting-edge solutions"      ❌ "empower your team"
❌ "all-in-one platform"         ❌ "scale without limits"
❌ "build the future"            ❌ "next-generation"
❌ "transformative"              ❌ "unlock your potential"
❌ "streamline your workflow"    ❌ "game-changing"
❌ "best-in-class"               ❌ qualquer headline que poderia pertencer a outro produto
```

### O teste do CEO

> *"Todo headline deve passar no teste: 'Nosso CEO diria exatamente isso?'"*

Copy com personalidade é **específico ao ponto de não poder pertencer a outro produto:**
- Stripe: *"Financial infrastructure for the internet."*
- Linear: *"Plan and build products."*
- Superhuman: *"The fastest email experience ever made."*

### Limites de texto por elemento

| Elemento | Máximo |
|---|---|
| Hero headline | 8–10 palavras |
| Hero subheadline | 20 palavras |
| Card description | 20–25 palavras (2 linhas) |
| Feature title | 4 palavras |
| CTA button | 2–5 palavras |
| Stat label | 3 palavras |
| Nav item | 1–2 palavras |

---

## PARTE 10 — O TOQUE HUMANO

### A tendência anti-AI de 2026

Em reação à monocultura visual criada pela IA, designers em 2026 estão deliberadamente injetando **imperfeição como sinal de autenticidade**:

- Texturas que mostram desgaste, grão, processo
- Ilustrações com wobble, linhas não-perfeitas, peso irregular
- Tipografia "errada" — espaçamento proposital, distorção intencional
- Layouts que quebram o grid — não por erro, mas por decisão
- Fotografias de processo, não de resultado polido
- Elementos escaneados, impressos ou com qualidade de risógrafo

**Não significa fazer design ruim.** Significa fazer design que claramente teve **uma pessoa com ponto de vista** por trás.

### Checklist do toque humano

Todo design deve ter **pelo menos 1–2** destes elementos:

```
✅ Uma cor que não é padrão de nenhuma biblioteca
✅ Uma fonte que claramente foi escolhida, não defaultada
✅ Um elemento visual que só faz sentido para essa marca específica
✅ Copy que nenhuma IA geraria sem instrução muito específica
✅ Uma interação com "personalidade" perceptível (não fade genérico)
✅ Uma quebra de grid intencional que cria tensão visual
✅ Textura, grão ou imperfeição proposital
✅ Um ícone ou ilustração customizado — não de pack genérico
```

---

## PARTE 11 — CHECKLIST COMPLETO DE REVISÃO

### Antes de gerar qualquer design, defina:

```
□ Qual é a fonte display? (não Inter)
□ Qual é a fonte de corpo? (diferente da display)
□ Qual é a cor primária? (não lavanda/roxo padrão)
□ Qual é o fundo principal? (não branco puro nem dark mode automático)
□ Qual é o primitivo de layout que vai se repetir?
□ Qual é a personalidade do motion? (precisa / quente / técnica / playful)
```

### Durante revisão de qualquer tela:

**TIPOGRAFIA**
```
□ Não usa Inter como única fonte?
□ Sem serif italic como accent em uma palavra?
□ Sem all-caps automático em section labels?
□ Headlines com máximo de 10 palavras?
□ Nenhum bloco de corpo com mais de 75 chars por linha?
```

**CORES**
```
□ A paleta tem um ponto de vista? (não é purple default)
□ As cores têm função semântica, não só decorativa?
□ Contraste passa WCAG AA em todos os tamanhos de texto?
□ Sem gradiente em mais de 1 elemento por seção?
□ Sem colored glow em mais de 1 elemento principal?
□ Border-radius tem variação hierárquica, não uniforme em tudo?
```

**LAYOUT**
```
□ Hero não é centered genérico + headline vaga + CTA duplo?
□ Sem badge acima do H1?
□ Cards sem borda colorida lateral/topo?
□ Feature grid não é 3 cards idênticos com ícone centralizado no topo?
□ "Como funciona" tem imagem/mockup — não só texto numerado?
□ Sem stat banner horizontal uniforme?
□ Nav sem emoji como ícones?
□ Proporção visual/texto dentro da faixa para o tipo de página?
□ Seções têm variação de superfície (não tudo um único fundo)?
```

**VISUAL E CONTEÚDO**
```
□ Existe âncora visual em cada seção antes do texto?
□ Imagens são reais (produto, equipe) — não stock ou 3D blob?
□ Mockups têm dados plausíveis (não Lorem Ipsum / John Doe)?
□ Stat blocks têm número grande + label pequeno + trend?
□ Feature cards com ícone colorido (não cinza monocromático)?
□ Prova social tem foto real + estrelas + quote específica?
□ Copy sem nenhuma das frases proibidas?
□ Headlines passam no "teste do CEO"?
□ Existe pelo menos 1 elemento com "toque humano"?
```

**MOTION**
```
□ CTA principal tem hover + press state com transição?
□ Inputs têm focus state animado?
□ Animações de scroll têm direção e timing coerentes?
□ Nenhuma animação existe só como decoração?
□ Loading states usam skeleton shimmer (não spinner genérico)?
```

**COMPONENTES CSS**
```
□ shadcn/ui (se usado) teve tokens customizados antes?
□ Glassmorphism evitado ou com justificativa clara?
□ Box-shadows têm direção e profundidade coerentes?
```

---

## PARTE 12 — COMO INTEGRAR ESTA REGRA

### Em prompts de IA (copie e cole antes de qualquer geração)

```
ANTI-AI-SLOP DESIGN RULES (obrigatório seguir):

TIPOGRAFIA:
- Proibido Inter. Use uma fonte display com personalidade + fonte de corpo diferente.
- Proibido: serif italic como accent, all-caps automático em labels.
- Headlines: máx. 10 palavras. Card descriptions: máx. 2 linhas / 25 palavras.

CORES:
- Proibido: lavanda/roxo como cor primária padrão, gradiente azul→roxo.
- Cores com função semântica, não decorativa. Contraste mínimo WCAG AA.
- Proibido: colored glow em mais de 1 elemento por seção.

LAYOUT:
- Proibido: hero centralizado com headline genérica + badge acima do H1.
- Proibido: feature grid de 3 cards idênticos com ícone centralizado no topo.
- Proibido: borda colorida lateral/topo em cards.
- Proibido: stat banner horizontal uniforme.
- Use bento grid com variação de tamanho para comunicar hierarquia de importância.
- Escolha 1 primitivo de layout e repita com consistência.

CONTEÚDO VISUAL:
- Proporção mínima: 65% visual / 35% texto (fora de contexto editorial).
- Toda seção tem âncora visual ANTES do texto.
- Substitua listas e parágrafos por: cards com ícone, stat blocks, mockups, timelines.
- Imagens: screenshots reais do produto em device frames. Proibido stock photos e 3D blobs.
- Stat blocks: número grande (40–72px) + label pequeno (máx. 3 palavras) + trend.

COPY:
- Proibido: "leverage", "seamless", "cutting-edge", "empower", "all-in-one", "scale without limits", "best-in-class", "transformative".
- Toda headline deve ser específica ao produto — não poderia pertencer a outro produto.

COMPONENTES:
- Proibido: glassmorphism como default.
- Se usar shadcn/ui: customize tokens de cor, border-radius e tipografia antes.
- Microinterações obrigatórias: hover/press em CTA, focus animado em inputs.

TOQUE HUMANO:
- Inclua ao menos 1 elemento que não veio do default de nenhuma IA ou biblioteca.
- Uma cor deliberada, uma tipografia com personalidade, um detalhe visual único da marca.
```

### Em Design Systems (Figma / Storybook)

- Crie um componente de checklist como **annotation layer** em cada frame de entrega
- Adicione tokens semânticos de cor nomeados como `--color-action-primary` (não `--color-blue-500`)
- Crie variants de componentes que forcem escolhas tipográficas (display ≠ body)
- Documente o "primitivo de layout" escolhido na capa do DS

### Em code review de frontend

Trate como lint rule semântica:
- Qualquer `<section>` sem ao menos um elemento não-textual (`<img>`, `<svg>`, componente visual) → aviso
- Uso de `font-family: 'Inter'` no CSS global sem override de display font → aviso
- `color: #888` ou `#999` em dark mode → erro de contraste, bloquear PR

---

## PARTE 13 — REFERÊNCIAS DE DESIGN HUMANO VS. AI SLOP

| Produto | O que faz certo |
|---|---|
| **Linear** | Primitivo único. Tipografia precisa. Zero decoração desnecessária. |
| **Stripe** | Tipografia bespoke. Mockup de produto como hero. Copy ultra-específica. |
| **Vercel** | Fonte própria (Geist). Dark mode com contraste real. Código como visual. |
| **Notion** | Paleta quente e não-padrão. Cor semântica. Ilustrações próprias. |
| **Loom** | Produto real no hero. Gravações reais como prova social. |
| **Superhuman** | Copy com personalidade extrema. Hierarquia tipográfica agressiva. |
| **Duolingo** | Motion com personalidade inconfundível. Ilustração própria. Zero padrão genérico. |

---