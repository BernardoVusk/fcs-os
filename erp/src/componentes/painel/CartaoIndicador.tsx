import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { formatarNumero } from "@/lib/formatos/numero";
import { cn } from "@/lib/utils";

export function CartaoIndicador({
  rotulo,
  valor,
  variacao,
  dica,
  link,
  rodape,
  className,
}: {
  rotulo: string;
  valor: string | null;
  variacao?: { percentual: number | null; rotulo: string };
  dica?: string;
  link?: { href: string; rotulo: string };
  rodape?: React.ReactNode;
  className?: string;
}) {
  const semDados = valor === null;
  const sobe = (variacao?.percentual ?? 0) >= 0;
  return (
    <section className={cn("flex flex-col rounded-2xl bg-card p-5 shadow-painel", className)} aria-label={rotulo}>
      <h3 className="text-[13px] font-medium text-texto-2">{rotulo}</h3>
      <p
        className={cn(
          "numeros mt-2 leading-none font-semibold tracking-[-0.02em]",
          semDados ? "text-xl text-texto-3" : "text-[34px] text-texto",
        )}
      >
        {semDados ? "Sem dados" : valor}
      </p>
      {!semDados && variacao && variacao.percentual !== null && (
        <span
          className={cn(
            "mt-3 inline-flex w-fit items-center gap-1 rounded-full border border-borda px-2 py-0.5 text-xs font-medium",
            sobe ? "text-sucesso" : "text-erro",
          )}
        >
          {sobe ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          {sobe ? "+" : ""}
          {formatarNumero(variacao.percentual * 100, 1)} % {variacao.rotulo}
        </span>
      )}
      {semDados && dica && <p className="mt-2 text-xs text-texto-3">{dica}</p>}
      {rodape}
      {link && (
        <Link
          href={link.href}
          className="mt-4 flex items-center justify-between border-t border-borda pt-3 text-sm font-medium text-texto transition-colors hover:text-acao"
        >
          {link.rotulo}
          <ArrowRight className="size-4" />
        </Link>
      )}
    </section>
  );
}
