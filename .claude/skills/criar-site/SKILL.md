---
name: criar-site
description: >
  Conduz a criação de um site do zero como processo de direção de arte + arquitetura de
  informação + UX/UI + código: entende a empresa pela memória, define a direção visual,
  pesquisa referências reais (Behance, Dribbble, Pinterest, Awwwards), colhe o veredito do
  usuário sobre cada uma, consolida com `identidade/designpremium.md` e
  `identidade/antidesignia.md`, define o Design System, planeja página por página e seção por
  seção, aprova o plano e só então implementa — uma seção por ciclo, com verificação visual.
  Use quando o usuário disser "vamos criar um site", "quero criar um site", "preciso de um
  site", "vamos fazer um site", "criar website", "desenvolver o site", "começar o site",
  "site institucional", "landing page nova" ou /criar-site.
---

# /criar-site — Site completo, da direção de arte ao código

Skill orquestradora de site. Pega a empresa (que o VuskVS já conhece pela memória) → entrega direção criativa, Design System, plano aprovado e site implementado seção por seção, com prints de verificação. O código é consequência da direção de design — nunca o contrário.

---

## Regra fundamental

**Nunca começar a codificar de imediato.** A skill tem fases obrigatórias, cada uma com entregável e checkpoint:

| Fase | Entregável | Checkpoint |
|---|---|---|
| 1. Entender a empresa | Contexto mínimo confirmado | Só se faltar informação |
| 2. Direção visual | Hipótese de direção (pode combinar estilos) | Pergunta de múltipla escolha |
| 3. Pesquisa de referências | `01-referencias.md` | — |
| 4. Veredito do usuário | Aprovado / rejeitado / "roubaria" por referência | **Usuário responde 3 perguntas por referência** |
| 5. Direção criativa | `02-direcao-criativa.md` | Usuário valida a síntese |
| 6. Design System | `03-design-system.md` | Usuário valida os tokens |
| 7. Modo Plan | Usuário troca pro modo Plan | **Esperar confirmação** |
| 8. Plano do site | `04-plano-site.md` + `05-plano-tecnico.md` | — |
| 9. Apresentação do plano | Plano completo apresentado | **Aprovação explícita** |
| 10. Implementação | Uma seção por ciclo, com prints | Prints revisados por seção |
| 11. Passada final | SEO, acessibilidade, performance, revisão | Resumo de entrega |

Só avançar pra Fase 10 depois do plano apresentado e aprovado. Pular fase, mesmo "porque o usuário tá com pressa", quebra o método: o site vira template.

---

## Dependências

- **Contexto do negócio:** `_memoria/empresa.md`, `_memoria/estrategia.md` — LER ANTES da Fase 1
- **Tom de voz:** `_memoria/preferencias.md` — vale pra toda copy do site
- **Identidade existente:** `identidade/design-guide.md` — cores, fontes, logo já definidos
- **Princípios de design (leitura obrigatória antes da Fase 5):**
  - `identidade/designpremium.md` — playbook de site premium: processo, sistema de movimento, stack, componentes, armadilhas, checklist por seção
  - `identidade/antidesignia.md` — os padrões de "AI slop" proibidos, regra visual-antes-de-texto, tipografia/cor/layout com ponto de vista
- **SEO (se o `/seo` já rodou):** `marketing/seo/01-pesquisa-demanda.md` (keywords), `04-otimizacao-on-page.md` (titles, H1, schema), `05-estrategia-conteudo.md` (decide se precisa de blog)
- **Ferramentas:** WebSearch + WebFetch (pesquisa de referências, nativos); AskUserQuestion (perguntas de múltipla escolha); Chromium/Edge headless ou Playwright (prints de verificação — mesmo Playwright do `/carrossel`)
- **Outputs vão em:**
  - Documentos de planejamento → `site/plano/` (numerados, como o `/seo`)
  - Código → `site/` (subpasta por stack se fizer sentido, ex: `site/next-site/`)
  - Se for site de cliente (perfil agência) → dentro da pasta do cliente: `clientes/<Nome>/site/` — ver `/novo-projeto`

---

## Workflow

### Fase 1 — ENTENDER A EMPRESA

**Objetivo:** responder "o que essa empresa faz e por que o site existe?" antes de qualquer decisão visual.

1. Ler `_memoria/empresa.md`, `_memoria/estrategia.md`, `_memoria/preferencias.md` e `identidade/design-guide.md`
2. Varrer TODO o contexto da conversa e das pastas do projeto (briefing, materiais, fotos, referências já citadas)
3. Consolidar, sem perguntar de novo o que já foi informado:
   - nome, segmento, produtos, serviços, público-alvo, mercado, concorrentes
   - posicionamento, diferenciais, personalidade da marca, nível de sofisticação esperado
   - objetivo principal do site + objetivos comerciais
   - conteúdo já existente, identidade visual já existente, imagens/fotos disponíveis (ou "zero foto própria")
   - referências previamente mencionadas

**Regra:** se der pra responder a pergunta do objetivo, seguir. Se não, perguntar uma vez só:

> "Antes de começarmos, preciso entender a empresa. Me explica brevemente o que ela faz, quais produtos/serviços oferece, pra quem e qual é o principal objetivo do site."

Não avançar sem o contexto mínimo. Se `_memoria/empresa.md` estiver em branco, sugerir rodar `/instalar` antes — mas não bloquear: dá pra seguir com o que o usuário contar agora.

---

### Fase 2 — DIREÇÃO VISUAL

**Objetivo:** escolher uma hipótese inicial de direção artística.

Perguntar via AskUserQuestion (uma pergunta, permitir "Outro"):

> **Qual direção visual você quer pro site?**
> 1. Moderno e limpo
> 2. Futurista
> 3. Institucional / Empresarial
> 4. Comercial / Vendas
> 5. Portfólio / Showcase
> 6. Editorial / Premium
> 7. Experimental / Artístico
> 8. Outro (descreva)

**Regras:**
- A escolha é **hipótese**, não regra absoluta. Vai ser validada pelas referências e pelo contexto da empresa
- Pode combinar: "Futurista + Institucional Premium", "Moderno + Editorial + Tecnologia"
- Cruzar com `design-guide.md`: se a marca já tem identidade definida, a direção do site precisa dialogar com ela (pode divergir do guia de redes — se divergir, documentar qual é a fonte da verdade)

---

### Fase 3 — PESQUISA DE REFERÊNCIAS

**Objetivo:** encontrar interfaces reais relacionadas ao segmento, ao posicionamento e à direção escolhida — não "sites bonitos".

1. Pesquisar com WebSearch em: **Behance, Dribbble, Pinterest** (sempre) + **Awwwards, Godly, One Page Love, SiteInspire** (quando possível). Se o MCP do Mobbin estiver disponível, usar também
2. Montar buscas adaptadas ao projeto, combinando segmento + linguagem:
   - `[segmento] website` · `[segmento] premium website` · `[segmento] futuristic website`
   - `[segmento] interactive website` · `[segmento] editorial website` · `[segmento] dark website`
   - `[segmento] creative agency website` · `[concorrente/benchmark] site`
3. Organizar as buscas em **categorias** (ex: A — setor da empresa · B — institucional/investidor · C — fora do setor com a estética desejada · D — editorial/blog, se houver) — facilita o usuário comparar
4. Validar cada referência com WebFetch: o link abre? É um site ou case real navegável?
5. Selecionar **6 a 10 referências** — qualidade sobre volume

**Regras de seleção (lições do `designpremium.md`, seção 2.7):**
- Só sites ou projetos reais que dá pra abrir e navegar. **Página de coleção/busca não funciona** e é rejeitada em bloco
- Cases de portfólio/estudante identificados como tal (avaliar só layout, não como benchmark de mercado)
- Templates à venda (Webflow/Framer): olhar só a estrutura de seções, nunca a estética — risco de "cara de template"
- Cada referência com link checado, plataforma e uma nota do que interessa

**Output:** `site/plano/01-referencias.md`:

```markdown
# Referências visuais — [Empresa]

## Contexto
[Resumo do projeto + direção visual escolhida na Fase 2]

## Referências

### Referência 01 — [Nome]
**URL:** [link checado]
**Fonte:** Behance / Dribbble / Pinterest / Awwwards / site real
**Categoria:** A / B / C / D
**Por que foi selecionada:** [motivo ligado ao projeto]
**Características observadas:** composição · tipografia · navegação · uso de imagem · animação · grid · espaçamento · cores · interação · storytelling · tratamento da informação

### Referência 02 — ...
```

---

### Fase 4 — VEREDITO DO USUÁRIO

**Objetivo:** transformar gosto em dado de direção de arte. O agente NÃO decide sozinho o que usar.

Explicar que o usuário precisa abrir cada referência e responder **3 perguntas por referência**:

> **1. O que você gostou?** — elementos visuais ou funcionais que aprova
> **2. O que você não gostou?** — o que não quer reproduzir
> **3. Se pudesse roubar UMA coisa dessa referência pro seu site, o que seria?**

A terceira pergunta é a que gera o plano: identifica o que tem maior valor percebido.

Pode ser feita uma referência por vez (AskUserQuestion, com "Outro" livre) ou o usuário responde tudo em bloco — adaptar ao ritmo dele.

**CHECKPOINT:** não seguir sem o veredito de todas as referências. Registrar cada resposta **com a frase do usuário**, não parafraseada.

**Interpretação:**
- **Aprovados** → podem orientar o design
- **Rejeitados** → devem ser evitados
- **"Roubaria"** → entram obrigatoriamente em alguma seção do plano
- Identificar **padrões** entre as referências, não copiar nenhuma. Ex: se tipografia grande + imagem em tela cheia + navegação minimalista + motion suave aparecem em várias aprovações → vira diretriz: *"tipografia de grande escala, composição editorial, navegação minimalista e motion sutil"*
- **Uma rejeição repetida** (mesmo motivo em sites diferentes) vale mais que uma aprovação: vira regra negativa do projeto
- Nada entra no plano sem origem numa aprovação

---

### Fase 5 — DIREÇÃO CRIATIVA

**Objetivo:** cruzar tudo e fechar a direção do site antes de qualquer planejamento.

1. Ler `identidade/designpremium.md` e `identidade/antidesignia.md` **por inteiro**. Extrair princípios como critérios de decisão — não copiar literalmente
2. Cruzar:

```
CONTEXTO DA EMPRESA
+ DIREÇÃO VISUAL ESCOLHIDA
+ REFERÊNCIAS
+ APROVAÇÕES DO USUÁRIO
+ REJEIÇÕES DO USUÁRIO
+ DESIGN PREMIUM (designpremium.md)
+ ANTI-AI-SLOP (antidesignia.md)
+ IDENTIDADE EXISTENTE (design-guide.md)
= DIREÇÃO CRIATIVA DO SITE
```

3. Se os dois arquivos de princípios divergirem em algum ponto pra esse projeto (ex: um recomenda serif itálico como assinatura, o outro lista como padrão a evitar), **nomear o conflito pro usuário** e decidir com base nas aprovações dele — a direção criativa registra a decisão

**Output:** `site/plano/02-direcao-criativa.md`:

```markdown
# Creative Direction — [Empresa]

## Posicionamento visual
## Sensação desejada
[premium · tecnológico · natural · industrial · experimental · confiável · sofisticado...]
## Princípios
[as principais regras visuais do projeto]
## O que fazer
[elementos aprovados, com origem: "Ref 03 — o usuário disse '...'"]
## O que evitar
[elementos rejeitados, inclusive as regras negativas por rejeição repetida]
## Linguagem visual
[composição · tipografia · imagem · motion · grid · ritmo de fundos]
## Referências absorvidas
[tabela: referência → elemento roubado → seção onde vai entrar]
## Elementos autorais
[o que será criado só pra esse projeto, pra não parecer cópia]
## Decisões sobre conflitos de princípio
[se houver]
```

**CHECKPOINT:** mostrar a síntese. Esperar o usuário validar antes do Design System.

---

### Fase 6 — DESIGN SYSTEM

**Objetivo:** definir o sistema que toda seção vai respeitar. Partir do `design-guide.md` quando preenchido; propor quando vago.

Definir:

- **Typography:** fonte display + fonte de corpo (diferentes; com personalidade — não Inter como única), fonte de assinatura se houver, pesos, escala, headings, body, captions, números, labels, tracking, line-height
- **Color System:** background, surface, primary, secondary, accent, text, muted, borders, states — cor com função semântica, UMA cor de destaque, variação de superfície entre seções (claro/escuro)
- **Grid:** colunas, gutters, margins, max-width, breakpoints; o **primitivo de layout** que vai se repetir
- **Spacing:** escala
- **Radius:** com variação hierárquica (não uniforme em tudo)
- **Shadows:** com direção e profundidade coerentes
- **Buttons:** primary, secondary, ghost, icon + states (hover, press, focus)
- **Cards:** estrutura, padding, imagem, borda, hover, interação
- **Navigation:** desktop e mobile
- **Motion:** personalidade (precisa / quente / técnica / playful), easing, duração, entrada, saída, hover, scroll, transições, parallax, microinterações — **uma tabela**, definida uma vez, aplicada em todas as seções; `prefers-reduced-motion` sempre respeitado

**Output:** `site/plano/03-design-system.md` — tokens prontos pra virar CSS/`@theme`.

**CHECKPOINT:** mostrar os tokens. Validar antes de entrar no Plan.

---

### Fase 7 — ENTRAR NO MODO PLAN

Interromper a execução e pedir explicitamente:

> "Agora precisamos entrar no modo Plan pra estruturar a arquitetura e implementação do site. Troca pro modo Plan (Shift+Tab) e me avisa quando estiver pronto."

Se a ferramenta EnterPlanMode estiver disponível, pode usá-la — mas o usuário precisa saber que o modo mudou. **Não começar o planejamento detalhado antes da confirmação.**

---

### Fase 8 — PLANEJAR O SITE (modo Plan)

**Objetivo:** transformar a direção criativa numa especificação completa, página por página, seção por seção.

#### 8.1 Confirmar e investigar

Primeiro confirmar o que já está definido. Depois levantar o que falta — **via AskUserQuestion, múltipla escolha, uma pergunta por vez**:

- objetivo principal e secundário do site · público
- páginas (one-page × multipáginas) · seções
- conversões principais · CTA principal · CTA secundário
- formulário · WhatsApp · redes sociais · analytics
- blog / notícias (se `marketing/seo/05-estrategia-conteudo.md` existir, o blog provavelmente é necessário — é o destino do `/publicar-tema`) · CMS × MDX/markdown
- catálogo · portfólio · área de projetos · área de produtos
- animações · vídeo · 3D · efeitos de scroll · interação
- idiomas · SEO · performance · acessibilidade
- há fotos próprias? (se não: ilustração autoral, mapa, dados animados, vídeo stock, capas geradas por código — "zero foto não é limitação, é direção")
- tecnologias preferidas · tecnologias proibidas ou desnecessárias

#### 8.2 Princípio de arquitetura

> **MENOS TEXTO + MAIS HIERARQUIA VISUAL + MAIS EXPERIÊNCIA**

Conteúdo apresentado da forma mais visual possível: imagens, ilustrações, gráficos, diagramas, ícones, cards, composição editorial, vídeo, animação, números, microinterações, visualização de dados, storytelling visual. Usar a tabela "você quer dizer… → use isso, não texto" do `design-guide.md` / `antidesignia.md`. Não é eliminar conteúdo relevante — é reduzir fricção cognitiva.

#### 8.3 Plano de seções

Pra cada página, cada seção recebe:

```markdown
## Seção 0N — [Nome]
### Objetivo          — o que essa seção precisa fazer o visitante entender/sentir/fazer
### Conteúdo          — headline, sub, CTA, dados reais (com fonte; estimativas com "~")
### Direção visual    — imagem / vídeo / ilustração / 3D / dado animado
### Composição        — estrutura e primitivo de layout
### Assinatura        — o UM elemento memorável da seção (o resto é quieto)
### Motion            — quais movimentos da tabela do Design System
### Interação         — o que acontece quando o usuário interage
### Tecnologia        — só o que a experiência justifica (CSS · Framer Motion/motion · GSAP · Three.js · Lottie…)
### Responsividade    — desktop / tablet / mobile
### Origem            — qual aprovação de referência justifica essa seção
```

Mais: **inventário de elementos gráficos** (G1…Gn, com como cada um será feito), **pendências com o dono** (dados que faltam — nunca inventar telefone, CNPJ, e-mail, números), **ordem de implementação** e **critérios de verificação**.

**Output:** `site/plano/04-plano-site.md`

#### 8.4 Plano técnico

- **Stack:** escolhida pelo projeto, não por preferência automática. Padrão sugerido pelo `designpremium.md` (seção 5): Next (App Router) + Tailwind v4 + motion + `next/font` + MDX se tiver blog. Alternativas válidas quando o projeto pede (Astro pra site estático simples, etc.)
- **Estrutura:** páginas, componentes, seções, componentes reutilizáveis (o kit de movimento primeiro: Revelar, RevelarTitulo, Contador, Parallax), assets, fontes, animações, dados, integrações
- **Performance:** otimização de imagens, lazy loading, compressão, code splitting, carregamento progressivo, menos JS desnecessário
- **SEO:** title, description, metadata, Open Graph (por código), headings, schema JSON-LD, sitemap, robots — reaproveitar `marketing/seo/04-otimizacao-on-page.md` se existir
- **Acessibilidade:** contraste WCAG AA, navegação por teclado, semântica, alt text, focus states visíveis, reduced-motion
- **Formulário:** destino real (Server Action + webhook/email). **Sem destino configurado, não finge sucesso**

**Output:** `site/plano/05-plano-tecnico.md`

---

### Fase 9 — APRESENTAR E APROVAR O PLANO

Antes de qualquer código, apresentar ao usuário o plano completo, nesta ordem:

1. Direção criativa · 2. Design System · 3. Arquitetura do site · 4. Mapa de páginas · 5. Mapa de seções · 6. Objetivo de cada seção · 7. Conteúdo de cada seção · 8. Tratamento visual · 9. Tecnologias visuais · 10. Motion e interação · 11. Responsividade · 12. Stack · 13. Estrutura de componentes · 14. Performance · 15. SEO e acessibilidade · 16. Pendências com o dono

Perguntar:

> "Esse é o plano que vamos usar pra construir o site. Você aprova o plano ou quer alterar alguma parte?"

**CHECKPOINT:** não iniciar a implementação sem aprovação explícita. Ajustes → atualizar os arquivos de `site/plano/` antes de seguir.

---

### Fase 10 — IMPLEMENTAÇÃO SEÇÃO POR SEÇÃO

**Ordem padrão:**

1. estrutura base (projeto, fontes, tokens do Design System em CSS)
2. kit de movimento (componentes reutilizáveis — tudo depende disso)
3. Header / Navigation
4. Hero
5. primeira seção de conteúdo (se ilustrada, define o traço do site inteiro)
6. demais seções, na ordem do plano
7. Footer
8. responsividade
9. motion de entrada do hero + refinamentos
10. performance
11. SEO (metadados, OG, sitemap, robots, schema, not-found)
12. acessibilidade
13. revisão final

**Ciclo por seção** — cada seção é concluída visualmente antes da próxima:

1. implementar o componente
2. verificar estrutura e semântica
3. verificar responsividade (desktop / tablet / mobile)
4. verificar tipografia e espaçamento contra o Design System
5. verificar imagens e elementos gráficos
6. verificar motion (com e sem `prefers-reduced-motion`)
7. verificar integração com o Design System e com a seção anterior (mesmo site, não sites diferentes)
8. **print headless** desktop 1920 e mobile 390 com estado final das animações forçado (fluxo da seção 12 do `designpremium.md`); console sem erro
9. lint/typecheck/build verdes
10. mostrar os prints ao usuário → seguir pra próxima

Rodar o **checklist por seção** do `designpremium.md` (seção 14) e o checklist de revisão do `antidesignia.md` (parte 11) antes de dar a seção como pronta.

---

### Fase 11 — PASSADA FINAL E ENTREGA

1. Entrada animada do hero, metadados/OG, not-found no estilo do site, sitemap, robots, JSON-LD
2. Lighthouse mobile (performance, acessibilidade, SEO)
3. Revisão completa contra `02-direcao-criativa.md`: o site parece intencional? cada seção tem uma assinatura? nada parece template?
4. Resumo de entrega:

```
✓ Direção criativa: site/plano/02-direcao-criativa.md
✓ Design System: site/plano/03-design-system.md
✓ Plano aprovado: site/plano/04-plano-site.md + 05-plano-tecnico.md
✓ Site: site/<pasta>/ — N seções, prints em site/plano/prints/
✓ Pendências com o dono: [lista do que ainda falta de dado real]

Pra publicar: [build/deploy conforme a stack]
Próximos: /seo (se ainda não rodou) · /publicar-tema (blog) · /salvar
```

5. Se a identidade do site definiu tokens novos (cores, fontes, logo), perguntar se atualiza `identidade/design-guide.md` — conforme o protocolo "Manter contexto atualizado" do `CLAUDE.md`
6. Se surgiu armadilha técnica nova, anexar à seção 13 do `designpremium.md`
7. Sugerir `/salvar`

---

## Quando NÃO usar essa skill

- Ajuste numa seção de site que já existe → editar direto, respeitando `site/plano/` se existir
- Artigo de blog → `/publicar-tema`
- Landing page de campanha com stack e visual já definidos → pode pular pra Fase 8, mas registrar as decisões em `site/plano/`
- Carrossel, post, peça visual → `/carrossel`

---

## Ordem de prioridade em caso de dúvida

Quando surgir dúvida na implementação, decidir nesta ordem:

1. requisitos definidos pelo usuário
2. direção criativa (`02-direcao-criativa.md`)
3. vereditos sobre as referências (com a frase do usuário)
4. Design System (`03-design-system.md`)
5. plano aprovado (`04-plano-site.md`)
6. princípios do `identidade/designpremium.md`
7. princípios do `identidade/antidesignia.md`
8. boas práticas de UX/UI
9. solução técnica mais simples e robusta

Não introduzir uma linguagem visual nova sem justificativa registrada.

---

## Regras

- **Nunca codar antes do plano aprovado.** Sem exceção por pressa, por "é só um hero", por "depois a gente ajusta"
- **Referências nunca são copiadas.** Servem pra identificar linguagem, composição, interação, ritmo, hierarquia, técnica — e viram solução própria pra empresa
- **Nada entra no plano sem origem numa aprovação do usuário.** Cada elemento aprovado mapeia pra uma seção específica
- **Uma assinatura por seção.** Um elemento memorável; o resto disciplinado e quieto. "Antes de sair, tire um acessório"
- **Consistência:** nenhuma seção é criada isolada. Toda seção respeita Design System, direção criativa, grid, tipografia, linguagem de imagem, motion, espaçamento e comportamento responsivo
- **Site vivido, com propósito:** movimento e profundidade (escala, scroll storytelling, parallax, reveal, hover, camadas, grids assimétricos, números animados) — mas **nunca animação só porque é possível**. Motion reforça narrativa, hierarquia, percepção de qualidade, orientação e compreensão. Nenhum grid estático; nenhuma animação bloqueia leitura
- **Simplicidade:** clareza → hierarquia → contraste → ritmo → interação → detalhe. Não efeito → efeito → efeito. Um site sofisticado não parece complicado
- **Conteúdo real, com fonte.** Números com origem; estimativas com "~"; o que não foi validado vai pra "pendências com o dono" e fica comentado no código. Nunca inventar e-mail, telefone, CNPJ, depoimento
- **Copy segue `_memoria/preferencias.md`** e passa no "teste do CEO" do `antidesignia.md`: headline específica da empresa, sem as frases proibidas
- **Honestidade técnica:** formulário sem destino não finge sucesso; newsletter sem provedor avisa no código
- **Verificar com os olhos:** seção só está pronta com prints desktop e mobile revisados, console limpo e build verde
- **Não improvisar stack:** escolher pelo projeto, registrar no `05-plano-tecnico.md`, não trocar no meio

---

## Princípio central

> PRIMEIRO ENTENDER.
> DEPOIS PESQUISAR.
> DEPOIS DEFINIR.
> DEPOIS PLANEJAR.
> DEPOIS APROVAR.
> SÓ ENTÃO CODIFICAR.

O código é consequência da direção de design. Não o contrário.
