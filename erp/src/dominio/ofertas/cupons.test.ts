import { describe, expect, it } from "vitest";
import { cupomPodeSair, dataCupom, lerCsvCupons, situacaoCupom, venceEmBreve } from "./cupons";
import { statusExibido } from "./status";

const agora = new Date("2026-10-18T12:00:00Z");
const c = (x: Partial<Parameters<typeof situacaoCupom>[0]>) => ({
  status: "ativo",
  inicio_em: null,
  fim_em: "2026-10-30T00:00:00Z",
  validade_confirmada: true,
  ...x,
});

describe("cupons", () => {
  it("situação segue a mesma regra do banco e avisa validade não confirmada", () => {
    expect(situacaoCupom(c({}), agora)).toBe("vigente");
    expect(situacaoCupom(c({ fim_em: null }), agora)).toBe("sem_validade");
    expect(situacaoCupom(c({ validade_confirmada: false }), agora)).toBe("sem_validade");
    expect(situacaoCupom(c({ fim_em: "2026-10-18T11:59:59Z" }), agora)).toBe("vencido");
    expect(situacaoCupom(c({ inicio_em: "2026-10-19T00:00:00Z" }), agora)).toBe("futuro");
    expect(situacaoCupom(c({ status: "pausado" }), agora)).toBe("pausado");
    expect(cupomPodeSair(c({ fim_em: "2026-10-01T00:00:00Z" }), agora)).toBe(false);
  });
  it("vence em breve só se ainda pode sair", () => {
    expect(venceEmBreve(c({ fim_em: "2026-10-20T00:00:00Z" }), 7, agora)).toBe(true);
    expect(venceEmBreve(c({}), 7, agora)).toBe(false);
    expect(venceEmBreve(c({ fim_em: "2026-10-01T00:00:00Z" }), 7, agora)).toBe(false);
  });
  it("aguardando com hora futura aparece como programado", () => {
    expect(statusExibido("aguardando", "2026-10-18T13:00:00Z", agora)).toBe("programado");
    expect(statusExibido("aguardando", "2026-10-18T11:00:00Z", agora)).toBe("aguardando");
    expect(statusExibido("enviado", "2026-10-18T13:00:00Z", agora)).toBe("enviado");
  });
});

describe("CSV de cupons", () => {
  it("lê plataforma, datas nos dois formatos e ignora linha inválida", () => {
    const r = lerCsvCupons([
      ["plataforma", "codigo", "descricao", "fim", "valor_minimo"],
      ["Shopee", "fcs10", "10% off", "31/10/2026", "50,00"],
      ["Mercado Livre", "", "Frete grátis", "2026-11-05", ""],
      ["Outra", "X", "y", "", ""],
      ["amazon", "Y", "z", "31-10-2026", ""],
    ]);
    expect(r.linhas.map((l) => [l.plataforma, l.codigo, l.valor_minimo])).toEqual([
      ["shopee", "FCS10", 50],
      ["mercado_livre", null, null],
    ]);
    expect(r.ignoradas.map((i) => i.motivo)).toEqual(["plataforma inválida", "data inválida"]);
    expect(dataCupom("31/10/2026", true)).toBe("2026-11-01T02:59:59.000Z");
  });
});
