"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { alternarComponente } from "@/acoes/custos/parametros";
import type { ComponenteCusto } from "@/dados/custos/parametros";
import { erroPt } from "@/lib/erros-pt";
import { Switch } from "@/componentes/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";

const GRUPO: Record<string, string> = {
  material: "Material",
  maquina: "Máquina",
  energia: "Energia",
  mao_obra: "Mão de obra",
  complementar: "Complementares",
  fixo: "Fixo",
  taxas: "Taxas",
};

function Linha({ c, editar }: { c: ComponenteCusto; editar: boolean }) {
  const [pendente, iniciar] = useTransition();
  const fixo = !c.chave_motor;
  return (
    <TableRow className="h-11">
      <TableCell className="pl-5">
        <p className="font-medium">{c.nome}</p>
        {c.descricao && <p className="max-w-xl text-xs text-texto-2">{c.descricao}</p>}
      </TableCell>
      <TableCell className="text-texto-2">{GRUPO[c.grupo] ?? c.grupo}</TableCell>
      <TableCell>
        {fixo ? (
          <span className="text-xs text-texto-3">Sempre ativo</span>
        ) : (
          <Switch
            checked={c.ativo}
            disabled={!editar || pendente}
            aria-label={`${c.ativo ? "Desligar" : "Ligar"} ${c.nome}`}
            onCheckedChange={(valor) =>
              iniciar(async () => {
                const r = await alternarComponente(c.id, valor);
                if (r.ok) toast.success(r.mensagem);
                else toast.error(erroPt(r.erro) ?? "Algo deu errado.");
              })
            }
          />
        )}
      </TableCell>
    </TableRow>
  );
}

export function TabelaComponentes({
  componentes,
  editar,
}: {
  componentes: ComponenteCusto[];
  editar: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
      <Table>
        <TableHeader>
          <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
            <TableHead className="pl-5">Componente</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead>Entra no cálculo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {componentes.map((c) => (
            <Linha key={c.id} c={c} editar={editar} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
