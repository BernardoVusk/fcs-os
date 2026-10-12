"use client";

import Link from "next/link";
import { useActionState, useContext, useState } from "react";
import {
  excluirFluxo,
  gerarRecorrenciasPlano,
  salvarCampanha,
  salvarFluxo,
  salvarModelo,
  salvarRecorrenciaPlano,
} from "@/acoes/planejamento/cadastros";
import type {
  Campanha,
  FluxoPlano,
  Modelo,
  RecorrenciaPlano,
} from "@/dados/planejamento/planejamento";
import { FREQUENCIA_ROTULO, FREQUENCIAS } from "@/dominio/financeiro/recorrencia";
import {
  CANAIS_PUBLICACAO,
  CANAL_PUBLICACAO_ROTULO,
  FORMATO_ROTULO,
  FORMATOS,
  lerCamposModelo,
  lerChecklist,
  PRIORIDADE_ROTULO,
  PRIORIDADES,
  TIPO_ITEM_ROTULO,
  TIPOS_ITEM,
  type TipoItem,
} from "@/dominio/planejamento/tipos";
import { FORM_INICIAL } from "@/lib/forms";
import { formatarData } from "@/lib/formatos/data";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Badge } from "@/componentes/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
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
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

/** Botão Editar que abre o formulário num diálogo e fecha ao salvar. */
function DialogoEditar({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setAberto(true)}>
        Editar
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
          </DialogHeader>
          <ContextoDialogo.Provider value={() => setAberto(false)}>
            {aberto && children}
          </ContextoDialogo.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}

const STATUS_CAMPANHA: Record<string, string> = {
  planejada: "Planejada",
  ativa: "Ativa",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export function FormCampanha({ campanha }: { campanha?: Campanha }) {
  const [estado, acao, pendente] = useActionState(salvarCampanha, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      {campanha && <input type="hidden" name="id" value={campanha.id} />}
      <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
        <Input
          id="nome"
          name="nome"
          defaultValue={campanha?.nome ?? ""}
          required
          maxLength={120}
          placeholder="Lançamento linha F1, Black Friday"
        />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Início" nome="inicio" erro={estado.erros.inicio}>
          <Input id="inicio" name="inicio" type="date" defaultValue={campanha?.inicio ?? ""} />
        </Campo>
        <Campo rotulo="Fim" nome="fim" erro={estado.erros.fim}>
          <Input id="fim" name="fim" type="date" defaultValue={campanha?.fim ?? ""} />
        </Campo>
        <Campo rotulo="Situação" nome="status" erro={estado.erros.status}>
          <SelectNativo id="status" name="status" defaultValue={campanha?.status ?? "planejada"}>
            {Object.entries(STATUS_CAMPANHA).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </SelectNativo>
        </Campo>
      </div>
      <Campo rotulo="Objetivo" nome="objetivo" erro={estado.erros.objetivo}>
        <Textarea
          id="objetivo"
          name="objetivo"
          defaultValue={campanha?.objetivo ?? ""}
          rows={2}
          maxLength={1000}
        />
      </Campo>
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Textarea
          id="observacoes"
          name="observacoes"
          defaultValue={campanha?.observacoes ?? ""}
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

export function TabelaCampanhas({
  campanhas,
  editar,
}: {
  campanhas: (Campanha & { itens: number; fechados: number })[];
  editar: boolean;
}) {
  if (campanhas.length === 0)
    return (
      <EstadoVazio
        titulo="Nenhuma campanha"
        descricao="Agrupe conteúdos e tarefas de um lançamento ou de uma data comercial."
      />
    );
  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
      <Table>
        <TableHeader>
          <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
            <TableHead className="pl-5">Campanha</TableHead>
            <TableHead>Período</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="text-right">Itens</TableHead>
            {editar && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {campanhas.map((c) => (
            <TableRow key={c.id} className="h-11">
              <TableCell className="pl-5">
                <Link
                  href={`/planejamento/lista?campanha=${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.nome}
                </Link>
                {c.objetivo && (
                  <span className="block max-w-md truncate text-xs text-texto-3">{c.objetivo}</span>
                )}
              </TableCell>
              <TableCell className="numeros text-sm">
                {c.inicio ? formatarData(c.inicio) : ""}
                {c.fim ? ` a ${formatarData(c.fim)}` : ""}
              </TableCell>
              <TableCell>
                <Badge variant={c.status === "ativa" ? "default" : "outline"}>
                  {STATUS_CAMPANHA[c.status] ?? c.status}
                </Badge>
              </TableCell>
              <TableCell className="numeros text-right text-sm">
                {c.fechados}/{c.itens}
              </TableCell>
              {editar && (
                <TableCell className="text-right">
                  <DialogoEditar titulo="Editar campanha">
                    <FormCampanha campanha={c} />
                  </DialogoEditar>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function FormModelo({ modelo }: { modelo?: Modelo }) {
  const [estado, acao, pendente] = useActionState(salvarModelo, FORM_INICIAL);
  const [tipo, setTipo] = useState<string>(modelo?.tipo ?? "conteudo");
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  const m = modelo ? lerCamposModelo(modelo.campos_padrao) : {};
  const checklist = modelo
    ? lerChecklist(modelo.checklist_padrao)
        .map((c) => c.nome)
        .join("\n")
    : "";
  return (
    <form action={acao} className="space-y-4" noValidate>
      {modelo && <input type="hidden" name="id" value={modelo.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome do modelo" nome="nome" erro={estado.erros.nome}>
          <Input
            id="nome"
            name="nome"
            defaultValue={modelo?.nome ?? ""}
            required
            maxLength={120}
            placeholder="Reel de bastidores, Pesquisa semanal"
          />
        </Campo>
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
      </div>
      <Campo rotulo="Título padrão do item" nome="titulo" erro={estado.erros.titulo}>
        <Input id="titulo" name="titulo" defaultValue={m.titulo ?? ""} maxLength={160} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Prioridade" nome="prioridade" erro={estado.erros.prioridade}>
          <SelectNativo id="prioridade" name="prioridade" defaultValue={m.prioridade ?? ""}>
            <option value="">Média</option>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>
                {PRIORIDADE_ROTULO[p]}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        {tipo === "conteudo" && (
          <>
            <Campo rotulo="Formato" nome="formato" erro={estado.erros.formato}>
              <SelectNativo id="formato" name="formato" defaultValue={m.formato ?? ""}>
                <option value="">Sem formato</option>
                {FORMATOS.map((f) => (
                  <option key={f} value={f}>
                    {FORMATO_ROTULO[f]}
                  </option>
                ))}
              </SelectNativo>
            </Campo>
            <Campo rotulo="Canal" nome="canal_publicacao" erro={estado.erros.canal_publicacao}>
              <SelectNativo
                id="canal_publicacao"
                name="canal_publicacao"
                defaultValue={m.canal_publicacao ?? ""}
              >
                <option value="">Sem canal</option>
                {CANAIS_PUBLICACAO.map((c) => (
                  <option key={c} value={c}>
                    {CANAL_PUBLICACAO_ROTULO[c]}
                  </option>
                ))}
              </SelectNativo>
            </Campo>
          </>
        )}
      </div>
      {tipo === "conteudo" && (
        <>
          <Campo rotulo="Briefing padrão" nome="briefing" erro={estado.erros.briefing}>
            <Textarea
              id="briefing"
              name="briefing"
              defaultValue={m.briefing ?? ""}
              rows={3}
              maxLength={4000}
            />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="CTA padrão" nome="cta" erro={estado.erros.cta}>
              <Input id="cta" name="cta" defaultValue={m.cta ?? ""} maxLength={300} />
            </Campo>
            <Campo rotulo="Tags" nome="tags" erro={estado.erros.tags} dica="Separadas por vírgula.">
              <Input id="tags" name="tags" defaultValue={(m.tags ?? []).join(", ")} />
            </Campo>
          </div>
          <Campo rotulo="Legenda padrão" nome="legenda" erro={estado.erros.legenda}>
            <Textarea
              id="legenda"
              name="legenda"
              defaultValue={m.legenda ?? ""}
              rows={3}
              maxLength={3000}
            />
          </Campo>
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Responsável padrão" nome="responsavel" erro={estado.erros.responsavel}>
          <Input
            id="responsavel"
            name="responsavel"
            defaultValue={m.responsavel ?? ""}
            maxLength={80}
          />
        </Campo>
        <Campo
          rotulo="Checklist padrão"
          nome="checklist"
          erro={estado.erros.checklist}
          dica="Uma etapa por linha. Vazio usa o padrão do formato."
        >
          <Textarea id="checklist" name="checklist" defaultValue={checklist} rows={4} />
        </Campo>
      </div>
      {modelo && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ativo"
            value="sim"
            defaultChecked={modelo.ativo}
            className="size-4 accent-acao"
          />
          Modelo ativo
        </label>
      )}
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Salvar"}
      </Button>
    </form>
  );
}

export function TabelaModelos({ modelos, editar }: { modelos: Modelo[]; editar: boolean }) {
  if (modelos.length === 0)
    return (
      <EstadoVazio
        titulo="Nenhum modelo"
        descricao="Um modelo guarda briefing, canal, formato e checklist para criar itens iguais em segundos."
      />
    );
  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
      <Table>
        <TableHeader>
          <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
            <TableHead className="pl-5">Modelo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Padrões</TableHead>
            <TableHead className="text-right">Etapas</TableHead>
            {editar && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {modelos.map((mo) => {
            const m = lerCamposModelo(mo.campos_padrao);
            return (
              <TableRow key={mo.id} className={`h-11 ${mo.ativo ? "" : "opacity-60"}`}>
                <TableCell className="pl-5 font-medium">
                  {mo.nome}
                  {!mo.ativo && <span className="ml-2 text-xs text-texto-3">inativo</span>}
                </TableCell>
                <TableCell>{TIPO_ITEM_ROTULO[mo.tipo as TipoItem]}</TableCell>
                <TableCell className="text-xs text-texto-2">
                  {[
                    m.formato && FORMATO_ROTULO[m.formato],
                    m.canal_publicacao && CANAL_PUBLICACAO_ROTULO[m.canal_publicacao],
                    m.titulo,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </TableCell>
                <TableCell className="numeros text-right text-sm">
                  {lerChecklist(mo.checklist_padrao).length}
                </TableCell>
                {editar && (
                  <TableCell className="text-right">
                    <DialogoEditar titulo="Editar modelo">
                      <FormModelo modelo={mo} />
                    </DialogoEditar>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function FormRecorrenciaPlano({
  recorrencia,
  modelos,
}: {
  recorrencia?: RecorrenciaPlano;
  modelos: { id: string; nome: string; tipo: string }[];
}) {
  const [estado, acao, pendente] = useActionState(salvarRecorrenciaPlano, FORM_INICIAL);
  const [frequencia, setFrequencia] = useState<string>(recorrencia?.frequencia ?? "semanal");
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      {recorrencia && <input type="hidden" name="id" value={recorrencia.id} />}
      <Campo rotulo="Modelo" nome="modelo_id" erro={estado.erros.modelo_id}>
        <SelectNativo id="modelo_id" name="modelo_id" defaultValue={recorrencia?.modelo_id ?? ""}>
          <option value="">Escolha</option>
          {modelos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome} ({TIPO_ITEM_ROTULO[m.tipo as TipoItem]})
            </option>
          ))}
        </SelectNativo>
      </Campo>
      <div className="grid gap-4 sm:grid-cols-4">
        <Campo rotulo="Frequência" nome="frequencia" erro={estado.erros.frequencia}>
          <SelectNativo
            id="frequencia"
            name="frequencia"
            value={frequencia}
            onChange={(e) => setFrequencia(e.target.value)}
          >
            {FREQUENCIAS.map((f) => (
              <option key={f} value={f}>
                {FREQUENCIA_ROTULO[f]}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo
          rotulo={frequencia === "mensal" ? "Dia do mês" : "Dia"}
          nome="dia"
          erro={estado.erros.dia}
          dica={
            frequencia === "mensal"
              ? "29 a 31 caem no último dia do mês curto."
              : frequencia === "semanal"
                ? "Pela data de início."
                : "Pela data de início."
          }
        >
          <Input
            id="dia"
            name="dia"
            inputMode="numeric"
            defaultValue={recorrencia?.dia ?? ""}
            disabled={frequencia !== "mensal"}
            className="numeros"
          />
        </Campo>
        <Campo rotulo="Início" nome="inicio" erro={estado.erros.inicio}>
          <Input
            id="inicio"
            name="inicio"
            type="date"
            defaultValue={recorrencia?.inicio ?? ""}
            required
          />
        </Campo>
        <Campo rotulo="Fim" nome="fim" erro={estado.erros.fim}>
          <Input id="fim" name="fim" type="date" defaultValue={recorrencia?.fim ?? ""} />
        </Campo>
      </div>
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Input
          id="observacoes"
          name="observacoes"
          defaultValue={recorrencia?.observacoes ?? ""}
          maxLength={500}
        />
      </Campo>
      {recorrencia && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ativo"
            value="sim"
            defaultChecked={recorrencia.ativo}
            className="size-4 accent-acao"
          />
          Recorrência ativa
        </label>
      )}
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Salvar"}
      </Button>
    </form>
  );
}

export function TabelaRecorrenciasPlano({
  itens,
  modelos,
  editar,
}: {
  itens: (RecorrenciaPlano & { modelo: { nome: string; tipo: string } | null })[];
  modelos: { id: string; nome: string; tipo: string }[];
  editar: boolean;
}) {
  return (
    <div className="space-y-3">
      {editar && (
        <div className="flex justify-end">
          <BotaoAcao variant="secondary" acao={gerarRecorrenciasPlano}>
            Gerar próximos 60 dias
          </BotaoAcao>
        </div>
      )}
      {itens.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma recorrência"
          descricao="Ligue um modelo a uma frequência e gere os itens dos próximos 60 dias."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
          <Table>
            <TableHeader>
              <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                <TableHead className="pl-5">Modelo</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Situação</TableHead>
                {editar && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((r) => (
                <TableRow key={r.id} className="h-11">
                  <TableCell className="pl-5 font-medium">
                    {r.modelo?.nome ?? "Modelo removido"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {FREQUENCIA_ROTULO[r.frequencia as keyof typeof FREQUENCIA_ROTULO]}
                    {r.frequencia === "mensal" && r.dia ? ` dia ${r.dia}` : ""}
                  </TableCell>
                  <TableCell className="numeros text-sm">
                    {formatarData(r.inicio)}
                    {r.fim ? ` a ${formatarData(r.fim)}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.ativo ? "default" : "secondary"}>
                      {r.ativo ? "Ativa" : "Pausada"}
                    </Badge>
                  </TableCell>
                  {editar && (
                    <TableCell className="text-right">
                      <DialogoEditar titulo="Editar recorrência">
                        <FormRecorrenciaPlano recorrencia={r} modelos={modelos} />
                      </DialogoEditar>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function FormFluxo({ fluxo, tipo }: { fluxo?: FluxoPlano; tipo: TipoItem }) {
  const [estado, acao, pendente] = useActionState(salvarFluxo, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      {fluxo && <input type="hidden" name="id" value={fluxo.id} />}
      <input type="hidden" name="tipo" value={fluxo?.tipo ?? tipo} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
          <Input id="nome" name="nome" defaultValue={fluxo?.nome ?? ""} required maxLength={40} />
        </Campo>
        <Campo
          rotulo="Código"
          nome="codigo"
          erro={estado.erros.codigo}
          dica="Letras minúsculas e sublinhado."
        >
          <Input
            id="codigo"
            name="codigo"
            defaultValue={fluxo?.codigo ?? ""}
            required
            maxLength={30}
            className="font-mono"
            disabled={Boolean(fluxo)}
          />
          {fluxo && <input type="hidden" name="codigo" value={fluxo.codigo} />}
        </Campo>
        <Campo rotulo="Ordem" nome="ordem" erro={estado.erros.ordem}>
          <Input
            id="ordem"
            name="ordem"
            inputMode="numeric"
            defaultValue={fluxo?.ordem ?? 50}
            className="numeros"
          />
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="fechado"
          value="sim"
          defaultChecked={fluxo?.fechado ?? false}
          className="size-4 accent-acao"
        />
        Status fechado (não conta como pendência; carimba concluído)
      </label>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Salvar"}
      </Button>
    </form>
  );
}

export function TabelaFluxos({ fluxos, dono }: { fluxos: FluxoPlano[]; dono: boolean }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {TIPOS_ITEM.map((tipo) => (
        <section key={tipo} className="rounded-2xl bg-card shadow-painel">
          <h3 className="flex items-center justify-between border-b border-borda px-4 py-2.5 text-sm font-semibold">
            {TIPO_ITEM_ROTULO[tipo]}
            {dono && (
              <DialogoEditar titulo={`Novo status de ${TIPO_ITEM_ROTULO[tipo].toLowerCase()}`}>
                <FormFluxo tipo={tipo} />
              </DialogoEditar>
            )}
          </h3>
          <ul className="divide-y divide-borda">
            {fluxos
              .filter((f) => f.tipo === tipo)
              .map((f) => (
                <li key={f.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                  <span className="numeros w-6 text-xs text-texto-3">{f.ordem}</span>
                  <span className={`flex-1 ${f.fechado ? "text-texto-3" : ""}`}>
                    {f.nome}
                    <span className="ml-1 font-mono text-xs text-texto-3">{f.codigo}</span>
                  </span>
                  {f.padrao && <Badge variant="outline">inicial</Badge>}
                  {f.fechado && <Badge variant="secondary">fechado</Badge>}
                  {dono && (
                    <>
                      <DialogoEditar titulo="Editar status">
                        <FormFluxo fluxo={f} tipo={tipo} />
                      </DialogoEditar>
                      {!f.padrao && (
                        <BotaoAcao
                          acao={() => excluirFluxo(f.id)}
                          confirmar={{
                            titulo: `Remover o status ${f.nome}?`,
                            descricao: "Só é possível se nenhum item estiver nele.",
                            rotulo: "Remover",
                          }}
                        >
                          Remover
                        </BotaoAcao>
                      )}
                    </>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
