"use client";

import { useContext, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, FileUp } from "lucide-react";
import {
  adicionarLinks,
  criarFila,
  descartarEnvios,
  editarTextoItem,
  importarCsvShopee,
  mudarStatusFila,
  reenviarEnvios,
  salvarDestinos,
  salvarFila,
  type ProblemaFila,
  type ResultadoInclusao,
} from "@/acoes/ofertas/filas";
import { moverItem, removerItem } from "@/acoes/ofertas/filas";
import { erroPt } from "@/lib/erros-pt";
import type { EstadoForm } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/componentes/ui/dialog";

export type ConfigFila = {
  nome: string;
  numero_id: string | null;
  modelo_id: string | null;
  intervalo_segundos: number;
  janela_inicio: string;
  janela_fim: string;
  inicio_local: string;
  reinicio_diario: boolean;
  manual_expira_horas: number;
};

export function FormFila({
  id,
  fila,
  numeros,
  modelos,
}: {
  id?: string;
  fila?: ConfigFila;
  numeros: { id: string; rotulo: string; conectado: boolean }[];
  modelos: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const fechar = useContext(ContextoDialogo);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [pendente, iniciar] = useTransition();
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        iniciar(async () => {
          const r: EstadoForm = id ? await salvarFila(id, fd) : await criarFila(fd);
          setErros(r.erros);
          if (r.ok) {
            toast.success(r.mensagem ?? "Salvo.");
            fechar();
            if (!id && r.id) router.push(`/ofertas/filas/${r.id}`);
            else router.refresh();
          } else if (r.erros._form) toast.error(erroPt(r.erros._form));
        });
      }}
    >
      <Campo rotulo="Nome da fila" nome="f-nome" erro={erros.nome}>
        <Input id="f-nome" name="nome" defaultValue={fila?.nome} maxLength={80} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Remetente"
          nome="f-num"
          erro={erros.numero_id}
          dica="Manual: os envios aparecem em Publicar para você postar."
        >
          <SelectNativo id="f-num" name="numero_id" defaultValue={fila?.numero_id ?? ""}>
            <option value="">Manual (modo assistido)</option>
            {numeros.map((n) => (
              <option key={n.id} value={n.id}>
                {n.rotulo}
                {n.conectado ? "" : " (desconectado)"}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Modelo de mensagem" nome="f-modelo" erro={erros.modelo_id}>
          <SelectNativo id="f-modelo" name="modelo_id" defaultValue={fila?.modelo_id ?? ""}>
            <option value="">O da oferta, senão o padrão</option>
            {modelos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Intervalo entre postagens (min)" nome="f-int" erro={erros.intervalo_minutos}>
          <Input
            id="f-int"
            name="intervalo_minutos"
            type="number"
            min={1}
            max={1440}
            defaultValue={fila ? Math.round(fila.intervalo_segundos / 60) : 15}
          />
        </Campo>
        <Campo
          rotulo="Primeira postagem (opcional)"
          nome="f-ini"
          erro={erros.inicio_em}
          dica="Vazio = assim que ativar."
        >
          <Input
            id="f-ini"
            name="inicio_em"
            type="datetime-local"
            defaultValue={fila?.inicio_local}
          />
        </Campo>
        <Campo rotulo="Posta a partir de" nome="f-jini" erro={erros.janela_inicio}>
          <Input
            id="f-jini"
            name="janela_inicio"
            type="time"
            defaultValue={fila?.janela_inicio?.slice(0, 5) ?? "08:00"}
          />
        </Campo>
        <Campo rotulo="Até" nome="f-jfim" erro={erros.janela_fim}>
          <Input
            id="f-jfim"
            name="janela_fim"
            type="time"
            defaultValue={fila?.janela_fim?.slice(0, 5) ?? "22:00"}
          />
        </Campo>
        <Campo rotulo="Envio manual expira em (h)" nome="f-exp" erro={erros.manual_expira_horas}>
          <Input
            id="f-exp"
            name="manual_expira_horas"
            type="number"
            min={1}
            max={72}
            defaultValue={fila?.manual_expira_horas ?? 6}
          />
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="reinicio_diario"
          defaultChecked={fila?.reinicio_diario}
          className="size-4 accent-acao"
        />
        Recomeçar a lista todo dia (uma rodada por dia)
      </label>
      <p className="text-xs text-texto-3">
        Intervalo e janela organizam a cadência. Eles não garantem proteção contra bloqueio do
        WhatsApp.
      </p>
      <CampoErro chave={erros._form} />
      <Button type="submit" disabled={pendente} className="w-full">
        {id ? "Salvar" : "Criar fila"}
      </Button>
    </form>
  );
}

export function Destinos({
  id,
  grupos,
  marcados,
}: {
  id: string;
  grupos: { id: string; nome: string; funcao: string }[];
  marcados: string[];
}) {
  const router = useRouter();
  const [sel, setSel] = useState(marcados);
  const [pendente, iniciar] = useTransition();
  if (!grupos.length)
    return (
      <p className="text-sm text-texto-2">
        Nenhum grupo de destino ou teste ativo. Defina em Grupos.
      </p>
    );
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
            const r = await salvarDestinos(id, sel);
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

function mostrar(r: ResultadoInclusao) {
  if (r.ok) toast.success(r.mensagem ?? "Feito.");
  else toast.error(erroPt(r.erro) ?? "Não deu para incluir.");
}

export function IncluirItens({ id }: { id: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [detalhes, setDetalhes] = useState<string[]>([]);
  const [pendente, iniciar] = useTransition();
  const arquivo = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="links-fila" className="text-sm font-medium">
          Colar links (um por linha, até 30)
        </label>
        <Textarea
          id="links-fila"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={4}
          placeholder="https://shopee.com.br/... "
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pendente || !texto.trim()}
          onClick={() =>
            iniciar(async () => {
              const r = await adicionarLinks(id, texto);
              mostrar(r);
              setDetalhes(r.detalhes ?? []);
              if (r.ok) {
                setTexto("");
                router.refresh();
              }
            })
          }
        >
          {pendente ? "Incluindo" : "Incluir links"}
        </Button>
        <input
          ref={arquivo}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const conteudo = await f.text();
            iniciar(async () => {
              const r = await importarCsvShopee(id, conteudo);
              mostrar(r);
              setDetalhes(r.detalhes ?? []);
              if (r.ok) router.refresh();
            });
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={pendente}
          onClick={() => arquivo.current?.click()}
        >
          <FileUp className="size-4" /> Importar CSV da Shopee
        </Button>
      </div>
      <p className="text-xs text-texto-3">
        CSV: portal de afiliados Shopee &gt; Oferta de Produto &gt; selecione os produtos &gt; Obter
        Link. Precisa da coluna Offer Link; Product Name e Price entram quando existirem. Até 500
        linhas.
      </p>
      {detalhes.length > 0 && (
        <ul className="max-h-40 overflow-y-auto rounded-xl bg-superficie-2 p-3 text-xs text-texto-2">
          {detalhes.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AcoesItem({
  filaId,
  itemId,
  texto,
}: {
  filaId: string;
  itemId: string;
  texto: string | null;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(texto ?? "");
  const agir = (f: () => Promise<{ ok: boolean; mensagem?: string; erro?: string }>) =>
    iniciar(async () => {
      const r = await f();
      if (r.ok) {
        if (r.mensagem) toast.success(r.mensagem);
        router.refresh();
      } else toast.error(erroPt(r.erro));
    });
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        size="icon"
        variant="ghost"
        aria-label="Subir"
        disabled={pendente}
        onClick={() => agir(() => moverItem(filaId, itemId, "cima"))}
      >
        <ArrowUp className="size-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Descer"
        disabled={pendente}
        onClick={() => agir(() => moverItem(filaId, itemId, "baixo"))}
      >
        <ArrowDown className="size-4" />
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost">
            Texto
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Texto desta postagem</DialogTitle>
            <DialogDescription>
              Vazio usa o modelo. Use {"{{link}}"} onde entra o link de afiliado de cada grupo.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            rows={8}
            maxLength={4000}
          />
          <DialogFooter>
            <Button
              disabled={pendente}
              onClick={() =>
                agir(async () => {
                  const r = await editarTextoItem(filaId, itemId, valor);
                  if (r.ok) setAberto(false);
                  return r;
                })
              }
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button
        size="sm"
        variant="ghost"
        disabled={pendente}
        onClick={() => agir(() => removerItem(filaId, itemId))}
      >
        Remover
      </Button>
    </div>
  );
}

/** Ativar mostra a validação de todos os itens; com problema, nada é ativado. */
export function BotoesStatusFila({
  id,
  status,
  previa,
}: {
  id: string;
  status: string;
  previa: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [problemas, setProblemas] = useState<ProblemaFila[]>([]);
  const agir = (acao: "ativar" | "pausar" | "retomar" | "encerrar") =>
    iniciar(async () => {
      const r = await mudarStatusFila(id, acao);
      setProblemas(r.problemas ?? []);
      if (r.ok) {
        toast.success(r.mensagem ?? "Feito.");
        router.refresh();
      } else toast.error(erroPt(r.erro));
    });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(status === "rascunho" || status === "encerrada") && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">Ativar fila</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ativar esta fila?</DialogTitle>
                <DialogDescription>{previa}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button disabled={pendente} onClick={() => agir("ativar")}>
                  Validar e ativar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {status === "ativa" && (
          <Button size="sm" variant="secondary" disabled={pendente} onClick={() => agir("pausar")}>
            Pausar
          </Button>
        )}
        {status === "pausada" && (
          <Button size="sm" disabled={pendente} onClick={() => agir("retomar")}>
            Retomar
          </Button>
        )}
        {status !== "encerrada" && status !== "rascunho" && (
          <Button size="sm" variant="outline" disabled={pendente} onClick={() => agir("encerrar")}>
            Encerrar
          </Button>
        )}
      </div>
      {problemas.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-erro/10 p-3 text-sm text-erro">
          {problemas.map((p, i) => (
            <li key={i}>
              <strong>{p.nome}:</strong> {p.problema}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FalhasEIncertos({
  envios,
}: {
  envios: {
    id: string;
    status: string;
    grupo: string;
    item: string;
    motivo: string;
    erro: string | null;
    quando: string;
  }[];
}) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>([]);
  const [pendente, iniciar] = useTransition();
  const incertos = envios.filter((e) => sel.includes(e.id) && e.status === "incerto").length;
  const agir = (f: (ids: string[]) => Promise<{ ok: boolean; mensagem?: string; erro?: string }>) =>
    iniciar(async () => {
      const r = await f(sel);
      if (r.ok) {
        toast.success(r.mensagem ?? "Feito.");
        setSel([]);
        router.refresh();
      } else toast.error(erroPt(r.erro));
    });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!sel.length}>
              Tentar de novo ({sel.length})
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tentar de novo {sel.length} envio(s)?</DialogTitle>
              <DialogDescription>
                {incertos
                  ? `${incertos} deles está(ão) incerto(s): a mensagem pode ter chegado. Confira no grupo antes, para não repetir a oferta.`
                  : "Eles voltam para a fila e saem no próximo horário permitido."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button disabled={pendente} onClick={() => agir(reenviarEnvios)}>
                Conferi, tentar de novo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button
          size="sm"
          variant="outline"
          disabled={!sel.length || pendente}
          onClick={() => agir(descartarEnvios)}
        >
          Descartar
        </Button>
      </div>
      <ul className="divide-y divide-borda overflow-hidden rounded-2xl bg-card text-sm shadow-painel">
        {envios.map((e) => (
          <li key={e.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-acao"
              aria-label={`Selecionar envio para ${e.grupo}`}
              checked={sel.includes(e.id)}
              onChange={() =>
                setSel((s) => (s.includes(e.id) ? s.filter((x) => x !== e.id) : [...s, e.id]))
              }
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {e.item} <span className="text-texto-3">em {e.grupo}</span>
              </p>
              <p className="text-xs text-texto-2">
                {e.status === "incerto" ? "Incerto" : "Falhou"}: {e.motivo}
                {e.erro ? ` (${e.erro})` : ""} · {e.quando}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
