import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { deslocarMes, nomeMes, somarDias } from "@/dominio/planejamento/calendario";
import type { TipoItem } from "@/dominio/planejamento/tipos";
import { Button } from "@/componentes/ui/button";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { cn } from "@/lib/utils";
import { FormItemRapido, type OpcoesItem } from "./FormItem";

export const VISOES = [
  { chave: "calendario", rotulo: "Calendário", rota: "/planejamento" },
  { chave: "quadro", rotulo: "Quadro", rota: "/planejamento/quadro" },
  { chave: "lista", rotulo: "Lista", rota: "/planejamento/lista" },
  { chave: "conteudos", rotulo: "Conteúdos", rota: "/planejamento/conteudos" },
] as const;
export type Visao = (typeof VISOES)[number]["chave"];

/** Cabeçalho das visões do planejamento: título, navegação de mês ou semana, abas e Novo item. */
export function CabecalhoPlanejamento({
  visao,
  titulo,
  descricao,
  mes,
  semana,
  base,
  editar,
  opcoes,
  tipoInicial,
  prazoInicial,
  extras,
}: {
  visao: Visao;
  titulo: string;
  descricao?: string;
  /** Navegação mensal (calendário e quadro). */
  mes?: string;
  /** Navegação semanal: segunda-feira da semana mostrada. */
  semana?: string;
  /** Rota da visão, para montar os links de mês e semana. */
  base: string;
  editar: boolean;
  opcoes: OpcoesItem;
  tipoInicial?: TipoItem;
  prazoInicial?: string;
  extras?: React.ReactNode;
}) {
  const pilula = (ativo: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
      ativo ? "bg-card font-medium text-texto shadow-painel" : "text-texto-2 hover:text-texto",
    );
  const sep = base.includes("?") ? "&" : "?";
  const comMes = (m: string) => `${base}${sep}mes=${m}`;
  const comSemana = (s: string) => `${base}${sep}semana=${s}`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{titulo}</h1>
          {descricao && <p className="mt-1 max-w-2xl text-sm text-texto-2">{descricao}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {extras}
          {editar && (
            <DialogoNovo rotulo="Novo item" titulo="Novo item">
              <FormItemRapido
                opcoes={opcoes}
                tipoInicial={tipoInicial}
                prazoInicial={prazoInicial}
              />
            </DialogoNovo>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Visão"
          className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-superficie-2 p-1"
        >
          {VISOES.map((v) => (
            <Link
              key={v.chave}
              href={mes && v.chave !== "conteudos" ? `${v.rota}?mes=${mes}` : v.rota}
              className={pilula(visao === v.chave)}
              aria-current={visao === v.chave ? "page" : undefined}
            >
              {v.rotulo}
            </Link>
          ))}
        </nav>
        {semana ? (
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label="Semana anterior">
              <Link href={comSemana(somarDias(semana, -7))}>
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Link
              href={comMes(semana.slice(0, 7))}
              className="min-w-44 text-center text-sm font-medium hover:underline"
            >
              Semana de {semana.slice(8, 10)}/{semana.slice(5, 7)}
            </Link>
            <Button asChild variant="ghost" size="icon" aria-label="Próxima semana">
              <Link href={comSemana(somarDias(semana, 7))}>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={base}>Mês</Link>
            </Button>
          </div>
        ) : mes ? (
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label="Mês anterior">
              <Link href={comMes(deslocarMes(mes, -1))}>
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <span className="min-w-44 text-center text-sm font-medium capitalize">
              {nomeMes(mes)}
            </span>
            <Button asChild variant="ghost" size="icon" aria-label="Próximo mês">
              <Link href={comMes(deslocarMes(mes, 1))}>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={base}>Hoje</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
