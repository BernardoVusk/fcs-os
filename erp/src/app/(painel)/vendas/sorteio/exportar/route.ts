import { usuarioAtual } from "@/lib/auth/sessao";
import { podeLer } from "@/lib/auth/papeis";
import { hojeSaoPaulo } from "@/lib/formatos/data";
import { listarInscricoes } from "@/dados/vendas/sorteio";
import { gerarCsv, nomeArquivo } from "@/dominio/relatorios/csv";
import { referenciaAtual, referenciaValida } from "@/dominio/sorteio/referencia";
import { tabelaInscricoes } from "@/dominio/sorteio/planilha";

/** Exporta as inscrições de um mês em CSV (campanha de recompra, conferência do sorteio). */
export async function GET(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario || !podeLer(usuario.papel, "vendas"))
    return new Response("Sem acesso", { status: 403 });
  const url = new URL(req.url);
  const pedido = url.searchParams.get("referencia");
  const referencia = referenciaValida(pedido) ? pedido : referenciaAtual();
  const t = tabelaInscricoes(await listarInscricoes(referencia));
  return new Response(gerarCsv(t.cabecalho, t.linhas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo(`sorteio-${referencia}`, "csv", hojeSaoPaulo())}"`,
    },
  });
}
