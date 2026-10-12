"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { duplicarItem, mudarStatusItem } from "@/acoes/planejamento/itens";
import type { ItemDetalhe } from "@/dados/planejamento/planejamento";
import type { Fluxo } from "@/dominio/planejamento/filtros";
import { dataComDia, horaCurta } from "@/dominio/planejamento/calendario";
import {
  CANAL_PUBLICACAO_ROTULO,
  FORMATO_ROTULO,
  lerChecklist,
  lerLigacoes,
  PRIORIDADE_ROTULO,
  SKILL_PADRAO,
  TIPO_ITEM_ROTULO,
  type CanalPublicacao,
  type Formato,
  type Prioridade,
  type TipoItem,
} from "@/dominio/planejamento/tipos";
import { erroPt } from "@/lib/erros-pt";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/componentes/ui/sheet";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { Checklist } from "./Checklist";

/** Painel lateral aberto por `?item=`: resumo, status, checklist e atalho para o item completo. */
export function DrawerItem({
  item,
  fluxo,
  editar,
  voltar,
}: {
  item: ItemDetalhe | null;
  fluxo: Fluxo[];
  editar: boolean;
  voltar: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  function mudar(status: string) {
    if (!item) return;
    iniciar(async () => {
      const r = await mudarStatusItem(item.id, status);
      if (r.ok) {
        toast.success(r.mensagem ?? "Status alterado.");
        router.refresh();
      } else toast.error(erroPt(r.erro) ?? "Não deu para mudar o status.");
    });
  }
  const checklist = item ? lerChecklist(item.checklist) : [];
  const links = item ? [...lerLigacoes(item.links), ...lerLigacoes(item.referencias)] : [];
  const skill = item?.formato ? SKILL_PADRAO[item.formato as Formato] : null;
  return (
    <Sheet
      open={item !== null}
      onOpenChange={(aberto) => !aberto && router.push(voltar, { scroll: false })}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {item && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2 text-xs text-texto-3">
                <span>{TIPO_ITEM_ROTULO[item.tipo as TipoItem]}</span>
                {item.formato && <span>· {FORMATO_ROTULO[item.formato as Formato]}</span>}
                {item.canal_publicacao && (
                  <span>· {CANAL_PUBLICACAO_ROTULO[item.canal_publicacao as CanalPublicacao]}</span>
                )}
                {item.prioridade === "alta" && (
                  <Badge variant="outline" className="border-alerta/50 text-alerta">
                    {PRIORIDADE_ROTULO[item.prioridade as Prioridade]}
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-lg leading-snug">{item.titulo}</SheetTitle>
              <SheetDescription className="numeros">
                {item.prazo
                  ? `Prazo ${dataComDia(item.prazo)}`
                  : item.inicio
                    ? `Início ${dataComDia(item.inicio)}`
                    : "Sem data"}
                {item.horario && ` às ${horaCurta(item.horario)}`}
                {item.campanha && ` · ${item.campanha.nome}`}
                {item.produto && ` · ${item.produto.nome}`}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <SelectNativo
                  aria-label="Status"
                  value={item.status}
                  disabled={!editar || pendente}
                  onChange={(e) => mudar(e.target.value)}
                  className="h-9 w-auto min-w-40"
                >
                  {fluxo.map((f) => (
                    <option key={f.codigo} value={f.codigo}>
                      {f.nome}
                    </option>
                  ))}
                </SelectNativo>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/planejamento/itens/${item.id}`}>Abrir item</Link>
                </Button>
                {editar && (
                  <BotaoAcao variant="outline" acao={() => duplicarItem(item.id)}>
                    Duplicar
                  </BotaoAcao>
                )}
              </div>
              <section className="space-y-2">
                <h3 className="text-xs font-medium tracking-wide text-texto-3 uppercase">
                  Checklist
                </h3>
                <Checklist key={item.id} itemId={item.id} itens={checklist} editar={editar} />
              </section>
              {item.briefing && (
                <section className="space-y-1">
                  <h3 className="text-xs font-medium tracking-wide text-texto-3 uppercase">
                    Briefing
                  </h3>
                  <p className="text-sm whitespace-pre-line">{item.briefing}</p>
                </section>
              )}
              {item.cta && (
                <section className="space-y-1">
                  <h3 className="text-xs font-medium tracking-wide text-texto-3 uppercase">CTA</h3>
                  <p className="text-sm">{item.cta}</p>
                </section>
              )}
              {item.legenda && (
                <section className="space-y-1">
                  <h3 className="text-xs font-medium tracking-wide text-texto-3 uppercase">
                    Legenda
                  </h3>
                  <p className="line-clamp-6 text-sm whitespace-pre-line text-texto-2">
                    {item.legenda}
                  </p>
                </section>
              )}
              {links.length > 0 && (
                <section className="space-y-1">
                  <h3 className="text-xs font-medium tracking-wide text-texto-3 uppercase">
                    Links e referências
                  </h3>
                  <ul className="space-y-0.5 text-sm">
                    {links.map((l, n) => (
                      <li key={n}>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-acao hover:underline"
                        >
                          {l.rotulo}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {skill && (
                <p className="rounded-lg bg-superficie-2 px-3 py-2 font-mono text-xs text-texto-2">
                  No Claude Code: {skill} e peça para ler o item {item.id.slice(0, 8)} pelo MCP
                  (plan_obter).
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
