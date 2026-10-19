# Modelo de dados (Fases 1 a 9 e 11 a 18)

Convenções: `id uuid`, `criado_em`, `atualizado_em` (trigger `app.carimbar_atualizacao`), RLS em tudo, auditoria por trigger nas tabelas de cadastro. Percentuais como fração (`numeric(7,6)`), dinheiro `numeric(14,2)`.

| Tabela | Papel | Leitura | Escrita |
|---|---|---|---|
| `usuarios_app` | papel e situação de cada usuário do Auth | todo usuário ativo | dono |
| `auditoria` | antes, depois, usuário, origem de cada alteração | dono | trigger |
| `alertas` | alertas abertos e resolvidos, um aberto por (tipo, entidade); `silenciado_ate` esconde da lista; gerados por trigger (estoque) e por `gerar_alertas()` (prazo vencido, ordem atrasada, pedido parado, lançamento vencido, manutenção prevista), agendada no pg_cron às 9h | todo usuário ativo | dono e operador (insert e update) |
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
| `clientes` | nome, contato, documento, endereço jsonb, canal de origem; `anonimizado` após `anonimizar_cliente`; índices por `lower(email)` e `app.telefone_digitos(telefone)` (0020) | todo usuário ativo | dono e operador |
| `inscricoes_sorteio` | cadastro vindo da página pública `/sorteio`: cliente, produto (ou `produto_outro`), canal, `aceita_contato`, `origem` (panfleto, instagram, outro), `ip_hash`, `user_agent`, `referencia` AAAA-MM em São Paulo | todo usuário ativo | ninguém pela API: só `inscrever_sorteio` (service role) |
| `sorteios` | um por `referencia` (unique): inscrição ganhadora, `sorteado_em`, `sorteado_por` | todo usuário ativo | dono (insert por `realizar_sorteio`) |
| `inscricoes_sorteio_meses` (view) | `referencia` e total, para o filtro da tela | todo usuário ativo | view |
| `pedidos_status` | lista editável com flags: `padrao` (inicial), `gera_recebivel` (marca pago e congela custo), `baixa_estoque` (expedição), `fechado`; índices parciais garantem um só de cada | todo usuário ativo | dono |
| `pedidos` | código PED-00001, canal, código externo (único por canal), cliente, status, datas, descontos do vendedor, fretes, taxas do canal no pedido (pct) e taxas informadas pelo canal (R$), `status_pagamento`, origem, `resumo` jsonb (cache do resumo financeiro) | todo usuário ativo | dono e operador |
| `pedidos_itens` | produto ou título avulso, quantidade, preço, desconto, `custo_unitario_estimado` (congelado ao pagar), `custo_unitario_realizado` (na expedição) | idem | dono e operador |
| `pedidos_eventos` | linha do tempo de status com origem (manual, importacao, sistema) e nota | idem | insert por dono e operador |
| `importacoes` | arquivo importado por hash SHA-256 (único), totais e avisos | idem | insert por dono e operador |
| `contas_financeiras` | banco, carteira, saldo no marketplace (ligada ao canal: recebíveis desse canal caem nela) ou cartão; saldo inicial e data; view `contas_saldos` = inicial mais realizações | dono | dono |
| `categorias_financeiras` | receita ou despesa, natureza fixa ou variável, `embutido_no_custo` (Insumos, Energia e Manutenção de impressora ficam fora da DRE); 14 categorias de seed | dono | dono |
| `centros_custo` | opcional, pode ficar vazio | dono | dono |
| `recorrencias` | modelo do que se repete: tipo, categoria, conta, valor, frequência (semanal, mensal, anual), dia, início e fim; nunca é somado, só os lançamentos gerados | dono | dono |
| `lancamentos` | receita, despesa ou transferência: previsto, competência, data prevista, conta e conta de destino, marcas de cancelado, encerrado e estornado (com motivo), `estorna_id`, origem (pedido, reembolso_pedido, compra, manutencao, imposto, recorrencia, manual, estorno) com `origem_id` e `papel_origem`; únicos por (origem, id, papel) e por (recorrência, competência); anexo no bucket privado `comprovantes` | dono | insert e update por dono, nunca delete |
| `lancamentos_realizacoes` | cada pagamento ou recebimento, parcial ou total: valor, data, conta, observação | dono | insert por dono, nunca update ou delete |
| `lancamentos_situacao` (view) | lançamento com `valor_realizado`, `saldo_restante`, `estado` (planejado, parcial, realizado, cancelado, estornado), `atrasado` derivado, nomes de categoria e conta | dono | |
| `parametros_tributarios` | regime (texto), alíquota efetiva, base (faturamento bruto ou receita líquida), dia de vencimento, vigência; sem seed: "Não configurado" até o dono preencher | dono | dono |
| `provisoes_imposto` | uma por competência: base, alíquota, valor e o pagável gerado | dono | dono |
| `plan_fluxos` | status por tipo de item (tarefa, conteúdo, projeto): código, nome, ordem, `fechado`, `padrao` (um por tipo); seed com os fluxos iniciais | todo usuário ativo | dono |
| `plan_campanhas` | nome, início, fim, objetivo, situação (planejada, ativa, concluída, cancelada) | todo usuário ativo | dono e operador |
| `plan_modelos` | molde de item: tipo, `campos_padrao` jsonb (título, prioridade, canal, formato, briefing, cta, legenda, tags, responsável) e `checklist_padrao` jsonb | todo usuário ativo | dono e operador |
| `plan_recorrencias` | modelo mais frequência (semanal, mensal, anual), dia, início e fim; gera itens até 60 dias à frente | todo usuário ativo | dono e operador |
| `plan_itens` | tarefa, conteúdo ou projeto: título, status (validado contra `plan_fluxos` do tipo), prioridade, início, prazo, horário, categoria, tags, responsável, canal de publicação, formato, legenda, briefing, cta, `links` e `referencias` jsonb, `checklist` jsonb [{nome, feito}], produto, campanha, pai, modelo, recorrência, `concluido_em` e `publicado_em` (carimbados pelo trigger), `metricas` jsonb, origem; único por (recorrência, prazo) | todo usuário ativo | insert e update por dono e operador; delete só dono |
| `plan_relacoes` | bloqueia ou relacionada entre dois itens, não reflexiva, única por (de, para, tipo) | todo usuário ativo | dono e operador |
| `plan_historico` | mudanças de status, prazo, início, título, prioridade e campanha, com usuário, por trigger `security definer` | todo usuário ativo | trigger |
| `rel_vendas_itens` (view) | item de pedido pago: pedido, data de pagamento, canal, produto (ou título avulso), quantidade, receita (quantidade x preço menos desconto), custo estimado e realizado por unidade | todo usuário ativo | |
| `rel_pedidos_pagos` (view) | resumo de cada pedido pago (receita bruta, base de vendas, taxas, a receber, imposto estimado, receita líquida, custos e resultados) | todo usuário ativo | |
| `rel_ordens_concluidas` (view) | ordem concluída com produto, impressora, aprovadas, perdidas, tempos previsto e real, custo estimado e realizado | todo usuário ativo | |
| `rel_consumo_mensal` (view) | gramas e valor de consumo de produção de filamento por mês e insumo | todo usuário ativo | |
| `migracoes_aplicadas` | controle do `migrar.mjs` | ninguém via API | script |
| `conhecimentos` | título, resumo, conteúdo (markdown), tipo, categoria, tags, módulo, origem, referência, confidencialidade, estrutura (decisão), validado, status, versão, `busca` (tsvector `app.pt`) | ativo: interno para todos, restrito só dono | dono e operador |
| `conhecimentos_versoes` | estado anterior a cada alteração, com autor, origem e motivo (`x-motivo`) | quem lê o registro | trigger |
| `conhecimentos_relacoes` | relacionado, substitui, deriva_de | todo usuário ativo | dono e operador |
| `conhecimentos_anexos` | arquivos no bucket privado `anexos-conhecimento` (10 MB) | quem lê o registro | dono e operador |

Funções: `app.normalizar(texto)`, `app.papel_atual()`, `app.eh_dono()`, `app.pode_escrever()`, `app.usuario_ativo()`, `app.origem_atual()`, `app.usuario_da_requisicao()` (sessão ou cabeçalho `x-usuario-id` pela service role), `app.motivo_atual()`, `app.auditar([coluna_chave])`, `app.versionar_conhecimento()`, `app.conhecimento_busca(...)`, `public.buscar_global(termo, tipos, limite)` com ramos canal, categoria, unidade, conhecimento, insumo, fornecedor, lote, compra, impressora, cálculo, produto (nome, SKU, código do anúncio), ordem, pedido (código, código externo, cliente), cliente, lançamento (descrição, só para o dono) e item do planejamento (tipo `tarefa` na busca, pelo título). Estoque: `app.recalcular_custos_insumo(insumo)`, `app.verificar_estoque_minimo(insumo)`, `public.confirmar_compra(compra)`, `public.movimentar_estoque(insumo, lote, tipo, quantidade, motivo, origem_tipo, origem_id, permitir_negativo, justificativa)` e `public.estornar_movimentacao(movimentacao, motivo)`; produção: `public.concluir_ordem_producao(ordem, aprovadas, perdidas, tempo real, minutos de mão de obra, consumos jsonb, custo hora mão de obra, complementares por peça, motivo, permitir negativo, justificativa)` e `public.reabrir_ordem_producao(ordem, motivo)`; vendas: `public.mudar_status_pedido(pedido, código do status, nota, origem)`, `public.devolver_pedido(pedido, nota)` e `public.anonimizar_cliente(cliente)`; financeiro: `public.realizar_lancamento(lançamento, valor, conta, data, observação, encerrar, motivo)`, `public.cancelar_lancamento(lançamento, motivo)`, `public.estornar_lancamento(lançamento, motivo)` e `public.garantir_recebivel(pedido)`. Todas `security invoker` (RLS vale) e atômicas, exceto `garantir_recebivel` e os gatilhos do financeiro (`pedidos_financeiro`, `mov_produto_reembolso`, `compras_financeiro`, `manutencoes_financeiro`), que são `security definer` porque operador muda status de pedido e confirma compra sem enxergar lançamentos. Segurança (0019): `garantir_recebivel` recusa chamada direta de usuário sem papel que escreve. Relatórios e alertas: `public.gerar_alertas()` (`security definer`, idempotente: abre, atualiza e resolve), job `alertas-diarios` em `cron.job` (0018). Planejamento: triggers `app.validar_item_plano` (status existe no fluxo do tipo, padrão quando vazio, carimbos de fechado) e `app.historico_item_plano`. Configuração de busca `app.pt` (português sem acento).

## Grupos de Ofertas (Fases 11 a 18, migrações 0021 a 0028)

Prefixo `ofe_`. "Escrita" = dono e operador (`app.pode_escrever()`); "worker" = papel Postgres `ofe_worker`, que entra pelo pooler com senha própria e só tem grant nas tabelas e funções do módulo. Auditoria por trigger só nas tabelas de cadastro (integrações sem o segredo, modelos, grupos, números, filas, automações, cupons).

| Tabela | Papel | Leitura | Escrita |
|---|---|---|---|
| `ofe_integracoes` | uma por plataforma (shopee, mercado_livre, amazon, awin): status (nao_configurada, aguardando_autorizacao, conectada, erro, credencial_expirada, indisponivel), `identificadores` públicos, `recursos`, `segredo_configurado_em`, `testado_em`, último erro, trava de conformidade (`conformidade_em`, `_por`, `_observacao`) | todo usuário ativo | update só dono; worker atualiza status, recursos e erro |
| `ofe_integracoes_segredos` | segredo cifrado (AES-256-GCM, `chave_id`), quem e quando salvou | ninguém pela sessão; worker lê | só `ofe_salvar_segredo` e `ofe_remover_segredo` (dono) |
| `ofe_modelos` | modelo de mensagem por tipo (oferta, cupom) e plataforma, `corpo` com variáveis, `padrao`, `ativo` | todo usuário ativo | escrita |
| `ofe_awin_anunciantes` | anunciantes com parceria: `advertiser_id`, nome, `dominios`, `deeplink_permitido`, `sincronizado_em` | todo usuário ativo | escrita |
| `ofe_grupos` | grupo de WhatsApp: função (origem, destino, monitorado, teste, nenhuma), cadastro (manual ou sincronizado), `jid` único, `link_convite` (só `chat.whatsapp.com`), `tag_amazon`, campanha, autorização de origem, número coletor, início da coleta, `so_admins` | todo usuário ativo | escrita; worker cria e atualiza os sincronizados |
| `ofe_cupons` | código, benefício, regras, mínimo, início e fim, `validade_confirmada`, status (ativo, pausado, expirado, removido), verificação (manual ou fonte oficial), fonte (manual, csv, awin); único por (plataforma, código, fim) | todo usuário ativo | escrita; worker só muda status |
| `ofe_cupons_regras` | linha única: enviar cupons da Awin sozinho e para qual fila | todo usuário ativo | update por escrita |
| `ofe_ofertas` | URL original e do produto, chave do produto, dados (título, imagem no Storage ou URL, preços, desconto, avaliação, loja), `fontes` por campo, `dados_atualizados_em`, link colado, cupom, modelo, CTA, campanha, status (rascunho, pronta, arquivada) | todo usuário ativo | escrita; worker atualiza só os campos de dado do produto |
| `ofe_links` | link de afiliado por oferta e grupo, origem (api, tag, colado); único por (oferta, grupo) | todo usuário ativo | escrita e worker |
| `ofe_publicacoes` | intenção de post: oferta ou cupom, origem (avulsa, fila, copiador), modo (manual, automatico), número, agendamento, texto editado, fila, item e rodada | todo usuário ativo | só por função (`ofe_criar_publicacao`, filas, copiador) |
| `ofe_envios` | publicação x grupo, único por (publicação, grupo): status (aguardando, processando, enviado, incerto, falhou, cancelado, ignorado), texto e link preparados, tentativas, próxima tentativa, reserva (`reservado_por`, `reservado_ate`), `despacho_iniciado_em`, id da mensagem, motivo; índice único de um em processamento por número | todo usuário ativo | só por função; worker reserva e conclui |
| `ofe_publicacoes_status` (view) | status derivado dos envios: rascunho, aguardando, programado, processando, enviado, parcial, ignorado, cancelado, falhou, incerto | idem | |
| `ofe_numeros` | número dedicado: rótulo, telefone, aceite de risco (quando, quem, versão), limites por hora (20) e por dia (120), intervalo mínimo (90 s), janela de horário | todo usuário ativo | dono |
| `ofe_numeros_estado` | status da sessão (desconectado, aguardando_qr, conectando, conectado, erro, removido), nome exibido, worker e trava, última atividade e sincronização, último erro | todo usuário ativo | worker |
| `ofe_sessoes` | estado de autenticação da Baileys, cifrado | ninguém pela sessão | worker |
| `ofe_qr` | QR ou código de pareamento com validade | dono | worker (apaga ao conectar) |
| `ofe_comandos` | pedido do ERP ao worker: conectar, parear, desconectar, remover, sincronizar_grupos, enviar_teste; status e resultado | escrita | só `ofe_enviar_comando`; worker conclui |
| `ofe_numeros_eventos` | conectado, desconectado e afins, com detalhe | todo usuário ativo | worker |
| `ofe_worker_estado` | batimento de cada worker (versão, início, último batimento) | todo usuário ativo | worker |
| `ofe_grupos_numeros` | quais números participam de cada grupo e se são admin | todo usuário ativo | worker |
| `ofe_grupos_medicoes` | contagem de membros com data e origem (sincronizacao, evento) | todo usuário ativo | worker |
| `ofe_grupos_eventos` | entradas e saídas observadas, só quantidade, sem telefone | todo usuário ativo | worker (só o número coletor) |
| `ofe_coleta_lacunas` | períodos sem coleta por número, com motivo | todo usuário ativo | worker |
| `ofe_grupos_resumo` (view) | grupo com a última medição de membros (`membros_atual`, `membros_medido_em`) | idem | |
| `ofe_filas` | fila: número, modelo, intervalo (900 s), janela, início, reinício diário, horas para expirar o manual (6), rodada e data da rodada, status (rascunho, ativa, pausada, encerrada) | todo usuário ativo | escrita |
| `ofe_filas_destinos` | grupos de destino da fila | todo usuário ativo | escrita |
| `ofe_filas_itens` | oferta ou cupom, posição, texto editado, ativo | todo usuário ativo | escrita |
| `ofe_envios_tentativas` | cada tentativa: worker, início e fim, resultado (enviado, erro_antes, incerto, falha_definitiva, reserva_vencida), erro; apagadas em 180 dias | todo usuário ativo | worker |
| `ofe_automacoes` | copiador: grupo de origem (precisa estar autorizado, trigger `app.ofe_checar_origem`), número, plataformas, filtros, limpeza, revisão manual (ligada), janela de duplicidade (24 h), intervalo (300 s), status (rascunho, ativa, pausada, encerrada, erro) | todo usuário ativo | escrita; worker lê |
| `ofe_automacoes_destinos` | grupos de destino da automação | todo usuário ativo | escrita |
| `ofe_mensagens_origem` | mensagem lida na origem: texto e texto processado (apagados em 30 dias), hash, chave do produto, plataforma, link original, status (previa, recebida, ignorada, aguardando_revisao, publicada, descartada, falhou), motivo, oferta e publicação geradas; única por (automação, grupo, id da mensagem); prévia, ignorada e descartada somem em 180 dias | escrita | worker; aprovar e descartar por função |
| `ofe_importacoes` | relatório importado: plataforma, origem (api, csv), tipo (conversoes, cliques), hash único do arquivo, período, linhas, novas | todo usuário ativo | só por função |
| `ofe_conversoes` | conversão da plataforma: referência externa (única por plataforma), data, status, venda, comissão, moeda, códigos (sub ID, clickref, tag), grupo e oferta atribuídos | todo usuário ativo | só `ofe_registrar_conversoes` |
| `ofe_cliques_importados` | cliques por dia e código, com grupo atribuído | todo usuário ativo | só `ofe_registrar_cliques` |

Funções do módulo: `app.ofe_cupom_vigente(cupom)`, `app.ofe_alertas_devidos()`, `app.ofe_grupo_do_codigo(códigos)` e `app.ofe_oferta_do_codigo(códigos)`. Pela sessão (`security definer`, conferem o papel por dentro): `ofe_salvar_segredo`, `ofe_remover_segredo`, `ofe_criar_publicacao`, `ofe_marcar_publicado`, `ofe_pular_envio`, `ofe_cancelar_publicacao`, `ofe_enviar_comando` (conectar e remover só dono), `ofe_vincular_grupo`, `ofe_reenviar`, `ofe_descartar_envios`, `ofe_preparar_envio`, `ofe_enfileirar_mensagem`, `ofe_descartar_mensagem`, `ofe_registrar_cupons_awin`, `ofe_registrar_conversoes`, `ofe_registrar_cliques`, `ofe_avancar_filas`, `ofe_gerar_alertas` e `ofe_rotina_diaria` (só dono). Relatórios (`security invoker`): `ofe_relatorio_envios`, `ofe_relatorio_conversoes`, `ofe_relatorio_cliques`. Só do worker (`security invoker`, sem execução pela sessão): `ofe_w_batimento`, `ofe_w_assumir_numero`, `ofe_w_liberar_numero`, `ofe_w_proximo_comando`, `ofe_w_concluir_comando`, `ofe_w_estado`, `ofe_w_lacuna_desde`, `ofe_w_evento_numero`, `ofe_w_qr`, `ofe_w_sincronizar_grupos`, `ofe_w_evento_grupo`, `ofe_w_apagar_sessao`, `ofe_w_para_preparar`, `ofe_w_atualizar_oferta`, `ofe_reservar_envio`, `ofe_marcar_despacho`, `ofe_concluir_envio`. `app.origem_atual()` devolve `worker` quando a conexão é do papel `ofe_worker`, e a auditoria registra essa origem.

Jobs no pg_cron: `ofe-alertas` (a cada 10 min), `ofe-filas` (a cada 5 min, `ofe_avancar_filas`), `ofe-rotina-diaria` (6h UTC: expira cupom vencido, apaga tentativas com mais de 180 dias, limpa texto de origem com mais de 30 dias) e `ofe-limpeza-cron` (6h30 UTC, histórico do próprio cron com mais de 7 dias).

Storage: bucket `ofertas-imagens` (5 MB, png, jpeg e webp). Público desde a 0025 para o worker baixar a imagem sem service role; listar o bucket continua exigindo login.
