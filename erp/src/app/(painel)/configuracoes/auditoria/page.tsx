import { exigirLeitura } from "@/lib/auth/sessao";
import { listarAuditoria, opcoesAuditoria } from "@/dados/auditoria";
import { formatarDataHora } from "@/lib/formatos/data";
import { Banner } from "@/componentes/painel/Banner";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";

export const metadata = { title: "Auditoria" };

const ACAO: Record<string, string> = { insert: "criou", update: "alterou", delete: "apagou" };

export default async function PaginaAuditoria({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const usuario = await exigirLeitura("configuracoes");
  const sp = await searchParams;
  if (usuario.papel !== "dono")
    return (
      <div className="space-y-5">
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Auditoria</h1>
        <Banner tipo="info" titulo="Só o dono consulta a auditoria" />
      </div>
    );
  const acao =
    sp.acao === "insert" || sp.acao === "update" || sp.acao === "delete" ? sp.acao : undefined;
  const data = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const inicio = data(sp.inicio);
  const fim = data(sp.fim);
  const [linhas, opcoes] = await Promise.all([
    listarAuditoria({
      tabela: sp.tabela && /^[a-z_]{1,60}$/.test(sp.tabela) ? sp.tabela : undefined,
      acao,
      origem: sp.origem && /^[a-z_]{1,30}$/.test(sp.origem) ? sp.origem : undefined,
      registro: sp.registro?.trim() || undefined,
      inicio: inicio ? `${inicio}T00:00:00-03:00` : undefined,
      fim: fim ? `${fim}T23:59:59-03:00` : undefined,
      limite: 300,
    }),
    opcoesAuditoria(),
  ]);
  const campo = "h-9 rounded-lg border border-input bg-transparent px-2 text-sm";
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Auditoria</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          Quem mudou o quê, quando e por onde (tela, MCP, script ou importação). Últimos 300
          registros do filtro.
        </p>
      </div>
      <form
        method="get"
        action="/configuracoes/auditoria"
        className="flex flex-wrap items-end gap-2"
      >
        <select name="tabela" defaultValue={sp.tabela ?? ""} aria-label="Tabela" className={campo}>
          <option value="">Todas as tabelas</option>
          {opcoes.tabelas.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select name="acao" defaultValue={acao ?? ""} aria-label="Ação" className={campo}>
          <option value="">Todas as ações</option>
          <option value="insert">criou</option>
          <option value="update">alterou</option>
          <option value="delete">apagou</option>
        </select>
        <select name="origem" defaultValue={sp.origem ?? ""} aria-label="Origem" className={campo}>
          <option value="">Todas as origens</option>
          {opcoes.origens.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <input
          name="registro"
          defaultValue={sp.registro ?? ""}
          placeholder="Id do registro"
          aria-label="Id do registro"
          className={`${campo} w-72 font-mono text-xs`}
        />
        <input
          type="date"
          name="inicio"
          defaultValue={inicio ?? ""}
          aria-label="De"
          className={campo}
        />
        <input type="date" name="fim" defaultValue={fim ?? ""} aria-label="Até" className={campo} />
        <Button type="submit" variant="outline" size="sm">
          Filtrar
        </Button>
      </form>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
              <TableHead className="pl-5">Quando</TableHead>
              <TableHead>Quem</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Tabela</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead>Campos</TableHead>
              <TableHead>Origem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-texto-3">
                  Nada registrado para esse filtro.
                </TableCell>
              </TableRow>
            )}
            {linhas.map((l) => (
              <TableRow key={l.id} className="h-10">
                <TableCell className="numeros pl-5 text-xs">{formatarDataHora(l.em)}</TableCell>
                <TableCell className="text-sm">
                  {l.usuario_nome ?? <span className="text-texto-3">sistema</span>}
                </TableCell>
                <TableCell className="text-sm">{ACAO[l.acao] ?? l.acao}</TableCell>
                <TableCell className="font-mono text-xs">{l.tabela}</TableCell>
                <TableCell className="font-mono text-xs text-texto-2" title={l.registro_id}>
                  {l.registro_id.slice(0, 8)}
                </TableCell>
                <TableCell className="max-w-md">
                  <div className="flex flex-wrap gap-1">
                    {l.campos.slice(0, 8).map((c) => (
                      <Badge key={c} variant="outline" className="font-mono text-[11px]">
                        {c}
                      </Badge>
                    ))}
                    {l.campos.length > 8 && (
                      <span className="text-xs text-texto-3">+{l.campos.length - 8}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{l.origem}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
