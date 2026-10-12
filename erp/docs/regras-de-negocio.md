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

As regras de estoque, custos, pedidos e financeiro estão na spec (seções 5.3 a 5.7 e 7) e entram aqui quando forem implementadas.
