# Entregas do estúdio de motion

Esta pasta **versiona no GitHub**: é onde fica o MP4 final de cada peça aprovada, para não
precisar renderizar de novo. A pasta `out/` continua local: rascunho, stills de conferência,
testes e re-renders não sobem.

## O que entra

- Só o **arquivo final aprovado**, no tier de entrega (`npm run render`), já com os quatro
  portões da `/motion-fcs` aprovados (e o master de áudio, se a peça tiver som).
- Uma entrega por formato quando a peça sair em mais de um (reels, feed, quadrado, landscape).
- Nada de rascunho, still, grade de revisão nem versão intermediária: cada arquivo que entra
  fica no histórico do git para sempre, mesmo se for apagado depois.

## Nome

`FCS3D-<descrição em minúscula>-<formato>-Rnn.mp4`. `R00` na primeira entrega, `R01`,
`R02`... a cada nova versão aprovada. Nunca sobrescrever um `R` que já subiu: versão nova é
arquivo novo.

Exemplo: `FCS3D-abertura de marca-reels-R00.mp4`.

## Tamanho

O GitHub alerta a partir de 50 MB e recusa acima de 100 MB. Antes de subir, conferir o
tamanho. Peça que passar de 50 MB: recomprimir o master de `out/` com
`ffmpeg -i <master>.mp4 -c:v libx264 -crf 22 -preset slow -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 64k <entrega>.mp4`
(medido na Focus: CRF 8 = 147 MB, CRF 22 = ~42 MB, sem perda visível em tela com texto e
desenho) e medir a fluidez de novo. Se ainda passar, avisar antes de subir.

## Registro

Cada entrega nova ganha uma linha aqui e na seção "Composições" do `motion/CLAUDE.md`.

| Arquivo | Peça | Data | Validação |
|---|---|---|---|
| `FCS3D-apresentacao do erp-landscape-R00.mp4` | `ApresentacaoERP-Landscape`, 2min35, locução e trilha (plano gratuito do ElevenLabs: uso interno) | 2026-10-13 | densidade 3,0 a 5,0 eventos/s; fluidez 100% real, 4 fracos, 0 morto; −14,5 LUFS / −1,2 dBTP; CRF 24, 47 MB |
