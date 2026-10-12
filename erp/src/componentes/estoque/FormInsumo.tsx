"use client";

import { useActionState, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { salvarInsumo } from "@/acoes/estoque/insumos";
import { TIPO_INSUMO_ROTULO, TIPOS_INSUMO } from "@/dominio/estoque/conversao";
import { FORM_INICIAL } from "@/lib/forms";
import { numeroParaCampo } from "@/lib/formatos/numero";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

export type InsumoForm = {
  id: string;
  tipo: string;
  nome: string;
  codigo_interno: string | null;
  unidade_base: string;
  categoria_id: string | null;
  estoque_minimo: number;
  localizacao: string | null;
  origem_custo: string;
  custo_manual: number | null;
  observacoes: string | null;
  ativo: boolean;
  atributos: unknown;
};

type Atributos = Partial<
  Record<"fabricante" | "material" | "cor" | "cor_hex" | "notas_tecnicas", string | null>
> &
  Partial<
    Record<
      | "diametro_mm"
      | "peso_util_padrao_g"
      | "peso_carretel_vazio_g"
      | "temperatura_bico"
      | "temperatura_mesa",
      number | null
    >
  >;

const numeroOuVazio = (v: number | null | undefined, casas = 2) => numeroParaCampo(v, casas);

export function FormInsumo({
  insumo,
  unidades,
  categorias,
}: {
  insumo?: InsumoForm;
  unidades: { codigo: string; nome: string }[];
  categorias: { id: string; nome: string }[];
}) {
  const [estado, acao, pendente] = useActionState(salvarInsumo, FORM_INICIAL);
  const [tipo, setTipo] = useState(insumo?.tipo ?? "filamento");
  const [origem, setOrigem] = useState(insumo?.origem_custo ?? "media");
  const fechar = useContext(ContextoDialogo);
  const router = useRouter();
  useAoSalvar(estado, () => {
    if (!insumo && estado.id) {
      fechar();
      router.push(`/estoque/insumos/${estado.id}`);
    }
  });
  const a = (insumo?.atributos ?? {}) as Atributos;
  const filamento = tipo === "filamento";
  return (
    <form action={acao} className="space-y-4" noValidate>
      {insumo && <input type="hidden" name="id" value={insumo.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Tipo" nome="tipo" erro={estado.erros.tipo}>
          <SelectNativo
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {TIPOS_INSUMO.map((t) => (
              <option key={t} value={t}>
                {TIPO_INSUMO_ROTULO[t]}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo
          rotulo="Código interno"
          nome="codigo_interno"
          erro={estado.erros.codigo_interno}
          dica="Opcional. Letras, números, ponto ou traço."
        >
          <Input
            id="codigo_interno"
            name="codigo_interno"
            defaultValue={insumo?.codigo_interno ?? ""}
            maxLength={30}
            className="font-mono"
          />
        </Campo>
      </div>
      <Campo
        rotulo="Nome"
        nome="nome"
        erro={estado.erros.nome}
        dica={filamento ? "Ex.: PLA preto 1,75 mm Voolt" : undefined}
      >
        <Input id="nome" name="nome" defaultValue={insumo?.nome} required maxLength={120} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo
          rotulo="Unidade base"
          nome="unidade_base"
          erro={estado.erros.unidade_base}
          dica={filamento ? "Filamento é sempre em gramas." : undefined}
        >
          <SelectNativo
            id="unidade_base"
            name="unidade_base"
            defaultValue={insumo?.unidade_base ?? "un"}
            disabled={filamento}
          >
            {filamento ? (
              <option value="g">g</option>
            ) : (
              unidades.map((u) => (
                <option key={u.codigo} value={u.codigo}>
                  {u.codigo} ({u.nome})
                </option>
              ))
            )}
          </SelectNativo>
          {filamento && <input type="hidden" name="unidade_base" value="g" />}
        </Campo>
        <Campo
          rotulo="Estoque mínimo"
          nome="estoque_minimo"
          erro={estado.erros.estoque_minimo}
          dica="Na unidade base. Zero desliga o alerta."
        >
          <Input
            id="estoque_minimo"
            name="estoque_minimo"
            inputMode="decimal"
            defaultValue={numeroOuVazio(insumo?.estoque_minimo ?? 0, 0)}
            className="numeros"
          />
        </Campo>
        <Campo rotulo="Categoria" nome="categoria_id" erro={estado.erros.categoria_id}>
          <SelectNativo
            id="categoria_id"
            name="categoria_id"
            defaultValue={insumo?.categoria_id ?? ""}
          >
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Localização" nome="localizacao" erro={estado.erros.localizacao}>
          <Input
            id="localizacao"
            name="localizacao"
            defaultValue={insumo?.localizacao ?? ""}
            maxLength={120}
            placeholder="Prateleira, caixa"
          />
        </Campo>
        <Campo rotulo="Custo para precificar" nome="origem_custo" erro={estado.erros.origem_custo}>
          <SelectNativo
            id="origem_custo"
            name="origem_custo"
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
          >
            <option value="media">Média ponderada do estoque</option>
            <option value="ultima_entrada">Última compra</option>
            <option value="manual">Valor manual</option>
          </SelectNativo>
        </Campo>
        <Campo
          rotulo="Custo manual (por unidade base)"
          nome="custo_manual"
          erro={estado.erros.custo_manual}
        >
          <Input
            id="custo_manual"
            name="custo_manual"
            inputMode="decimal"
            defaultValue={numeroOuVazio(insumo?.custo_manual, 5)}
            disabled={origem !== "manual"}
            className="numeros"
          />
        </Campo>
      </div>
      {filamento && (
        <fieldset className="space-y-4 rounded-xl border border-borda p-4">
          <legend className="px-1 text-sm font-medium">Dados técnicos do filamento</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo rotulo="Fabricante" nome="fabricante" erro={estado.erros.fabricante}>
              <Input
                id="fabricante"
                name="fabricante"
                defaultValue={a.fabricante ?? ""}
                maxLength={80}
              />
            </Campo>
            <Campo rotulo="Material" nome="material" erro={estado.erros.material}>
              <Input
                id="material"
                name="material"
                defaultValue={a.material ?? ""}
                maxLength={40}
                placeholder="PLA, PETG, ABS"
              />
            </Campo>
            <Campo rotulo="Cor" nome="cor" erro={estado.erros.cor}>
              <Input id="cor" name="cor" defaultValue={a.cor ?? ""} maxLength={40} />
            </Campo>
            <Campo rotulo="Cor (hex)" nome="cor_hex" erro={estado.erros.cor_hex}>
              <Input
                id="cor_hex"
                name="cor_hex"
                defaultValue={a.cor_hex ?? ""}
                maxLength={7}
                placeholder="#000000"
                className="font-mono"
              />
            </Campo>
            <Campo rotulo="Diâmetro (mm)" nome="diametro_mm" erro={estado.erros.diametro_mm}>
              <Input
                id="diametro_mm"
                name="diametro_mm"
                inputMode="decimal"
                defaultValue={numeroOuVazio(a.diametro_mm ?? 1.75)}
                className="numeros"
              />
            </Campo>
            <Campo
              rotulo="Peso útil padrão por rolo (g)"
              nome="peso_util_padrao_g"
              erro={estado.erros.peso_util_padrao_g}
              dica="Preenche a compra automaticamente."
            >
              <Input
                id="peso_util_padrao_g"
                name="peso_util_padrao_g"
                inputMode="decimal"
                defaultValue={numeroOuVazio(a.peso_util_padrao_g ?? 1000, 0)}
                className="numeros"
              />
            </Campo>
            <Campo
              rotulo="Carretel vazio (g)"
              nome="peso_carretel_vazio_g"
              erro={estado.erros.peso_carretel_vazio_g}
              dica="Para pesar o rolo e achar o saldo."
            >
              <Input
                id="peso_carretel_vazio_g"
                name="peso_carretel_vazio_g"
                inputMode="decimal"
                defaultValue={numeroOuVazio(a.peso_carretel_vazio_g, 0)}
                className="numeros"
              />
            </Campo>
            <Campo
              rotulo="Bico (graus)"
              nome="temperatura_bico"
              erro={estado.erros.temperatura_bico}
            >
              <Input
                id="temperatura_bico"
                name="temperatura_bico"
                inputMode="numeric"
                defaultValue={numeroOuVazio(a.temperatura_bico, 0)}
                className="numeros"
              />
            </Campo>
            <Campo
              rotulo="Mesa (graus)"
              nome="temperatura_mesa"
              erro={estado.erros.temperatura_mesa}
            >
              <Input
                id="temperatura_mesa"
                name="temperatura_mesa"
                inputMode="numeric"
                defaultValue={numeroOuVazio(a.temperatura_mesa, 0)}
                className="numeros"
              />
            </Campo>
          </div>
          <Campo rotulo="Notas técnicas" nome="notas_tecnicas" erro={estado.erros.notas_tecnicas}>
            <Textarea
              id="notas_tecnicas"
              name="notas_tecnicas"
              defaultValue={a.notas_tecnicas ?? ""}
              rows={2}
              maxLength={2000}
            />
          </Campo>
        </fieldset>
      )}
      {insumo && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ativo"
            value="sim"
            defaultChecked={insumo.ativo}
            className="size-4 accent-acao"
          />
          Insumo ativo
        </label>
      )}
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Textarea
          id="observacoes"
          name="observacoes"
          defaultValue={insumo?.observacoes ?? ""}
          rows={2}
          maxLength={2000}
        />
      </Campo>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Salvar"}
      </Button>
    </form>
  );
}
