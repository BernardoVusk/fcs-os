# motion/ — estúdio de motion da FCS 3D STUDIO

> Vídeos da FCS 3D STUDIO gerados por código (Remotion): vitrine de produto, catálogo sob
> demanda, abertura de marca, Reels, TikTok, Stories e vídeo de anúncio de marketplace.

## Como se cria peça aqui

**Pela skill `/motion-fcs`** (`.claude/skills/motion-fcs/`). Ela conduz as 7 etapas, de
memória, tipo de peça, referência, blueprint, mapa de fluidez e código até a verificação, e
reprova mecanicamente qualquer peça com trecho parado. Não criar composição sem passar por
ela: a memória de erros dela (`aprendizado.md`) existe para não repetir o que já quebrou.

Neste workspace, a `/motion` global (em `~/.claude/skills/motion`) **não** serve: ela aponta
para o projeto da FX Minas. A da FCS é a `/motion-fcs`.

Junto com a `/motion-fcs`, carregar sempre a **`remotion-best-practices`** (oficial do
Remotion, instalada em `~/.claude/skills/`). Ela cobre API e boas práticas; a `/motion-fcs`
cobre o método de fluidez e a marca.

Referências de animação vão em `referencias/`, uma subpasta por tipo de peça, com catálogo
em [referencias/LEIA-ME.md](referencias/LEIA-ME.md). Os vídeos não versionam.

Origem: método, scripts e estrutura trazidos em 2026-10-13 do estúdio de motion da Focus
Engenharia e Arquitetura, que veio do estúdio da FX Minas (RemotionFX). A camada de marca foi
refeita para a FCS.

## Stack

Remotion 4.0.515 + React 19 + TypeScript. Sem Tailwind, sem biblioteca de animação extra:
todo movimento sai de `spring()` e `interpolate()` do próprio Remotion.

```
npm install        # primeira vez na máquina (node_modules não versiona)
npm run dev        # Remotion Studio em localhost:3000
npm run typecheck  # tsc --noEmit

npm run rascunho -- <Peça>-Reels out/x.mp4   # jpeg, CRF 23, fast: iterar
npm run render   -- <Peça>-Reels out/x.mp4   # png,  CRF 8,  slow: entregar
npx remotion still KitMarca out/kit.png      # conferir a marca num quadro só
```

O primeiro render baixa o Chrome Headless Shell (~113 MB), uma vez só. Medir fluidez
sempre no arquivo de **entrega**: o rascunho lê ~18% mais alto pelo ruído do JPEG.

Verificação (da raiz de `motion/`):

```
npx tsc --noEmit
node ../.claude/skills/motion-fcs/scripts/densidade.mjs src/composicoes/<Peça>.tsx --frames <N>
npx remotion still <Composição> out/f<N>.png --frame=<N>      # e OLHAR
npx remotion render <Composição> out/<peca>.mp4
node ../.claude/skills/motion-fcs/scripts/fluidez.mjs out/<peca>.mp4
```

---

## Identidade da marca

**Fundo padrão: preto** (`cores.preto`). Ciano elétrico é o destaque, branco é o texto. Fundo
claro é proibido pela marca, e cor quente (laranja, vermelho, amarelo) nunca disputa com o
ciano. O produto é o protagonista: pouco texto, muito produto.

Não re-derivar nada disto: está codificado em `src/marca/`. Fonte da verdade:
`identidade/design-guide.md`. Para conferir tudo num quadro só, renderizar o `KitMarca`.

### Cores: `src/marca/cores.ts`

| Papel | Token | Hex |
|---|---|---|
| **Fundo padrão dos vídeos** | **`preto`** | **`#0A0A0A`** |
| Cards, painéis, fundo alternativo | `grafite` | `#141414` |
| Borda fina de card | `borda` | `#1F1F1F` |
| **Destaque, título, CTA, grafismo, logo** | **`ciano`** | **`#00D8FF`** |
| Texto principal | `branco` | `#FFFFFF` |
| Texto secundário, rótulos (derivado) | `cinzaTexto` | `#A0A0A0` |
| **Ambiente sobre o preto**, malha da mesa (derivado) | `cianoTrama` | `#08333B` |
| Ambiente neutro (derivado) | `grafiteTrama` | `#333333` |
| Só status | `sucesso` `#2F8F5B` · `erro` `#C43D2F` | |

Os derivados são mistura sólida de cores da paleta, criados para a camada de ambiente ter
contraste mensurável (aprendizado E11) sem usar opacidade. `cianoTrama` é o "ciano em 20% de
opacidade" do design guide já resolvido em cor cheia: delta de luma ~32 sobre o preto.

**Ciano sempre cheio.** Ciano com opacidade sobre preto vira azul petróleo sujo (o mesmo
defeito do E2). Hierarquia entre formas ciano vem de espessura, tamanho e tempo.

Brilho: `brilho(intensidade, escala)` devolve o `filter` de glow ciano. Na marca a
profundidade vem de tom e brilho, nunca de sombra cinza. Em vídeo, brilho é pulso curto de
impacto (sobe e volta), não estado parado.

### Tipografia: `src/marca/tipografia.ts`

Duas famílias, por `@remotion/google-fonts`:

- `fontes.titulo`, **Chakra Petch** 700, caixa alta: títulos, números, nome de produto. É a
  display angular com cantos cortados, a mais próxima das letras do logo
- `fontes.corpo`, **Poppins** 400 ou 500: corpo, subtítulo, legenda. Referência do "Studio"
  do logo
- `fontes.etiqueta`, Chakra Petch 600, maiúsculas, tracking 0,22em: rótulos e selos

Nunca peso light. `tamanhoTipo(papel, escala)` aplica o piso de legibilidade e avisa no
console.

### Fundo e grafismo: mesa de impressão

Em [Mesa.tsx](src/componentes/Mesa.tsx):

- **`Grade`**, a malha da mesa de impressão: linhas finas em `cianoTrama`, com uma linha mais
  grossa a cada 5 módulos. Desenha do centro para fora na abertura e **deriva o tempo todo**
  (3 a 8 px por frame). É a camada de ambiente da casa (aprendizado A22: malha fina andando
  sustenta a fluidez).
- **`Camadas`**, revelação por camadas de impressão: o conteúdo aparece de baixo para cima,
  uma camada por vez, com a camada ativa acesa em ciano cheio. É o verbo da casa, **imprimir**:
  usar para revelar produto, título grande e emendar cenas antes de qualquer crossfade.

Grafismos tirados do logo:

1. **Chanfro de 45°**, os cantos cortados de F, C, S e do bloco "3D Studio" (no logo, canto
   superior esquerdo e inferior direito). Em [Corte.tsx](src/componentes/Corte.tsx):
   `chanfro()` para canto de card, moldura e botão; `mascaraCorte()` para revelação com
   aresta a 45°; `ReguaCorte` para régua de pontas cortadas. Tamanhos em `cantos`
   (8 · 12 · 24). Canto arredondado é proibido (raio máximo 4 px).
2. **Mira**, quatro cantoneiras chanfradas que fecham sobre o elemento nomeado e travam com
   pulso de brilho, linguagem de HUD de game e de telemetria de F1. É o marcador do zoom de
   destaque. [Mira.tsx](src/componentes/Mira.tsx).
3. **Bloco "3D Studio"**, moldura com canto chanfrado: vira selo de etiqueta (medida,
   material, prazo).

### Movimento

O verbo da marca é **imprimir**: o que entra se constrói de baixo para cima. Preciso, rápido
e mecânico nas entradas (expo-out curto, como o cabeçote da impressora); **encaixe seco**
quando a peça trava no lugar (`spring` preset `seco`, overshoot até 1,04); amplo e calmo só
na revelação do produto. Sem bounce elástico. Tradução completa em
`.claude/skills/motion-fcs/referencias/vocabulario.md`, "Feel da marca".

### Logo: `public/logo/` e [Logo.tsx](src/componentes/Logo.tsx)

Gerado do oficial `identidade/logo.png` (ciano sobre preto, 1080×1080): alfa tirado do canal
azul, fundo transparente, aparado no desenho (700×192).

| Arquivo | Uso |
|---|---|
| `fcs-ciano*.png` | **padrão**, sobre o preto ou o grafite |
| `fcs-branco*.png` | quando o ciano já está em uso no quadro |

Cada cor tem três recortes: completo, `-wordmark` ("FCS", 490 px) e `-selo` ("3D Studio",
164 px). Lado a lado com o vão de 46 px (`LOGO.vao`), recompõem o logo exato. O logo só
pousa sobre preto ou fundo muito escuro.

### O que NUNCA fazer

- Fundo claro ou branco como base; cor quente competindo com o ciano; gradiente
  multicolorido
- Ciano com opacidade reduzida sobre o preto. Hierarquia por espessura, tamanho e tempo
- Fonte fora de Chakra Petch e Poppins; peso light
- Canto arredondado em card, botão ou moldura (chanfro ou reto)
- Travessão em texto, emoji, promoção gritada ("imperdível", "corra"), jargão de marketing,
  "caro cliente"
- Texto longo em cima de imagem. Pouco texto, muito produto
- **Inventar número**: nota, avaliação, venda, prazo ou preço só com dado coletado e data
- Logo de terceiro (escuderia, montadora, personagem de game) como marca na peça; modelo 3D
  de terceiro sem licença de uso comercial
- Bounce elástico, brilho glossy viajando (E9), sombra cinza

---

## Empresa: `src/marca/empresa.ts`

FCS 3D STUDIO, e-commerce de produtos impressos em 3D, catálogo sob demanda (o cliente pede,
o estúdio imprime). Público: colecionador e hobbysta de games, miniaturas, Fórmula 1, carros
e automobilismo. Canais: Shopee (`shopee.com.br/fcs3dstudio`), Mercado Livre e TikTok Shop.
Indicadores de 21/08/2026 (nota 4,876 e 1.627 avaliações na Shopee) estão com data e fonte:
conferir no painel e atualizar antes de pôr numa peça. Instagram e TikTok da loja: confirmar
o perfil antes de usar.

---

## Estrutura

```
public/logo/       logo em 2 cores x 3 recortes
referencias/       vídeos de referência por tipo de peça (não versiona, só o LEIA-ME)
entregas/          MP4 final aprovado (versiona), regras no LEIA-ME
scripts/           elevenlabs.mjs (locução com --tempos, efeito e música; chave FCS_ELEVENLABS_API_KEY)
                   tempos-narracao.mjs (consolida duração e palavras da locução em tempos.ts)
                   compor-trilha.mjs (trilha de fundo em código, com marcos nas emendas)
                   transcrever.mjs (whisper.cpp, só para locução que chegar pronta, sem tempos)
src/
  marca/           cores, tipografia, formatos, empresa, layout responsivo
  componentes/     Logo, Eyebrow, Mesa (Grade, Camadas), Corte (chanfro, máscara 45°,
                   régua), Mira, Contador, GradeKpi (e AntesDepois)
  composicoes/     uma peça por arquivo (peça longa: uma pasta, uma cena por arquivo)
  Root.tsx         registro das composições
```

## Convenções

- **Todo elemento tem ciclo de vida:** entra, vive, reage, sai. Alvo de 3 a 4 eventos
  nomeados por segundo no objeto `TIMING`, no padrão `ELEMENTO_FASE`.
- **Zonas seguras:** em vertical, topo 15% e base 20% ficam sob a interface da rede.
  `useLayout()` devolve `zonaSegura`. No TikTok, deixar também a lateral direita livre (botões).
- **Um componente serve todos os formatos** (`useLayout()`): `reels` 1080×1920 (Reels,
  Stories, TikTok, o principal), `feed` 1080×1350, `quadrado` 1080×1080 (anúncio de
  marketplace), `landscape` 1920×1080. Todos a 30 fps. Registro `<Peça>-<Formato>` em
  [Root.tsx](src/Root.tsx).
- **Sem pulo de layout:** todo elemento montado desde o frame 0, animando só opacidade e
  transform (e recorte).
- Renders em `out/` (não versiona). **O MP4 final aprovado vai para `entregas/`**, com nome
  `FCS3D-<descrição>-<formato>-Rnn.mp4`, até 50 MB. Regras em
  [entregas/LEIA-ME.md](entregas/LEIA-ME.md).
- Locução, trilha e SFX: ver `.claude/skills/motion-fcs/referencias/audio.md` e
  `aprendizado.md` A15, A17, A19, A20.
- **ElevenLabs:** conta própria da FCS criada em 13/10/2026, **plano gratuito** (10 mil
  caracteres por mês). O script lê só a variável de usuário `FCS_ELEVENLABS_API_KEY` (chave que
  começa com `sk_`; o "ID da chave" não serve), para nunca usar por engano a chave da Focus
  (`ELEVENLABS_API_KEY`). No gratuito: voz da biblioteca (Davi Andrei, o padrão do script) e
  música devolvem 402; vozes nativas funcionam pelo modelo multilíngue (usada: Daniel,
  `onwK4e9ZLuTAKqWW03F9`, `--voz`); efeitos funcionam. **Plano gratuito não permite uso
  comercial**: nada gerado nele vai para peça publicada; ao assinar, regerar com o mesmo comando.
  Cada arquivo gerado ganha linha em `CREDITOS.md`.

## Composições

- **`KitMarca`** (still, 1920×1080): prancha de conferência com logo, paleta, tipografia,
  botão chanfrado, `Grade`, `Camadas` a 60% e `Mira` travada. Não é peça de entrega. Conferida
  em 2026-10-13.
- **`ApresentacaoERP`** (4.657 quadros, 2min35), landscape, locução e trilha. Apresentação do
  FCS ERP com prints reais (`public/erp/`, tema escuro a 2x, tirados do ERP local apontado para
  o projeto de teste com o catálogo real e uma semente de demonstração): 12 cenas, uma por
  arquivo em `composicoes/ApresentacaoERP/`, kit próprio (`kit.tsx`: `Frase` palavra a palavra
  com marca-texto ciano, `CardTela`, `Cursor`, `ChipVivo`, câmera com zoom de destaque, `Som`).
  O `TIMING` de cada cena deriva da fala: `tempos.ts` (gerado por
  `scripts/tempos-narracao.mjs` a partir dos JSON do `elevenlabs.mjs narrar --tempos`) dá o
  instante de cada palavra, e `fala("cenaNN").em("palavra")` ancora as faixas. Narração
  `public/audio/erp/cena01..12.mp3` (voz Daniel, plano gratuito: uso interno), trilha
  `trilha.mp3` composta por `scripts/compor-trilha.mjs` com marcos nas emendas, ducking por
  palavra no orquestrador, efeitos em `sfx-*.mp3`. Validada em 2026-10-13: densidade 3,0 a 5,0
  eventos/s nas 12 cenas; fluidez na entrega 100% real, 6 fracos, 0 morto; master −14,5 LUFS /
  −1,2 dBTP. Se a narração mudar: regerar com `--tempos --refazer`, rodar
  `tempos-narracao.mjs`, e as cenas se ressincronizam sozinhas. Se um print mudar, recapturar
  com o script de captura (fora do repositório) e conferir as caixas (`CAIXAS`) da cena.

A **abertura de marca** (tipo 1 do catálogo) ainda não existe como peça própria: a cena 01 e o
fecho da `ApresentacaoERP` são o ponto de partida dela.
