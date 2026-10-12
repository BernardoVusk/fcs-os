import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONES = { info: Info, sucesso: CheckCircle2, alerta: AlertTriangle, erro: XCircle } as const;
const TOM = {
  info: "bg-acao-suave text-acao",
  sucesso: "bg-sucesso/15 text-sucesso",
  alerta: "bg-alerta/15 text-alerta",
  erro: "bg-erro/15 text-erro",
} as const;

export function Banner({
  tipo = "info",
  titulo,
  children,
  acao,
}: {
  tipo?: keyof typeof ICONES;
  titulo?: string;
  children?: React.ReactNode;
  acao?: React.ReactNode;
}) {
  const IconeTipo = ICONES[tipo];
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-card p-4 shadow-painel">
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", TOM[tipo])}>
        <IconeTipo className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 basis-56 text-sm">
        {titulo && <p className="font-medium">{titulo}</p>}
        {children && <div className="text-texto-2">{children}</div>}
      </div>
      {acao && <div className="ml-auto">{acao}</div>}
    </div>
  );
}
