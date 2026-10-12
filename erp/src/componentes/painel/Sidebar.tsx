"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User } from "lucide-react";
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-borda">
        <Link href="/" className="flex items-center gap-2 px-2" aria-label="FCS ERP, início">
          <Image src="/logo.png" alt="" width={1080} height={1080} className="size-8 shrink-0 rounded-sm" />
          <span className="font-titulo text-sm font-bold uppercase tracking-wide group-data-[collapsible=icon]:hidden">
            FCS ERP
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {grupos.map((grupo) => (
          <SidebarGroup key={grupo.rotulo}>
            <SidebarGroupLabel>{grupo.rotulo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.itens.map((item) => {
                  const contador = item.contador ? contadores[item.contador] : 0;
                  return (
                    <SidebarMenuItem key={item.rota}>
                      <SidebarMenuButton asChild isActive={itemAtivo(pathname, item.rota)} tooltip={item.rotulo}>
                        <Link href={item.rota}>
                          <Icone nome={item.icone} className="size-4" />
                          <span>{item.rotulo}</span>
                        </Link>
                      </SidebarMenuButton>
                      {contador > 0 && (
                        <SidebarMenuBadge className="bg-alerta text-fundo">{contador}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-borda">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip={usuario.nome} aria-label="Menu do usuário">
                  <User className="size-4" />
                  <span className="flex min-w-0 flex-col text-left leading-tight">
                    <span className="truncate text-sm">{usuario.nome}</span>
                    <span className="truncate text-xs text-texto-3">{PAPEL_ROTULO[usuario.papel]}</span>
                  </span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/perfil">Perfil</Link>
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
