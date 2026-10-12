---
name: kb-salvar
description: Salva um conhecimento desta conversa na base do FCS ERP pelo servidor MCP fcs-erp, de forma intencional e revisada. Use quando o usuário disser "salve isso na base", "registre essa solução", "guarda esse procedimento", "anota essa descoberta", ou /kb-salvar.
allowed-tools: mcp__fcs-erp__kb_buscar, mcp__fcs-erp__kb_salvar, mcp__fcs-erp__kb_atualizar, mcp__fcs-erp__kb_obter
---

# Salvar na base de conhecimento

Captura é intencional: só grava o que o usuário mandou gravar, depois de mostrar a prévia.

1. Identifique o trecho da conversa que vira conhecimento. Monte:
   - `titulo` (3 a 160 caracteres, específico: "PETG na Ender 3 descolando da mesa: causa e correção")
   - `resumo` (uma ou duas frases, até 400 caracteres)
   - `conteudo` em markdown: contexto, o que foi feito, resultado, como verificar. Use passos numerados quando for procedimento.
   - `tipo`: procedimento, solucao, decisao, referencia, perfil_impressao ou nota
   - `categoria`: nome de uma categoria do escopo conhecimento do ERP (Impressão 3D, Materiais e filamentos, Perfis de impressão, Soluções para falhas, Custos e formação de preço, Processos internos, Marketing e vendas, Desenvolvimento de software, Decisões de negócio, Procedimentos operacionais, Fornecedores)
   - `tags` (até 20, minúsculas), `modulo` (área do ERP ou da operação), `referencia` (arquivos, commit, data da conversa)
2. Remova qualquer chave, token, senha, e-mail de cliente ou dado pessoal. O servidor recusa texto com padrão de segredo; não tente contornar.
3. Chame `kb_buscar` com o título. Se houver registro parecido, pergunte se é para atualizar (então use `kb_atualizar` com `motivo`) ou criar outro.
4. Mostre a prévia (título, tipo, resumo, tags) e espere o "sim" do usuário.
5. Chame `kb_salvar`. Responda com a rota devolvida (`/conhecimento/<id>`) e peça para validar na tela quando tiver certeza.

Texto em português, sem emoji, sem travessão.
