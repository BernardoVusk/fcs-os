import { describe, expect, it } from "vitest";
import { metricasGrupo } from "./evasao";

const base = {
  inicio: "2026-10-01T03:00:00Z",
  fim: "2026-11-01T03:00:00Z",
  agora: new Date("2026-11-05T00:00:00Z"),
  coletaIniciadaEm: "2026-09-20T00:00:00Z",
  lacunas: [],
};

describe("métricas de grupo", () => {
  it("calcula saldo, variação e evasão com medição no início", () => {
    const m = metricasGrupo({
      ...base,
      medicoes: [
        { medido_em: "2026-09-30T12:00:00Z", membros: 200 },
        { medido_em: "2026-10-31T12:00:00Z", membros: 230 },
      ],
      eventos: [
        { ocorrido_em: "2026-10-05T00:00:00Z", tipo: "entrada", quantidade: 40 },
        { ocorrido_em: "2026-10-10T00:00:00Z", tipo: "saida", quantidade: 10 },
        { ocorrido_em: "2026-09-29T00:00:00Z", tipo: "saida", quantidade: 99 },
      ],
    });
    expect(m).toMatchObject({
      membrosInicio: 200,
      membrosFim: 230,
      entradas: 40,
      saidas: 10,
      saldo: 30,
      variacaoLiquida: 30,
      evasao: 5,
      evasaoSituacao: "calculada",
      parcial: false,
    });
  });

  it("sem medição antes do início a evasão é nula, nunca zero", () => {
    const m = metricasGrupo({
      ...base,
      medicoes: [{ medido_em: "2026-10-15T00:00:00Z", membros: 50 }],
      eventos: [],
    });
    expect(m).toMatchObject({
      membrosInicio: null,
      evasao: null,
      evasaoSituacao: "sem_medicao_inicial",
      variacaoLiquida: null,
    });
  });

  it("início com zero membros: não calculável", () => {
    const m = metricasGrupo({
      ...base,
      medicoes: [{ medido_em: "2026-09-30T00:00:00Z", membros: 0 }],
      eventos: [],
    });
    expect(m).toMatchObject({ evasao: null, evasaoSituacao: "inicio_zero" });
  });

  it("lacuna de coleta ou período antes da coleta marcam o resultado como parcial", () => {
    const comLacuna = metricasGrupo({
      ...base,
      medicoes: [{ medido_em: "2026-09-30T00:00:00Z", membros: 100 }],
      eventos: [],
      lacunas: [{ inicio: "2026-10-12T00:00:00Z", fim: "2026-10-12T05:00:00Z" }],
    });
    expect(comLacuna.parcial).toBe(true);
    expect(comLacuna.motivoParcial).toContain("sem coleta");
    const antes = metricasGrupo({
      ...base,
      coletaIniciadaEm: "2026-10-10T00:00:00Z",
      medicoes: [],
      eventos: [],
    });
    expect(antes).toMatchObject({ parcial: true, membrosInicio: null });
    const lacunaFora = metricasGrupo({
      ...base,
      medicoes: [],
      eventos: [],
      lacunas: [{ inicio: "2026-09-01T00:00:00Z", fim: "2026-09-02T00:00:00Z" }],
    });
    expect(lacunaFora.parcial).toBe(false);
  });
});
