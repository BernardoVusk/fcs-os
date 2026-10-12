# Plano: ERP da FCS 3D STUDIO (sistema web de gestão da operação de impressão 3D)

Data do plano: 11/10/2026. Modo: planejamento somente leitura. Nada foi alterado no repositório.

## Contexto

A FCS 3D STUDIO é um e-commerce de peças impressas em 3D tocado por uma pessoa, vendendo em Shopee, Mercado Livre e TikTok Shop. Hoje a operação roda num workspace de Claude Code (`Fcs OS`, derivado do VuskVS) com memória em markdown, 18 skills e uma extensão de Chrome (FCS SPY) que calcula lucro de impressão. Não existe sistema de gestão: custo, estoque de filamento, pedidos, financeiro e conhecimento técnico vivem em planilhas, cabeça e conversas.

O pedido é um sistema web próprio que una custos, insumos, estoque, produtos, pedidos, produção, financeiro, base de conhecimento ligada ao Claude Code e planejamento de conteúdo, com os mesmos dados compartilhados entre módulos, cálculos auditáveis e nenhum número inventado.

Este documento é o resultado da Fase 0 (auditoria) e o plano das fases seguintes. Nada será implementado antes da aprovação.

---

## 1. Resumo executivo

Proposta: uma aplicação Next.js 16 (TypeScript, Tailwind v4, shadcn/ui) chamada **FCS ERP**, dentro deste repositório na pasta `erp/`, usando o projeto Supabase `fcs-os` já criado (Postgres 17, Auth, Storage) como banco único da empresa. Toda regra de cálculo (custo, preço, estoque, caixa) fica numa camada de domínio pura em TypeScript, testada com Vitest, separada da interface e do acesso a dados.

A integração com o Claude Code é parte do produto: a própria aplicação expõe um endpoint MCP (HTTP) autenticado por token com escopos, e quatro skills no workspace (`/kb-salvar`, `/kb-buscar`, `/kb-decisao`, `/kb-procedimento`) dão a experiência de "salve isso na base". A captura é intencional, nunca automática.

Ordem de construção ajustada em relação à hipótese inicial: a base de conhecimento sobe para a Fase 2, logo após a fundação, porque tem poucas dependências e passa a registrar as decisões de arquitetura das fases seguintes enquanto elas acontecem.

Objetivos mensuráveis ao final:
- Cadastrar um rolo de filamento e ver o custo por grama aparecer na calculadora sem redigitar.
- Mudar o preço de reposição de um insumo e receber a lista de produtos cuja margem caiu abaixo do alvo.
- Registrar um pedido e ver receita, taxas, custo estimado, consumo de material e resultado, com um único lançamento financeiro gerado.
- Pedir ao Claude Code "pesquise o que documentamos sobre PETG" e receber os registros da base.

---

## 2. Diagnóstico do repositório

### 2.1 O que existe

| Área | Achado | Reaproveitável |
|---|---|---|
| Aplicação web | Nenhuma. Não há React, Next, Tailwind, CSS ou componente de interface no repositório | Nada |
| Código | Só `mini-projetos/fcs-spy/extensao/` (TypeScript puro, esbuild, Vitest, sem dependência de runtime) | Sim: `nucleo/calculadora.ts`, `nucleo/metricas.ts`, `nucleo/formato.ts`, `dados/config.ts`, 24 arquivos de teste e amostras |
| Banco | Projeto Supabase `fcs-os` (sa-east-1, Postgres 17.11) ativo e vazio: 0 tabelas, 0 buckets, 0 usuários, 10 MB. Extensões `pgcrypto` e `uuid-ossp` instaladas; `pg_trgm`, `unaccent`, `pg_cron`, `pg_net`, `vector` disponíveis. Não existe pasta `supabase/` nem migração | Sim, é o banco do ERP |
| Segredos | `.env` com as 6 variáveis `SUPABASE_*` (nomes conferidos, valores não lidos). `.gitignore` já protege `.env` | Sim |
| Identidade | `identidade/design-guide.md` (preto `#0A0A0A`, ciano `#00D8FF`, cards `#141414`, borda `#1F1F1F`, raio 0 a 4 px, fontes display Chakra Petch/Rajdhani e corpo Inter/Poppins), `logo.png`, playbooks `designpremium.md` e `antidesignia.md` | Sim, com adaptação para uso diário em tela (seção 8) |
| Referências visuais | `identidade/REFERENCIAS DESIGN WEB/`: 7 imagens, sem texto. Padrões úteis: trilho de ícones + painel expandido, grupos de menu com contadores, cartão KPI com número grande + pílula de variação + sparkline, seletor de período, calendário/timeline. Seis das sete são tema claro e arredondado, o que conflita com o guia da marca | Sim, como estrutura; a paleta vem da marca |
| Memória e regras | `CLAUDE.md` raiz, `_memoria/*.md`, regra "nunca inventar número", tom sem emoji e sem travessão, dado de marketplace coletado só via browser logado | Governam o ERP também |
| Dados | `dados/catalogo/2026-08-21-catalogo.csv` (39 anúncios: canal, id, título, preço, estoque, vendas, visitas, conversão, nota, avaliações, fotos, categoria). Capturas semanais em `dados/marketplace/` | Sim, semente do cadastro de produtos e de canais |
| Claude Code | 18 skills de projeto; nenhum `.mcp.json`, hook ou `settings.json` no projeto; nenhum servidor MCP escrito pelo usuário em nenhum projeto; plugins superpowers e claude-mem instalados | Padrão de skills e memória em markdown |
| Projeto irmão | `fx grupo/fx-grupo-site`: Next 16.2, React 19.2, Tailwind v4 (`@theme`), `@supabase/ssr`, zod 4, server actions, painel admin com sidebar por grupos, busca Ctrl+K, kanban, e o módulo de marketing que é o planejador mensal citado (tabelas `mkt_ciclos`, `mkt_tarefas` com checklist em jsonb, kanban/lista/calendário, mês na URL, drawer `?tarefa=`) | Sim, como padrão de arquitetura e de interface. Identidade (laranja, Barlow, raios 14 a 48 px) não será reutilizada |

### 2.2 Calculadora do FCS SPY (base do motor de custos)

Fórmula atual (`extensao/src/nucleo/calculadora.ts`):

```
filamento   = gramas * (filamentoKg / 1000) * (1 + perdaPct)
energia     = horas * (potenciaW / 1000) * kwh
desgaste    = horas * desgasteHora
acabamento  = (minutosAcabamento / 60) * maoDeObraHora
custoProd   = filamento + energia + desgaste + acabamento + embalagem
taxa        = preco * comissaoPct + taxaFixa
imposto     = preco * impostoPct
ads         = ads && roas > 0 ? preco / roas : 0
lucro       = preco - taxa - imposto - ads - custoProd
```

Padrões de fábrica: comissão 20 % + R$ 4 fixos (vindos do estudo do concorrente Ziem Spy, ainda não confirmados com a conta real), imposto 4 %, filamento R$ 120/kg, perda 10 %, 150 W, R$ 0,95/kWh, desgaste R$ 0,50/h, mão de obra R$ 20/h, embalagem R$ 1,50.

Lacunas que o ERP corrige: não separa falha de desperdício, não tem depreciação nem manutenção explícitas, não tem peças por ciclo, embalagem é por unidade e não por pedido, não tem frete subsidiado, não guarda histórico de cálculo, e o preço alvo não resolve a dependência circular das taxas percentuais.

### 2.3 Limitações identificadas

- Supabase Free: 500 MB de banco, 1 GB de storage, pausa após 7 dias sem uso, sem backup automático. Arquivos STL/3MF estouram 1 GB rápido.
- Vercel Hobby proíbe uso comercial. Hospedagem precisa de decisão (seção 12).
- Supabase CLI e Docker não estão instalados; banco local de testes depende disso ou de um segundo projeto gratuito (limite de 2 projetos ativos; hoje só `fcs-os` está ativo).
- Não há biblioteca para ler PDF na máquina; o regime tributário não pôde ser lido do cartão CNPJ. Fica como parâmetro editável, sem alíquota padrão.
- Captura automática via hooks tem histórico de falha no Windows (marcador `CAPTURE_BROKEN` do claude-mem em 08/10/2026). Reforça a escolha por captura intencional via MCP + skill.

---

## 3. Arquitetura recomendada

### 3.1 Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript strict | Mesmo stack do painel FX que o usuário já mantém; server components + server actions dispensam API REST própria para CRUD |
| Estilo e componentes | Tailwind v4 (`@theme` em CSS) + shadcn/ui (Radix) + lucide-react | ERP é denso em tabelas, formulários, diálogos e menus; shadcn entrega isso acessível e copiado para o repositório, tematizável pelos tokens da marca. Ícones outline consistentes, como nas referências |
| Tabelas e gráficos | TanStack Table (filtros, ordenação, paginação server-side via URL) + Recharts | Padrão maduro; gráficos simples e legíveis |
| Formulários e validação | react-hook-form + zod 4 (mesmos schemas no cliente e na server action) | Uma fonte de verdade de validação |
| Busca rápida | cmdk (Ctrl+K) + função SQL `buscar_global` | Sem motor externo; Postgres FTS + trigram basta para o tamanho inicial |
| Dinheiro e datas | decimal.js no domínio; `numeric` no banco; date-fns + `@date-fns/tz` fixo em America/Sao_Paulo | Evita erro de ponto flutuante em custo por grama e em percentuais encadeados |
| Banco, auth, arquivos | Supabase (Postgres 17, Auth e-mail+senha, Storage privado com URL assinada) | Já criado, em São Paulo, autorizado |
| Acesso a dados | `@supabase/ssr` com sessão do usuário (RLS vale), service role só em scripts e em ações administrativas isoladas | Diferente do FX (que usa service role em tudo): aqui o banco também é acessado pelo MCP, então RLS é defesa real |
| MCP | `mcp-handler` + SDK MCP, rota `erp/src/app/api/mcp/route.ts`, transporte Streamable HTTP, Bearer token próprio | Zero processo local, funciona do VS Code e de qualquer máquina, escopos aplicados no servidor |
| Testes | Vitest (domínio), Playwright (fluxos críticos), testes de integração contra banco de teste | FCS SPY já usa Vitest; Playwright já é usado pelas skills |
| Qualidade | ESLint 9, Prettier, `tsc --noEmit`, `next build` no CI (GitHub Actions) | |

Gerenciador: npm (lockfile v3, como no FCS SPY). Node 24 instalado.

### 3.2 Divisão de responsabilidades (dentro de `erp/src/`)

```
app/                   rotas e layouts (só composição; sem regra de negócio)
componentes/ui/        shadcn (base)
componentes/painel/    shell: Sidebar, BarraTopo, BuscaGlobal, CartaoIndicador, TabelaDados, EstadoVazio
componentes/<modulo>/  componentes do módulo
dominio/<modulo>/      regras puras: custos, precos, estoque, financeiro, planejamento, busca. Sem import de Supabase ou React. 100 % testável
dados/<modulo>/        consultas e escritas no Supabase (recebem o client, devolvem tipos)
acoes/<modulo>/        server actions: autenticação -> zod -> domínio -> dados -> revalidatePath. Idempotência aqui
lib/supabase/          clientes server, browser, admin; middleware de sessão
lib/auth/              papéis, exigirPapel(), origem da requisição
lib/formatos/          moeda, número, data, percentual pt-BR
lib/arquivos/          upload, URL assinada, limites por bucket
mcp/                   ferramentas MCP, escopos, verificação de token, filtro de segredos
tipos/                 tipos gerados do banco (supabase gen types) + tipos de domínio
```

Regra de dependência: `app -> componentes -> acoes -> dominio/dados`. `dominio` não importa nada das outras camadas. Lint com regra de importação para garantir.

### 3.3 Fluxo típico (exemplo: concluir ordem de produção)

1. Componente envia formulário para `acoes/producao/concluirOrdem`.
2. Ação valida com zod, carrega ordem, lotes e parâmetros via `dados/`.
3. `dominio/estoque/consumo.ts` calcula movimentações e custo realizado; `dominio/custos` recalcula custo real por peça.
4. Ação grava numa única função SQL transacional (`concluir_ordem_producao`) que insere movimentações, atualiza lote, atualiza ordem e entrada de produto acabado; a função rejeita estoque negativo.
5. `revalidatePath` nas rotas afetadas; auditoria gravada por trigger.

Operações multi-tabela críticas (concluir OP, registrar compra, baixar pedido, aplicar importação) são funções SQL `security invoker` chamadas por RPC, para garantir atomicidade.

---

## 4. Mapa de navegação

Sidebar com grupos recolhíveis, trilho de ícones quando recolhida, contadores onde fizer sentido. Barra superior: breadcrumb, busca (Ctrl+K), botão "Novo" (pedido, ordem, lançamento, insumo, conhecimento, tarefa), sino de alertas, tema, usuário.

| Grupo | Rota | Responsabilidade | Fase |
|---|---|---|---|
| Início | `/` | Dashboard executivo com período e comparação | 1 (casca), cresce por fase |
| Conhecimento | `/conhecimento` | Lista, filtros, busca, categorias, tags | 2 |
| | `/conhecimento/novo`, `/conhecimento/[id]` | Editor markdown, versões, validação, relações | 2 |
| | `/conhecimento/decisoes` | Visão filtrada de decisões (contexto, decisão, consequências) | 2 |
| Estoque | `/estoque/insumos` | Filamentos e demais insumos, estoque atual, mínimo, custo médio | 3 |
| | `/estoque/insumos/[id]` | Ficha, lotes, histórico de compras e consumo, custo por g e por kg | 3 |
| | `/estoque/movimentacoes` | Registro rastreável de entradas, saídas, ajustes, perdas | 3 |
| | `/estoque/compras`, `/estoque/compras/nova` | Compra com itens, frete, desconto, geração de lotes | 3 |
| | `/estoque/fornecedores` | Cadastro e histórico | 3 |
| Catálogo | `/catalogo/produtos`, `/catalogo/produtos/[id]` | Ficha, variações, BOM, arquivos, preços por canal, custo atual, margem | 5 |
| | `/catalogo/precificacao` | Calculadora: simular produto ou OP, cenários de preço, salvar cálculo | 4 |
| | `/catalogo/precificacao/historico` | Cálculos salvos, comparação com atual, produtos para revisar | 4 |
| Produção | `/producao/fila` | Ordens por estado, prazo e impressora (quadro e lista), carga prevista | 5 |
| | `/producao/ordens/[id]` | Ordem: material e lote, tempos, aprovadas/perdidas, custo estimado x real | 5 |
| | `/producao/impressoras`, `/producao/impressoras/[id]` | Cadastro, parâmetros de custo, horas, manutenções | 5 |
| Vendas | `/vendas/pedidos`, `/vendas/pedidos/[id]` | Pedidos por estado, resumo financeiro do pedido, linha do tempo | 6 |
| | `/vendas/clientes` | Cadastro mínimo (LGPD) e histórico | 6 |
| | `/vendas/importar` | Importação CSV por canal, idempotente | 6 |
| Financeiro | `/financeiro` | Painel: caixa realizado e projetado, vencidos, próximos, categorias | 7 |
| | `/financeiro/lancamentos` | A pagar, a receber, transferências, recorrências, anexos | 7 |
| | `/financeiro/contas`, `/financeiro/categorias` | Contas financeiras e categorias (fixa/variável) | 7 |
| | `/financeiro/impostos` | Parâmetros de estimativa e provisões | 7 |
| Planejamento | `/planejamento` | Calendário mensal e semanal, mês na URL | 8 |
| | `/planejamento/quadro`, `/planejamento/lista`, `/planejamento/conteudos` | Kanban, lista por prazo e atrasadas, tabela de conteúdo | 8 |
| | `/planejamento/campanhas`, `/planejamento/modelos` | Campanhas e modelos reutilizáveis | 8 |
| Relatórios | `/relatorios` | Rentabilidade por produto, canal, período; custo real x estimado; consumo | 9 |
| Alertas | `/alertas` | Central: estoque baixo, vencimentos, margem reduzida, OP atrasada, tarefas | 9 (sementes em 3 e 7) |
| Configurações | `/configuracoes/parametros-custo` | Parâmetros globais versionados, componentes de custo e métodos de rateio | 4 |
| | `/configuracoes/canais` | Canais de venda e suas taxas | 1 |
| | `/configuracoes/categorias`, `/configuracoes/unidades` | Listas editáveis | 1 |
| | `/configuracoes/usuarios`, `/configuracoes/integracoes` | Usuários e papéis; tokens do MCP com escopos | 1 e 2 |
| | `/configuracoes/auditoria` | Trilha de alterações | 1 (tabela), 9 (tela) |
| Conta | `/login`, `/perfil` | Autenticação, MFA opcional, tema | 1 |

Módulos adicionais avaliados (seção 14 do pedido): Fornecedores e compras entram no MVP (Fase 3, são pré-requisito do custo real). Configurações entram na Fase 1. Arquivos entram dentro de Produtos (Fase 5), sem módulo separado. Manutenção entra dentro de Impressoras (Fase 5). Central de alertas e Auditoria têm a tabela desde a Fase 1 e tela na Fase 9. Relatórios e BI ficam na Fase 9. Nenhum módulo além desses.

---

## 5. Modelo de dados

Convenções: tabelas em português no schema `public`, `id uuid default gen_random_uuid()`, `criado_em`, `atualizado_em`, `criado_por`; dinheiro em `numeric(14,2)` para valores transacionais e `numeric(14,6)` para custos unitários; quantidades em `numeric(14,3)` com unidade explícita; soft delete (`excluido_em`) em cadastros; movimentações e snapshots são imutáveis (sem update/delete, por policy). RLS ligado em todas as tabelas.

### 5.1 Núcleo e configuração (Fase 1)

| Tabela | Campos essenciais | Regras |
|---|---|---|
| `usuarios_app` | id (= auth.users.id), nome, papel (`dono`, `operador`, `leitura`), ativo | Só `dono` altera papéis |
| `canais_venda` | nome, tipo (`shopee`, `mercado_livre`, `tiktok_shop`, `site`, `direto`), comissao_pct, taxa_fixa_item, taxa_pagamento_pct, ads_pct_padrao, frete_subsidio_padrao, ativo, vigente_desde | Histórico de taxas em `canais_venda_taxas` (vigência) para auditoria de preços antigos |
| `categorias` | escopo (`produto`, `insumo`, `financeiro`, `conhecimento`, `planejamento`), nome, pai_id, cor | Único por (escopo, nome) |
| `unidades` | codigo (g, kg, un, m, ml, h), nome, fator_para_base | |
| `tokens_integracao` | nome, hash_token, usuario_id, escopos text[], expira_em, ultimo_uso_em, revogado_em | Token só aparece uma vez na criação; guardado como SHA-256 |
| `auditoria` | tabela, registro_id, acao, antes jsonb, depois jsonb, usuario_id, origem (`web`, `mcp`, `script`, `importacao`), em | Preenchida por trigger genérico nas tabelas críticas |
| `alertas` | tipo, severidade, titulo, descricao, entidade_tipo, entidade_id, criado_em, resolvido_em, silenciado_ate | Único aberto por (tipo, entidade) |

### 5.2 Conhecimento (Fase 2)

| Tabela | Campos essenciais | Regras |
|---|---|---|
| `conhecimentos` | titulo, slug, resumo, conteudo (markdown), tipo (`procedimento`, `solucao`, `decisao`, `referencia`, `perfil_impressao`, `nota`), categoria_id, tags text[], modulo, projeto, origem (`manual`, `claude_code`, `importacao`), referencia (arquivo, commit, sessão), confidencialidade (`interno`, `restrito`), validado, validado_por, validado_em, status (`rascunho`, `ativo`, `arquivado`), estrutura jsonb (para decisão: contexto, alternativas, consequências), busca tsvector gerado | Toda alteração gera linha em `conhecimentos_versoes` por trigger |
| `conhecimentos_versoes` | conhecimento_id, versao, titulo, conteudo, alterado_por, origem, motivo, em | Imutável |
| `conhecimentos_relacoes` | de_id, para_id, tipo (`relacionado`, `substitui`, `deriva_de`) | |
| `conhecimentos_anexos` | conhecimento_id, storage_path, nome, tamanho, tipo | Bucket privado `anexos-conhecimento` |

### 5.3 Insumos e estoque (Fase 3)

| Tabela | Campos essenciais | Regras |
|---|---|---|
| `fornecedores` | nome, contato, site, prazo_medio_dias, observacoes | |
| `insumos` | tipo (`filamento`, `embalagem`, `etiqueta`, `caixa`, `componente`, `fixador`, `peca_terceiro`, `consumivel`, `acabamento`, `outro`), nome, codigo_interno, unidade_base, estoque_minimo, localizacao, custo_medio (cache), ultimo_custo_compra (cache), ativo, observacoes, atributos jsonb | Para filamento: fabricante, marca, material, cor, cor_hex, diametro_mm, peso_util_padrao_g, peso_carretel_vazio_g, temperatura e observações técnicas em `atributos` |
| `compras` | fornecedor_id, data, numero_documento, frete, desconto_total, outros_custos, metodo_rateio (`valor`, `peso`, `quantidade`), status (`rascunho`, `confirmada`), observacoes | Confirmar gera lotes e movimentações numa função SQL |
| `compras_itens` | compra_id, insumo_id, quantidade, unidade, preco_unitario, desconto_item, custo_rateado, custo_unitario_final (calculado), lote_codigo | |
| `lotes_insumo` | insumo_id, compra_item_id, codigo, quantidade_inicial, quantidade_atual, custo_unitario, peso_carretel_vazio_g, aberto_em, encerrado_em | Cada rolo é um lote. `quantidade_atual >= 0` por check e por função |
| `movimentacoes_estoque` | insumo_id, lote_id, tipo (`entrada`, `consumo_producao`, `saida`, `ajuste`, `perda`, `devolucao`), quantidade (com sinal), custo_unitario_momento, motivo, origem_tipo, origem_id, observacao, usuario_id, em | Imutável. Saldo = soma. View `estoque_atual` por insumo e por lote |

Valoração (decisão documentada em `docs/regras-de-negocio.md`):
- A verdade primária de cada lote é `quantidade` e `valor`; o custo unitário é derivado (`valor / quantidade`). Isso evita lote que zera em gramas e sobra centavos.
- Consumo é valorado ao **custo real do lote** (o rolo é fisicamente identificado). Quando o consumo zera o lote, o valor da saída é o valor restante do lote, para fechar em 0,0000. Se o lote em uso não basta, o sistema divide o consumo e completa com o lote mais antigo (PEPS), sem override, gerando alerta `lote_dividido`.
- **Custo médio ponderado por insumo** = soma dos valores dos lotes com saldo / soma das quantidades. É o custo de reposição padrão que alimenta o motor de custos (estável contra uma compra promocional isolada e igual ao que o estoque carrega). Override por insumo: `ultima_entrada` ou `manual` com data. Com saldo zero, cai em `ultima_entrada` e o snapshot do cálculo registra a origem.
- Ajuste negativo e perda saem ao custo do lote e vão para a linha de resultado "perda de estoque", nunca para custo de OP.

Compra: desconto do pedido, frete e outros encargos são rateados entre as linhas **por valor da linha** (única base que existe para todo item; parafuso não tem peso e "1 rolo" não se compara com "100 unidades"). Cada parcela rateada é arredondada a 4 casas e a linha de maior valor absorve o resíduo, para que a soma feche exatamente. `custo_unitario_final = (valor_linha - desconto_rateado + frete_rateado + outros_rateados) / quantidade`; para filamento, `custo_g = landed / (quantidade × peso_liquido_g)`. Cada rolo vira um lote e o último lote da linha absorve o resíduo. Preço informado "já com frete" é marcado no cabeçalho da compra e o frete não é somado de novo. Impostos da nota não são separados (Simples e MEI não recuperam) e entram no preço.

### 5.4 Custos e precificação (Fase 4)

| Tabela | Campos essenciais | Regras |
|---|---|---|
| `parametros_custo` | versao, vigente_desde, vigente_ate, dados jsonb (tarifa_kwh, custo_hora_mao_obra, taxa_falha_padrao, desperdicio_padrao, custo_fixo_mensal, horas_produtivas_mes, volume_mensal_estimado, metodo_rateio_fixo, imposto_pct_estimado, metodo_margem_padrao, margem_alvo_padrao) | Versionado: editar cria versão nova; cálculos referenciam a versão |
| `componentes_custo` | codigo, nome, grupo (`material`, `maquina`, `energia`, `mao_obra`, `complementar`, `fixo`, `taxas`), metodo (`por_grama`, `por_hora_maquina`, `por_hora_trabalho`, `fixo_por_peca`, `fixo_por_pedido`, `percentual_preco`, `rateio_mensal`), ativo, parametros jsonb, ordem | Catálogo configurável; os componentes padrão vêm por seed |
| `calculos_custo` | produto_id, variacao_id, ordem_producao_id, canal_id, parametros_versao_id, entradas jsonb (snapshot completo: pesos, tempos, custos unitários dos insumos no momento, parâmetros da impressora, taxas do canal), resultado jsonb (quebra por componente, custo total, preço de equilíbrio, preço sugerido, cenários), custo_unitario_total, preco_sugerido, metodo_margem, margem_alvo, motivo (`manual`, `recalculo`, `venda`, `ordem`), em | Imutável. É o que uma venda antiga referencia |

### 5.5 Produtos e produção (Fase 5)

| Tabela | Campos essenciais | Regras |
|---|---|---|
| `produtos` | nome, slug, sku, descricao, categoria_id, status (`rascunho`, `ativo`, `pausado`, `descontinuado`), dimensoes jsonb, peso_g, tempo_impressao_min, pecas_por_ciclo, taxa_falha_pct, tempo_preparo_min, tempo_acabamento_min, tempo_embalagem_min, impressora_padrao_id, observacoes_fabricacao, licenca (texto e flag comercial), custo_atual (cache), calculo_atual_id, custo_atualizado_em | SKU único |
| `produtos_variacoes` | produto_id, nome, sku, atributos jsonb (cor, material, tamanho, acabamento), overrides (peso_g, tempo_min, insumo_filamento_id), ativo | Herda do produto o que não sobrescrever |
| `produtos_materiais` (BOM) | produto_id, variacao_id, insumo_id, quantidade, unidade, papel (`impressao`, `complementar`, `embalagem`, `acabamento`), por (`peca`, `pedido`) | Embalagem de envio é por pedido, embalagem da peça é por peça |
| `produtos_precos_canal` | produto_id, variacao_id, canal_id, preco_venda, vigente_desde, vigente_ate, margem_estimada_cache, calculo_custo_id | Histórico por vigência |
| `produtos_arquivos` | produto_id, tipo (`stl`, `3mf`, `gcode`, `imagem`, `documento`), storage_path ou caminho_externo, versao, hash_sha256, tamanho, licenca, notas, em | Bucket privado `arquivos-produto`; fotos em bucket `fotos-produto` (público, só imagens). Arquivo grande pode ficar no OneDrive com caminho + hash |
| `impressoras` | nome, fabricante, modelo, custo_aquisicao, valor_residual, data_aquisicao, vida_util_horas, horas_uso (cache), potencia_media_w, custo_manutencao_ano, custo_consumiveis_ano, horas_produtivas_ano, status (`ativa`, `manutencao`, `inativa`), observacoes | Custo-hora derivado (seção 7) |
| `manutencoes` | impressora_id, tipo (`preventiva`, `corretiva`), data, custo, descricao, horas_no_momento, proxima_em_horas, lancamento_id | Pode gerar despesa no financeiro |
| `ordens_producao` | codigo (OP-0001), produto_id, variacao_id, pedido_item_id, impressora_id, quantidade_planejada, quantidade_aprovada, quantidade_perdida, motivo_falha, status (`fila`, `imprimindo`, `acabamento`, `concluida`, `cancelada`), prioridade, prazo, inicio_previsto, fim_previsto, inicio_real, fim_real, tempo_previsto_min, tempo_real_min, calculo_estimado_id, custo_realizado, instrucoes, responsavel | Concluir é função SQL atômica |
| `ordens_consumo` | ordem_id, insumo_id, lote_id, quantidade_prevista, quantidade_real | Gera `movimentacoes_estoque` na conclusão |
| `movimentacoes_produto` | produto_id, variacao_id, tipo (`producao`, `venda`, `ajuste`, `perda`, `devolucao`, `estorno`), quantidade, valor, custo_unitario_momento, origem_tipo, origem_id, em | Estoque de peças prontas, média ponderada móvel por produto (peças são fungíveis, rolos não) |

Regras de custo realizado:
- `ordens_producao.custo_realizado` contém **só custo variável**: material ao custo do lote, horas reais × (depreciação + manutenção + consumíveis + energia), minutos reais × custo-hora de mão de obra, complementares consumidos. Custo fixo rateado serve só para precificar; nunca entra em custo realizado nem em estoque, porque já aparece como despesa realizada no financeiro.
- Peças perdidas na OP são absorvidas pelas boas da mesma OP: `custo_unitario_acabado = custo_realizado / quantidade_aprovada`. Se nenhuma peça foi aprovada, o custo vai para a linha "perda de produção" e não há entrada em acabados.
- Concluir é transição única. Corrigir é `reabrir`, que gera estorno de cada movimentação (nunca apaga) e permite concluir de novo.
- Custo estimado do item de pedido vem do snapshot vigente na confirmação e não muda quando o filamento muda de preço; o custo realizado chega na expedição pela média de acabados.

### 5.6 Vendas (Fase 6)

| Tabela | Campos essenciais | Regras |
|---|---|---|
| `clientes` | nome, email, telefone, documento (opcional), endereco jsonb, canal_origem_id, observacoes | Dados mínimos; exclusão anonimiza |
| `pedidos` | codigo, canal_id, codigo_externo, cliente_id, status_id, data_pedido, data_pagamento, data_envio, data_conclusao, subtotal, desconto, frete_cobrado, frete_pago, taxas_canal, taxas_pagamento, outros_descontos, total_bruto, total_liquido (calculado), status_pagamento (`pendente`, `pago`, `reembolsado`), origem (`manual`, `importacao`), importacao_id, observacoes | **Único (canal_id, codigo_externo)**: é a chave de idempotência |
| `pedidos_itens` | pedido_id, produto_id, variacao_id, quantidade, preco_unitario, desconto, custo_unitario_estimado, calculo_custo_id, custo_unitario_realizado | Custo estimado congela ao marcar pago |
| `pedidos_status` | codigo, nome, ordem, cor, fechado, gera_recebivel, baixa_estoque, padrao | Lista editável (recebido, aguardando pagamento, pagamento aprovado, aguardando produção, em produção, em acabamento, em embalagem, pronto para envio, enviado, concluído, cancelado, devolvido). Exatamente um status tem `gera_recebivel`; `baixa_estoque` marca o status de expedição |
| `pedidos_eventos` | pedido_id, de_status, para_status, em, usuario_id, nota | Linha do tempo |
| `importacoes` | canal_id, nome_arquivo, hash_sha256, total_linhas, criadas, atualizadas, ignoradas, erros jsonb, em | Hash único impede reprocessar o mesmo arquivo; linha por linha a chave é `codigo_externo` |

Regras de venda e recebível:
- O recebível nasce num único evento: o pedido entrar em `pagamento aprovado` (status com flag `gera_recebivel`). Pedido aguardando pagamento não gera nada. Valor previsto = valor a receber do canal (seção 7.7); data prevista = data de entrega + dias de repasse do canal (padrão 7), ou data do pedido + prazo médio de entrega + repasse.
- Recebido = liquidação do repasse (importação do extrato do canal casada por `codigo_externo`, ou confirmação manual). Divergência acima de R$ 0,05 entre previsto e realizado gera alerta `divergencia_repasse` e nunca ajusta o previsto.
- Reimportar o mesmo CSV faz upsert do pedido e chama `garantir_recebivel`: cria se não existe; atualiza previsto se ainda `planejado`; não toca em valor se `parcial` ou `realizado` (só alerta se o arquivo trouxe valor diferente).
- Cancelamento antes do repasse cancela o recebível. Reembolso depois do repasse cria um pagável `origem_tipo = reembolso_pedido`; o recebível original não é editado.
- Base das taxas percentuais = receita bruta menos descontos custeados pelo vendedor (cupom bancado pela plataforma não entra); frete fica fora da base por padrão. Quando o CSV do canal traz as taxas reais, elas prevalecem e ficam marcadas com origem `canal`.

### 5.7 Financeiro (Fase 7)

| Tabela | Campos essenciais | Regras |
|---|---|---|
| `contas_financeiras` | nome, tipo (`banco`, `carteira`, `saldo_marketplace`, `cartao`), saldo_inicial, saldo_inicial_em, ativo | |
| `categorias_financeiras` | nome, tipo (`receita`, `despesa`), natureza (`fixa`, `variavel`), embutido_no_custo (bool), pai_id | `embutido_no_custo = true` (compra de filamento e insumos, energia, manutenção, impressora) entra no caixa mas sai da DRE gerencial, porque esse valor já chega ao resultado pelo custo realizado das OPs. Evita contar a mesma despesa duas vezes |
| `centros_custo` | nome, ativo | Opcional, pode ficar vazio |
| `lancamentos` | tipo (`receita`, `despesa`, `transferencia`), descricao, categoria_id, centro_custo_id, conta_id, conta_destino_id, valor_previsto, competencia, data_prevista, status (`planejado`, `parcial`, `realizado`, `cancelado`, `estornado`), estorna_id, forma_pagamento, recorrencia_id, origem_tipo (`pedido`, `reembolso_pedido`, `compra`, `manutencao`, `imposto`, `recorrencia`, `manual`), origem_id, papel_origem, anexo_path, observacoes | **Único (origem_tipo, origem_id, papel_origem)** impede lançamento duplicado da mesma venda, compra ou competência. `atrasado` é derivado (data_prevista < hoje e não realizado), não é estado gravado |
| `lancamentos_realizacoes` | lancamento_id, valor, data, conta_id, observacao | Cada pagamento ou recebimento (inclusive parcial). `valor_realizado` do lançamento é a soma; `saldo_restante = valor_previsto - soma` |
| `recorrencias` | descricao, categoria_id, conta_id, valor, frequencia (`semanal`, `mensal`, `anual`), dia, inicio, fim | Materializa lançamentos `planejado` para os próximos 3 meses, único por (recorrencia_id, competencia). O modelo nunca é somado, só os gerados; alterar o modelo afeta só gerados ainda não realizados |
| `parametros_tributarios` | regime (texto livre: MEI, Simples Anexo, outro), aliquota_efetiva_pct, base (`faturamento_bruto`, `receita_liquida`), dia_vencimento, vigente_desde, observacoes | Sem valor padrão. Tela mostra aviso: estimativa, não substitui contador |
| `provisoes_imposto` | competencia, base_calculo, aliquota, valor, lancamento_id | Um pagável por competência (único), recalculado a cada alteração de pedido enquanto `planejado`, realizado com o valor real da guia paga. O imposto estimado por pedido é só análise e nunca vira lançamento |

Máquina de estados do lançamento: `planejado` nasce com previsto e data; realizar menos que o restante leva a `parcial`; realizar o restante (ou encerrar com diferença justificada) leva a `realizado`; `planejado` pode ser `cancelado` com motivo; `parcial` não pode ser cancelado (dinheiro já se moveu: encerrar e estornar); `realizado` só muda por estorno, que cria contra-lançamento de direção oposta com `estorna_id`. Caixa realizado soma realizações; projeção soma `saldo_restante` de `planejado` e `parcial`; DRE gerencial soma realizados excluindo estornos e categorias `embutido_no_custo`; `cancelado` não conta em nada. Transferências são pares que somam zero e ficam fora da DRE.

### 5.8 Planejamento (Fase 8)

Adaptado do módulo de marketing da FX (que funciona), generalizado para tarefa, conteúdo e projeto.

| Tabela | Campos essenciais | Regras |
|---|---|---|
| `plan_itens` | tipo (`tarefa`, `conteudo`, `projeto`), titulo, status, prioridade, inicio, prazo, horario, categoria_id, tags, responsavel, canal_publicacao, formato, legenda, briefing, cta, links jsonb, referencias jsonb, observacoes, checklist jsonb [{nome, feito}], produto_id, campanha_id, pai_id, modelo_id, recorrencia_id, concluido_em, publicado_em, metricas jsonb | Mês derivado de `prazo` (ou `inicio`); itens sem data ficam no backlog |
| `plan_fluxos` | tipo, status (lista ordenada com cor e flag fechado) | Conteúdo: ideia, planejamento, roteiro, producao, revisao, agendado, publicado. Tarefa: configurável |
| `plan_campanhas` | nome, inicio, fim, objetivo, status | |
| `plan_modelos` | nome, tipo, campos_padrao jsonb, checklist_padrao jsonb | Modelos editáveis na interface (o FX só tinha em código) |
| `plan_recorrencias` | regra (frequência, intervalo, dias), proxima_geracao, modelo_id, ativo | Gera itens à frente por 60 dias |
| `plan_relacoes` | de_id, para_id, tipo (`bloqueia`, `relacionada`) | |
| `plan_historico` | item_id, campo, de, para, usuario_id, em | Histórico de alterações |

### 5.9 Busca global

Cada tabela pesquisável tem coluna `busca tsvector` gerada (`to_tsvector('portuguese', unaccent(...))`) com índice GIN, mais índice trigram no nome. Função `buscar_global(termo, tipos text[], limite int)` faz UNION ALL por tipo e devolve (tipo, id, titulo, subtitulo, rota, pontuacao). `security invoker`: RLS filtra por usuário. Cada fase adiciona o seu ramo na função por migração.

### 5.10 Integridade transversal

- Movimentações, versões, cálculos e eventos: policies sem UPDATE/DELETE.
- Trigger `auditar()` em: produtos_precos_canal, parametros_custo, canais_venda, lancamentos, insumos, lotes_insumo, usuarios_app, tokens_integracao, conhecimentos.
- Origem da ação: a aplicação executa `set_config('app.origem', 'web'|'mcp'|'script', true)` no início de cada transação; o trigger lê.
- Exclusão: cadastros com movimentação não podem ser apagados, só inativados.
- Tipos gerados com `supabase gen types` após cada migração.

---

## 6. Integração com Claude Code

### 6.1 Alternativas analisadas

| Alternativa | O que faz | Complexidade | Segurança | Veredito |
|---|---|---|---|---|
| A. Servidor MCP HTTP dentro do próprio ERP (`/api/mcp`) | Claude Code chama ferramentas `kb_buscar`, `kb_salvar` etc. via HTTP com token | Baixa (uma rota, `mcp-handler`) | Alta: token com escopo, RLS, log de origem, sem service role na máquina | **Recomendada** |
| B. Servidor MCP stdio local (processo Node no repositório) | Mesmo, mas rodando localmente e falando com o banco | Média (processo, build, caminho Windows com `cmd /c`) | Precisa de credencial de banco local | Não: duplica a lógica do servidor web e expõe credencial |
| C. Skills do Claude Code | UX em linguagem natural: "salve esse procedimento" | Baixa (markdown) | Herda do MCP | **Recomendada**, em cima de A |
| D. Hooks | `UserPromptSubmit` pode injetar contexto; `Stop` recebe `last_assistant_message`; `PostToolUse` recebe `tool_response` | Média; latência a cada turno; histórico de falha no Windows | Risco de capturar segredo se automático | Só um hook `Stop` **opcional** que sugere captura via `systemMessage`, sem gravar nada |
| E. Extensão do VS Code | Painel próprio no editor | Alta | | Não: a extensão Claude Code já expõe skills; o ERP web cobre a tela |
| F. Leitura do histórico de conversas | Ler `transcript_path` JSONL | Baixa tecnicamente | Captura tudo, inclusive segredos e dado pessoal | Não, por desenho. Captura é por comando |

Confirmado nos docs e no ambiente (Claude Code 2.1.283): hooks recebem `session_id`, `transcript_path`, `cwd`; `UserPromptSubmit` recebe `prompt`; `PostToolUse` recebe `tool_response`; `Stop` recebe `last_assistant_message` e `stop_hook_active`; `additionalContext` funciona em UserPromptSubmit, SessionStart, PostToolUse e Stop. MCP por projeto via `.mcp.json` com expansão `${VAR}`, exige aprovação do usuário na primeira vez. Skills aceitam `allowed-tools`, `disable-model-invocation`, `context: fork`.

### 6.2 Arquitetura recomendada

```
VS Code / terminal                               ERP (Next.js)                    Supabase
Claude Code                                      /api/mcp (Streamable HTTP)
  skills: /kb-salvar /kb-buscar ...  --token-->  verificaToken -> escopos  --RLS-->  conhecimentos
  .mcp.json: fcs-erp (http)                      ferramentas MCP                     calculos_custo (leitura)
  hook Stop (opcional): só sugere                filtro de segredos                  auditoria (origem = mcp)
```

Ferramentas MCP (nomes finais em português, escopos entre parênteses):

| Ferramenta | Entrada | Saída | Escopo |
|---|---|---|---|
| `kb_buscar` | termo, categoria?, tags?, tipo?, limite | lista (id, título, resumo, tipo, tags, atualizado_em, rota) | `conhecimento:ler` |
| `kb_obter` | id ou slug | registro completo em markdown + metadados + versão | `conhecimento:ler` |
| `kb_salvar` | titulo, resumo, conteudo, tipo, categoria, tags, modulo?, referencia?, confidencialidade? | id, rota, aviso se houver quase-duplicata | `conhecimento:escrever` |
| `kb_atualizar` | id, campos, motivo | nova versão | `conhecimento:escrever` |
| `kb_decisoes` | modulo?, desde? | decisões ativas (contexto, decisão, consequências) | `conhecimento:ler` |
| `custos_regras` | componente? | fórmulas documentadas + parâmetros vigentes (versão) | `custos:ler` |
| `produto_custo` | sku | custo atual, quebra, preço por canal, margem | `custos:ler` |
| `alertas_abertos` | tipo? | alertas em aberto | `operacao:ler` |

Fases posteriores acrescentam só ferramentas de leitura, no mesmo servidor e com o mesmo modelo de escopo: `plan_obter` e `plan_listar` (Fase 8, para as skills de conteúdo lerem o item planejado), `estoque_insumo` (Fase 3). Nenhuma ferramenta de escrita fora de `conhecimentos*` sem decisão registrada.

Regras do servidor MCP:
- Token Bearer gerado em `/configuracoes/integracoes`, exibido uma vez, guardado como hash, com escopos e validade. Revogável.
- Cada chamada roda com `app.origem = 'mcp'` e `usuario_id` do dono do token; RLS vale como para o usuário.
- Filtro de segredos no `kb_salvar`: rejeita conteúdo que case com padrões de chave (`sk-`, `eyJ`, `AKIA`, `-----BEGIN`, `SUPABASE_SERVICE_ROLE_KEY=`), devolvendo erro explicando o que remover.
- Limite de taxa simples por token (contagem por minuto em tabela), resposta 429.
- Nenhuma ferramenta executa SQL arbitrário nem escreve fora de `conhecimentos*`.

Configuração no workspace (`.mcp.json` na raiz do `Fcs OS`, versionado, sem segredo):

```json
{ "mcpServers": { "fcs-erp": { "type": "http",
  "url": "${FCS_ERP_URL:-http://localhost:3000}/api/mcp",
  "headers": { "Authorization": "Bearer ${FCS_ERP_MCP_TOKEN}" } } } }
```

`FCS_ERP_URL` e `FCS_ERP_MCP_TOKEN` ficam no ambiente do usuário (ou `.env`, não versionado).

### 6.3 Skills (em `.claude/skills/`)

| Skill | Fluxo |
|---|---|
| `/kb-salvar` | Estrutura o que está na conversa em título, resumo, conteúdo, tipo, categoria, tags e referência (arquivos, commit); mostra a prévia; chama `kb_buscar` para avisar duplicata; só grava após "sim" |
| `/kb-buscar <termo>` | Chama `kb_buscar`, lista resultados, oferece abrir com `kb_obter`; usado também por outras skills antes de propor mudança |
| `/kb-decisao` | Registro de decisão de arquitetura ou de negócio com contexto, alternativas, decisão, consequências; tipo `decisao` |
| `/kb-procedimento` | Transforma uma solução em procedimento operacional passo a passo, com pré-requisitos e verificação |

Regra permanente no `CLAUDE.md` do ERP: antes de propor mudança de arquitetura, chamar `kb_decisoes` e `kb_buscar` com o módulo em questão; ao concluir tarefa que gerou decisão ou solução não trivial, perguntar se salva com `/kb-salvar` (mesmo padrão do bloco "Aprender com correções" já existente).

Sugestão de captura (opcional, Fase 2, desligada por padrão): hook `Stop` com script Node de 40 linhas que lê `last_assistant_message`, procura marcadores ("decidimos", "a causa era", "procedimento", "solução") e devolve `systemMessage` "Parece conhecimento. Salvar com /kb-salvar?". Não grava, não injeta no modelo, não lê transcript. Ligado por snippet documentado em `docs/integracao-claude-code.md`.

### 6.4 Limitações confirmadas

- Captura por comando: só o que o usuário pedir. Nada é lido do histórico.
- Hook `Stop` vê apenas a última mensagem do assistente; não vê a conversa inteira.
- `transcript_path` existe, mas não será lido pelo ERP (decisão de privacidade).
- O claude-mem continua capturando observações localmente (SQLite); são sistemas separados. Uma importação seletiva do claude-mem para a base pode ser avaliada depois, nunca automática.
- Figma MCP precisa de autorização interativa e não é necessário para este plano.

---

## 7. Motor de custos

Camada: `erp/src/dominio/custos/` (cálculo por peça), `dominio/precos/` (formação de preço), `dominio/estoque/` (valoração). Decimal.js, sem ponto flutuante. Documentação completa em `docs/formulas-de-custo.md`.

### 7.1 Entradas

Produto ou OP: `peso_g` (peso do fatiador, incluindo suportes e purga da peça), `tempo_ciclo_min`, `pecas_por_ciclo n`, `taxa_falha f` (fração de tentativas perdidas), `desperdicio w` (purga de troca, descarte de início de rolo, fração sobre o material), insumo de impressão com `custo_g`, impressora, tempos de mão de obra (`preparo_ciclo_min`, `acabamento_peca_min`, `embalagem_peca_min`), BOM complementar (quantidade × custo unitário, por peça ou por pedido), parâmetros vigentes, canal.

Regra anti-dupla-contagem: `w` incide só sobre material; `f` incide sobre tudo que se perde quando uma tentativa falha (material, máquina, energia, preparo). Acabamento, embalagem e complementares só acontecem em peça boa e não recebem `f`.

### 7.2 Fórmulas por peça boa

```
custo_g                = custo_unitario_insumo / 1000            (insumo em kg) ou direto (insumo em g)
material_bruto         = peso_g * (1 + w) * custo_g
horas_peca             = tempo_ciclo_min / 60 / n
custo_hora_depreciacao = (custo_aquisicao - valor_residual) / vida_util_horas
custo_hora_manutencao  = (custo_manutencao_ano + custo_consumiveis_ano) / horas_produtivas_ano
custo_hora_energia     = potencia_media_w / 1000 * tarifa_kwh
maquina_bruta          = horas_peca * (custo_hora_depreciacao + custo_hora_manutencao)
energia_bruta          = horas_peca * custo_hora_energia
preparo_bruto          = (preparo_ciclo_min / 60 / n) * custo_hora_mao_obra
fator_falha            = 1 / (1 - f)                               (exige 0 <= f < 1)
material, maquina, energia, preparo = *_bruto * fator_falha
acabamento             = (acabamento_peca_min / 60) * custo_hora_mao_obra
embalagem_mo           = (embalagem_peca_min / 60) * custo_hora_mao_obra
complementares_peca    = soma(qtd * custo_unitario) dos itens "por peça"
complementares_pedido  = soma(qtd * custo_unitario) dos itens "por pedido"  (entra em F, não em C)
fixo_rateado           = metodo "hora": horas_peca * fator_falha * (custo_fixo_mensal / horas_produtivas_mes)
                         metodo "peca": custo_fixo_mensal / volume_mensal_estimado
                         metodo "desligado": 0
C (custo por peça)     = material + maquina + energia + preparo + acabamento + embalagem_mo + complementares_peca + fixo_rateado
```

### 7.3 Formação de preço (percentuais sobre o preço no denominador)

```
t  = comissao_pct + taxa_pagamento_pct + imposto_pct + ads_pct      (frações sobre o preço)
F  = taxa_fixa_item + frete_subsidio + complementares_pedido         (fixos por unidade vendida)
preco_equilibrio       P0 = (C + F) / (1 - t)                         se 1 - t > 0
preco por margem m     Pm = (C + F) / (1 - t - m)                     se 1 - t - m > 0      (lucro = m * preço)
preco por markup k     Pk = (C * (1 + k) + F) / (1 - t)               se 1 - t > 0          (lucro = k * custo)
dado um preço P:       lucro = P*(1-t) - C - F ;  margem = lucro / P ;  markup_efetivo = lucro / C
                       margem_contribuicao = P*(1-t) - F - (C - fixo_rateado)
                       resultado_liquido_estimado = margem_contribuicao - fixo_rateado
conversão              sem taxas, m = k / (1 + k) (markup 50 % = margem 33,3 %); com taxas, calcular pelos preços
```

Inviável: se `1 - t - m <= 0` (ou `1 - t <= 0`), a função devolve `{ viavel: false, motivo: 'percentuais_sobre_preco_excedem_100', soma_percentuais, margem_maxima_exclusiva: 1 - t, preco: null }`, nunca um número; quando só o preço por margem é inviável, o preço de equilíbrio ainda é devolvido. Aviso `margem_sensivel` quando o denominador fica entre 0 e 0,10.

### 7.4 Caso de teste de referência (valores hipotéticos, não são taxas reais)

Entradas: filamento R$ 60,00/kg (custo_g 0,06), peso 50 g, w 5 %, f 5 %, impressora R$ 2.000 residual 0 vida 4.000 h, 120 W, tarifa 0,95, manutenção+consumíveis R$ 300/ano em 1.500 h, ciclo 240 min, n 1, preparo 10 min, acabamento 10 min, embalagem 0 min, mão de obra R$ 30/h, complementar por peça R$ 1,50, fixo R$ 600/mês em 200 h, método hora. Canal: comissão 20 %, taxa fixa R$ 4,00, pagamento 0, imposto 6 %, margem alvo 25 %.

| Componente | Bruto | Com falha (×1,052632) |
|---|---|---|
| material | 3,1500 | 3,3158 |
| máquina (0,50 + 0,20)/h × 4 h | 2,8000 | 2,9474 |
| energia 0,114/h × 4 h | 0,4560 | 0,4800 |
| preparo | 5,0000 | 5,2632 |
| acabamento | 5,0000 | 5,0000 |
| complementares por peça | 1,5000 | 1,5000 |
| fixo 3,00/h × 4 h × 1,052632 | | 12,6316 |
| **C** (precisão cheia 31,137894) | | **31,1379** |

A soma das linhas exibidas dá 31,1380; o total vem da precisão cheia e os testes comparam com ele. t = 0,26; F = 4,00. P0 = 35,1379 / 0,74 = 47,4836, **47,49** (para cima). Pm (25 %) = 35,1379 / 0,49 = 71,70999, **71,71**. Conferência: 71,71 × 0,74 − 35,1379 = 17,9275; 17,9275 / 71,71 = 25,0 %. Markup 25 % (lucro = 25 % do custo) dá Pk = (31,1379 × 1,25 + 4) / 0,74 = 58,0032, **58,01**, com margem resultante de 13,4 %: demonstra que markup e margem não são sinônimos e vira teste.

Esses números são fixtures de teste. Taxas reais de Shopee, Mercado Livre e TikTok e a alíquota tributária entram só por configuração, conferidas na conta do vendedor. Mais quatro casos de referência (peça simples, mesa de 6 peças com falha e desperdício, configuração inviável, markup 50 % contra margem 50 %), validados de forma independente, estão no Anexo A e vão para `docs/formulas-de-custo.md`.

### 7.5 Estratégia de teste

- Vitest, um arquivo por função: `material.test.ts`, `maquina.test.ts`, `falha.test.ts`, `preco.test.ts`, `markup-vs-margem.test.ts`, `inviavel.test.ts`, `arredondamento.test.ts`, `rateio-fixo.test.ts`, `multi-peca-ciclo.test.ts`.
- Tabela de casos com entradas e saídas esperadas em `docs/formulas-de-custo.md`, lida pelos testes (fonte única).
- Propriedades: custo nunca negativo; com f = 0 e w = 0 o resultado iguala a soma simples; preço por margem m devolve margem maior ou igual a m ao recalcular no preço arredondado; markup k devolve lucro = k × custo.
- Arredondamento: aritmética decimal obrigatória em custo, estoque e finanças (ponto flutuante não representa 0,1 e quebra a reprodutibilidade do snapshot). Precisão total dentro do cálculo; componentes e custos a 4 casas, custo por grama a 6, percentuais como fração a 6, dinheiro em lançamentos a 2, tudo `ROUND_HALF_UP`. Exceção: **preço sugerido arredonda para cima** (`ROUND_CEILING`) a 2 casas, porque a meta é um piso; o caso (b) do Anexo A mostra que arredondar para o mais próximo entregaria 19,99 % em vez de 20 %. Margens exibidas são recalculadas no preço final arredondado.
- Snapshot: salvar cálculo grava `entradas` e `resultado` completos mais `versao_motor`; teste garante que recalcular a partir do snapshot reproduz o mesmo resultado mesmo com parâmetros atuais diferentes.
- Oito bugs prováveis, cada um com teste de regressão: aplicar falha a acabamento, embalagem ou complementares; compor desperdício como 1/(1−w) ou aplicá-lo ao tempo; taxa fixa fora do denominador ou margem aplicada depois das taxas; preço arredondado para baixo da meta; rateio de frete que não fecha a soma; lote que zera em gramas com valor residual; segundo recebível ao reimportar ou previsto sobrescrevendo realizado; custo estimado de pedido antigo mudando com o preço do filamento ou valor contado em previsto e realizado ao mesmo tempo.

### 7.6 Recalcular e sinalizar

- Ao confirmar compra que muda `ultimo_custo_compra` de um insumo, uma função marca `produtos.custo_atualizado_em = null` para produtos cuja BOM usa o insumo e enfileira recálculo (server action em lote).
- Recalcular compara custo novo com `custo_atual` e com `produtos_precos_canal` vigentes; se a margem cair abaixo da margem alvo do produto (ou do padrão), cria `alerta` tipo `margem_reduzida` e lista em `/catalogo/precificacao/historico`.
- O cálculo que precificou uma venda antiga continua acessível por `pedidos_itens.calculo_custo_id`.

### 7.7 Resultado por pedido (domínio de vendas)

```
receita_bruta    = soma(qtd × preco_unitario)
base_vendas      = receita_bruta - descontos_do_vendedor + frete_cobrado_do_cliente
base_taxas       = receita_bruta - descontos_do_vendedor                  (frete fora por padrão)
taxas_canal      = arred2(comissao × base_taxas) + arred2(pagamento × base_taxas) + taxa_fixa × n_itens
valor_a_receber  = base_vendas - taxas_canal - frete_pago_pela_empresa    (valor do recebível)
imposto_est      = arred2(imposto × base_vendas)                          (análise; não vira lançamento)
receita_liquida  = valor_a_receber - imposto_est
custo_estimado   = soma(item.custo_unitario_estimado × qtd)              (snapshot, só variável)
resultado_est    = receita_liquida - custo_estimado ; margem_est = resultado_est / base_vendas
resultado_real   = receita_liquida - soma(item.custo_unitario_realizado × qtd)   (quando todos expedidos)
```

Projeção de caixa: `saldo_projetado(d) = saldo_realizado_hoje + soma(sinal × saldo_restante)` dos lançamentos `planejado` e `parcial` com data prevista até `d`. Atrasados ficam no bucket de hoje. Realizar um lançamento reduz a projeção e aumenta o caixa pelo mesmo valor, e a soma dos dois não muda (teste de invariante).

---

## 8. Direção visual

### 8.1 Decisão

Tema **escuro por padrão**, derivado do guia da marca, com tema claro disponível por tokens (as referências salvas são claras e o uso prolongado pode pedir isso). A paleta para marketing é dura (preto puro, ciano forte); para uma ferramenta de 8 horas por dia ela é adaptada: superfícies levemente elevadas, ciano reservado a ação e foco, cores semânticas discretas para finanças.

### 8.2 Tokens propostos (HEX)

| Token | Escuro (padrão) | Claro | Uso |
|---|---|---|---|
| `fundo` | `#0A0A0A` | `#F6F7F8` | página |
| `superficie` | `#121314` | `#FFFFFF` | cards, tabelas |
| `superficie-2` | `#191A1C` | `#F0F2F4` | cabeçalho de tabela, hover |
| `borda` | `#242628` | `#E3E6E9` | 1 px |
| `texto` | `#F2F3F4` | `#111315` | principal |
| `texto-2` | `#A4A8AD` | `#5B6168` | secundário |
| `texto-3` | `#6E7378` | `#8A9097` | rótulos, placeholders |
| `acao` | `#00D8FF` | `#0098B8` | botão primário, link, item ativo, foco |
| `acao-texto` | `#0A0A0A` | `#FFFFFF` | texto sobre `acao` |
| `acao-suave` | `#0B2A31` | `#DFF7FC` | fundo de item ativo, chip |
| `sucesso` | `#3DDC97` | `#1E8E5A` | recebido, aprovado |
| `alerta` | `#F5B841` | `#9A6B00` | vencendo, estoque mínimo |
| `erro` | `#F26D6D` | `#B3261E` | vencido, perda, inviável |
| `info` | `#00D8FF` | `#0098B8` | igual a ação |

Cores quentes só com papel semântico (nunca decoração), em tom contido. Contraste AA conferido para texto e para texto sobre `acao` nos dois temas.

### 8.3 Tipografia e forma

- Corpo e interface: Inter (números tabulares ligados em tabelas e KPIs).
- Títulos de página e números grandes de KPI: Chakra Petch (display angular da marca), só nesses dois lugares. Nada de serif itálica (banida pelo `antidesignia.md`).
- Código, SKU, lote: JetBrains Mono.
- Raio 4 px em tudo; canto chanfrado só no logotipo e no cartão de destaque do dashboard. Sem sombra; profundidade por tom; brilho ciano sutil só em foco.
- Espaçamento base 4 px; linhas de tabela 40 px; padding de card 20 px; largura máxima de conteúdo 1400 px.

### 8.4 Padrões herdados das referências

- Sidebar em dois estados: 240 px com grupos e contadores; 64 px como trilho de ícones com tooltip (imagens "download (17)" e "(18)").
- Cartão de indicador: rótulo, número grande, pílula de variação contra o período anterior, sparkline opcional ("Finance Bento Card").
- Seletor de período no topo das visões (dia, semana, mês, ano) e cabeçalho com busca central ("Management Dashboard").
- Ícones outline de traço uniforme (Iconly como referência; lucide como implementação).
- Da imagem "image.png" (Circle): agrupamento do menu com contadores por item; não herdar o azul nem o visual de comunidade.
- Evitar: borda colorida à esquerda em cards, gradientes, glassmorphism, três cards iguais em linha, spinner (usar skeleton). Regras do `antidesignia.md`.

### 8.5 Componentes do design system (Fase 1)

Botão (primário, secundário, quieto, perigo), Campo, Select e Combobox, Diálogo, Painel lateral (drawer), Menu, Abas, Tabela de dados (ordenação, filtros, paginação, seleção em massa, colunas), Badge de status, Tooltip, Toast, Comando (Ctrl+K), Calendário e seletor de data, Formulário padrão (grid de 12 colunas, erros inline, estado de envio), Cartão de indicador, Gráfico de área e barras, Estado vazio, Skeleton, Banner de aviso.

### 8.6 Referências visuais (`erp/docs/referencias-visuais/`)

Após aprovação: README com a direção acima; as 7 imagens movidas de `identidade/REFERENCIAS DESIGN WEB/` para lá com um arquivo `fontes.md` listando origem conhecida (nome do arquivo indica Instagram/Threads/Pinterest; onde a URL original não for conhecida, registrar "fonte não identificada") e notas "inspirar / evitar" por imagem; mais 3 a 5 referências adicionais pesquisadas para financeiro, estoque e kanban, cada uma com link.

---

## 9. Estrutura de pastas e documentação

```
Fcs OS/
  erp/                                  aplicação (novo)
    src/                                (seção 3.2)
    testes/e2e/                         Playwright
    docs/
      arquitetura.md                    camadas, fluxos, decisões (ADR curtas)
      modelo-de-dados.md                tabelas, relações, regras de integridade, diagrama
      regras-de-negocio.md              estados, valoração, idempotência, exclusão
      formulas-de-custo.md              fórmulas e tabela de casos de teste (fonte dos testes)
      integracao-claude-code.md         MCP, token, escopos, skills, hook opcional, limites
      design-system.md                  tokens, tipografia, componentes, estados, responsivo
      referencias-visuais/              README, fontes.md, imagens
      configuracao-local.md             Node, npm, Supabase CLI ou projeto de teste, comandos
      variaveis-de-ambiente.md          nomes, onde ficam, o que nunca vai ao navegador
      testes.md                         como rodar unitário, integração, e2e; cobertura mínima
      implantacao.md                    hospedagem, build, migrações, domínio
      backups-e-recuperacao.md          rotina, restauração testada, retenção
    CLAUDE.md                           instruções permanentes do ERP (estrutura real, comandos, regras de camadas, áreas críticas, testes)
    package.json, next.config.ts, tsconfig.json, vitest.config.ts, playwright.config.ts, .env.example
  supabase/
    migrations/                         raiz, conforme regra já existente no CLAUDE.md
    seed/                               canais, categorias, unidades, componentes de custo padrão
  .mcp.json                             servidor fcs-erp (http), sem segredo
  .claude/skills/kb-salvar, kb-buscar, kb-decisao, kb-procedimento
  .github/workflows/ci.yml, backup.yml
```

`CLAUDE.md` raiz ganha: linha na estrutura de pastas (`erp/`), regra "regras de negócio só em `erp/src/dominio`", comando de testes, e a instrução de consultar a base de conhecimento antes de propor mudança. `.gitignore` ganha `erp/.env*`, `erp/.next/`, `erp/node_modules/`, `erp/testes/relatorios/`.

Nenhum documento repete outro: fórmulas só em `formulas-de-custo.md`; tabelas só em `modelo-de-dados.md`; o `CLAUDE.md` aponta para eles.

---

## 10. Plano por fases

Cada fase termina com: migrações aplicadas e versionadas, tipos gerados, testes passando no CI, tela utilizável, documentação do módulo atualizada, registro da decisão relevante na base de conhecimento (a partir da Fase 2) e commit. Tamanho: P (1 a 2 sessões), M (3 a 5), G (6 ou mais).

### Fase 0: Auditoria e definição técnica (concluída com este documento)

Entregue: diagnóstico, stack, modelo de dados, integração, motor de custos, direção visual, plano. Pendências na seção 13.

### Fase 1: Fundação (G)

- Desenvolver: projeto Next.js em `erp/`, Tailwind + shadcn com tokens da seção 8, fontes, layout (sidebar dois estados, barra superior, responsivo), login e-mail+senha com `@supabase/ssr`, middleware de sessão, papéis, `exigirPapel`, página de configurações (canais, categorias, unidades, usuários), busca global com `buscar_global` (só usuários e canais no início), componentes do design system, dashboard vazio com cartões "sem dados", CI, `CLAUDE.md` do ERP, docs de arquitetura, configuração local, variáveis, design system.
- Dados: migrações 0001 a 0005: extensões (`pg_trgm`, `unaccent`), `usuarios_app`, `canais_venda` (+ taxas), `categorias`, `unidades`, `auditoria` + trigger, `alertas`, `tokens_integracao`, função `buscar_global`, policies RLS base, seed de canais (Shopee, Mercado Livre, TikTok Shop, Direto) com taxas em branco a preencher.
- Validar: teste de RLS com dois usuários (dono vê e edita; leitura só vê); e2e: login, navegar, criar categoria, buscar, trocar tema, layout em 1440/1024/390 px; `tsc`, lint, build limpos.
- Concluída quando: um usuário real loga, configura canais e categorias, e a busca devolve esses registros.

### Fase 2: Base de conhecimento e integração com Claude Code (M)

- Desenvolver: CRUD de conhecimento com editor markdown, versões, validação, relações, anexos, filtros, busca; tela de tokens de integração; rota `/api/mcp` com as 8 ferramentas (as de custos devolvem "módulo ainda não disponível" até a Fase 4); filtro de segredos; limite de taxa; `.mcp.json`; 4 skills; hook `Stop` opcional; `docs/integracao-claude-code.md`.
- Dados: migrações `conhecimentos*`, ramo da busca, bucket `anexos-conhecimento`, policies.
- Validar: unitário (slug, filtro de segredos, escopos); integração (token revogado recebe 401; escopo errado recebe 403; `kb_salvar` com chave de API é rejeitado); e2e: criar, editar, ver versões; teste real: do Claude Code no VS Code, `/kb-buscar PETG` devolve o registro criado na tela e `/kb-salvar` grava com origem `claude_code` e aparece na auditoria.
- Concluída quando: as três decisões desta fase (stack, estrutura, MCP) estão gravadas na base pelo próprio Claude Code.

### Fase 3: Insumos, compras e estoque (G)

- Desenvolver: cadastro de insumos (filamento com campos técnicos, demais tipos), fornecedores, compras com rateio e confirmação, lotes, movimentações com motivo e origem, ajustes e perdas com justificativa, estoque atual e mínimo, alertas de estoque baixo, histórico por insumo, custo por g e por kg, importação do CSV de catálogo não se aplica aqui (é produto), docs de regras de negócio (valoração).
- Dados: migrações `fornecedores`, `insumos`, `compras*`, `lotes_insumo`, `movimentacoes_estoque`, view `estoque_atual`, funções `confirmar_compra`, `registrar_movimentacao` (bloqueia negativo, permite override com motivo e cria alerta), ramos da busca.
- Validar: unitário com os casos B1 e B2 do Anexo A (rateio por valor com resíduo fechando a soma exata, custo médio após duas entradas a preços diferentes, consumo ao custo do lote, lote dividido zerando em 0,0000, custo por grama com e sem frete, conversão kg/g); integração (movimentação que negativaria lote é rejeitada; override só em consumo de produção, com justificativa, gera alerta `estoque_negativo`; compra, devolução e ajuste nunca aceitam override); e2e: comprar 2 rolos, consumir, ver histórico e estoque; exportar CSV.
- Concluída quando: um rolo real cadastrado mostra custo por grama correto e o estoque bate com a prateleira.

### Fase 4: Motor de custos e precificação (G)

- Desenvolver: `dominio/custos` e `dominio/precos` completos com testes; parâmetros versionados e componentes configuráveis (ativar, desativar, método); impressoras mínimas para custo-hora (cadastro completo na Fase 5); calculadora: simular (sem produto) ou calcular produto/variação, cenários de preço lado a lado, inviabilidade explicada, salvar cálculo, histórico, recálculo em lote, alerta de margem reduzida; `docs/formulas-de-custo.md` com a tabela de casos; ferramentas MCP `custos_regras` e `produto_custo` ativadas.
- Dados: migrações `parametros_custo`, `componentes_custo`, `calculos_custo`, `impressoras` (campos de custo), seed de componentes padrão e de uma versão inicial de parâmetros com valores em branco onde não houver dado real.
- Validar: a bateria da seção 7.5 passando; teste de snapshot; e2e: calcular a peça de referência e conferir 47,48 e 71,71 na tela; mudar o custo do filamento e ver o produto marcado para revisão.
- Concluída quando: três produtos reais têm cálculo salvo e preço por canal comparado com o anúncio atual.

### Fase 5: Produtos, impressoras e produção (G)

- Desenvolver: cadastro de produtos com variações, BOM, fotos, arquivos com versão e hash e URL assinada, preços por canal com vigência, custo atual e margem por canal, importação inicial a partir de `dados/catalogo/*.csv` (título, preço, canal, id externo) marcada como rascunho; impressoras completas com manutenção e horas; ordens de produção (fila em quadro e lista, carga prevista por impressora, conflito de capacidade por soma de tempo previsto no período), conclusão atômica com consumo real por lote, aprovadas e perdidas, custo realizado versus estimado; estoque de peças prontas.
- Dados: migrações `produtos*`, `impressoras` (resto), `manutencoes`, `ordens_producao`, `ordens_consumo`, `movimentacoes_produto`, buckets `arquivos-produto` (privado) e `fotos-produto`, função `concluir_ordem_producao`, ramos da busca.
- Validar: unitário (herança de variação, BOM por peça e por pedido, carga por impressora); integração (concluir OP gera movimentações corretas, custo realizado, entrada de peça pronta, e falha se lote insuficiente); e2e: criar produto, OP, concluir, ver estoque de peças; arquivo privado só abre com URL assinada; responsivo da fila.
- Concluída quando: uma semana real de produção foi registrada por OPs e o consumo de filamento bate com a pesagem.

### Fase 6: Pedidos e clientes (M)

- Desenvolver: pedidos manuais com itens, descontos, taxas por canal pré-preenchidas e editáveis, frete cobrado e pago, status configuráveis com linha do tempo, resumo financeiro do pedido (receita bruta, descontos, taxas, líquida, custo estimado, custo realizado quando houver OP, resultado, consumo de materiais), clientes mínimos, criação de OP a partir do item, baixa de peça pronta no envio, importação CSV por canal (mapeamento de colunas por canal, idempotente por arquivo e por código externo), docs de integrações futuras (Shopee, Mercado Livre, TikTok exigem credencial e API; fora do MVP).
- Dados: migrações `clientes`, `pedidos*`, `importacoes`, ramos da busca.
- Validar: unitário (resumo do pedido com o caso C1 do Anexo A; parser CSV por canal); integração (importar o mesmo arquivo duas vezes, realizar o recebível, importar uma terceira vez com valor diferente: deve existir um só lançamento, com realizado intacto e alerta `divergencia_repasse`; cancelar antes do repasse cancela o recebível; reembolso após repasse cria pagável); e2e: pedido do início ao envio.
- Concluída quando: os pedidos do último mês estão no sistema e o resultado por pedido confere com o extrato do marketplace.

### Fase 7: Financeiro (G)

- Desenvolver: contas, categorias (com flag `embutido_no_custo`), lançamentos (a pagar, a receber, transferência) com realizações parciais e estorno, recorrências com geração 3 meses à frente, anexos (bucket `comprovantes`), estados planejado/parcial/realizado/cancelado/estornado, vencidos derivados, geração automática e única de receita a receber quando o pedido entra no status com `gera_recebivel`, conciliação com extrato de repasse do canal, e de despesa a pagar ao confirmar compra ou manutenção, parâmetros tributários editáveis com aviso, provisão mensal, painel financeiro (realizado x projetado, saldo atual e projetado, categorias, fixas x variáveis, vencidos, próximos 7 e 30 dias, comparação de meses), exportação CSV e XLSX, dashboard principal recebendo os indicadores financeiros.
- Dados: migrações `contas_financeiras`, `categorias_financeiras`, `centros_custo`, `lancamentos`, `recorrencias`, `parametros_tributarios`, `provisoes_imposto`, funções `gerar_lancamento_de_pedido`, `gerar_recorrencias`, `provisionar_imposto`, ramo da busca.
- Validar: unitário (máquina de estados completa, inclusive `parcial` não cancelável e estorno com contra-lançamento; projeção de caixa com invariante caixa + projetado constante ao realizar; provisão única por competência recalculada enquanto planejada; recorrência mensal em mês de 31 e 28 dias; DRE exclui estornos e categorias `embutido_no_custo`); integração (marcar pedido pago duas vezes gera um lançamento; cancelar pedido cancela o lançamento; realizar parcialmente e depois o restante); e2e: fluxo do mês fechado com saldo conferindo com extrato.
- Concluída quando: o saldo projetado do mês seguinte bate com a conta real dentro da tolerância dos lançamentos não cadastrados.

### Fase 8: Planejamento de conteúdo e tarefas (M)

- Desenvolver: itens (tarefa, conteúdo, projeto) com propriedades da seção 13 do pedido, calendário mensal e semanal, quadro, lista por prazo e atrasadas, tabela de conteúdo, campanhas, modelos editáveis, recorrência, duplicação, criação rápida, checklist, relações, alertas de prazo, histórico, ligação com produto; dashboard mostra próximas tarefas e publicações.
- Dados: migrações `plan_*`, ramo da busca; seed dos fluxos padrão.
- Validar: unitário (grade do calendário, recorrência, ordenação, filtros sem acento); e2e: criar modelo, gerar recorrente, mover no quadro, concluir checklist; responsivo do calendário (lista de dias no celular).
- Concluída quando: o mês corrente de conteúdo está planejado nele e a skill `/carrossel` consegue ler o item (via MCP `plan_obter`, adicionado nesta fase).

### Fase 9: Relatórios, alertas, importações e exportações (M)

- Desenvolver: relatórios (rentabilidade por produto, canal, período e pedido; custo real x estimado; desempenho de impressoras; consumo de filamento por mês), central de alertas com resolução e silêncio, geração diária de alertas (pg_cron ou rota agendada), tela de auditoria com filtros, exportações gerais, comparação de períodos no dashboard, importação de perfil de fatiador avaliada (ler peso e tempo de 3MF/G-code exportado, sem API) como item opcional.
- Dados: views de relatório, agendamento.
- Validar: relatório confere com soma manual de um mês; alertas não duplicam; exportação reabre no Excel com acentos.

### Fase 10: Validação e preparação para uso (M)

- Desenvolver: revisão de interface completa (densidade, estados vazios, erros, carregamento), acessibilidade (foco, contraste, teclado), auditoria de segurança com a skill `/auditoria-seguranca`, hospedagem escolhida e domínio, variáveis em produção, MFA do dono, rotina de backup (GitHub Action semanal com `pg_dump` cifrado, retenção 90 dias) com restauração testada num projeto de teste, docs de implantação e de backups, tema claro revisado, limpeza de dados de demonstração (toda semente de demonstração é marcada `demo = true` e removida aqui), atualização final do `CLAUDE.md` raiz e da memória.
- Concluída quando: os critérios globais da seção 14 estão todos marcados.

### Dependências

1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10. A Fase 8 depende só da 1 e da 2 e pode ser antecipada se o planejamento de conteúdo virar urgência; a 9 depende de 5, 6 e 7.

---

## 11. Segurança e dados

- Autenticação: Supabase Auth e-mail e senha, sessão em cookie via `@supabase/ssr`, MFA TOTP recomendado para `dono`. E-mails de auth pelo SMTP padrão do Supabase (limite por hora suficiente para até 3 usuários).
- Autorização: papéis `dono`, `operador`, `leitura` em `usuarios_app`; RLS em todas as tabelas com função `papel_atual()`; server actions chamam `exigirPapel`; middleware protege rotas; rotas de exportação ficam sob o mesmo guarda.
- Endpoints: só server actions, rotas de exportação e `/api/mcp`. Nenhuma rota recebe service role do cliente. `import 'server-only'` nos módulos de dados.
- Validação: zod em toda entrada (formulário, importação, MCP); parâmetros de busca sanitizados; consultas via cliente Supabase (sem SQL concatenado); funções SQL com `security invoker` e `search_path` fixo.
- Arquivos: buckets privados, URL assinada de 10 minutos, limite de tamanho e tipo por bucket, nome de arquivo normalizado, hash gravado.
- Segredos: `erp/.env.local` ignorado; `.env.example` só com nomes; variáveis de produção no painel do host; service role nunca em `NEXT_PUBLIC_*`; verificação no CI que falha se `SUPABASE_SERVICE_ROLE_KEY` aparecer em bundle de cliente.
- Logs: logger com redação de campos sensíveis (token, senha, documento); erro ao usuário sem stack.
- Integração: tokens com escopo, validade, revogação e limite de taxa; filtro de segredos no conteúdo gravado; auditoria com `origem = mcp`.
- Auditoria: trigger nas tabelas críticas; tela de consulta; retenção indefinida.
- Backup: Free não tem backup automático. Rotina semanal própria (seção 10, Fase 10) desde que houver dado financeiro real; recomendação de subir para Pro quando o sistema virar fonte de verdade (backup diário, sem pausa).
- Exclusão e histórico: soft delete em cadastros; proibição de apagar registro com movimentação; dados de cliente anonimizáveis; snapshots e movimentações nunca mudam.
- Abuso: limite de taxa no MCP; login com limite do Supabase; sem necessidade de WAF no MVP.
- Não é segurança: bloquear F12 ou console. Fora do plano.

---

## 12. Custos operacionais

| Serviço | Hoje | Atenção | Quando pagar |
|---|---|---|---|
| Supabase | Free: 500 MB banco, 1 GB storage, 5 GB egress, pausa após 7 dias sem uso, sem backup, 2 projetos ativos | STL/3MF e fotos esgotam 1 GB; pausa em férias; sem backup | Pro US$ 25/mês quando o financeiro real entrar ou o storage passar de 700 MB |
| Hospedagem | A decidir. Vercel Hobby proíbe uso comercial. Netlify Starter (gratuito) permite; Vercel Pro US$ 20/mês | O painel FX está na Vercel (`vercel.json`), então o usuário conhece a Vercel | Decisão na seção 13; arquitetura não depende do host |
| Domínio | Subdomínio do domínio da marca, se existir | Não há registro do domínio no repositório | |
| Claude Code | Já contratado | MCP e skills não têm custo adicional | |
| E-mail transacional | SMTP do Supabase | Se passar de poucos e-mails por hora, Resend (plano gratuito) | |
| CI e backup | GitHub Actions no plano gratuito do repositório privado (2.000 min/mês) | Backup semanal usa poucos minutos | |

Projeção realista: R$ 0 na construção (desenvolvimento local + Free), depois US$ 25 a 45 por mês quando for a fonte de verdade financeira.

---

## 13. Principais riscos e decisões pendentes

Hipóteses adotadas (podem ser trocadas na aprovação, sem retrabalho antes da Fase 1):

| # | Decisão | Hipótese adotada | Impacto se mudar |
|---|---|---|---|
| D1 | Onde o ERP mora | Pasta `erp/` neste repositório; migrações na raiz `supabase/migrations/` (regra já existente); um só repositório GitHub | Repositório separado exige duplicar skills, memória e `.mcp.json`; só vale se outra pessoa for desenvolver |
| D2 | Tema | Escuro padrão derivado da marca; claro disponível por tokens | Claro como padrão muda a leitura da marca em tela, não a arquitetura |
| D3 | Ordem das fases | Base de conhecimento na Fase 2 | Deixar para a Fase 6 (original) perde o registro das decisões durante a construção |
| D4 | Hospedagem | Decidir até a Fase 10; desenvolvimento local até lá | Vercel Pro (US$ 20) ou Netlify gratuito; Next.js roda nos dois |
| D5 | Usuários | Um `dono` no MVP; papéis preparados | Nenhum |
| D6 | Impostos | Nenhuma alíquota padrão; o sistema exibe "não configurado" até o usuário preencher com o contador | Nenhum |
| D7 | Taxas dos canais | Começam em branco; os 20 % + R$ 4 do FCS SPY são hipótese de teste, não configuração | Nenhum |
| D8 | Arquivos grandes | Supabase Storage para arquivos ativos; biblioteca grande fica no OneDrive referenciada por caminho e hash | Pro do Supabase se quiser tudo no storage |
| D9 | Banco de testes | Instalar Supabase CLI + Docker; se não for viável nesta máquina, segundo projeto Free como teste | Sem banco de teste, testes de integração rodam contra `fcs-os` com schema `teste` isolado (menos seguro) |

Riscos:

- Escopo: dez módulos para uma pessoa. Mitigação: cada fase entrega algo usável; a Fase 5 é a maior e pode ser dividida em 5a (produtos) e 5b (produção) na execução.
- Taxas e impostos errados contaminam toda a precificação. Mitigação: campos em branco com aviso, histórico de vigência, conferência com extrato real na Fase 6.
- Pausa do Supabase Free em período sem uso. Mitigação: alerta no dashboard quando o último acesso passar de 5 dias; Pro quando virar fonte de verdade.
- Captura de conhecimento vira trabalho a mais e cai em desuso. Mitigação: skills curtas, lembrete no fim de tarefa (regra já usada no workspace), sugestão opcional via hook.
- `mcp-handler` 2.x exige `@modelcontextprotocol/server` ^2.0, zod ^4.2 e Node 20+ (confirmado no README em 11/10/2026); roda sem Redis e sem sessão (stateless), e a rota é montada diretamente em `app/api/mcp/route.ts`. A assinatura de `withMcpAuth` e o formato de `AuthInfo` ficam para conferir no doc de autorização na Fase 2. Alternativa se houver incompatibilidade com o Next 16: montar o transporte Streamable HTTP do SDK diretamente na rota.
- Idempotência de importação depende do código externo existir no CSV de cada canal. Mitigação: mapeamento por canal validado com arquivo real antes de liberar.

---

## 14. Critérios globais de aceitação

O sistema está pronto para uso quando:

1. Login, papéis e RLS funcionam: usuário `leitura` não consegue escrever por tela nem por MCP (teste automatizado).
2. Um rolo cadastrado com preço, frete e desconto mostra custo por grama documentado, e uma compra posterior com preço diferente atualiza o custo médio e o último custo conforme os testes.
3. A calculadora reproduz a tabela de casos de `formulas-de-custo.md`, recusa configuração inviável com explicação e diferencia markup de margem.
4. Alterar o custo de um insumo marca os produtos afetados e lista os que ficaram abaixo da margem alvo, sem alterar cálculos salvos anteriores.
5. Concluir uma ordem de produção gera movimentações, custo realizado e entrada de peça pronta numa única transação; estoque nunca fica negativo sem override registrado.
6. Um pedido pago gera exatamente um lançamento a receber; reimportar o mesmo arquivo não duplica nada; cancelar reverte.
7. O painel financeiro separa planejado, parcial e realizado; a projeção não conta duas vezes o que foi realizado; a DRE gerencial não soma a compra de filamento junto com o custo realizado das ordens.
8. Busca global (Ctrl+K) devolve, para "PLA preto", o insumo, os lotes, os produtos que o usam, as compras e os conhecimentos, agrupados por tipo e respeitando permissões.
9. Do Claude Code: `/kb-buscar` encontra, `/kb-salvar` grava com origem e referência, conteúdo com chave de API é recusado, token revogado é rejeitado.
10. Planejamento: calendário, quadro e lista mostram os mesmos itens; recorrência e modelos funcionam; item ligado a produto abre o produto.
11. Dashboard usa só dados reais; qualquer semente de demonstração está marcada e é removida na Fase 10.
12. Layout utilizável em 1440, 1024 e 390 px nos fluxos principais; foco visível; contraste AA.
13. Exportações CSV e XLSX reabrem corretamente com acentos e sem fórmulas injetadas.
14. CI verde (tipos, lint, unitário, integração, e2e), backup semanal rodando e restauração testada, `CLAUDE.md` do ERP e docs atualizados, nenhum segredo versionado.

---

## Verificação deste plano antes de executar

Ao aprovar, a primeira sessão da Fase 1 começa por: criar `erp/` com `create-next-app`, instalar dependências, confirmar versões (Next 16, mcp-handler, SDK MCP), rodar `npm run build` vazio, criar a migração 0001 e aplicá-la ao `fcs-os` pela Management API, gerar tipos, e só então desenhar o layout. Cada passo seguinte segue o plano de fase correspondente, com um plano de tarefas detalhado por fase escrito antes de codar (skill `writing-plans`), revisado contra este documento.

---

## Anexo A: casos de teste de referência (validados de forma independente em 11/10/2026)

Convenções: ponto decimal, percentuais como fração, intermediários a 4 casas, finais a 2. Todos os valores são hipóteses de teste, não taxas reais.

Parâmetros comuns da impressora e da operação: aquisição 4500.00, residual 500.00, vida 8000 h, 120 W, manutenção 400.00/ano, consumíveis 200.00/ano, 2000 h/ano, tarifa 0.95/kWh, mão de obra 30.00/h, filamento 0.125000/g. Derivados: depreciação 0.5000/h, manutenção 0.2000/h, consumíveis 0.1000/h, energia 0.1140/h.

### A1. Peça simples (f 0, w 0, fixos desligados)

Entradas: 40 g, 120 min, 1 peça por ciclo, preparo 5 min, acabamento 4 min, embalagem 3 min, complementares 0.30 + 0.10. Canal: comissão 0.14, pagamento 0.02, imposto 0.06, taxa fixa 4.00. Margem alvo 0.25.

| Grandeza | Esperado |
|---|---|
| material / depreciação / manutenção / consumíveis / energia | 5.0000 / 1.0000 / 0.4000 / 0.2000 / 0.2280 |
| preparo / acabamento / embalagem / complementares | 2.5000 / 2.0000 / 1.5000 / 0.4000 |
| C (variável, sem fixo) | 13.2280 |
| t / F | 0.22 / 4.00 |
| preço de equilíbrio (17.2280 / 0.78) | 22.09 |
| preço por margem 25 % (17.2280 / 0.53) | 32.51 |
| taxas no preço / margem de contribuição / margem | 11.1522 / 8.1298 / 25.01 % |

### A2. Mesa de 6 peças (f 0.10, w 0.05, fixos por hora)

Entradas: 25 g por peça, 300 min por ciclo, 6 peças, preparo 10 min por ciclo, acabamento 3 min, embalagem 2 min, complementares 0.50 + 2 × 0.15, fixo 300.00/mês em 150 h. Canal: comissão 0.17, imposto 0.06, ads 0.03, taxa fixa 6.75. Margem alvo 0.20.

| Grandeza | Esperado |
|---|---|
| peças boas por tentativa / gramas por peça boa / horas por peça boa | 5.4000 / 29.1667 / 0.9259 |
| material / depreciação / manutenção / consumíveis / energia | 3.6458 / 0.4630 / 0.1852 / 0.0926 / 0.1056 |
| preparo / acabamento / embalagem / complementares | 0.9259 / 1.5000 / 1.0000 / 0.8000 |
| C variável / fixo rateado / C total | 8.7181 / 1.8519 / 10.5699 |
| t / F | 0.26 / 6.75 |
| preço de equilíbrio (17.3199 / 0.74) | 23.41 |
| preço por margem 20 % (17.3199 / 0.54 = 32.0739, para cima) | 32.08 |
| margem de contribuição / resultado líquido / margem líquida | 8.2711 / 6.4193 / 20.01 % |
| controle: em 32.07 a margem seria 19.99 % (reprova) | |

### A3. Inviável

C 13.2280, F 4.00, comissão 0.20, pagamento 0.05, imposto 0.15, ads 0.10 (t 0.50), margem alvo 0.50: `viavel = false`, `soma_percentuais = 1.0000`, `margem_maxima_exclusiva = 0.5000`, preço por margem `null`, preço de equilíbrio 34.46. Com t = 1.05, equilíbrio também `null`.

### A4. Markup 50 % contra margem 50 % (entradas de A1)

| | Markup k 0.50 | Margem m 0.50 |
|---|---|---|
| preço | (13.2280 × 1.5 + 4) / 0.78 = 30.57 | 17.2280 / 0.28 = 61.53 |
| lucro | 6.6166 | 30.7654 |
| lucro / custo | 50.02 % | 232.58 % |
| lucro / preço | 21.64 % | 50.00 % |

### B1. Compra com rateio por valor

Desconto do pedido 15.00, frete 30.00, outros 6.00. Linha 1: 2 rolos PLA 1000 g a 95.00 (valor 190.00, parcela 0.633333). Linha 2: 1 rolo PETG 1000 g a 110.00 (valor 110.00, parcela 0.366667).

| Linha | desconto / frete / outros rateados | landed | por rolo | custo por g |
|---|---|---|---|---|
| 1 | 9.5000 / 19.0000 / 3.8000 | 203.3000 | 101.6500 | 0.101650 |
| 2 | 5.5000 / 11.0000 / 2.2000 | 117.7000 | 117.7000 | 0.117700 |

Controle: 321.0000 = 300 − 15 + 30 + 6. Resíduo: com frete 25.00, linha 2 recebe 9.1667 e linha 1 recebe 25.0000 − 9.1667 = 15.8333.

### B2. Entradas e consumo com lote dividido (PLA preto)

| Passo | L1 (g / valor) | L2 (g / valor) | total g / valor | média por g |
|---|---|---|---|---|
| entrada L1 1000 g, landed 101.6500 | 1000 / 101.6500 | | 1000 / 101.6500 | 0.101650 |
| entrada L2 1000 g, landed 128.3700 | 1000 / 101.6500 | 1000 / 128.3700 | 2000 / 230.0200 | 0.115010 |
| consumo 350 g de L1 (saída 35.5775) | 650 / 66.0725 | 1000 / 128.3700 | 1650 / 194.4425 | 0.117844 |
| consumo 700 g, L1 em uso tem 650 (saída 66.0725 + 6.4185) | 0 / 0.0000 | 950 / 121.9515 | 950 / 121.9515 | 0.128370 |

Controle negativo: valorar o primeiro consumo pela média (40.2535) reprova. O último passo gera alerta `lote_dividido`.

### C1. Resultado de um pedido (canal: comissão 0.14, pagamento 0.02, taxa fixa 4.00 por item, imposto 0.06)

Itens: 2 × 32.51 (custo variável estimado 13.2280) e 1 × 32.08 (custo variável estimado 8.7181). Cupom do vendedor 5.00. Frete subsidiado 3.00.

| Linha | Valor |
|---|---|
| receita bruta / base de vendas | 97.10 / 92.10 |
| comissão / pagamento / taxa fixa / total de taxas | 12.89 / 1.84 / 12.00 / 26.73 |
| valor a receber (recebível) | 62.37 |
| imposto estimado / receita líquida | 5.53 / 56.84 |
| custo estimado / resultado estimado / margem sobre base | 35.17 / 21.67 / 23.53 % |
| custo realizado (13.90, 13.90, 8.50) / resultado real | 36.30 / 20.54 |
