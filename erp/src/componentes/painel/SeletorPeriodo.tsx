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
    <nav
      aria-label="Período"
      className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-superficie-2 p-1"
    >
      {PERIODOS.map((p) => (
        <Link
          key={p.chave}
          href={`${base}?periodo=${p.chave}`}
          aria-current={p.chave === atual ? "page" : undefined}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
            p.chave === atual
              ? "bg-card font-medium text-texto shadow-painel"
              : "text-texto-2 hover:text-texto",
          )}
        >
          {p.rotulo}
        </Link>
      ))}
    </nav>
  );
}
