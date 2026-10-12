"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, LogOut, User } from "lucide-react";
import { sair } from "@/acoes/sessao";
import { PAPEL_ROTULO, type Papel } from "@/lib/auth/papeis";
import { Icone } from "./Icone";
import { itemAtivo, type GrupoNav } from "./navegacao";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/componentes/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/componentes/ui/dropdown-menu";

type Usuario = { nome: string; email: string; papel: Papel };

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function SidebarPainel({
  grupos,
  usuario,
  contadores,
}: {
  grupos: GrupoNav[];
  usuario: Usuario;
  contadores: { alertas: number };
}) {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="h-14 justify-center">
        <Link href="/" className="flex items-center gap-2.5 px-1" aria-label="FCS ERP, início">
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-superficie ring-1 ring-borda">
            <Image src="/logo.png" alt="" width={1080} height={1080} className="size-8" />
          </span>
          <span className="font-titulo text-sm font-bold tracking-wide text-texto group-data-[collapsible=icon]:hidden">
            FCS ERP
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="gap-1">
        {grupos.map((grupo) => (
          <SidebarGroup key={grupo.rotulo} className="py-1">
            <SidebarGroupLabel className="h-7 px-2.5 text-xs font-medium text-texto-3">
              {grupo.rotulo}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {grupo.itens.map((item) => {
                  const contador = item.contador ? contadores[item.contador] : 0;
                  return (
                    <SidebarMenuItem key={item.rota}>
                      <SidebarMenuButton
                        asChild
                        isActive={itemAtivo(pathname, item.rota)}
                        tooltip={item.rotulo}
                        className="h-9 rounded-lg px-2.5 text-[13.5px] text-texto-2 transition-colors duration-150 hover:text-texto data-active:bg-acao data-active:text-acao-texto data-active:hover:bg-acao data-active:hover:text-acao-texto [&_svg]:size-[18px]"
                      >
                        <Link href={item.rota}>
                          <Icone nome={item.icone} />
                          <span>{item.rotulo}</span>
                        </Link>
                      </SidebarMenuButton>
                      {contador > 0 && (
                        <SidebarMenuBadge className="h-5 min-w-5 rounded-full bg-superficie-2 px-1.5 text-[11px] text-texto-2 peer-data-active/menu-button:bg-acao-texto/15 peer-data-active/menu-button:text-acao-texto">
                          {contador}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={usuario.nome}
                  aria-label="Menu do usuário"
                  className="h-12 rounded-xl px-2 hover:bg-superficie-2 data-open:bg-superficie-2"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-superficie-2 text-xs font-semibold text-texto ring-1 ring-borda">
                    {iniciais(usuario.nome)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
                    <span className="truncate text-sm font-medium">{usuario.nome}</span>
                    <span className="truncate text-xs text-texto-3">
                      {PAPEL_ROTULO[usuario.papel]}
                    </span>
                  </span>
                  <ChevronsUpDown className="size-4 text-texto-3" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 rounded-xl">
                <DropdownMenuItem asChild>
                  <Link href="/perfil">
                    <User className="size-4" /> Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void sair()}>
                  <LogOut className="size-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
