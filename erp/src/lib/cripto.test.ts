import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { chavesDoAmbiente, cifrar, decifrar, idDaChave, lerChave } from "./cripto";

const base64 = () => randomBytes(32).toString("base64");

describe("cripto", () => {
  it("cifra e decifra no mesmo contexto, com iv novo a cada vez", () => {
    const k = lerChave(base64());
    const a = cifrar("segredo-123", k, "ofe_integracoes_segredos:shopee");
    const b = cifrar("segredo-123", k, "ofe_integracoes_segredos:shopee");
    expect(a).not.toBe(b);
    expect(a).not.toContain("segredo");
    expect(decifrar(a, [k], "ofe_integracoes_segredos:shopee")).toBe("segredo-123");
    expect(idDaChave(a)).toBe(k.id);
  });

  it("recusa contexto diferente, adulteração e chave desconhecida", () => {
    const k = lerChave(base64());
    const c = cifrar("x", k, "linha-a");
    expect(() => decifrar(c, [k], "linha-b")).toThrow("cifra_invalida");
    const partes = c.split(".");
    partes[4] = Buffer.from("outro").toString("base64url");
    expect(() => decifrar(partes.join("."), [k], "linha-a")).toThrow("cifra_invalida");
    expect(() => decifrar(c, [lerChave(base64())], "linha-a")).toThrow("chave_desconhecida");
    expect(() => decifrar("texto-claro", [k], "linha-a")).toThrow("cifra_invalida");
  });

  it("chave anterior abre o que foi cifrado antes da troca", () => {
    const velha = base64();
    const antes = cifrar("valor", lerChave(velha), "ctx");
    const { atual, todas } = chavesDoAmbiente({
      OFERTAS_CHAVE_CRIPTO: base64(),
      OFERTAS_CHAVE_CRIPTO_ANTERIOR: velha,
    });
    expect(decifrar(antes, todas, "ctx")).toBe("valor");
    expect(idDaChave(antes)).not.toBe(atual.id);
  });

  it("exige chave de 32 bytes no ambiente", () => {
    expect(() => lerChave(randomBytes(16).toString("base64"))).toThrow("chave_cripto_invalida");
    expect(() => chavesDoAmbiente({})).toThrow("chave_cripto_ausente");
  });
});
