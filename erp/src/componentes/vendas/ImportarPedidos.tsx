"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { importarPedidos, salvarMapeamento } from "@/acoes/vendas/importacao";
import { MAPEAMENTO_PADRAO, type MapeamentoPedidos } from "@/dominio/vendas/importacao-pedidos";
import { FORM_INICIAL } from "@/lib/forms";
import { erroPt } from "@/lib/erros-pt";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { Banner } from "@/componentes/painel/Banner";

export type CanalImportacao = {
  id: string;
  nome: string;
  tipo: string;
  mapeamento: Partial<MapeamentoPedidos>;
};

const CAMPOS: { chave: keyof MapeamentoPedidos; rotulo: string; obrigatorio?: boolean }[] = [
  { chave: "codigo_externo", rotulo: "Código do pedido", obrigatorio: true },
  { chave: "data_pedido", rotulo: "Data do pedido", obrigatorio: true },
  { chave: "status", rotulo: "Status no canal" },
  { chave: "cliente_nome", rotulo: "Nome do cliente" },
  { chave: "cliente_contato", rotulo: "Contato do cliente" },
  { chave: "descontos_vendedor", rotulo: "Cupom do vendedor" },
  { chave: "frete_cobrado", rotulo: "Frete cobrado do cliente" },
  { chave: "frete_pago", rotulo: "Frete pago por nós" },
  { chave: "taxas_canal", rotulo: "Taxas do canal (R$)" },
  { chave: "taxas_pagamento", rotulo: "Taxa de pagamento (R$)" },
  { chave: "total_bruto", rotulo: "Total bruto" },
  { chave: "item_codigo_anuncio", rotulo: "Código do anúncio" },
  { chave: "item_sku", rotulo: "SKU" },
  { chave: "item_titulo", rotulo: "Título do item" },
  { chave: "item_quantidade", rotulo: "Quantidade", obrigatorio: true },
  { chave: "item_preco", rotulo: "Preço unitário", obrigatorio: true },
  { chave: "item_desconto", rotulo: "Desconto do item" },
];

export function ImportarPedidos({
  canais,
  editarMapeamento,
}: {
  canais: CanalImportacao[];
  editarMapeamento: boolean;
}) {
  const [estado, acao, pendente] = useActionState(importarPedidos, FORM_INICIAL);
  const [canalId, setCanalId] = useState(canais[0]?.id ?? "");
  const canal = canais.find((c) => c.id === canalId);
  const base = {
    ...(MAPEAMENTO_PADRAO[canal?.tipo ?? "outro"] ?? MAPEAMENTO_PADRAO.outro),
    ...Object.fromEntries(Object.entries(canal?.mapeamento ?? {}).filter(([, v]) => v)),
  } as MapeamentoPedidos;
  const [mapa, setMapa] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(base).map(([k, v]) => [k, String(v ?? "")])),
  );
  const [salvando, iniciar] = useTransition();
  function trocarCanal(id: string) {
    setCanalId(id);
    const c = canais.find((x) => x.id === id);
    const b = {
      ...(MAPEAMENTO_PADRAO[c?.tipo ?? "outro"] ?? MAPEAMENTO_PADRAO.outro),
      ...Object.fromEntries(Object.entries(c?.mapeamento ?? {}).filter(([, v]) => v)),
    };
    setMapa(Object.fromEntries(Object.entries(b).map(([k, v]) => [k, String(v ?? "")])));
  }
  return (
    <div className="space-y-5">
      <form action={acao} className="space-y-4 rounded-2xl bg-card p-5 shadow-painel" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Canal" nome="canal_id" erro={estado.erros.canal_id}>
            <SelectNativo
              id="canal_id"
              name="canal_id"
              value={canalId}
              onChange={(e) => trocarCanal(e.target.value)}
            >
              {canais.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo
            rotulo="Arquivo CSV de pedidos"
            nome="arquivo"
            erro={estado.erros.arquivo}
            dica="Exportado da central do vendedor. O mesmo arquivo não é importado duas vezes."
          >
            <Input
              id="arquivo"
              name="arquivo"
              type="file"
              accept=".csv,text/csv"
              className="file:mr-3 file:rounded-full file:border-0 file:bg-superficie-2 file:px-3 file:py-1 file:text-sm"
            />
          </Campo>
        </div>
        <CampoErro chave={estado.erros._form} />
        <Button type="submit" disabled={pendente || !canalId}>
          {pendente ? "Importando" : "Importar pedidos"}
        </Button>
        {estado.ok && estado.mensagem && (
          <Banner tipo="sucesso" titulo="Importação concluída">
            {estado.mensagem}
          </Banner>
        )}
      </form>
      <section className="space-y-3 rounded-2xl bg-card p-5 shadow-painel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">
              Mapeamento de colunas de {canal?.nome ?? "canal"}
            </h2>
            <p className="text-sm text-texto-2">
              Nome exato da coluna no CSV, sem diferença de acento ou caixa. Os valores iniciais são
              hipótese: confira com o seu arquivo.
            </p>
          </div>
          {editarMapeamento && (
            <Button
              variant="secondary"
              size="sm"
              disabled={salvando}
              onClick={() =>
                iniciar(async () => {
                  const r = await salvarMapeamento(canalId, mapa);
                  if (r.ok) toast.success(r.mensagem);
                  else toast.error(erroPt(r.erro) ?? "Algo deu errado.");
                })
              }
            >
              {salvando ? "Salvando" : "Salvar mapeamento"}
            </Button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAMPOS.map((c) => (
            <Campo
              key={c.chave}
              rotulo={`${c.rotulo}${c.obrigatorio ? " *" : ""}`}
              nome={`mapa-${c.chave}`}
            >
              <Input
                id={`mapa-${c.chave}`}
                value={mapa[c.chave] ?? ""}
                onChange={(e) => setMapa({ ...mapa, [c.chave]: e.target.value })}
                disabled={!editarMapeamento}
                className="font-mono text-xs"
              />
            </Campo>
          ))}
          <Campo rotulo="Formato da data" nome="mapa-formato_data">
            <SelectNativo
              id="mapa-formato_data"
              value={mapa.formato_data ?? "iso"}
              onChange={(e) => setMapa({ ...mapa, formato_data: e.target.value })}
              disabled={!editarMapeamento}
            >
              <option value="iso">2026-10-12</option>
              <option value="br">12/10/2026</option>
              <option value="br_hora">12/10/2026 14:30</option>
            </SelectNativo>
          </Campo>
        </div>
      </section>
    </div>
  );
}
