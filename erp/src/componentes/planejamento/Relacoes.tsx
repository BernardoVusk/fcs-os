"use client";

import Link from "next/link";
import { useActionState } from "react";
import { adicionarRelacao, removerRelacao } from "@/acoes/planejamento/itens";
import type { ItemDetalhe } from "@/dados/planejamento/planejamento";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

const ROTULO: Record<string, { de: string; para: string }> = {
  bloqueia: { de: "bloqueia", para: "bloqueado por" },
  relacionada: { de: "relacionado a", para: "relacionado a" },
};

/** Relações do item (bloqueia, relacionada) com formulário para ligar a outro item aberto. */
export function Relacoes({
  item,
  candidatos,
  editar,
}: {
  item: ItemDetalhe;
  candidatos: { id: string; titulo: string }[];
  editar: boolean;
}) {
  const [estado, acao, pendente] = useActionState(adicionarRelacao, FORM_INICIAL);
  useAoSalvar(estado);
  return (
    <div className="space-y-3">
      {item.relacoes.length === 0 ? (
        <p className="text-sm text-texto-3">Sem relações.</p>
      ) : (
        <ul className="space-y-1">
          {item.relacoes.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-sm">
              <span className="text-xs text-texto-3">{ROTULO[r.tipo]?.[r.direcao] ?? r.tipo}</span>
              <Link href={`/planejamento/itens/${r.outro.id}`} className="hover:underline">
                {r.outro.titulo}
              </Link>
              {editar && (
                <BotaoAcao acao={() => removerRelacao(r.id, item.id)} variant="ghost" size="sm">
                  Remover
                </BotaoAcao>
              )}
            </li>
          ))}
        </ul>
      )}
      {editar && candidatos.length > 0 && (
        <form action={acao} className="flex flex-wrap items-end gap-2" noValidate>
          <input type="hidden" name="de_id" value={item.id} />
          <Campo rotulo="Relação" nome="tipo" erro={estado.erros.tipo}>
            <SelectNativo id="tipo" name="tipo" defaultValue="relacionada" className="h-9 w-auto">
              <option value="relacionada">relacionado a</option>
              <option value="bloqueia">bloqueia</option>
            </SelectNativo>
          </Campo>
          <Campo rotulo="Item" nome="para_id" erro={estado.erros.para_id}>
            <SelectNativo
              id="para_id"
              name="para_id"
              defaultValue=""
              className="h-9 w-auto max-w-72"
            >
              <option value="">Escolha</option>
              {candidatos
                .filter((c) => c.id !== item.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titulo}
                  </option>
                ))}
            </SelectNativo>
          </Campo>
          <Button type="submit" size="sm" variant="secondary" disabled={pendente}>
            Ligar
          </Button>
          <CampoErro chave={estado.erros._form} />
        </form>
      )}
    </div>
  );
}
