"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buscar } from "@/acoes/busca";
import {
  agruparResultados,
  ROTULO_TIPO,
  TIPOS_DISPONIVEIS,
  type ResultadoBusca,
  type TipoBusca,
} from "./busca-agrupar";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/componentes/ui/command";
import { cn } from "@/lib/utils";

export function BuscaGlobal() {
  const [aberta, setAberta] = useState(false);
  const [termo, setTermo] = useState("");
  const [tipos, setTipos] = useState<TipoBusca[]>([]);
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  const ultimo = useRef(0);

  useEffect(() => {
    function atalho(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberta((v) => !v);
      }
    }
    function abrir() {
      setAberta(true);
    }
    window.addEventListener("keydown", atalho);
    window.addEventListener("fcs:abrir-busca", abrir);
    return () => {
      window.removeEventListener("keydown", atalho);
      window.removeEventListener("fcs:abrir-busca", abrir);
    };
  }, []);

  useEffect(() => {
    const t = termo.trim();
    const id = ++ultimo.current;
    if (!t) return;
    const timer = setTimeout(() => {
      iniciar(async () => {
        const lista = await buscar({ termo: t, tipos });
        if (id === ultimo.current) setResultados(lista);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [termo, tipos]);

  function alternarTipo(tipo: TipoBusca) {
    setTipos((atual) =>
      atual.includes(tipo) ? atual.filter((x) => x !== tipo) : [...atual, tipo],
    );
  }

  function ir(rota: string) {
    setAberta(false);
    setTermo("");
    setResultados([]);
    router.push(rota);
  }

  const termoLimpo = termo.trim();
  const grupos = termoLimpo ? agruparResultados(resultados) : [];
  return (
    <CommandDialog
      open={aberta}
      onOpenChange={setAberta}
      title="Busca global"
      description="Busque por nome, código ou categoria"
    >
      <Command shouldFilter={false} className="bg-transparent">
        <CommandInput
          placeholder="Buscar insumo, lote, compra, conhecimento..."
          value={termo}
          onValueChange={setTermo}
        />
        <div
          className="flex flex-wrap gap-1 border-b border-borda px-3 py-2"
          role="group"
          aria-label="Filtrar por tipo"
        >
          {TIPOS_DISPONIVEIS.map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => alternarTipo(tipo)}
              aria-pressed={tipos.includes(tipo)}
              className={cn(
                "rounded-sm border px-2 py-0.5 text-xs",
                tipos.includes(tipo)
                  ? "border-acao bg-acao-suave text-texto"
                  : "border-borda text-texto-2",
              )}
            >
              {ROTULO_TIPO[tipo]}
            </button>
          ))}
        </div>
        <CommandList>
          {termoLimpo && !pendente && grupos.length === 0 && (
            <CommandEmpty>Nada encontrado para &quot;{termoLimpo}&quot;.</CommandEmpty>
          )}
          {!termoLimpo && (
            <CommandEmpty>Digite para buscar. Setas para navegar, Enter para abrir.</CommandEmpty>
          )}
          {grupos.map((g) => (
            <CommandGroup key={g.tipo} heading={g.rotulo}>
              {g.itens.map((r) => (
                <CommandItem
                  key={`${r.tipo}-${r.id}`}
                  value={`${r.tipo}-${r.id}`}
                  onSelect={() => ir(r.rota)}
                >
                  <span className="truncate">{r.titulo}</span>
                  {r.subtitulo && (
                    <span className="ml-auto truncate text-xs text-texto-3">{r.subtitulo}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
