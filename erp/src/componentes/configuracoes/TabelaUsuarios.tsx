"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import type { UsuarioLista } from "@/dados/configuracoes/usuarios";
import { alterarUsuario } from "@/acoes/configuracoes/usuarios";
import { PAPEIS, PAPEL_ROTULO } from "@/lib/auth/papeis";
import { formatarData } from "@/lib/formatos/data";
import { erroPt } from "@/lib/erros-pt";
import { Badge } from "@/componentes/ui/badge";
import { TabelaDados } from "@/componentes/painel/TabelaDados";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { SelectNativo } from "@/componentes/painel/SelectNativo";

export function TabelaUsuarios({ usuarios, meuId }: { usuarios: UsuarioLista[]; meuId: string }) {
  const colunas: ColumnDef<UsuarioLista, unknown>[] = [
    {
      accessorKey: "nome",
      header: "Nome",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.nome}
          {row.original.id === meuId && <span className="ml-2 text-xs text-texto-3">(você)</span>}
        </span>
      ),
    },
    { accessorKey: "email", header: "E-mail" },
    {
      accessorKey: "papel",
      header: "Papel",
      enableSorting: false,
      cell: ({ row }) => (
        <SelectNativo
          aria-label={`Papel de ${row.original.nome}`}
          className="h-8 w-36"
          defaultValue={row.original.papel}
          disabled={row.original.id === meuId}
          onChange={async (e) => {
            const r = await alterarUsuario(row.original.id, { papel: e.target.value });
            if (r.ok) toast.success(r.mensagem);
            else toast.error(erroPt(r.erro));
          }}
        >
          {PAPEIS.map((p) => (
            <option key={p} value={p}>
              {PAPEL_ROTULO[p]}
            </option>
          ))}
        </SelectNativo>
      ),
    },
    { accessorKey: "criado_em", header: "Desde", cell: ({ getValue }) => formatarData(getValue() as string) },
    {
      accessorKey: "ativo",
      header: "Situação",
      cell: ({ getValue }) => <Badge variant={getValue() ? "default" : "secondary"}>{getValue() ? "Ativo" : "Inativo"}</Badge>,
    },
    {
      id: "acoes",
      header: "",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.id === meuId ? null : (
          <span className="flex justify-end">
            <BotaoAcao
              acao={() => alterarUsuario(row.original.id, { ativo: !row.original.ativo })}
              confirmar={
                row.original.ativo
                  ? { titulo: `Desativar ${row.original.nome}?`, descricao: "A pessoa perde o acesso na hora. Pode ser reativada depois." }
                  : undefined
              }
            >
              {row.original.ativo ? "Desativar" : "Reativar"}
            </BotaoAcao>
          </span>
        ),
    },
  ];
  return <TabelaDados colunas={colunas} dados={usuarios} placeholderFiltro="Filtrar usuários" vazio={{ titulo: "Nenhum usuário" }} />;
}
