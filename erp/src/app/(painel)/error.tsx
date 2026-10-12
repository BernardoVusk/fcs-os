"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/componentes/ui/button";

/** Erro inesperado numa tela do painel: mensagem sem stack, tentar de novo e voltar ao início. */
export default function ErroPainel({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[painel]", error.digest ?? "", error.message);
  }, [error]);
  return (
    <div className="mx-auto max-w-lg space-y-4 py-12 text-center" role="alert">
      <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
        Algo deu errado nesta tela
      </h1>
      <p className="text-sm text-texto-2">
        O erro ficou registrado no servidor. Tente de novo; se continuar, volte ao início e abra a
        tela pelo menu.
        {error.digest && (
          <span className="numeros mt-1 block text-xs text-texto-3">código {error.digest}</span>
        )}
      </p>
      <div className="flex justify-center gap-2">
        <Button onClick={reset}>Tentar de novo</Button>
        <Button asChild variant="secondary">
          <Link href="/">Ir para o início</Link>
        </Button>
      </div>
    </div>
  );
}
