"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Share2 } from "lucide-react";
import { marcarPublicado, pularEnvio } from "@/acoes/ofertas/ofertas";
import { erroPt } from "@/lib/erros-pt";
import { Button } from "@/componentes/ui/button";

/**
 * Um envio manual: copie o texto (primeiro, porque o WhatsApp no iOS descarta o texto quando
 * recebe arquivo pelo compartilhar), compartilhe a imagem, abra o grupo e marque como publicado.
 */
export function CartaoPublicar({
  envioId,
  grupo,
  linkConvite,
  texto,
  imagem,
  titulo,
  podeMarcar,
}: {
  envioId: string;
  grupo: string;
  linkConvite: string | null;
  texto: string;
  imagem: string | null;
  titulo: string;
  podeMarcar: boolean;
}) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);
  const [pendente, iniciar] = useTransition();

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      toast.success("Texto copiado.");
    } catch {
      toast.error("Não deu para copiar. Selecione o texto e copie à mão.");
    }
  }

  async function compartilhar() {
    try {
      if (imagem && navigator.canShare) {
        const r = await fetch(imagem);
        const blob = await r.blob();
        const arquivo = new File([blob], "oferta.jpg", { type: blob.type || "image/jpeg" });
        if (navigator.canShare({ files: [arquivo] })) {
          await navigator.share({ files: [arquivo], text: texto });
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ text: texto });
        return;
      }
      window.open(
        `https://wa.me/?text=${encodeURIComponent(texto)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        toast.error("Compartilhar não funcionou neste navegador. Use Copiar texto.");
    }
  }

  function agir(fn: () => Promise<{ ok: boolean; mensagem?: string; erro?: string }>) {
    iniciar(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.mensagem ?? "Feito.");
        router.refresh();
      } else toast.error(erroPt(r.erro) ?? "Algo deu errado.");
    });
  }

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-painel">
      <header className="flex items-start gap-3">
        {imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagem} alt={titulo} className="size-16 shrink-0 rounded-xl object-cover" />
        ) : null}
        <div className="min-w-0">
          <p className="text-xs text-texto-3">Grupo</p>
          <p className="truncate font-medium">{grupo}</p>
        </div>
      </header>
      <pre className="max-h-60 overflow-y-auto rounded-xl bg-superficie-2 p-3 font-sans text-sm whitespace-pre-wrap">
        {texto}
      </pre>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={copiar}>
          {copiado ? <Check className="size-4" /> : <Copy className="size-4" />} Copiar texto
        </Button>
        <Button size="sm" variant="outline" onClick={compartilhar}>
          <Share2 className="size-4" /> Compartilhar
        </Button>
        {linkConvite && (
          <Button asChild size="sm" variant="outline">
            <a href={linkConvite} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" /> Abrir grupo
            </a>
          </Button>
        )}
      </div>
      {podeMarcar && (
        <div className="flex flex-wrap gap-2 border-t border-borda pt-3">
          <Button
            size="sm"
            disabled={pendente}
            onClick={() => agir(() => marcarPublicado(envioId))}
          >
            Marcar como publicado
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pendente}
            onClick={() => agir(() => pularEnvio(envioId))}
          >
            Pular
          </Button>
        </div>
      )}
    </article>
  );
}
