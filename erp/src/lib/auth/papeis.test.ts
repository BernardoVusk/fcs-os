import { describe, it, expect } from "vitest";
import { areaDaRota, lerPapel, podeEscrever, podeLer } from "./papeis";

describe("papeis", () => {
  it("dono lê e escreve em tudo", () => {
    expect(podeLer("dono", "financeiro")).toBe(true);
    expect(podeEscrever("dono", "usuarios")).toBe(true);
  });
  it("operador não vê financeiro nem usuários, escreve em operação", () => {
    expect(podeLer("operador", "financeiro")).toBe(false);
    expect(podeLer("operador", "usuarios")).toBe(false);
    expect(podeEscrever("operador", "estoque")).toBe(true);
    expect(podeEscrever("operador", "configuracoes")).toBe(false);
  });
  it("leitura só lê", () => {
    expect(podeLer("leitura", "estoque")).toBe(true);
    expect(podeEscrever("leitura", "estoque")).toBe(false);
  });
  it("sem papel não acessa nada", () => {
    expect(podeLer(null, "inicio")).toBe(false);
    expect(lerPapel("admin")).toBeNull();
    expect(lerPapel("dono")).toBe("dono");
  });
  it("mapeia rota para área", () => {
    expect(areaDaRota("/")).toBe("inicio");
    expect(areaDaRota("/configuracoes/canais/abc")).toBe("configuracoes");
    expect(areaDaRota("/configuracoes/usuarios")).toBe("usuarios");
    expect(areaDaRota("/perfil")).toBeNull();
    expect(areaDaRota("/estoque/")).toBe("estoque");
  });
});
