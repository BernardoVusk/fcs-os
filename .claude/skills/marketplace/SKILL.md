---
name: marketplace
description: >
  Rotina semanal de marketplace da FCS 3D STUDIO. Lê as centrais de vendedor da Shopee,
  do Mercado Livre e do TikTok Shop pelo browser logado (extensão Claude in Chrome),
  consolida catálogo e métricas, compara com a semana anterior e devolve relatório com
  alertas e ações. Tem também o modo tendências, que varre as categorias de games,
  miniaturas, Fórmula 1 e carros e devolve candidatos a produto novo.
  Use quando o usuário pedir "marketplace", "como foi a semana", "relatório da loja",
  "analisa minhas lojas", "o que está vendendo", "buscar produto novo", "tendências",
  "/marketplace" ou "/marketplace tendencias".
---

# /marketplace — Rotina semanal dos marketplaces

Essa skill existe pra resolver o gargalo declarado no `/instalar`: acompanhar tendências de marketplace, procurar produtos 3D novos e analisar métricas dos anúncios. É a tarefa que se repetia toda semana na mão.

Dois modos. Sem argumento, roda o modo loja. Com `tendencias`, roda a varredura de mercado.

## Dependências

- **Contexto:** `_memoria/empresa.md`, `_memoria/estrategia.md`
- **Tom de voz:** `_memoria/preferencias.md`
- **Coleta:** ferramentas do `claude-in-chrome`. Sem elas a skill não roda
- **Histórico:** `marketing/marketplace/relatorios/`
- **Bruto:** `dados/marketplace/<YYYY-MM-DD>/`
- **Catálogo:** `dados/catalogo/`

## Pré-checagem

Confirmar que as ferramentas do `claude-in-chrome` estão disponíveis. Se não estiverem, parar e dizer:

> "As ferramentas de browser não estão ativas. Digita `@browser:` aqui no chat e escolhe uma aba, ou clica no botão + e pega 'Browse the web'. Isso liga a conexão na hora, sem reiniciar nada. Depois me chama de novo."

**Por que é assim.** A extensão do VSCode sobe o Claude Code com `--no-chrome` fixo em toda inicialização, e esse flag é testado antes da variável de ambiente e antes da config `claudeInChromeDefaultEnabled`. Nenhum ajuste em settings resolve. A extensão desliga a fiação automática da CLI porque ela mesma controla a conexão: a menção `@browser:` dispara `ensureChromeMcpEnabled`, que injeta o servidor MCP `claude-in-chrome` na sessão que já está rodando.

Rodar `/chrome` não liga nada nesse contexto, só reporta status. Alternativa pelo terminal, fora do VSCode: `claude --chrome` a partir da pasta do projeto.

Não tentar contornar com fetch nem curl **de fora do browser**. Já foi testado e as três plataformas bloqueiam: a Shopee devolve página vazia e 403 nos endpoints de catálogo, o Mercado Livre devolve 403 no site e exige token OAuth na API, o TikTok Shop exige login.

**De dentro da página logada, porém, a API interna responde.** Na Shopee, com o cookie `SPC_CDS` da própria sessão, o catálogo inteiro sai em duas chamadas e evita raspar tabela virtualizada:

```js
const spc = document.cookie.split('; ').find(c => c.startsWith('SPC_CDS=')).split('=')[1];
const r = await fetch(`/api/v3/mpsku/list/v2/get_product_list?SPC_CDS=${spc}&SPC_CDS_VER=2&page_number=1&page_size=24&list_type=all&need_ads=true&need_dp_info=true`, {credentials:'include'});
// resposta em data.products, com price_detail, stock_detail e statistics
```

`page_size` acima de 24 é rejeitado. Os painéis de métrica e de anúncio não têm equivalente e precisam ser lidos na tela.

Confirmar também que as três centrais estão logadas no perfil do Chrome que o Claude dirige. Ao bater em tela de login ou captcha, pausar e devolver o controle pro usuário.

**Janela de datas.** Cada canal abre num período diferente. Igualar os três na mesma janela de 7 dias fechados antes de comparar qualquer coisa: a Shopee tem preset de Últimos 7 Dias, o Mercado Livre precisa de Data personalizada (o preset dele inclui o dia corrente) e o TikTok Shop precisa de intervalo manual no calendário.

---

# MODO LOJA (padrão)

## Passo 1 — Coleta

Uma passada por canal. Salvar captura de tela e texto de cada tela lida em `dados/marketplace/<YYYY-MM-DD>/<canal>/`.

### Shopee (`seller.shopee.com.br`) — shop_id 1478228631

| Tela | O que extrair |
|---|---|
| Produtos | Título completo, preço, estoque, vendas acumuladas, categoria, quantidade de fotos |
| Dados do Negócio | Visitas, visitantes únicos, taxa de conversão, faturamento no período |
| Dados por produto | Visitas, cliques, conversão e vendas item a item |
| Shopee Ads | Campanhas, investimento, GMV, ROAS, palavras-chave sem conversão |
| Avaliações | Notas ruins e normais novas, com o motivo |
| Chat | Taxa de resposta e mensagens sem responder |

### Mercado Livre (área de vendedor)

| Tela | O que extrair |
|---|---|
| Minhas publicações | Título, preço, tipo de anúncio, visitas, vendas, saúde do anúncio, ficha técnica incompleta |
| Métricas | Visitas por publicação, conversão, posição na busca |
| Mercado Ads | Campanhas, ACOS, investimento |
| Reputação | Termômetro, prazo de envio, reclamações |

### TikTok Shop (`seller-br.tiktok.com`)

| Tela | O que extrair |
|---|---|
| Produtos | Título, preço, estoque |
| Analytics | Visualizações, cliques, conversão, GMV |
| Vídeos e lives | Peças ligadas a produto e o que converteu |
| Anúncios | Campanhas ativas, se houver |

**Regra de coleta:** nada de número reconstruído de memória. Toda métrica que entrar no relatório precisa de captura correspondente salva em `dados/`. Tela que não abriu vira "não coletado", nunca estimativa.

## Passo 2 — Consolidar o catálogo

Atualizar `dados/catalogo/<YYYY-MM-DD>-catalogo.csv`, uma linha por produto por canal. Colunas descritas em `dados/catalogo/README.md`.

Esse CSV é o que responde a pergunta que ninguém responde de cabeça: qual produto existe em um canal e não existe nos outros.

## Passo 3 — Comparar com a semana anterior

Ler o relatório mais recente em `marketing/marketplace/relatorios/`. O frontmatter YAML traz os números fechados da semana passada, então não é preciso reler o corpo.

Calcular a variação de: faturamento por canal e total, unidades vendidas, visitas, taxa de conversão, ticket médio, investimento em anúncio, ROAS ou ACOS.

Se não houver relatório anterior, essa é a primeira leitura. Marcar como baseline e dizer isso no resumo.

## Passo 4 — Resumo executivo

Topo do relatório, leitura de dois minutos.

```markdown
# Marketplace — semana <DD/MM> a <DD/MM>

## Resumo executivo

**Faturamento:** R$ X.XXX (sobe/cai Y% vs semana anterior)
**Unidades:** N (sobe/cai Y%)
**Conversão média:** X,XX% (sobe/cai Y pp)
**Investimento em anúncio:** R$ XXX, retorno R$ X.XXX

**Por canal:**
- Shopee: R$ X.XXX, N unidades, conversão X,XX%
- Mercado Livre: R$ X.XXX, N unidades, conversão X,XX%
- TikTok Shop: R$ X.XXX, N unidades, conversão X,XX%

**O que mais importa essa semana:** uma frase.
```

## Passo 5 — Detalhamento

Por canal:

- **Top 5 produtos** por faturamento e por unidade
- **Bottom 5** entre os que têm visita, que é onde o conserto tem efeito
- **Muita visita e pouca venda:** o vazamento mais caro. Foto, preço ou descrição
- **Pouca visita:** problema de título, categoria ou anúncio
- **Estoque:** campeão de venda perto de zerar
- **Anúncios:** o que gastou sem converter

## Passo 6 — Alertas

Varrer os dados e emitir apenas o que bater critério. Sem emoji. Ordem: grave, atenção, oportunidade.

| Nível | Alerta | Critério |
|---|---|---|
| GRAVE | Venda despencou | Faturamento do canal caiu mais de 30% contra a semana anterior |
| GRAVE | Estoque crítico | Produto no top 5 de venda com estoque pra menos de 7 dias no ritmo atual |
| GRAVE | Verba queimando | Campanha gastou acima de R$ 100 na semana sem nenhuma conversão |
| GRAVE | Avaliação ruim nova | Nota 1 ou 2 registrada no período |
| ATENÇÃO | Visita sem venda | Produto com mais de 100 visitas e conversão abaixo de 1% |
| ATENÇÃO | Taxa de resposta | Abaixo de 80% em qualquer canal. A Shopee usa isso no ranqueamento |
| ATENÇÃO | Conversão caindo | Conversão do canal caiu mais de 20% contra a semana anterior |
| ATENÇÃO | Anúncio doente | Mercado Livre sinalizando saúde do anúncio abaixo de boa, ou ficha técnica incompleta |
| ATENÇÃO | Produto parado | Zero venda em 21 dias com estoque disponível |
| OPORTUNIDADE | Campeão sem canal | Produto no top 5 de um canal e ausente em outro |
| OPORTUNIDADE | Converte e não aparece | Conversão acima da média do canal e menos de 50 visitas. Falta ser visto |

## Passo 7 — Ações da semana

De 3 a 5 itens concretos, ordenados por retorno sobre esforço. Nome do produto, número e motivo.

Ruim: "otimizar títulos".
Bom: "Reescrever o título do capacete F1 na Shopee. 240 visitas e 2 vendas em 7 dias, conversão 0,8% contra 3,1% da loja."

## Passo 8 — Salvar e entregar

Salvar em `marketing/marketplace/relatorios/<YYYY-MM-DD>-relatorio.md` com frontmatter:

```yaml
---
periodo_inicio: YYYY-MM-DD
periodo_fim: YYYY-MM-DD
faturamento_total: 0000.00
faturamento_shopee: 0000.00
faturamento_mercadolivre: 0000.00
faturamento_tiktokshop: 0000.00
unidades_total: 0
conversao_media: 0.00
investimento_ads: 0000.00
canais: [shopee, mercado-livre, tiktok-shop]
---
```

Mostrar no chat os Passos 4, 6 e 7. Apontar o caminho do arquivo completo.

---

# MODO TENDÊNCIAS (`/marketplace tendencias`)

Metade de descoberta do gargalo: achar o que vender.

## Passo 1 — Varrer as categorias

Nos três marketplaces, percorrer as categorias que conversam com o público da loja: games, miniaturas e colecionáveis, Fórmula 1, automobilismo e carros, decoração geek.

Em cada uma, capturar o que está em alta: mais vendidos da categoria, produtos com muita avaliação recente, faixa de preço praticada, quantidade de vendedores.

A Shopee tem ranking por categoria e a aba de busca em alta. O Mercado Livre tem Tendências e a lista de mais vendidos por categoria. O TikTok Shop mostra produto em alta e o que está pegando em vídeo.

## Passo 2 — Filtrar o que é viável

Descartar o que não é imprimível em 3D, o que depende de licença de marca registrada, o que exige peça eletrônica que a operação não tem e o que tem margem esmagada por vendedor importado.

Cruzar com `dados/catalogo/` pra não sugerir o que já está no catálogo.

## Passo 3 — Devolver candidatos

De 5 a 10, cada um no formato:

```markdown
### <nome do produto>
**Onde apareceu:** canal e categoria
**Preço praticado:** faixa de R$ X a R$ Y
**Sinal de demanda:** o que sustenta (posição no ranking, volume de avaliação recente)
**Concorrência:** quantos vendedores e se são impressos em 3D ou industriais
**Por que cabe aqui:** relação com games, miniaturas, F1 ou carros
**Risco:** licença, dificuldade de impressão, margem
```

Ordenar por facilidade de entrar, não por tamanho do mercado. Operação de uma pessoa só ganha no que dá pra imprimir e listar essa semana.

## Passo 4 — Salvar

`pesquisa/<YYYY-MM-DD>-tendencias.md`. Ao fim, perguntar quais candidatos entram no catálogo.

---

## Regras

- **Nunca inventar número.** Tela que não abriu vira "não coletado". Um relatório com buraco declarado vale mais que um relatório redondo e errado
- **Comparação é o que importa.** "R$ 3.200 essa semana" não diz nada sem o número da semana anterior
- **Sem emoji e sem travessão** em qualquer texto gerado, conforme `_memoria/preferencias.md`
- **Ação concreta.** Nome do produto, número que sustenta, motivo. Nunca "otimizar" solto
- **Perda se reporta inteira.** "A campanha queimou R$ 180 sem venda" é mais útil que "performance abaixo do esperado"
- **Operação de uma pessoa.** Não propor plano que exija time. Se a lista de ações passa de 5 itens, cortar pelas duas de maior retorno
- **Descrever o dado, não o clique.** As três plataformas mudam a interface toda hora. A skill diz qual número buscar, e a navegação se resolve na hora
- **Sessão que cai é normal.** Extensão hiberna em sessão longa. Reconectar com `/chrome` e seguir de onde parou
