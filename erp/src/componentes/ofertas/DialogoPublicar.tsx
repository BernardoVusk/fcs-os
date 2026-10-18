"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { erroPt } from "@/lib/erros-pt";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/componentes/ui/dialog";

export type GrupoOpcao = { id: string; nome: string; funcao: string };
type Resultado = { ok: true; mensagem: string } | { ok: false; erro: string };

/**
 * Escolha dos grupos e do horário antes de publicar, com a prévia do lote (quantos grupos,
 * quantas mensagens). Em modo manual cada envio aparece em Publicar para você postar e marcar.
 */
export function DialogoPublicar({
  grupos,
  acao,
  rotulo = "Publicar",
  desabilitado,
  motivoDesabilitado,
  extra,
}: {
  grupos: GrupoOpcao[];
  acao: (grupos: string[], agendado: string | null, extra: string | null) => Promise<Resultado>;
  rotulo?: string;
  desabilitado?: boolean;
  motivoDesabilitado?: string;
  extra?: { rotulo: string; dica: string };
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [agendado, setAgendado] = useState("");
  const [valorExtra, setValorExtra] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const destinos = grupos.filter((g) => g.funcao === "destino");
  const testes = grupos.filter((g) => g.funcao === "teste");

  function alternar(id: string) {
    setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (!v) setErro(null);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          disabled={desabilitado}
          title={desabilitado ? motivoDesabilitado : undefined}
        >
          <Send className="size-4" /> {rotulo}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolha os grupos</DialogTitle>
          <DialogDescription>
            Modo assistido: o sistema monta o texto com o link de afiliado de cada grupo e você
            publica em Grupos de Ofertas &gt; Publicar.
          </DialogDescription>
        </DialogHeader>
        {grupos.length === 0 ? (
          <p className="text-sm text-texto-2">
            Nenhum grupo de destino ativo. Cadastre em Grupos de Ofertas &gt; Grupos.
          </p>
        ) : (
          <div className="space-y-4">
            {[
              { titulo: "Grupos de destino", lista: destinos },
              { titulo: "Grupos de teste", lista: testes },
            ]
              .filter((s) => s.lista.length > 0)
              .map((s) => (
                <fieldset key={s.titulo} className="space-y-2">
                  <legend className="text-sm font-medium">{s.titulo}</legend>
                  {s.lista.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-acao"
                        checked={marcados.includes(g.id)}
                        onChange={() => alternar(g.id)}
                      />
                      {g.nome}
                    </label>
                  ))}
                </fieldset>
              ))}
            <div className="space-y-1.5">
              <label htmlFor="agendado" className="text-sm font-medium">
                Horário (opcional)
              </label>
              <Input
                id="agendado"
                type="datetime-local"
                value={agendado}
                onChange={(e) => setAgendado(e.target.value)}
              />
              <p className="text-xs text-texto-3">Vazio = agora. Horário de São Paulo.</p>
            </div>
            {extra && (
              <div className="space-y-1.5">
                <label htmlFor="extra-publicar" className="text-sm font-medium">
                  {extra.rotulo}
                </label>
                <Input
                  id="extra-publicar"
                  value={valorExtra}
                  onChange={(e) => setValorExtra(e.target.value)}
                  inputMode="url"
                />
                <p className="text-xs text-texto-3">{extra.dica}</p>
              </div>
            )}
            <p className="rounded-xl bg-superficie-2 p-3 text-sm">
              {marcados.length} grupo(s) selecionado(s) = {marcados.length} mensagem(ns).
            </p>
            {erro && <p className="text-sm text-erro">{erro}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button
            disabled={pendente || marcados.length === 0}
            onClick={() =>
              iniciar(async () => {
                const r = await acao(marcados, agendado || null, valorExtra.trim() || null);
                if (r.ok) {
                  toast.success(r.mensagem);
                  setAberto(false);
                  setMarcados([]);
                  router.refresh();
                } else setErro(erroPt(r.erro) ?? r.erro);
              })
            }
          >
            {pendente ? "Montando envios" : `Confirmar ${marcados.length || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
