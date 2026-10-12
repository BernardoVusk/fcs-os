import { Inbox } from "lucide-react";

export function EstadoVazio({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-borda px-6 py-12 text-center">
      <Inbox className="size-6 text-texto-3" aria-hidden="true" />
      <p className="font-medium">{titulo}</p>
      {descricao && <p className="max-w-md text-sm text-texto-2">{descricao}</p>}
      {acao}
    </div>
  );
}
