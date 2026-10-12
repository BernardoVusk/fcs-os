---
name: kb-decisao
description: Registra uma decisão de arquitetura, de produto ou de negócio na base de conhecimento do FCS ERP (tipo decisão, com contexto, alternativas, decisão e consequências). Use quando o usuário disser "registra essa decisão", "anota que decidimos", "documenta a escolha", ou /kb-decisao. Também consulte antes de propor mudança em algo já decidido.
allowed-tools: mcp__fcs-erp__kb_decisoes, mcp__fcs-erp__kb_buscar, mcp__fcs-erp__kb_salvar, mcp__fcs-erp__kb_atualizar
---

# Registrar decisão

1. Chame `kb_decisoes` com o módulo em questão para ver se a decisão já existe ou contradiz outra. Se contradizer, mostre as duas e pergunte se a nova substitui a antiga (então atualize a antiga com `kb_atualizar`, status arquivado, motivo "substituída por ...").
2. Monte a decisão:
   - `titulo`: começa com o assunto ("Banco: migrações na raiz aplicadas pela Management API")
   - `estrutura`: `contexto` (o problema), `alternativas` (lista do que foi considerado), `decisao` (uma frase), `consequencias` (o que fica mais fácil, mais difícil, o que precisa revisão)
   - `conteudo`: a mesma coisa em markdown com os detalhes, links e datas
   - `tipo`: decisao; `categoria`: Decisões de negócio ou Desenvolvimento de software; `modulo`; `tags`; `referencia` (spec, plano, commit)
3. Mostre a prévia e espere o "sim".
4. Chame `kb_salvar`. Responda com a rota.

Sem segredo, sem dado pessoal. Texto em português, sem emoji, sem travessão.
