# Domínio

Regras de negócio puras: custos, preços, estoque, financeiro, planejamento. Sem React, Next ou Supabase (o lint bloqueia). Cada função recebe valores simples e devolve valores simples; a camada `acoes/` traduz entre banco e domínio. Toda fórmula tem teste ao lado e está documentada em `docs/formulas-de-custo.md` ou `docs/regras-de-negocio.md`. Nesta fase a pasta só tem constantes de configuração: as regras chegam a partir da Fase 3.
