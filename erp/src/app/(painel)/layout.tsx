import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth/sessao";
import { COOKIE_TEMA, lerTema } from "@/lib/tema";
import { gruposVisiveis } from "@/componentes/painel/navegacao";
import { contarAlertasAbertos } from "@/dados/alertas";
import { SidebarInset, SidebarProvider } from "@/componentes/ui/sidebar";
import { SidebarPainel } from "@/componentes/painel/Sidebar";
import { BarraTopo } from "@/componentes/painel/BarraTopo";
import { BuscaGlobal } from "@/componentes/painel/BuscaGlobal";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/sem-acesso");
  const jar = await cookies();
  const aberta = jar.get("sidebar_state")?.value !== "false";
  const tema = lerTema(jar.get(COOKIE_TEMA)?.value);
  const alertas = await contarAlertasAbertos();
  return (
    <SidebarProvider defaultOpen={aberta}>
      <SidebarPainel grupos={gruposVisiveis(usuario.papel)} usuario={usuario} contadores={{ alertas }} />
      <SidebarInset className="min-w-0">
        <BarraTopo papel={usuario.papel} tema={tema} />
        <main className="mx-auto w-full min-w-0 max-w-[1400px] flex-1 px-4 py-5 md:px-8 md:py-7">{children}</main>
      </SidebarInset>
      <BuscaGlobal />
    </SidebarProvider>
  );
}
