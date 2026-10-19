# Guia de configuração: Grupos de Ofertas

Este guia mostra o que configurar, onde e em que ordem, para o módulo Grupos de Ofertas do FCS ERP. Descreve só o que existe no sistema em 18/10/2026. Nenhuma credencial real aparece aqui: onde houver valor, o guia diz de onde copiar.

Menu: **Grupos de Ofertas**, com Painel de ofertas, Gerar oferta, Publicar, Filas, Copiador, Cupons, Modelos de mensagem, Grupos, Números de WhatsApp, Integrações de afiliados (só o dono), Relatórios de ofertas e Histórico de envios.

## 1. O que funciona sem configurar nada

Sem nenhuma integração e sem worker, o módulo já opera no **modo assistido**:

1. Cadastre seus grupos em **Grupos** (seção 5).
2. Em **Gerar oferta**, cole a URL do produto, preencha os dados à mão e cole o link de afiliado que você gerou no portal da plataforma.
3. Clique em **Publicar**, escolha os grupos e confirme.
4. Em **Publicar** (menu), cada cartão é uma mensagem pronta para um grupo: **Copiar texto**, publique no WhatsApp e clique em **Marcar como publicado**.

Para uma plataforma aparecer como publicável, a trava de conformidade dela precisa estar liberada (seção 3.5). Até lá, ela só gera rascunho.

## 2. Antes de tudo: chave de cifra

As credenciais da Shopee e da Awin e as sessões do WhatsApp ficam cifradas no banco com a chave `OFERTAS_CHAVE_CRIPTO`. Sem ela, a tela Integrações de afiliados mostra o aviso **Chave de cifra ausente** e nada é salvo.

1. Gere a chave uma vez, no computador:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
2. Coloque o valor em `erp/.env.local` (desenvolvimento) e na Vercel: projeto `fcs-erp` > Settings > Environment Variables > `OFERTAS_CHAVE_CRIPTO`, marcada como Sensitive, em Production e Preview. Depois, faça um novo deploy.
3. Guarde uma cópia fora do computador (cofre de senhas). Sem a chave, as credenciais e as sessões salvas não abrem: seria preciso digitar tudo de novo e reconectar os números.
4. Se o worker for usado, a mesma chave vai para a Fly (seção 6).

Nunca cole a chave, nem nenhum segredo de plataforma, em chat, e-mail ou arquivo do repositório.

## 3. Integrações de afiliados

Tela **Integrações de afiliados** (`/ofertas/integracoes`), só para o dono. Cada plataforma tem um cartão com:

- selo de status: Não configurada, Aguardando autorização, Conectada, Erro, Credencial expirada ou API indisponível;
- selo **Publicação em grupos liberada** ou **Só rascunho**;
- campos de identificador (ficam à vista) e de segredo (marcados "(segredo)", nunca voltam para a tela; quando já salvos, aparecem como "salvo, não é exibido" e podem ficar em branco para manter);
- botões **Salvar e testar**, **Testar conexão** e, com segredo salvo, **Remover credencial**;
- **Testar conversão de link**: cole a URL de um produto, clique em **Converter** e abra o link gerado para conferir no seu painel de afiliado se a atribuição aparece. Esse teste não grava nada;
- listas **O que a plataforma permite**, **Aprovações externas** e **Documentação oficial**;
- a trava **Canal WhatsApp no programa** (seção 3.5).

"Conectada" só aparece depois que a plataforma aceita uma chamada real.

### 3.1 Shopee

Precisa, fora do sistema:

- conta de afiliado Shopee aprovada;
- acesso à Open API liberado no portal de afiliados (pedido por formulário, resposta por e-mail);
- grupos de WhatsApp cadastrados como Mídia de Afiliado (Termos, cláusula 1.3).

Na tela:

| Campo | De onde vem |
|---|---|
| AppID da Open API | Portal de afiliados Shopee > Open API. Só números |
| Secret da Open API (segredo) | Mesma página do AppID |

Com a Open API conectada, o sistema gera o link curto oficial com sub IDs (`g` + 8 caracteres do grupo, `c` + campanha, `o` + 8 caracteres da oferta), busca nome, imagem, preço e nota do produto e importa conversões por sub ID em Relatórios.

Sem a Open API (ou enquanto a aprovação não sai): gere o link no portal da Shopee e cole no campo **Link de afiliado colado** da oferta. O sistema marca como "colado, não verificado". Os dados do produto ficam para preencher à mão.

Links em massa: no portal, Oferta de Produto > selecione os produtos > Obter Link. O CSV baixado entra numa fila (seção 8). Cupons da Shopee não têm API para afiliados: cadastro manual ou CSV (seção 9).

### 3.2 Mercado Livre

Não há API de links nem de dados de produto para afiliados. O que existe no sistema:

- **Etiqueta padrão** (opcional): o nome da etiqueta criada no portal de afiliados para este canal, só como referência;
- link sempre gerado no portal (gerador de links ou Compartilhe e ganhe) e colado na oferta. Sem link colado, a oferta do Mercado Livre não publica;
- relatórios importados por arquivo (seção 10).

Os termos proíbem encurtador e redirecionador próprio (1.8 e 1.10), e o sistema não usa nenhum dos dois. Grupo de WhatsApp é permitido quando é público e foi informado no cadastro; disparo massivo e base de contatos comprada são proibidos (7.3).

### 3.3 Amazon

| Campo | De onde vem |
|---|---|
| ID de associado (tag) | Associates Central, canto superior direito. No Brasil termina em `-20` |

O link é a URL do produto com o parâmetro `tag`. Para separar as vendas por grupo, crie IDs de rastreamento no Associates Central e informe em cada grupo, no campo **ID de rastreamento Amazon** (seção 5); o grupo sem ID usa a tag da integração.

Dados do produto são sempre digitados: a Creators API exige 10 vendas em 30 dias e não está ligada no sistema. A imagem da Amazon não é guardada (a política proíbe): use imagem própria ou publique sem imagem. O modelo da Amazon exige `{{atualizado_em}}` fora de seção, porque a política pede data e hora junto do preço; preço com mais de 24 horas não sai.

A trava da Amazon nasce fechada. A política não autoriza grupos de WhatsApp de forma explícita e só aceita links em mensagens solicitadas pelo destinatário. Só registre a liberação depois de ter a confirmação do suporte de Associados por escrito.

### 3.4 Awin

Precisa, fora do sistema: conta de publisher aprovada e parceria aceita por cada anunciante. Leia os termos de cada anunciante na Awin: alguns proíbem cupom, mensageria ou palavra-chave da marca.

| Campo | De onde vem |
|---|---|
| Publisher ID | Número da sua conta de publisher, no topo do painel da Awin |
| Token da API (segredo) | ui.awin.com/awin-api > digite a senha > Show my API token. Exige usuário Admin |

**Testar conexão** também sincroniza os anunciantes com parceria. Uma URL de loja só é reconhecida como Awin se o domínio for de um anunciante sincronizado; anunciante novo exige testar a conexão de novo.

Com a Awin conectada, o sistema gera link pelo Link Builder (curto `tidd.ly` oficial) com clickref (`g` grupo, `o` oferta, `c` campanha), sincroniza cupons da Promotions API (região BR) e importa comissões da Transactions API, até 31 dias por vez. Dados de produto da Awin são digitados: os feeds variam por anunciante e não foram ligados.

### 3.5 Trava "Canal WhatsApp no programa"

Cada plataforma só publica em grupos depois que o dono registra, no cartão dela, **Como o canal foi cadastrado ou confirmado** (de 3 a 500 caracteres; ex.: "grupos cadastrados como Mídia de Afiliado em 18/10/2026; protocolo do suporte") e clica em **Registrar e liberar publicação**. O registro guarda data e quem fez.

Com a trava fechada, a oferta fica como rascunho, a fila não ativa com itens dessa plataforma e a mensagem do copiador dessa plataforma não é publicada (fica como falha, motivo "Plataforma sem canal liberado"). **Bloquear publicação** fecha de novo.

## 4. Modelos de mensagem

Tela **Modelos de mensagem**. Já vêm três modelos padrão: Oferta padrão, Oferta Amazon e Cupom padrão. A oferta usa o modelo escolhido nela; sem escolha, o padrão da plataforma; sem ele, o padrão geral do tipo.

No editor: **Nome**, **Tipo** (Oferta de produto ou Cupom), **Plataforma** (Qualquer ou uma delas), **Texto do modelo** (até 4.000 caracteres) e **Usar como padrão deste tipo e plataforma**. A prévia usa dados de exemplo.

| Variável | O que entra |
|---|---|
| `{{produto}}` | Nome do produto |
| `{{preco_atual}}` | Preço atual confirmado ("a partir de" quando há variações) |
| `{{preco_anterior}}` | Preço anterior, só quando uma fonte confirmou |
| `{{desconto}}` | Percentual de desconto informado pela fonte |
| `{{preco_pix}}` | Preço no Pix, só quando a fonte informou |
| `{{parcelamento}}` | Parcelamento, só quando a fonte informou |
| `{{avaliacao}}` | Nota e quantidade de avaliações |
| `{{loja}}` | Loja ou anunciante |
| `{{cupom}}` | Código do cupom vinculado |
| `{{cupom_beneficio}}` | Benefício do cupom |
| `{{cupom_regras}}` | Regras e compra mínima do cupom |
| `{{validade_cupom}}` | Data de fim do cupom |
| `{{link}}` | Link de afiliado do grupo |
| `{{marketplace}}` | Nome da plataforma |
| `{{cta}}` | Chamada curta escolhida por você |
| `{{atualizado_em}}` | Data e hora em que o preço foi consultado |

Seção que só aparece quando há dado: `{{#cupom}}Cupom {{cupom}}{{/cupom}}`. Variável fora de seção sem valor bloqueia a publicação. Modelo de oferta precisa de `{{link}}`; de cupom, de `{{cupom}}`. `*negrito*` e `_itálico_` do WhatsApp funcionam.

## 5. Grupos

Tela **Grupos**. Funções: **Destino (nosso grupo)** recebe ofertas; **Teste controlado** recebe testes; **Só monitorado** é só acompanhado; **Sem função**; **Origem autorizada** é grupo de terceiro usado pelo copiador.

**Cadastrar grupo** (dono e operador):

| Campo | Regra |
|---|---|
| Nome do grupo | obrigatório, até 120 caracteres |
| Função | Destino, Teste controlado, Só monitorado ou Sem função |
| Link de convite (opcional) | só `https://chat.whatsapp.com/...`; abre o grupo direto da tela Publicar |
| ID de rastreamento Amazon (opcional) | termina em `-20`; separa as vendas deste grupo |
| Campanha (opcional) | até 60 caracteres; entra no sub ID quando a oferta não tem campanha |
| Observações | até 1.000 caracteres |

Com um número conectado, os grupos dele entram sozinhos, sem função. Se o grupo já existia cadastrado à mão, abra o sincronizado e use **Unir com um cadastro manual**.

**Marcar como origem** é só do dono e só para grupo sincronizado: registre quem autorizou o uso do grupo e como (mensagem, contrato, e-mail), com pelo menos 10 caracteres. **Retirar origem** para as automações do copiador desse grupo.

Métricas do grupo (tela do grupo e **Comparar marcados**, até 12): membros no início e no fim, entradas e saídas observadas, saldo, variação líquida e taxa de evasão. Só existem para grupos sincronizados, a partir do início da coleta; período com lacuna de coleta aparece como parcial. **Visualizações** aparecem sempre como "Não disponível pela integração".

## 6. WhatsApp: números e worker

### 6.1 Sem worker

O modo assistido (seção 1) funciona sempre. A tela **Números de WhatsApp** mostra "O worker ainda não foi implantado" até o worker subir.

### 6.2 Com worker (envio automático, coleta de grupos e copiador)

Leia antes: a conexão por QR Code usa uma biblioteca não oficial (Baileys). Os termos do WhatsApp proíbem uso não pessoal e mensagens automáticas, e o número pode ser suspenso ou banido a qualquer momento. Nenhum intervalo ou limite garante proteção contra bloqueio. Use só um número dedicado que a empresa aceite perder.

1. Publique o worker na Fly.io seguindo `erp/docs/implantacao.md`, seção "Worker do WhatsApp na Fly.io". Ele precisa de `OFERTAS_WORKER_DB_URL` (gerada por `node ferramentas/papel-worker.mjs --alvo dev`), `OFERTAS_CHAVE_CRIPTO` e `SUPABASE_URL`.
2. Em **Números de WhatsApp** (só o dono): **Adicionar número**.

   | Campo | Regra |
   |---|---|
   | Nome do número | até 60 caracteres, ex.: "Ofertas 1 (chip dedicado)" |
   | Telefone (opcional) | DDD e número; só para conectar por código |
   | Por hora | 1 a 200, padrão 20 |
   | Por dia | 1 a 2.000, não menor que por hora, padrão 120 |
   | Intervalo mínimo (s) | 20 a 3.600, padrão 90 |
   | Envia a partir de / Até | HH:MM, padrão 08:00 às 22:00, sem passar da meia-noite |

   Marque **Li, entendo o risco e vou usar um número dedicado.** O aceite fica registrado com a versão do texto (2026-10-18).
3. **Conectar por QR Code**: no celular do número, WhatsApp > Aparelhos conectados > Conectar aparelho. Ou **Conectar por código** (exige o telefone cadastrado): Conectar aparelho > Conectar com número de telefone, e digite o código.
4. Com o número conectado, **Sincronizar grupos**. Os grupos aparecem em Grupos, sem função.
5. Marque um grupo como **Teste controlado** e use **Enviar teste**.

Outros botões: **Limites** (dono), **Desconectar** (a sessão é encerrada, o cadastro fica), **Remover** (sessão encerrada e apagada; grupos e histórico ficam) e **Renovar aceite** (quando o texto do risco mudar). Número desconectado não perde nada: os envios ficam esperando e um alerta abre.

## 7. Gerar e publicar oferta

Tela **Gerar oferta**: cole a URL e clique em **Analisar**. O sistema identifica a plataforma e o produto, avisa se a trava está fechada, se o produto já foi ofertado nos últimos 7 dias e se os dados estão com mais de 24 horas.

Cada campo do produto mostra a fonte ("Open API da Shopee", "Arquivo CSV do portal da Shopee", "Digitado por você") ou "não informado". Só o nome é obrigatório. Campos extras: link colado (obrigatório no Mercado Livre), cupom vinculado (só da mesma plataforma e vigente), modelo, chamada, campanha (vira sub ID), imagem própria (PNG, JPG ou WEBP até 5 MB) e texto desta postagem.

**Salvar rascunho**, depois **Publicar**: escolha até 50 grupos e, se quiser, o horário (São Paulo). A publicação avulsa é sempre manual: aparece em **Publicar**. Para sair pelo número, use uma fila (seção 8) ou o copiador.

## 8. Filas

Tela **Filas** > **Nova fila**:

| Campo | Regra |
|---|---|
| Nome da fila | até 80 caracteres |
| Remetente | Manual (modo assistido) ou um número |
| Modelo de mensagem | o da oferta, senão o padrão, ou um modelo escolhido |
| Intervalo entre postagens (min) | 1 a 1.440, padrão 15 |
| Primeira postagem (opcional) | vazio = assim que ativar |
| Posta a partir de / Até | padrão 08:00 às 22:00 |
| Envio manual expira em (h) | 1 a 72, padrão 6 |
| Recomeçar a lista todo dia | uma rodada por dia |

Na fila: **Grupos e configuração** para escolher os destinos; **Itens** para colar até 30 links por vez ou **Importar CSV da Shopee** (coluna Offer Link obrigatória; Product Name e Price entram quando existem; até 500 linhas). Itens sem nome precisam ser completados em Gerar oferta.

**Ativar fila** valida tudo antes: grupo de destino, trava da plataforma, cupom vigente, link (colado ou conversão disponível) e dados do modelo. Com qualquer problema, nada é ativado e a lista mostra o quê.

Na aba **Falhas e incertos**: "Falhou" é envio que não saiu depois de 3 tentativas (1, 5 e 15 minutos) ou sem link de afiliado; "Incerto" é envio cujo resultado não se sabe (a mensagem pode ter chegado). Incerto nunca é reenviado sozinho: confira no grupo antes de **Tentar de novo**.

## 9. Cupons

Tela **Cupons**. Shopee, Mercado Livre e Amazon não têm API de cupons para afiliados: o cadastro é manual (**Cadastrar cupom**) ou por **Importar CSV de cupons**. Cupom vencido, pausado ou que ainda não começou não sai em nenhuma mensagem. Sem data de fim, a validade aparece como "não confirmada".

CSV de cupons: separador vírgula ou ponto e vírgula, até 500 linhas, colunas `plataforma` (Shopee, Mercado Livre, Amazon ou Awin), `descricao` (obrigatórias), `codigo`, `beneficio`, `valor_minimo`, `inicio`, `fim` (dd/mm/aaaa ou aaaa-mm-dd), `url` (https) e `regras`. Cupom importado fica com a validade não confirmada até você conferir e editar.

Cupons da Awin: **Sincronizar agora**, e o worker repete a cada 6 horas. Com **Cupom novo da Awin (com código) entra sozinho na fila** marcado e uma fila escolhida, cada cupom novo entra no fim dessa fila.

**Publicar cupom** cria envios do cupom para os grupos, com link de afiliado opcional da mesma plataforma.

## 10. Copiador

Tela **Copiador**. Só aparece **Nova automação** quando existe um grupo marcado como origem autorizada pelo dono (seção 5), e o copiador só lê grupos de que o número conectado participa.

Campos: nome, grupo de origem, número remetente (ou manual), plataformas aceitas, **Precisa ter**, **Ignorar se tiver**, **Domínios bloqueados**, limpeza do texto (**Tirar menções (@)**, **Tirar convites de outros grupos e canais**, **Tirar links que não são do produto**, frases de chamada para tirar), **Não repetir o mesmo produto por (horas)** (padrão 24), **Intervalo mínimo entre ofertas (min)** (padrão 5) e **Revisar cada oferta antes de publicar** (marcado).

A automação nasce em prévia: registra as mensagens da origem e mostra o que faria, sem publicar. Use **Testar as regras com uma mensagem** e confira as mensagens recentes antes de **Ativar**. O link da origem sempre é trocado pelo nosso; linha com preço, validade ou condição nunca é apagada pela limpeza. Mercado Livre e mensagem com mais de um produto vão para revisão. O texto de terceiros fica guardado por 30 dias.

## 11. Relatórios

Tela **Relatórios de ofertas**: três blocos separados, mensagens publicadas pelo sistema, cliques reportados pelas plataformas e vendas e comissões reportadas. O sistema não mede cliques (não há redirecionador próprio); sem relatório importado, cliques e comissões aparecem como "não disponível".

Importar (dono e operador):

- **Importar da Awin** (até 31 dias por vez) e **Importar da Shopee** (até 90 dias; a Shopee não informa o valor da venda), com a integração conectada;
- **Escolher arquivo CSV** para qualquer plataforma: escolha a plataforma e o tipo (Conversões e comissões ou Cliques) e aponte qual coluna do arquivo é cada campo. Conversões: referência do pedido e data obrigatórias; situação, valor da venda, comissão e código opcionais. Cliques: data, código e cliques. Até 20.000 linhas.

A atribuição ao grupo usa o código que volta no relatório: `g` + 8 caracteres do grupo (sub ID da Shopee, clickref da Awin) ou o ID de rastreamento Amazon do grupo. Mesmo arquivo duas vezes é recusado; arquivo novo com pedido já importado atualiza situação e comissão. Cada bloco tem botão **CSV** para exportar.

**Histórico de envios** mostra cada envio com origem, grupo, número, URL original, link enviado (gerado pela API, montado com o ID de associado ou colado), modelo, resultado e tentativas. O dono vê também as alterações de configuração do módulo.

## 12. O que não existe nesta versão

- Visualizações de mensagem em grupo: nenhuma integração mede; aparece "não disponível pela integração".
- API oficial do WhatsApp para grupos: não atende grupos comuns; o envio automático é só pelo worker com Baileys.
- Dados de produto da Amazon (Creators API) e dos feeds da Awin: cadastro manual.
- API de links e de dados do Mercado Livre: link e dados sempre do portal.
- Cupons por API da Shopee, do Mercado Livre e da Amazon: manual ou CSV.
- Contagem própria de cliques e encurtador próprio: não existem, por regra dos programas.
- Rotação de números: cada fila e automação usa um número escolhido.
- Recifragem em lote após troca de chave: salvar as credenciais de novo (`erp/docs/implantacao.md`).

## 13. Quando algo dá errado

| O que aparece | O que fazer |
|---|---|
| Chave de cifra ausente | Seção 2 |
| Integração com erro / Credencial expirada | Gere credencial nova no portal da plataforma e use **Salvar e testar** |
| "Só rascunho" na oferta | Registre a trava da plataforma (seção 3.5) |
| "Conversão automática indisponível" | Configure a integração ou cole o link de afiliado |
| Worker do WhatsApp sem sinal | Veja `fly logs` e `fly status` (`erp/docs/implantacao.md`); enquanto isso, use Publicar |
| Número desconectado | Conecte de novo em Números de WhatsApp; nada da fila se perde |
| Envio incerto | Confira no grupo se a mensagem chegou; só então **Tentar de novo** ou **Descartar** |
| Suspeita de vazamento de credencial | Gere credencial nova na plataforma primeiro, depois salve no sistema; se a chave de cifra vazou, troque também a chave (seção 2) e a senha do papel do worker (`node ferramentas/papel-worker.mjs --alvo dev`) |
