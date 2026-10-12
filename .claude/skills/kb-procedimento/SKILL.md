---
name: kb-procedimento
description: Transforma uma solução ou sequência de passos desta conversa em um procedimento operacional padrão na base de conhecimento do FCS ERP. Use quando o usuário disser "vira procedimento", "documenta como fazer", "cria o passo a passo", "transforma em POP", ou /kb-procedimento.
allowed-tools: mcp__fcs-erp__kb_buscar, mcp__fcs-erp__kb_salvar, mcp__fcs-erp__kb_atualizar, mcp__fcs-erp__kb_obter
---

# Transformar em procedimento

1. Chame `kb_buscar` com o tema e `tipo` procedimento. Se já existir, proponha atualizar com `kb_atualizar` e `motivo`.
2. Escreva o procedimento em markdown, nesta ordem:
   - **Quando usar**: a situação que dispara o procedimento
   - **Pré-requisitos**: material, ferramenta, acesso
   - **Passos**: numerados, um verbo por passo, com valores concretos (temperatura, tempo, caminho de arquivo, comando)
   - **Como verificar**: o que confirma que deu certo
   - **Se der errado**: os erros comuns e o que fazer
3. `tipo`: procedimento; `categoria`: Procedimentos operacionais (ou Impressão 3D, Perfis de impressão quando for de máquina); `tags`; `modulo`; `referencia`.
4. Mostre a prévia e espere o "sim". Chame `kb_salvar` e responda com a rota.

Sem segredo, sem dado pessoal. Texto em português, sem emoji, sem travessão.
