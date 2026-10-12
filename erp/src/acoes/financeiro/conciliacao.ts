"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { EstadoForm } from "@/lib/forms";
import { chaveDoErro } from "@/lib/erros-pt";
import { separarCsv } from "@/dominio/produtos/importacao-csv";
import { hashTexto } from "@/dominio/vendas/importacao-pedidos";

const DIVERGENCIA_MAXIMA = 0.05;

/**
 * Concilia o extrato de repasses do canal: CSV com colunas de código do pedido, valor repassado e data.
 * Casa pelo código externo do pedido no canal; realiza o recebível com o valor do repasse e abre alerta
 * `divergencia_repasse` acima de R$ 0,05, sem nunca ajustar o previsto.
 */
export async function conciliarRepasses(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("financeiro");
  const canalId = String(fd.get("canal_id") ?? "");
  const contaId = String(fd.get("conta_id") ?? "");
  const colCodigo = String(fd.get("col_codigo") ?? "").trim();
  const colValor = String(fd.get("col_valor") ?? "").trim();
  const colData = String(fd.get("col_data") ?? "").trim();
  if (!z.uuid().safeParse(canalId).success) return { erros: { canal_id: "canal_obrigatorio" } };
  if (!z.uuid().safeParse(contaId).success) return { erros: { conta_id: "conta_obrigatoria" } };
  if (!colCodigo || !colValor) return { erros: { _form: "csv_colunas_faltando" } };
  const arquivo = fd.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0)
    return { erros: { arquivo: "arquivo_obrigatorio" } };
  const texto = await arquivo.text();
  const hash = await hashTexto(texto);
  const supabase = await clienteServidor();
  const { data: repetida } = await supabase
    .from("importacoes")
    .select("id")
    .eq("hash_sha256", hash)
    .maybeSingle();
  if (repetida) return { erros: { arquivo: "importacao_repetida" } };
  const matriz = separarCsv(texto);
  if (matriz.length < 2) return { erros: { arquivo: "csv_vazio" } };
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  const cab = matriz[0].map(norm);
  const iCod = cab.indexOf(norm(colCodigo));
  const iVal = cab.indexOf(norm(colValor));
  const iData = colData ? cab.indexOf(norm(colData)) : -1;
  if (iCod < 0 || iVal < 0) return { erros: { _form: "csv_colunas_faltando" } };
  const numero = (v: string) => {
    const s = v
      .trim()
      .replace(/^R\$\s*/, "")
      .replace(/\s/g, "");
    return Number(
      /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, ""),
    );
  };
  const lerData = (v: string) => {
    const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    const i = v.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return i ? i[1] : new Date().toISOString().slice(0, 10);
  };
  const { data: importacao } = await supabase
    .from("importacoes")
    .insert({
      canal_id: canalId,
      tipo: "repasses",
      nome_arquivo: arquivo.name,
      hash_sha256: hash,
      total_linhas: matriz.length - 1,
    })
    .select("id")
    .single();
  let conciliados = 0;
  let divergentes = 0;
  const avisos: string[] = [];
  for (let n = 1; n < matriz.length; n++) {
    const codigo = (matriz[n][iCod] ?? "").trim();
    const valor = numero(matriz[n][iVal] ?? "");
    if (!codigo || !Number.isFinite(valor) || valor <= 0) {
      avisos.push(`linha ${n}: sem código ou valor`);
      continue;
    }
    const dataRep =
      iData >= 0 ? lerData(matriz[n][iData] ?? "") : new Date().toISOString().slice(0, 10);
    const { data: pedido } = await supabase
      .from("pedidos")
      .select("id, codigo")
      .eq("canal_id", canalId)
      .eq("codigo_externo", codigo)
      .maybeSingle();
    if (!pedido) {
      avisos.push(`${codigo}: pedido não encontrado`);
      continue;
    }
    const { data: lanc } = await supabase
      .from("lancamentos_situacao")
      .select("id, valor_previsto, estado, saldo_restante")
      .eq("origem_tipo", "pedido")
      .eq("origem_id", pedido.id)
      .eq("papel_origem", "principal")
      .maybeSingle();
    if (!lanc || !lanc.id) {
      avisos.push(`${codigo}: pedido sem recebível (ainda não marcado como pago)`);
      continue;
    }
    if (lanc.estado === "realizado" || lanc.estado === "estornado" || lanc.estado === "cancelado") {
      avisos.push(`${codigo}: recebível já ${lanc.estado}`);
      continue;
    }
    const previsto = Number(lanc.valor_previsto);
    const diferenca = Math.round((valor - previsto) * 100) / 100;
    const valorRealizar = Math.min(valor, Number(lanc.saldo_restante ?? previsto));
    const { error } = await supabase.rpc("realizar_lancamento", {
      p_lancamento: lanc.id,
      p_valor: valorRealizar,
      p_conta: contaId,
      p_data: dataRep,
      p_observacao: `Repasse ${arquivo.name}`,
      p_encerrar: valor < previsto,
      p_motivo:
        valor < previsto
          ? `Repasse de ${valor.toFixed(2)} abaixo do previsto ${previsto.toFixed(2)}`
          : undefined,
    });
    if (error) {
      avisos.push(`${codigo}: ${chaveDoErro(error)}`);
      continue;
    }
    conciliados++;
    if (Math.abs(diferenca) > DIVERGENCIA_MAXIMA) {
      divergentes++;
      const { error: ea } = await supabase.from("alertas").insert({
        tipo: "divergencia_repasse",
        severidade: "atencao",
        titulo: `Repasse diferente do previsto: ${pedido.codigo}`,
        descricao: `Previsto ${previsto.toFixed(2)}, repassado ${valor.toFixed(2)} (diferença ${diferenca.toFixed(2)}). O previsto não foi alterado.`,
        entidade_tipo: "pedido",
        entidade_id: pedido.id,
      });
      if (ea && ea.code !== "23505") avisos.push(`${codigo}: alerta: ${ea.message}`);
    }
  }
  if (importacao)
    await supabase
      .from("importacoes")
      .update({
        criadas: conciliados,
        atualizadas: divergentes,
        ignoradas: avisos.length,
        erros: avisos,
      })
      .eq("id", importacao.id);
  revalidatePath("/financeiro", "layout");
  revalidatePath("/");
  const resumo = `${conciliados} recebível(is) realizado(s), ${divergentes} com divergência (alerta aberto), ${avisos.length} aviso(s).`;
  return {
    erros: {},
    ok: true,
    mensagem: avisos.length ? `${resumo} ${avisos.slice(0, 8).join("; ")}` : resumo,
  };
}
