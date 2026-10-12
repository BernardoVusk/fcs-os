import Link from "next/link";
import { Search } from "lucide-react";
import { TIPO_CONHECIMENTO_ROTULO, TIPOS_CONHECIMENTO } from "@/dominio/conhecimento/tipos";
import { Input } from "@/componentes/ui/input";
import { Button } from "@/componentes/ui/button";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { cn } from "@/lib/utils";

export type FiltrosUrl = { q?: string; tipo?: string; categoria?: string; tag?: string; status?: string; modulo?: string };

/** Filtros via GET: a URL é o estado, então o link é compartilhável. */
export function FiltrosConhecimento({
  filtros,
  categorias,
  modulos,
}: {
  filtros: FiltrosUrl;
  categorias: { id: string; nome: string }[];
  modulos: string[];
}) {
  const ativos = Object.values(filtros).filter(Boolean).length;
  return (
    <form method="get" action="/conhecimento" className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-3" aria-hidden="true" />
        <Input name="q" defaultValue={filtros.q ?? ""} placeholder="Buscar no título, resumo, tags e conteúdo" aria-label="Buscar" className="rounded-full bg-superficie-2 pl-9" />
      </div>
      <SelectNativo name="tipo" defaultValue={filtros.tipo ?? ""} aria-label="Tipo" className="w-auto rounded-full">
        <option value="">Todos os tipos</option>
        {TIPOS_CONHECIMENTO.map((t) => (
          <option key={t} value={t}>
            {TIPO_CONHECIMENTO_ROTULO[t]}
          </option>
        ))}
      </SelectNativo>
      <SelectNativo name="categoria" defaultValue={filtros.categoria ?? ""} aria-label="Categoria" className="w-auto rounded-full">
        <option value="">Todas as categorias</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </SelectNativo>
      {modulos.length > 0 && (
        <SelectNativo name="modulo" defaultValue={filtros.modulo ?? ""} aria-label="Módulo" className="w-auto rounded-full">
          <option value="">Todos os módulos</option>
          {modulos.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </SelectNativo>
      )}
      <SelectNativo name="status" defaultValue={filtros.status ?? ""} aria-label="Situação" className="w-auto rounded-full">
        <option value="">Ativos e rascunhos</option>
        <option value="ativo">Só ativos</option>
        <option value="rascunho">Só rascunhos</option>
        <option value="arquivado">Arquivados</option>
      </SelectNativo>
      {filtros.tag && <input type="hidden" name="tag" value={filtros.tag} />}
      <Button type="submit" variant="secondary" size="sm">
        Filtrar
      </Button>
      <Link
        href="/conhecimento"
        className={cn("text-sm text-texto-2 underline-offset-4 hover:underline", ativos === 0 && "pointer-events-none opacity-0")}
        aria-hidden={ativos === 0}
      >
        Limpar
      </Link>
    </form>
  );
}
