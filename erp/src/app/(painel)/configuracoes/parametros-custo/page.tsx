import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import {
  listarComponentes,
  listarVersoesParametros,
  obterParametrosVigentes,
} from "@/dados/custos/parametros";
import {
  CHAVES_PARAMETROS,
  METODO_FIXO_ROTULO,
  PARAMETRO_ROTULO,
  PARAMETROS_PERCENTUAIS,
  parametrosFaltantes,
  type ParametrosCusto,
} from "@/dominio/custos/parametros";
import { formatarNumero } from "@/lib/formatos/numero";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { formatarData, formatarDataHora } from "@/lib/formatos/data";
import { FormParametros } from "@/componentes/custos/FormParametros";
import { TabelaComponentes } from "@/componentes/custos/TabelaComponentes";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { Banner } from "@/componentes/painel/Banner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";

export const metadata = { title: "Parâmetros de custo" };

function valor(chave: keyof ParametrosCusto, p: ParametrosCusto): string {
  const v = p[chave];
  if (v == null) return "Não configurado";
  if (chave === "metodo_rateio_fixo")
    return METODO_FIXO_ROTULO[v as keyof typeof METODO_FIXO_ROTULO];
  if (chave === "metodo_margem_padrao")
    return v === "margem" ? "Margem sobre o preço" : "Markup sobre o custo";
  if (PARAMETROS_PERCENTUAIS.includes(chave)) return formatarPercentual(v as number, 2);
  if (chave === "horas_produtivas_mes") return `${formatarNumero(v as number, 1)} h`;
  if (chave === "volume_mensal_estimado") return `${formatarNumero(v as number, 0)} peças`;
  if (chave === "tarifa_kwh") return `R$ ${formatarNumero(v as number, 4)}/kWh`;
  if (chave === "custo_hora_mao_obra") return `${formatarMoeda(v as number)}/h`;
  return formatarMoeda(v as number);
}

export default async function PaginaParametrosCusto() {
  const usuario = await exigirLeitura("configuracoes");
  const [vigente, versoes, componentes] = await Promise.all([
    obterParametrosVigentes(),
    listarVersoesParametros(),
    listarComponentes(),
  ]);
  const editar = podeEscrever(usuario.papel, "configuracoes");
  const faltam = vigente ? parametrosFaltantes(vigente.dados) : CHAVES_PARAMETROS.slice(0, 3);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            Parâmetros de custo
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Valores globais do motor de custos. Editar cria uma versão nova com data de vigência;
            cálculos salvos continuam apontando para a versão que usaram.
          </p>
        </div>
        {editar && (
          <DialogoNovo rotulo="Nova versão" titulo="Nova versão dos parâmetros">
            <FormParametros base={vigente?.dados ?? null} />
          </DialogoNovo>
        )}
      </div>
      {faltam.length > 0 && (
        <Banner tipo="alerta" titulo="A calculadora ainda não funciona">
          Faltam: {faltam.map((k) => PARAMETRO_ROTULO[k]).join(", ")}. Nenhum valor é assumido.
        </Banner>
      )}
      <section className="rounded-2xl bg-card p-5 shadow-painel">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">
            Versão vigente{vigente ? ` ${vigente.versao}` : ""}
          </h2>
          {vigente && (
            <span className="text-xs text-texto-3">
              desde {formatarData(vigente.vigente_desde)}
            </span>
          )}
        </div>
        {!vigente ? (
          <p className="mt-3 text-sm text-texto-2">Nenhuma versão vigente.</p>
        ) : (
          <dl className="numeros mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {CHAVES_PARAMETROS.map((k) => (
              <div key={k} className="flex flex-col border-t border-borda pt-2">
                <dt className="text-[13px] text-texto-2">{PARAMETRO_ROTULO[k]}</dt>
                <dd className={vigente.dados[k] == null ? "text-texto-3" : "font-medium"}>
                  {valor(k, vigente.dados)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Componentes do custo</h2>
        <p className="text-sm text-texto-2">
          Desligar um componente faz ele entrar como zero nos próximos cálculos. Os salvos não
          mudam.
        </p>
        <TabelaComponentes componentes={componentes} editar={editar} />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Histórico de versões</h2>
        <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
          <Table>
            <TableHeader>
              <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                <TableHead className="pl-5">Versão</TableHead>
                <TableHead>Vigente desde</TableHead>
                <TableHead>Registrada em</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versoes.map((v) => (
                <TableRow
                  key={v.id}
                  className={
                    v.versao === vigente?.versao
                      ? "bg-acao-suave/60 hover:bg-acao-suave/60"
                      : undefined
                  }
                >
                  <TableCell className="numeros pl-5 font-medium">{v.versao}</TableCell>
                  <TableCell className="numeros">{formatarData(v.vigente_desde)}</TableCell>
                  <TableCell className="numeros">{formatarDataHora(v.criado_em)}</TableCell>
                  <TableCell className="text-texto-2">
                    {v.observacoes || "Sem observações"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
