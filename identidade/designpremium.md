# Playbook — Site institucional nível Brenergy

Documento para entregar a qualquer IA (ou pessoa) antes de começar um site. Descreve como pensar, o que construir e como verificar para chegar ao nível do site da Brenergy (agosto/2026): one-page animada + blog editorial(rankeamento SEO), sem uma única foto própria, com ilustração vetorial autoral, mapa, diagrama, contadores, vídeo e tipografia cinética.

**Como usar:** cole este arquivo inteiro no início da conversa com a IA e, em seguida, o briefing do novo projeto (empresa, público, identidade, conteúdo disponível). Peça que ela siga o Processo (seção 2) na ordem — o primeiro entregável é sempre o plano, nunca código.

---

## 1. O que fez diferença (os princípios)

- **Planejar tudo antes de codar.** Um documento com todas as seções, o conteúdo real de cada uma, os elementos gráficos nomeados (G1, G2…) e o movimento de cada bloco. O dono aprova o mapa; só depois vem o código, uma seção por vez.
- **Referências com veredito.** Antes do plano, uma lista de sites de referência com o que foi aprovado (ex.: "texto passando por trás de elemento da imagem", "in a few numbers", "notícias como núcleo") e rejeitado (ex.: "listagem densa", "texto demais"). Cada referência aprovada entra em uma seção específica do plano — nada entra "porque é bonito".
- **Uma assinatura por seção.** Cada seção tem um elemento memorável (sol que nasce, mapa que se desenha, torre na frente do texto, órbitas que giram, capa tipográfica). O resto é disciplinado e quieto. "Antes de sair, tire um acessório."
- **Estrutura é informação.** Numeração só quando existe sequência real (6 etapas). Anéis do diagrama codificam distância da obra. Cores dos chips codificam categoria. Nada de decoração que não signifique algo.
- **Conteúdo real, com fonte.** Números com fonte (matéria, documento, memória da empresa). Estimativas marcadas com "~" e legenda. O que não foi validado vai para uma lista de pendências com o dono, não para o ar.
- **Zero foto própria não é limitação, é direção.** Ilustração line-art autoral, mapa, dados animados, vídeo stock, imagem gerada em máscara orgânica, capas geradas por código. Quando a foto real chegar, ela entra sem mudar estrutura.
- **Movimento com propósito, não com quantidade.** Um sistema de movimento definido uma vez (tabela), aplicado em todas as seções. `prefers-reduced-motion` sempre respeitado. Nenhuma animação bloqueia leitura.
- **Honestidade técnica.** Formulário que não tem destino configurado não finge sucesso. Newsletter sem provedor avisa no código. Dados pendentes ficam comentados no componente.
- **Verificar com os olhos.** Toda seção é fotografada em headless (desktop 1920 e mobile 390), com estado final forçado, antes de ser dada como pronta. Console checado com e sem reduced-motion. Build de produção verde a cada seção.

---

## 2. Processo (na ordem)

| Etapa | Entregável | Regra |
|---|---|---|
| **2.1 Identidade web** | Tokens (cores, 3 fontes com papéis, formas, raios), extraídos do Figma/logo | A identidade do site pode divergir do guia de redes sociais — documentar a fonte da verdade |
| **2.2 Referências** | Tabela "referência → elemento roubado → seção onde entra" | Só o que foi aprovado pelo dono |
| **2.3 Plano completo** | 1 documento: mapa do site, sistema de movimento, cada seção com objetivo / conteúdo / elementos gráficos / movimento / mobile, inventário de gráficos (G1…Gn), pendências com o dono, ordem de implementação, critérios de verificação | Não codar antes da aprovação. Perguntas de arquitetura (one-page vs. páginas, CMS vs. MDX, seção dedicada ou não, há fotos?) são feitas como múltipla escolha, uma por vez |
| **2.4 Sistema de movimento** | Componentes Revelar, RevelarTitulo, Contador, Parallax, hooks de media query | Tudo depende disso; fazer primeiro |
| **2.5 Seção por seção** | Componente + rota de preview temporária + prints desktop/mobile + console + lint + build | Uma seção por ciclo; a primeira seção ilustrada define o estilo de traço do site inteiro |
| **2.6 Passada final** | Entrada animada do hero, metadados/OG, not-found, sitemap, Lighthouse mobile | Só depois de todas as seções |

### 2.7 As referências usadas no Brenergy — aprovadas e rejeitadas

A pesquisa foi organizada em categorias (A: setor solar/renovável · B: institucional/investidor · C: coleções "produtizadas" fora do setor · D: boards Pinterest · E: editorial/notícias), cada referência com link real, e o dono reagiu a cada uma respondendo três perguntas: estrutura (like/dislike), estilo visual (like/dislike) e "se roubasse 1 elemento, qual seria?". Abaixo, o resultado que virou o site (revisão de 19/08/2026).

#### Aprovadas — e onde cada elemento entrou

| Referência | Link | O que foi aprovado (o elemento roubado) | Virou, no Brenergy |
|---|---|---|---|
| **Virya Energy** | awwwards.com/sites/virya-energy | 1) animação de entrada do header ao abrir o site; 2) a seção "Virya Energy in a few numbers"; 3) a seção "worldwide impact" — "quero isso, adaptado para nossos projetos e o impacto energético" | Navbar com entrada animada e pill no scroll; 03 · Números (grid 4×2 com contadores e célula âncora); 05 · Projetos & Impacto (mapa do Brasil com pins + 3 números de impacto) |
| **Volta Solar** | awwwards.com/sites/volta-solar | Os SVGs ilustrados da seção 2 — recriar na identidade da Brenergy, não copiar o traço original | O estilo de ilustração line-art autoral do site inteiro: 02 · Manifesto (paisagem com sol que nasce) e 04 · Como funciona (cena montada por etapas) |
| **SOLAR DIGITAL** | awwwards.com/sites/solar-digital | 1) as animações do site em geral; 2) grids animados — "todos os grids têm movimento, nada estático" | A regra "nenhum grid estático": cascata de entrada + hover em Números, Sobre, Grupo FX, Notícias, lista de projetos |
| **SOLTERA — Wind Energy** (Behance, case de portfólio) | behance.net/gallery/249098715 | O header: fonte densa e grotesca + efeito de profundidade — o texto passando por trás do cata-vento da imagem | 06 · Faixa cinética: vídeo → marquee gigante → silhueta da torre solarimétrica na frente (3 camadas) |
| **Casa dos Ventos** | casadosventos.com.br | A parte de notícias. "Nosso site não vai ter muito conteúdo sobre projetos, então vamos focar no mercado. Notícia/blog é muito importante" | Mudança de eixo do site: 09 · Mercado & energia + /noticias + artigo + pipeline MDX viram núcleo, projetos viram seção enxuta |
| **Canary Media** (+ case study do redesign pela Happy Cog) | canarymedia.com · happycog.com/work/canary-media | Estrutura editorial mista (hero grande + grid de 3 + lista), serifa para credibilidade + sans para interface, ~40–50% de imagem | Home de notícias = 1 destaque horizontal + 3 cards; serif itálica como assinatura; poucos artigos por tela |
| **Heatmap News** | heatmap.news | Tags de categoria coloridas (inclusive amarelo para "Energy", que conversa com a paleta) e taxonomia clara | Sistema de 5 categorias com chip de cor própria (lima, verde, amarelo, tinta, gradiente) nos cards, filtros e capas |
| **The Lookback** (Better Off Studio) | awwwards.com/sites/the-lookback | Site of the Day com nota 8.6 em animações e transições: conteúdo em formato de galeria com movimento, oposto de listagem estática | Grid de notícias que reentra em cascata ao trocar filtro; capas com hover em escala; reveals de título nas páginas editoriais |
| **By-Kin** (case study) | hontran.dev/blog/by-kin-case-study-award-winning-website | Tipografia cinética com Next.js + CMS — prova de que dá para ter conteúdo gerenciado sem abrir mão de animação | Título palavra a palavra (RevelarTitulo), wordmark do footer que se preenche, MDX como "CMS" versionado |

#### Rejeitadas — e o motivo (isso define o que evitar)

| Referência | Veredito | Motivo dito pelo dono |
|---|---|---|
| **Better Energy** (awwwards.com/sites/better-energy) | 👎 | "Genérico e simples demais. Não é o caminho" |
| **Renewable Energy — Solar Website UI Design** (Behance) | 👎 | "Muito texto e pouca imagem" |
| **BayWa r.e. — Case Studies** (baywa-re.com/en/case-studies) | 👎 | "Muito bagunçado" — página índice de cases, grid denso, muito texto |
| **Statkraft — PPA Case Studies** | 👎 | "Muito bagunçado" — mesmo formato de índice de cases |
| **MML Ventures** (identidade de fundo, Behance/Dribbble) | 👎 | Não agradou |
| **Categoria C inteira** (coleções do Awwwards: data visualization, dark mode, sites of the day) | ❌ | Rejeitada por completo — eram páginas de coleção/busca, não sites; "grade de thumbnails aleatórios" não dá para avaliar |
| **Green Energy 128 e similares** (templates Webflow/Framer à venda) | ⚠️ | Olhar só a estrutura de seções, nunca a estética — risco de "cara de template" |

#### Padrões que emergiram (e que guiaram todas as decisões)

- **O que agrada:** movimento e profundidade (entrada animada, grids animados, texto atravessando imagem) + dado organizado com peso institucional (números, impacto, mapa).
- **O que reprova:** estático, genérico e denso de texto. Índice de case studies foi rejeitado duas vezes pelo mesmo motivo → "listagem densa" virou o padrão a evitar, inclusive no blog (poucos artigos por tela, imagem grande).
- **A tensão central** — quer conteúdo de mercado como núcleo, quer animação, rejeita densidade — foi resolvida com estrutura editorial do Canary Media + linguagem de movimento do The Lookback/By-Kin: menos conteúdo por rolagem em troca de presença visual.
- **A Categoria B** rendeu uma única aprovação, e ela é estrutural, não visual: definiu o que o site precisa ter (notícias), enquanto A e E definiram como ele parece.

#### Lições sobre como apresentar referências ao dono

- Só sites ou projetos reais que dá para abrir e navegar — página de coleção/busca não funciona e é rejeitada em bloco.
- Cada referência com link checado, plataforma e uma nota do que interessa; cases de portfólio/estudante identificados como tal (avaliar só layout, não como benchmark de mercado).
- Três perguntas fixas por referência (estrutura, estilo, o que rouba) — a terceira é a que gera o plano.
- Registrar o veredito com a frase do dono; depois, mapear cada elemento aprovado para uma seção específica. Nada entra no plano sem origem numa aprovação.
- Uma rejeição repetida (mesmo motivo em sites diferentes) vale mais que uma aprovação: vira regra negativa do projeto.

---

## 3. Direção de arte

### 3.1 Tokens (exemplo Brenergy — adaptar à marca)

```css
@theme {
  --color-fundo: #fefefe;        /* superfície clara */
  --color-tinta: #252b36;        /* texto e TAMBÉM o fundo das seções escuras */
  --color-lima: #baff00;         /* início do gradiente de marca */
  --color-verde: #56d54f;        /* fim do gradiente */
  --color-amarelo: #f6c934;      /* acento raro (raio do símbolo) */
  --color-cinza: #c5c5c5;        /* texto de apoio sobre escuro */
}
```

**Regras de cor:** alternar seções claro → escuro → claro (xadrez). O gradiente de marca nunca é fundo de seção — só texto, linhas, pins, botão e um único card (o de contato, que é "o botão do hero em escala de seção").

### 3.2 Tipografia com três papéis

- **Display** (Manrope ExtraBold/Bold, tracking −0.04em): títulos H1/H2 em `clamp(34px, 5.1vw, 98px)`, leading 1.08.
- **Corpo** (ABeeZee Regular): parágrafos, nav, rótulos.
- **Assinatura** (IBM Plex Serif Italic): uma palavra-chave por título, 1.12em maior, com gradiente de marca (`background-clip: text`). Repete em todas as seções, nas capas das notícias e no título dos artigos. É o que torna o site reconhecível.

Carregar com `next/font` (sem CLS), expor como variáveis (`--font-titulo`, `--font-corpo`, `--font-serifa`) via `@theme inline`.

### 3.3 Formas de marca

- **Canto assimétrico** do botão do hero (`rounded-tl-[40px] rounded-tr-[10px] rounded-br-[40px] rounded-bl-[10px]`) reaproveitado em cards, capa do destaque, card Jaíba, CTA final do artigo; ampliado (80/20) no card de contato.
- **Círculo com seta em gradiente** (SetaCirculo) como CTA universal: desliza 6px no hover; rotaciona −45° para link externo, −90° para "voltar ao topo", 90° para "carregar mais".
- **Máscara orgânica** (blob em clipPath com objectBoundingBox) para toda imagem — nunca foto em retângulo cheio.
- **Grade fina** (1px branco a 4%, módulo 80px) como textura das seções escuras, com parallax leve de ±40px.
- **Linhas de 1px** (branco/10% no escuro, tinta/10% no claro) separando células de grid — sem bordas de card.
- **Padding de seção:** `px-[clamp(24px,4vw,76px)] py-[clamp(72px,8vw,150px)]`.

### 3.4 Estilo de ilustração (line-art autoral)

- Traço 1,5px, `stroke-linecap: round`, sem preenchimento — preenchimento só em áreas de marca (sol, pins, carimbo) com o gradiente.
- Uma cena compartilhada (`cena.ts`: morros, torre de transmissão, cabos em quadrática, subestação, torre solarimétrica, fileiras de trackers) reutilizada em duas seções com camadas ligadas/desligadas.
- Ícones 48×48 no mesmo traço; o traço lê `stroke="var(--traco, currentColor)"` e o utilitário `traco-gradiente { --traco: url(#grad-marca) }` troca para gradiente no hover (o `<linearGradient id="grad-marca">` vive num `<svg>` oculto da seção).
- IDs de gradiente únicos por instância via `useId()` (sanitizado) quando o componente pode repetir na página.

### 3.5 Copy

Títulos curtos com a palavra-chave em serif. Linha de apoio de 1 frase à direita. Parágrafos de 45–60 palavras. CTAs no imperativo curto + seta ("Ver projeto Jaíba", "Falar como investidor", "Conheça o Grupo FX"). Vocabulário de marca validado e repetido (segurança, previsibilidade, transparência, retorno). Sem emoji, sem corporativês, sem inglês desnecessário.

---

## 4. Sistema de movimento

| Padrão | Comportamento | Implementação |
|---|---|---|
| **Reveal de título** | Palavra a palavra, sobe de trás de uma máscara, stagger 60ms; a palavra-chave entra por último | `RevelarTitulo`: gatilho `whileInView` no título, palavras com variants (`y: "112%"` → 0, 0.75s) |
| **Reveal de bloco** | Fade + 24px para cima, 0.6s, dispara a 25% visível, uma vez | `Revelar` (delay para escalonar, escala para imagens 0.92→1) |
| **Grid animado** | Células entram em cascata (60–80ms); hover acende linha inferior em gradiente e dá glow ao número | `Revelar delay={i*0.08}` + `after:` pseudo-elemento com `scale-x-0` → 100 |
| **Contador** | 0 → valor em 1.2s, uma vez, formatação pt-BR | `Contador` com `useMotionValue` + `useTransform` + `animate()` (sem setState em efeito) |
| **Linha que se desenha** | `pathLength` 0 → 1 (e `opacity` junto, para não sobrar ponto do linecap) | `motion.path` variants |
| **Scroll-linked** | Sol percorre o arco proporcional ao scroll da seção | `useScroll({ target, offset })` + `useTransform` + `pontoQuadratica(t)` |
| **Scroll fixo (pinned)** | Coluna ilustrada fica presa enquanto 6 etapas passam | Container `h-[calc(n*60svh+100svh)]`, filho `sticky top-0 h-svh`, etapa ativa derivada do progresso |
| **Pulso** | Anel que expande e some (2–3s, loop) | `motion.circle animate={{ r: [100,156], opacity: [0.4,0] }}` `repeat: Infinity` |
| **Parallax leve** | Imagem/vídeo a 0.85× | `Parallax deslocamento={50}` (translateY de −d/2 a +d/2 pela viewport) |
| **Marquee** | Texto gigante rolando, pausa no hover | CSS `@keyframes marquee { to { translateX(-50%) } }` com dois trilhos idênticos |
| **Órbitas** | Anéis giram 70s/110s por volta, nós contra-giram para o texto ficar de pé; param quando algo está em destaque | CSS keyframes em `<g>` com `transform-origin` local; `animation-play-state` inline |
| **Hover de card** | Capa escala 1.04 (em container `overflow-hidden rounded`), seta desliza, card sobe 4px | Tailwind `group-hover` |
| **Raio do CTA** | Sobe com rotação no hover do botão (hero e contato); no contato fica lá após o envio | `group-hover` / `group-has-[.botao:hover]` |

**Constantes:** easing `SUAVE = [0.22, 1, 0.36, 1]`; `viewport={{ once: true }}`; `MotionConfig reducedMotion="user"` no layout; hook próprio `useMovimentoReduzido` via `useSyncExternalStore` (snapshot de servidor `false`) — nunca o `useReducedMotion` da lib (quebra a hidratação).

**Mobile:** reveals e contadores ficam; parallax e scroll fixo viram layout vertical; vídeo vira poster; marquee fica.

---

## 5. Stack técnica

| Camada | Escolha | Por quê |
|---|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack, Server Components) + React 19 | Estático por padrão, Server Actions para formulário, MDX nativo |
| **Estilo** | Tailwind CSS v4 (`@theme` para tokens, `@utility` para utilitários de marca, `@layer components` para prosa do artigo) | Tokens viram classes (`bg-tinta`, `text-lima`) sem config JS |
| **Movimento** | motion (`motion/react`) | `whileInView`, `useScroll`, `pathLength`, `MotionValue` |
| **Fontes** | `next/font/google` | Zero layout shift, variáveis CSS |
| **Conteúdo** | MDX no repositório (`content/noticias/*.mdx`) com `@next/mdx` (plugins por nome, exigência do Turbopack) + `gray-matter` (frontmatter) + `github-slugger` (ids de títulos iguais no sumário e no corpo) | Sem CMS, versionado, gerado por skill de IA, revisado pelo dono via `draft: true` |
| **Formulário** | Server Action + `useActionState`; destino por env `CONTATO_WEBHOOK_URL` (POST JSON) | Plugável em Zapier/Make/Apps Script/CRM sem mudar código |
| **Mídia** | ffmpeg para transcodificar vídeo (1600px, crf 30, mudo, ~5 MB), extrair poster e recortar imagens; `next/image` para tudo | Vídeo só em `(min-width:768px)` e sem reduced-motion; poster sempre |
| **Geodados** | API de malhas do IBGE (`servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=image/svg+xml&qualidade=minima&intrarregiao=UF`) → script Node gera `brasil.ts` com paths por UF e função `projetar(lat, lon)` | Mapa autoral, leve, com pins georreferenciados de verdade |
| **Qualidade** | `tsc --noEmit`, eslint (regra `react-hooks/set-state-in-effect` respeitada), `next build` a cada seção | Nada é "pronto" com lint vermelho |

---

## 6. Componentes reutilizáveis (o kit)

```
components/motion/   Revelar · RevelarTitulo · Contador · Parallax
components/ui/       SetaCirculo · GradeFina · LinhaDoTempo · LinhaComPonto · VideoFundo
components/ilustracoes/  cena.ts (geometria) · PaisagemEsquematica · CenaEtapas · Icones* ·
                         MapaProjetos (+ brasil.ts gerado) · TorreSolarimetrica · DiagramaSinergia ·
                         SimboloChama (traço) · SimboloMarca (preenchido) · IlustracoesCategoria
components/noticias/ modelo.ts (tipos, categorias, formatação) · CapaNoticia · CardNoticia ·
                     DestaqueNoticia · ChipCategoria · ListaNoticias · BarraLeitura · Sumario ·
                     Compartilhar · Newsletter · TituloComPalavra · blocos/{Dado,Destaque,Grafico}
lib/                 useMediaQuery · useMovimentoReduzido · noticias.ts (fs + gray-matter)
```

**Padrões de código que valem ouro:**

- **Constantes em módulos sem `"use client"`** (`etapas.ts`, `projetos.ts`, `empresas.ts`, `modelo.ts`). Constante exportada de um módulo cliente e importada num server component vira client reference, não o valor.
- **Estado compartilhado mapa↔lista / diagrama↔lista:** um componente cliente "orquestrador" com `useState(ativo)`; o SVG recebe `ativo`/`onAtivo`, a lista também. Hover, foco e clique alimentam o mesmo estado.
- **Props `imediato` e `ativoInicial`** em componentes animados: renderizam o estado final sem animação — usados nas capturas e úteis para testes.
- **Animação CSS e transform do motion nunca no mesmo elemento** (a animação vence o inline style). Aninhar: `<g transform=translate>` → `<g class="animate-…">` → `<motion.*>` só com `opacity`/`r`.
- **Ler a URL sem quebrar a pré-renderização:** `useSyncExternalStore(noop, () => new URLSearchParams(location.search).get("x"), () => null)` — HTML estático mostra o padrão, cliente aplica o filtro na hidratação. Sem `useSearchParams` (exigiria Suspense e CSR bailout).
- **Sem setState síncrono em useEffect:** usar `useSyncExternalStore` (scroll, media query, URL), `MotionValue` (contador), ou mutação imperativa pontual (pré-selecionar um `<select>` via ref).

---

## 7. Elementos gráficos programáticos (como cada um foi feito)

- **Paisagem esquemática (G1):** SVG 800×520 com linha do chão em `CHAO=432`; morros em curvas; torre de transmissão com cabos em Bézier quadrática (`pontoQuadratica`); sol em gradiente que percorre o arco `M90 310 Q420 -120 760 290` ligado ao scroll da seção (70% do caminho). Morros preenchidos com a cor do fundo para esconder o sol baixo.
- **Cena por etapas (G3):** mesma base; grupos cumulativos por etapa (0–5); função `traco(k, dur, delay)` anima `pathLength` + `opacity`; carimbo "OUTORGA · ANEEL" em gradiente; pulsos de energia nos cabos com `pathLength .15` / `pathSpacing 1` / `pathOffset 1→0`.
- **Mapa (G4):** paths dos estados gerados do IBGE; estados ativos preenchidos branco/6%; preenchimentos antes dos traços (senão somem as divisas); pins em gradiente com pulso, pin de destaque com anel duplo; rótulo com retângulo escuro atrás para legibilidade; `max-w-[600px]` para não ficar alto demais.
- **Torre solarimétrica (G5):** silhueta em treliça (não mastro fino — some sobre vídeo escuro), `#161a22` sólido, anemômetro girando (rotate 8s), sensor lima pulsando; fica na frente do marquee e atrás de nada: vídeo → overlay 55% → texto → torre (3 camadas de profundidade).
- **Diagrama de sinergia (G7):** centro com o símbolo real do logo (caminhos do SVG) + pulso; nós em dois anéis (`raio`, `angulos[]`); linhas radiais desenhadas; órbitas tracejadas; rotação CSS com contra-rotação nos nós; nó ativo ganha borda gradiente e linha acesa.
- **Capas geradas (G8):** fundo pela edição (`(edicao-1) % 3`: claro / escuro+grade / lima), ilustração da categoria a 14–18% de opacidade sangrando no canto, "Nº 005" + categoria em caixa alta no topo, palavra-chave do artigo em Plex Serif itálico embaixo. A tipografia vira a imagem.
- **Curva decorativa (G9):** `pathLength` em gradiente, sem números (decorativa, não dado).
- **Wordmark gigante (footer):** `text-[15vw]`, `-webkit-text-stroke: 1px rgba(255,255,255,.28)`, `color: transparent`; cópia com gradiente por cima com `clip-path: inset(0 100% 0 0)` → `inset(0)` no hover (1s). Entrada com `clipPath` via motion.
- **Blob de imagem (G12):** `<clipPath clipPathUnits="objectBoundingBox">` com path normalizado 0–1 → responsivo sem JS.

---

## 8. Blog/editorial ("Mercado & energia")

**Arquitetura:** seção na home (1 destaque + 3 cards + "Ver todas") → `/noticias` (filtro, destaque, grid 3 col, newsletter no meio, carregar mais) → `/noticias/[slug]` (SSG via `generateStaticParams`, `dynamicParams = false`).

**Frontmatter** (`content/noticias/<slug>.mdx`):

```
title, description, date (AAAA-MM-DD), category (mercado-livre | regulacao | tecnologia | investimento | brenergy),
author, draft, palavra (palavra do título que vira itálico/gradiente e estampa a capa), destaque (bool), cover (opcional)
```

Rascunhos aparecem só em `next dev`. Número da edição = ordem cronológica das publicadas. Tempo de leitura = palavras/200. Sumário = regex dos `##` .

**Categorias com cor** (sistema Heatmap): lima, verde, amarelo, tinta, gradiente — chips cheios, mesma cor nos filtros.

**Página do artigo:** barra de progresso 3px em gradiente (fixed, `scaleX` do `useScroll`), breadcrumb + "Nº", chip, título com palavra em serif, descrição, meta (autor · data · min), capa 16:7 com canto assimétrico, grid 220px + 68ch com sumário sticky (IntersectionObserver, `rootMargin -20% 0 -65%`), prosa `.artigo` por seletor (h2/h3 com `scroll-margin-top`, links com sublinhado verde, `::marker` verde, tabelas com wrapper `overflow-x-auto`), blocos MDX `<Dado>` (número grande + unidade serif), `<Destaque>` (citação com barra gradiente), `<Grafico tipo="barras|linha" dados={[…]}>` (SVG no line-art, única cor de preenchimento = gradiente), compartilhar (LinkedIn + copiar link), CTA final em card escuro, "Leia também" (mesma categoria primeiro), `generateMetadata` com OG article.

**Integração com IA de conteúdo:** a skill de publicação escreve direto em `content/noticias/` com `draft: true`; o dono revisa e vira `false`. Regras de MDX: sem `<!-- -->`, sem `{ }` soltos no texto, sem `<` solto.

---

## 9. Formulário e conversão

- **Campos mínimos** (Nome, Empresa, E-mail, Telefone opcional, Perfil, Mensagem opcional) com rótulo flutuante (`placeholder=" "` + `peer-[:not(:placeholder-shown)]`), foco com sublinhado na cor da tinta.
- **Pré-preenchimento por URL:** cards de público linkam `/?perfil=investidor#contato`; o formulário lê `?perfil=` no mount e seleciona.
- **Server Action:** valida, honeypot (campo `site` invisível), envia para `CONTATO_WEBHOOK_URL`; sem env configurada: loga em dev e devolve erro honesto em produção. Submit via `startTransition(() => acao(formData))` para o React não resetar os campos em erro.
- **Sucesso** troca o formulário por "Recebido. Falamos em breve." + link para continuar navegando.
- **Linha de confiança** sob o botão ("Resposta em até 2 dias úteis. Sem spam.") — prazo validado com o dono.

---

## 10. Navbar e footer

**Navbar** fixa no layout raiz: estado 1 sobre o hero (transparente, logo completo, links brancos); após 80px de scroll, em páginas internas ou com menu aberto → pill escura (`bg-tinta/85 backdrop-blur`, 15% menor, sombra). Scroll lido com `useSyncExternalStore`. Links `/#âncora` (funcionam fora da home). Link da seção atual com ponto lima. Mobile: hambúrguer de duas linhas → painel fullscreen com links em cascata (Manrope 40px) e CTA.

**Footer** no layout raiz: wordmark gigante em traço, linha gradiente, colunas (Navegação · Notícias por categoria com `?categoria=` · Grupo · Contato), "Voltar ao topo" (`href="#"` funciona em qualquer página), © + tagline em serif.

---

## 11. Metadados, OG, not-found, sitemap (passada final)

- **Metadados = o `<head>`:** title por página no padrão "Página — Marca", description, `metadataBase` com o domínio definitivo, `alternates.canonical`, ícones (favicon SVG com o símbolo, apple-icon), `lang="pt-BR"`.
- **Open Graph / Twitter = o cartão de prévia** no WhatsApp, LinkedIn, Slack: imagem 1200×630 + título + descrição. No Next: `app/opengraph-image.tsx` gera a imagem por código (fundo escuro com grade, título com a palavra em serif, símbolo); `app/noticias/[slug]/opengraph-image.tsx` gera uma por artigo reutilizando a lógica da capa (edição, palavra-chave, ilustração da categoria). `generateMetadata` já devolve `openGraph.type = "article"`, `publishedTime`, `authors`.
- **`not-found.tsx`** no estilo do site: número "404" gigante em traço (como o wordmark), frase com palavra em serif ("Esse território ainda não foi mapeado"), links para home e notícias, mesma navbar/footer.
- **`sitemap.ts` e `robots.ts`** listando home, `/noticias` e cada artigo (com `lastModified` da data do frontmatter).
- **Dados estruturados** (JSON-LD Organization na home, NewsArticle no artigo) — ajuda Google e IAs de busca.
- **Lighthouse mobile ≥ 85:** vídeo só desktop, poster, imagens em WebP com `sizes`, fontes via `next/font`, nada de biblioteca de ícones.

---

## 12. Verificação (o fluxo que funcionou)

**Rota temporária** `src/app/preview-<secao>/page.tsx` renderizando só a seção com `imediato` e este CSS (força o estado final das animações):

```css
#secao :not(svg *)[style*="opacity"]{opacity:1!important}
#secao :not(svg *)[style*="transform"]{transform:none!important}
```

- **Mobile:** rota genérica `preview-mobile?u=/rota&h=2400` que renderiza `<iframe style="width:390px">` — Chromium headless não encolhe abaixo de ~500px.
- **Captura:** `msedge --headless=new --screenshot="<caminho absoluto>" --window-size=1920,1500 --virtual-time-budget=8000 <url>` (e 600×N para o iframe). Para páginas reais, o CSS acima vai temporariamente no `globals.css` (bloco TEMP) e sai antes do build.
- **Console:** `--enable-logging=stderr --v=0 --dump-dom`, `grep -i hydrat`, com e sem `--force-prefers-reduced-motion`.
- `tsc --noEmit` → `eslint` → apagar previews → `next build`. Só então a seção está "pronta".
- Para animações CSS (órbitas), injetar `animation-delay:-20s!important` na preview para fotografar o keyframe adiantado.

---

## 13. Armadilhas que custaram tempo (não repetir)

- `useReducedMotion` da lib: `null` no servidor, `true` no cliente → hydration failed. Hook próprio com `useSyncExternalStore`.
- `whileInView` numa palavra deslocada para fora de um pai `overflow-hidden` nunca dispara (o observer a vê clipada) → gatilho no título, palavras com variants.
- `pathLength: 0` com linecap redondo ainda pinta um ponto → animar `opacity` junto.
- Preenchimentos do mapa desenhados depois dos traços escondem as divisas → fills primeiro.
- Regravar imagem em `/public` com o mesmo nome: o otimizador do `next/image` em dev serve a versão antiga → renomear.
- Marca d'água embutida na foto do hero: recortes para outras seções precisam evitar a região dela.
- `--force-prefers-reduced-motion` não produz estado final de SVGs animados → prop `imediato`.
- `--screenshot` com caminho relativo pelo Bash no Windows não grava → `$(pwd -W)/arquivo.png`.
- Carrossel com `snap-start` ignora o padding do container → `scroll-px-*`.
- Silhueta fina (`#252b36`) some sobre vídeo escurecido → treliça aberta e cor mais escura.
- `next dev` do usuário na porta 3000: `next start` falha com `EADDRINUSE` — verificar pelo dev server.

---

## 14. Checklist por seção (cole no fim de cada prompt de seção)

- [ ] Título com uma palavra em serif itálico + gradiente; linha de apoio à direita
- [ ] Pelo menos um movimento da tabela (e não mais que dois protagonistas)
- [ ] Alternância de fundo respeitada (claro/escuro)
- [ ] Nenhum grid estático: células em cascata + hover
- [ ] Conteúdo com fonte; estimativas marcadas; pendências comentadas no código
- [ ] Mobile resolvido (empilhar, carrossel com snap, ilustração reduzida/sangrando)
- [ ] prefers-reduced-motion: tudo legível sem animação
- [ ] Foco de teclado visível; aria-* em botões/ícones; SVG decorativo aria-hidden
- [ ] Prints 1920 e 390 revisados; console 0 erros nos dois modos
- [ ] tsc, eslint, next build verdes; previews apagadas

---

## 15. Prompt-modelo para outra IA

> Você é o diretor de design e o engenheiro front-end de um estúdio conhecido por dar a cada cliente uma identidade visual que não poderia ser confundida com nenhuma outra. Leia o playbook anexo inteiro. Vamos construir o site de [EMPRESA] para [PÚBLICO], com o objetivo de [OBJETIVO ÚNICO DA PÁGINA].
>
> Identidade: [cores hex, logo, fontes ou Figma]. Conteúdo disponível: [textos, números com fonte, fotos — ou "zero foto própria"]. Referências: [lista com o que aprovo e o que rejeito em cada uma].
>
> Primeiro entregável: o plano completo no formato da seção 2.3 do playbook (mapa do site, sistema de movimento, cada seção com objetivo/conteúdo/elementos gráficos nomeados/movimento/mobile, inventário de gráficos, pendências comigo, ordem de implementação, critérios de verificação). Não escreva código antes de eu aprovar o plano. Faça as perguntas de arquitetura como múltipla escolha, uma por vez. Depois da aprovação, implemente uma seção por vez com a stack da seção 5, os componentes da seção 6 e o fluxo de verificação da seção 12, e me mostre os prints de desktop e mobile de cada uma antes de seguir.

---

*Gerado a partir do projeto brenergy-site (Next 16 + Tailwind v4 + motion + MDX), agosto de 2026. Plano original em MazyOS/identidade/plano-site.md.*
