# scripts/ — utilitários do VuskVS

Scripts Node.js e Python que as skills chamam quando precisam fazer coisas fora do alcance da IA pura (gerar imagem, postar em rede social, renderizar HTML em PNG).

Os scripts **já vêm prontos**. Não precisam de `npm install` — rodam só com
Node 20+ e o `fetch` nativo. O que falta é preencher o `.env` com as chaves
de cada integração que você for usar.

## O que tem aqui

| Skill | Script | O que faz |
|---|---|---|
| `/carrossel` (com foto IA) | `gerar-imagem.js` | Gera foto via OpenAI (`gpt-image-1`) e salva em PNG |
| `/carrossel` (render PNG) | `render.js` (gerado pelo carrossel, fica na pasta do conteúdo) | Playwright tira screenshot 1080x1350 de cada slide |
| `/aprovar-post` | `postar-instagram.js` | Publica carrossel no Instagram via Meta Graph API |
| `/aprovar-post` | `postar-facebook.js` | Publica post multi-foto no Facebook via Meta Graph API |
| — | `_comum.js` | Peças compartilhadas pelos dois scripts de publicação |
| `/anuncio-google` | (nenhum — gera CSV direto) | — |
| `/relatorio-ads` | (lê CSV exportado das plataformas) | — |

### Como chamar

```bash
# Gerar uma foto (prompt em inglês, retrato 4:5 por padrão)
node --env-file=.env scripts/gerar-imagem.js "Professional food photography of..." "marketing/conteudo/meu-tema-2026-05-12/foto-capa.png"

# Publicar (os PNGs já precisam estar no ar em <SITE_URL>/img/posts/<slug>/)
node --env-file=.env scripts/postar-instagram.js marketing/conteudo/meu-tema-2026-05-12
node --env-file=.env scripts/postar-facebook.js  marketing/conteudo/meu-tema-2026-05-12
```

O slug sai do nome da pasta, tirando a data do final:
`meu-tema-2026-05-12` → `meu-tema`.

## Pré-requisitos comuns

A maioria dos scripts depende de:

**Node.js 20+** instalado na máquina

**.env** na raiz do projeto. Copie o modelo e preencha só o que for usar:
```bash
cp .env.example .env
```

O `.env` está no `.gitignore` — as chaves nunca sobem pro GitHub quando você
roda `/salvar`.

**Playwright** (pra renderizar HTML em PNG):
```bash
npm install playwright
npx playwright install chromium
```

## Como o VuskVS lida com isso

Quando uma skill precisa de uma integração que ainda não foi configurada, o
Claude vai:

1. Detectar qual variável falta no `.env`
2. Te guiar no setup da chave (Meta, OpenAI, etc.)
3. Rodar a skill

Você não precisa decorar nada. Roda a skill, segue o fluxo.
