# Design

Fonte: as sete referências salvas pelo dono em `docs/referencias-visuais/` (Circle, Reagle, Enlarz, Iconly, cartão financeiro, dashboard de gestão) sintetizadas em uma linguagem única e aplicada em cima da paleta da marca FCS. Tokens vivos em `src/app/globals.css`.

## Visual theme

Superfícies em camadas: um fundo escuro e fosco atrás, uma folha de conteúdo elevada com cantos de 16 px, painéis e cartões com a mesma superfície separados por hairline (escuro) ou sombra suave (claro). Sidebar como painel com grupos, contadores em pílula e item ativo em bloco sólido ciano. Controles em pílula: busca, seletor de período, botões. Tema escuro é o padrão (marca); claro é equivalente e polido.

## Color

| Token | Escuro | Claro | Uso |
|---|---|---|---|
| fundo | #0a0a0a | #eceef1 | corpo atrás da folha, sidebar |
| superficie | #121316 | #ffffff | folha de conteúdo, cartões, painéis |
| superficie-2 | #1a1c20 | #f3f4f6 | cabeçalho de tabela, pílulas, insets |
| superficie-3 | #22252a | #e6e8ec | hover, pílula ativa em controle segmentado |
| borda | #24272c | #e3e6ea | hairline 1 px |
| texto / texto-2 / texto-3 | #f2f4f6 / #a3aab3 / #6f7781 | #141719 / #5f6670 / #737a84 | principal, secundário, dica |
| acao / acao-texto / acao-suave | #00d8ff / #06141a / #0b2a33 | #00789a / #ffffff / #e3f5fa | seleção, botão primário, foco |
| sucesso / alerta / erro | #3ddc97 / #f5b841 / #f26d6d | #1b8a57 / #946400 / #b3261e | só semântica |

Estratégia: contida. Ciano abaixo de 10 % da tela. Cores quentes só com significado.

## Typography

Uma família: Inter em tudo (títulos, corpo, botões, dados). Chakra Petch só no wordmark "FCS ERP" da sidebar. JetBrains Mono em código, SKU e lote.

Escala fixa (rem): 12 rótulo e dica, 13 tabela densa e sublegenda, 14 corpo, 16 título de cartão, 20 seção, 28 título de página (semibold, tracking -0.01em, caixa normal), 34 a 40 número de indicador (semibold, tabular, tracking -0.02em).

## Shape, depth, motion

Raio: 10 px em campos e botões pequenos, 12 px em menus, 16 px em cartões e na folha, 20 a 24 px em painéis e no cartão de login, pílula (999) em badges, busca, período e botões. Hairline 1 px em tudo que é contêiner; sombra só no tema claro (`shadow-painel`, `shadow-flutuante`). Movimento 150 a 200 ms, ease-out, só para estado; reduzido quando o sistema pede.

## Components

Sidebar (`componentes/painel/Sidebar.tsx`): cabeçalho com marca, grupos com rótulo discreto, itens de 36 px com ícone 18 px, contador em pílula, ativo sólido ciano, rodapé com avatar de iniciais. Barra do topo: gatilho do menu, breadcrumb, busca em pílula com atalho, botão Novo, tema. Cartão de indicador: rótulo, número grande, pílula de variação, linha de ação com seta. Tabela: filtro em pílula, cabeçalho em superficie-2, linhas de 44 px, paginação em pílulas. Estado vazio: ícone em círculo, título, instrução, ação. Banner: ícone em círculo tingido, texto, ação à direita. Formulários: campos de 36 px, rótulo acima, erro abaixo em vermelho semântico.

## Layout

Folha de conteúdo com até 1400 px, espaçamento 24 px entre blocos, grade de indicadores `auto-fit minmax(260px)`. Abaixo de 768 px a sidebar vira folha lateral e a folha de conteúdo perde a margem.
