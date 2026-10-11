# saidas/ — outputs gerais do VuskVS

Pasta pra qualquer output que não é marketing puro (não cabe em `marketing/`).

## O que vai aqui

- **Análises** de `/analisar-dados` — resumos executivos de CSV/XLSX/PDF
- **Emails** rascunhados por `/email-profissional`
- **Auditorias** de `/auditoria-seguranca` — relatórios de vulnerabilidade
- **Relatórios diversos** que não são de ads
- **Documentos** que skills geram e você precisa enviar/imprimir/anexar

## Estrutura sugerida

```
saidas/
├── analises/        relatórios de /analisar-dados
├── emails/          rascunhos de /email-profissional
├── seguranca/       auditorias de /auditoria-seguranca
└── outros/          qualquer coisa solta
```

> `saidas/seguranca/` costuma descrever falhas ainda abertas. Se o repositório
> for público ou compartilhado, mantenha essa pasta fora do git — um relatório
> de auditoria é um mapa pronto pra quem quiser atacar o sistema.

Skills sabem onde salvar — você não precisa criar subpasta manualmente. Se uma skill perguntar onde salvar, vai propor aqui.

## Por que separar de `marketing/`?

`marketing/` é histórico vivo do trabalho de marketing — peças, campanhas, SEO acumulado.

`saidas/` é "coisa pontual gerada hoje" — relatório que você manda pro cliente e nunca mais olha, rascunho de email que copia e cola no Gmail.

A divisão importa pra `/salvar` (commit) e pra clareza ao navegar a pasta.
