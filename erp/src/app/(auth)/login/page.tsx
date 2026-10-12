import Image from "next/image";
import { FormLogin } from "./FormLogin";

export const metadata = { title: "Entrar" };

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ voltar?: string }>;
}) {
  const { voltar } = await searchParams;
  return (
    <div className="rounded-3xl bg-card p-8 shadow-flutuante">
      <span className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-superficie-2 ring-1 ring-borda">
        <Image
          src="/logo.png"
          alt="FCS 3D Studio"
          width={1080}
          height={1080}
          className="size-12"
          priority
        />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Entrar no FCS ERP</h1>
      <p className="mt-1 mb-6 text-sm text-texto-2">Use o e-mail cadastrado pelo dono da conta.</p>
      <FormLogin voltar={voltar} />
    </div>
  );
}
