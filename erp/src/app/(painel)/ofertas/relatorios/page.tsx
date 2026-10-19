import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import {
  relatorioCliques,
  relatorioConversoes,
  relatorioEnvios,
  ultimasImportacoes,
} from "@/dados/ofertas/relatorios";
import { listarGrupos } from "@/dados/ofertas/cadastros";
import { listarFilas } from "@/dados/ofertas/filas";
import { listarNumeros } from "@/dados/ofertas/whatsapp";
import { listarIntegracoes } from "@/dados/ofertas/integracoes";
import { lerPlataforma, PLATAFORMAS, PLATAFORMA_ROTULO } from "@/dominio/ofertas/plataformas";
import { formatarDataHora } from "@/lib/formatos/data";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { formatarNumero } from "@/lib/formatos/numero";
import { intervaloDoPeriodo, intervaloPersonalizado } from "@/lib/formatos/periodo";
import { SeletorPeriodo, lerPeriodo } from "@/componentes/painel/SeletorPeriodo";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import { ImportarApi, ImportarCsv } from "@/componentes/ofertas/Relatorios";

export const metadata = { title: "Relatórios de ofertas" };

type Busca = {
  periodo?: string;
  de?: string;
  ate?: string;
  grupo?: string;
  plataforma?: string;
  fila?: string;
  numero?: string;
  campanha?: string;
};
const n0 = (v: number | null | undefined) => formatarNumero(Number(v ?? 0), 0);
const uuid = (v?: string) => (v && /^[0-9a-f-]{36}$/.test(v) ? v : null);

export default async function PaginaRelatorios({ searchParams }: { searchParams: Promise<Busca> }) {
  const usuario = await exigirLeitura("ofertas");
  const sp = await searchParams;
  const atual = lerPeriodo(sp.periodo);
  const { inicio, fim } = intervaloPersonalizado(sp.de, sp.ate) ?? intervaloDoPeriodo(atual);
  const filtros = {
    inicio,
    fim,
    grupo: uuid(sp.grupo),
    plataforma: lerPlataforma(sp.plataforma),
    fila: uuid(sp.fila),
    numero: uuid(sp.numero),
    campanha: sp.campanha?.trim().slice(0, 60) || null,
  };
  const [envios, conversoes, cliques, importacoes, grupos, filas, numeros, integracoes] =
    await Promise.all([
      relatorioEnvios(filtros),
      relatorioConversoes(filtros),
      relatorioCliques(filtros),
      ultimasImportacoes(),
      listarGrupos({}),
      listarFilas(),
      listarNumeros(true),
      listarIntegracoes(),
    ]);
  const escreve = podeEscrever(usuario.papel, "ofertas");
  const consulta = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => !!v) as [string, string][],
  ).toString();
  const totalEnviados = envios.reduce((s, e) => s + Number(e.enviados), 0);
  const totalCliques = cliques.reduce((s, c) => s + Number(c.cliques), 0);
  const totalComissao = conversoes.reduce((s, c) => s + Number(c.comissao ?? 0), 0);
  const conectada = (p: string) =>
    integracoes.some((i) => i.plataforma === p && i.status === "conectada");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            Relatórios de ofertas
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-texto-2">
            Três números separados: mensagens que o sistema publicou, cliques e vendas que as
            plataformas reportaram. Clique não é venda, e nada aqui é estimado: sem relatório
            importado, aparece como não disponível.
          </p>
        </div>
        <SeletorPeriodo
          atual={atual}
          base={`/ofertas/relatorios${consulta ? `?${consulta.replace(/(^|&)periodo=[^&]*/g, "")}` : ""}`}
        />
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-2 rounded-2xl bg-card p-4 shadow-painel"
        aria-label="Filtros"
      >
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-texto-3">De</span>
          <Input type="date" name="de" defaultValue={sp.de} className="h-8 w-auto" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-texto-3">Até</span>
          <Input type="date" name="ate" defaultValue={sp.ate} className="h-8 w-auto" />
        </label>
        {[
          { nome: "grupo", rotulo: "Grupo", opcoes: grupos.map((g) => [g.id, g.nome]) },
          {
            nome: "plataforma",
            rotulo: "Plataforma",
            opcoes: PLATAFORMAS.map((p) => [p, PLATAFORMA_ROTULO[p]]),
          },
          { nome: "fila", rotulo: "Fila", opcoes: filas.map((f) => [f.id, f.nome]) },
          { nome: "numero", rotulo: "Número", opcoes: numeros.map((n) => [n.id, n.rotulo]) },
        ].map((f) => (
          <label key={f.nome} className="flex flex-col gap-1 text-xs">
            <span className="text-texto-3">{f.rotulo}</span>
            <SelectNativo
              name={f.nome}
              defaultValue={(sp as Record<string, string | undefined>)[f.nome] ?? ""}
              className="h-8 w-auto max-w-48"
            >
              <option value="">Todos</option>
              {f.opcoes.map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </SelectNativo>
          </label>
        ))}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-texto-3">Campanha</span>
          <Input name="campanha" defaultValue={sp.campanha} className="h-8 w-40" />
        </label>
        <Button type="submit" size="sm" variant="outline">
          Filtrar
        </Button>
      </form>

      <section className="space-y-2" aria-label="Mensagens publicadas pelo sistema">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">
            Mensagens publicadas pelo sistema ({n0(totalEnviados)})
          </h2>
          <Button asChild size="sm" variant="outline">
            <a href={`/ofertas/relatorios/exportar?tipo=envios&${consulta}`}>CSV</a>
          </Button>
        </div>
        {envios.length === 0 ? (
          <EstadoVazio titulo="Nenhum envio no período" />
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Grupo</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Fila</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead className="text-right">Enviados</TableHead>
                  <TableHead className="text-right">Falhas</TableHead>
                  <TableHead className="text-right">Incertos</TableHead>
                  <TableHead className="text-right">Ignorados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envios.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-5">{e.grupo}</TableCell>
                    <TableCell>
                      {PLATAFORMA_ROTULO[lerPlataforma(e.plataforma)!] ?? e.plataforma}
                    </TableCell>
                    <TableCell>
                      {e.fila ?? (e.modo === "manual" ? "Avulsa (manual)" : "Avulsa")}
                    </TableCell>
                    <TableCell>{e.numero ?? "Manual"}</TableCell>
                    <TableCell className="numeros text-right">{n0(e.enviados)}</TableCell>
                    <TableCell className="numeros text-right">{n0(e.falhas)}</TableCell>
                    <TableCell className="numeros text-right">{n0(e.incertos)}</TableCell>
                    <TableCell className="numeros text-right">{n0(e.ignorados)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-2" aria-label="Cliques reportados">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">
            Cliques reportados pelas plataformas (
            {cliques.length ? n0(totalCliques) : "não disponível"})
          </h2>
          <Button asChild size="sm" variant="outline">
            <a href={`/ofertas/relatorios/exportar?tipo=cliques&${consulta}`}>CSV</a>
          </Button>
        </div>
        {cliques.length === 0 ? (
          <EstadoVazio
            titulo="Cliques não disponíveis no período"
            descricao="Importe o relatório de cliques do portal de afiliado. O sistema não mede cliques: não há redirecionador próprio."
          />
        ) : (
          <ul className="divide-y divide-borda overflow-hidden rounded-2xl bg-card text-sm shadow-painel">
            {cliques.map((c, i) => (
              <li key={i} className="flex justify-between px-5 py-2">
                <span>
                  {c.grupo ?? "Sem grupo identificado"} ·{" "}
                  {PLATAFORMA_ROTULO[lerPlataforma(c.plataforma)!] ?? c.plataforma}
                </span>
                <span className="numeros">{n0(c.cliques)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2" aria-label="Conversões e comissões reportadas">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">
            Vendas e comissões reportadas (
            {conversoes.length ? formatarMoeda(totalComissao) : "não disponível"})
          </h2>
          <Button asChild size="sm" variant="outline">
            <a href={`/ofertas/relatorios/exportar?tipo=conversoes&${consulta}`}>CSV</a>
          </Button>
        </div>
        {conversoes.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma conversão importada no período"
            descricao="Importe pela API (Awin, Shopee) ou pelo arquivo do portal (Mercado Livre, Amazon)."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Grupo</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversoes.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-5">{c.grupo ?? "Sem grupo identificado"}</TableCell>
                    <TableCell>
                      {PLATAFORMA_ROTULO[lerPlataforma(c.plataforma)!] ?? c.plataforma}
                    </TableCell>
                    <TableCell>{c.status}</TableCell>
                    <TableCell className="numeros text-right">{n0(c.pedidos)}</TableCell>
                    <TableCell className="numeros text-right">
                      {c.venda === null ? "não informado" : formatarMoeda(c.venda)}
                    </TableCell>
                    <TableCell className="numeros text-right">
                      {c.comissao === null ? "não informado" : formatarMoeda(c.comissao)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-texto-3">
          Origem dos dados:{" "}
          {importacoes.length
            ? importacoes
                .map(
                  (i) =>
                    `${PLATAFORMA_ROTULO[lerPlataforma(i.plataforma)!] ?? i.plataforma} (${i.tipo === "cliques" ? "cliques" : "conversões"}, ${i.origem === "api" ? "API" : "arquivo"}) em ${formatarDataHora(i.importado_em)}`,
                )
                .join("; ")
            : "nenhuma importação ainda"}
          .
        </p>
      </section>

      {escreve && (
        <section
          className="space-y-4 rounded-2xl bg-card p-5 shadow-painel"
          aria-label="Importar relatórios"
        >
          <h2 className="text-base font-semibold">Importar relatórios das plataformas</h2>
          <ImportarApi awin={conectada("awin")} shopee={conectada("shopee")} />
          <ImportarCsv />
        </section>
      )}
    </div>
  );
}
