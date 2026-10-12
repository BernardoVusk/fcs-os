"use client";

import { useActionState, useContext, useState } from "react";
import { salvarItem } from "@/acoes/planejamento/itens";
import type { ItemPlano } from "@/dados/planejamento/planejamento";
import {
  CANAIS_PUBLICACAO,
  CANAL_PADRAO,
  CANAL_PUBLICACAO_ROTULO,
  CHAVES_METRICA,
  FORMATO_ROTULO,
  FORMATOS,
  lerChecklist,
  lerLigacoes,
  lerMetricas,
  METRICA_ROTULO,
  PRIORIDADE_ROTULO,
  PRIORIDADES,
  TIPO_ITEM_ROTULO,
  TIPOS_ITEM,
  type TipoItem,
} from "@/dominio/planejamento/tipos";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

export type OpcoesItem = {
  campanhas: { id: string; nome: string }[];
  produtos: { id: string; nome: string }[];
  categorias: { id: string; nome: string }[];
  modelos: { id: string; nome: string; tipo: string }[];
  fluxos: { tipo: string; codigo: string; nome: string }[];
};

/** Criação rápida (diálogo): tipo, título, prazo e modelo. "Criar e abrir" leva ao item completo. */
export function FormItemRapido({
  opcoes,
  tipoInicial = "tarefa",
  prazoInicial = "",
}: {
  opcoes: OpcoesItem;
  tipoInicial?: TipoItem;
  prazoInicial?: string;
}) {
  const [estado, acao, pendente] = useActionState(salvarItem, FORM_INICIAL);
  const [tipo, setTipo] = useState<string>(tipoInicial);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Tipo" nome="tipo" erro={estado.erros.tipo}>
          <SelectNativo
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {TIPOS_ITEM.map((t) => (
              <option key={t} value={t}>
                {TIPO_ITEM_ROTULO[t]}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Prazo" nome="prazo" erro={estado.erros.prazo}>
          <Input id="prazo" name="prazo" type="date" defaultValue={prazoInicial} />
        </Campo>
      </div>
      <Campo rotulo="Título" nome="titulo" erro={estado.erros.titulo}>
        <Input
          id="titulo"
          name="titulo"
          required
          maxLength={160}
          autoFocus
          placeholder="Reel do Porsche 911, Fotos do kit de miniaturas"
        />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Modelo"
          nome="modelo_id"
          erro={estado.erros.modelo_id}
          dica="Preenche briefing, canal, formato e checklist."
        >
          <SelectNativo id="modelo_id" name="modelo_id" defaultValue="">
            <option value="">Sem modelo</option>
            {opcoes.modelos
              .filter((m) => m.tipo === tipo)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
          </SelectNativo>
        </Campo>
        {tipo === "conteudo" && (
          <Campo rotulo="Formato" nome="formato" erro={estado.erros.formato}>
            <SelectNativo id="formato" name="formato" defaultValue="">
              <option value="">Definir depois</option>
              {FORMATOS.map((f) => (
                <option key={f} value={f}>
                  {FORMATO_ROTULO[f]}
                </option>
              ))}
            </SelectNativo>
          </Campo>
        )}
      </div>
      <CampoErro chave={estado.erros._form} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="apos" value="ficar" disabled={pendente}>
          {pendente ? "Criando" : "Criar"}
        </Button>
        <Button type="submit" name="apos" value="abrir" variant="secondary" disabled={pendente}>
          Criar e abrir
        </Button>
      </div>
    </form>
  );
}

/** Formulário completo: usado em /planejamento/itens/novo e na edição. */
export function FormItem({
  item,
  opcoes,
  tipoInicial = "tarefa",
  prazoInicial = "",
}: {
  item?: ItemPlano;
  opcoes: OpcoesItem;
  tipoInicial?: TipoItem;
  prazoInicial?: string;
}) {
  const [estado, acao, pendente] = useActionState(salvarItem, FORM_INICIAL);
  const [tipo, setTipo] = useState<string>(item?.tipo ?? tipoInicial);
  const [formato, setFormato] = useState<string>(item?.formato ?? "");
  const [canal, setCanal] = useState<string>(item?.canal_publicacao ?? "");
  useAoSalvar(estado);
  const conteudo = tipo === "conteudo";
  const checklist = item
    ? lerChecklist(item.checklist)
        .map((c) => c.nome)
        .join("\n")
    : "";
  const links = item
    ? lerLigacoes(item.links)
        .map((l) => (l.rotulo === l.url ? l.url : `${l.rotulo} | ${l.url}`))
        .join("\n")
    : "";
  const referencias = item
    ? lerLigacoes(item.referencias)
        .map((l) => (l.rotulo === l.url ? l.url : `${l.rotulo} | ${l.url}`))
        .join("\n")
    : "";
  const metricas = item ? lerMetricas(item.metricas) : {};
  return (
    <form action={acao} className="space-y-6" noValidate>
      {item && <input type="hidden" name="id" value={item.id} />}
      {!item && <input type="hidden" name="apos" value="abrir" />}
      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo rotulo="Tipo" nome="tipo" erro={estado.erros.tipo}>
            <SelectNativo
              id="tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              disabled={Boolean(item)}
            >
              {TIPOS_ITEM.map((t) => (
                <option key={t} value={t}>
                  {TIPO_ITEM_ROTULO[t]}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          {item ? (
            <Campo rotulo="Status" nome="status" erro={estado.erros.status}>
              <SelectNativo id="status" name="status" defaultValue={item.status}>
                {opcoes.fluxos
                  .filter((f) => f.tipo === item.tipo)
                  .map((f) => (
                    <option key={f.codigo} value={f.codigo}>
                      {f.nome}
                    </option>
                  ))}
              </SelectNativo>
            </Campo>
          ) : (
            <Campo
              rotulo="Modelo"
              nome="modelo_id"
              erro={estado.erros.modelo_id}
              dica="Preenche o que ficar vazio e o checklist."
            >
              <SelectNativo id="modelo_id" name="modelo_id" defaultValue="">
                <option value="">Sem modelo</option>
                {opcoes.modelos
                  .filter((m) => m.tipo === tipo)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
              </SelectNativo>
            </Campo>
          )}
          <Campo rotulo="Prioridade" nome="prioridade" erro={estado.erros.prioridade}>
            <SelectNativo
              id="prioridade"
              name="prioridade"
              defaultValue={item?.prioridade ?? "media"}
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {PRIORIDADE_ROTULO[p]}
                </option>
              ))}
            </SelectNativo>
          </Campo>
        </div>
        <Campo rotulo="Título" nome="titulo" erro={estado.erros.titulo}>
          <Input
            id="titulo"
            name="titulo"
            defaultValue={item?.titulo ?? ""}
            required
            maxLength={160}
          />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-4">
          <Campo rotulo="Início" nome="inicio" erro={estado.erros.inicio}>
            <Input id="inicio" name="inicio" type="date" defaultValue={item?.inicio ?? ""} />
          </Campo>
          <Campo rotulo="Prazo" nome="prazo" erro={estado.erros.prazo}>
            <Input id="prazo" name="prazo" type="date" defaultValue={item?.prazo ?? prazoInicial} />
          </Campo>
          <Campo rotulo="Horário" nome="horario" erro={estado.erros.horario}>
            <Input
              id="horario"
              name="horario"
              type="time"
              defaultValue={item?.horario?.slice(0, 5) ?? ""}
            />
          </Campo>
          <Campo rotulo="Responsável" nome="responsavel" erro={estado.erros.responsavel}>
            <Input
              id="responsavel"
              name="responsavel"
              defaultValue={item?.responsavel ?? ""}
              maxLength={80}
            />
          </Campo>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Campo rotulo="Campanha" nome="campanha_id" erro={estado.erros.campanha_id}>
            <SelectNativo
              id="campanha_id"
              name="campanha_id"
              defaultValue={item?.campanha_id ?? ""}
            >
              <option value="">Nenhuma</option>
              {opcoes.campanhas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo rotulo="Produto ligado" nome="produto_id" erro={estado.erros.produto_id}>
            <SelectNativo id="produto_id" name="produto_id" defaultValue={item?.produto_id ?? ""}>
              <option value="">Nenhum</option>
              {opcoes.produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo rotulo="Categoria" nome="categoria_id" erro={estado.erros.categoria_id}>
            <SelectNativo
              id="categoria_id"
              name="categoria_id"
              defaultValue={item?.categoria_id ?? ""}
            >
              <option value="">Sem categoria</option>
              {opcoes.categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo rotulo="Tags" nome="tags" erro={estado.erros.tags} dica="Separadas por vírgula.">
            <Input
              id="tags"
              name="tags"
              defaultValue={(item?.tags ?? []).join(", ")}
              placeholder="f1, miniatura, lançamento"
            />
          </Campo>
        </div>
      </section>

      {conteudo && (
        <section className="space-y-4 rounded-2xl bg-superficie-2/50 p-4">
          <h2 className="text-sm font-semibold">Conteúdo</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Formato" nome="formato" erro={estado.erros.formato}>
              <SelectNativo
                id="formato"
                name="formato"
                value={formato}
                onChange={(e) => {
                  setFormato(e.target.value);
                  if (!canal && e.target.value)
                    setCanal(CANAL_PADRAO[e.target.value as keyof typeof CANAL_PADRAO]);
                }}
              >
                <option value="">Definir depois</option>
                {FORMATOS.map((f) => (
                  <option key={f} value={f}>
                    {FORMATO_ROTULO[f]}
                  </option>
                ))}
              </SelectNativo>
            </Campo>
            <Campo
              rotulo="Canal de publicação"
              nome="canal_publicacao"
              erro={estado.erros.canal_publicacao}
            >
              <SelectNativo
                id="canal_publicacao"
                name="canal_publicacao"
                value={canal}
                onChange={(e) => setCanal(e.target.value)}
              >
                <option value="">Definir depois</option>
                {CANAIS_PUBLICACAO.map((c) => (
                  <option key={c} value={c}>
                    {CANAL_PUBLICACAO_ROTULO[c]}
                  </option>
                ))}
              </SelectNativo>
            </Campo>
          </div>
          <Campo
            rotulo="Briefing"
            nome="briefing"
            erro={estado.erros.briefing}
            dica="O que a peça precisa dizer, para quem, com qual gancho."
          >
            <Textarea
              id="briefing"
              name="briefing"
              defaultValue={item?.briefing ?? ""}
              rows={4}
              maxLength={4000}
            />
          </Campo>
          <Campo rotulo="CTA" nome="cta" erro={estado.erros.cta}>
            <Input
              id="cta"
              name="cta"
              defaultValue={item?.cta ?? ""}
              maxLength={300}
              placeholder="Peça o seu na Shopee, link na bio"
            />
          </Campo>
          <Campo rotulo="Legenda" nome="legenda" erro={estado.erros.legenda}>
            <Textarea
              id="legenda"
              name="legenda"
              defaultValue={item?.legenda ?? ""}
              rows={4}
              maxLength={3000}
            />
          </Campo>
          {item && (
            <div>
              <h3 className="mb-2 text-xs font-medium tracking-wide text-texto-3 uppercase">
                Métricas após publicar
              </h3>
              <div className="grid gap-3 sm:grid-cols-4">
                {CHAVES_METRICA.map((k) => (
                  <Campo
                    key={k}
                    rotulo={METRICA_ROTULO[k]}
                    nome={`metrica_${k}`}
                    erro={estado.erros[`metrica_${k}`]}
                  >
                    <Input
                      id={`metrica_${k}`}
                      name={`metrica_${k}`}
                      inputMode="numeric"
                      defaultValue={metricas[k] ?? ""}
                      className="numeros"
                    />
                  </Campo>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Checklist"
          nome="checklist"
          erro={estado.erros.checklist}
          dica={
            item
              ? "Uma etapa por linha. Etapas já feitas continuam feitas pelo nome."
              : "Uma etapa por linha. Vazio usa o padrão do formato ou do modelo."
          }
        >
          <Textarea id="checklist" name="checklist" defaultValue={checklist} rows={6} />
        </Campo>
        <div className="space-y-4">
          <Campo
            rotulo="Links"
            nome="links"
            erro={estado.erros.links}
            dica="Um por linha: rótulo | url, ou só a url."
          >
            <Textarea id="links" name="links" defaultValue={links} rows={3} />
          </Campo>
          <Campo
            rotulo="Referências"
            nome="referencias"
            erro={estado.erros.referencias}
            dica="Inspirações e concorrentes, um por linha."
          >
            <Textarea id="referencias" name="referencias" defaultValue={referencias} rows={2} />
          </Campo>
        </div>
      </section>
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Textarea
          id="observacoes"
          name="observacoes"
          defaultValue={item?.observacoes ?? ""}
          rows={2}
          maxLength={2000}
        />
      </Campo>
      {item?.pai_id && <input type="hidden" name="pai_id" value={item.pai_id} />}
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : item ? "Salvar" : "Criar item"}
      </Button>
    </form>
  );
}
