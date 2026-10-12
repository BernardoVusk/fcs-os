# FCS 3D STUDIO — sistema operacional do negócio

Aqui ficam as regras de operação do sistema: como o Claude lê o contexto,
aprende com correções, mantém tudo atualizado e cria skills novas conforme
a operação evolui.

Esse arquivo é editável. Quando algo mudar na empresa, atualize aqui.

---

## O que é esse workspace

Operação da FCS 3D STUDIO, e-commerce de produtos feitos em impressão 3D.
Cada frente do negócio tem sua área: produto, marketplace, anúncios,
marketing e produção.

**Estrutura de pastas:**
- `_memoria/` — quem é a empresa, como falamos, foco atual
- `identidade/` — marca aplicada em tudo que o sistema gera (logo, cores, playbooks de design)
- `marketing/` — conteúdo, carrosséis, legendas, campanhas orgânicas
- `marketing/marketplace/relatorios/` — relatório semanal e auditorias dos canais
- `pesquisa/` — achados de tendência e candidatos a produto novo
- `dados/marketplace/` — capturas brutas das centrais de vendedor, uma pasta por data e canal
- `dados/catalogo/` — catálogo unificado dos três canais em CSV, um por coleta
- `saidas/` — documentos e peças pontuais
- `scripts/` — automações (geração de imagem, publicação em Instagram e Facebook)
- `templates/` — moldes de skills, perfis e identidade
- `mini-projetos/` — ferramentas internas pequenas, uma pasta por projeto, cada uma com `docs/` (estudo, spec, plano, checagem). Primeira: `fcs-spy/`, extensão de Chrome de estudo de mercado na Shopee
- `erp/` — FCS ERP, o sistema de gestão (Next.js + Supabase). Regras próprias em `erp/CLAUDE.md`; plano aprovado em `erp/docs/superpowers/specs/2026-10-11-erp-fcs-design.md`; migrações do banco ficam em `supabase/migrations/` na raiz. Fases 1 a 10 concluídas em 12/10/2026 (`erp/docs/validacao.md`); falta publicar: hospedagem a escolher (`erp/docs/implantacao.md`) e primeiro backup com restauração (`erp/docs/backups-e-recuperacao.md`)
- `saidas/seguranca/` — relatórios da skill `/auditoria-seguranca`

A ficha de produto vive no ERP (Fase 5), não em pasta.

## Sobre a empresa

FCS 3D STUDIO é um e-commerce de produtos impressos em 3D, vendidos em
marketplace e em catálogo sob demanda. O público é comprador online com
hobby: games, miniaturas, Fórmula 1, carros e automobilismo.

A operação é tocada por uma pessoa só, que cobre produto, marketplace,
anúncios, marketing e produção. Isso define uma regra prática: toda sugestão
precisa caber na agenda de uma pessoa. Nada de plano que exige time.

## Frentes de trabalho

- **Produto e catálogo:** garimpar modelos 3D, decidir o que entra, precificar, escrever a ficha
- **Marketplace:** acompanhar tendências, ajustar anúncios de produto, monitorar concorrência
- **Mídia paga:** campanhas, criativos, leitura semanal de métricas
- **Conteúdo:** carrosséis e legendas mostrando o produto, com foco no hobby do cliente
- **Produção:** impressão, acabamento, prazo de entrega

## O que mais fazemos aqui

- Pesquisa de tendência de marketplace e seleção de produtos 3D novos
- Análise de métricas dos anúncios
- Peças de conteúdo pro catálogo (carrossel, legenda, foto de produto)
- Descrição de produto pro marketplace

## Tom de voz

Direto e curto. Fala em "nosso" e "você", como quem explica o produto pra
alguém na loja. Informação concreta antes de adjetivo: material, tamanho,
prazo, o que vem na caixa.

Referência real: "Esse é o nosso portfólio de produtos sob demanda que você pode pedir."

**Evitar sempre:** emoji, travessão no texto, jargão de marketing
("alavancar", "sinergia", "vamos juntos"), promoção gritada ("imperdível",
"corra"), formalidade de "caro cliente".

Detalhe completo em `_memoria/preferencias.md`.

## Regras do sistema

- Toda peça visual respeita `identidade/design-guide.md`: fundo preto, destaque ciano, sem emoji, sem travessão
- Dado de marketplace entra em `dados/marketplace/<data>/<canal>/` antes de qualquer análise
- Achados de pesquisa de produto ficam em `pesquisa/`, um arquivo por rodada, com data no nome
- Peças de conteúdo vão pra `marketing/`
- Relatórios de marketplace vão pra `marketing/marketplace/relatorios/`
- Toda sugestão de rotina precisa caber numa operação de uma pessoa só
- **Nunca inventar número.** Painel que não abriu vira "não coletado" no relatório, nunca estimativa
- Regra de negócio do ERP só em `erp/src/dominio`; migração só em `supabase/migrations/`, aplicada em dev e teste com `npm run migrar` dentro de `erp/`

## Como os dados de marketplace são coletados

As três plataformas bloqueiam acesso automatizado de fora. Testado e confirmado em 21/08/2026: Shopee devolve página vazia e 403 nos endpoints de catálogo, Mercado Livre devolve 403 no site e exige token OAuth na API, TikTok Shop exige login.

O canal de coleta é o browser logado, via extensão Claude in Chrome. A skill `/marketplace` faz a leitura. Não tentar contornar com fetch nem curl, já foi testado e não funciona.

## Ferramentas conectadas

- [x] Shopee (loja fcs3dstudio, shop_id 1478228631)
- [x] Mercado Livre (FCS 3D STUDIO, nickname a capturar)
- [x] TikTok Shop (FCS 3D STUDIO)
- [x] Claude in Chrome (conectado em 27/09/2026 com `/chrome` na sessão do terminal; na extensão do VS Code as ferramentas do Chrome não aparecem, usar o terminal)
- [x] FCS SPY (extensão própria, `mini-projetos/fcs-spy/`, carregada sem compactação a partir de `extensao/dist`)
- [x] GitHub (repositório privado `BernardoVusk/fcs-os`, criado em 11/10/2026; salvar com `/salvar`)
- [x] Supabase (organização LABSFCS, plano gratuito; projeto `fcs-os`, ref `jdjbyxysxtnyhztypeai`, São Paulo sa-east-1, criado em 11/10/2026. O primeiro, em us-east-1, virou `fcs-os-antigo-eua` e está pausado, vazio). Acesso total autorizado pelo usuário: criar e alterar projetos, tabelas, funções e buckets sem pedir. Token e chaves no `.env` (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`); nunca copiar esses valores para arquivo versionado nem para a memória. Usar a Management API (`api.supabase.com/v1/projects/<ref>/database/query`) e guardar cada mudança de estrutura como migração em `supabase/migrations/`. Projeto de teste `fcs-os-teste` (sa-east-1) criado em 11/10/2026 para os testes de integração do ERP
- [x] FCS ERP via MCP (servidor `fcs-erp` em `.mcp.json`, aponta para `/api/mcp` do ERP; token criado em Configurações > Integrações e guardado nas variáveis `FCS_ERP_URL` e `FCS_ERP_MCP_TOKEN` do usuário, nunca em arquivo versionado; skills `/kb-buscar`, `/kb-salvar`, `/kb-decisao`, `/kb-procedimento`; detalhes em `erp/docs/integracao-claude-code.md`)
- [ ] Google Ads
- [ ] Meta Ads
- [ ] Instagram / Facebook (scripts em `scripts/`, precisa de `.env`)
- [ ] OpenAI (geração de imagem, precisa de `.env`)

*(Marcar conforme for configurando)*

---

## Contexto do negócio

No início de toda conversa, ler os seguintes arquivos:

1. `_memoria/empresa.md` — quem é o usuário, o que faz, como funciona o negócio
2. `_memoria/preferencias.md` — tom de voz, estilo de escrita, o que evitar
3. `_memoria/estrategia.md` — foco atual, prioridades, prazos

Usar essas informações como base pra qualquer resposta ou decisão. Ao
sugerir prioridades, formatos ou abordagens, considerar o foco atual
descrito em `estrategia.md`.

Pra qualquer tarefa visual (carrossel, post, landing page), consultar
`identidade/design-guide.md` como referência de estilo.

Não é necessário listar o que foi lido nem confirmar a leitura. Apenas
usar o contexto naturalmente.

---

## Fluxo de trabalho

Antes de executar qualquer tarefa, verificar se existe skill relevante
em `.claude/skills/`. Se encontrar, seguir as instruções da skill. Se
não encontrar, executar a tarefa normalmente.

Ao concluir uma tarefa que não tinha skill mas parece repetível (o
usuário provavelmente vai pedir de novo no futuro), perguntar:

> "Isso pode virar uma skill pra próxima vez. Quer que eu crie?"

Não perguntar pra tarefas pontuais ou perguntas simples. Só quando o
padrão de repetição for claro.

---

## Aprender com correções

Quando o usuário corrigir algo, melhorar uma resposta ou dar uma
instrução que parece permanente (frases como "na verdade é assim", "não
faça mais isso", "prefiro assim", "sempre que...", "evita...", "da
próxima vez..."), perguntar:

> "Quer que eu salve isso pra não precisar repetir?"

Se sim, identificar onde faz mais sentido salvar:

- **Sobre o negócio** (clientes, produtos, marketplace) → `_memoria/empresa.md`
- **Sobre preferências e estilo** (tom de voz, formato, o que evitar) → `_memoria/preferencias.md`
- **Sobre prioridades e foco** (metas, prazos, campanhas) → `_memoria/estrategia.md`
- **Regra de comportamento nessa pasta** → próprio `CLAUDE.md`

Salvar com uma linha nova clara, sem reformatar o arquivo inteiro.
Confirmar mostrando a linha adicionada.

Não perguntar se a correção for óbvia de contexto imediato (ex: "na
verdade o arquivo se chama X"). Só perguntar quando a informação tiver
valor duradouro.

---

## Manter contexto atualizado

Ao terminar uma tarefa que mudou algo relevante (produto novo no catálogo,
canal novo, skill nova, mudança de foco, ferramenta configurada, estrutura
alterada), perguntar:

> "Isso mudou algo no teu contexto. Quer que eu atualize a memória?"

Se sim, identificar o que atualizar:

- **Produto, canal, ferramenta, fornecedor** → `_memoria/empresa.md`
- **Mudança de prioridade ou foco** → `_memoria/estrategia.md`
- **Tom ou estilo** → `_memoria/preferencias.md`
- **Pasta, regra de organização, skill criada** → `CLAUDE.md`
- **Visual (cores, fontes, logo)** → `identidade/design-guide.md`

Mostrar o que vai mudar antes de salvar. Não reformatar o arquivo
inteiro, só adicionar ou editar a linha relevante.

**Quando NÃO perguntar:**
- Tarefas pontuais sem impacto no contexto (escrever uma legenda avulsa)
- Perguntas simples ou conversas sem ação
- Mudanças já salvas pelo bloco "Aprender com correções"

**Dica:** rode `/atualizar` pra uma varredura completa quando houver dúvida.

---

## Criação de skills

Quando o usuário pedir skill nova:

1. Verificar se existe template relevante em `templates/skills/`. Se
   existir, usar como base e adaptar pro contexto
2. Perguntar se é específica desse projeto ou útil em qualquer:
   - Específica → `.claude/skills/nome-da-skill/SKILL.md` (local)
   - Universal → `~/.claude/skills/nome-da-skill/SKILL.md` (global)
3. Ler `_memoria/empresa.md` e `_memoria/preferencias.md` pra calibrar
   o conteúdo da skill ao contexto do negócio
4. Se a skill precisar de arquivos de apoio (templates, exemplos),
   criar dentro da pasta da skill
5. Seguir o fluxo da skill-creator nativa do Claude Code
