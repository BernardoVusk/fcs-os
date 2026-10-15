# Referências de vídeo (Remotion)

Pasta só de referência para criação de vídeo em motion. Aqui entram os vídeos que servem
de modelo de **movimento**: MP4, MOV, WEBM ou GIF, baixados ou gravados da tela. Nada de
foto de produto nem material de carrossel: isso fica em `marketing/`.

A skill `/motion-fcs` mede esses arquivos com ffmpeg e extrai uma spec numérica (ordem,
duração, easing, stagger, sobreposição) antes de escrever qualquer código. É isso que
separa uma peça com timing de motion profissional de uma peça com timing improvisado.

**O que se copia:** tempo, easing, ordem e sobreposição.
**O que não se copia:** layout, ícone, composição visual, paleta, logo. A identidade é
sempre a da FCS (`motion/CLAUDE.md`).

## Subpastas

| pasta | o que guardar |
|---|---|
| `abertura/` | sting de marca, logo animado, intro e encerramento |
| `produto/` | vitrine de produto: giro, revelação, close de detalhe, callout de medida |
| `catalogo/` | sequência de vários produtos, troca rápida entre itens |
| `transicoes/` | emendas entre cenas, varreduras, whips, revelações por máscara |
| `tipografia/` | texto em movimento, legenda dinâmica, tipografia cinética |
| `bastidor/` | timelapse de impressão, vídeo real com callouts e legenda |

## Nome do arquivo

Pelo que a referência ensina, não pela origem: `produto/giro-com-callouts.mp4` funciona
melhor que `video_2.mp4`. Se vier de um perfil ou marca, anotar a origem no catálogo abaixo,
não no nome.

## Versionamento

Só este `LEIA-ME.md` vai para o GitHub. Os vídeos são material de terceiro e ficam só nesta
máquina (sincronizados pelo OneDrive), por causa do `motion/.gitignore`.

## Catálogo

Cada referência medida ganha uma linha aqui, para a próxima peça não medir de novo. A coluna
"spec" resume o que foi medido (duração, curva, stagger), com [MEDIDO] ou [ESTIMADO].

| arquivo | o que ensina | spec | usada em |
|---|---|---|---|
| | | | |

Sem referência, a skill segue mesmo assim, usando as estruturas de batida do catálogo em
`.claude/skills/motion-fcs/referencias/tipos-de-peca.md`.
