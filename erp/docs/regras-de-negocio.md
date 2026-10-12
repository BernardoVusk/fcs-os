# Regras de negócio

## Papéis

- `dono`: tudo.
- `operador`: lê tudo menos financeiro e usuários; escreve em conhecimento, estoque, catálogo, produção, vendas, planejamento e alertas.
- `leitura`: só lê, sem financeiro e sem usuários.
- Usuário do Auth sem linha ativa em `usuarios_app` não acessa nada.
- Ninguém altera o próprio papel nem desativa a própria conta pela tela.

## Canais e taxas

- Taxa é por vigência (`vigente_desde`). A vigente é a mais recente com data até hoje.
- Taxa em branco é "não configurado" e bloqueia o cálculo de preço daquele canal (Fase 4). Nunca há valor padrão.
- Percentuais são digitados em por cento ("14,5") e guardados como fração (0.145).

## Categorias e unidades

- Categoria é única por (escopo, nome); inativar em vez de apagar.
- Unidade tem base e fator (kg = 1000 g; h = 60 min). A base de uma base é nula.

## Auditoria

Toda alteração em cadastro gera linha em `auditoria` com origem (`web`, `mcp`, `script`, `importacao`). O dono consulta.

## Estoque (Fase 3)

- Saldo é sempre na unidade base do insumo; filamento é em gramas. Compra de filamento é em rolos com peso útil por rolo, e cada rolo vira um lote.
- Rascunho de compra não toca o estoque. Confirmar é atômico (`confirmar_compra`): desconto do pedido, frete e outros encargos são rateados entre as linhas por valor (padrão) ou por quantidade, parcelas a 4 casas, a linha de maior base absorve o resíduo. Custo de aquisição da linha = valor da linha menos descontos mais frete e outros rateados. "Preço já inclui frete" zera o rateio do frete. Impostos da nota não são separados.
- A verdade de cada lote é quantidade e valor; o custo unitário é derivado. Custo médio do insumo = soma dos valores dos lotes com saldo / soma das quantidades (6 casas). `ultimo_custo` é o custo unitário do último lote comprado. O motor de custos (Fase 4) usa `origem_custo` do insumo: média (padrão), última compra ou manual; sem saldo, cai na última compra.
- Saída é valorada ao custo do lote de onde saiu. Ao zerar o lote, a saída leva o valor restante, para o lote fechar em 0,0000. Se o lote informado não basta, o restante sai do lote mais antigo com saldo (PEPS) e abre alerta `lote_dividido`. Sem lote informado, sai do mais antigo.
- Estoque negativo é bloqueado. Única exceção: consumo de produção com `permitir_negativo`, lote informado e justificativa; o lote fica `divergente` e abre alerta `estoque_negativo` (crítico). Saída comum, perda, devolução e ajuste nunca aceitam.
- Ajuste tem sinal: positivo entra no lote informado ao custo do lote (ou cria lote `AJ-` ao custo médio); negativo sai como as demais saídas. Perda e ajuste negativo saem ao custo do lote e não entram em custo de ordem de produção.
- Alerta `estoque_baixo` abre quando saldo < mínimo (mínimo zero desliga) e resolve sozinho quando o saldo volta.
- Nada é apagado: erro se corrige com `estornar_movimentacao`, que cria a movimentação oposta no mesmo lote. Estorno de entrada só é aceito se o lote ainda tiver o saldo; estorno de estorno é recusado.

Casos de referência: Anexo A da spec (B1, B2), reproduzidos em `src/dominio/estoque/estoque.test.ts` e `testes/integracao/estoque.test.ts`.

## Custos e preço (Fase 4)

- Fórmulas e casos de referência: `docs/formulas-de-custo.md` (fonte única). O motor é puro (`src/dominio/custos`, `src/dominio/precos`) e versionado (`VERSAO_MOTOR`).
- Parâmetros globais são versionados: editar cria versão com `vigente_desde`; a vigente é a mais recente até hoje. Nascem nulos e a calculadora fica bloqueada até tarifa, mão de obra e método de fixo existirem. Imposto sem valor bloqueia só o preço por canal.
- Componentes podem ser desligados pelo dono; entram como zero nos próximos cálculos e o snapshot guarda a lista de desligados.
- Impressora só entra na calculadora com todos os campos de custo preenchidos. Canal só forma preço com comissão, pagamento, ads, taxa fixa e frete subsidiado preenchidos (zero é um valor; vazio não é).
- O custo do filamento vem de `custoDeReposicao` do insumo (média, última compra ou manual) ou de um valor por quilo digitado na hora; o snapshot guarda o custo por grama e a origem fica implícita no insumo escolhido.
- Salvar cálculo: o servidor recalcula a partir das entradas e grava entradas, resultado, versão do motor e dos parâmetros. Nada é alterado depois; o histórico compara o custo do filamento do snapshot com o atual e marca o que vale revisar. Recálculo em lote e alerta `margem_reduzida` por produto chegam na Fase 5, com BOM e preço por canal.

## Produtos (Fase 5)

- Variação herda da ficha tudo que deixar em branco; atributos se somam. BOM por peça entra no custo da peça (C); por pedido entra nos fixos por venda (F). O material de impressão vem da ficha (peso e filamento), não da BOM.
- Custo do produto = motor da Fase 4 com entradas montadas pela ficha (`montarEntradasProduto`): nada é assumido; cada dado ausente entra em "faltam" e bloqueia. Taxa de falha da ficha vence a padrão.
- Calcular grava snapshot em `calculos_custo` com `produto_id` e atualiza os caches da ficha. Mudança na ficha, na BOM ou compra confirmada de um insumo usado zera `custo_atualizado_em` (custo desatualizado, nunca apagado). Recalcular em lote grava snapshot só onde o custo mudou.
- Margem por canal = `avaliarPreco` no preço vigente com o custo exato atual; abaixo da margem alvo (do produto ou do parâmetro) abre alerta `margem_reduzida` por produto, resolvido sozinho quando volta.
- Preço por canal tem vigência; o vigente é o mais recente até hoje sem fim. Importação do catálogo cria produto em rascunho (nome sugerido do título) e anúncio por (canal, código externo); repetir o arquivo só atualiza métricas e registra preço novo se mudou. Peso, tempo e material nunca vêm da importação.
- Arquivos de fabricação ficam no bucket privado e abrem por URL assinada de 10 minutos; fotos no bucket público; arquivo grande pode ficar fora com caminho e hash.

## Produção (Fase 5)

- Ordem nasce de produto (ou variação) com quantidade, impressora e rolo em uso; tempo previsto = tempo do ciclo x ciclos; custo estimado = custo variável atual x quantidade (snapshot referenciado).
- Estados: fila, imprimindo, acabamento, concluida, cancelada. Concluir e reabrir são funções SQL atômicas; as demais transições são simples (`podeTransitar`).
- Concluir: cada linha de consumo sai do lote informado por `movimentar_estoque` (PEPS completa, override só com justificativa); custo realizado = material ao custo do lote + horas reais x (depreciação + manutenção + consumíveis) + energia + minutos x mão de obra + complementares por peça boa; só variável, fixo nunca entra. Peças perdidas são absorvidas pelas boas; sem peça boa, tudo é perda de produção e não há entrada de acabado. Horas de uso da impressora somam o tempo real.
- Peças prontas entram em `movimentacoes_produto` ao custo por peça boa; o estoque de peças é média móvel por produto e variação.
- Reabrir estorna cada movimentação de estoque e a entrada de peças (movimentações opostas), devolve as horas e volta para acabamento. Nada é apagado.

## Pedidos (Fase 6)

- Chave de idempotência: (canal, código externo). Reimportar o mesmo arquivo (hash) não faz nada; linha conhecida atualiza valores e só avança o status (nunca volta); pedido novo entra no status inicial com evento.
- Resumo financeiro (spec 7.7, caso C1): base das taxas = receita bruta menos descontos do vendedor (frete fora); base de vendas = base das taxas mais frete cobrado; taxas = comissão e pagamento arredondados a 2 casas mais taxa fixa por item; valor a receber = base de vendas menos taxas menos frete pago; imposto estimado é análise; custo estimado só quando todos os itens têm, idem realizado. Taxas informadas pelo canal prevalecem (origem `canal`).
- Mudança de status é função SQL: ao entrar no status que gera recebível, marca pago, grava a data e congela `custo_unitario_estimado` pelo custo variável atual do produto ou variação (com o cálculo que o gerou); ao entrar no status de expedição, exige peças prontas, baixa pela média móvel e grava `custo_unitario_realizado`. Cancelar depois do envio exige devolução, que devolve as peças pelo custo que saíram.
- O recebível e a conciliação com o repasse do canal nascem na Fase 7, ligados ao mesmo evento de pagamento aprovado.
- Cliente é opcional; anonimizar apaga nome, contato, documento e endereço e mantém o histórico.

## Financeiro (Fase 7)

- Lançamento nasce `planejado` com previsto e data. Realizar menos que o restante leva a `parcial`; realizar o restante, ou encerrar com diferença justificada, leva a `realizado`. `planejado` sem realização pode ser `cancelado` com motivo; `parcial` não pode ser cancelado (dinheiro já se moveu): encerra e estorna. `realizado` só muda por estorno, que cria contra-lançamento de direção oposta, realizado na hora nas mesmas contas, com `estorna_id`; o original fica `estornado`. Nada é apagado. Atrasado é derivado (data prevista antes de hoje e ainda aberto), nunca gravado.
- Caixa por conta = saldo inicial mais realizações (receita entra, despesa sai, transferência sai da origem e entra no destino). Projeção numa data = caixa de hoje mais `saldo_restante` dos lançamentos abertos com data até lá; atrasados contam no dia de hoje; transferências não entram no consolidado. Realizar move o valor da projeção para o caixa e a soma dos dois não muda.
- DRE gerencial soma só realizações do período, excluindo estornos (e o lançamento estornado), transferências e categorias `embutido_no_custo` (Insumos, Energia, Manutenção de impressora), porque esse dinheiro já chega ao resultado pelo custo realizado das ordens. O que ficou de fora é informado na tela.
- Recebível do pedido nasce num único evento, `status_pagamento = pago` (gatilho `pedidos_financeiro` chama `garantir_recebivel`), único por (origem `pedido`, pedido, papel `principal`). Valor = `valor_a_receber` do resumo; data = pagamento mais dias de repasse do canal (sem dias configurados, igual ao pagamento, com observação); conta = conta `saldo_marketplace` do canal, se houver; categoria Vendas. Resumo recalculado atualiza o previsto só enquanto nada foi realizado. Cancelar o pedido cancela o recebível planejado; devolução com repasse já recebido cria um pagável `reembolso_pedido` e não toca no recebível.
- Conciliação de repasses: CSV do canal (código do pedido, valor, data) casado por (canal, código externo). Realiza o recebível com o valor repassado; abaixo do previsto encerra com motivo; diferença acima de R$ 0,05 abre alerta `divergencia_repasse` e nunca ajusta o previsto. Arquivo repetido (hash) é recusado; recebível já realizado, estornado ou cancelado vira aviso.
- Compra confirmada gera um pagável (categoria Insumos, embutida no custo) pela soma do custo total dos itens; manutenção com custo gera pagável (Manutenção de impressora). Únicos por origem, criados por gatilho `security definer`.
- Recorrência é modelo: gerar materializa `planejado` para os próximos 3 meses, único por (recorrência, competência); dia 29 a 31 cai no último dia do mês curto; anual usa dia e mês do início; semanal a cada 7 dias. Alterar o modelo só afeta os ainda planejados; o modelo nunca é somado.
- Imposto: sem parâmetro tributário nada é estimado. Provisão é um pagável único por competência (origem `imposto`), base = soma de `base_vendas` ou de `receita_liquida` (conforme a base configurada) dos pedidos pagos na competência, vencimento no dia configurado do mês seguinte, recalculado enquanto planejado e realizado com o valor real da guia. O imposto estimado por pedido é só análise.
- Só o dono lê e escreve o financeiro (policies `app.eh_dono()`); operador e leitura não veem lançamentos, contas nem saldos, e a busca global não devolve lançamentos para eles. O painel inicial mostra os cartões financeiros só para o dono.

## Planejamento (Fase 8)

- Um só registro para tarefa, conteúdo e projeto (`plan_itens`), com os campos de conteúdo (canal, formato, briefing, cta, legenda, métricas) opcionais. Mês do item = mês do prazo, ou do início quando não há prazo; sem data fica no backlog e aparece na seção "Sem data" do calendário.
- Status é texto validado por trigger contra `plan_fluxos` do mesmo tipo; vazio recebe o padrão do tipo. Entrar num status `fechado` carimba `concluido_em` (e `publicado_em` quando o código é `publicado`); sair de um fechado limpa `concluido_em` e mantém `publicado_em`. Fluxos são editáveis só pelo dono: um padrão por tipo, status em uso não pode ser removido.
- Atrasado é derivado (prazo antes de hoje e status aberto), nunca gravado. Hoje, esta semana, próximos dias e sem data são filtros puros de `dominio/planejamento/filtros.ts`, os mesmos no calendário, no quadro, na lista e no painel inicial.
- Checklist nasce do modelo escolhido ou do padrão do formato (`CHECKLIST_PADRAO`); editar por texto preserva as etapas já feitas pelo nome. Progresso = feitas / total.
- Modelo preenche só o que ficou vazio na criação (prioridade, canal, formato, briefing, cta, legenda, responsável, tags) e dá o checklist. Recorrência aponta para um modelo e gera itens `planejado` (status padrão do tipo) até 60 dias à frente, únicos por (recorrência, prazo); dia 29 a 31 cai no último dia do mês curto.
- Duplicar copia conteúdo, checklist (tudo a fazer), relações de campanha, produto e pai; zera datas, status (padrão), métricas e carimbos. Apagar é só do dono e leva histórico e relações; o resto cancela pelo status.
- Relações `bloqueia` e `relacionada` entre itens, não reflexivas e únicas; item pai e filhos pelo `pai_id`. Histórico de status, prazo, início, título, prioridade e campanha por trigger, com o usuário da sessão.
- O quadro mostra os abertos de qualquer data (inclusive sem data) e os fechados só do mês escolhido. Mover é mudar status, com arrastar nativo ou seletor no cartão.
- MCP: `plan_listar` (mês, tipo, status, termo, abertos) e `plan_obter` (id, com briefing, checklist, links, produto, campanha, relações e a skill sugerida pelo formato), só leitura, escopo `operacao:ler`. A skill `/carrossel` do workspace lê o item planejado antes de criar a peça.

## Relatórios e alertas (Fase 9)

- Relatórios somam só o que aconteceu: pedido pago (pela data de pagamento), ordem concluída (pelo fim real) e consumo de produção (pela data da movimentação). Por produto: receita = quantidade x preço menos desconto do item; custo e resultado só quando todos os itens do produto têm o custo. Por canal: pelo `resumo` do pedido; taxa média = taxas / base de vendas. Custo real x estimado: só ordens com peça aprovada e os dois custos; desvio = real menos estimado. Impressoras: horas reais e previstas, falha real = perdidas / (aprovadas + perdidas). Consumo por mês: gramas e valor por insumo. Campo sem dado mostra "Sem dados", nunca zero.
- Painel inicial compara com o período anterior de mesma duração (mês contra mês anterior, 30 dias contra os 30 antes); sem base, não mostra variação.
- Exportação: CSV com BOM, ponto e vírgula e vírgula decimal; XLSX gerado sem biblioteca (zip sem compressão, inline strings). Célula que começa com `=`, `+`, `-`, `@`, tab ou retorno recebe apóstrofo e vai como texto nos dois formatos. "Tudo em XLSX" traz uma aba por relatório.
- Alertas: um aberto por (tipo, entidade). `gerar_alertas()` roda todo dia às 9h (pg_cron) e pelo botão Verificar agora: abre o que passou a valer, atualiza título e severidade do que mudou e resolve o que deixou de valer, para os tipos prazo vencido (planejamento), ordem atrasada, pedido pago sem envio há mais de 5 dias, lançamentos vencidos (um alerta agregado, sem valores, porque operador e leitura também veem alertas) e manutenção prevista (horas de uso acima da próxima manutenção). Alertas de estoque continuam por trigger. Resolver fecha; silenciar por 7 ou 30 dias esconde e, se a condição continuar, o alerta volta sozinho ao fim do silêncio. Leitura não gera, resolve nem silencia.
- Auditoria: só o dono consulta; filtros por tabela, ação, origem, período e id; os campos alterados são calculados comparando antes e depois (ignorando `atualizado_em`).

## Sessão e segurança (Fase 10)

- Verificação em duas etapas (TOTP) é opcional por usuário e recomendada para o dono. Com fator verificado, o login pede o código e nenhuma rota do painel abre em AAL1; actions recusam com `mfa_pendente`. Desativar exige o código atual; inscrições não confirmadas são descartadas ao começar outra.
- Função `security definer` chamável por rpc checa o papel por dentro (`gerar_alertas`, `garantir_recebivel`); gatilhos e pg_cron (sem `auth.uid()`) passam.
- Toda resposta leva `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` e HSTS. Parâmetro de data vindo da URL só entra no filtro se for `AAAA-MM-DD`.
- Backup semanal cifrado por GitHub Actions; restauração só no projeto de teste e com confirmação explícita.
- Upload de arquivo (produto e anexo do conhecimento) vai direto do navegador ao Storage por URL assinada, que só é emitida para quem escreve na área, com limite de tamanho e extensão por tipo; a action registra o metadado depois de confirmar que o objeto existe no bucket e que o caminho pertence ao registro.
