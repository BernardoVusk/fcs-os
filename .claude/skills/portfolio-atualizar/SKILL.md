---
name: portfolio-atualizar
description: >
  Atualiza o portfólio público da FCS 3D STUDIO (https://fcs-erp.vercel.app/portfolio) a partir
  das coleções do MakerWorld da conta @BernardoBusk: lê as coleções pelo Chrome logado, limpa os
  nomes, classifica por categoria, comprime as fotos em webp e grava no banco do ERP. Use quando o
  usuário disser "atualiza o portfólio", "coloca as peças novas no portfólio", "salvei modelos
  novos no MakerWorld", "adicionar produto no catálogo do site", "/portfolio-atualizar".
---

# /portfolio-atualizar: peças novas do MakerWorld no portfólio

O portfólio é a página pública `/portfolio` do ERP: foto, nome e botão "Pedir orçamento" que abre o WhatsApp do estúdio com a peça na mensagem. Spec completa: `erp/docs/superpowers/specs/2026-10-29-catalogo-design.md`. O dono decidiu que entra todo modelo, qualquer licença; a licença só fica anotada.

## Dependências

- Ferramentas do `claude-in-chrome` (a API do MakerWorld só responde no navegador logado; fora dele é 403 do Cloudflare). Sem elas a skill não roda: avisar e parar.
- `.env` da raiz com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (os scripts leem sozinhos).
- Scripts em `erp/ferramentas/`: `montar-catalogo.mjs`, `importar-catalogo.mjs`, regras em `catalogo.mjs`.

## Coleções e categorias

Uma peça em mais de uma coleção vale pelo nome (`classificar` em `erp/ferramentas/catalogo.mjs`); a coleção só decide quando nenhuma palavra-chave casa.

| Categoria (slug) | Coleções (id) |
|---|---|
| carros-e-motos | Automóvel 4309589, Carros 15191198 |
| games-e-cosplay | Pow Pow 15191312, NotFlow 19093982, Cosplays 18627304 |
| personagens | Personagem 4285932, PERSONAGENS 10182926 |
| animais | Animais 4439401 |
| tecnologia | Tecnologia 4362574, Computador 18628464 |
| organizacao-e-utilidades | Organização 4348774, Utilidades 10183184 |
| presentes | Presentes 4362268, Casamento/Relacionamento 5994283, Acessórios 4283990, Religião 26553091, Quebra-cabeça 36108822 |
| decoracao | Decoração 4273605, Decoração 10183250, Luminárias 34454988, Dia das Bruxas 14515285 |
| (pelo nome; sem palavra-chave vira decoracao) | Loja 18522771 |

Fora: Padrão 4273599, Calibração, Tênis, presentes jao. Coleção nova criada pelo dono: perguntar em qual categoria entra antes de coletar.

## Passo a passo

Pasta do dia: `dados/makerworld/<AAAA-MM-DD>/` (fora do git por regra do projeto).

1. **Copiar as correções da última rodada** para a pasta do dia: `nomes-corrigidos.json`, `categorias-corrigidas.json` e `licencas.json` da pasta mais recente em `dados/makerworld/`.

2. **Coletar no Chrome.** `tabs_context_mcp`, abrir aba nova em `https://makerworld.com/pt/@BernardoBusk/collections`. Rodar em segundo plano dentro da página (uma chamada passa de 45 s), com a tabela acima como `MAPA`:
   - para cada coleção, `GET /api/v1/design-service/favorites/<id>/designs?limit=100&offset=N` até `offset >= total`, pausa de 1,2 s entre chamadas, nunca em paralelo (paralelo cai no "Just a moment" do Cloudflare);
   - de cada `hit`: `makerworld_id = id`, `nome = titleTranslated || title`, `capa = cover`, `autor = designCreator.name`, `url = https://makerworld.com/pt/models/<id>-<slug>`, `categoria` = slug da coleção (a primeira que achar; Loja só se não estiver em outra), `colecoes` = todas em que aparece;
   - guardar em `window.__fcs` e o andamento em `window.__fcsEstado`; conferir com chamadas curtas.

3. **Tirar os dados do navegador** (o retorno da ferramenta corta em 100 linhas): criar URL de envio único com a service role, `storage.from('arquivos-produto').createSignedUploadUrl('importacao/makerworld-<data>.json')`; na página, `fetch(url, { method: 'PUT', body: JSON.stringify({ itens: window.__fcs }) })`; baixar para `dados/makerworld/<data>/colecoes.json` e **apagar o objeto do bucket**.

4. **Licenças só das peças novas** (as antigas já estão no `licencas.json`): na página, `GET /api/v1/design-service/design/<id>` uma por vez, pausa de 0,7 s, campo `license`; falha vira `null` (não coletado). Mesmo caminho de saída do passo 3, juntar no `licencas.json`.

5. **Montar e revisar.** Dentro de `erp/`: `node ferramentas/montar-catalogo.mjs ../dados/makerworld/<data>/colecoes.json --relatorio`. Ler o relatório das peças novas: nome estranho vai para `nomes-corrigidos.json`, categoria errada para `categorias-corrigidas.json`, e rodar de novo. Regra que vale para muitas peças vira regra em `catalogo.mjs` com teste em `catalogo.test.mjs`.

6. **Importar.** Primeiro no projeto de teste com amostra (`--limite 10 --alvo teste`), depois `node ferramentas/importar-catalogo.mjs ../dados/makerworld/<data>/catalogo.json --alvo dev`. Foto que já existe não sobe de novo. Conferir no fim: itens gravados, MB totais (plano gratuito: 1 GB) e falhas.

7. **Conferir no ar**: `https://fcs-erp.vercel.app/portfolio` e a categoria das peças novas respondem 200 sem login. Não precisa de deploy: a página lê o banco a cada acesso.

8. **Fechar** a aba criada e relatar: peças novas por categoria, licenças das novas, tamanho total das fotos, o que foi corrigido à mão.

## Regras

- Nunca inventar nome nem categoria: o que a limpeza não resolver vai para revisão no relatório.
- Peça que saiu da coleção continua no banco. Para esconder: `update catalogo_itens set ativo = false where makerworld_id = <id>` (pedir ok antes).
- Nome sem emoji e sem travessão (a limpeza troca travessão por dois-pontos).
- URL assinada e arquivo temporário no bucket duram só a rodada: apagar no fim.
