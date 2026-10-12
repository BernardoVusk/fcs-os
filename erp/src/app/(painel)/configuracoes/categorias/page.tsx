import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import {
  ESCOPO_ROTULO,
  ESCOPOS,
  listarCategorias,
  type Escopo,
} from "@/dados/configuracoes/categorias";
import { TabelaCategorias } from "@/componentes/configuracoes/TabelaCategorias";
import { FormCategoria } from "@/componentes/configuracoes/FormCategoria";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { cn } from "@/lib/utils";

export const metadata = { title: "Categorias" };

export default async function PaginaCategorias({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string; novo?: string; destaque?: string }>;
}) {
  const usuario = await exigirLeitura("configuracoes");
  const sp = await searchParams;
  const escopo: Escopo = ESCOPOS.includes(sp.escopo as Escopo) ? (sp.escopo as Escopo) : "produto";
  const categorias = await listarCategorias(escopo);
  const editar = podeEscrever(usuario.papel, "configuracoes");
  const opcoesPai = categorias.map((c) => ({ id: c.id, nome: c.nome }));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Categorias</h1>
        {editar && (
          <DialogoNovo
            rotulo="Nova categoria"
            titulo={`Nova categoria em ${ESCOPO_ROTULO[escopo]}`}
            abrirInicial={sp.novo === "1"}
          >
            <FormCategoria escopo={escopo} opcoesPai={opcoesPai} />
          </DialogoNovo>
        )}
      </div>
      <nav aria-label="Escopo" className="flex flex-wrap gap-1 border-b border-borda">
        {ESCOPOS.map((e) => (
          <Link
            key={e}
            href={`/configuracoes/categorias?escopo=${e}`}
            aria-current={e === escopo ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              e === escopo
                ? "border-acao text-texto"
                : "border-transparent text-texto-2 hover:text-texto",
            )}
          >
            {ESCOPO_ROTULO[e]}
          </Link>
        ))}
      </nav>
      <TabelaCategorias
        categorias={categorias}
        escopo={escopo}
        editar={editar}
        destaque={sp.destaque}
      />
    </div>
  );
}
