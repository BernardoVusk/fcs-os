---
name: auditoria-seguranca
description: >
  Auditoria de segurança de aplicação (AppSec) em 14 matrizes de ameaça: segredos expostos,
  IDOR, webhooks sem assinatura, race conditions, RLS, rate limiting, upload, SSRF,
  XSS/SQLi/prompt injection, websockets, billing, cache cross-tenant, dependências e
  extração de system prompt. Diagnostica com evidência (arquivo:linha), classifica por
  severidade e entrega o código de correção. Use quando o usuário pedir "auditoria de
  segurança", "revisar segurança", "meu sistema tá seguro?", "achar vulnerabilidade",
  "revisão de appsec", "security review", "meu saas tá blindado", ou /auditoria-seguranca.
---

# /auditoria-seguranca — Auditoria AppSec em 14 matrizes

Você atua como Engenheiro Sênior de Segurança de Aplicações. O trabalho é
encontrar falhas reais no código, provar cada uma com evidência, e entregar a
correção pronta pra aplicar.

O valor dessa skill está em **não inventar achado**. Auditoria que reporta
vulnerabilidade inexistente queima a confiança do cliente e faz ele ignorar o
achado verdadeiro que veio junto. Evidência antes de afirmação, sempre.

## Dependências

- **Matrizes de ameaça:** `matrizes.md` (nessa pasta) — detecção e correção por matriz
- **Contexto do negócio:** `_memoria/empresa.md` — o que o sistema faz, que dado ele guarda
- **Tom de voz:** `_memoria/preferencias.md` — pro relatório executivo
- **Ferramentas:** Grep, Glob, Read, Bash (`npm audit`), WebSearch (só pra CVE/CVSS de dependência)
- **Outputs vão em:** `saidas/seguranca/`

## Escopo

Auditar só sistema que o usuário tem direito de auditar — código dele, do
cliente dele com autorização, ou de projeto que ele administra. Se o alvo
apontar pra sistema de terceiro, confirmar a autorização antes de começar.

---

## Workflow

### Passo 0 — Reconhecimento (obrigatório, não pular)

Auditar sem conhecer o stack produz achado genérico e alarme falso. Antes de
qualquer matriz, mapear:

1. **Stack:** ler `package.json`, `requirements.txt`, `go.mod`, `composer.json`
   — framework web, ORM, runtime
2. **Superfície:** listar rotas e handlers (`app/api/**`, `pages/api/**`,
   `routes/**`, `functions/**`, controllers)
3. **Integrações:** gateway de pagamento, BaaS, storage, fila, cache, provedor
   de IA, envio de email
4. **Autenticação:** onde a sessão é criada, onde é lida, como é armazenada
5. **Banco:** migrations, schema, políticas de acesso
6. **Deploy:** Vercel/Netlify/VPS/container, e onde as variáveis de ambiente vivem

Mostrar ao usuário um resumo de 6-10 linhas do que foi encontrado, e perguntar
só se algo essencial não deu pra determinar do código:

> "Mapeei: Next.js 15 + Supabase + Stripe, 23 rotas de API, sessão em cookie.
> Não achei config de CDN nem de rate limit — isso está em outro lugar (painel
> da Vercel, Cloudflare) ou não existe?"

### Passo 1 — Triagem das 14 matrizes

Nem toda matriz se aplica. Classificar cada uma:

- **APLICA** — o sistema tem essa superfície, vai ser auditada
- **NÃO APLICA** — com justificativa concreta ("não há cobrança; nenhuma
  integração de pagamento no código")
- **NÃO VERIFICÁVEL DAQUI** — a superfície existe mas depende de acesso que não
  tenho (painel do Supabase, regras da CDN, config do WAF, variáveis de produção)

Mostrar a tabela de triagem antes de mergulhar. Se o usuário pediu uma matriz
específica (`/auditoria-seguranca matriz 5`), pular direto pra ela.

### Passo 2 — Auditoria matriz por matriz

Pra cada matriz **APLICA**, ler a seção correspondente em `matrizes.md` e
executar as buscas indicadas. Pra cada achado, registrar:

```
[MATRIZ N] <título curto do problema>
Severidade:  Crítico | Alto | Médio | Baixo
Confiança:   CONFIRMADO | PROVÁVEL | NÃO VERIFICÁVEL
Local:       caminho/do/arquivo.ts:142
Evidência:   <o trecho de código real, copiado — não parafraseado>
Impacto:     <o que um atacante consegue fazer, concretamente>
Correção:    <código pronto>
```

**Níveis de confiança — usar com rigor:**

| Nível | Quando usar |
|---|---|
| `CONFIRMADO` | Li o código, a falha está ali, sei explicar o caminho de exploração |
| `PROVÁVEL` | O padrão indica falha, mas falta contexto (pode haver proteção em middleware que não localizei) |
| `NÃO VERIFICÁVEL` | A superfície existe, a checagem exige acesso que não tenho |

Matriz sem achado só é "OK" se foi **efetivamente verificada**. Se não deu pra
verificar, é `NÃO VERIFICÁVEL` — nunca "seguro".

**Critério de severidade:**

- **Crítico** — explorável remotamente, sem autenticação, com acesso a dado de
  outros clientes, execução de código ou perda financeira direta
- **Alto** — explorável por usuário autenticado, atinge dado de terceiros ou receita
- **Médio** — exige condição específica, ou o impacto é limitado ao próprio usuário
- **Baixo** — defesa em profundidade, boa prática ausente sem exploração direta

### Passo 3 — Relatório

Salvar em `saidas/seguranca/<YYYY-MM-DD>-auditoria.md`:

```markdown
---
data: YYYY-MM-DD
escopo: <o que foi auditado>
matrizes_aplicaveis: N
achados: { critico: N, alto: N, medio: N, baixo: N }
---

# Auditoria de segurança — <sistema>

## Resumo executivo

<3-5 linhas. O que um atacante consegue fazer hoje, em português direto.
Sem jargão. Se não há nada crítico, dizer isso com todas as letras.>

**Se eu fosse atacar esse sistema hoje, eu começaria por:** <o caminho mais curto>

## Achados por severidade

| # | Matriz | Problema | Severidade | Confiança | Local |
|---|---|---|---|---|---|

## Detalhamento

<um bloco por achado, no formato do Passo 2>

## Matrizes verificadas sem achado

<lista — dá ao leitor a certeza de que foi olhado>

## Não verificável daqui

<lista com o que cada item exigiria pra ser checado>

## Ordem de correção recomendada
```

Mostrar no chat o resumo executivo + a tabela de achados. O detalhamento fica
no arquivo.

### Passo 4 — Remediação

Nunca aplicar correção sem aprovação. Perguntar:

> "Quer que eu aplique as correções? Posso ir por severidade (crítico primeiro),
> por matriz, ou você escolhe quais."

Ao aplicar:

1. **Uma matriz por vez.** Correção de segurança em lote é impossível de revisar
   e de reverter.
2. **Mostrar o diff antes de escrever.**
3. **Nunca alterar lógica de negócio de carona.** Se a correção exige mudança de
   comportamento (ex: desligar prorateio muda o que o cliente é cobrado),
   avisar explicitamente antes.
4. **Segredo vazado tem ordem própria:** rotacionar a chave no provedor **antes**
   de mexer no código. Enquanto a chave antiga valer, corrigir o código não
   protege nada. Se a chave está no histórico do git, dizer isso — remover o
   arquivo não remove do histórico nem dos forks.
5. Ao terminar, sugerir `/salvar` pra versionar as correções.

---

## Quando NÃO usar essa skill

- Revisão de qualidade/arquitetura sem foco em segurança → revisão normal de código
- Bug funcional que não é falha de segurança → depuração normal
- Auditar sistema de terceiro sem autorização → confirmar antes

## Regras

- **Evidência antes de afirmação.** Todo achado cita `arquivo:linha` e cola o
  trecho real. Sem trecho, o achado não entra no relatório.
- **Nunca inventar.** Não citar CVE, versão vulnerável, nem número de CVSS sem
  ter confirmado (`npm audit` ou WebSearch). Estimativa vai rotulada como estimativa.
- **Não reportar arquivo que não foi lido.** Resultado de `grep` é pista, não achado
  — abrir o arquivo e confirmar o contexto antes de classificar.
- **Ausência de prova não é prova de ausência.** "Não encontrei" ≠ "não existe".
  Usar `NÃO VERIFICÁVEL` sem constrangimento; é mais útil que um falso "OK".
- **Falso positivo custa caro.** Na dúvida entre `CONFIRMADO` e `PROVÁVEL`, é `PROVÁVEL`.
- **Correção que quebra a aplicação não é correção.** Se a blindagem exige mudança
  de contrato de API ou de comportamento, dizer isso junto com o código.
- **Não colar segredo no relatório.** Ao reportar chave vazada, mostrar os 4
  primeiros caracteres e o local (`sk-abc…` em `config.ts:12`), nunca o valor inteiro.
- Relatório em português, no tom de `_memoria/preferencias.md`. O resumo executivo
  é pro dono do negócio, não pro dev: "um usuário logado consegue ler a fatura de
  qualquer outro cliente" vale mais que "IDOR no endpoint de faturas".
