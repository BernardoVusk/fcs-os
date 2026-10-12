import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { lerCatalogo, nomeSugerido, separarCsv } from "./importacao-csv";

describe("parser CSV", () => {
  it("trata aspas, vírgula dentro de aspas, aspas duplicadas e CRLF", () => {
    const m = separarCsv('a,b,c\r\n1,"x, y","diz ""oi"""\r\n\r\n2,,"linha\nquebrada"\n');
    expect(m).toEqual([
      ["a", "b", "c"],
      ["1", "x, y", 'diz "oi"'],
      ["2", "", "linha\nquebrada"],
    ]);
  });
  it("exige canal, id e titulo e pula linhas sem chave ou repetidas", () => {
    const r = lerCatalogo(
      "canal,id,titulo,preco\nshopee,1,Peça A,10.5\nshopee,1,Repetida,11\n,2,Sem canal,1\nml,3,,4\nmercado_livre,4,Peça B,",
    );
    expect(r.linhas.map((l) => [l.canal, l.codigo_externo, l.preco])).toEqual([
      ["shopee", "1", 10.5],
      ["mercado_livre", "4", null],
    ]);
    expect(r.ignoradas).toEqual([
      { linha: 2, motivo: "repetida no arquivo" },
      { linha: 3, motivo: "sem canal ou id" },
      { linha: 4, motivo: "sem título" },
    ]);
    expect(() => lerCatalogo("a,b\n1,2")).toThrow("csv_sem_colunas:canal,id,titulo");
  });
  // O CSV real fica fora do git (dados/ é local); no CI o caso é pulado.
  const catalogoReal = resolve(__dirname, "../../../../dados/catalogo/2026-08-21-catalogo.csv");
  it.skipIf(!existsSync(catalogoReal))("lê o catálogo real de 21/08/2026 inteiro", () => {
    const csv = readFileSync(
      resolve(__dirname, "../../../../dados/catalogo/2026-08-21-catalogo.csv"),
      "utf8",
    );
    const r = lerCatalogo(csv);
    expect(r.linhas.length + r.ignoradas.length).toBe(39);
    expect(r.ignoradas).toEqual([]);
    const primeira = r.linhas[0];
    expect(primeira.canal).toBe("shopee");
    expect(primeira.codigo_externo).toBe("18698277011");
    expect(primeira.preco).toBe(39.9);
    expect(primeira.estoque).toBe(127);
    expect(primeira.conversao).toBe(0.0325);
    expect(primeira.nota).toBeNull();
    expect(primeira.coletado_em).toBe("2026-08-21");
    expect(new Set(r.linhas.map((l) => l.canal)).size).toBeGreaterThanOrEqual(1);
  });
  it("sugere um nome curto a partir do título", () => {
    expect(nomeSugerido("Circuito Formula 1 Pista F1 Miniatura, Decoração, Presente")).toBe(
      "Circuito Formula 1 Pista F1 Miniatura",
    );
    expect(nomeSugerido("Suporte de fone - PLA preto")).toBe("Suporte de fone");
  });
});
