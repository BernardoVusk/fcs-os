# Modelo de dados (Fases 1 a 3)

Convenções: `id uuid`, `criado_em`, `atualizado_em` (trigger `app.carimbar_atualizacao`), RLS em tudo, auditoria por trigger nas tabelas de cadastro. Percentuais como fração (`numeric(7,6)`), dinheiro `numeric(14,2)`.

| Tabela | Papel | Leitura | Escrita |
|---|---|---|---|
| `usuarios_app` | papel e situação de cada usuário do Auth | todo usuário ativo | dono |
| `auditoria` | antes, depois, usuário, origem de cada alteração | dono | trigger |
| `alertas` | alertas abertos e resolvidos, um aberto por (tipo, entidade) | todo usuário ativo | dono e operador |
| `tokens_integracao` | tokens do MCP (hash, escopos, validade) | dono | dono |
| `canais_venda` | marketplaces e canais | todo usuário ativo | dono |
| `canais_venda_taxas` | taxas por vigência; nulo = não configurado | todo usuário ativo | dono |
| `canais_venda_vigentes` (view) | canal com as taxas vigentes hoje | idem | |
| `categorias` | por escopo (produto, insumo, financeiro, conhecimento, planejamento), com pai e cor | todo usuário ativo | dono e operador |
| `unidades` | código, nome, base e fator | todo usuário ativo | dono |
| `fornecedores` | nome, contato, site, prazo médio | todo usuário ativo | dono e operador |
| `insumos` | tipo, nome, código, unidade base, mínimo, `origem_custo` (media, ultima_entrada, manual), caches `custo_medio` e `ultimo_custo`, `atributos` jsonb (filamento: fabricante, material, cor, diâmetro, peso útil, carretel, temperaturas) | todo usuário ativo | dono e operador |
| `compras` | fornecedor, data, documento, frete, desconto do pedido, outros, `preco_inclui_frete`, `metodo_rateio`, status (rascunho, confirmada, cancelada) | todo usuário ativo | dono e operador |
| `compras_itens` | insumo, quantidade, unidade, preço, desconto do item, `peso_util_g`, código do lote; ao confirmar: `quantidade_base`, `rateio`, `custo_total`, `custo_unitario_final` | todo usuário ativo | dono e operador |
| `lotes_insumo` | um rolo é um lote: `quantidade_atual` e `valor_atual` são a verdade, `custo_unitario` é derivado; `divergente` quando ficou negativo com override | todo usuário ativo | insert e update por dono e operador, nunca delete |
| `movimentacoes_estoque` | razão imutável: tipo (entrada, consumo_producao, saida, ajuste, perda, devolucao, estorno), quantidade e valor com sinal, custo do momento, motivo, justificativa, origem | todo usuário ativo | insert por dono e operador, nunca update ou delete |
| `estoque_atual` (view) | por insumo: saldo, valor, saldo negativo, lotes com saldo, custos, `abaixo_minimo` | idem | |
| `migracoes_aplicadas` | controle do `migrar.mjs` | ninguém via API | script |
| `conhecimentos` | título, resumo, conteúdo (markdown), tipo, categoria, tags, módulo, origem, referência, confidencialidade, estrutura (decisão), validado, status, versão, `busca` (tsvector `app.pt`) | ativo: interno para todos, restrito só dono | dono e operador |
| `conhecimentos_versoes` | estado anterior a cada alteração, com autor, origem e motivo (`x-motivo`) | quem lê o registro | trigger |
| `conhecimentos_relacoes` | relacionado, substitui, deriva_de | todo usuário ativo | dono e operador |
| `conhecimentos_anexos` | arquivos no bucket privado `anexos-conhecimento` (10 MB) | quem lê o registro | dono e operador |

Funções: `app.normalizar(texto)`, `app.papel_atual()`, `app.eh_dono()`, `app.pode_escrever()`, `app.usuario_ativo()`, `app.origem_atual()`, `app.usuario_da_requisicao()` (sessão ou cabeçalho `x-usuario-id` pela service role), `app.motivo_atual()`, `app.auditar([coluna_chave])`, `app.versionar_conhecimento()`, `app.conhecimento_busca(...)`, `public.buscar_global(termo, tipos, limite)` com ramos canal, categoria, unidade, conhecimento, insumo, fornecedor, lote e compra. Estoque: `app.recalcular_custos_insumo(insumo)`, `app.verificar_estoque_minimo(insumo)`, `public.confirmar_compra(compra)`, `public.movimentar_estoque(insumo, lote, tipo, quantidade, motivo, origem_tipo, origem_id, permitir_negativo, justificativa)` e `public.estornar_movimentacao(movimentacao, motivo)`, todas `security invoker` (RLS vale) e atômicas. Configuração de busca `app.pt` (português sem acento).

As tabelas das fases seguintes estão na spec (`docs/superpowers/specs/2026-10-11-erp-fcs-design.md`, seção 5) e entram aqui conforme forem criadas.
