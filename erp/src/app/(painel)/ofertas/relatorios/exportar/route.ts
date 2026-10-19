import { usuarioAtual } from "@/lib/auth/sessao";
import { podeLer } from "@/lib/auth/papeis";
import { relatorioCliques, relatorioConversoes, relatorioEnvios } from "@/dados/ofertas/relatorios";
import { gerarCsv, nomeArquivo } from "@/dominio/relatorios/csv";
import { lerPlataforma } from "@/dominio/ofertas/plataformas";
import { intervaloDoPeriodo, intervaloPersonalizado } from "@/lib/formatos/periodo";
import { lerPeriodo } from "@/componentes/painel/SeletorPeriodo";
import { hojeSaoPaulo } from "@/lib/formatos/data";

const uuid = (v: string | null) => (v && /^[0-9a-f-]{36}$/.test(v) ? v : null);

/** CSV dos relatórios de ofertas (mesmos filtros da tela). */
export async function GET(req: Request) {
  const u = await usuarioAtual();
  if (!u || !podeLer(u.papel, "ofertas")) return new Response("Sem permissão", { status: 403 });
  const p = new URL(req.url).searchParams;
  const { inicio, fim } =
    intervaloPersonalizado(p.get("de") ?? undefined, p.get("ate") ?? undefined) ??
    intervaloDoPeriodo(lerPeriodo(p.get("periodo") ?? undefined));
  const f = {
    inicio,
    fim,
    grupo: uuid(p.get("grupo")),
    plataforma: lerPlataforma(p.get("plataforma")),
    fila: uuid(p.get("fila")),
    numero: uuid(p.get("numero")),
    campanha: p.get("campanha")?.slice(0, 60) || null,
  };
  const tipo = p.get("tipo");
  let csv: string;
  if (tipo === "conversoes") {
    const l = await relatorioConversoes(f);
    csv = gerarCsv(
      ["grupo", "plataforma", "situacao", "pedidos", "venda", "comissao"],
      l.map((r) => [
        r.grupo,
        r.plataforma,
        r.status,
        Number(r.pedidos),
        r.venda === null ? null : Number(r.venda),
        r.comissao === null ? null : Number(r.comissao),
      ]),
    );
  } else if (tipo === "cliques") {
    const l = await relatorioCliques(f);
    csv = gerarCsv(
      ["grupo", "plataforma", "cliques"],
      l.map((r) => [r.grupo, r.plataforma, Number(r.cliques)]),
    );
  } else {
    const l = await relatorioEnvios(f);
    csv = gerarCsv(
      [
        "grupo",
        "plataforma",
        "fila",
        "numero",
        "modo",
        "enviados",
        "falhas",
        "incertos",
        "ignorados",
      ],
      l.map((r) => [
        r.grupo,
        r.plataforma,
        r.fila,
        r.numero,
        r.modo,
        Number(r.enviados),
        Number(r.falhas),
        Number(r.incertos),
        Number(r.ignorados),
      ]),
    );
  }
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${nomeArquivo(`ofertas-${tipo ?? "envios"}`, "csv", hojeSaoPaulo())}"`,
      "cache-control": "no-store",
    },
  });
}
