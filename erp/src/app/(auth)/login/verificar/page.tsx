import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";
import { FormVerificar } from "./FormVerificar";

export const metadata = { title: "Verificação" };

/** Segunda etapa do login para quem tem a verificação em duas etapas ativa. */
export default async function PaginaVerificar({
  searchParams,
}: {
  searchParams: Promise<{ voltar?: string }>;
}) {
  const { voltar } = await searchParams;
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: nivel } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (nivel?.currentLevel === "aal2" || nivel?.nextLevel !== "aal2")
    redirect(voltar && voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verificação em duas etapas</h1>
        <p className="mt-1 text-sm text-texto-2">
          Digite o código de 6 dígitos do aplicativo autenticador.
        </p>
      </div>
      <FormVerificar voltar={voltar} />
    </div>
  );
}
