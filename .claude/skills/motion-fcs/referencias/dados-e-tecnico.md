# Dados, técnico e SVG

> Ler quando a peça tiver número, gráfico, dashboard, diagrama, callout técnico, HUD,
> máquina, mapa ou morph de forma. Regra da marca que vale aqui: **todo antes/depois
> mostra os dois lados**, e respeitar as restrições de divulgação do negócio
> (`_memoria/preferencias.md` e `_memoria/empresa.md`).
>
> **Exemplos da FX Minas.** Caminhos `RemotionFX/...` e `reels-ponto-cego/...` citados aqui são do
> projeto de referência onde a técnica foi provada (grupo FX Minas, marca industrial). No seu
> negócio o equivalente vive em `motion/src/`. Colunas "ex. FX" mostram como essa marca decidiu;
> pra outra marca, decidir pelo feel dela (`vocabulario.md` Feel da marca → vocabulário de movimento).

---

## 1. Dado se anima pelo que ele significa

Não animar gráfico porque gráfico animado é bonito. O movimento responde: o quê? quando?
quanto? comparado com o quê? o que mudou? por quê?

Ordem padrão de storytelling: **base → mudança → destaque → anotação → conclusão.**
Ex.: 2025 cresce primeiro, 2026 cresce depois, a diferença acende, a anotação explica.

| peça | como anima | ordem | cuidado |
|---|---|---|---|
| contador | 0 → alvo em 30–60f, expo-out, `tabular-nums` | número → unidade → rótulo | ano sem separador (E18); unidade e casas decimais certas |
| barra | altura/largura com stagger 3–6f | base → barras → rótulos → valores → destaque | rótulo não corre separado da barra dele |
| linha | traço da esquerda pra direita (linear ou expo-out) | eixo → linha → pontos → rótulo → ponto de destaque | ponto seguidor correndo na ponta do traço dá vida |
| rosca / pizza | segmentos em sequência ou ângulo interpolado | segmentos → métrica no centro | pizza 3D só se pedido |
| progresso | 0 → alvo | trilho → preenchimento → valor | cor semântica só quando a cor significa algo |
| antes / depois | os dois lados sempre | "antes" apagado primeiro, "depois" cresce, diferença acende | componente `AntesDepois` em `GradeKpi` |

---

## 2. Dashboard: a hierarquia sai do timing

Primário = métrica ou gráfico principal · secundário = métricas de apoio · terciário =
rótulos, data, hora, metadado.

Coreografia de referência (30fps):

| frames | evento |
|---|---|
| 0–10 | fundo e grade |
| 6–16 | cabeçalho |
| 10–25 | KPI principal |
| 14–29 | KPI 2 |
| 18–33 | KPI 3 |
| 24–60 | gráfico principal se desenha |
| 40–70 | métricas secundárias |
| 55–80 | destaque (zoom de destaque no número que importa) |
| 60–80 | anotação |

Grade de cards: stagger pela **diagonal** (`(linha + coluna) × passo`,
`reconstruir-remotion.md`). Nunca todos os cards de uma vez. Números grandes, rótulos
pequenos, alinhamento consistente, cor contida.

---

## 3. Callout técnico (padrão reutilizável)

Âncora → linha-guia → caixa do rótulo → texto → valor → descrição.

| fase | frames | como |
|---|---|---|
| âncora | 0–6 | ponto com pop de escala (`spring` seco) + pulso que afina |
| linha-guia | 4–16 | SVG que se desenha (`pathLength=1`), expo-out |
| caixa | 10–20 | desliza 12–20px na direção da linha |
| rótulo | 14–24 | sobe por máscara, mono uppercase |
| valor | 20–30 | contador ou destaque de palavra |
| vive | até sair | âncora pulsando, linha com tracejado andando |

Exemplo FX Minas: âncora laranja cheia, linha creme 2–3px, caixa basalto com borda grafite e raio
14, rótulo em IBM Plex Mono. É a receita pra explicar máquina, obra, etapa de processo.
Receita completa em `receitas.md`.

---

## 4. HUD

Cantos de colchete, coordenadas, linha de varredura, retícula, barra de progresso,
status, rótulos, grade, linha de rastreio.

- HUD tem hierarquia: parte dele é atmosfera (não precisa ler), parte é informação (tem
  que ler, com piso de tipografia).
- Exemplo FX Minas: HUD **restrito** (◐), estilo prancheta de engenharia (grade fina, colchetes,
  mono), nunca neon nem gamer. Bom pra explicativo técnico e pra vista de cima de
  equipamento.

---

## 5. SVG

SVG inline é o padrão quando o desenho precisa de traço por traço, dado dinâmico ou
morph. Não rasterizar o que é vetor.

### Desenho do traço (já é da casa)

`pathLength={1}` + `strokeDasharray="1 1"` + `strokeDashoffset={1 - p}` desenha qualquer
path sem medir o comprimento no DOM (A9). Com ponta redonda, zerar a opacidade quando
`p = 0` (senão pinta um ponto). Componente `Traco` em
`RemotionFX/src/composicoes/reels-ponto-cego/comum.tsx`. Expo-out pra revelação orgânica,
linear pra desenho técnico em velocidade constante.

Alternativa oficial: `evolvePath(progresso, d)` de `@remotion/paths` devolve
`{ strokeDasharray, strokeDashoffset }` medidos.

### Morph (`@remotion/paths`)

Conferido na 4.0.515: existe **`interpolatePath(valor, pathA, pathB): string`**, no
singular. O `interpolatePaths` (várias chaves) citado em material externo **não existe**
nessa versão; pra A → B → C, encadear segmentos:

```tsx
import { interpolatePath } from "@remotion/paths";
const seg = frame < MEIO ? interpolatePath(pAB, A, B) : interpolatePath(pBC, B, C);
```

O pacote já está no `node_modules` como dependência transitiva; pra importar direto,
declarar com `npx remotion add @remotion/paths`. Outras úteis: `getLength`,
`getPointAtLength` e `getTangentAtLength` (objeto seguindo o traço, com rotação pela
tangente), `cutPath`, `reversePath`, `scalePath`, `translatePath`, `warpPath`.

Morph só entre formas com relação geométrica (ícone A → ícone B, estado de dado, forma
de logo). Entre formas sem relação vira gosma, a não ser que a abstração seja a ideia.

### Objeto representativo

Máquina, caminhão, contorno de estado: **não desenhar de memória** (E13). Ordem: malha
oficial (IBGE, A8) → SVG licenciado → geometria de uma peça já aprovada (A16) → forma
abstrata que carregue o mesmo sentido. Uma tentativa à mão é aceitável; duas é sinal de
que a forma não é pra ser desenhada à mão.

---

## 6. 3D (só quando resolve um problema espacial)

3D acrescenta profundidade, luz, material e câmera; também acrescenta custo de render e
modos de falha. Usar quando o 2D não comunica com eficiência:

- vista explodida de equipamento;
- corte em seção, casca transparente mostrando o interior;
- órbita em produto ou máquina;
- mapa espacial, terreno, obra.

API: `remotion-best-practices` → `remotion-markup/3d.md` (`@remotion/three`,
`ThreeCanvas`, luz obrigatória). Não está instalado no RemotionFX: adicionar com
`npx remotion add @remotion/three` quando for usar.

**Receita técnica:** máquina inteira → painéis se separam → componente revelado →
destaque → rótulo (callout 2D por cima) → mecanismo anima → câmera assenta → mensagem.
Iluminação: luz principal com direção, preenchimento controlando contraste, contra-luz
separando do fundo, ambiente. Sombra pra dar contato com o chão.

Câmera: perspectiva pra cinema, ortográfica pra técnico/arquitetura. Rótulo em espaço de
tela (legenda, CTA) ou em espaço de câmera (rótulo preso na peça).

**Exemplo FX Minas:** o modelo 3D precisa vir de fonte real (fabricante com licença, modelo do
cliente). Máquina 3D modelada de memória cai no E13 em escala maior. Sem modelo, fazer
2.5D com foto real (`camera-e-imagem.md` §2.0) e callouts 2D.

---

## 7. Híbrido 2D + 3D + dado

Um explicativo técnico profissional junta objeto (foto, SVG ou 3D) + tipografia 2D +
setas SVG + HUD + dado + câmera + som. Não forçar tudo na mesma tecnologia: SVG pra
linhas e diagramas, HTML/CSS pra texto e cards, Three.js só pra 3D de verdade, vídeo pra
material fotográfico. A tecnologia mais simples que resolve ganha.
