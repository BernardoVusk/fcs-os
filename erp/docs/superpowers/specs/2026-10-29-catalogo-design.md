# Portfólio público sob demanda (/portfolio)

## Contexto

A FCS só tinha vitrine nos marketplaces. O dono pediu um portfólio simples: foto e nome de cada peça, separados por categoria, com um botão que abre o WhatsApp do estúdio (+55 31 99253-7279) com a peça já escrita na mensagem. As peças vêm das coleções que ele montou no MakerWorld (conta `@BernardoBusk`).

Decisões do dono (29/10/2026):
- Página pública dentro do ERP, como o `/sorteio`, sem site separado.
- Visual direto da identidade (`identidade/design-guide.md`), sem pesquisa de referências.
- Entra todo modelo das coleções escolhidas, inclusive os de "Licença Padrão de Arquivo Digital" (proíbe vender a peça impressa) e as réplicas de arma das coleções Pow Pow e NotFlow. O risco foi explicado e assumido. A licença fica anotada em `catalogo_itens.licenca`, sem filtrar.
- Supabase no plano gratuito: fotos em webp comprimido ao máximo.

## Rota

`/portfolio` e `/portfolio/[categoria]`. Não é `/catalogo` porque o painel já usa `/catalogo/produtos` e `/catalogo/precificacao`, e a lista de rotas livres do proxy (`lib/supabase/proxy.ts`) casa por prefixo: `/catalogo` livre tiraria do proxy a exigência de sessão e de AAL2 dessas telas internas.

## Dados

- Migração `0029_catalogo.sql`: `catalogo_categorias` (slug, nome, ordem, ativa) e `catalogo_itens` (categoria, nome, imagem, makerworld_id único, fonte_url, autor, licenca, colecoes, ativo). RLS com leitura e escrita para `authenticated` (tela futura no painel), nada para `anon`, `app.auditar()` e `app.carimbar_atualizacao()` nas duas.
- Bucket público `catalogo`, só `image/webp`, até 300 KB por arquivo.
- Leitura da página em `dados/publico/catalogo.ts` pela service role (exceção documentada em `docs/arquitetura.md`), só nome, slug e foto de itens e categorias ativos.
- Link do WhatsApp em `dominio/catalogo/whatsapp.ts`: `https://wa.me/5531992537279?text=Olá! Vi no catálogo da FCS 3D STUDIO a peça "<nome>" (<categoria>) e quero um orçamento.`

## Selo do dono (link do MakerWorld)

Quem está logado no ERP vê, no canto de cada foto em `/portfolio/[categoria]`, um selo "MakerWorld" com a licença (e "pode vender" quando é BY, BY-SA, BY-ND ou CC0) que abre o modelo. A consulta fica em `dados/catalogo.ts` com o cliente da sessão, não na exceção pública: para o visitante a RLS de `catalogo_itens` devolve vazio, então o link não vai no HTML. Só `https://makerworld.com/` vira href. Rótulos em `dominio/catalogo/licenca.ts`.

## Coleta e importação

1. **Coleta (Chrome logado).** A API `/api/v1/design-service/favorites/<colecao>/designs` só responde no navegador (fora dele, 403 do Cloudflare). O resultado sobe do navegador para o bucket privado `arquivos-produto` por URL assinada de envio único, é baixado para `dados/makerworld/<data>/colecoes.json` e apagado do bucket.
2. **Montagem.** `node ferramentas/montar-catalogo.mjs dados/makerworld/<data>/colecoes.json [--relatorio]` limpa o nome (`limparNome`: tira AMS, multicor, medidas, ideogramas, travessão, instrução de impressão; corta em 90 caracteres) e classifica pelo nome (`classificar`, regras por palavra-chave em ordem fixa; sem palavra-chave vale a coleção de origem). As coleções do MakerWorld misturam assuntos (organizador na coleção Automóvel, suporte de laptop em Personagem), por isso o nome manda. Correções pontuais em `nomes-corrigidos.json` e `categorias-corrigidas.json`; licenças em `licencas.json`, todos ao lado do `colecoes.json`.
3. **Importação.** `node ferramentas/importar-catalogo.mjs dados/makerworld/<data>/catalogo.json --alvo dev|teste`. Baixa a capa da CDN já em webp 800 px, recorta 600x600 no centro, comprime (qualidade 55, esforço 6) e sobe em `catalogo/<makerworld_id>.webp` com cache de 1 ano. Upsert por `makerworld_id`; foto que já existe não sobe de novo.

Resultado em 29/10/2026: 943 modelos únicos de 22 coleções, 16,1 MB de fotos (média de 17 KB).

| Categoria | Peças |
|---|---|
| Carros e motos | 123 |
| Games e cosplay | 126 |
| Personagens | 204 |
| Animais | 76 |
| Tecnologia | 38 |
| Organização e utilidades | 147 |
| Presentes | 97 |
| Decoração | 132 |

Ficaram de fora as coleções Padrão (748), Calibração, Tênis e presentes jao.

Licenças lidas modelo a modelo pela API `/api/v1/design-service/design/<id>` (no navegador, uma por vez): 770 Standard Digital File License (proíbe vender a peça impressa), 21 MakerWorld Exclusive License, 106 Creative Commons não comercial (BY-NC, BY-NC-SA, BY-NC-ND) e 46 que permitem venda (BY 22, BY-SA 13, CC0 7, BY-ND 4). Gravadas em `catalogo_itens.licenca`, sem filtrar a vitrine.

## Para adicionar peças depois

Salvar o modelo numa das coleções do MakerWorld, repetir a coleta no Chrome, rodar `montar-catalogo.mjs` e `importar-catalogo.mjs`. Peça que saiu da coleção continua no banco; para esconder, `ativo = false`.

## Verificação

- Unitários: `src/dominio/catalogo/whatsapp.test.ts`, `ferramentas/catalogo.test.mjs`.
- E2E: `testes/e2e/catalogo.spec.ts` (abre sem login, navega até a categoria, confere o link do WhatsApp; categoria inexistente dá 404).
