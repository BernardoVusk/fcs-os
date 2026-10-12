import Link from "next/link";
import type { ItemComFluxo } from "@/dados/planejamento/planejamento";
import {
  agruparPorDia,
  dataComDia,
  DIAS_CURTOS,
  gradeCalendario,
  horaCurta,
} from "@/dominio/planejamento/calendario";
import { atrasado } from "@/dominio/planejamento/filtros";
import { lerChecklist, progressoChecklist, type TipoItem } from "@/dominio/planejamento/tipos";
import { cn } from "@/lib/utils";

const MAX_CHIPS = 5;
const COR_TIPO: Record<TipoItem, string> = {
  tarefa: "bg-texto-3",
  conteudo: "bg-acao",
  projeto: "bg-alerta",
};

/** Chip de item na célula do calendário: hora, título; fechado riscado, atrasado em vermelho. */
export function ChipItem({
  item,
  href,
  hoje,
  empilhado = false,
}: {
  item: ItemComFluxo;
  href: string;
  hoje: string;
  empilhado?: boolean;
}) {
  const tarde = atrasado(item, hoje);
  const progresso = progressoChecklist(lerChecklist(item.checklist));
  return (
    <Link
      href={href}
      scroll={false}
      title={`${item.titulo} · ${item.status_nome}${progresso ? ` · ${progresso}%` : ""}`}
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] leading-tight transition-colors duration-150 hover:bg-superficie-2",
        empilhado ? "w-full" : "",
        item.fechado && "text-texto-3 line-through",
        tarde && "text-erro",
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          COR_TIPO[item.tipo as TipoItem] ?? "bg-texto-3",
        )}
      />
      {item.horario && (
        <span className="numeros shrink-0 text-texto-3">{horaCurta(item.horario)}</span>
      )}
      <span className="truncate">{item.titulo}</span>
    </Link>
  );
}

/**
 * Grade mensal de segunda a domingo com os itens como chips; hoje destacado; coluna da esquerda
 * numera a semana e conta os itens. Abaixo de md vira a lista dos dias com item.
 */
export function CalendarioMes({
  mes,
  itens,
  hoje,
  hrefDe,
  hrefSemana,
}: {
  mes: string;
  itens: ItemComFluxo[];
  hoje: string;
  hrefDe: (id: string) => string;
  hrefSemana: (dia: string) => string;
}) {
  const porDia = agruparPorDia(itens);
  const semanas = gradeCalendario(mes);
  const semData = porDia.get("") ?? [];
  const contar = (semana: (string | null)[]) =>
    semana.reduce(
      (s, d) => s + (d ? (porDia.get(d) ?? []).filter((i) => !i.fechado).length : 0),
      0,
    );
  return (
    <div className="grid gap-5">
      <div className="hidden overflow-hidden rounded-2xl bg-card shadow-painel md:block">
        <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b border-borda bg-superficie-2/60 text-xs font-medium text-texto-3">
          <span className="px-2 py-2" />
          {DIAS_CURTOS.map((d) => (
            <span key={d} className="px-2 py-2">
              {d}
            </span>
          ))}
        </div>
        {semanas.map((semana, i) => {
          const total = contar(semana);
          const primeiro = semana.find((d) => d !== null);
          return (
            <div
              key={i}
              className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b border-borda last:border-0"
            >
              <div className="flex flex-col items-start gap-1 border-r border-borda px-2 py-2 text-xs text-texto-3">
                {primeiro ? (
                  <Link
                    href={hrefSemana(primeiro)}
                    className="font-medium hover:text-acao"
                    title="Ver esta semana"
                  >
                    S{i + 1}
                  </Link>
                ) : (
                  <span className="font-medium">S{i + 1}</span>
                )}
                {total > 0 && <span className="numeros">{total}</span>}
              </div>
              {semana.map((dia, j) => {
                const lista = dia ? (porDia.get(dia) ?? []) : [];
                const ehHoje = dia === hoje;
                return (
                  <div
                    key={j}
                    className={cn(
                      "min-h-[112px] min-w-0 border-r border-borda p-1.5 last:border-0",
                      !dia && "bg-superficie-2/40",
                      dia && dia < hoje && "bg-superficie-2/20",
                    )}
                  >
                    {dia && (
                      <>
                        <span
                          className={cn(
                            "numeros mb-1 inline-grid size-6 place-items-center rounded-full text-xs font-semibold",
                            ehHoje ? "bg-acao text-acao-texto" : "text-texto-2",
                          )}
                        >
                          {Number(dia.slice(8, 10))}
                        </span>
                        <div className="grid gap-0.5">
                          {lista.slice(0, MAX_CHIPS).map((i) => (
                            <ChipItem
                              key={i.id}
                              item={i}
                              href={hrefDe(i.id)}
                              hoje={hoje}
                              empilhado
                            />
                          ))}
                          {lista.length > MAX_CHIPS && (
                            <Link
                              href={hrefSemana(dia)}
                              className="px-1.5 text-xs font-medium text-acao hover:underline"
                            >
                              +{lista.length - MAX_CHIPS} mais
                            </Link>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 md:hidden">
        {[...porDia]
          .filter(([d]) => d !== "")
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([dia, lista]) => (
            <section key={dia} className="rounded-2xl bg-card shadow-painel">
              <h2
                className={cn(
                  "border-b border-borda px-4 py-2 text-sm font-semibold",
                  dia === hoje ? "text-acao" : "text-texto",
                )}
              >
                {dataComDia(dia)}
              </h2>
              <div className="grid gap-0.5 p-2">
                {lista.map((i) => (
                  <ChipItem key={i.id} item={i} href={hrefDe(i.id)} hoje={hoje} />
                ))}
              </div>
            </section>
          ))}
        {[...porDia].filter(([d]) => d !== "").length === 0 && (
          <p className="text-sm text-texto-3">Nenhum item com data neste mês.</p>
        )}
      </div>

      {semData.length > 0 && (
        <section className="rounded-2xl bg-card shadow-painel">
          <h2 className="border-b border-borda px-4 py-2.5 text-sm font-semibold">
            Sem data{" "}
            <span className="numeros ml-1 text-xs font-normal text-texto-3">{semData.length}</span>
          </h2>
          <div className="grid gap-0.5 p-2 sm:grid-cols-2 lg:grid-cols-3">
            {semData.map((i) => (
              <ChipItem key={i.id} item={i} href={hrefDe(i.id)} hoje={hoje} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Sete colunas de segunda a domingo, com todos os itens do dia (sem limite de chips). */
export function SemanaVista({
  semana,
  itens,
  hoje,
  hrefDe,
}: {
  semana: string[];
  itens: ItemComFluxo[];
  hoje: string;
  hrefDe: (id: string) => string;
}) {
  const porDia = agruparPorDia(itens);
  return (
    <div className="grid gap-3 md:grid-cols-7 md:gap-0 md:overflow-hidden md:rounded-2xl md:bg-card md:shadow-painel">
      {semana.map((dia) => {
        const lista = porDia.get(dia) ?? [];
        const ehHoje = dia === hoje;
        return (
          <section
            key={dia}
            className="rounded-2xl bg-card shadow-painel md:min-h-[320px] md:rounded-none md:border-r md:border-borda md:shadow-none md:last:border-0"
          >
            <h2
              className={cn(
                "flex items-center justify-between border-b border-borda px-3 py-2 text-sm font-semibold",
                ehHoje ? "text-acao" : "text-texto",
              )}
            >
              {dataComDia(dia)}
              {lista.length > 0 && (
                <span className="numeros text-xs font-normal text-texto-3">{lista.length}</span>
              )}
            </h2>
            <div className="grid gap-0.5 p-1.5">
              {lista.map((i) => (
                <ChipItem key={i.id} item={i} href={hrefDe(i.id)} hoje={hoje} empilhado />
              ))}
              {lista.length === 0 && <p className="px-1.5 py-2 text-xs text-texto-3">Livre</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
