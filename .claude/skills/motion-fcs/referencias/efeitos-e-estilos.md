# Efeitos e estilos

> Ler quando a peça pedir um efeito ou um estilo de movimento. Regra dura da casa:
> **nenhum efeito de quadro cheio (grão, blur, glow global, glitch, light leak) antes de
> medir a fluidez**. Eles inflam o YAVG e aprovam peça parada (`doutrina-fluidez.md`).
> Compor por último. Grão, vinheta, CA, bloom e halation já estão em
> `camera-e-imagem.md` §3; aqui ficam os efeitos de destaque e os estilos.
>
> **Exemplos da FX Minas.** Caminhos `RemotionFX/...` e `reels-ponto-cego/...` citados aqui são do
> projeto de referência onde a técnica foi provada (grupo FX Minas, marca industrial). No seu
> negócio o equivalente vive em `motion/src/`. Colunas "ex. FX" mostram como essa marca decidiu;
> pra outra marca, decidir pelo feel dela (`vocabulario.md` Feel da marca → vocabulário de movimento).

Prioridade de implementação: HTML/CSS → SVG → efeito do Remotion (`remotion-markup/
effects.md`, `HtmlInCanvas`) → Canvas → Three.js → shader. A mais simples que resolve.

---

## 1. Efeitos

Coluna ex. FX (decisão da FX Minas, marca industrial): ✓ combina · ◐ com parcimônia · ✗ fora do tom (industrial, sério, sem gloss).
Para outra marca, decidir pelo feel dela (`vocabulario.md` Feel da marca).

| efeito | comunica | como | limite | ex. FX |
|---|---|---|---|---|
| brilho por `brightness()` | reagir, acender | pulso 1 → 1,3 → 1 em 14–16f no próprio elemento | não em tudo | ✓ (E9) |
| glow | energia, neon, dado ativo | `drop-shadow` / `box-shadow` com a cor do acento | só no que é primário | ✗ (◐ em ponto de mapa) |
| quadro de impacto | batida, revelação | 1–3f mais claro/maior/contrastado + tremida curta | nunca contínuo | ◐ |
| flash | impacto, virada | overlay branco/creme 2–4f | nunca em sequência | ◐ |
| tremida (shake) | impacto físico | `8·exp(-t·8)` em 8–12f (`camera-e-imagem.md` 2.4) | só em batida | ✓ |
| glitch | instabilidade, falha digital | deslocamento horizontal em blocos + scanline + ruído, rajada de 4–8f | nunca o vídeo todo | ✗ |
| RGB split / CA forte | digital, tech | canais deslocados 2–6px | abuso = amador | ✗ (CA sutil ≤2px, `camera-e-imagem.md`) |
| grão / ruído | cinema, analógico | ver `camera-e-imagem.md` 3.2 (2–4%) | invalida o `fluidez.mjs` | ◐ só no master |
| light leak / film burn | cinema, nostalgia, overlay de transição | overlay curto, direção consistente | não esconde corte fraco | ✗ |
| lens flare | cinema, sol | — | — | ✗ |
| gloss / brilho que atravessa | vitrine, produto | — | vira caixa cinza (E9) | ✗ |
| partículas | fluxo, poeira, energia | 20–60, semente fixa, profundidade por tamanho | não explodir | ◐ (poeira de obra) |
| desfoque de profundidade | foco | fundo levemente suave, frente nítida | não borrar tudo | ◐ |
| motion blur | velocidade | `camera-e-imagem.md` §1 | nunca em texto | ◐ |
| trail (rastro) | energia estilizada | `Trail` de `@remotion/motion-blur` | não é blur realista | ✗ |
| visualização de áudio | trilha, podcast | uma ou duas ligações som → visual (`audio-visualization.md`) | não reagir tudo ao áudio | ◐ |

### Fórmula de impacto

**antecipação + aceleração + contraste + contato + assentamento.**
Recuo curto → avanço rápido → escala grande → quadro de impacto → overshoot → assenta.
Som: sub 40–80Hz + transiente 2–5kHz + cauda 200–600ms (`audio.md`). Um impacto por
bloco de ideia, não um por palavra.

---

## 2. Estilos de movimento

Estilo = cor + tipo + espaço + forma + movimento + câmera + efeito + som. Escolher o
estilo pelo feel da marca, não por gosto.

| estilo | movimento | câmera | efeito | tipo |
|---|---|---|---|---|
| corporativo limpo | pouco, expo-out, amplitude baixa | quase fixa | quase nenhum | sans, grade forte |
| editorial | máscaras, recortes, cortes secos | pan e crop | nenhum | tipografia protagonista |
| cinematográfico | revelações lentas, profundidade | push, parallax, rack focus | blur, grão, vinheta | caixa alta, tracking largo |
| tech | preciso, rápido, scan | movimentos curtos | HUD, grade, glow contido | mono + sans |
| **industrial** | peso, assentamento firme, overshoot contido | órbita, push em detalhe | rótulos técnicos, pouca partícula | condensada/grotesca + mono |
| social / alta energia | gancho rápido, pop, batida | zoom de destaque frequente | flash, shake | caixa alta, grande |
| luxo | lento, macio, mínimo | quase fixa | nenhum | serifa, muito espaço negativo |
| documental | contido, natural | sutil | nenhum | legenda legível |

**Exemplo: FX Minas = industrial com pitadas de social nos Reels** (zoom de destaque, batida,
barra de progresso), sem gloss, sem neon, sem bounce (`vocabulario.md` Feel da marca).

---

## 3. Movimento conforme forma, material e massa

| característica | movimento |
|---|---|
| formas arredondadas | curva macia, mola, aceleração baixa |
| formas angulares / técnicas | curva seca, timing preciso, segmentos retos |
| metal | aceleração dura, assentamento forte, sem deformação |
| vidro | suave, transparência, transição macia |
| borracha | mola, deformação (squash) |
| papel | overshoot leve, dobra |
| UI digital | preciso, rápido, consistente |
| objeto pesado (caminhão, escavadeira, rocha) | arranque lento, impacto forte, assentamento curto e firme; nunca quica |
| objeto leve (ícone, chip) | arranque rápido, assentamento pequeno |
| atrito alto | assenta rápido · atrito baixo: desliza longe · elástico: overshoot · rígido: para seco |
| gravidade | descer é mais rápido que subir; flutuar é deriva lenta |

Motion graphics não é simulação: usar a intuição física como linguagem. Na FX Minas (exemplo), equipamento
de mina sempre com peso (preset de mola `pesado`, `vocabulario.md`).
