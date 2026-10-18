"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, ExternalLink } from "lucide-react";
import {
  registrarConformidade,
  salvarIntegracao,
  testarConversao,
  type ResultadoTesteConversao,
} from "@/acoes/ofertas/integracoes";
import { META_INTEGRACAO } from "@/dominio/ofertas/integracoes";
import type { Plataforma } from "@/dominio/ofertas/plataformas";
import { erroPt } from "@/lib/erros-pt";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";

/** Formulário de credenciais: identificadores públicos à vista, segredos nunca voltam do servidor. */
export function FormIntegracao({
  plataforma,
  identificadores,
  segredoConfigurado,
}: {
  plataforma: Plataforma;
  identificadores: Record<string, string>;
  segredoConfigurado: string | null;
}) {
  const meta = META_INTEGRACAO[plataforma];
  const router = useRouter();
  const [erros, setErros] = useState<Record<string, string>>({});
  const [pendente, iniciar] = useTransition();
  if (meta.publicos.length === 0 && meta.secretos.length === 0) return null;
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        iniciar(async () => {
          const r = await salvarIntegracao(plataforma, fd);
          setErros(r.erros);
          if (r.ok) {
            for (const c of meta.secretos) {
              const campo = form.elements.namedItem(c.nome) as HTMLInputElement | null;
              if (campo) campo.value = "";
            }
            toast.success(r.mensagem ?? "Salvo.");
            router.refresh();
          } else if (r.erros._form) toast.error(erroPt(r.erros._form));
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {meta.publicos.map((c) => {
          const id = `${plataforma}-${c.nome}`;
          return (
            <Campo
              key={c.nome}
              rotulo={`${c.rotulo}${c.obrigatorio ? "" : " (opcional)"}`}
              nome={id}
              erro={erros[c.nome]}
              dica={c.dica}
            >
              <Input
                id={id}
                name={c.nome}
                defaultValue={identificadores[c.nome] ?? ""}
                autoComplete="off"
                maxLength={200}
              />
            </Campo>
          );
        })}
        {meta.secretos.map((c) => {
          const id = `${plataforma}-${c.nome}`;
          return (
            <Campo
              key={c.nome}
              rotulo={`${c.rotulo} (segredo)`}
              nome={id}
              erro={erros[c.nome]}
              dica={
                segredoConfigurado
                  ? "Já configurado. Deixe em branco para manter; digite para trocar."
                  : c.dica
              }
            >
              <Input
                id={id}
                name={c.nome}
                type="password"
                autoComplete="new-password"
                placeholder={segredoConfigurado ? "••••••••  (salvo, não é exibido)" : ""}
                maxLength={200}
              />
            </Campo>
          );
        })}
      </div>
      <CampoErro chave={erros._form} />
      <Button type="submit" size="sm" disabled={pendente}>
        {pendente ? "Salvando e testando" : "Salvar e testar"}
      </Button>
    </form>
  );
}

/** Converte uma URL de exemplo e mostra o link final, sem gravar nada. */
export function TesteConversao({
  plataforma,
  exemplo,
}: {
  plataforma: Plataforma;
  exemplo: string;
}) {
  const [url, setUrl] = useState("");
  const [r, setR] = useState<ResultadoTesteConversao | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pendente, iniciar] = useTransition();
  const id = `teste-${plataforma}`;
  return (
    <div className="space-y-2">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          iniciar(async () => {
            setCopiado(false);
            setR(await testarConversao(plataforma, url));
          });
        }}
      >
        <div className="min-w-0 flex-1 basis-64 space-y-1.5">
          <label htmlFor={id} className="text-sm font-medium">
            Testar conversão de link
          </label>
          <Input
            id={id}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={exemplo}
            inputMode="url"
          />
        </div>
        <Button type="submit" size="sm" variant="secondary" disabled={pendente || !url.trim()}>
          {pendente ? "Convertendo" : "Converter"}
        </Button>
      </form>
      {r && !r.ok && <p className="text-sm text-erro">{erroPt(r.erro) ?? r.erro}</p>}
      {r && r.ok && (
        <div className="space-y-1 rounded-xl bg-superficie-2 p-3 text-sm">
          <p className="text-xs text-texto-3">{r.origem}</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate font-mono text-xs">{r.url}</code>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Copiar link"
              onClick={async () => {
                await navigator.clipboard.writeText(r.url);
                setCopiado(true);
              }}
            >
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
            <Button asChild size="icon" variant="ghost" aria-label="Abrir link em nova aba">
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>
          <p className="text-xs text-texto-3">
            Abra o link e confira na página do produto se a atribuição aparece no seu painel de
            afiliado.
          </p>
        </div>
      )}
    </div>
  );
}

/** Registro da trava de conformidade (canal WhatsApp cadastrado ou confirmado no programa). */
export function FormConformidade({ plataforma }: { plataforma: Plataforma }) {
  const router = useRouter();
  const [erros, setErros] = useState<Record<string, string>>({});
  const [pendente, iniciar] = useTransition();
  const id = `conformidade-${plataforma}`;
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        iniciar(async () => {
          const r = await registrarConformidade(plataforma, fd);
          setErros(r.erros);
          if (r.ok) {
            toast.success(r.mensagem ?? "Registrado.");
            router.refresh();
          } else if (r.erros._form) toast.error(erroPt(r.erros._form));
        });
      }}
    >
      <Campo
        rotulo="Como o canal foi cadastrado ou confirmado"
        nome={id}
        erro={erros.observacao}
        dica="Ex.: grupos cadastrados como Mídia de Afiliado em 18/10/2026; protocolo do suporte."
      >
        <Textarea id={id} name="observacao" maxLength={500} rows={2} />
      </Campo>
      <Button type="submit" size="sm" variant="outline" disabled={pendente}>
        Registrar e liberar publicação
      </Button>
    </form>
  );
}
