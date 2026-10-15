---
name: motion-fcs
description: >
  Método guiado para criar vídeo em motion com Remotion na identidade da FCS 3D STUDIO
  (fundo preto, ciano elétrico, Chakra Petch e Poppins, chanfro de 45° das letras do logo,
  camadas de impressão): identifica o tipo de peça, pede a referência de animação em
  motion/referencias/, faz engenharia reversa dela em spec numérica, monta o mapa de
  fluidez antes de codar, e reprova mecanicamente qualquer peça com trecho parado. Tem
  memória de acertos e erros em aprendizado.md. O estúdio Remotion da FCS fica em motion/.
  Neste workspace, usar esta skill no lugar da /motion global (que aponta para o projeto da
  FX Minas). Use quando o usuário pedir animação, motion, motion graphics, vídeo novo, vídeo
  de produto, vídeo pro Instagram ou TikTok, Reels, vídeo de anúncio, story animado,
  abertura animada, logo animado, peça de vídeo, animar alguma coisa, melhorar a fluidez,
  auditar motion, refazer a animação, /motion ou /motion-fcs.
---

# /motion-fcs — vídeo em motion da FCS 3D STUDIO com Remotion

Projeto: `motion/` na raiz deste workspace, o estúdio Remotion da FCS. A marca já está
codificada em `motion/src/marca/` (`cores.ts`, `tipografia.ts`, `empresa.ts`, gerados a
partir de `identidade/design-guide.md` e `_memoria/empresa.md`) e os componentes de marca em
`motion/src/componentes/`. **Ler `motion/CLAUDE.md` antes de qualquer peça**: paleta,
tipografia, grafismo, componentes e o que nunca fazer. Nunca hex ou dado solto direto no
componente, e não re-derivar a marca a cada peça.

Referências de animação ficam em `motion/referencias/` (pasta só de referência para vídeo,
uma subpasta por tipo de peça, catálogo em `motion/referencias/LEIA-ME.md`).

Primeira vez nesta máquina: `cd motion && npm install` (o `node_modules` não versiona). O
primeiro render baixa o Chrome Headless Shell (~113 MB), uma vez só.

## O princípio que rege tudo

**Nenhum segundo parado.** Uma peça é fluida quando, em qualquer frame, alguma coisa está
se movendo de forma perceptível. Isso não é opinião: é medido, e peça reprovada não chega
ao usuário.

Duas métricas, medidas por script:

- **Densidade** (`densidade.mjs`, lê o código): 3 a 4 eventos nomeados por segundo. Todo
  elemento significativo tem ciclo de vida: **entra → vive → reage → sai**. Elemento que
  entra e congela é um evento; deveria ser quatro.
- **Cobertura** (`fluidez.mjs`, mede o vídeo): nenhum trecho parado, e a peça não termina
  congelada.

Densidade **produz** a fluidez; cobertura **prova** que ela chegou na tela. Uma peça com
cobertura alta e densidade baixa está aprovada tecnicamente e vazia perceptualmente: o
fundo se mexe e o conteúdo está parado.

Ordem de ataque quando falta fluidez: **ciclo de vida → densidade → sobreposição →
camada de ambiente**. A última é a mais fraca, porque resolve por decoração. Nunca por
rampa global lenta: escala ou opacidade arrastadas pela peça inteira dão deslocamento
sub-pixel e somem no ruído de compressão. Ver `referencias/doutrina-fluidez.md`.

---

## As 7 etapas, nesta ordem, sem pular

### 0. Memória

Ler `aprendizado.md` **antes de qualquer coisa**. É o registro do que já deu certo e do
que já quebrou. Pular esta etapa é repetir erro conhecido.

### 1. Identificar a peça

Via `AskUserQuestion`, uma rodada só:
- **Tipo**: do catálogo em `referencias/tipos-de-peca.md`
- **Formato(s)**: reels 1080×1920 (Reels, TikTok, TikTok Shop, Stories) · feed 1080×1350 ·
  quadrado 1080×1080 · landscape 1920×1080
- **Duração alvo**: em segundos
- **Produto** (quando for peça de produto): qual peça do catálogo, e se há foto ou vídeo real
  dela. Produto é o protagonista da marca; sem material real, a peça vira abertura ou
  tipográfica, nunca produto inventado.

Se o pedido já disser o tipo com clareza ("faz uma abertura"), não perguntar de novo:
confirmar junto com as outras perguntas.

### 2. Referência

Pedir o vídeo de referência em `motion/referencias/<tipo>/` (não versiona: referência é de
terceiro). Antes, olhar o catálogo em `motion/referencias/LEIA-ME.md`: pode já haver uma
referência medida que sirva. Dizer por que importa: com referência medida a peça sai com
timing e easing de motion profissional; sem ela, sai com a estrutura padrão da casa, que é
boa mas genérica.

**Se o usuário não tiver referência, seguir mesmo assim**: usar a estrutura de batidas do
tipo escolhido. Não travar o trabalho por causa disso.

Referência nova medida ganha linha no catálogo do `LEIA-ME.md` (arquivo, o que ensina, spec
extraída), para a próxima peça não medir de novo.

### 3. Blueprint

**Intenção antes do código** (`referencias/principios.md`). Por cena, por escrito: o
propósito numa frase; o que o olho vê primeiro; o movimento primário, os secundários e
o terciário; o que fica estável; os eventos semânticos (palavra, batida, número) e em
qual deles cai um zoom de destaque. Movimento sem função sai.

**Com referência:** seguir `referencias/extrair-spec.md`. Medir com ffmpeg, converter
frames em ms *e* em frames da composição alvo, marcar cada easing como [MEDIDO] ou
[ESTIMADO], e declarar os pontos cegos. Não inventar número para preencher lacuna.

**Sem referência:** montar a grade de batidas a partir do tipo, em
`referencias/tipos-de-peca.md`.

### 4. Mapa de fluidez: o portão

Antes de escrever qualquer código, montar e mostrar ao usuário:

1. **Tabela de cobertura**: para cada faixa de frames, qual camada está animando
   (ambiente / narrativa / detalhe) e qual é o primário daquele trecho. Nenhuma faixa
   vazia, e só um primário por vez.
2. **Ciclo de vida por elemento**: o que cada elemento faz nas quatro fases. Somar os
   eventos: tem que dar **3 a 4 por segundo** de peça.
3. **Instantes de zoom de destaque**: um por informação nomeada, marcado com a `Mira`.

É aqui que o defeito é barato de corrigir. Depois do código, custa re-render de todos os
formatos.

### 5. Código

**Antes de escrever código, carregar a skill `remotion-best-practices`** (oficial do
Remotion, `github.com/remotion-dev/skills`, instalada em `~/.claude/skills/`). Depois, ler
as referências que ela roteia pro caso: `remotion-create`, `remotion-markup` (+
`voiceover.md`, `transitions.md`, `multi-scene-video.md` quando couber; `remotion-captions/`
pra legenda; `3d.md`, `light-leaks.md`, `effects.md` quando a peça pedir). As regras da casa
abaixo continuam valendo por cima dela.

Antes de inventar um padrão, procurar em `referencias/receitas.md` (zoom de destaque,
título, número, callout técnico, dashboard, legenda, batida, SVG, morph, foto 2.5D, whip,
3D, CTA, barra de progresso). Por assunto: `transicoes.md`, `tipografia-e-legendas.md`,
`dados-e-tecnico.md`, `efeitos-e-estilos.md`, `camera-e-imagem.md`.

Composição nova em `motion/src/composicoes/`, seguindo `referencias/reconstruir-remotion.md`:
objeto `TIMING` no topo em frames, `interpolate` sempre com clamp dos dois lados,
`spring()` onde houver overshoot, `useLayout()` para servir todos os formatos com um
componente só, e tokens de `motion/src/marca/`, nunca hex solto.

**A curva se escolhe pelo papel do movimento**, não copiando a rampa do topo do arquivo:
`chega` → expo-out · `atravessa` → cubic-in-out · `sai de quadro` → expo-in · `deriva` →
linear · `encaixe` (peça que trava no lugar) → `spring()` preset `seco`. Tabela e armadilhas em
`referencias/vocabulario.md`.

### 6. Verificação: os quatro portões

Nenhum é opcional, e a ordem importa (comandos relativos à raiz do projeto Remotion,
`motion/`):

```
a)  npx tsc --noEmit
b)  node ../.claude/skills/motion-fcs/scripts/densidade.mjs src/composicoes/<Peça>.tsx --frames <N>
c)  npx remotion still <Composição> out/f<N>.png --frame=<N>   → e OLHAR as imagens
d)  npx remotion render <Composição> out/<peca>.mp4            → tier de entrega
    node ../.claude/skills/motion-fcs/scripts/fluidez.mjs out/<peca>.mp4
```

- **(a)** só prova que compila. Não diz nada sobre movimento.
- **(b)** é barato e roda antes de renderizar: pega subespecificação enquanto ainda é só
  editar o `TIMING`.
- **(c)** é o que pega erro de composição, cor e layout. Renderizar de 4 a 6 frames
  espalhados (início, cada batida, final) e olhar de verdade. Densidade nova não pode
  virar poluição visual: esse portão é o que percebe isso. Olhar com as perguntas de
  revisão de `principios.md` §8 (primário claro? movimento sem função? hold? efeito que
  dá pra tirar?). Peça com locução: extrair também os quadros nos instantes das
  palavras-chave e conferir a sincronia (A17).
- **(d)** trava a entrega. Medir no arquivo de **entrega**, não no rascunho: o rascunho lê
  ~18% mais alto por causa do ruído do JPEG (`referencias/qualidade-render.md`).

Reprovou em qualquer um → corrigir e repetir, sem mostrar ao usuário ainda.

### 7. Entrega e gravação

Renderizar os formatos pedidos. Entregar com o resumo de fluidez (cobertura real/fraco/
morto). Aprovada pelo usuário, copiar o MP4 final de `out/` para `motion/entregas/` como
`FCS3D-<descrição>-<formato>-Rnn.mp4` (até 50 MB; versão nova é arquivo novo) e registrar a
linha em `motion/entregas/LEIA-ME.md`. Essa pasta versiona; `out/` não. Depois, **anexar a
`aprendizado.md`** o que se aprendeu no ciclo: erro novo, acerto que vale repetir, número
que se mostrou certo ou errado. Uma entrada por aprendizado, com o "como aplicar da
próxima".

---

## Gatilhos

`/motion-fcs` · `/motion` · "criar animação" · "fazer motion" · "motion graphics" ·
"novo vídeo" · "vídeo de produto" · "vídeo pro Instagram" · "vídeo pro TikTok" · "reels" ·
"vídeo de anúncio" · "story animado" · "abertura animada" · "logo animado" · "animar" ·
"peça de vídeo" · "melhorar a fluidez" · "auditar motion" · "refazer a animação"

Para **auditar** peça existente (em vez de criar), pular direto para
`referencias/auditar.md` e para o portão (c).

---

## Regras que não se negociam

- Peça reprovada no `fluidez.mjs` ou no `densidade.mjs` não é entregue. Corrige e
  re-renderiza.
- Todo elemento significativo tem mais de uma fase. Elemento que entra e congela é defeito.
- Conteúdo crítico dentro da zona segura em formato vertical: topo 15% e base 20% ficam
  sob a interface da rede (no TikTok a lateral direita também, por causa dos botões).
- Texto nunca abaixo do piso de legibilidade (`tamanhoTipo()` aplica e avisa), e nunca
  menos de **24 frames** legível por bloco. Legível não quer dizer parado: o ambiente
  continua correndo, o próprio texto é que não se mexe.
- **Nada de grão, motion blur ou efeito de quadro cheio antes de medir a fluidez.** Eles
  inflam o YAVG por construção e mascaram peça parada. Compor por último.
- Movimento só por `interpolate()` e `spring()`. CSS `transition`/`animation` **não
  renderizam** no Remotion.
- Renderizar stills e olhar antes de dizer que está pronto. `tsc` verde não é verificação
  de motion.
- Tokens da marca de `motion/src/marca/cores.ts` e `tipografia.ts`. Cor fora da paleta é
  proibida. Fundo é sempre preto ou grafite: **fundo claro é proibido** pela marca, e cor
  quente (laranja, vermelho, amarelo) nunca disputa com o ciano.
- Ciano é sempre cheio. Hierarquia entre formas ciano vem de espessura, tamanho e tempo,
  nunca de opacidade (ciano rebaixado sobre preto vira azul petróleo sujo, mesmo defeito do
  E2). Onde precisar de ciano apagado, usar o token sólido `cianoTrama`.
- Conteúdo real, nunca lorem: dados de `motion/src/marca/empresa.ts` (gerado a partir de
  `_memoria/empresa.md`). **Nunca inventar número** (regra do workspace): nota, avaliação,
  venda ou prazo na tela saem de dado coletado e com data; preço só se for o preço atual do
  anúncio, conferido no dia.
- O produto é o protagonista. Pouco texto, muito produto. Foto ou vídeo de produto é da
  própria FCS; modelo 3D de terceiro (Printables, Thingiverse, MakerWorld) só aparece se a
  licença permitir uso comercial, e marca registrada de terceiro (escuderia, montadora,
  personagem de game) não entra como logo na peça.
- Texto na tela segue o tom da FCS (direto, curto, "nosso" e "você", informação concreta
  antes de adjetivo), **sem travessão, sem emoji, sem promoção gritada** ("imperdível",
  "corra").
- Todo antes/depois mostra os dois lados. Número de resultado sem o "antes" ao lado é
  proibido.
- Nada da referência além de tempo, easing e ordem. Layout, ícone e composição visual são
  da marca da FCS, nunca copiados.
- Não renderizar todos os formatos até o primeiro passar nos quatro portões.
- **Zoom de destaque em toda informação-chave**: quando surge o elemento que a locução ou o
  texto está nomeando (o detalhe da peça, a medida, o material, o número), a câmera dá um
  mini zoom NELE, e a `Mira` trava sobre ele. Não é push-in global lento (E1): é acento
  rápido, com origem na coordenada do elemento. Receita canônica em `referencias/receitas.md`
  §1 (histórico em `aprendizado.md` A18). No mapa de fluidez (etapa 4), marcar em qual frame
  de cada cena cai um zoom de destaque; cena com informação nomeada e sem zoom é defeito.

## Fora de escopo em vídeo

`prefers-reduced-motion`, `AnimatePresence` e `motion/react` são regras de peça web/UI.
Em Remotion renderizando MP4 não existe usuário com preferência nem desmontagem: ignorar.
Pela mesma razão, a regra "animar só transform e opacity" (que é performance de browser)
**não vale aqui**: `clip-path`, `filter` e `width` são livres.

Pelo mesmo motivo, material de motion escrito para UI chega aqui com duas distorções
sistemáticas. Conferir antes de importar qualquer número de fonte externa:

1. **A escala de duração é outra.** Tokens de 100–400ms são de interface, onde o usuário
   espera resposta a um clique. Em vídeo ele está assistindo. Ver `vocabulario.md`.
2. **O piso de visibilidade é mais alto.** Texto de UI mede num canvas ao vivo; nós
   entregamos MP4 comprimido, onde deslocamento sub-pixel some no ruído do h264. Toda
   recomendação de "deriva imperceptível" precisa ser multiplicada antes de valer aqui
   (`camera-e-imagem.md` 2.2).

## Arquivos da skill

| arquivo | quando ler |
|---|---|
| `aprendizado.md` | sempre, etapa 0, e gravar na etapa 7 |
| `referencias/principios.md` | etapa 3 (intenção, hierarquia, semântica) e portão (c) (perguntas de revisão) |
| `referencias/doutrina-fluidez.md` | etapa 4, e sempre que um verificador reprovar |
| `referencias/tipos-de-peca.md` | etapas 1 e 3 |
| `referencias/extrair-spec.md` | etapa 3, quando houver referência (inclui roteiro de tomadas) |
| `referencias/receitas.md` | etapa 5, antes de inventar qualquer padrão |
| `referencias/reconstruir-remotion.md` | etapa 5 |
| `referencias/transicoes.md` | peça com mais de uma cena |
| `referencias/tipografia-e-legendas.md` | texto em movimento, locução, legenda |
| `referencias/dados-e-tecnico.md` | número, gráfico, dashboard, callout, HUD, SVG, morph, 3D |
| `referencias/efeitos-e-estilos.md` | efeito de destaque, estilo de movimento, peso/material |
| `referencias/qualidade-render.md` | etapa 7, e em qualquer defeito de imagem |
| `referencias/auditar.md` | auditoria de peça existente |
| `referencias/vocabulario.md` | ao descrever ou interpretar "feel"; **e ao escolher curva**. Tem a tradução da marca FCS |
| `referencias/camera-e-imagem.md` | linguagem de câmera (2.0); e quando a peça passa nos portões e ainda parece renderizada |
| `referencias/audio.md` | só quando a peça tiver trilha, locução ou SFX |

## Origem

Trazida para a FCS 3D STUDIO em 2026-10-13, a partir da skill `/motion` do workspace da
Focus Engenharia e Arquitetura, que por sua vez veio do estúdio de motion da FX Minas
Construtora (RemotionFX). O método de fluidez, a doutrina de câmera e imagem, os scripts de
medição e a memória de erros e acertos são os mesmos, testados em produção real. O que era
da Focus (fundo branco, Azul Profundo e Amarelo, Montserrat, prancha de arquitetura, ponto
de foco) foi trocado pela identidade da FCS em `motion/src/marca/`, `motion/CLAUDE.md` e na
seção "Feel da marca" de `referencias/vocabulario.md`.
