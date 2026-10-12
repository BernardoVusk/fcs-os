import Link from "next/link";
import { cn } from "@/lib/utils";

export const PERIODOS = [
  { chave: "mes", rotulo: "Este mês" },
  { chave: "mes-anterior", rotulo: "Mês anterior" },
  { chave: "30d", rotulo: "30 dias" },
  { chave: "12m", rotulo: "12 meses" },
] as const;
export type Periodo = (typeof PERIODOS)[number]["chave"];

export function lerPeriodo(valor: string | undefined): Periodo {
  return PERIODOS.some((p) => p.chave === valor) ? (valor as Periodo) : "mes";
}

export function SeletorPeriodo({ atual, base }: { atual: Periodo; base: string }) {
  return (
    <nav aria-label="Período" className="flex gap-1 rounded-md border border-borda bg-superficie p-1">
      {PERIODOS.map((p) => (
        <Link
          key={p.chave}
          href={`${base}?periodo=${p.chave}`}
          aria-current={p.chave === atual ? "page" : undefined}
          className={cn(
            "rounded-sm px-3 py-1 text-sm",
            p.chave === atual ? "bg-acao-suave text-texto" : "text-texto-2 hover:text-texto",
          )}
        >
          {p.rotulo}
        </Link>
      ))}
    </nav>
  );
}
