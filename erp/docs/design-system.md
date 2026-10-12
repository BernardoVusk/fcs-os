# Design system

Tokens em `src/app/globals.css` (escuro no `:root`, claro em `[data-tema="claro"]`). Cores: fundo, superficie, superficie-2, borda, texto, texto-2, texto-3, acao, acao-texto, acao-suave, sucesso, alerta, erro, info. Os nomes do shadcn (background, card, primary, muted, destructive, border, ring, sidebar) apontam para esses tokens, então os componentes gerados já saem na paleta da marca.

Tipografia: Inter (corpo), Chakra Petch (h1, h2 e números de KPI, classe `font-titulo`), JetBrains Mono (códigos, classe `font-mono`). Números em tabela usam `.numeros` (tabulares).

Forma: raio 4 px, borda 1 px, sem sombra, foco com contorno ciano de 2 px.

Componentes próprios (`src/componentes/painel/`): Sidebar, BarraTopo, BuscaGlobal, TabelaDados, CartaoIndicador, EstadoVazio, Banner, SeletorPeriodo, SeletorTema, DialogoNovo, BotaoAcao, Campo, CampoErro, SelectNativo, Icone. Base shadcn em `src/componentes/ui/`.

Estados obrigatórios em toda tela: carregando (skeleton), vazio (EstadoVazio com ação), erro (Banner tipo erro), sucesso (toast). Sem spinner.

Responsivo: sidebar vira folha lateral abaixo de 768 px; tabelas rolam na horizontal dentro do próprio contêiner; conteúdo até 1400 px.

Proibido: borda colorida à esquerda em card, gradiente, vidro, três cards iguais em linha, emoji, travessão.
