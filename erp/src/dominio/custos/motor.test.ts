import { describe, expect, it } from "vitest";
import casos from "./casos.json";
import { custoHoraImpressora } from "./impressora";
import { calcular, VERSAO_MOTOR, type EntradasCalculo } from "./motor";
import type { EntradasPeca } from "./tipos";
import type { TaxasCanal } from "@/dominio/precos/preco";

const a2 = casos.casos.find((c) => c.id === "A2")!;
const entradas: EntradasCalculo = {
  peca: {
    ...(a2.peca as Exclude<typeof a2.peca, string>),
    fixo: { ...(a2.peca as Exclude<typeof a2.peca, string>).fixo, metodo: "hora" },
    impressora: custoHoraImpressora(casos.impressora_anexo, casos.tarifa_kwh),
  } as EntradasPeca,
  canal: a2.canal as TaxasCanal,
  margem_alvo: 0.2,
  markup_alvo: 0.3,
};

describe("motor e snapshot", () => {
  it("o resultado leva a versão do motor e os cenários", () => {
    const r = calcular(entradas);
    expect(r.versao_motor).toBe(VERSAO_MOTOR);
    expect(r.custo.custo_total).toBe(10.5699);
    expect(r.preco?.margem?.preco).toBe(32.08);
    expect(r.preco?.markup?.viavel).toBe(true);
  });
  it("recalcular a partir do snapshot (entradas serializadas) reproduz o mesmo resultado", () => {
    const original = calcular(entradas);
    const snapshot = JSON.parse(JSON.stringify({ entradas, resultado: original }));
    const reproduzido = calcular(snapshot.entradas);
    expect(reproduzido).toEqual(snapshot.resultado);
  });
  it("simulação sem canal devolve só o custo", () => {
    const r = calcular({ ...entradas, canal: null });
    expect(r.preco).toBeNull();
    expect(r.custo.custo_total).toBe(10.5699);
  });
  it("mudar o custo do filamento depois não muda um snapshot já calculado", () => {
    const antes = calcular(entradas);
    const depois = calcular({ ...entradas, peca: { ...entradas.peca, custo_g: 0.2 } });
    expect(depois.custo.custo_total).toBeGreaterThan(antes.custo.custo_total);
    expect(antes.custo.custo_total).toBe(10.5699);
  });
});
