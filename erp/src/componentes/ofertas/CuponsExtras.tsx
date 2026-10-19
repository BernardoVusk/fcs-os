"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUp } from "lucide-react";
import { importarCuponsCsv, salvarRegraCupons } from "@/acoes/ofertas/cadastros";
import { COLUNAS_CSV_CUPONS } from "@/dominio/ofertas/cupons";
import { erroPt } from "@/lib/erros-pt";
import { Button } from "@/componentes/ui/button";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";

export function RegraCupons({
  enviar,
  fila,
  filas,
}: {
  enviar: boolean;
  fila: string | null;
  filas: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [erros, setErros] = useState<Record<string, string>>({});
  const [pendente, iniciar] = useTransition();
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        iniciar(async () => {
          const r = await salvarRegraCupons(fd);
          setErros(r.erros);
          if (r.ok) {
            toast.success(r.mensagem ?? "Salvo.");
            router.refresh();
          } else if (r.erros._form) toast.error(erroPt(r.erros._form));
        });
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="enviar_awin"
          defaultChecked={enviar}
          className="size-4 accent-acao"
        />
        Cupom novo da Awin (com código) entra sozinho na fila
      </label>
      <div className="space-y-1">
        <SelectNativo
          name="fila_awin_id"
          defaultValue={fila ?? ""}
          aria-label="Fila dos cupons"
          className="h-8 w-auto"
        >
          <option value="">Escolha a fila</option>
          {filas.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </SelectNativo>
        <CampoErro chave={erros.fila_awin_id} />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pendente}>
        Salvar regra
      </Button>
    </form>
  );
}

export function ImportarCupons() {
  const router = useRouter();
  const arquivo = useRef<HTMLInputElement>(null);
  const [detalhes, setDetalhes] = useState<string[]>([]);
  const [pendente, iniciar] = useTransition();
  return (
    <div className="space-y-2">
      <input
        ref={arquivo}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const texto = await f.text();
          e.target.value = "";
          iniciar(async () => {
            const r = await importarCuponsCsv(texto);
            setDetalhes(r.detalhes ?? []);
            if (r.ok) {
              toast.success(r.mensagem ?? "Importado.");
              router.refresh();
            } else toast.error(erroPt(r.erro));
          });
        }}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={pendente}
        onClick={() => arquivo.current?.click()}
      >
        <FileUp className="size-4" /> Importar CSV de cupons
      </Button>
      <p className="text-xs text-texto-3">
        Colunas: {COLUNAS_CSV_CUPONS.join(", ")}. Plataforma: Shopee, Mercado Livre, Amazon ou Awin.
        Datas em dd/mm/aaaa ou aaaa-mm-dd. Cupom importado fica com a validade não confirmada até
        você conferir.
      </p>
      {detalhes.length > 0 && (
        <ul className="max-h-32 overflow-y-auto rounded-xl bg-superficie-2 p-3 text-xs text-texto-2">
          {detalhes.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
