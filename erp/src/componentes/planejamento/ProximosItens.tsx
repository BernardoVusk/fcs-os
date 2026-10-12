import Link from "next/link";
import type { ProximosItens as Dados } from "@/dados/planejamento/planejamento";
import { dataComDia, horaCurta } from "@/dominio/planejamento/calendario";
import {
  CANAL_PUBLICACAO_ROTULO,
  FORMATO_ROTULO,
  TIPO_ITEM_ROTULO,
  type CanalPublicacao,
  type Formato,
  type TipoItem,
} from "@/dominio/planejamento/tipos";
import { Badge } from "@/componentes/ui/badge";

/** Cartão do painel inicial: o que vence nos próximos 7 dias e quantos atrasados. */
export function ProximosItens({ proximos, atrasados, hoje }: Dados & { hoje: string }) {
  return (
    <section className="rounded-2xl bg-card p-5 shadow-painel md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-texto-2">Próximos 7 dias no planejamento</h2>
        <div className="flex items-center gap-2">
          {atrasados > 0 && (
            <Link href="/planejamento/lista?rapido=atrasados">
              <Badge variant="outline" className="border-erro/40 text-erro">
                {atrasados} atrasado{atrasados === 1 ? "" : "s"}
              </Badge>
            </Link>
          )}
          <Link href="/planejamento" className="text-sm text-acao hover:underline">
            Abrir o calendário
          </Link>
        </div>
      </div>
      {proximos.length === 0 ? (
        <p className="mt-3 text-sm text-texto-3">
          Nada com data até {dataComDia(somar(hoje, 7))}. Planeje a semana em Planejamento.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-borda">
          {proximos.map((i) => {
            const data = i.prazo ?? i.inicio ?? hoje;
            return (
              <li key={i.id} className="flex items-center gap-3 py-2">
                <span
                  className={`numeros w-20 shrink-0 text-xs ${data === hoje ? "font-semibold text-acao" : "text-texto-3"}`}
                >
                  {data === hoje ? "Hoje" : dataComDia(data)}
                  {i.horario && <span className="block">{horaCurta(i.horario)}</span>}
                </span>
                <Link
                  href={`/planejamento/itens/${i.id}`}
                  className="min-w-0 flex-1 truncate text-sm hover:underline"
                >
                  {i.titulo}
                </Link>
                <span className="hidden text-xs text-texto-3 sm:inline">
                  {i.tipo === "conteudo" && i.formato
                    ? `${FORMATO_ROTULO[i.formato as Formato]}${i.canal_publicacao ? ` · ${CANAL_PUBLICACAO_ROTULO[i.canal_publicacao as CanalPublicacao]}` : ""}`
                    : TIPO_ITEM_ROTULO[i.tipo as TipoItem]}
                </span>
                <Badge variant="outline">{i.status_nome}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function somar(iso: string, n: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}
