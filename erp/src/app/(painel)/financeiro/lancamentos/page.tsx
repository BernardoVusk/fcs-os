import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import {
  listarCategoriasFinanceiras,
  listarContas,
  listarLancamentos,
  type FiltrosLancamento,
} from "@/dados/financeiro/financeiro";
import { FormLancamento } from "@/componentes/financeiro/FormLancamento";
import { TabelaLancamentos } from "@/componentes/financeiro/Lancamentos";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { Button } from "@/componentes/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Lançamentos" };

const ESTADOS: { chave: string; rotulo: string }[] = [
  { chave: "abertos", rotulo: "Abertos" },
  { chave: "atrasado", rotulo: "Vencidos" },
  { chave: "planejado", rotulo: "Planejados" },
  { chave: "parcial", rotulo: "Parciais" },
  { chave: "realizado", rotulo: "Realizados" },
  { chave: "cancelado", rotulo: "Cancelados" },
  { chave: "estornado", rotulo: "Estornados" },
];

export default async function PaginaLancamentos({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string;
    tipo?: string;
    inicio?: string;
    fim?: string;
    novo?: string;
    destaque?: string;
  }>;
}) {
  const usuario = await exigirLeitura("financeiro");
  const f = await searchParams;
  const estado = ESTADOS.some((e) => e.chave === f.estado)
    ? (f.estado as FiltrosLancamento["estado"])
    : undefined;
  const dataOuVazia = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const inicio = dataOuVazia(f.inicio);
  const fim = dataOuVazia(f.fim);
  const tipo =
    f.tipo === "receita" || f.tipo === "despesa" || f.tipo === "transferencia" ? f.tipo : undefined;
  const [itens, contas, categorias] = await Promise.all([
    listarLancamentos({ estado, tipo, inicio, fim, limite: 1000 }),
    listarContas(),
    listarCategoriasFinanceiras(),
  ]);
  const editar = podeEscrever(usuario.papel, "financeiro");
  const opContas = contas.filter((c) => c.ativo).map((c) => ({ id: c.id!, nome: c.nome! }));
  const opCategorias = categorias
    .filter((c) => c.ativo)
    .map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo }));
  const link = (mudanca: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const junto = { estado: f.estado, tipo: f.tipo, inicio: f.inicio, fim: f.fim, ...mudanca };
    for (const [k, v] of Object.entries(junto)) if (v) p.set(k, v);
    const q = p.toString();
    return q ? `/financeiro/lancamentos?${q}` : "/financeiro/lancamentos";
  };
  const pilula = (ativo: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
      ativo ? "bg-card font-medium text-texto shadow-painel" : "text-texto-2 hover:text-texto",
    );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Lançamentos</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            A pagar, a receber e transferências. Realize parcial ou total; corrija com estorno,
            nunca apagando.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <a
              href={`/financeiro/lancamentos/exportar${link({}).includes("?") ? link({}).slice(link({}).indexOf("?")) : ""}`}
            >
              Exportar CSV
            </a>
          </Button>
          {editar && (
            <DialogoNovo
              rotulo="Novo lançamento"
              titulo="Novo lançamento"
              abrirInicial={f.novo === "1"}
            >
              <FormLancamento contas={opContas} categorias={opCategorias} />
            </DialogoNovo>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <nav
          aria-label="Situação"
          className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-superficie-2 p-1"
        >
          <Link
            href={link({ estado: "" })}
            className={pilula(!estado)}
            aria-current={!estado ? "page" : undefined}
          >
            Todos
          </Link>
          {ESTADOS.map((e) => (
            <Link
              key={e.chave}
              href={link({ estado: e.chave })}
              className={pilula(estado === e.chave)}
              aria-current={estado === e.chave ? "page" : undefined}
            >
              {e.rotulo}
            </Link>
          ))}
        </nav>
        <nav aria-label="Tipo" className="inline-flex gap-0.5 rounded-full bg-superficie-2 p-1">
          <Link href={link({ tipo: "" })} className={pilula(!tipo)}>
            Tudo
          </Link>
          <Link href={link({ tipo: "receita" })} className={pilula(tipo === "receita")}>
            A receber
          </Link>
          <Link href={link({ tipo: "despesa" })} className={pilula(tipo === "despesa")}>
            A pagar
          </Link>
          <Link href={link({ tipo: "transferencia" })} className={pilula(tipo === "transferencia")}>
            Transferências
          </Link>
        </nav>
        <form className="flex items-center gap-2" method="get" action="/financeiro/lancamentos">
          {f.estado && <input type="hidden" name="estado" value={f.estado} />}
          {f.tipo && <input type="hidden" name="tipo" value={f.tipo} />}
          <input
            type="date"
            name="inicio"
            defaultValue={f.inicio ?? ""}
            aria-label="De"
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          />
          <input
            type="date"
            name="fim"
            defaultValue={f.fim ?? ""}
            aria-label="Até"
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          />
          <Button type="submit" variant="outline" size="sm">
            Filtrar período
          </Button>
        </form>
      </div>
      <TabelaLancamentos itens={itens} contas={opContas} editar={editar} destaque={f.destaque} />
    </div>
  );
}
