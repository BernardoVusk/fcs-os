import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  anonimo,
  criarUsuarioTeste,
  garantirMigracoes,
  type UsuarioTeste,
} from "./ambiente";

let dono: UsuarioTeste;
let leitura: UsuarioTeste;
let semPapel: UsuarioTeste;

beforeAll(async () => {
  await garantirMigracoes();
  [dono, leitura, semPapel] = await Promise.all([
    criarUsuarioTeste("dono"),
    criarUsuarioTeste("leitura"),
    criarUsuarioTeste(null),
  ]);
});
afterAll(async () => {
  await Promise.all([dono?.remover(), leitura?.remover(), semPapel?.remover()]);
});

describe("RLS", () => {
  it("leitura vê canais mas não grava categoria", async () => {
    const { data } = await leitura.cliente.from("canais_venda").select("nome");
    expect(data?.length).toBeGreaterThan(0);
    const { error } = await leitura.cliente
      .from("categorias")
      .insert({ escopo: "produto", nome: `rls-${Date.now()}` });
    expect(error?.code).toBe("42501");
  });

  it("dono grava categoria e lê auditoria; leitura não lê auditoria", async () => {
    const nome = `rls-dono-${Date.now()}`;
    const { data, error } = await dono.cliente
      .from("categorias")
      .insert({ escopo: "produto", nome })
      .select("id")
      .single();
    expect(error).toBeNull();
    const { data: aud } = await dono.cliente
      .from("auditoria")
      .select("acao")
      .eq("registro_id", data!.id);
    expect(aud?.map((a) => a.acao)).toEqual(["insert"]);
    const { data: audLeitura } = await leitura.cliente
      .from("auditoria")
      .select("id")
      .eq("registro_id", data!.id);
    expect(audLeitura).toEqual([]);
    await admin().from("categorias").delete().eq("id", data!.id);
  });

  it("anônimo e usuário sem papel não leem nada", async () => {
    const { data: a } = await anonimo().from("canais_venda").select("id");
    expect(a).toEqual([]);
    const { data: b } = await semPapel.cliente.from("canais_venda").select("id");
    expect(b).toEqual([]);
  });

  it("leitura não altera o próprio papel", async () => {
    const { error } = await leitura.cliente
      .from("usuarios_app")
      .update({ papel: "dono" })
      .eq("id", leitura.id);
    const { data } = await admin()
      .from("usuarios_app")
      .select("papel")
      .eq("id", leitura.id)
      .single();
    expect(error === null || error.code === "42501").toBe(true);
    expect(data?.papel).toBe("leitura");
  });
});
