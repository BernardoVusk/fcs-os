"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { confirmarMfa, iniciarMfa, removerMfa, type InscricaoMfa } from "@/acoes/mfa";
import { FORM_INICIAL } from "@/lib/forms";
import { erroPt } from "@/lib/erros-pt";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

/** Verificação em duas etapas (TOTP): ativar com QR e código, ou desativar com código. */
export function Mfa({ fatorAtivoId }: { fatorAtivoId: string | null }) {
  const [inscricao, setInscricao] = useState<InscricaoMfa | null>(null);
  const [pendente, iniciar] = useTransition();
  const [estadoConfirmar, confirmar, confirmando] = useActionState(confirmarMfa, FORM_INICIAL);
  const [estadoRemover, remover, removendo] = useActionState(removerMfa, FORM_INICIAL);
  useAoSalvar(estadoConfirmar, () => setInscricao(null));
  useAoSalvar(estadoRemover);
  function comecar() {
    iniciar(async () => {
      const r = await iniciarMfa();
      if ("erro" in r) toast.error(erroPt(r.erro) ?? "Não deu para começar.");
      else setInscricao(r);
    });
  }
  if (fatorAtivoId) {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm">
          <Badge className="bg-sucesso text-acao-texto">Ativa</Badge>O login pede o código do
          aplicativo autenticador.
        </p>
        <form action={remover} className="flex flex-wrap items-end gap-2" noValidate>
          <input type="hidden" name="factor_id" value={fatorAtivoId} />
          <Campo
            rotulo="Código atual para desativar"
            nome="codigo"
            erro={estadoRemover.erros.codigo}
          >
            <Input
              id="codigo"
              name="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="numeros w-32"
            />
          </Campo>
          <Button type="submit" variant="destructive" size="sm" disabled={removendo}>
            Desativar
          </Button>
          <CampoErro chave={estadoRemover.erros._form} />
        </form>
      </div>
    );
  }
  if (!inscricao)
    return (
      <div className="space-y-3">
        <p className="text-sm text-texto-2">
          Recomendada para o dono: além da senha, o login pede um código de 6 dígitos do aplicativo
          autenticador (Google Authenticator, Authy, 1Password).
        </p>
        <Button size="sm" onClick={comecar} disabled={pendente}>
          {pendente ? "Preparando" : "Ativar verificação em duas etapas"}
        </Button>
      </div>
    );
  return (
    <form action={confirmar} className="space-y-4" noValidate>
      <input type="hidden" name="factor_id" value={inscricao.factorId} />
      <div className="flex flex-wrap items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG em data URI gerado pelo Supabase */}
        <img
          src={inscricao.qr}
          alt="QR code para o aplicativo autenticador"
          width={160}
          height={160}
          className="rounded-lg bg-white p-2"
        />
        <div className="space-y-2 text-sm">
          <p>1. Leia o QR no aplicativo autenticador, ou digite o segredo:</p>
          <code
            className="block rounded-lg bg-superficie-2 px-3 py-2 font-mono text-xs break-all"
            aria-label="Segredo"
          >
            {inscricao.segredo}
          </code>
          <p>2. Digite o código que o aplicativo mostrar para confirmar.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Campo rotulo="Código do aplicativo" nome="codigo" erro={estadoConfirmar.erros.codigo}>
          <Input
            id="codigo"
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="numeros w-32"
            autoFocus
          />
        </Campo>
        <Button type="submit" size="sm" disabled={confirmando}>
          {confirmando ? "Confirmando" : "Confirmar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setInscricao(null)}>
          Cancelar
        </Button>
      </div>
      <CampoErro chave={estadoConfirmar.erros._form} />
    </form>
  );
}
