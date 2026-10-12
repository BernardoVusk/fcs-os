import Link from "next/link";
import { Plus } from "lucide-react";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarOrdens } from "@/dados/producao/ordens";
import { listarImpressoras } from "@/dados/custos/impressoras";
import { cargaPorImpressora } from "@/dominio/producao/carga";
import { hojeSaoPaulo } from "@/lib/formatos/data";
import { CargaImpressoras, QuadroOrdens } from "@/componentes/producao/Quadro";
import { ListaOrdens } from "@/componentes/producao/Ordens";
import { Button } from "@/componentes/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Fila de produção" };

export default async function PaginaFila({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string }>;
}) {
  const usuario = await exigirLeitura("producao");
  const { visao } = await searchParams;
  const lista = visao === "lista";
  const [ordens, impressoras] = await Promise.all([
    listarOrdens(lista ? {} : { abertas: true }),
    listarImpressoras(),
  ]);
  const hoje = hojeSaoPaulo();
  const carga = cargaPorImpressora(ordens, {}, hoje);
  const nomes = Object.fromEntries(impressoras.map((i) => [i.id, i.nome]));
  const editar = podeEscrever(usuario.papel, "producao");
  const pilula = (ativo: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
      ativo ? "bg-card font-medium text-texto shadow-painel" : "text-texto-2 hover:text-texto",
    );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            Fila de produção
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Ordens por estado e carga prevista por impressora. Concluir uma ordem consome o
            filamento do lote e dá entrada nas peças prontas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <nav aria-label="Visão" className="inline-flex gap-0.5 rounded-full bg-superficie-2 p-1">
            <Link
              href="/producao/fila"
              className={pilula(!lista)}
              aria-current={!lista ? "page" : undefined}
            >
              Quadro
            </Link>
            <Link
              href="/producao/fila?visao=lista"
              className={pilula(lista)}
              aria-current={lista ? "page" : undefined}
            >
              Lista
            </Link>
          </nav>
          {editar && (
            <Button asChild size="sm">
              <Link href="/producao/ordens/nova">
                <Plus className="size-4" /> Nova ordem
              </Link>
            </Button>
          )}
        </div>
      </div>
      <CargaImpressoras carga={carga} nomes={nomes} />
      {lista ? <ListaOrdens ordens={ordens} /> : <QuadroOrdens ordens={ordens} hoje={hoje} />}
    </div>
  );
}
