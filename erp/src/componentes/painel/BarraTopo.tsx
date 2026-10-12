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
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-borda bg-superficie/95 px-3 backdrop-blur md:px-5">
      <SidebarTrigger aria-label="Abrir ou recolher o menu" className="rounded-full text-texto-2 hover:text-texto" />
      <Breadcrumb className="min-w-0 flex-1 pl-1">
        <BreadcrumbList className="text-[13px]">
          <BreadcrumbItem>
            {partes.length === 0 ? (
              <BreadcrumbPage className="font-medium">Início</BreadcrumbPage>
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
                  <BreadcrumbPage className="font-medium">{p.rotulo}</BreadcrumbPage>
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
      <button
        type="button"
        onClick={abrirBusca}
        className="hidden h-9 min-w-64 items-center gap-2 rounded-full bg-superficie-2 pr-2 pl-3 text-sm text-texto-2 transition-colors duration-150 hover:bg-superficie-3 hover:text-texto md:flex"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Buscar</span>
        <kbd className="rounded-full bg-superficie px-2 py-0.5 font-mono text-[11px] text-texto-3 ring-1 ring-borda">Ctrl K</kbd>
      </button>
      <Button variant="ghost" size="icon" className="rounded-full md:hidden" aria-label="Buscar" onClick={abrirBusca}>
        <Search className="size-4" />
      </Button>
      {atalhos.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> <span className="hidden sm:inline">Novo</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
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
