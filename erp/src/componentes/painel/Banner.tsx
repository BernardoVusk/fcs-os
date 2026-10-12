import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ESTILOS = {
  info: "border-acao/40",
  sucesso: "border-sucesso/50",
  alerta: "border-alerta/50",
  erro: "border-erro/50",
} as const;
const ICONES = { info: Info, sucesso: CheckCircle2, alerta: AlertTriangle, erro: XCircle } as const;
const COR_ICONE = { info: "text-acao", sucesso: "text-sucesso", alerta: "text-alerta", erro: "text-erro" } as const;

export function Banner({
  tipo = "info",
  titulo,
  children,
  acao,
}: {
  tipo?: keyof typeof ESTILOS;
  titulo?: string;
  children?: React.ReactNode;
  acao?: React.ReactNode;
}) {
  const IconeTipo = ICONES[tipo];
  return (
    <div role="status" className={cn("flex items-start gap-3 rounded-md border bg-superficie p-3 text-sm", ESTILOS[tipo])}>
      <IconeTipo className={cn("mt-0.5 size-4 shrink-0", COR_ICONE[tipo])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {titulo && <p className="font-medium">{titulo}</p>}
        {children && <div className="text-texto-2">{children}</div>}
      </div>
      {acao}
    </div>
  );
}
