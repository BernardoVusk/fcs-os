import { describe, expect, it } from "vitest";
import { permiteVenda, rotuloLicenca } from "./licenca";

describe("rotuloLicenca", () => {
  it("encurta as licenças do MakerWorld e mantém a sigla Creative Commons", () => {
    expect(rotuloLicenca("Standard Digital File License")).toBe("Padrão");
    expect(rotuloLicenca("MakerWorld Exclusive License")).toBe("Exclusiva");
    expect(rotuloLicenca("BY-NC-SA")).toBe("BY-NC-SA");
  });

  it("licença não lida aparece como não coletada", () => {
    expect(rotuloLicenca(null)).toBe("Não coletada");
  });
});

describe("permiteVenda", () => {
  it("só BY, BY-SA, BY-ND e CC0 deixam vender a peça impressa", () => {
    for (const l of ["BY", "BY-SA", "BY-ND", "CC0"]) expect(permiteVenda(l)).toBe(true);
    for (const l of [
      "Standard Digital File License",
      "MakerWorld Exclusive License",
      "BY-NC",
      "BY-NC-SA",
      "BY-NC-ND",
      null,
    ])
      expect(permiteVenda(l)).toBe(false);
  });
});
