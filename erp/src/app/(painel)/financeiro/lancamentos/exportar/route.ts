import { usuarioAtual } from "@/lib/auth/sessao";
import { podeLer } from "@/lib/auth/papeis";
import { listarLancamentos, type FiltrosLancamento } from "@/dados/financeiro/financeiro";

const dataOuVazia = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

/** Exportação CSV dos lançamentos com os mesmos filtros da tela. Valores sem fórmula injetável e com BOM para o Excel. */
export async function GET(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario || !podeLer(usuario.papel, "financeiro"))
    return new Response("Sem acesso", { status: 403 });
  const url = new URL(req.url);
  const f: FiltrosLancamento = {
    estado: (url.searchParams.get("estado") as FiltrosLancamento["estado"]) || undefined,
    tipo: (url.searchParams.get("tipo") as FiltrosLancamento["tipo"]) || undefined,
    inicio: dataOuVazia(url.searchParams.get("inicio")),
    fim: dataOuVazia(url.searchParams.get("fim")),
    limite: 2000,
  };
  const itens = await listarLancamentos(f);
  const escapar = (v: unknown) => {
    const s = v == null ? "" : String(v);
    const limpo = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${limpo.replace(/"/g, '""')}"`;
  };
  const numero = (v: unknown) => (v == null ? "" : String(Number(v).toFixed(2)).replace(".", ","));
  const linhas = [
    [
      "data_prevista",
      "descricao",
      "tipo",
      "categoria",
      "conta",
      "valor_previsto",
      "valor_realizado",
      "saldo_restante",
      "estado",
      "atrasado",
      "competencia",
      "origem",
    ].join(";"),
    ...itens.map((l) =>
      [
        escapar(l.data_prevista),
        escapar(l.descricao),
        escapar(l.tipo),
        escapar(l.categoria_nome),
        escapar(l.conta_nome),
        numero(l.valor_previsto),
        numero(l.valor_realizado),
        numero(l.saldo_restante),
        escapar(l.estado),
        l.atrasado ? "sim" : "nao",
        escapar(l.competencia),
        escapar(l.origem_tipo),
      ].join(";"),
    ),
  ];
  const corpo = "﻿" + linhas.join("\r\n");
  return new Response(corpo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lancamentos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
