"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDownToLine, Link2, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { enviarAnexo, relacionar, removerAnexo, removerRelacao, urlAnexo } from "@/acoes/conhecimento";
import type { AnexoConhecimento, Relacao, VersaoConhecimento } from "@/dados/conhecimento";
import { TIPO_RELACAO_ROTULO, TIPOS_RELACAO } from "@/dominio/conhecimento/tipos";
import { formatarDataHora } from "@/lib/formatos/data";
import { erroPt } from "@/lib/erros-pt";
import { Button } from "@/componentes/ui/button";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-card p-4 shadow-painel">
      <h2 className="mb-3 text-[13px] font-medium text-texto-2">{titulo}</h2>
      {children}
    </section>
  );
}

export function Relacoes({ id, relacoes, candidatos, editar }: { id: string; relacoes: Relacao[]; candidatos: { id: string; titulo: string }[]; editar: boolean }) {
  const [pendente, iniciar] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <Bloco titulo="Relações">
      {relacoes.length === 0 && <p className="text-sm text-texto-3">Nenhuma relação.</p>}
      <ul className="space-y-2">
        {relacoes.map((r) => (
          <li key={`${r.de_id}-${r.para_id}`} className="flex items-center gap-2 text-sm">
            <Link2 className="size-3.5 shrink-0 text-texto-3" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="text-texto-3">{r.direcao === "saida" ? TIPO_RELACAO_ROTULO[r.tipo as keyof typeof TIPO_RELACAO_ROTULO] : "Referenciado por"} </span>
              <Link href={`/conhecimento/${r.outro.id}`} className="font-medium hover:text-acao">
                {r.outro.titulo}
              </Link>
            </span>
            {editar && (
              <BotaoAcao acao={() => removerRelacao(r.de_id, r.para_id)} size="icon" variant="ghost">
                <Trash2 className="size-3.5" aria-label="Remover relação" />
              </BotaoAcao>
            )}
          </li>
        ))}
      </ul>
      {editar && candidatos.length > 0 && (
        <form
          ref={formRef}
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            iniciar(async () => {
              const r = await relacionar(id, String(fd.get("para")), String(fd.get("tipo")));
              if (r.ok) {
                toast.success(r.mensagem);
                formRef.current?.reset();
              } else toast.error(erroPt(r.erro));
            });
          }}
        >
          <SelectNativo name="tipo" defaultValue="relacionado" aria-label="Tipo de relação">
            {TIPOS_RELACAO.map((t) => (
              <option key={t} value={t}>
                {TIPO_RELACAO_ROTULO[t]}
              </option>
            ))}
          </SelectNativo>
          <SelectNativo name="para" required aria-label="Conhecimento relacionado" defaultValue="">
            <option value="" disabled>
              Escolha um registro
            </option>
            {candidatos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.titulo}
              </option>
            ))}
          </SelectNativo>
          <Button type="submit" size="sm" variant="secondary" disabled={pendente}>
            Relacionar
          </Button>
        </form>
      )}
    </Bloco>
  );
}

export function Anexos({ id, anexos, editar }: { id: string; anexos: AnexoConhecimento[]; editar: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [enviando, setEnviando] = useState(false);
  async function abrir(anexoId: string) {
    const r = await urlAnexo(anexoId);
    if (r.ok && r.url) window.open(r.url, "_blank", "noopener");
    else toast.error("Não foi possível abrir o anexo.");
  }
  return (
    <Bloco titulo="Anexos">
      {anexos.length === 0 && <p className="text-sm text-texto-3">Nenhum anexo.</p>}
      <ul className="space-y-2">
        {anexos.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-sm">
            <Paperclip className="size-3.5 shrink-0 text-texto-3" aria-hidden="true" />
            <button type="button" onClick={() => abrir(a.id)} className="min-w-0 flex-1 truncate text-left font-medium hover:text-acao">
              {a.nome}
            </button>
            <button type="button" onClick={() => abrir(a.id)} className="text-texto-3 hover:text-texto" aria-label={`Baixar ${a.nome}`}>
              <ArrowDownToLine className="size-3.5" />
            </button>
            {editar && (
              <BotaoAcao acao={() => removerAnexo(a.id)} size="icon" variant="ghost" confirmar={{ titulo: `Remover ${a.nome}?` }}>
                <Trash2 className="size-3.5" aria-label="Remover anexo" />
              </BotaoAcao>
            )}
          </li>
        ))}
      </ul>
      {editar && (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            setEnviando(true);
            iniciar(async () => {
              const r = await enviarAnexo(id, fd);
              setEnviando(false);
              if (r.ok) {
                toast.success(r.mensagem);
                form.reset();
              } else toast.error(erroPt(r.erro));
            });
          }}
        >
          <input
            type="file"
            name="arquivo"
            required
            accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,text/markdown"
            className="text-sm text-texto-2 file:mr-3 file:rounded-full file:border-0 file:bg-superficie-2 file:px-3 file:py-1.5 file:text-sm file:text-texto"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={pendente || enviando}>
            {enviando ? "Enviando" : "Enviar anexo"}
          </Button>
          <p className="text-xs text-texto-3">Imagem, PDF, texto ou markdown, até 10 MB.</p>
        </form>
      )}
    </Bloco>
  );
}

export function Versoes({ versoes, atual }: { versoes: VersaoConhecimento[]; atual: number }) {
  const [aberta, setAberta] = useState<number | null>(null);
  return (
    <Bloco titulo="Histórico de versões">
      <ol className="space-y-2 text-sm">
        <li className="flex items-baseline justify-between gap-2">
          <span className="font-medium">Versão {atual}</span>
          <span className="text-xs text-texto-3">atual</span>
        </li>
        {versoes.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              className="flex w-full items-baseline justify-between gap-2 text-left hover:text-acao"
              onClick={() => setAberta(aberta === v.versao ? null : v.versao)}
              aria-expanded={aberta === v.versao}
            >
              <span>Versão {v.versao}</span>
              <span className="numeros text-xs text-texto-3">{formatarDataHora(v.em)}</span>
            </button>
            {v.motivo && <p className="text-xs text-texto-2">{v.motivo}</p>}
            {aberta === v.versao && (
              <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-superficie-2 p-3 font-mono text-xs whitespace-pre-wrap text-texto-2">
                {v.titulo}
                {"\n\n"}
                {v.conteudo}
              </pre>
            )}
          </li>
        ))}
      </ol>
    </Bloco>
  );
}
