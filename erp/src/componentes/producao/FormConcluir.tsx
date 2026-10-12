"use client";

import { useActionState, useContext, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { concluirOrdem } from "@/acoes/producao/ordens";
import { FORM_INICIAL, type EstadoForm } from "@/lib/forms";
import { formatarQuantidade, lerNumeroPt, numeroParaCampo } from "@/lib/formatos/numero";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { toast } from "sonner";

export type InsumoConsumo = {
  id: string;
  nome: string;
  unidade: string;
  lotes: { id: string; codigo: string; quantidade_atual: number }[];
};
export type ConsumoInicial = {
  insumo_id: string;
  lote_id: string | null;
  quantidade: number | null;
};

export function FormConcluir({
  ordemId,
  planejadas,
  insumos,
  iniciais,
}: {
  ordemId: string;
  planejadas: number;
  insumos: InsumoConsumo[];
  iniciais: ConsumoInicial[];
}) {
  const fechar = useContext(ContextoDialogo);
  // O toast sai dentro da action: ao concluir, a página re-renderiza sem este diálogo e um efeito não rodaria.
  const [estado, acao, pendente] = useActionState(async (anterior: EstadoForm, fd: FormData) => {
    const r = await concluirOrdem(anterior, fd);
    if (r.ok) {
      toast.success(r.mensagem ?? "Ordem concluída.");
      fechar();
    }
    return r;
  }, FORM_INICIAL);
  const [aprovadas, setAprovadas] = useState(String(planejadas));
  const [perdidas, setPerdidas] = useState("0");
  const [linhas, setLinhas] = useState(
    iniciais.map((c, i) => ({
      chave: `c${i}`,
      insumo_id: c.insumo_id,
      lote_id: c.lote_id ?? "",
      quantidade: c.quantidade == null ? "" : numeroParaCampo(c.quantidade, 3),
      prevista: c.quantidade,
    })),
  );
  const [negativo, setNegativo] = useState(false);
  const consumos = linhas
    .filter((l) => l.insumo_id && lerNumeroPt(l.quantidade))
    .map((l) => ({
      insumo_id: l.insumo_id,
      lote_id: l.lote_id || null,
      quantidade: lerNumeroPt(l.quantidade) ?? 0,
      quantidade_prevista: l.prevista,
    }));
  const alterar = (chave: string, mudanca: Partial<(typeof linhas)[number]>) =>
    setLinhas(linhas.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));
  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="ordem_id" value={ordemId} />
      <input type="hidden" name="consumos" value={JSON.stringify(consumos)} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Campo
          rotulo="Peças boas"
          nome="quantidade_aprovada"
          erro={estado.erros.quantidade_aprovada}
        >
          <Input
            id="quantidade_aprovada"
            name="quantidade_aprovada"
            inputMode="numeric"
            value={aprovadas}
            onChange={(e) => setAprovadas(e.target.value)}
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo="Peças perdidas"
          nome="quantidade_perdida"
          erro={estado.erros.quantidade_perdida}
        >
          <Input
            id="quantidade_perdida"
            name="quantidade_perdida"
            inputMode="numeric"
            value={perdidas}
            onChange={(e) => setPerdidas(e.target.value)}
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo="Tempo real de impressão (min)"
          nome="tempo_real_min"
          erro={estado.erros.tempo_real_min}
        >
          <Input
            id="tempo_real_min"
            name="tempo_real_min"
            inputMode="decimal"
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo="Mão de obra (min)"
          nome="minutos_mao_de_obra"
          erro={estado.erros.minutos_mao_de_obra}
          dica="Preparo, acabamento e embalagem."
        >
          <Input
            id="minutos_mao_de_obra"
            name="minutos_mao_de_obra"
            inputMode="decimal"
            className="numeros"
          />
        </Campo>
      </div>
      {Number(perdidas) > 0 && (
        <Campo rotulo="Motivo das perdas" nome="motivo_falha" erro={estado.erros.motivo_falha}>
          <Input
            id="motivo_falha"
            name="motivo_falha"
            maxLength={300}
            placeholder="Descolou da mesa, entupiu, camada deslocada"
          />
        </Campo>
      )}
      <fieldset className="space-y-3 rounded-xl border border-borda p-3">
        <legend className="px-1 text-sm font-medium">Consumo real de material</legend>
        <p className="text-xs text-texto-3">
          Pese o rolo antes e depois. Sai do lote escolhido ao custo do lote; se faltar, completa
          com o mais antigo.
        </p>
        {linhas.map((l) => {
          const insumo = insumos.find((i) => i.id === l.insumo_id);
          return (
            <div
              key={l.chave}
              className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_auto]"
            >
              <SelectNativo
                aria-label="Insumo"
                value={l.insumo_id}
                onChange={(e) => alterar(l.chave, { insumo_id: e.target.value, lote_id: "" })}
              >
                {insumos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome}
                  </option>
                ))}
              </SelectNativo>
              <SelectNativo
                aria-label="Lote"
                value={l.lote_id}
                onChange={(e) => alterar(l.chave, { lote_id: e.target.value })}
              >
                <option value="">Mais antigo com saldo</option>
                {insumo?.lotes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.codigo} ({formatarQuantidade(lt.quantidade_atual, insumo.unidade)})
                  </option>
                ))}
              </SelectNativo>
              <Input
                aria-label={`Quantidade (${insumo?.unidade ?? ""})`}
                inputMode="decimal"
                value={l.quantidade}
                onChange={(e) => alterar(l.chave, { quantidade: e.target.value })}
                placeholder={insumo?.unidade}
                className="numeros"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remover linha"
                onClick={() => setLinhas(linhas.filter((x) => x.chave !== l.chave))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            setLinhas([
              ...linhas,
              {
                chave: `n${Date.now()}`,
                insumo_id: insumos[0]?.id ?? "",
                lote_id: "",
                quantidade: "",
                prevista: null,
              },
            ])
          }
          disabled={insumos.length === 0}
        >
          <Plus className="size-4" /> Outro insumo
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="permitir_negativo"
            value="sim"
            checked={negativo}
            onChange={(e) => setNegativo(e.target.checked)}
            className="size-4 accent-acao"
          />
          Deixar o lote negativo se faltar saldo (abre alerta)
        </label>
        {negativo && (
          <Campo rotulo="Justificativa" nome="justificativa" erro={estado.erros.justificativa}>
            <Textarea id="justificativa" name="justificativa" rows={2} maxLength={500} />
          </Campo>
        )}
      </fieldset>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Concluindo" : "Concluir ordem"}
      </Button>
    </form>
  );
}
