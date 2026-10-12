import { usuarioAtual } from "@/lib/auth/sessao";
import { PAPEL_ROTULO } from "@/lib/auth/papeis";
import { sair } from "@/acoes/sessao";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Perfil" };

export default async function PaginaPerfil() {
  const usuario = (await usuarioAtual())!;
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold uppercase">Perfil</h1>
      <dl className="grid grid-cols-[8rem_1fr] gap-y-2 rounded-md border border-borda bg-superficie p-4 text-sm">
        <dt className="text-texto-2">Nome</dt>
        <dd>{usuario.nome}</dd>
        <dt className="text-texto-2">E-mail</dt>
        <dd>{usuario.email}</dd>
        <dt className="text-texto-2">Papel</dt>
        <dd>{PAPEL_ROTULO[usuario.papel]}</dd>
      </dl>
      <p className="text-sm text-texto-2">
        Para trocar o tema, use o botão no topo. Troca de senha pela tela chega com a Fase 10.
      </p>
      <form action={sair}>
        <Button variant="secondary" type="submit">
          Sair
        </Button>
      </form>
    </div>
  );
}
