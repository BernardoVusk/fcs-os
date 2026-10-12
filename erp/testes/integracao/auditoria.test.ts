import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/tipos/banco";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

let dono: UsuarioTeste;
beforeAll(async () => {
  await garantirMigracoes();
  dono = await criarUsuarioTeste("dono");
});
afterAll(async () => dono?.remover());

function servicoSemOrigem() {
  return createClient<Database>(process.env.SUPABASE_TESTE_URL!, process.env.SUPABASE_TESTE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe("auditoria", () => {
  it("registra insert e update com origem web, usuário e antes/depois", async () => {
    const nome = `aud-${Date.now()}`;
    const { data: criada } = await dono.cliente.from("categorias").insert({ escopo: "insumo", nome }).select("id").single();
    await dono.cliente.from("categorias").update({ nome: `${nome}-2` }).eq("id", criada!.id);
    const { data: linhas } = await dono.cliente
      .from("auditoria")
      .select("acao, origem, usuario_id, antes, depois")
      .eq("registro_id", criada!.id)
      .order("id");
    expect(linhas?.length).toBe(2);
    expect(linhas![0]).toMatchObject({ acao: "insert", origem: "web", usuario_id: dono.id, antes: null });
    expect((linhas![0].depois as { nome: string }).nome).toBe(nome);
    expect(linhas![1].acao).toBe("update");
    expect((linhas![1].antes as { nome: string }).nome).toBe(nome);
    expect((linhas![1].depois as { nome: string }).nome).toBe(`${nome}-2`);
    await admin().from("categorias").delete().eq("id", criada!.id);
  });

  it("escrita pela API sem cabeçalho x-origem vale como web e sem usuário", async () => {
    const a = servicoSemOrigem();
    const nome = `aud-script-${Date.now()}`;
    const { data } = await a.from("categorias").insert({ escopo: "insumo", nome }).select("id").single();
    const { data: linhas } = await a.from("auditoria").select("origem, usuario_id").eq("registro_id", data!.id);
    expect(linhas![0]).toMatchObject({ origem: "web", usuario_id: null });
    await a.from("categorias").delete().eq("id", data!.id);
  });
});
