# Princípios: por que mover, antes de como mover

> Camada de intenção de design. Ler na etapa 3 (blueprint), antes de qualquer TIMING.
> Origem: estudo `MOTION_DESIGN_REMOTION_KNOWLEDGE_BASE.md` (2026-09-28), filtrado pelo
> que a casa já mediu. Onde o estudo contradiz medição da casa, a casa ganha e a
> divergência está em `aprendizado.md` (Fontes externas).
>
> **Exemplos da FX Minas.** Caminhos `RemotionFX/...` e `reels-ponto-cego/...` citados aqui são do
> projeto de referência onde a técnica foi provada (grupo FX Minas, marca industrial). No seu
> negócio o equivalente vive em `motion/src/`. Colunas "ex. FX" mostram como essa marca decidiu;
> pra outra marca, decidir pelo feel dela (`vocabulario.md` Feel da marca → vocabulário de movimento).

A ordem certa é **intenção → hierarquia da informação → estratégia de movimento →
timing → easing → composição → código → QA → refino**. Nunca começar pelo preset
("que animação uso no título?"). Começar pelo evento visual ("o que a pessoa precisa
perceber aqui, e em que ordem?").

---

## 1. As perguntas antes do código

Responder por cena, por escrito, no blueprint:

1. **Propósito** da cena em uma frase (gancho, explicar, provar, comparar, chamar).
2. **O que o olho vê primeiro?** É o que a cena quer que ele veja?
3. **O que se move** e **o que fica estável** (texto em leitura fica parado; o ambiente,
   não).
4. **Movimento dominante** (um só) e **secundários**.
5. **Onde cai o evento semântico:** palavra da locução, batida da música, número que
   aparece. Cada um vira um frame no TIMING e, se nomeia informação, um zoom de
   destaque (`receitas.md`).
6. **O que acontece antes, durante e depois** da ação principal (antecipação, ação,
   assentamento, hold).
7. **Físico ou gráfico?** Máquina e caminhão pedem peso plausível (`efeitos-e-estilos.md`
   §massa). Grafismo e tipo podem ser estilizados.

Se um movimento não tem função (dirigir atenção, hierarquizar, explicar mudança,
causalidade, relação espacial, continuidade, ritmo, antecipação, emoção, revelar,
transicionar, dar profundidade), reduzir ou tirar.

---

## 2. Hierarquia de movimento: primário, secundário, terciário

O movimento também tem hierarquia. Mapeia direto nas três camadas da
`doutrina-fluidez.md`:

| nível | camada da casa | exemplos | amplitude / contraste / velocidade |
|---|---|---|---|
| **primário** | narrativa | título, número, desenho principal, zoom de destaque | a maior da cena |
| **secundário** | detalhe / follow-through | subtítulo, ícone, régua, chip, sublinhado | média, entra depois |
| **terciário** | ambiente | lâminas, grade, deriva de foto, pulso de fundo | pequena, linear, contínua |

**Reconciliação com "nenhum segundo parado":** o estudo diz "não anime tudo". A casa
diz "nenhum segundo parado". Os dois valem juntos: a hierarquia controla a
**amplitude**, não a presença. O terciário existe o tempo todo, mas nunca com a mesma
amplitude, velocidade ou contraste do primário. Se todos os níveis se mexem com a
mesma força, a hierarquia colapsa e nada é importante.

Conferência rápida no portão (c): num still do meio de cada cena, dá pra dizer em 1
segundo qual é o elemento primário? Se não, reduzir o secundário e o terciário.

---

## 3. Unidade e variedade

**Unidade:** os elementos de uma peça parecem do mesmo sistema. Mesma família de curva
por papel (`vocabulario.md`), mesma lógica de direção, mesma escala de duração, mesma
linguagem de câmera. Um card entrando de lado quando todos sobem precisa de motivo.

**Variedade:** unidade não é igualdade. Variar direção, atraso, amplitude, tipo de
entrada, profundidade. Mas sempre subordinado ao sistema.

Bom: título entra da esquerda, subtítulo sobe pouco, ícone escala, fundo deriva.
Ruim: título voa, subtítulo gira, ícone quica, fundo rota, câmera zoom, partículas
explodem, glitch, tudo ao mesmo tempo.

**Motivos de movimento** (motion motifs): numa peça, cada tipo de informação tem o seu
gesto, repetido. Ex. da FX: número importante = contador expo-out + zoom de destaque;
rótulo técnico = linha que se desenha + rótulo que sobe; emenda = varredura diagonal
com aresta acesa. Repetir o motivo é o que faz a peça parecer marca.

---

## 4. Os 12 princípios, traduzidos pra motion graphics

| princípio | como vale em motion | onde a casa já trata |
|---|---|---|
| squash & stretch | sutil, em ícone, botão, chip, pop de texto. Tipografia de marca não se deforma | `vocabulario.md` Transformação (skew 2–6° por velocidade) |
| antecipação | recuo curto antes da ação: 3–8px ou escala 0,96, 2–3f. Obrigatória quando a ação é rápida | `reconstruir-remotion.md` |
| encenação (staging) | um foco por vez, espaço negativo, fundo não compete, câmera aponta pro foco | `vocabulario.md` Foco |
| pose a pose | pensar em estados: A → antecipação → ação → overshoot → assenta → hold | TIMING `ELEMENTO_FASE` |
| follow-through | as partes param em frames diferentes: card 30, sombra 33, ícone 34, brilho 37 | `reconstruir-remotion.md` (2–4f) |
| ação sobreposta | elementos não começam nem param juntos | `doutrina-fluidez.md` Sobreposição (50–70%) |
| slow in / slow out | quase nada importante é linear; linear só pra deriva, progresso, desenho técnico constante | `vocabulario.md` papéis |
| **arco** | trajetória levemente curva pra objeto, câmera, partícula, ícone que "voa". Não em UI que só troca de lugar. Implementar com x linear e y por seno, ou interpolando os dois com curvas diferentes | novo aqui |
| ação secundária | reforça a primária sem roubar: sublinhado desenha, brilho, som de impacto | camada de detalhe |
| timing | define peso, urgência, importância. Objeto pesado: aceleração lenta, assentamento forte. UI leve: rápido | `efeitos-e-estilos.md` massa |
| **exagero** | um pouco maior, um pouco mais de overshoot, um pouco mais rápido, pra LER melhor. Nunca virar ruído. Teto de overshoot em `vocabulario.md` | novo aqui |
| apelo | vem de tipo, forma, cor, espaço, timing, composição. Não de efeito | identidade da marca |

---

## 5. Movimento com significado (semântica)

O movimento descreve o que a informação é:

| informação | gesto |
|---|---|
| aumento | sobe, cresce, barra sobe |
| queda | desce, encolhe |
| revelar | máscara, varredura, escala |
| conexão / causa | linha que se desenha de A pra B |
| procurar / inspecionar | varredura, scan |
| carregar / avançar | barra de progresso |
| transformação | morph (`dados-e-tecnico.md`) |
| deslocamento real | translate na direção do mundo (caminhão anda pra frente) |
| crescimento | escala, barra |
| fluxo | ponto correndo pelo traço, partícula no caminho |
| comparação | separação espacial, tela dividida |
| tempo / cronologia | progressão horizontal esquerda → direita |
| lugar | pan de mapa + marcador que pulsa |

**Direção consistente:** se a informação flui da esquerda pra direita, revelar, desenhar
e fazer pan nessa direção. Quebrar a direção sinaliza reversão, conflito ou
interrupção, e só de propósito.

---

## 6. Densidade de informação e hold

- **Mais informação na tela pede:** coreografia mais lenta, hierarquia mais forte, menos
  movimento simultâneo, mais tempo de leitura.
- **Menos informação permite:** movimento mais rápido, impacto maior, experimentar.
- **Hold é parte da animação:** depois de um reveal grande, de um número, de um título,
  de um movimento de câmera, segurar. O hold da casa não é tela parada: o texto fica
  imóvel e legível (piso de 24f) enquanto o terciário segue vivo (`doutrina-fluidez.md`).
- **Ritmo por contraste:** rápido → lento, pequeno → grande, silêncio → impacto, cheio →
  vazio, perto → longe. Se toda tomada tem a mesma duração, o ritmo fica mecânico:
  alternar blocos curtos (8–12f) com um hold longo (30f+).

---

## 7. Árvore de decisão por elemento

1. Qual é o papel do elemento?
2. É primário, secundário ou terciário?
3. Qual a ação semântica dele (tabela §5)?
4. De onde vem (direção coerente com a composição)?
5. O que acontece antes de chegar (antecipação)?
6. Como assenta (curva por papel, overshoot ou não)?
7. Sobrepõe outra animação? Com quanto?
8. Precisa de motion blur (só se for rápido e não for texto)?
9. Precisa sincronizar com som ou palavra?
10. Pede movimento de câmera (e qual é o alvo)?
11. O movimento melhora a compreensão?
12. Dá pra simplificar?

---

## 8. Perguntas de revisão final (portão c)

Olhar os stills com estas perguntas, não só procurar erro de layout:

1. O que a pessoa vê primeiro? É o que devia?
2. O que se move primeiro, e por quê? E depois?
3. Tem movimento sem função?
4. Timing lento demais ou rápido demais pra ler?
5. A curva combina com o feel da marca?
6. A tipografia tem hierarquia?
7. Legenda legível sobre o fundo?
8. A câmera tem alvo? A transição tem motivo?
9. O gráfico explica o dado?
10. O 3D comunica algo que o 2D não comunicaria?
11. Os secundários estão subordinados?
12. Tem hold suficiente depois de cada informação?
13. O som reforça os momentos certos?
14. O último quadro parece intencional?
15. Dá pra tirar algum efeito sem perder comunicação? Se sim, tirar.

**Clareza vence espetáculo.** O objetivo desta skill não é mais animação, é animação
melhor: mais clara, intencional, hierárquica, rítmica, legível e consistente.
