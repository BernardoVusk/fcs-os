import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

// Fase 17: cupons da Awin por registro idempotente, envio automático só com regra e fila.
let operador: UsuarioTeste;
let leitura: UsuarioTeste;
const s = Date.now();
let fila = "";
const ref = (n: number) => `teste-${s}-${n}`;
const a = () => admin();
const cupom = (n: number, codigo: string | null, fim: string | null) => ({
  referencia: ref(n),
  codigo,
  titulo: `Cupom ${n}`,
  anunciante: "Loja",
  termos: "Válido no site",
  inicio: null,
  fim,
  url: "https://www.awin1.com/cread.php?x=1",
  advertiser_id: 9,
});

beforeAll(async () => {
  await garantirMigracoes();
  [operador, leitura] = await Promise.all([
    criarUsuarioTeste("operador"),
    criarUsuarioTeste("leitura"),
  ]);
  fila = (
    await a()
      .from("ofe_filas")
      .insert({ nome: `cupons ${s}` })
      .select("id")
      .single()
  ).data!.id;
});
afterAll(async () => {
  await a()
    .from("ofe_cupons_regras")
    .update({ enviar_awin: false, fila_awin_id: null })
    .eq("id", true);
  await a().from("ofe_filas").delete().eq("id", fila);
  await a().from("ofe_cupons").delete().like("referencia_externa", `teste-${s}-%`);
  await a().rpc("ofe_gerar_alertas");
  await Promise.all([operador?.remover(), leitura?.remover()]);
});

describe("ofertas: cupons automáticos", () => {
  it("registro idempotente: segunda sincronização não duplica e atualiza a validade", async () => {
    const fim = new Date(Date.now() + 86_400_000 * 10).toISOString();
    const { data: n1 } = await operador.cliente.rpc("ofe_registrar_cupons_awin", {
      p_cupons: [cupom(1, "BEM10", null)],
    });
    const { data: n2 } = await operador.cliente.rpc("ofe_registrar_cupons_awin", {
      p_cupons: [cupom(1, "BEM10", fim)],
    });
    expect([n1, n2]).toEqual([1, 0]);
    const { data } = await a()
      .from("ofe_cupons")
      .select("fim_em, validade_confirmada, verificacao, fonte")
      .eq("referencia_externa", ref(1));
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({
      validade_confirmada: true,
      verificacao: "fonte_oficial",
      fonte: "awin",
    });
  });

  it("cupom novo com código entra na fila só com a regra ligada", async () => {
    await operador.cliente.rpc("ofe_registrar_cupons_awin", {
      p_cupons: [cupom(2, "SEMREGRA", null)],
    });
    await operador.cliente
      .from("ofe_cupons_regras")
      .update({ enviar_awin: true, fila_awin_id: fila })
      .eq("id", true);
    await operador.cliente.rpc("ofe_registrar_cupons_awin", {
      p_cupons: [cupom(3, "COMREGRA", null), cupom(4, null, null)],
    });
    const { data: itens } = await a()
      .from("ofe_filas_itens")
      .select("cupom:ofe_cupons(codigo)")
      .eq("fila_id", fila);
    expect(itens?.map((i) => (i.cupom as unknown as { codigo: string }).codigo)).toEqual([
      "COMREGRA",
    ]);
  });

  it("leitura não registra; cupom perto de vencer gera alerta agregado", async () => {
    const { error } = await leitura.cliente.rpc("ofe_registrar_cupons_awin", {
      p_cupons: [cupom(5, "X", null)],
    });
    expect(error?.message).toBe("sem_permissao");
    await operador.cliente.rpc("ofe_registrar_cupons_awin", {
      p_cupons: [cupom(6, "VENCE", new Date(Date.now() + 3600_000).toISOString())],
    });
    await a().rpc("ofe_gerar_alertas");
    const { data } = await a()
      .from("alertas")
      .select("tipo")
      .eq("tipo", "ofe_cupom_vencendo")
      .is("resolvido_em", null);
    expect(data).toHaveLength(1);
  });
});
