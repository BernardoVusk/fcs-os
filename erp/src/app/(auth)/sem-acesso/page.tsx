import Link from "next/link";
import { sair } from "@/acoes/sessao";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Sem acesso" };

export default async function PaginaSemAcesso({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area } = await searchParams;
  return (
    <div className="rounded-md border border-borda bg-superficie p-6 text-center">
      <h1 className="mb-2 text-xl font-bold uppercase">Sem acesso</h1>
      <p className="mb-6 text-sm text-texto-2">
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
