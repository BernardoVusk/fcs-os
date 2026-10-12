import { Inbox } from "lucide-react";

export function EstadoVazio({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-borda px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-superficie-2 text-texto-2">
        <Inbox className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="font-medium">{titulo}</p>
        {descricao && <p className="mt-1 max-w-md text-sm text-texto-2">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}
