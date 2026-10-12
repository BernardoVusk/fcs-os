import Link from "next/link";
import { CheckCircle2, Lock } from "lucide-react";
import type { ResumoConhecimento } from "@/dados/conhecimento";
import { TIPO_CONHECIMENTO_ROTULO, type TipoConhecimento } from "@/dominio/conhecimento/tipos";
import { formatarData } from "@/lib/formatos/data";
import { Badge } from "@/componentes/ui/badge";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Tags } from "./Tags";

export function ListaConhecimentos({
  itens,
  categorias,
  vazio,
}: {
  itens: ResumoConhecimento[];
  categorias: Map<string, string>;
  vazio: { titulo: string; descricao?: string; acao?: React.ReactNode };
}) {
  if (itens.length === 0) return <EstadoVazio {...vazio} />;
  return (
    <ul className="overflow-hidden rounded-2xl bg-card shadow-painel">
      {itens.map((item) => (
        <li key={item.id} className="border-b border-borda last:border-b-0">
          <Link
            href={`/conhecimento/${item.id}`}
            className="grid gap-3 px-5 py-4 transition-colors duration-150 hover:bg-superficie-2/50 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
          >
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-[15px] font-medium">{item.titulo}</span>
                {item.validado && (
                  <span className="inline-flex items-center gap-1 text-xs text-sucesso">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" /> validado
                  </span>
                )}
                {item.confidencialidade === "restrito" && (
                  <span className="inline-flex items-center gap-1 text-xs text-texto-3">
                    <Lock className="size-3.5" aria-hidden="true" /> restrito
                  </span>
                )}
                {item.status !== "ativo" && (
                  <Badge variant="secondary">
                    {item.status === "rascunho" ? "Rascunho" : "Arquivado"}
                  </Badge>
                )}
              </div>
              {item.resumo && <p className="line-clamp-2 text-sm text-texto-2">{item.resumo}</p>}
              <Tags tags={item.tags} link={false} />
            </div>
            <div className="flex shrink-0 flex-row flex-wrap items-center gap-x-3 gap-y-1 text-xs text-texto-3 md:flex-col md:items-end">
              <Badge variant="outline" className="text-texto-2">
                {TIPO_CONHECIMENTO_ROTULO[item.tipo as TipoConhecimento] ?? item.tipo}
              </Badge>
              {item.categoria_id && categorias.get(item.categoria_id) && (
                <span>{categorias.get(item.categoria_id)}</span>
              )}
              <span className="numeros">{formatarData(item.atualizado_em)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
