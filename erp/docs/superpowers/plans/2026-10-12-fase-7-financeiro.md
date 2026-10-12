# Fase 7 (Financeiro): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Contas, categorias (com `embutido_no_custo`), lançamentos a pagar e a receber com realizações parciais e estorno, recorrências geradas três meses à frente, recebível único por pedido pago e pagável por compra confirmada e manutenção, conciliação com o repasse do canal, parâmetros tributários e provisão mensal, painel financeiro com caixa realizado e projetado, exportação CSV.

**Architecture:** O lançamento é a unidade; `lancamentos_realizacoes` guarda cada pagamento ou recebimento (parcial ou total). Estado derivado por função: `planejado`, `parcial`, `realizado`, `cancelado`, `estornado`; `atrasado` é só leitura (data prevista passada e não realizado). Chave `(origem_tipo, origem_id, papel_origem)` única impede lançamento duplicado da mesma venda, compra ou competência; `garantir_recebivel(pedido)` é idempotente e nunca sobrescreve valor já realizado. A máquina de estados (`dominio/financeiro/estados.ts`), a projeção de caixa (`projecao.ts`) e a DRE gerencial (`dre.ts`) são puras e testadas com os invariantes da spec (caixa + projetado constante ao realizar; DRE exclui estornos e categorias embutidas no custo). As funções SQL `realizar_lancamento`, `cancelar_lancamento`, `estornar_lancamento`, `garantir_recebivel`, `gerar_recorrencias` e `provisionar_imposto` fazem as escritas multi-tabela.

**Tech Stack:** o da Fase 6. Exportação CSV sem dependência; XLSX fica para a Fase 9 (relatórios) com uma biblioteca.

Spec: seções 5.7, 7.7 (projeção), 10 (Fase 7) e critério 7 da seção 14.

## Regras fixadas

- Recebível nasce uma só vez quando o pedido entra no status `gera_recebivel`; valor previsto = valor a receber do resumo; data prevista = data do pedido mais prazo de entrega estimado mais dias de repasse do canal (quando faltam dados, data prevista = data do pagamento mais dias de repasse; sem dias de repasse, mesma data e aviso). Reimportar atualiza o previsto só enquanto `planejado`; divergência acima de R$ 0,05 entre previsto e realizado gera alerta `divergencia_repasse`.
- Pagável por compra confirmada (valor = custo de aquisição total, categoria "Insumos", `embutido_no_custo`) e por manutenção com custo; sem duplicar pela chave de origem.
- `parcial` não pode ser cancelado; `realizado` só muda por estorno (contra-lançamento com `estorna_id`). Transferência é par que soma zero e fica fora da DRE.
- Recorrência materializa `planejado` por competência (único por recorrência e competência) para os próximos 3 meses; alterar o modelo só afeta os ainda não realizados.
- Parâmetros tributários sem valor padrão; provisão mensal única por competência, recalculada enquanto planejada, realizada com o valor real da guia.
- Painel: caixa realizado por conta, projetado por data, vencidos, próximos 7 e 30 dias, categorias fixas e variáveis, comparação de meses; DRE gerencial exclui estornos e `embutido_no_custo`.

## Tarefas

1. Migração `0015_financeiro.sql`: `contas_financeiras`, `categorias_financeiras` (seed: Vendas, Insumos [embutido], Energia [embutido], Manutenção [embutido], Impostos, Taxas de canal, Frete, Marketing, Software, Pró-labore, Outras receitas, Outras despesas), `centros_custo`, `recorrencias`, `lancamentos`, `lancamentos_realizacoes`, `parametros_tributarios`, `provisoes_imposto`, funções, view `lancamentos_situacao`, ramo da busca (lançamento). Gancho em `mudar_status_pedido` (chama `garantir_recebivel`) e em `confirmar_compra` (pagável) por nova versão das funções.
2. Domínio: `dominio/financeiro/{estados,projecao,dre,recorrencia}.ts` com testes (máquina de estados completa, invariante caixa + projetado, DRE, recorrência mensal em mês de 31 e 28 dias, provisão por competência).
3. Dados e ações: contas, categorias, lançamentos (criar, realizar parcial e total, cancelar, estornar, anexar comprovante no bucket `comprovantes`), recorrências (CRUD e gerar), parâmetros tributários e provisão, conciliação de repasse (CSV do canal casado por código externo), exportação CSV.
4. Telas: `/financeiro` (painel), `/financeiro/lancamentos` (lista por situação e período, filtros, realizar, estornar), `/financeiro/contas`, `/financeiro/categorias`, `/financeiro/recorrencias`, `/financeiro/impostos`, `/financeiro/conciliar`. Dashboard: receita recebida, despesas pagas, a pagar e a receber. `FASE_ATUAL = 7`. Papel: só dono vê e escreve financeiro (já definido em `papeis.ts`).
5. Testes: unitários da tarefa 2; integração (pedido pago gera um só recebível e reimportar não duplica; realizar parcial e restante; parcial não cancela; estorno gera contra-lançamento; compra confirmada gera pagável; recorrência gera 3 meses; divergência de repasse abre alerta; operador não lê financeiro); e2e (lançamento a pagar criado, realizado e visto no painel).
6. Docs, decisão na base pelo MCP, commit.
