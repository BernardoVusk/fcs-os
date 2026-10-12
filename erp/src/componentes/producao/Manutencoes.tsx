"use client";

import { useActionState, useContext } from "react";
import { salvarManutencao } from "@/acoes/producao/ordens";
import type { Manutencao } from "@/dados/producao/ordens";
import { FORM_INICIAL } from "@/lib/forms";
import { numeroParaCampo } from "@/lib/formatos/numero";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { formatarData, hojeSaoPaulo } from "@/lib/formatos/data";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

export function FormManutencao({
  impressoraId,
  horasUso,
}: {
  impressoraId: string;
  horasUso: number;
}) {
  const [estado, acao, pendente] = useActionState(salvarManutencao, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="impressora_id" value={impressoraId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Tipo" nome="tipo" erro={estado.erros.tipo}>
          <SelectNativo id="tipo" name="tipo" defaultValue="preventiva">
            <option value="preventiva">Preventiva</option>
            <option value="corretiva">Corretiva</option>
          </SelectNativo>
        </Campo>
        <Campo rotulo="Data" nome="data" erro={estado.erros.data}>
          <Input id="data" name="data" type="date" defaultValue={hojeSaoPaulo()} required />
        </Campo>
        <Campo
          rotulo="Custo (R$)"
          nome="custo"
          erro={estado.erros.custo}
          dica="Peças e serviço. Zero se foi só limpeza."
        >
          <Input id="custo" name="custo" inputMode="decimal" defaultValue="0" className="numeros" />
        </Campo>
        <Campo
          rotulo="Horas de uso no momento"
          nome="horas_no_momento"
          erro={estado.erros.horas_no_momento}
        >
          <Input
            id="horas_no_momento"
            name="horas_no_momento"
            inputMode="decimal"
            defaultValue={numeroParaCampo(horasUso, 1)}
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo="Próxima em (horas de uso)"
          nome="proxima_em_horas"
          erro={estado.erros.proxima_em_horas}
        >
          <Input
            id="proxima_em_horas"
            name="proxima_em_horas"
            inputMode="decimal"
            className="numeros"
          />
        </Campo>
      </div>
      <Campo rotulo="O que foi feito" nome="descricao" erro={estado.erros.descricao}>
        <Input
          id="descricao"
          name="descricao"
          maxLength={500}
          required
          placeholder="Troca de bico 0,4, lubrificação dos eixos"
        />
      </Campo>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Registrar"}
      </Button>
    </form>
  );
}

export function TabelaManutencoes({ manutencoes }: { manutencoes: Manutencao[] }) {
  if (manutencoes.length === 0)
    return (
      <EstadoVazio
        titulo="Nenhuma manutenção registrada"
        descricao="Registre trocas de bico, lubrificação e reparos com custo e horas de uso."
      />
    );
  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
      <Table>
        <TableHeader>
          <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
            <TableHead className="pl-5">Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Custo</TableHead>
            <TableHead className="text-right">Horas no momento</TableHead>
            <TableHead className="text-right">Próxima em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {manutencoes.map((m) => (
            <TableRow key={m.id} className="h-11">
              <TableCell className="numeros pl-5">{formatarData(m.data)}</TableCell>
              <TableCell>
                <Badge variant={m.tipo === "corretiva" ? "secondary" : "outline"}>
                  {m.tipo === "corretiva" ? "Corretiva" : "Preventiva"}
                </Badge>
              </TableCell>
              <TableCell>{m.descricao}</TableCell>
              <TableCell className="numeros text-right">{formatarMoeda(m.custo)}</TableCell>
              <TableCell className="numeros text-right">
                {m.horas_no_momento == null
                  ? "Sem dados"
                  : `${numeroParaCampo(m.horas_no_momento, 1)} h`}
              </TableCell>
              <TableCell className="numeros text-right">
                {m.proxima_em_horas == null
                  ? "Sem dados"
                  : `${numeroParaCampo(m.proxima_em_horas, 1)} h`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
