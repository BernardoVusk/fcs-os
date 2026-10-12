import Link from "next/link";
import { TIPO_INSUMO_ROTULO, TIPOS_INSUMO } from "@/dominio/estoque/conversao";
import { cn } from "@/lib/utils";

export type FiltrosEstoqueUrl = { tipo?: string; situacao?: string; minimo?: string };

function Pilula({
  ativo,
  href,
  children,
}: {
  ativo: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
        ativo ? "bg-card font-medium text-texto shadow-painel" : "text-texto-2 hover:text-texto",
      )}
    >
      {children}
    </Link>
  );
}

function montar(f: FiltrosEstoqueUrl, mudanca: Partial<FiltrosEstoqueUrl>): string {
  const p = new URLSearchParams();
  const junto = { ...f, ...mudanca };
  if (junto.tipo) p.set("tipo", junto.tipo);
  if (junto.situacao && junto.situacao !== "ativos") p.set("situacao", junto.situacao);
  if (junto.minimo) p.set("minimo", junto.minimo);
  const q = p.toString();
  return q ? `/estoque/insumos?${q}` : "/estoque/insumos";
}

/** Pílulas de tipo e situação; o estado vive na URL. */
export function FiltrosEstoque({
  filtros,
  tiposPresentes,
}: {
  filtros: FiltrosEstoqueUrl;
  tiposPresentes: string[];
}) {
  const situacao = filtros.situacao ?? "ativos";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav
        aria-label="Tipo"
        className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-superficie-2 p-1"
      >
        <Pilula ativo={!filtros.tipo} href={montar(filtros, { tipo: "" })}>
          Todos
        </Pilula>
        {TIPOS_INSUMO.filter((t) => tiposPresentes.includes(t)).map((t) => (
          <Pilula key={t} ativo={filtros.tipo === t} href={montar(filtros, { tipo: t })}>
            {TIPO_INSUMO_ROTULO[t]}
          </Pilula>
        ))}
      </nav>
      <nav aria-label="Situação" className="inline-flex gap-0.5 rounded-full bg-superficie-2 p-1">
        <Pilula
          ativo={situacao === "ativos" && !filtros.minimo}
          href={montar(filtros, { situacao: "", minimo: "" })}
        >
          Ativos
        </Pilula>
        <Pilula
          ativo={Boolean(filtros.minimo)}
          href={montar(filtros, { situacao: "", minimo: "1" })}
        >
          Abaixo do mínimo
        </Pilula>
        <Pilula
          ativo={situacao === "inativos"}
          href={montar(filtros, { situacao: "inativos", minimo: "" })}
        >
          Inativos
        </Pilula>
      </nav>
    </div>
  );
}
