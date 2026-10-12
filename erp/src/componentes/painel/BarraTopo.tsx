"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { podeEscrever, type Papel } from "@/lib/auth/papeis";
import type { Tema } from "@/lib/tema";
import { trilha } from "./navegacao";
import { SeletorTema } from "./SeletorTema";
import { SidebarTrigger } from "@/componentes/ui/sidebar";
import { Button } from "@/componentes/ui/button";
import { Separator } from "@/componentes/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/componentes/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/componentes/ui/dropdown-menu";

const ATALHOS_NOVO: { rotulo: string; rota: string; area: "configuracoes" }[] = [
  { rotulo: "Canal de venda", rota: "/configuracoes/canais?novo=1", area: "configuracoes" },
  { rotulo: "Categoria", rota: "/configuracoes/categorias?novo=1", area: "configuracoes" },
];

function abrirBusca() {
  window.dispatchEvent(new CustomEvent("fcs:abrir-busca"));
}

export function BarraTopo({ papel, tema }: { papel: Papel; tema: Tema }) {
  const pathname = usePathname();
  const partes = trilha(pathname);
  const atalhos = ATALHOS_NOVO.filter((a) => podeEscrever(papel, a.area));
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-borda bg-fundo/95 px-3 backdrop-blur md:px-4">
      <SidebarTrigger aria-label="Abrir ou recolher o menu" />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          <BreadcrumbItem>
            {partes.length === 0 ? (
              <BreadcrumbPage>Início</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link href="/">Início</Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {partes.map((p, i) => (
            <span key={p.rota} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {i === partes.length - 1 ? (
                  <BreadcrumbPage>{p.rotulo}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={p.rota}>{p.rotulo}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <Button
        variant="outline"
        size="sm"
        className="hidden min-w-56 justify-between text-texto-2 md:flex"
        onClick={abrirBusca}
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" /> Buscar
        </span>
        <kbd className="rounded-sm border border-borda bg-superficie-2 px-1.5 font-mono text-[11px]">Ctrl K</kbd>
      </Button>
      <Button variant="ghost" size="icon" className="md:hidden" aria-label="Buscar" onClick={abrirBusca}>
        <Search className="size-4" />
      </Button>
      {atalhos.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> <span className="hidden sm:inline">Novo</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {atalhos.map((a) => (
              <DropdownMenuItem key={a.rota} asChild>
                <Link href={a.rota}>{a.rotulo}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <SeletorTema inicial={tema} />
    </header>
  );
}
