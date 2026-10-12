"use client";

import { Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { COOKIE_TEMA, type Tema } from "@/lib/tema";
import { Button } from "@/componentes/ui/button";

export function SeletorTema({ inicial }: { inicial: Tema }) {
  const [tema, setTema] = useState<Tema>(inicial);
  const router = useRouter();
  function alternar() {
    const novo: Tema = tema === "escuro" ? "claro" : "escuro";
    setTema(novo);
    document.documentElement.dataset.tema = novo;
    document.cookie = `${COOKIE_TEMA}=${novo}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  const rotulo = tema === "escuro" ? "Usar tema claro" : "Usar tema escuro";
  return (
    <Button variant="ghost" size="icon" onClick={alternar} aria-label={rotulo} title={rotulo}>
      {tema === "escuro" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
