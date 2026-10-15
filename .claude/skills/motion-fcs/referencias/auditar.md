# Auditar peça existente

> Para quando o usuário diz "melhorar a fluidez", "auditar motion", "refazer a animação",
> ou "ficou estranho mas não sei o quê". Reúne os PROMPTs 6 e 7 do
> `claude-motion-prompts_1.md`.

## Auditoria de fluidez (o caso comum)

Não precisa de referência. É diagnóstico mecânico.

```bash
node ../.claude/skills/motion-fcs/scripts/fluidez.mjs out/<peca>.mp4
```

Ler o veredito e o gráfico. Cruzar os trechos mortos apontados com o `TIMING` da
composição: cada trecho morto é uma faixa de frames onde nenhuma batida está rodando e o
ambiente é sub-pixel ou inexistente.

Correção pela regra que falhou — ver `doutrina-fluidez.md`, seção "Quando o fluidez.mjs
reprova". Resumo:

| falhou | causa provável | correção |
|---|---|---|
| Regra 1 | lacuna entre batidas | sobrepor a batida vizinha para dentro da faixa |
| Regra 2 | falta a camada de ambiente | adicionar elemento que se desloca vários px/frame |
| Regra 3 | última batida acaba cedo | fechar com saída, selo final, ou puxar a última batida |

**Nunca corrigir aumentando a duração das transições existentes.** Isso deixa a peça lenta
em vez de fluida.

Depois de corrigir, re-renderizar e rodar de novo. Só entregar aprovado.

---

## Diff de motion contra referência

Quando existe referência e a peça roda, mas a **sensação** está errada.

Reunir a spec extraída e o código atual, e produzir a comparação:

| aspecto | referência | meu código | impacto perceptual |
|---|---|---|---|

Classificar cada divergência:

- **CRÍTICA** — muda a sensação: easing errado, ordem trocada, stagger ausente,
  sobreposição virou sequência
- **IMPORTANTE** — perceptível mas tolerável
- **COSMÉTICA** — ninguém nota

Propor correção **só para as CRÍTICAS**, e dizer qual **uma** mudança tem o maior impacto
pelo menor esforço.

Ordem típica de impacto, da maior para a menor: sobreposição ausente → stagger ausente →
easing errado → duração errada → deslocamento errado.

---

## Auditoria de identidade

Renderizar 4 a 6 stills e conferir contra `motion/src/marca/` (gerado a partir de
`identidade/design-guide.md`):

- Cor de marca exata, nos papéis certos. Se estiver puxando pra outro tom, é opacidade
  sobre fundo escuro (`aprendizado.md` E2)
- Tipografia da marca nos papéis certos (título, corpo, etiqueta)
- Nenhuma cor fora da paleta de `motion/src/marca/cores.ts`
- Formas seguindo o estilo geral de `identidade/design-guide.md` (cantos, traço, etc.)
- Frame 2 com algo em quadro (`aprendizado.md` E3)
- Nenhum salto de layout entre frames vizinhos (`aprendizado.md` E5)
- Antes/depois com os dois lados presentes
- Nenhum número operacional ou dado sensível exposto sem checar `_memoria/preferencias.md`
  e `_memoria/empresa.md` por restrição específica do negócio

---

## Consolidar em sistema (depois de 5 ou 6 referências medidas)

Quando houver massa crítica de specs em `motion/referencias/`, fazer análise de
convergência:

1. Quais durações se repetem? Agrupar em no máximo 5 tokens.
2. Quais curvas de easing se repetem? Agrupar em no máximo 4.
3. Que padrões de coreografia aparecem em mais de uma referência?
4. Onde as referências **discordam** entre si? Nesses pontos, apresentar as opções ao
   usuário em vez de escolher sozinho.

Entregar: tabela de tokens (nome, valor, quando usar) e um objeto TS para
`src/marca/movimento.ts`.

**Não inventar token que não apareça nas specs.** Se faltar cobertura para um caso de uso
comum, apontar a lacuna em vez de preencher. E atualizar `vocabulario.md` com o que se
confirmar.
