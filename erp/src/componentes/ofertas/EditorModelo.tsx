"use client";

import { useContext, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { salvarModelo } from "@/acoes/ofertas/cadastros";
import {
  renderizarModelo,
  validarModelo,
  VARIAVEIS,
  VARIAVEL_DESCRICAO,
} from "@/dominio/ofertas/modelos";
import { PLATAFORMAS, PLATAFORMA_ROTULO } from "@/dominio/ofertas/plataformas";
import { erroPt } from "@/lib/erros-pt";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";

/** Valores de exemplo só para a prévia do editor (rotulados como exemplo na tela). */
const EXEMPLO: Record<string, string> = {
  produto: "Miniatura F1 1:43 (exemplo)",
  preco_atual: "R$ 49,90",
  preco_anterior: "R$ 69,90",
  desconto: "28%",
  cupom: "EXEMPLO10",
  cupom_beneficio: "10% de desconto",
  validade_cupom: "31/10/2026",
  link: "https://link-de-afiliado-do-grupo",
  marketplace: "Shopee",
  atualizado_em: "18/10/2026 14:30",
};

export type ModeloEdicao = {
  id: string;
  nome: string;
  tipo: "oferta" | "cupom";
  plataforma: string | null;
  corpo: string;
  padrao: boolean;
};

export function EditorModelo({ modelo }: { modelo?: ModeloEdicao }) {
  const router = useRouter();
  const fechar = useContext(ContextoDialogo);
  const [corpo, setCorpo] = useState(modelo?.corpo ?? "");
  const [tipo, setTipo] = useState<"oferta" | "cupom">(modelo?.tipo ?? "oferta");
  const [plataforma, setPlataforma] = useState(modelo?.plataforma ?? "");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [pendente, iniciar] = useTransition();
  const validacao = useMemo(
    () => validarModelo(corpo, tipo, plataforma || null),
    [corpo, tipo, plataforma],
  );
  const previa = useMemo(() => renderizarModelo(corpo, EXEMPLO), [corpo]);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        iniciar(async () => {
          const r = await salvarModelo(modelo?.id ?? null, fd);
          setErros(r.erros);
          if (r.ok) {
            toast.success(r.mensagem ?? "Salvo.");
            fechar();
            router.refresh();
          } else if (r.erros._form) toast.error(erroPt(r.erros._form));
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Nome" nome="nome-modelo" erro={erros.nome}>
          <Input id="nome-modelo" name="nome" defaultValue={modelo?.nome} maxLength={80} required />
        </Campo>
        <Campo rotulo="Tipo" nome="tipo-modelo">
          <SelectNativo
            id="tipo-modelo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "oferta" | "cupom")}
          >
            <option value="oferta">Oferta de produto</option>
            <option value="cupom">Cupom</option>
          </SelectNativo>
        </Campo>
        <Campo rotulo="Plataforma" nome="plataforma-modelo">
          <SelectNativo
            id="plataforma-modelo"
            name="plataforma"
            value={plataforma}
            onChange={(e) => setPlataforma(e.target.value)}
          >
            <option value="">Qualquer</option>
            {PLATAFORMAS.map((p) => (
              <option key={p} value={p}>
                {PLATAFORMA_ROTULO[p]}
              </option>
            ))}
          </SelectNativo>
        </Campo>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-1.5">
          <label htmlFor="corpo-modelo" className="text-sm font-medium">
            Texto do modelo
          </label>
          <Textarea
            id="corpo-modelo"
            name="corpo"
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            rows={10}
            maxLength={4000}
            className="font-mono text-xs"
          />
          <p className="text-xs text-texto-3">
            Variável: {"{{produto}}"}. Seção que só aparece com dado:{" "}
            {"{{#cupom}}Cupom {{cupom}}{{/cupom}}"}. *negrito* e _itálico_ do WhatsApp valem.
          </p>
          {validacao.erros.length > 0 && (
            <p className="text-sm text-erro">
              {validacao.erros
                .map(
                  (e) => erroPt(e.split(":")[0]) + (e.includes(":") ? ` (${e.split(":")[1]})` : ""),
                )
                .join(" ")}
            </p>
          )}
          {validacao.avisos.length > 0 && (
            <p className="text-sm text-alerta">
              Fora de seção: {validacao.avisos.map((a) => a.split(":")[1]).join(", ")}. Sem esse
              dado a publicação fica bloqueada.
            </p>
          )}
          <CampoErro chave={erros.corpo} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Variáveis</p>
          <ul className="max-h-64 space-y-1 overflow-y-auto text-xs">
            {VARIAVEIS.map((v) => (
              <li key={v}>
                <button
                  type="button"
                  className="font-mono text-acao hover:underline"
                  onClick={() => setCorpo((c) => `${c}{{${v}}}`)}
                >
                  {`{{${v}}}`}
                </button>
                <span className="block text-texto-3">{VARIAVEL_DESCRICAO[v]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Prévia com dados de exemplo</p>
        <pre className="rounded-xl bg-superficie-2 p-3 font-sans text-sm whitespace-pre-wrap">
          {previa.texto || "(vazio)"}
        </pre>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="padrao"
          defaultChecked={modelo?.padrao}
          className="size-4 accent-acao"
        />
        Usar como padrão deste tipo e plataforma
      </label>
      <CampoErro chave={erros._form} />
      <Button type="submit" disabled={pendente || validacao.erros.length > 0} className="w-full">
        {pendente ? "Salvando" : "Salvar modelo"}
      </Button>
    </form>
  );
}
