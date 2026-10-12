import Link from "next/link";
import { Button } from "@/componentes/ui/button";

export default function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
      <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Não encontrado</h1>
      <p className="text-sm text-texto-2">
        O registro não existe, foi apagado ou o endereço está errado. Use a busca (Ctrl+K) para
        achar pelo nome.
      </p>
      <Button asChild variant="secondary">
        <Link href="/">Ir para o início</Link>
      </Button>
    </div>
  );
}
