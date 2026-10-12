# Modelo de dados (Fases 1 a 6)

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
| `parametros_custo` | versões dos parâmetros globais do motor (`dados` jsonb: tarifa, mão de obra, falha e desperdício padrão, fixo e método de rateio, imposto estimado, metas); vigência por data; a view `parametros_custo_vigentes` devolve a vigente | todo usuário ativo | insert só dono; nunca update |
| `componentes_custo` | catálogo dos componentes do custo (grupo, método, `chave_motor`, ativo); desligado entra como zero nos próximos cálculos | todo usuário ativo | update só dono |
| `impressoras` | nome, fabricante, modelo, custo de aquisição, residual, vida útil, potência, manutenção e consumíveis por ano, horas produtivas, status; campos nulos = não configurado | todo usuário ativo | dono e operador |
| `calculos_custo` | snapshot imutável: `entradas`, `resultado`, versão do motor e dos parâmetros, custo variável e total, preço sugerido, método e metas, refs a insumo, impressora e canal (produto e ordem na Fase 5) | todo usuário ativo | insert por dono e operador; nunca update ou delete |
| `produtos` | ficha (peso, tempo, peças por ciclo, falha, tempos de mão de obra), filamento e impressora padrão, margem alvo, licença, `atributos`, caches `custo_atual`, `custo_variavel_atual`, `calculo_atual_id`, `custo_atualizado_em` (null = desatualizado), origem (manual, importacao) | todo usuário ativo | dono e operador |
| `produtos_variacoes` | sobrescreve campos da ficha (null = herda), SKU, atributos, caches próprios | idem | dono e operador |
| `produtos_materiais` | BOM: insumo, quantidade, unidade, papel (impressao, complementar, embalagem, acabamento), por (peca, pedido), opcionalmente por variação | idem | dono e operador |
| `produtos_precos_canal` | preço por canal com vigência; `margem_estimada_cache`; view `produtos_precos_vigentes` traz o vigente por (produto, variação, canal) | idem | dono e operador |
| `produtos_anuncios` | anúncio no canal, chave (canal, código externo) da importação do catálogo e dos pedidos (Fase 6), métricas coletadas | idem | dono e operador |
| `produtos_arquivos` | STL, 3MF, G-code, foto, documento: bucket `arquivos-produto` (privado, URL assinada) ou `fotos-produto` (público, só imagem) ou caminho externo; versão e SHA-256 | idem | dono e operador |
| `manutencoes` | por impressora: tipo, data, custo, descrição, horas no momento, próxima em horas | idem | dono e operador |
| `ordens_producao` | código OP-0001 (sequência), produto e variação, impressora, lote em uso, quantidades planejada, aprovada e perdida, estados (fila, imprimindo, acabamento, concluida, cancelada), tempos previsto e real, custo estimado e realizado (jsonb com a quebra) | idem | dono e operador |
| `ordens_consumo` | consumo real por insumo e lote de cada ordem concluída, com as movimentações geradas | idem | função |
| `movimentacoes_produto` | peças prontas: razão imutável por produto e variação (producao, venda, ajuste, perda, devolucao, estorno), valorado pela média móvel; view `estoque_produtos` | idem | insert por dono e operador, nunca update ou delete |
| `clientes` | nome, contato, documento, endereço jsonb, canal de origem; `anonimizado` após `anonimizar_cliente` | todo usuário ativo | dono e operador |
| `pedidos_status` | lista editável com flags: `padrao` (inicial), `gera_recebivel` (marca pago e congela custo), `baixa_estoque` (expedição), `fechado`; índices parciais garantem um só de cada | todo usuário ativo | dono |
| `pedidos` | código PED-00001, canal, código externo (único por canal), cliente, status, datas, descontos do vendedor, fretes, taxas do canal no pedido (pct) e taxas informadas pelo canal (R$), `status_pagamento`, origem, `resumo` jsonb (cache do resumo financeiro) | todo usuário ativo | dono e operador |
| `pedidos_itens` | produto ou título avulso, quantidade, preço, desconto, `custo_unitario_estimado` (congelado ao pagar), `custo_unitario_realizado` (na expedição) | idem | dono e operador |
| `pedidos_eventos` | linha do tempo de status com origem (manual, importacao, sistema) e nota | idem | insert por dono e operador |
| `importacoes` | arquivo importado por hash SHA-256 (único), totais e avisos | idem | insert por dono e operador |
| `migracoes_aplicadas` | controle do `migrar.mjs` | ninguém via API | script |
| `conhecimentos` | título, resumo, conteúdo (markdown), tipo, categoria, tags, módulo, origem, referência, confidencialidade, estrutura (decisão), validado, status, versão, `busca` (tsvector `app.pt`) | ativo: interno para todos, restrito só dono | dono e operador |
| `conhecimentos_versoes` | estado anterior a cada alteração, com autor, origem e motivo (`x-motivo`) | quem lê o registro | trigger |
| `conhecimentos_relacoes` | relacionado, substitui, deriva_de | todo usuário ativo | dono e operador |
| `conhecimentos_anexos` | arquivos no bucket privado `anexos-conhecimento` (10 MB) | quem lê o registro | dono e operador |

Funções: `app.normalizar(texto)`, `app.papel_atual()`, `app.eh_dono()`, `app.pode_escrever()`, `app.usuario_ativo()`, `app.origem_atual()`, `app.usuario_da_requisicao()` (sessão ou cabeçalho `x-usuario-id` pela service role), `app.motivo_atual()`, `app.auditar([coluna_chave])`, `app.versionar_conhecimento()`, `app.conhecimento_busca(...)`, `public.buscar_global(termo, tipos, limite)` com ramos canal, categoria, unidade, conhecimento, insumo, fornecedor, lote, compra, impressora, cálculo, produto (nome, SKU, código do anúncio), ordem, pedido (código, código externo, cliente) e cliente. Estoque: `app.recalcular_custos_insumo(insumo)`, `app.verificar_estoque_minimo(insumo)`, `public.confirmar_compra(compra)`, `public.movimentar_estoque(insumo, lote, tipo, quantidade, motivo, origem_tipo, origem_id, permitir_negativo, justificativa)` e `public.estornar_movimentacao(movimentacao, motivo)`; produção: `public.concluir_ordem_producao(ordem, aprovadas, perdidas, tempo real, minutos de mão de obra, consumos jsonb, custo hora mão de obra, complementares por peça, motivo, permitir negativo, justificativa)` e `public.reabrir_ordem_producao(ordem, motivo)`; vendas: `public.mudar_status_pedido(pedido, código do status, nota, origem)`, `public.devolver_pedido(pedido, nota)` e `public.anonimizar_cliente(cliente)`. Todas `security invoker` (RLS vale) e atômicas. Configuração de busca `app.pt` (português sem acento).

As tabelas das fases seguintes estão na spec (`docs/superpowers/specs/2026-10-11-erp-fcs-design.md`, seção 5) e entram aqui conforme forem criadas.
