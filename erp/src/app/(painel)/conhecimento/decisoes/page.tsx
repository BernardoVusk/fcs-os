import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { listarDecisoes, modulosExistentes } from "@/dados/conhecimento";
import type { EstruturaDecisao } from "@/dominio/conhecimento/tipos";
import { formatarData } from "@/lib/formatos/data";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { cn } from "@/lib/utils";

export const metadata = { title: "Decisões" };

export default async function PaginaDecisoes({ searchParams }: { searchParams: Promise<{ modulo?: string }> }) {
  await exigirLeitura("conhecimento");
  const { modulo } = await searchParams;
  const [decisoes, modulos] = await Promise.all([listarDecisoes(modulo), modulosExistentes()]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Decisões</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          O que foi decidido, por quê e o que ficou de consequência. O Claude Code consulta esta lista antes de propor
          mudança.
        </p>
      </div>
      {modulos.length > 0 && (
        <nav aria-label="Módulo" className="flex flex-wrap gap-1">
          {["", ...modulos].map((m) => (
            <Link
              key={m || "todos"}
              href={m ? `/conhecimento/decisoes?modulo=${encodeURIComponent(m)}` : "/conhecimento/decisoes"}
              aria-current={(modulo ?? "") === m ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1 text-sm transition-colors",
                (modulo ?? "") === m ? "bg-acao text-acao-texto" : "bg-superficie-2 text-texto-2 hover:text-texto",
              )}
            >
              {m || "Todos"}
            </Link>
          ))}
        </nav>
      )}
      {decisoes.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma decisão registrada"
          descricao="Registre com o tipo Decisão ou peça ao Claude Code: /kb-decisao."
        />
      ) : (
        <ol className="space-y-3">
          {decisoes.map((d) => {
            const e = (d.estrutura ?? null) as EstruturaDecisao | null;
            return (
              <li key={d.id} className="rounded-2xl bg-card p-5 shadow-painel">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/conhecimento/${d.id}`} className="text-[15px] font-medium hover:text-acao">
                    {d.titulo}
                  </Link>
                  <span className="text-xs text-texto-3">
                    {d.modulo ? `${d.modulo} · ` : ""}
                    {formatarData(d.atualizado_em)}
                    {d.validado ? " · validada" : ""}
                  </span>
                </div>
                {e?.decisao ? (
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[7rem_1fr]">
                    {e.contexto && (
                      <>
                        <dt className="text-texto-3">Contexto</dt>
                        <dd className="text-texto-2">{e.contexto}</dd>
                      </>
                    )}
                    <dt className="text-texto-3">Decisão</dt>
                    <dd className="font-medium">{e.decisao}</dd>
                    {e.consequencias && (
                      <>
                        <dt className="text-texto-3">Consequências</dt>
                        <dd className="text-texto-2">{e.consequencias}</dd>
                      </>
                    )}
                  </dl>
                ) : (
                  d.resumo && <p className="mt-2 text-sm text-texto-2">{d.resumo}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
