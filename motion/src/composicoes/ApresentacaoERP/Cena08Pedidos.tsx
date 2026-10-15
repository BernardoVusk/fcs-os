/**
 * Cena 08: pedidos. A lista entra; a Mira marca o pedido, o canal, a fileira
 * de status (a câmera corre por ela e os chips acendem em sequência) e o
 * "A receber: Pago"; em "recebível" o pedido abre na frente com a linha do
 * tempo, e "um só" fecha com um check.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { Mira } from "../../componentes/Mira";
import { camera, CardTela, Check, Chip, ChipVivo, COLUNA, Dica, duracaoCena, EMENDA, Etiqueta, fala, Frase, geometriaTela, Palco, prog, pulso, SAI, TELA } from "./kit";

export const DURACAO = duracaoCena("cena08");
const F = fala("cena08");

const TIMING = {
  ETIQUETA_ENTRA: [EMENDA, EMENDA + 18] as const,
  ETIQUETA_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
  LISTA_ENTRA: [EMENDA - 4, EMENDA + 16] as const,
  LISTA_RECUA: [F.em("recebível") - 6, F.em("recebível") + 12] as const,
  LISTA_SAI: [DURACAO - EMENDA - 2, DURACAO - 2] as const,
  ZOOM_PEDIDO: [F.em("pedido") - 2, F.em("pedido") + 14] as const,
  MIRA_PEDIDO_PULSA: [F.em("pedido") + 14, F.em("pedido") + 26] as const,
  ZOOM_CANAL: [F.em("canal") - 2, F.em("canal") + 14] as const,
  MIRA_CANAL_PULSA: [F.em("canal") + 14, F.em("canal") + 26] as const,
  ZOOM_STATUS: [F.em("status") - 2, F.em("status") + 14] as const,
  MIRA_STATUS_PULSA: [F.em("status") + 14, F.em("status") + 26] as const,
  STATUS_CORRE: [F.em("status"), F.em("pagar") - 4] as const,
  ZOOM_PAGO: [F.em("pagar") - 2, F.em("pagar") + 14] as const,
  MIRA_PAGO_PULSA: [F.em("pagar") + 14, F.em("pagar") + 26] as const,
  PEDIDO_ENTRA: [F.em("recebível") - 4, F.em("recebível") + 18] as const,
  PEDIDO_SAI: [DURACAO - EMENDA - 2, DURACAO - 2] as const,
  ZOOM_RECEBIVEL: [F.em("recebível") + 10, F.em("recebível") + 26] as const,
  MIRA_RECEBIVEL_PULSA: [F.em("recebível") + 26, F.em("recebível") + 38] as const,
  CAMERA_SOLTA: [F.fimFala - 2, F.fimFala + 12] as const,
  MIRA_SAI: [F.fimFala, F.fimFala + 10] as const,
  FRASE1_ENTRA: F.instantes(["O", "pedido", "entra", "pelo", "canal", "passa", "pelos", "status"]),
  FRASE1_DESTAQUE: [F.em("canal") + 6, F.em("status") + 12] as const,
  FRASE1_SAI: F.em("ao") - 22,
  FRASE2_ENTRA: F.instantes(["ao", "pagar", "gera", "o", "recebível", "um", "só"]),
  FRASE2_DESTAQUE: [F.em("recebível") + 6, F.em("recebível") + 18] as const,
  FRASE2_SAI: F.fimFala + 2,
  STATUS1_ENTRA: F.em("status") + 4,
  STATUS1_ACENDE: [F.em("status") + 4, F.em("status") + 16] as const,
  STATUS1_SAI: [F.em("ao") - 4, F.em("ao") + 8] as const,
  STATUS2_ENTRA: F.em("status") + 9,
  STATUS2_ACENDE: [F.em("status") + 9, F.em("status") + 21] as const,
  STATUS2_SAI: [F.em("ao") - 2, F.em("ao") + 10] as const,
  STATUS3_ENTRA: F.em("status") + 14,
  STATUS3_ACENDE: [F.em("status") + 14, F.em("status") + 26] as const,
  STATUS3_SAI: [F.em("ao"), F.em("ao") + 12] as const,
  STATUS4_ENTRA: F.em("status") + 19,
  STATUS4_ACENDE: [F.em("status") + 19, F.em("status") + 31] as const,
  STATUS4_SAI: [F.em("ao") + 2, F.em("ao") + 14] as const,
  STATUS5_ENTRA: F.em("status") + 24,
  STATUS5_ACENDE: [F.em("status") + 24, F.em("status") + 36] as const,
  STATUS5_SAI: [F.em("ao") + 4, F.em("ao") + 16] as const,
  CHECK_ENTRA: [F.em("só"), F.em("só") + 14] as const,
  CHECK_PULSA: [F.em("só") + 6, F.em("só") + 26] as const,
  CHECK_SAI: [F.fimFala + 4, F.fimFala + 16] as const,
  DICA_ENTRA: [F.em("gera"), F.em("gera") + 14] as const,
  DICA_SAI: [F.fimFala + 8, F.fimFala + 20] as const,
} as const;

const G = geometriaTela(TELA.x, TELA.y, TELA.largura, TELA.altura);
/** Caixas nos prints (px CSS). */
const CAIXAS = {
  pedido: { x: 288, y: 612, w: 1112, h: 52 },
  canal: { x: 300, y: 636, w: 230, h: 24 },
  status: { x: 288, y: 196, w: 1112, h: 34 },
  pago: { x: 1160, y: 618, w: 90, h: 44 },
  recebivel: { x: 955, y: 478, w: 440, h: 32 },
};
const STATUS = ["Recebido", "Pago", "Em produção", "Enviado", "Concluído"] as const;

export const Cena08Pedidos: React.FC = () => {
  const f = useCurrentFrame();
  const T = TIMING;
  const corre = prog(f, T.STATUS_CORRE, (t) => t);
  const zooms = [
    { faixa: T.ZOOM_PEDIDO, pulsa: T.MIRA_PEDIDO_PULSA, caixa: CAIXAS.pedido, s: 1.16 },
    { faixa: T.ZOOM_CANAL, pulsa: T.MIRA_CANAL_PULSA, caixa: CAIXAS.canal, s: 1.3 },
    { faixa: T.ZOOM_STATUS, pulsa: T.MIRA_STATUS_PULSA, caixa: { ...CAIXAS.status, x: 288 + corre * 700, w: 400 }, s: 1.2 },
    { faixa: T.ZOOM_PAGO, pulsa: T.MIRA_PAGO_PULSA, caixa: CAIXAS.pago, s: 1.3 },
    { faixa: T.ZOOM_RECEBIVEL, pulsa: T.MIRA_RECEBIVEL_PULSA, caixa: CAIXAS.recebivel, s: 1.26 },
  ];
  let ativa = -1;
  zooms.forEach((z, i) => {
    if (f >= z.faixa[0]) ativa = i;
  });
  const z = ativa >= 0 ? zooms[ativa] : null;
  const caixa = z ? G.caixa(z.caixa.x, z.caixa.y, z.caixa.w, z.caixa.h) : null;
  const tomadas = zooms.map((q) => {
    const p = G.ponto(q.caixa.x + q.caixa.w / 2, q.caixa.y + q.caixa.h / 2);
    return { faixa: q.faixa, x: p.x, y: p.y, s: q.s };
  });
  tomadas.push({ faixa: T.CAMERA_SOLTA, x: 960, y: 540, s: 1 });
  const check = prog(f, T.CHECK_ENTRA, (t) => t) * (1 - prog(f, T.CHECK_SAI, SAI));
  const status = [
    [T.STATUS1_ENTRA, T.STATUS1_ACENDE, T.STATUS1_SAI],
    [T.STATUS2_ENTRA, T.STATUS2_ACENDE, T.STATUS2_SAI],
    [T.STATUS3_ENTRA, T.STATUS3_ACENDE, T.STATUS3_SAI],
    [T.STATUS4_ENTRA, T.STATUS4_ACENDE, T.STATUS4_SAI],
    [T.STATUS5_ENTRA, T.STATUS5_ACENDE, T.STATUS5_SAI],
  ] as const;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transform: camera(f, tomadas) }}>
        <Palco>
          <CardTela f={f} arquivo="vendas-pedidos" titulo="FCS ERP · Vendas · Pedidos" entra={T.LISTA_ENTRA} sai={T.LISTA_SAI} recua={prog(f, T.LISTA_RECUA)} />
          <CardTela f={f} arquivo="vendas-pedido" titulo="FCS ERP · Pedido PED-00024" entra={T.PEDIDO_ENTRA} sai={T.PEDIDO_SAI} fase={40} />
        </Palco>
        {caixa && z ? (
          <Mira x={caixa.x} y={caixa.y} largura={caixa.largura} altura={caixa.altura} entrada={1} trava={prog(f, z.faixa)} pulso={pulso(f, z.pulsa)} sai={prog(f, T.MIRA_SAI, SAI)} espessura={4} folga={8} />
        ) : null}
      </div>

      <div style={{ position: "absolute", left: COLUNA.x, top: COLUNA.y, display: "flex", flexDirection: "column", gap: 28, width: COLUNA.largura }}>
        <Etiqueta f={f} texto="Vendas · pedidos" entra={T.ETIQUETA_ENTRA} sai={T.ETIQUETA_SAI} />
        <div style={{ position: "relative", height: 330 }}>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="O pedido entra pelo *canal*, passa pelos *status*" instantes={T.FRASE1_ENTRA} saida={T.FRASE1_SAI} tamanho={62} largura={600} />
          </div>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="Ao pagar, gera o *recebível*. Um só." instantes={T.FRASE2_ENTRA} saida={T.FRASE2_SAI} tamanho={62} largura={600} />
          </div>
        </div>
        <div style={{ position: "relative", height: 200 }}>
          <div style={{ position: "absolute", top: 0, left: 0, display: "flex", flexWrap: "wrap", gap: 12, width: 600 }}>
            {STATUS.map((c, i) => {
              const [entra, acende, sai] = status[i];
              const vez = Math.max(0, 1 - Math.abs(corre * (STATUS.length - 1) - i) * 1.4);
              return <ChipVivo key={c} f={f} texto={c} entra={entra} acende={acende} sai={sai} aceso={vez * 0.9} tamanho={20} de="baixo" />;
            })}
          </div>
          <div style={{ position: "absolute", top: 10, left: 0, display: "flex", alignItems: "center", gap: 18, opacity: Math.min(1, check * 2) }}>
            <Check p={check} tamanho={64} />
            <Chip texto="Um recebível por pedido" aceso={pulso(f, T.CHECK_PULSA) * 0.9} entra={check} tamanho={22} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: COLUNA.x, top: 900 }}>
        <Dica f={f} texto="Pagamento aprovado congela o custo e cria o recebível no financeiro." entra={T.DICA_ENTRA} sai={T.DICA_SAI} />
      </div>
    </AbsoluteFill>
  );
};
