"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepararManuais } from "@/acoes/ofertas/filas";

/** Ao abrir Publicar: avança as filas manuais e monta texto e link dos envios que chegaram. */
export function PrepararPendentes() {
  const router = useRouter();
  const feito = useRef(false);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    prepararManuais().then((r) => {
      if (r.preparados || r.falhas) {
        setAviso(
          `${r.preparados} envio(s) de fila prontos${r.falhas ? `; ${r.falhas} não puderam ser montados (veja a fila, aba Falhas e incertos)` : ""}.`,
        );
        router.refresh();
      }
    });
  }, [router]);
  return aviso ? (
    <p className="text-sm text-texto-2" role="status">
      {aviso}
    </p>
  ) : null;
}
