# Panfleto do sorteio, 10 x 15 cm, frente e verso

Texto final das duas faces, opções da frase de agradecimento e especificação pra gráfica.
Arquivos nesta pasta: `panfleto.pdf` (arquivo de impressão), `frente.png` e `verso.png` (conferência a 300 dpi), `panfleto.html` (fonte), `qr.svg`, `logo.png`, `render.cjs`.

---

## Frente (agradecimento e avaliação)

**Logo** FCS 3D Studio, 40 mm de largura, no topo.

**Título**
OBRIGADO PELA COMPRA

**Frase de agradecimento** (opção 1)
Essa peça saiu da nossa impressora direto pra você. Camada por camada, feita sob demanda.

**Card de avaliação**
SUA AVALIAÇÃO FAZ DIFERENÇA
Uma avaliação com foto, na loja onde você comprou, ajuda muito um estúdio pequeno como o nosso. Leva um minuto e vale demais pra gente.

**Linha de suporte**
Algum problema com a peça? Fala com a gente pelo chat da loja antes de avaliar. A gente resolve.

**Rodapé**
FCS3DSTUDIO NA SHOPEE, MERCADO LIVRE E TIKTOK SHOP

---

## Verso (sorteio e QR)

**Kicker**
SORTEIO TODO MÊS

**Título**
CADASTRE SEU PEDIDO
E CONCORRA

**Corpo**
Todo mês sorteamos um produto do nosso catálogo entre os clientes cadastrados. O cadastro leva um minuto e, no final, você entra no nosso grupo do WhatsApp.

**QR code**
Aponta para: https://fcs-erp.vercel.app/sorteio?via=panfleto
(o parâmetro `via=panfleto` identifica os cadastros que vieram do panfleto)

**Legenda do QR**
Aponte a câmera do celular pro código

**URL em destaque**
fcs-erp.vercel.app/sorteio

**Linha final**
Sorteio mensal entre clientes cadastrados. Regulamento na página. O cadastro não depende da avaliação.

**Logo** pequeno (19 mm) no canto superior direito, ao lado do kicker.

---

## Opções da frase de agradecimento

1. **(usada no arquivo)** Essa peça saiu da nossa impressora direto pra você. Camada por camada, feita sob demanda.
2. Cada peça que a gente imprime leva horas de máquina e um pedaço do nosso hobby. Agora ela é sua.
3. Você comprou de um estúdio pequeno que imprime cada peça depois do pedido. Obrigado por fazer parte disso.

Pra trocar: editar o parágrafo `agradecimento` em `panfleto.html` e rodar o `render.cjs` de novo.

---

## Especificação pra gráfica

| Item | Valor |
|---|---|
| Formato fechado | 10 x 15 cm (100 x 150 mm), retrato |
| Arquivo | `panfleto.pdf`, 2 páginas (página 1 frente, página 2 verso), vetorial, fontes incorporadas |
| Tamanho da página | 106 x 156 mm com sangria de 3 mm em cada lado, já incluída. Sem marcas de corte. O gerador arredonda a página para 105,8 x 156,0 mm, ou seja, sobram 2,9 mm de sangria na largura, dentro da tolerância de corte |
| Área segura | Todo texto e o QR ficam a pelo menos 5 mm do corte (8 mm da borda do arquivo) |
| Cores | 4x4 (frente e verso coloridos). Arquivo em RGB, converter pra CMYK na gráfica |
| Preto do fundo | #0A0A0A. Pedir preto composto (rich black, por exemplo C60 M40 Y40 K100) pra não sair acinzentado. O fundo preto cobre toda a sangria |
| Ciano | #00D8FF. Usar o ciano de processo mais saturado possível (próximo de C100 M0 Y0 K0). Fica um pouco menos vibrante que na tela, é esperado |
| QR | Módulos em preto 100% sobre branco do papel (não converter o preto do QR em composto). Área de módulos 46 x 46 mm, margem branca de 4 mm em volta (quadro branco de 54 mm), módulo de 1,4 mm. Não aplicar verniz brilhante sobre o QR |
| Papel | Couché fosco 250 a 300 g. Laminação fosca opcional |
| Virada | Frente e verso na mesma orientação (retrato), virar pelo lado maior, como página de livro |
| Conferência | `frente.png` e `verso.png` a 300 dpi (1253 x 1844 px) servem só pra prova de tela, não pra impressão |
| Fontes | Chakra Petch (títulos) e Poppins (texto), do Google Fonts, incorporadas no PDF |

Pra gerar de novo: dentro desta pasta, `NODE_PATH="<caminho>/erp/node_modules" node render.cjs` (usa o Playwright instalado no ERP).
