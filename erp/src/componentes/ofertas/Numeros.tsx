"use client";

import { useContext, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QrCode, Smartphone } from "lucide-react";
import {
  comandoNumero,
  consultarConexao,
  criarNumero,
  salvarNumero,
} from "@/acoes/ofertas/whatsapp";
import { STATUS_NUMERO_ROTULO, TEXTO_ACEITE } from "@/dominio/ofertas/risco";
import { erroPt } from "@/lib/erros-pt";
import type { EstadoForm } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";

type Limites = {
  rotulo: string;
  telefone: string | null;
  limite_por_hora: number;
  limite_por_dia: number;
  intervalo_min_segundos: number;
  janela_inicio: string;
  janela_fim: string;
};

function CamposNumero({ n, erros }: { n?: Limites; erros: Record<string, string> }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Nome do número"
          nome="n-rotulo"
          erro={erros.rotulo}
          dica="Ex.: Ofertas 1 (chip dedicado)"
        >
          <Input id="n-rotulo" name="rotulo" defaultValue={n?.rotulo} maxLength={60} />
        </Campo>
        <Campo
          rotulo="Telefone (opcional)"
          nome="n-tel"
          erro={erros.telefone}
          dica="DDD e número. Só para conectar por código."
        >
          <Input
            id="n-tel"
            name="telefone"
            defaultValue={n?.telefone ? n.telefone.slice(2) : ""}
            inputMode="tel"
          />
        </Campo>
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-medium">
          Limites de envio automático (operacionais, não evitam bloqueio)
        </legend>
        <Campo rotulo="Por hora" nome="n-hora" erro={erros.limite_por_hora}>
          <Input
            id="n-hora"
            name="limite_por_hora"
            type="number"
            min={1}
            max={200}
            defaultValue={n?.limite_por_hora ?? 20}
          />
        </Campo>
        <Campo rotulo="Por dia" nome="n-dia" erro={erros.limite_por_dia}>
          <Input
            id="n-dia"
            name="limite_por_dia"
            type="number"
            min={1}
            max={2000}
            defaultValue={n?.limite_por_dia ?? 120}
          />
        </Campo>
        <Campo rotulo="Intervalo mínimo (s)" nome="n-int" erro={erros.intervalo_min_segundos}>
          <Input
            id="n-int"
            name="intervalo_min_segundos"
            type="number"
            min={20}
            max={3600}
            defaultValue={n?.intervalo_min_segundos ?? 90}
          />
        </Campo>
        <Campo rotulo="Envia a partir de" nome="n-ini" erro={erros.janela_inicio}>
          <Input
            id="n-ini"
            name="janela_inicio"
            type="time"
            defaultValue={n?.janela_inicio?.slice(0, 5) ?? "08:00"}
          />
        </Campo>
        <Campo rotulo="Até" nome="n-fim" erro={erros.janela_fim}>
          <Input
            id="n-fim"
            name="janela_fim"
            type="time"
            defaultValue={n?.janela_fim?.slice(0, 5) ?? "22:00"}
          />
        </Campo>
      </fieldset>
    </>
  );
}

function useFormulario(acao: (fd: FormData) => Promise<EstadoForm>) {
  const router = useRouter();
  const fechar = useContext(ContextoDialogo);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [pendente, iniciar] = useTransition();
  return {
    erros,
    pendente,
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      iniciar(async () => {
        const r = await acao(fd);
        setErros(r.erros);
        if (r.ok) {
          toast.success(r.mensagem ?? "Salvo.");
          fechar();
          router.refresh();
        } else if (r.erros._form) toast.error(erroPt(r.erros._form));
      });
    },
  };
}

export function FormNovoNumero() {
  const { erros, pendente, onSubmit } = useFormulario(criarNumero);
  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <CamposNumero erros={erros} />
      <div className="space-y-2 rounded-xl border border-alerta/40 bg-alerta/10 p-4 text-sm">
        <p className="font-medium">Risco da conexão por QR Code</p>
        <ul className="list-disc space-y-1 pl-5 text-texto-2">
          {TEXTO_ACEITE.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <label className="flex items-start gap-2 pt-1">
          <input type="checkbox" name="aceite" className="mt-1 size-4 accent-acao" />
          <span>Li, entendo o risco e vou usar um número dedicado.</span>
        </label>
        <CampoErro chave={erros.aceite} />
      </div>
      <CampoErro chave={erros._form} />
      <Button type="submit" disabled={pendente} className="w-full">
        Cadastrar número
      </Button>
    </form>
  );
}

export function FormLimites({ id, n }: { id: string; n: Limites }) {
  const { erros, pendente, onSubmit } = useFormulario((fd) => salvarNumero(id, fd));
  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <CamposNumero n={n} erros={erros} />
      <CampoErro chave={erros._form} />
      <Button type="submit" disabled={pendente} className="w-full">
        Salvar
      </Button>
    </form>
  );
}

type Conexao = Awaited<ReturnType<typeof consultarConexao>>;

/** Conectar por QR Code ou código: pede ao worker e acompanha até conectar. */
export function Conectar({
  id,
  temTelefone,
  statusInicial,
}: {
  id: string;
  temTelefone: boolean;
  statusInicial: string;
}) {
  const router = useRouter();
  const [acompanhando, setAcompanhando] = useState(
    statusInicial === "aguardando_qr" || statusInicial === "conectando",
  );
  const [conexao, setConexao] = useState<Conexao>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    if (!acompanhando) return;
    let vivo = true;
    const ler = async () => {
      const c = await consultarConexao(id);
      if (!vivo) return;
      setConexao(c);
      if (c?.estado?.status === "conectado") {
        setAcompanhando(false);
        toast.success("Número conectado.");
        router.refresh();
      }
    };
    ler();
    const t = setInterval(ler, 3000);
    const limite = setTimeout(() => setAcompanhando(false), 5 * 60_000);
    return () => {
      vivo = false;
      clearInterval(t);
      clearTimeout(limite);
    };
  }, [acompanhando, id, router]);

  function pedir(tipo: "conectar" | "parear") {
    iniciar(async () => {
      const r = await comandoNumero(id, tipo);
      if (r.ok) {
        toast.success(r.mensagem ?? "Pedido enviado.");
        setAcompanhando(true);
      } else toast.error(erroPt(r.erro) ?? "Não deu para pedir a conexão.");
    });
  }

  const qr = conexao?.qr;
  const falhou = conexao?.comando?.status === "falhou" ? conexao.comando.resultado : null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pendente} onClick={() => pedir("conectar")}>
          <QrCode className="size-4" /> Conectar por QR Code
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pendente || !temTelefone}
          title={temTelefone ? undefined : "Cadastre o telefone"}
          onClick={() => pedir("parear")}
        >
          <Smartphone className="size-4" /> Conectar por código
        </Button>
      </div>
      {acompanhando && (
        <div className="rounded-xl bg-superficie-2 p-4 text-sm" aria-live="polite">
          {qr?.tipo === "qr" ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr.conteudo}
                alt="QR Code para conectar o número"
                className="size-64 rounded-lg bg-white p-2"
              />
              <p className="text-texto-2">
                No celular do número: WhatsApp &gt; Aparelhos conectados &gt; Conectar aparelho. O
                código renova sozinho.
              </p>
            </div>
          ) : qr?.tipo === "pareamento" ? (
            <div className="space-y-2">
              <p className="font-mono text-3xl tracking-widest">{qr.conteudo}</p>
              <p className="text-texto-2">
                No celular: WhatsApp &gt; Aparelhos conectados &gt; Conectar aparelho &gt; Conectar
                com número de telefone. Digite este código.
              </p>
            </div>
          ) : (
            <p className="text-texto-2">
              {falhou
                ? `O worker recusou: ${erroPt(falhou) ?? falhou}`
                : `Aguardando o worker (${STATUS_NUMERO_ROTULO[conexao?.estado?.status ?? "conectando"] ?? "conectando"}).`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function EnviarTeste({
  id,
  grupos,
}: {
  id: string;
  grupos: { id: string; nome: string }[];
}) {
  const [grupo, setGrupo] = useState(grupos[0]?.id ?? "");
  const [pendente, iniciar] = useTransition();
  if (grupos.length === 0)
    return (
      <p className="text-xs text-texto-3">
        Para testar, marque um grupo sincronizado como Teste controlado.
      </p>
    );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SelectNativo
        aria-label="Grupo de teste"
        value={grupo}
        onChange={(e) => setGrupo(e.target.value)}
        className="h-8 w-auto"
      >
        {grupos.map((g) => (
          <option key={g.id} value={g.id}>
            {g.nome}
          </option>
        ))}
      </SelectNativo>
      <Button
        size="sm"
        variant="outline"
        disabled={pendente || !grupo}
        onClick={() =>
          iniciar(async () => {
            const r = await comandoNumero(id, "enviar_teste", grupo);
            if (r.ok) toast.success(r.mensagem ?? "Pedido.");
            else toast.error(erroPt(r.erro) ?? "Não deu para pedir o teste.");
          })
        }
      >
        Enviar teste
      </Button>
    </div>
  );
}
