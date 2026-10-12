import { redirect } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { clienteServidor } from "@/lib/supabase/servidor";
import { listarImportacoes } from "@/dados/vendas/pedidos";
import type { MapeamentoPedidos } from "@/dominio/vendas/importacao-pedidos";
import { formatarDataHora } from "@/lib/formatos/data";
import { ImportarPedidos } from "@/componentes/vendas/ImportarPedidos";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";

export const metadata = { title: "Importar pedidos" };

export default async function PaginaImportarPedidos() {
  const usuario = await exigirLeitura("vendas");
  if (!podeEscrever(usuario.papel, "vendas")) redirect("/vendas/pedidos");
  const supabase = await clienteServidor();
  const [{ data: canais }, importacoes] = await Promise.all([
    supabase
      .from("canais_venda")
      .select("id, nome, tipo, mapeamento_pedidos")
      .eq("ativo", true)
      .order("nome"),
    listarImportacoes("pedidos"),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Importar pedidos</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          CSV exportado da central do vendedor. Pedido novo entra no status inicial; pedido
          conhecido só atualiza valores e avança o status. O mesmo arquivo nunca é processado duas
          vezes.
        </p>
      </div>
      <ImportarPedidos
        canais={(canais ?? []).map((c) => ({
          id: c.id,
          nome: c.nome,
          tipo: c.tipo,
          mapeamento: (c.mapeamento_pedidos ?? {}) as Partial<MapeamentoPedidos>,
        }))}
        editarMapeamento={podeEscrever(usuario.papel, "configuracoes")}
      />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Importações anteriores</h2>
        {importacoes.length === 0 ? (
          <p className="text-sm text-texto-2">Nenhuma ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
            <Table>
              <TableHeader>
                <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                  <TableHead className="pl-5">Quando</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead className="text-right">Criados</TableHead>
                  <TableHead className="text-right">Atualizados</TableHead>
                  <TableHead className="text-right">Avisos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="numeros">
                {importacoes.map((i) => (
                  <TableRow key={i.id} className="h-11">
                    <TableCell className="pl-5">{formatarDataHora(i.em)}</TableCell>
                    <TableCell>{i.canal?.nome ?? "Canal"}</TableCell>
                    <TableCell className="font-mono text-xs">{i.nome_arquivo}</TableCell>
                    <TableCell className="text-right">{i.criadas}</TableCell>
                    <TableCell className="text-right">{i.atualizadas}</TableCell>
                    <TableCell className="text-right">{i.ignoradas}</TableCell>
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
