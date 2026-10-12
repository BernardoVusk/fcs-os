import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonimo, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

let leitura: UsuarioTeste;
beforeAll(async () => {
  await garantirMigracoes();
  leitura = await criarUsuarioTeste("leitura");
});
afterAll(async () => leitura?.remover());

describe("buscar_global", () => {
  it("acha categoria sem acento e respeita filtro de tipo", async () => {
    const { data } = await leitura.cliente.rpc("buscar_global", { termo: "formula" });
    expect(data?.some((r) => r.tipo === "categoria" && r.titulo === "Fórmula 1")).toBe(true);
    const { data: so } = await leitura.cliente.rpc("buscar_global", {
      termo: "kg",
      tipos: ["unidade"],
    });
    expect(so?.map((r) => r.tipo)).toEqual(["unidade"]);
    expect(so?.[0].titulo).toBe("quilograma");
  });
  it("anônimo não executa a função", async () => {
    const { error } = await anonimo().rpc("buscar_global", { termo: "formula" });
    expect(error).not.toBeNull();
  });
});
