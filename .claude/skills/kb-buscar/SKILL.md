---
name: kb-buscar
description: Pesquisa a base de conhecimento do FCS ERP pelo servidor MCP fcs-erp. Use quando o usuário perguntar "o que já documentamos sobre X", "temos procedimento para Y", "qual foi a decisão sobre Z", ou antes de propor mudança de arquitetura, perfil de impressão ou processo. Também /kb-buscar <termo>.
allowed-tools: mcp__fcs-erp__kb_buscar, mcp__fcs-erp__kb_obter, mcp__fcs-erp__kb_decisoes
---

# Buscar na base de conhecimento

1. Extraia o termo da pergunta (ou use o argumento). Se o assunto for decisão de arquitetura ou de negócio, chame também `kb_decisoes` com o módulo provável.
2. Chame `kb_buscar` com `termo` e, se fizer sentido, `tipo` (procedimento, solucao, decisao, referencia, perfil_impressao, nota) ou `tags`.
3. Mostre no máximo 8 resultados: título, tipo, resumo e a rota (`/conhecimento/<id>`). Sem resultado, diga que a base não tem nada sobre o tema e ofereça `/kb-salvar` quando houver conteúdo na conversa.
4. Se o usuário quiser o conteúdo completo, chame `kb_obter` com o id e apresente o markdown, sem reescrever.
5. Nunca invente conteúdo que não veio da base. Se o servidor recusar por escopo ou token, diga qual foi a mensagem e aponte para Configurações > Integrações no ERP.

Texto em português, sem emoji, sem travessão.
