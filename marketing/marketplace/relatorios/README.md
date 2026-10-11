# Relatórios de marketplace

Saída semanal da skill `/marketplace`. Um arquivo por semana: `<YYYY-MM-DD>-relatorio.md`.

Cada relatório abre com frontmatter YAML fechando os números da semana:

```yaml
---
periodo_inicio: YYYY-MM-DD
periodo_fim: YYYY-MM-DD
faturamento_total: 0000.00
faturamento_shopee: 0000.00
faturamento_mercadolivre: 0000.00
faturamento_tiktokshop: 0000.00
unidades_total: 0
conversao_media: 0.00
investimento_ads: 0000.00
canais: [shopee, mercado-livre, tiktok-shop]
---
```

O frontmatter existe pra que a comparação da semana seguinte seja leitura de arquivo, não garimpo no corpo do texto.

Não apagar relatório antigo. A série é o que transforma número solto em tendência.

A auditoria inicial, mais longa que o relatório semanal, fica nesta mesma pasta como `<YYYY-MM-DD>-auditoria.md`.
