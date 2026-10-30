"use client";

import { useEffect, useRef } from "react";

/**
 * No celular a faixa de categorias rola na horizontal: ao abrir uma categoria, centraliza a
 * atual (aria-current) mexendo só no scroll da faixa, nunca no da página.
 */
export function FaixaCategorias({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const faixa = ref.current;
    const atual = faixa?.querySelector<HTMLElement>('[aria-current="page"]');
    if (faixa && atual) {
      faixa.scrollLeft = atual.offsetLeft - faixa.clientWidth / 2 + atual.offsetWidth / 2;
    }
  }, []);
  return (
    <nav
      ref={ref}
      aria-label="Categorias"
      className="relative -mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
    >
      {children}
    </nav>
  );
}
