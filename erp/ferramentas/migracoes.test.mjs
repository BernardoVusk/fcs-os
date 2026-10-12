import { describe, it, expect } from "vitest";
import { pendentes } from "./migracoes.mjs";

describe("pendentes", () => {
  it("devolve só os arquivos não aplicados, em ordem", () => {
    const arquivos = ["0003_c.sql", "0001_a.sql", "0002_b.sql", "README.md"];
    expect(pendentes(["0001_a.sql"], arquivos)).toEqual(["0002_b.sql", "0003_c.sql"]);
  });
  it("rejeita nome fora do padrão NNNN_nome.sql", () => {
    expect(() => pendentes([], ["1_a.sql"])).toThrow(/padrao/);
  });
  it("rejeita número repetido", () => {
    expect(() => pendentes([], ["0001_a.sql", "0001_b.sql"])).toThrow(/repetid/);
  });
});
