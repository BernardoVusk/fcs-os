import Link from "next/link";
import { Plus } from "lucide-react";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import {
  categoriasDeConhecimento,
  listarConhecimentos,
  modulosExistentes,
} from "@/dados/conhecimento";
import { ListaConhecimentos } from "@/componentes/conhecimento/ListaConhecimentos";
import {
  FiltrosConhecimento,
  type FiltrosUrl,
} from "@/componentes/conhecimento/FiltrosConhecimento";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Base de conhecimento" };

export default async function PaginaConhecimento({
  searchParams,
}: {
  searchParams: Promise<FiltrosUrl>;
}) {
  const usuario = await exigirLeitura("conhecimento");
  const f = await searchParams;
  const [itens, categorias, modulos] = await Promise.all([
    listarConhecimentos({
      termo: f.q,
      tipo: f.tipo,
      categoriaId: f.categoria,
      tag: f.tag,
      status: f.status,
      modulo: f.modulo,
    }),
    categoriasDeConhecimento(),
    modulosExistentes(),
  ]);
  const editar = podeEscrever(usuario.papel, "conhecimento");
  const botaoNovo = editar ? (
    <Button asChild size="sm">
      <Link href="/conhecimento/novo">
        <Plus className="size-4" /> Novo conhecimento
      </Link>
    </Button>
  ) : null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            Base de conhecimento
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Procedimentos, soluções, perfis de impressão e decisões. O Claude Code lê e grava aqui
            pelas skills kb.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/conhecimento/decisoes">Decisões</Link>
          </Button>
          {botaoNovo}
        </div>
      </div>
      <FiltrosConhecimento filtros={f} categorias={categorias} modulos={modulos} />
      {f.tag && (
        <p className="text-sm text-texto-2">
          Filtrando pela tag <span className="font-medium text-texto">{f.tag}</span>.{" "}
          <Link href="/conhecimento" className="underline underline-offset-4">
            Remover
          </Link>
        </p>
      )}
      <ListaConhecimentos
        itens={itens}
        categorias={new Map(categorias.map((c) => [c.id, c.nome]))}
        vazio={{
          titulo: Object.values(f).some(Boolean)
            ? "Nada encontrado com esses filtros"
            : "A base ainda está vazia",
          descricao:
            'Registre o primeiro procedimento ou peça ao Claude Code: "salve isso na base de conhecimento".',
          acao: botaoNovo,
        }}
      />
    </div>
  );
}
