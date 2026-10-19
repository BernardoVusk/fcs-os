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

## Sorteio do panfleto (página pública `/sorteio`)

- `inscrever_sorteio` (0020, só service role): valida nome, e-mail, telefone (10 ou 11 dígitos sem o 55), canal (`canais_venda.tipo` ativo), produto ativo ou texto de "Outro" e consentimento obrigatório. Origem fora de panfleto, instagram ou outro vira outro.
- Reaproveita cliente não anonimizado achado por `lower(email)` e, se não houver, pelos dígitos do telefone (o mais antigo). Nunca sobrescreve e-mail ou telefone existentes, só preenche os nulos; acrescenta a linha "Cadastro pelo sorteio (QR do panfleto) em dd/mm/aaaa" em `observacoes`. Cliente novo nasce com `canal_origem_id` = canal escolhido.
- Mesmo cliente com inscrição do mesmo produto nas últimas 24 h devolve `repetida` sem gravar de novo. Mais de 20 inscrições do mesmo `ip_hash` em uma hora levanta `muitas_tentativas` (limite firme, no banco); a action ainda limita 10 envios por IP a cada 10 minutos por instância e descarta envios com o campo armadilha preenchido.
- `realizar_sorteio(referencia)` (só dono): um ganhador por mês, aleatório entre as inscrições do mês com `aceita_contato` e cliente não anonimizado; grava em `sorteios` (unique por mês, então clique duplo cai em `duplicado`); mês já sorteado levanta `sorteio_ja_realizado`, mês sem inscrição elegível `sem_inscricoes`.
- Prêmio, data e prazo de resposta estão no regulamento da página (`src/app/(publico)/sorteio/page.tsx`), não no banco.

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

## Grupos de Ofertas (Fases 11 a 19)

- Plataformas: Shopee, Mercado Livre, Amazon e Awin, identificadas só pelo host da URL (lista fixa por plataforma; Awin pelos domínios dos anunciantes sincronizados). Domínio parecido (`shopee.com.br.golpe.com`), http fora de link curto, IP literal, porta e credencial na URL são recusados.
- Nunca sai mensagem com link sem afiliação: conversão falhou e não há link colado = envio recusado com motivo. Link colado precisa ser https e do domínio da própria plataforma e fica marcado "colado, não verificado". Mercado Livre não tem API de links: o link vem sempre do portal.
- Atribuição por grupo pelos parâmetros oficiais: sub IDs na Shopee (`g<grupo>`, `c<campanha>`, `o<oferta>`), clickref na Awin (grupo, oferta, campanha) e ID de rastreamento por grupo na Amazon (tag). Nenhum redirecionador próprio de clique.
- Trava de conformidade por plataforma: sem o registro de que o canal WhatsApp está cadastrado ou confirmado no programa, a plataforma só gera rascunho. A Amazon nasce bloqueada.
- Dado de produto só de fonte autorizada (Open API da Shopee) ou digitado. Campo sem fonte fica nulo e aparece como "não informado"; preço anterior não é calculado a partir do desconto. Preço com mais de 24 horas é dado desatualizado; o modelo da Amazon exige data e hora junto do preço.
- Modelos: `{{variavel}}` e seções `{{#variavel}}...{{/variavel}}` que só aparecem com dado. Variável fora de seção sem valor bloqueia a publicação. Linha com marcação que fica vazia some. Limite de 4.096 caracteres por mensagem.
- Cupom vigente: ativo, já começou e não venceu. Sem data de fim a validade fica "não confirmada" e o cupom pode sair com aviso. Cupom só entra em oferta da mesma plataforma; vencido bloqueia a criação e a marcação de publicado, nos dois modos.
- Publicação: um envio por grupo (`unique` em publicação e grupo). Status da publicação é derivado dos envios: programado (aguardando com hora futura), parcial (parte enviada), incerto (resultado desconhecido, conferir no grupo) e os demais. Modo manual: o usuário publica e marca; marcar duas vezes não duplica.
- Números: só o dono cadastra, conecta e remove, com aceite de risco versionado (`ofe_numeros.aceite_risco_versao`). Limites por número (por hora, por dia, intervalo mínimo e janela de horário) são operacionais e não prometem evitar bloqueio. Não há rotação de números.
- Grupos sincronizados entram sem função; quem decide destino, teste ou monitorado é o usuário. Origem exige autorização registrada pelo dono (quem, quando, como).
- Métricas de grupo num período [início, fim): membros no início = última medição até o início (sem medição = "Sem dados"); saldo = entradas observadas menos saídas observadas; variação líquida = membros no fim menos membros no início; taxa de evasão = saídas no período ÷ membros no início × 100 (nula sem medição inicial, "não calculável" com início zero). Período que cruza lacuna de coleta (número ou worker fora do ar) ou começa antes do início da coleta é marcado como parcial. Visualizações: sempre "não disponível pela integração".
- LGPD: nenhum telefone ou identificador de participante é guardado, só contagens; QR e código de pareamento só para o dono e apagados ao conectar; sessão do WhatsApp cifrada e invisível pela sessão de qualquer usuário.
- Filas: cada item vira uma publicação por rodada (`unique (fila_item_id, rodada)`), criada pelo job `ofe-filas` a cada 5 minutos, só dentro da janela da fila, depois do início e com a publicação anterior fechada há pelo menos o intervalo da fila. Pausar, reordenar ou editar afeta só o que ainda não virou publicação. No fim da rodada a fila sem reinício diário encerra; com reinício, abre a próxima rodada no dia seguinte (data de São Paulo), no máximo uma por dia. Plataforma sem trava liberada ou cupom fora da vigência criam o envio já como ignorado, com motivo. Fila sem número é manual: o envio não publicado em `manual_expira_horas` (padrão 6) vira ignorado com motivo `nao_publicado_a_tempo`.
- Envio automático: o worker reserva um envio por vez por número, com número conectado e com aceite, grupo ativo, fila ativa, dentro da janela do número (horário de São Paulo), intervalo mínimo cumprido desde o último envio e abaixo dos limites por hora e por dia (envios incertos contam). A reserva dura 2 minutos. O início do despacho é gravado antes de mandar pelo socket: reserva vencida sem despacho volta a aguardar; com despacho iniciado vira incerto e nunca é reenviada sozinha. Erro antes do despacho tenta de novo em 1, 5 e 15 minutos; na terceira falha vira falhou e abre alerta. Tentar de novo e descartar, em lote, ficam na aba Falhas e incertos da fila.
- Preparação: antes de reservar, o worker gera o link de afiliado por grupo, renderiza o modelo e grava texto e link no envio. Sem link de afiliado válido o envio vira falhou com motivo, nunca sai sem afiliação.
- Copiador: só lê grupo de origem com autorização registrada pelo dono (a automação não é salva sem ela). Só o número coletor processa a mensagem. Filtros (palavras obrigatórias e excluídas, plataformas, domínios bloqueados), limpeza (menções, convites de outros grupos, chamadas e links de terceiros) sem apagar linha com preço, validade ou condição; se a limpeza tirar uma dessas, a mensagem vai para revisão. O link do produto é sempre trocado pelo nosso (`{{link}}`). Mensagem sem link de plataforma permitida, ou só com domínio bloqueado, é ignorada; Mercado Livre e mais de um produto na mensagem vão para revisão manual; se a conversão falhar na preparação, o envio falha com motivo. Revisão manual nasce ligada. Oferta repetida (mesmo produto ou mesmo texto) dentro da janela de duplicidade (padrão 24 horas) é ignorada. Texto de origem é apagado em 30 dias (ficam hash e metadados).
- Cupons da Awin: sincronizados da Promotions API (região BR) a cada 6 horas pelo worker ou pelo botão; entram como fonte oficial, com validade confirmada só quando a API traz data de fim. Com a regra ligada, cupom novo com código entra no fim da fila escolhida. Cupom da Shopee, do Mercado Livre e da Amazon é sempre manual ou por CSV.
- Relatórios: envio do sistema, clique e conversão aparecem em colunas separadas e nunca se misturam. Clique e conversão vêm só de relatório da plataforma (API da Awin e da Shopee, CSV com mapeamento de colunas para qualquer uma), com origem e data da importação na tela; sem importação, a tela diz "não disponível". Atribuição ao grupo pelo sub ID `g<8 primeiros hex do id>` ou pela tag da Amazon do grupo; à oferta, pelo `o<8 hex>`. Mesmo arquivo duas vezes é recusado (hash); arquivo novo com pedido já importado atualiza situação e comissão.
- Retenção: tentativas de envio 180 dias; texto das mensagens de origem 30 dias; mensagens de prévia, ignoradas e descartadas 180 dias; histórico do pg_cron 7 dias. Envios, conversões e cliques ficam sem prazo de exclusão automática por enquanto.
