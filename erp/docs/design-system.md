# Design system

Fonte da direção: `DESIGN.md` na raiz do `erp/` (síntese das sete referências em `docs/referencias-visuais/`) e `PRODUCT.md` (quem usa, para quê, princípios). Tokens vivos em `src/app/globals.css`: escuro no `:root`, claro em `[data-tema="claro"]`.

## Linguagem

Superfícies em camadas. O corpo (`fundo`) fica atrás; a folha de conteúdo (`superficie`) é elevada com cantos de 16 px (variante `inset` da sidebar do shadcn); cartões e painéis usam a mesma superfície e se separam por hairline no escuro e por sombra suave no claro (`shadow-painel`). Controles em pílula: busca, seletor de período, badges e botões. Ciano só em seleção (item ativo da sidebar), botão primário e foco.

Isto difere de propósito do guia de marketing (`identidade/design-guide.md`, raio 0 a 4 px, cantos chanfrados): o dono pediu que o ERP seguisse as referências salvas. A paleta continua a da marca.

## Tokens

Cores: fundo, superficie, superficie-2, superficie-3, borda, texto, texto-2, texto-3, acao, acao-texto, acao-suave, sucesso, alerta, erro, info. Os nomes do shadcn (background, card, primary, muted, accent, destructive, border, ring, sidebar) apontam para eles. Sombras: `shadow-painel`, `shadow-flutuante`. Raios: sm 6, md 10, lg 12, xl 16, 2xl 20, 3xl 24, 4xl pílula.

Tipografia: Inter em tudo (`font-sans`), Chakra Petch só no wordmark (`font-titulo`), JetBrains Mono em código, SKU e lote (`font-mono`). Título de página 28 px semibold em caixa normal; número de indicador 34 px semibold tabular (`.numeros`).

## Componentes próprios (`src/componentes/painel/`)

Sidebar (grupos, contadores em pílula, ativo sólido ciano, rodapé com iniciais), BarraTopo (breadcrumb, busca em pílula com Ctrl K, Novo, tema), BuscaGlobal, TabelaDados (filtro em pílula, cabeçalho em superficie-2, linhas de 44 px, paginação), CartaoIndicador (rótulo, número, pílula de variação, linha de ação com seta), Banner (ícone em círculo tingido), EstadoVazio, SeletorPeriodo (controle segmentado em pílula), SeletorTema, DialogoNovo, BotaoAcao, Campo, CampoErro, SelectNativo, Icone. Base shadcn em `src/componentes/ui/` (estilo radix-nova, botões ajustados para pílula e 36 px).

Estados obrigatórios em toda tela: carregando (skeleton), vazio (EstadoVazio com ação), erro (Banner tipo erro), sucesso (toast). Sem spinner. Movimento de 150 ms só para estado; `prefers-reduced-motion` desliga tudo.

## Responsivo

Sidebar vira folha lateral abaixo de 768 px e a folha de conteúdo perde a margem; tabelas rolam na horizontal dentro do próprio contêiner; conteúdo até 1400 px; grade de indicadores `auto-fit minmax(240px)`.

## Proibido

Borda colorida à esquerda em card, gradiente em texto, vidro decorativo, três cards iguais em linha, fonte display em rótulo ou dado, emoji, travessão, número inventado.
