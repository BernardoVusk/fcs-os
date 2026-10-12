import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarContas } from "@/dados/financeiro/financeiro";
import { listarCanais } from "@/dados/configuracoes/canais";
import { listarImportacoes } from "@/dados/vendas/pedidos";
import { formatarDataHora } from "@/lib/formatos/data";
import { ConciliarRepasses } from "@/componentes/financeiro/Conciliar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";

// Vercel: importações, geração e MCP podem passar dos 10 s padrão.
export const maxDuration = 60;

export const metadata = { title: "Conciliar repasses" };

export default async function PaginaConciliar() {
  const usuario = await exigirLeitura("financeiro");
  const [canais, contas, importacoes] = await Promise.all([
    listarCanais(),
    listarContas(),
    listarImportacoes("repasses"),
  ]);
  const editar = podeEscrever(usuario.papel, "financeiro");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
          Conciliar repasses
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          Extrato de liberações do canal (CSV). Cada linha casa com o pedido pelo código no canal e
          realiza o recebível com o valor repassado. Diferença acima de R$ 0,05 abre alerta e nunca
          muda o previsto.
        </p>
      </div>
      {editar ? (
        <ConciliarRepasses
          canais={canais.filter((c) => c.ativo).map((c) => ({ id: c.id!, nome: c.nome! }))}
          contas={contas.filter((c) => c.ativo).map((c) => ({ id: c.id!, nome: c.nome! }))}
        />
      ) : (
        <p className="text-sm text-texto-2">Somente leitura.</p>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Conciliações anteriores</h2>
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
                  <TableHead className="text-right">Conciliados</TableHead>
                  <TableHead className="text-right">Divergentes</TableHead>
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
