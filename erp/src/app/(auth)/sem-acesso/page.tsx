import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { sair } from "@/acoes/sessao";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Sem acesso" };

export default async function PaginaSemAcesso({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area } = await searchParams;
  return (
    <div className="rounded-3xl bg-card p-8 text-center shadow-flutuante">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-alerta/15 text-alerta">
        <ShieldAlert className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sem acesso</h1>
      <p className="mt-2 mb-6 text-sm text-texto-2">
        {area
          ? `Sua conta não abre a área "${area}". Peça ao dono para ajustar o papel.`
          : "Sua conta ainda não foi liberada neste sistema. Peça ao dono para cadastrar seu papel."}
      </p>
      <div className="flex justify-center gap-2">
        <Button asChild variant="secondary">
          <Link href="/">Voltar ao início</Link>
        </Button>
        <form action={sair}>
          <Button type="submit" variant="ghost">
            Sair
          </Button>
        </form>
      </div>
    </div>
  );
}
