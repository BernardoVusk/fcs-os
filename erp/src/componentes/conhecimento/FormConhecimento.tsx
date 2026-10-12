"use client";

import { useActionState, useState } from "react";
import { salvarConhecimento } from "@/acoes/conhecimento";
import { FORM_INICIAL } from "@/lib/forms";
import {
  CONFIDENCIALIDADE_ROTULO,
  CONFIDENCIALIDADES,
  TIPO_CONHECIMENTO_ROTULO,
  TIPOS_CONHECIMENTO,
  type EstruturaDecisao,
  type TipoConhecimento,
} from "@/dominio/conhecimento/tipos";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";

export type ConhecimentoForm = {
  id: string;
  titulo: string;
  tipo: string;
  categoria_id: string | null;
  resumo: string | null;
  conteudo: string;
  tags: string[];
  modulo: string | null;
  projeto: string | null;
  referencia: string | null;
  confidencialidade: string;
  status: string;
  estrutura: unknown;
};

export function FormConhecimento({
  registro,
  categorias,
  modulos,
}: {
  registro?: ConhecimentoForm;
  categorias: { id: string; nome: string }[];
  modulos: string[];
}) {
  const [estado, acao, pendente] = useActionState(salvarConhecimento, FORM_INICIAL);
  const [tipo, setTipo] = useState<TipoConhecimento>((registro?.tipo as TipoConhecimento) ?? "nota");
  const decisao = (registro?.estrutura ?? null) as EstruturaDecisao | null;
  return (
    <form action={acao} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" noValidate>
      {registro && <input type="hidden" name="id" value={registro.id} />}
      <div className="space-y-5">
        <Campo rotulo="Título" nome="titulo" erro={estado.erros.titulo}>
          <Input id="titulo" name="titulo" defaultValue={registro?.titulo} required maxLength={160} className="h-11 text-base" />
        </Campo>
        <Campo rotulo="Resumo" nome="resumo" erro={estado.erros.resumo} dica="Uma ou duas frases. Aparece na lista e na busca do Claude Code.">
          <Textarea id="resumo" name="resumo" defaultValue={registro?.resumo ?? ""} rows={2} maxLength={400} />
        </Campo>
        {tipo === "decisao" && (
          <div className="grid gap-4 rounded-2xl bg-superficie-2/60 p-4">
            <Campo rotulo="Contexto" nome="contexto" erro={estado.erros.contexto} dica="O problema ou a situação que pediu a decisão">
              <Textarea id="contexto" name="contexto" defaultValue={decisao?.contexto ?? ""} rows={3} />
            </Campo>
            <Campo rotulo="Alternativas consideradas" nome="alternativas" erro={estado.erros.alternativas} dica="Uma por linha">
              <Textarea id="alternativas" name="alternativas" defaultValue={decisao?.alternativas?.join("\n") ?? ""} rows={3} />
            </Campo>
            <Campo rotulo="Decisão" nome="decisao" erro={estado.erros.decisao}>
              <Textarea id="decisao" name="decisao" defaultValue={decisao?.decisao ?? ""} rows={2} />
            </Campo>
            <Campo rotulo="Consequências" nome="consequencias" erro={estado.erros.consequencias} dica="O que fica mais fácil, o que fica mais difícil, o que precisa ser revisto">
              <Textarea id="consequencias" name="consequencias" defaultValue={decisao?.consequencias ?? ""} rows={2} />
            </Campo>
          </div>
        )}
        <Campo
          rotulo="Conteúdo"
          nome="conteudo"
          erro={estado.erros.conteudo}
          dica="Markdown: títulos com #, listas com -, código entre crases. Nunca cole chave ou senha."
        >
          <Textarea
            id="conteudo"
            name="conteudo"
            defaultValue={registro?.conteudo ?? ""}
            rows={18}
            required
            className="font-mono text-[13px] leading-6"
          />
        </Campo>
        {registro && (
          <Campo rotulo="Motivo da alteração" nome="motivo" erro={estado.erros.motivo} dica="Fica no histórico de versões">
            <Input id="motivo" name="motivo" maxLength={300} placeholder="Ex.: temperatura corrigida após teste" />
          </Campo>
        )}
      </div>
      <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <div className="space-y-4 rounded-2xl bg-card p-4 shadow-painel">
          <Campo rotulo="Tipo" nome="tipo" erro={estado.erros.tipo}>
            <SelectNativo id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoConhecimento)}>
              {TIPOS_CONHECIMENTO.map((t) => (
                <option key={t} value={t}>
                  {TIPO_CONHECIMENTO_ROTULO[t]}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo rotulo="Categoria" nome="categoria_id" erro={estado.erros.categoria_id}>
            <SelectNativo id="categoria_id" name="categoria_id" defaultValue={registro?.categoria_id ?? ""}>
              <option value="">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo rotulo="Tags" nome="tags" erro={estado.erros.tags} dica="Separadas por vírgula">
            <Input id="tags" name="tags" defaultValue={registro?.tags.join(", ") ?? ""} placeholder="petg, ender 3, bico" />
          </Campo>
          <Campo rotulo="Módulo" nome="modulo" erro={estado.erros.modulo} dica="Área do ERP ou da operação a que se refere">
            <Input id="modulo" name="modulo" defaultValue={registro?.modulo ?? ""} list="modulos-conhecidos" maxLength={60} placeholder="custos, estoque, impressao" />
            <datalist id="modulos-conhecidos">
              {modulos.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Campo>
          <Campo rotulo="Projeto" nome="projeto" erro={estado.erros.projeto}>
            <Input id="projeto" name="projeto" defaultValue={registro?.projeto ?? ""} maxLength={80} />
          </Campo>
          <Campo rotulo="Referência" nome="referencia" erro={estado.erros.referencia} dica="Arquivo, commit, link ou conversa de origem">
            <Input id="referencia" name="referencia" defaultValue={registro?.referencia ?? ""} maxLength={500} />
          </Campo>
          <Campo rotulo="Confidencialidade" nome="confidencialidade" erro={estado.erros.confidencialidade}>
            <SelectNativo id="confidencialidade" name="confidencialidade" defaultValue={registro?.confidencialidade ?? "interno"}>
              {CONFIDENCIALIDADES.map((c) => (
                <option key={c} value={c}>
                  {CONFIDENCIALIDADE_ROTULO[c]}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo rotulo="Situação" nome="status" erro={estado.erros.status}>
            <SelectNativo id="status" name="status" defaultValue={registro?.status === "rascunho" ? "rascunho" : "ativo"}>
              <option value="ativo">Ativo</option>
              <option value="rascunho">Rascunho</option>
            </SelectNativo>
          </Campo>
        </div>
        <CampoErro chave={estado.erros._form} />
        <Button type="submit" disabled={pendente} className="w-full">
          {pendente ? "Salvando" : registro ? "Salvar alterações" : "Criar conhecimento"}
        </Button>
      </aside>
    </form>
  );
}
