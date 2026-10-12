"use client";

import { useState } from "react";
import type { Impressora } from "@/dados/custos/impressoras";
import {
  custoHoraImpressora,
  custoHoraTotal,
  impressoraPronta,
  CAMPO_IMPRESSORA_ROTULO,
} from "@/dominio/custos/impressora";
import { formatarNumero } from "@/lib/formatos/numero";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { FormImpressora } from "./FormImpressora";
import { cn } from "@/lib/utils";

const STATUS: Record<string, { rotulo: string; variante: "default" | "secondary" | "outline" }> = {
  ativa: { rotulo: "Ativa", variante: "default" },
  manutencao: { rotulo: "Em manutenção", variante: "outline" },
  inativa: { rotulo: "Inativa", variante: "secondary" },
};

export function TabelaImpressoras({
  impressoras,
  editar,
  tarifaKwh,
  destaque,
}: {
  impressoras: Impressora[];
  editar: boolean;
  tarifaKwh: number | null;
  destaque?: string;
}) {
  const [aberta, setAberta] = useState<Impressora | null>(null);
  if (impressoras.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhuma impressora"
        descricao="Cadastre a impressora com custo de aquisição, vida útil, potência e manutenção para ter o custo por hora na calculadora."
      />
    );
  }
  return (
    <>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
              <TableHead className="pl-5">Impressora</TableHead>
              <TableHead>Custo por hora de máquina</TableHead>
              <TableHead>Energia por hora</TableHead>
              <TableHead>Horas de uso</TableHead>
              <TableHead>Situação</TableHead>
              {editar && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {impressoras.map((i) => {
              const pronta = impressoraPronta(i);
              const s = STATUS[i.status] ?? { rotulo: i.status, variante: "outline" as const };
              let maquina = "Não configurado";
              let energia = "Não configurado";
              let faltam: string | null = null;
              if (!pronta.ok)
                faltam = pronta.faltam.map((k) => CAMPO_IMPRESSORA_ROTULO[k]).join(", ");
              else if (tarifaKwh == null) {
                const c = custoHoraImpressora(pronta.dados, 0);
                maquina = `R$ ${formatarNumero(custoHoraTotal(c).maquina, 4)}`;
                energia = "Tarifa não configurada";
              } else {
                const c = custoHoraImpressora(pronta.dados, tarifaKwh);
                maquina = `R$ ${formatarNumero(custoHoraTotal(c).maquina, 4)}`;
                energia = `R$ ${formatarNumero(c.energia, 4)}`;
              }
              return (
                <TableRow
                  key={i.id}
                  className={cn("h-11", destaque === i.id && "bg-acao-suave hover:bg-acao-suave")}
                >
                  <TableCell className="pl-5">
                    <p className="font-medium">{i.nome}</p>
                    <p className="text-xs text-texto-3">
                      {[i.fabricante, i.modelo].filter(Boolean).join(" ") || "Sem fabricante"}
                    </p>
                  </TableCell>
                  <TableCell className="numeros">
                    {maquina}
                    {faltam && <span className="block text-xs text-alerta">Falta: {faltam}</span>}
                  </TableCell>
                  <TableCell className="numeros">{energia}</TableCell>
                  <TableCell className="numeros">{formatarNumero(i.horas_uso, 1)} h</TableCell>
                  <TableCell>
                    <Badge variant={s.variante}>{s.rotulo}</Badge>
                  </TableCell>
                  {editar && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setAberta(i)}>
                        Editar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Dialog open={aberta !== null} onOpenChange={(v) => !v && setAberta(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar impressora</DialogTitle>
          </DialogHeader>
          <ContextoDialogo.Provider value={() => setAberta(null)}>
            {aberta && <FormImpressora key={aberta.id} impressora={aberta} tarifaKwh={tarifaKwh} />}
          </ContextoDialogo.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}
