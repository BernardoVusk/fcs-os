import Link from "next/link";
import type { OrdemLista } from "@/dados/producao/ordens";
import type { CargaImpressora } from "@/dominio/producao/carga";
import { ESTADO_ORDEM_ROTULO, type EstadoOrdem } from "@/dominio/producao/custo-realizado";
import { formatarData } from "@/lib/formatos/data";
import { formatarNumero } from "@/lib/formatos/numero";
import { cn } from "@/lib/utils";

const COLUNAS: EstadoOrdem[] = ["fila", "imprimindo", "acabamento"];

export function QuadroOrdens({ ordens, hoje }: { ordens: OrdemLista[]; hoje: string }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {COLUNAS.map((estado) => {
        const lista = ordens.filter((o) => o.status === estado);
        return (
          <section
            key={estado}
            className="rounded-2xl bg-superficie-2/60 p-3"
            aria-label={ESTADO_ORDEM_ROTULO[estado]}
          >
            <h2 className="flex items-center justify-between px-1 text-sm font-semibold">
              {ESTADO_ORDEM_ROTULO[estado]}
              <span className="numeros rounded-full bg-card px-2 py-0.5 text-xs text-texto-2 shadow-painel">
                {lista.length}
              </span>
            </h2>
            <ul className="mt-2 space-y-2">
              {lista.length === 0 && (
                <li className="px-1 py-4 text-center text-xs text-texto-3">Nada aqui</li>
              )}
              {lista.map((o) => {
                const atrasada = o.prazo != null && o.prazo < hoje;
                return (
                  <li key={o.id}>
                    <Link
                      href={`/producao/ordens/${o.id}`}
                      className="block rounded-xl bg-card p-3 shadow-painel transition-colors hover:bg-acao-suave"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-texto-2">{o.codigo}</span>
                        {o.prioridade > 0 && (
                          <span className="numeros rounded-full bg-acao-suave px-2 text-[11px] text-acao">
                            prioridade {o.prioridade}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium">
                        {o.produto?.nome ?? "Produto"}
                        {o.variacao && <span className="text-texto-2"> · {o.variacao.nome}</span>}
                      </p>
                      <p className="numeros mt-1 text-xs text-texto-2">
                        {o.quantidade_planejada} peça(s) · {o.impressora?.nome ?? "sem impressora"}
                        {o.tempo_previsto_min != null &&
                          ` · ${formatarNumero(o.tempo_previsto_min / 60, 1)} h`}
                      </p>
                      <p
                        className={cn(
                          "numeros mt-1 text-xs",
                          atrasada ? "text-erro" : "text-texto-3",
                        )}
                      >
                        {o.prazo
                          ? `prazo ${formatarData(o.prazo)}${atrasada ? ", atrasada" : ""}`
                          : "sem prazo"}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function CargaImpressoras({
  carga,
  nomes,
}: {
  carga: CargaImpressora[];
  nomes: Record<string, string>;
}) {
  if (carga.length === 0) return null;
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
      {carga.map((c) => (
        <div key={c.impressora_id ?? "sem"} className="rounded-2xl bg-card p-4 shadow-painel">
          <p className="text-[13px] text-texto-2">
            {c.impressora_id ? (nomes[c.impressora_id] ?? "Impressora") : "Sem impressora"}
          </p>
          <p className="numeros mt-1 text-lg font-semibold">
            {formatarNumero(c.minutos_previstos / 60, 1)} h{" "}
            <span className="text-sm font-normal text-texto-2">em {c.ordens} ordem(ns)</span>
          </p>
          {c.atrasadas > 0 && (
            <p className="numeros mt-1 text-xs text-erro">{c.atrasadas} atrasada(s)</p>
          )}
        </div>
      ))}
    </div>
  );
}
