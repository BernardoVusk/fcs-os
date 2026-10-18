import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { dadosGrupo, listarGruposResumo } from "@/dados/ofertas/whatsapp";
import { metricasGrupo } from "@/dominio/ofertas/evasao";
import { intervaloDoPeriodo, intervaloPersonalizado } from "@/lib/formatos/periodo";
import { formatarNumero } from "@/lib/formatos/numero";
import { SeletorPeriodo, lerPeriodo } from "@/componentes/painel/SeletorPeriodo";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { FiltroDatas } from "@/componentes/ofertas/FiltroDatas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";

export const metadata = { title: "Comparar grupos" };

const n0 = (v: number | null) => (v === null ? "Sem dados" : formatarNumero(v, 0));

export default async function PaginaCompararGrupos({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string | string[]; periodo?: string; de?: string; ate?: string }>;
}) {
  await exigirLeitura("ofertas");
  const sp = await searchParams;
  const ids = (Array.isArray(sp.ids) ? sp.ids : sp.ids ? sp.ids.split(",") : []).slice(0, 12);
  const atual = lerPeriodo(sp.periodo);
  const { inicio, fim } = intervaloPersonalizado(sp.de, sp.ate) ?? intervaloDoPeriodo(atual);
  const todos = await listarGruposResumo();
  const grupos = todos.filter((g) => ids.includes(g.id));
  const linhas = await Promise.all(
    grupos.map(async (g) => {
      const d = await dadosGrupo(g.id, g.numero_coletor_id, inicio, fim);
      return {
        g,
        d,
        m: metricasGrupo({
          inicio,
          fim,
          medicoes: d.medicoes,
          eventos: d.eventos,
          lacunas: d.lacunas,
          coletaIniciadaEm: g.coleta_iniciada_em,
        }),
      };
    }),
  );
  const base = `/ofertas/grupos/comparar?${ids.map((i) => `ids=${i}`).join("&")}`;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            Comparar grupos
          </h1>
          <p className="mt-1 text-sm text-texto-2">
            Mesmo período e mesmas fórmulas para todos. Linha marcada como parcial teve lacuna de
            coleta.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SeletorPeriodo atual={atual} base={base} />
          <FiltroDatas acao="/ofertas/grupos/comparar" de={sp.de} ate={sp.ate} manter={{ ids }} />
        </div>
      </div>
      {linhas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum grupo escolhido"
          descricao="Marque os grupos na lista de Grupos e clique em Comparar."
          acao={
            <Link href="/ofertas/grupos" className="text-sm text-acao hover:underline">
              Ir para Grupos
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Grupo</TableHead>
                <TableHead className="text-right">Início</TableHead>
                <TableHead className="text-right">Fim</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Saídas</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Evasão</TableHead>
                <TableHead className="text-right">Mensagens</TableHead>
                <TableHead>Coleta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map(({ g, d, m }) => (
                <TableRow key={g.id}>
                  <TableCell className="pl-5 font-medium">
                    <Link href={`/ofertas/grupos/${g.id}`} className="hover:text-acao">
                      {g.nome}
                    </Link>
                  </TableCell>
                  <TableCell className="numeros text-right">{n0(m.membrosInicio)}</TableCell>
                  <TableCell className="numeros text-right">{n0(m.membrosFim)}</TableCell>
                  <TableCell className="numeros text-right">{n0(m.entradas)}</TableCell>
                  <TableCell className="numeros text-right">{n0(m.saidas)}</TableCell>
                  <TableCell className="numeros text-right">{n0(m.saldo)}</TableCell>
                  <TableCell className="numeros text-right">
                    {m.evasao === null ? "Sem dados" : `${formatarNumero(m.evasao, 2)} %`}
                  </TableCell>
                  <TableCell className="numeros text-right">{n0(d.enviados)}</TableCell>
                  <TableCell className="text-xs text-texto-2">
                    {g.cadastro === "manual" ? "Sem coleta" : m.parcial ? "Parcial" : "Completa"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
