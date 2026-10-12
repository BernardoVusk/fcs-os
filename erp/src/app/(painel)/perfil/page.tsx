import { usuarioAtual } from "@/lib/auth/sessao";
import { PAPEL_ROTULO } from "@/lib/auth/papeis";
import { sair } from "@/acoes/sessao";
import { Button } from "@/componentes/ui/button";
import { clienteServidor } from "@/lib/supabase/servidor";
import { Mfa } from "@/componentes/perfil/Mfa";

export const metadata = { title: "Perfil" };

export default async function PaginaPerfil() {
  const usuario = (await usuarioAtual())!;
  const supabase = await clienteServidor();
  const { data: fatores } = await supabase.auth.mfa.listFactors();
  const fatorAtivo = fatores?.totp.find((f) => f.status === "verified")?.id ?? null;
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Perfil</h1>
      <dl className="grid grid-cols-[8rem_1fr] gap-y-2 rounded-2xl bg-card p-5 text-sm shadow-painel">
        <dt className="text-texto-2">Nome</dt>
        <dd>{usuario.nome}</dd>
        <dt className="text-texto-2">E-mail</dt>
        <dd>{usuario.email}</dd>
        <dt className="text-texto-2">Papel</dt>
        <dd>{PAPEL_ROTULO[usuario.papel]}</dd>
      </dl>
      <section className="space-y-3 rounded-2xl bg-card p-5 shadow-painel">
        <h2 className="text-sm font-semibold">Verificação em duas etapas</h2>
        <Mfa fatorAtivoId={fatorAtivo} />
      </section>
      <p className="text-sm text-texto-2">
        Para trocar o tema, use o botão no topo. Troca de senha: pedir ao dono para redefinir pelo
        painel do Supabase.
      </p>
      <form action={sair}>
        <Button variant="secondary" type="submit">
          Sair
        </Button>
      </form>
    </div>
  );
}
