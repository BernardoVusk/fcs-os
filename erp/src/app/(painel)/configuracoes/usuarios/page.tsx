import { exigirLeitura } from "@/lib/auth/sessao";
import { listarUsuarios } from "@/dados/configuracoes/usuarios";
import { TabelaUsuarios } from "@/componentes/configuracoes/TabelaUsuarios";
import { FormUsuario } from "@/componentes/configuracoes/FormUsuario";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";

export const metadata = { title: "Usuários" };

export default async function PaginaUsuarios() {
  const usuario = await exigirLeitura("usuarios");
  const usuarios = await listarUsuarios();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-texto-2">
            Dono faz tudo. Operador cuida da operação sem ver o financeiro. Leitura só consulta.
          </p>
        </div>
        <DialogoNovo rotulo="Novo usuário" titulo="Novo usuário">
          <FormUsuario />
        </DialogoNovo>
      </div>
      <TabelaUsuarios usuarios={usuarios} meuId={usuario.id} />
    </div>
  );
}
