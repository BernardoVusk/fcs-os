import { formatarNumero } from "@/lib/formatos/numero";
import { cn } from "@/lib/utils";

export function CartaoIndicador({
  rotulo,
  valor,
  variacao,
  dica,
  rodape,
  className,
}: {
  rotulo: string;
  valor: string | null;
  variacao?: { percentual: number | null; rotulo: string };
  dica?: string;
  rodape?: React.ReactNode;
  className?: string;
}) {
  const semDados = valor === null;
  return (
    <section className={cn("flex flex-col gap-1 rounded-md border border-borda bg-superficie p-4", className)} aria-label={rotulo}>
      <h3 className="text-xs font-medium uppercase tracking-wide text-texto-2">{rotulo}</h3>
      <p className={cn("numeros font-titulo text-2xl font-bold", semDados && "text-lg font-medium text-texto-3")}>
        {semDados ? "Sem dados" : valor}
      </p>
      {!semDados && variacao && variacao.percentual !== null && (
        <p className={cn("text-xs", variacao.percentual >= 0 ? "text-sucesso" : "text-erro")}>
          {variacao.percentual >= 0 ? "+" : ""}
          {formatarNumero(variacao.percentual * 100, 1)} % {variacao.rotulo}
        </p>
      )}
      {semDados && dica && <p className="text-xs text-texto-3">{dica}</p>}
      {rodape}
    </section>
  );
}
