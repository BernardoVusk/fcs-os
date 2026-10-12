import Image from "next/image";
import { FormLogin } from "./FormLogin";

export const metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ voltar?: string }> }) {
  const { voltar } = await searchParams;
  return (
    <div className="rounded-md border border-borda bg-superficie p-6">
      <Image src="/logo.png" alt="FCS 3D Studio" width={1080} height={1080} className="mx-auto mb-6 h-24 w-auto" priority />
      <h1 className="mb-6 text-center text-xl font-bold uppercase tracking-wide">Entrar</h1>
      <FormLogin voltar={voltar} />
    </div>
  );
}
