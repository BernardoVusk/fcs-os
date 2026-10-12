import { usuarioAtual } from "@/lib/auth/sessao";
import { podeLer } from "@/lib/auth/papeis";
import { lerPeriodo } from "@/componentes/painel/SeletorPeriodo";
import { intervaloDoPeriodo } from "@/lib/formatos/periodo";
import { hojeSaoPaulo } from "@/lib/formatos/data";
import { relatorios } from "@/dados/relatorios/relatorios";
import { gerarCsv, nomeArquivo } from "@/dominio/relatorios/csv";
import { gerarXlsx } from "@/dominio/relatorios/xlsx";
import {
  relatorioValido,
  tabelaCanais,
  tabelaConsumo,
  tabelaCusto,
  tabelaImpressoras,
  tabelaOrdens,
  tabelaPedidos,
  tabelaProdutos,
  type Tabela,
} from "@/dominio/relatorios/planilhas";

/** Exporta um relatório (ou todos, em XLSX com uma aba por relatório) para o período escolhido. */
export async function GET(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario || !podeLer(usuario.papel, "relatorios"))
    return new Response("Sem acesso", { status: 403 });
  const url = new URL(req.url);
  const periodo = lerPeriodo(url.searchParams.get("periodo") ?? undefined);
  const formato = url.searchParams.get("formato") === "xlsx" ? "xlsx" : "csv";
  const relatorio = url.searchParams.get("relatorio") ?? "tudo";
  const dados = await relatorios(intervaloDoPeriodo(periodo));
  const todas: Record<string, Tabela> = {
    produto: tabelaProdutos(dados.porProduto),
    canal: tabelaCanais(dados.porCanal),
    pedidos: tabelaPedidos(dados.pedidos),
    custo: tabelaCusto(dados.custoRealVsEstimado),
    ordens: tabelaOrdens(dados.ordens),
    impressoras: tabelaImpressoras(dados.impressoras),
    consumo: tabelaConsumo(dados.consumo),
  };
  const hoje = hojeSaoPaulo();
  const escolhidas: Tabela[] = relatorioValido(relatorio)
    ? [todas[relatorio]]
    : Object.values(todas);
  const base = relatorioValido(relatorio)
    ? `${todas[relatorio].nome}-${periodo}`
    : `relatorios-${periodo}`;
  if (formato === "xlsx") {
    const bytes = gerarXlsx(escolhidas);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nomeArquivo(base, "xlsx", hoje)}"`,
      },
    });
  }
  const t = escolhidas[0];
  return new Response(gerarCsv(t.cabecalho, t.linhas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo(base, "csv", hoje)}"`,
    },
  });
}
