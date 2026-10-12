import { notFound } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarTaxas, obterCanal } from "@/dados/configuracoes/canais";
import { excluirTaxas } from "@/acoes/configuracoes/canais";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { formatarData, hojeSaoPaulo } from "@/lib/formatos/data";
import { FormCanal } from "@/componentes/configuracoes/FormCanal";
import { FormTaxas } from "@/componentes/configuracoes/FormTaxas";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";

export default async function PaginaCanal({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirLeitura("configuracoes");
  const { id } = await params;
  const canal = await obterCanal(id);
  if (!canal) notFound();
  const taxas = await listarTaxas(id);
  const editar = podeEscrever(usuario.papel, "configuracoes");
  const hoje = hojeSaoPaulo();
  const vigente = taxas.find((t) => t.vigente_desde <= hoje) ?? null;
  const valorOuVazio = (v: number | null) => (v == null ? "Não configurado" : formatarMoeda(v));
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <section className="space-y-4 rounded-2xl bg-card p-5 shadow-painel">
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{canal.nome}</h1>
        {editar ? <FormCanal canal={canal} /> : <p className="text-sm text-texto-2">Somente leitura.</p>}
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Taxas por vigência</h2>
          {editar && (
            <DialogoNovo rotulo="Nova vigência" titulo="Nova vigência de taxas">
              <FormTaxas canalId={canal.id} base={vigente} />
            </DialogoNovo>
          )}
        </div>
        {taxas.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma taxa registrada"
            descricao="Sem taxas, a calculadora de preço (Fase 4) não consegue sugerir preço para este canal."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
            <Table>
              <TableHeader>
                <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                  <TableHead>Desde</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Fixa</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Ads</TableHead>
                  <TableHead>Frete</TableHead>
                  <TableHead>Repasse</TableHead>
                  {editar && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxas.map((t) => (
                  <TableRow key={t.id} className="numeros">
                    <TableCell>{formatarData(t.vigente_desde)}</TableCell>
                    <TableCell>{formatarPercentual(t.comissao_pct)}</TableCell>
                    <TableCell>{valorOuVazio(t.taxa_fixa_item)}</TableCell>
                    <TableCell>{formatarPercentual(t.taxa_pagamento_pct)}</TableCell>
                    <TableCell>{formatarPercentual(t.ads_pct_padrao)}</TableCell>
                    <TableCell>{valorOuVazio(t.frete_subsidio_padrao)}</TableCell>
                    <TableCell>{t.dias_repasse == null ? "Não configurado" : `${t.dias_repasse} dias`}</TableCell>
                    {editar && (
                      <TableCell className="text-right">
                        <BotaoAcao
                          acao={excluirTaxas.bind(null, t.id)}
                          confirmar={{
                            titulo: "Remover esta vigência?",
                            descricao: "Cálculos salvos que a usaram continuam com o snapshot próprio.",
                          }}
                        >
                          Remover
                        </BotaoAcao>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
