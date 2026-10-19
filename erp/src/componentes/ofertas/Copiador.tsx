"use client";

import { useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  aprovarMensagem,
  criarAutomacao,
  descartarMensagem,
  salvarAutomacao,
  testarRegras,
  type TesteRegras,
} from "@/acoes/ofertas/copiador";
import { PLATAFORMAS, PLATAFORMA_ROTULO } from "@/dominio/ofertas/plataformas";
import { REGRAS_PADRAO } from "@/dominio/ofertas/limpeza";
import { erroPt } from "@/lib/erros-pt";
import type { EstadoForm, ResultadoAcao } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";

export type ConfigAutomacao = {
  nome: string;
  grupo_origem_id: string;
  numero_id: string | null;
  plataformas: string[];
  filtros: { incluir?: string[]; excluir?: string[]; dominiosBloqueados?: string[] };
  limpeza: {
    removerMencoes?: boolean;
    removerConvites?: boolean;
    removerLinksNaoAutorizados?: boolean;
    frasesRemover?: string[];
  };
  revisao_manual: boolean;
  janela_duplicidade_horas: number;
  intervalo_segundos: number;
};

export function FormAutomacao({
  id,
  a,
  origens,
  numeros,
}: {
  id?: string;
  a?: ConfigAutomacao;
  origens: { id: string; nome: string }[];
  numeros: { id: string; rotulo: string }[];
}) {
  const router = useRouter();
  const fechar = useContext(ContextoDialogo);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [pendente, iniciar] = useTransition();
  const l = { ...REGRAS_PADRAO, ...(a?.limpeza ?? {}) };
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        iniciar(async () => {
          const r: EstadoForm = id ? await salvarAutomacao(id, fd) : await criarAutomacao(fd);
          setErros(r.erros);
          if (r.ok) {
            toast.success(r.mensagem ?? "Salvo.");
            fechar();
            if (!id && r.id) router.push(`/ofertas/copiador/${r.id}`);
            else router.refresh();
          } else if (r.erros._form) toast.error(erroPt(r.erros._form));
        });
      }}
    >
      <Campo rotulo="Nome" nome="a-nome" erro={erros.nome}>
        <Input id="a-nome" name="nome" defaultValue={a?.nome} maxLength={80} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Grupo de origem autorizado" nome="a-origem" erro={erros.grupo_origem_id}>
          <SelectNativo
            id="a-origem"
            name="grupo_origem_id"
            defaultValue={a?.grupo_origem_id ?? ""}
          >
            <option value="">Escolha</option>
            {origens.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo
          rotulo="Número remetente"
          nome="a-num"
          erro={erros.numero_id}
          dica="Manual: as ofertas aprovadas vão para Publicar."
        >
          <SelectNativo id="a-num" name="numero_id" defaultValue={a?.numero_id ?? ""}>
            <option value="">Manual (modo assistido)</option>
            {numeros.map((n) => (
              <option key={n.id} value={n.id}>
                {n.rotulo}
              </option>
            ))}
          </SelectNativo>
        </Campo>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Plataformas aceitas</legend>
        <div className="flex flex-wrap gap-4">
          {PLATAFORMAS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="plataformas"
                value={p}
                defaultChecked={a ? a.plataformas.includes(p) : true}
                className="size-4 accent-acao"
              />
              {PLATAFORMA_ROTULO[p]}
            </label>
          ))}
        </div>
        <CampoErro chave={erros.plataformas} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Precisa ter (uma por linha)" nome="a-incl" dica="Vazio = qualquer mensagem.">
          <Textarea
            id="a-incl"
            name="incluir"
            rows={3}
            defaultValue={a?.filtros.incluir?.join("\n")}
          />
        </Campo>
        <Campo rotulo="Ignorar se tiver" nome="a-excl">
          <Textarea
            id="a-excl"
            name="excluir"
            rows={3}
            defaultValue={a?.filtros.excluir?.join("\n")}
          />
        </Campo>
        <Campo rotulo="Domínios bloqueados" nome="a-dom">
          <Textarea
            id="a-dom"
            name="dominios_bloqueados"
            rows={3}
            defaultValue={a?.filtros.dominiosBloqueados?.join("\n")}
          />
        </Campo>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Limpeza do texto (preço, validade e condições nunca saem)
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="remover_mencoes"
            defaultChecked={l.removerMencoes}
            className="size-4 accent-acao"
          />{" "}
          Tirar menções (@)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="remover_convites"
            defaultChecked={l.removerConvites}
            className="size-4 accent-acao"
          />{" "}
          Tirar convites de outros grupos e canais
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="remover_links"
            defaultChecked={l.removerLinksNaoAutorizados}
            className="size-4 accent-acao"
          />{" "}
          Tirar links que não são do produto
        </label>
        <Campo rotulo="Frases de chamada da origem para tirar (uma por linha)" nome="a-frases">
          <Textarea
            id="a-frases"
            name="frases_remover"
            rows={3}
            defaultValue={l.frasesRemover.join("\n")}
          />
        </Campo>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Não repetir o mesmo produto por (horas)"
          nome="a-jan"
          erro={erros.janela_duplicidade_horas}
        >
          <Input
            id="a-jan"
            name="janela_duplicidade_horas"
            type="number"
            min={1}
            max={720}
            defaultValue={a?.janela_duplicidade_horas ?? 24}
          />
        </Campo>
        <Campo
          rotulo="Intervalo mínimo entre ofertas (min)"
          nome="a-int"
          erro={erros.intervalo_minutos}
        >
          <Input
            id="a-int"
            name="intervalo_minutos"
            type="number"
            min={1}
            max={1440}
            defaultValue={a ? Math.round(a.intervalo_segundos / 60) : 5}
          />
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="revisao_manual"
          defaultChecked={a ? a.revisao_manual : true}
          className="size-4 accent-acao"
        />
        Revisar cada oferta antes de publicar
      </label>
      <CampoErro chave={erros._form} />
      <Button type="submit" disabled={pendente} className="w-full">
        {id ? "Salvar" : "Criar automação"}
      </Button>
    </form>
  );
}

export function SeletorDestinos({
  grupos,
  marcados,
  salvar,
}: {
  grupos: { id: string; nome: string; funcao: string }[];
  marcados: string[];
  salvar: (grupos: string[]) => Promise<ResultadoAcao>;
}) {
  const router = useRouter();
  const [sel, setSel] = useState(marcados);
  const [pendente, iniciar] = useTransition();
  if (!grupos.length)
    return <p className="text-sm text-texto-2">Nenhum grupo de destino ou teste ativo.</p>;
  return (
    <div className="space-y-3">
      <ul className="grid gap-1 sm:grid-cols-2">
        {grupos.map((g) => (
          <li key={g.id}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-acao"
                checked={sel.includes(g.id)}
                onChange={() =>
                  setSel((s) => (s.includes(g.id) ? s.filter((x) => x !== g.id) : [...s, g.id]))
                }
              />
              {g.nome}
              {g.funcao === "teste" ? " (teste)" : ""}
            </label>
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        variant="secondary"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await salvar(sel);
            if (r.ok) {
              toast.success(r.mensagem ?? "Salvo.");
              router.refresh();
            } else toast.error(erroPt(r.erro));
          })
        }
      >
        Salvar grupos
      </Button>
    </div>
  );
}

export function RevisarMensagem({
  id,
  original,
  processado,
  plataforma,
}: {
  id: string;
  original: string | null;
  processado: string;
  plataforma: string;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(processado);
  const [link, setLink] = useState("");
  const [pendente, iniciar] = useTransition();
  const agir = (f: () => Promise<ResultadoAcao>) =>
    iniciar(async () => {
      const r = await f();
      if (r.ok) {
        toast.success(r.mensagem ?? "Feito.");
        router.refresh();
      } else toast.error(erroPt(r.erro));
    });
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-1">
        <p className="text-xs text-texto-3">Original da origem</p>
        <pre className="max-h-56 overflow-y-auto rounded-xl bg-superficie-2 p-3 font-sans text-xs whitespace-pre-wrap">
          {original ?? "(apagado pela retenção)"}
        </pre>
      </div>
      <div className="space-y-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-texto-3">
            Texto que vai sair ({"{{link}}"} vira o nosso link de cada grupo)
          </span>
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            maxLength={4000}
          />
        </label>
        <label className="block space-y-1 text-xs">
          <span className="text-texto-3">
            {plataforma === "mercado_livre"
              ? "Nosso link do portal do Mercado Livre (obrigatório)"
              : "Nosso link de afiliado (opcional, substitui a conversão)"}
          </span>
          <Input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" />
        </label>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={pendente}
            onClick={() => agir(() => aprovarMensagem(id, texto, link, plataforma))}
          >
            Aprovar e publicar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pendente}
            onClick={() => agir(() => descartarMensagem(id))}
          >
            Descartar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TestarRegras({ id }: { id: string }) {
  const [texto, setTexto] = useState("");
  const [r, setR] = useState<TesteRegras | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <div className="space-y-2">
      <label htmlFor="teste-regras" className="text-sm font-medium">
        Testar as regras com uma mensagem
      </label>
      <Textarea
        id="teste-regras"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        placeholder="Cole uma mensagem do grupo de origem"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={pendente || !texto.trim()}
        onClick={() => iniciar(async () => setR(await testarRegras(id, texto)))}
      >
        Testar
      </Button>
      {r && !r.ok && <p className="text-sm text-erro">{erroPt(r.erro)}</p>}
      {r && r.ok && (
        <div className="space-y-1 rounded-xl bg-superficie-2 p-3 text-sm">
          <p>
            <strong>{r.acao}</strong>
            {r.motivo ? `: ${r.motivo}` : ""}
            {r.plataforma
              ? ` · ${PLATAFORMA_ROTULO[r.plataforma as keyof typeof PLATAFORMA_ROTULO] ?? r.plataforma}`
              : ""}
          </p>
          {r.texto && <pre className="font-sans text-xs whitespace-pre-wrap">{r.texto}</pre>}
          {r.removidos.length > 0 && (
            <p className="text-xs text-texto-3">Removido: {r.removidos.join(" · ")}</p>
          )}
        </div>
      )}
    </div>
  );
}
