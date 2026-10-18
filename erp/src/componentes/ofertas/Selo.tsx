import { cn } from "@/lib/utils";
import type { Tom } from "@/dominio/ofertas/tom";

export type { Tom };

const CLASSES: Record<Tom, string> = {
  sucesso: "bg-sucesso/15 text-sucesso",
  alerta: "bg-alerta/15 text-alerta",
  erro: "bg-erro/15 text-erro",
  info: "bg-acao-suave text-acao",
  neutro: "bg-superficie-2 text-texto-2",
};

/** Etiqueta de status com tom semântico (sucesso, alerta, erro, info, neutro). */
export function Selo({
  tom,
  children,
  className,
}: {
  tom: Tom;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center rounded-full px-2 text-xs font-medium whitespace-nowrap",
        CLASSES[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}
