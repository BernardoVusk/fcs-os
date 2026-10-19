"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUp } from "lucide-react";
import {
  importarAwin,
  importarRelatorioCsv,
  importarShopee,
  type ResultadoImportacao,
} from "@/acoes/ofertas/relatorios";
import { separar } from "@/dominio/ofertas/fila";
import { PLATAFORMAS, PLATAFORMA_ROTULO } from "@/dominio/ofertas/plataformas";
import { erroPt } from "@/lib/erros-pt";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { SelectNativo } from "@/componentes/painel/SelectNativo";

const CAMPOS = {
  conversoes: [
    { chave: "ref", rotulo: "Referência do pedido ou conversão", obrigatorio: true },
    { chave: "data", rotulo: "Data", obrigatorio: true },
    { chave: "status", rotulo: "Situação", obrigatorio: false },
    { chave: "venda", rotulo: "Valor da venda", obrigatorio: false },
    { chave: "comissao", rotulo: "Comissão", obrigatorio: false },
    { chave: "codigo", rotulo: "Sub ID, clickref, tag ou etiqueta", obrigatorio: false },
  ],
  cliques: [
    { chave: "data", rotulo: "Data", obrigatorio: true },
    { chave: "codigo", rotulo: "Sub ID, clickref, tag ou etiqueta", obrigatorio: true },
    { chave: "cliques", rotulo: "Cliques", obrigatorio: true },
  ],
} as const;

function useResultado() {
  const router = useRouter();
  const [detalhes, setDetalhes] = useState<string[]>([]);
  const mostrar = (r: ResultadoImportacao) => {
    setDetalhes(r.detalhes ?? []);
    if (r.ok) {
      toast.success(r.mensagem ?? "Importado.");
      router.refresh();
    } else toast.error(erroPt(r.erro) ?? r.erro ?? "Não deu para importar.");
  };
  return { detalhes, mostrar };
}

export function ImportarApi({ awin, shopee }: { awin: boolean; shopee: boolean }) {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [pendente, iniciar] = useTransition();
  const { mostrar } = useResultado();
  if (!awin && !shopee)
    return (
      <p className="text-sm text-texto-2">
        Conecte a Awin ou a Open API da Shopee para importar por API.
      </p>
    );
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="space-y-1 text-xs">
        <span className="text-texto-3">De</span>
        <Input
          type="date"
          value={de}
          onChange={(e) => setDe(e.target.value)}
          className="h-8 w-auto"
        />
      </label>
      <label className="space-y-1 text-xs">
        <span className="text-texto-3">Até</span>
        <Input
          type="date"
          value={ate}
          onChange={(e) => setAte(e.target.value)}
          className="h-8 w-auto"
        />
      </label>
      {awin && (
        <Button
          size="sm"
          variant="secondary"
          disabled={pendente || !de || !ate}
          onClick={() => iniciar(async () => mostrar(await importarAwin(de, ate)))}
        >
          Importar da Awin
        </Button>
      )}
      {shopee && (
        <Button
          size="sm"
          variant="secondary"
          disabled={pendente || !de || !ate}
          onClick={() => iniciar(async () => mostrar(await importarShopee(de, ate)))}
        >
          Importar da Shopee
        </Button>
      )}
    </div>
  );
}

export function ImportarCsv() {
  const arquivo = useRef<HTMLInputElement>(null);
  const [plataforma, setPlataforma] = useState<string>("mercado_livre");
  const [tipo, setTipo] = useState<"conversoes" | "cliques">("conversoes");
  const [texto, setTexto] = useState<string | null>(null);
  const [colunas, setColunas] = useState<string[]>([]);
  const [mapa, setMapa] = useState<Record<string, string>>({});
  const [pendente, iniciar] = useTransition();
  const { detalhes, mostrar } = useResultado();
  const faltando = CAMPOS[tipo].filter((c) => c.obrigatorio && !mapa[c.chave]).length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <SelectNativo
          aria-label="Plataforma do relatório"
          value={plataforma}
          onChange={(e) => setPlataforma(e.target.value)}
          className="h-8 w-auto"
        >
          {PLATAFORMAS.map((p) => (
            <option key={p} value={p}>
              {PLATAFORMA_ROTULO[p]}
            </option>
          ))}
        </SelectNativo>
        <SelectNativo
          aria-label="Tipo de relatório"
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value as "conversoes" | "cliques");
            setMapa({});
          }}
          className="h-8 w-auto"
        >
          <option value="conversoes">Conversões e comissões</option>
          <option value="cliques">Cliques</option>
        </SelectNativo>
        <input
          ref={arquivo}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const t = await f.text();
            e.target.value = "";
            setTexto(t);
            setColunas((separar(t)[0] ?? []).map((c) => c.trim()).filter(Boolean));
            setMapa({});
          }}
        />
        <Button size="sm" variant="outline" onClick={() => arquivo.current?.click()}>
          <FileUp className="size-4" /> Escolher arquivo CSV
        </Button>
      </div>
      {colunas.length > 0 && (
        <div className="space-y-2 rounded-xl bg-superficie-2 p-3">
          <p className="text-xs text-texto-2">
            Aponte qual coluna do arquivo é cada campo. O que não for apontado fica sem dado.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CAMPOS[tipo].map((c) => (
              <label key={c.chave} className="space-y-1 text-xs">
                <span className="text-texto-3">
                  {c.rotulo}
                  {c.obrigatorio ? " (obrigatório)" : ""}
                </span>
                <SelectNativo
                  value={mapa[c.chave] ?? ""}
                  onChange={(e) => setMapa((m) => ({ ...m, [c.chave]: e.target.value }))}
                  className="h-8"
                >
                  <option value="">Não usar</option>
                  {colunas.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </SelectNativo>
              </label>
            ))}
          </div>
          <Button
            size="sm"
            disabled={pendente || faltando > 0 || !texto}
            onClick={() =>
              iniciar(async () =>
                mostrar(await importarRelatorioCsv({ plataforma, tipo, mapa, texto: texto ?? "" })),
              )
            }
          >
            {pendente ? "Importando" : "Importar"}
          </Button>
        </div>
      )}
      {detalhes.length > 0 && (
        <ul className="max-h-32 overflow-y-auto rounded-xl bg-superficie-2 p-3 text-xs text-texto-2">
          {detalhes.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
      <p className="text-xs text-texto-3">
        Mesmo arquivo duas vezes é recusado. Arquivo novo com pedidos já importados atualiza a
        situação e a comissão.
      </p>
    </div>
  );
}
