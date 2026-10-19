"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { chaveDoErro, erroPt } from "@/lib/erros-pt";
import { localParaIso } from "@/lib/formatos/data";
import type { Json } from "@/tipos/banco";
import { PLATAFORMAS } from "@/dominio/ofertas/plataformas";
import { separar } from "@/dominio/ofertas/fila";
import {
  lerCliques,
  lerConversoes,
  type MapaCliques,
  type MapaConversoes,
} from "@/dominio/ofertas/conversoes";
import { carregarCredenciais } from "@/integracoes/credenciais";
import { listarTransacoesAwin } from "@/integracoes/awin";
import { listarConversoesShopee } from "@/integracoes/shopee";
import { redigir } from "@/integracoes/segredo";

export type ResultadoImportacao = {
  ok: boolean;
  mensagem?: string;
  erro?: string;
  detalhes?: string[];
};

async function escrita() {
  try {
    await exigirEscrita("ofertas");
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

function periodo(de: string, ate: string, maxDias: number) {
  const inicio = localParaIso(de);
  const fimDia = localParaIso(ate);
  if (!inicio || !fimDia) return { erro: "data_invalida" } as const;
  const fim = new Date(Date.parse(fimDia) + 86_400_000).toISOString();
  if (fim <= inicio) return { erro: "prazo_antes_do_inicio" } as const;
  if (Date.parse(fim) - Date.parse(inicio) > maxDias * 86_400_000)
    return { erro: "periodo_longo" } as const;
  return { inicio, fim } as const;
}

/** Transações da Awin (comissão e venda reportadas pela plataforma), até 31 dias por vez. */
export async function importarAwin(de: string, ate: string): Promise<ResultadoImportacao> {
  const e = await escrita();
  if (e) return { ok: false, erro: e };
  const p = periodo(de, ate, 31);
  if ("erro" in p) return { ok: false, erro: p.erro };
  const cred = await carregarCredenciais();
  if (!cred.awin) return { ok: false, erro: "credencial_ausente" };
  const r = await listarTransacoesAwin(cred.awin, p.inicio.slice(0, 19), p.fim.slice(0, 19));
  if (!r.ok)
    return {
      ok: false,
      erro: redigir(
        `${erroPt(r.erro) ?? r.erro}${r.detalhe ? ` (${r.detalhe})` : ""}`,
        cred.segredos,
      ),
    };
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("ofe_registrar_conversoes", {
    p_plataforma: "awin",
    p_origem: "api",
    p_hash: null as unknown as string,
    p_inicio: p.inicio,
    p_fim: p.fim,
    p_linhas: r.dados.map((t) => ({
      ref: t.id,
      data: t.data,
      status: t.status,
      venda: t.venda,
      comissao: t.comissao,
      moeda: t.moeda,
      codigos: t.clickrefs,
    })) as Json,
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/relatorios");
  const d = data as { linhas: number; novas: number };
  return { ok: true, mensagem: `Awin: ${d.linhas} transação(ões), ${d.novas} nova(s).` };
}

/** Conversões da Open API da Shopee (comissão; valor do pedido fica nulo). */
export async function importarShopee(de: string, ate: string): Promise<ResultadoImportacao> {
  const e = await escrita();
  if (e) return { ok: false, erro: e };
  const p = periodo(de, ate, 90);
  if ("erro" in p) return { ok: false, erro: p.erro };
  const cred = await carregarCredenciais();
  if (!cred.shopee) return { ok: false, erro: "credencial_ausente" };
  const r = await listarConversoesShopee(cred.shopee, new Date(p.inicio), new Date(p.fim));
  if (!r.ok)
    return {
      ok: false,
      erro: redigir(
        `${erroPt(r.erro) ?? r.erro}${r.detalhe ? ` (${r.detalhe})` : ""}`,
        cred.segredos,
      ),
    };
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("ofe_registrar_conversoes", {
    p_plataforma: "shopee",
    p_origem: "api",
    p_hash: null as unknown as string,
    p_inicio: p.inicio,
    p_fim: p.fim,
    p_linhas: r.dados.map((c) => ({
      ref: c.ref,
      data: c.data,
      status: c.status,
      venda: null,
      comissao: c.comissao,
      codigos: c.codigos,
    })) as Json,
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/relatorios");
  const d = data as { linhas: number; novas: number };
  return { ok: true, mensagem: `Shopee: ${d.linhas} conversão(ões), ${d.novas} nova(s).` };
}

const schemaCsv = z.object({
  plataforma: z.enum(PLATAFORMAS),
  tipo: z.enum(["conversoes", "cliques"]),
  mapa: z.record(z.string(), z.string().max(120)),
});

/** Relatório exportado do portal (qualquer plataforma), com as colunas apontadas pelo usuário. */
export async function importarRelatorioCsv(entrada: {
  plataforma: string;
  tipo: string;
  mapa: Record<string, string>;
  texto: string;
}): Promise<ResultadoImportacao> {
  const e = await escrita();
  if (e) return { ok: false, erro: e };
  const r = schemaCsv.safeParse(entrada);
  if (!r.success) return { ok: false, erro: "tipo_invalido" };
  const texto = String(entrada.texto ?? "").slice(0, 5_000_000);
  const matriz = separar(texto);
  if (matriz.length < 2) return { ok: false, erro: "csv_vazio" };
  if (matriz.length > 20_001) return { ok: false, erro: "csv_grande" };
  const hash = createHash("sha256")
    .update(`${r.data.plataforma}:${r.data.tipo}:${texto}`)
    .digest("hex");
  const supabase = await clienteServidor();
  if (r.data.tipo === "conversoes") {
    const l = lerConversoes(matriz, r.data.mapa as MapaConversoes);
    if (!l.ok) return { ok: false, erro: l.erro };
    const datas = l.linhas.map((x) => x.data).sort();
    const { data, error } = await supabase.rpc("ofe_registrar_conversoes", {
      p_plataforma: r.data.plataforma,
      p_origem: "csv",
      p_hash: hash,
      p_inicio: (datas[0] ?? null) as string,
      p_fim: (datas.at(-1) ?? null) as string,
      p_linhas: l.linhas as unknown as Json,
    });
    if (error) return { ok: false, erro: chaveDoErro(error) };
    revalidatePath("/ofertas/relatorios");
    const d = data as { linhas: number; novas: number };
    return {
      ok: true,
      mensagem: `${d.linhas} conversão(ões) lida(s), ${d.novas} nova(s).`,
      detalhes: l.ignoradas.slice(0, 20).map((i) => `Linha ${i.linha}: ${i.motivo}`),
    };
  }
  const l = lerCliques(matriz, r.data.mapa as MapaCliques);
  if (!l.ok) return { ok: false, erro: l.erro };
  const { data, error } = await supabase.rpc("ofe_registrar_cliques", {
    p_plataforma: r.data.plataforma,
    p_hash: hash,
    p_linhas: l.linhas as unknown as Json,
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/relatorios");
  return {
    ok: true,
    mensagem: `${(data as { linhas: number }).linhas} linha(s) de cliques importada(s).`,
    detalhes: l.ignoradas.slice(0, 20).map((i) => `Linha ${i.linha}: ${i.motivo}`),
  };
}
