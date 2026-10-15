import { Config } from "@remotion/cli/config";

/*
  Tier de ENTREGA como padrão.

  O pipeline degrada em três estágios independentes — React → Chrome (captura de
  frame) → FFmpeg (encode) — e cada um tem seu próprio botão de qualidade. Antes
  aqui só havia `setVideoImageFormat("jpeg")`, o que colocava a captura no pior
  estágio e jogava fora nitidez de texto e vetor antes mesmo do encode começar.

  Medido em 2026-08-23, AberturaMarca 1920x1080 150 frames:
    rascunho (jpeg, crf 23, fast) ....  7,9s   851 KB
    entrega  (png,  crf 8,  slow) .... 16,6s  1160 KB

  2,1x mais lento e 1,4x maior — barato pelo ganho. Para rascunhar rápido use
  `npm run rascunho`, que sobrepõe estes valores pela linha de comando.

  Scale fica em 1 (nativo) de propósito: scale 2 sairia em 2160x3840 e
  quadruplicaria arquivo e tempo, sem ganho real para Instagram e LinkedIn, que
  reencodam de qualquer jeito.
*/
Config.setCrf(8);
Config.setVideoImageFormat("png");
Config.setStillImageFormat("png");
Config.setX264Preset("slow");
Config.setColorSpace("bt709");
Config.setOverwriteOutput(true);
