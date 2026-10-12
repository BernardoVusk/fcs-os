import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import {
  listarAlertas,
  rotaDaEntidade,
  TIPO_ALERTA_ROTULO,
  tiposDeAlerta,
  type FiltroAlertas,
} from "@/dados/alertas";
import { gerarAlertasAgora } from "@/acoes/alertas";
import { ListaAlertas } from "@/componentes/alertas/ListaAlertas";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { cn } from "@/lib/utils";

export const metadata = { title: "Alertas" };

const FILTROS: { chave: FiltroAlertas; rotulo: string }[] = [
  { chave: "abertos", rotulo: "Abertos" },
  { chave: "silenciados", rotulo: "Silenciados" },
  { chave: "resolvidos", rotulo: "Resolvidos" },
];

export default async function PaginaAlertas({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; tipo?: string }>;
}) {
  const usuario = await exigirLeitura("alertas");
  const sp = await searchParams;
  const filtro: FiltroAlertas = FILTROS.some((f) => f.chave === sp.filtro)
    ? (sp.filtro as FiltroAlertas)
    : "abertos";
  const tipo = sp.tipo && /^[a-z_]{2,40}$/.test(sp.tipo) ? sp.tipo : undefined;
  const [alertas, tipos] = await Promise.all([listarAlertas(filtro, tipo), tiposDeAlerta()]);
  const editar = podeEscrever(usuario.papel, "alertas");
  const rotas = Object.fromEntries(alertas.map((a) => [a.id, rotaDaEntidade(a)]));
  const pilula = (ativo: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
      ativo ? "bg-card font-medium text-texto shadow-painel" : "text-texto-2 hover:text-texto",
    );
  const link = (f: FiltroAlertas, t?: string) => `/alertas?filtro=${f}${t ? `&tipo=${t}` : ""}`;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Alertas</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Estoque abaixo do mínimo, prazos vencidos, ordens atrasadas, pedidos pagos sem envio,
            lançamentos vencidos e manutenção prevista. A verificação roda todo dia às 9h; resolver
            fecha o alerta, silenciar esconde por um tempo.
          </p>
        </div>
        {editar && (
          <BotaoAcao variant="secondary" acao={gerarAlertasAgora}>
            Verificar agora
          </BotaoAcao>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Situação" className="inline-flex gap-0.5 rounded-full bg-superficie-2 p-1">
          {FILTROS.map((f) => (
            <Link
              key={f.chave}
              href={link(f.chave, tipo)}
              className={pilula(filtro === f.chave)}
              aria-current={filtro === f.chave ? "page" : undefined}
            >
              {f.rotulo}
            </Link>
          ))}
        </nav>
        {tipos.length > 0 && (
          <nav
            aria-label="Tipo"
            className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-superficie-2 p-1"
          >
            <Link href={link(filtro)} className={pilula(!tipo)}>
              Todos
            </Link>
            {tipos.map((t) => (
              <Link key={t.tipo} href={link(filtro, t.tipo)} className={pilula(tipo === t.tipo)}>
                {TIPO_ALERTA_ROTULO[t.tipo] ?? t.tipo}{" "}
                <span className="numeros text-xs text-texto-3">{t.total}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>
      <ListaAlertas
        alertas={alertas}
        rotulos={TIPO_ALERTA_ROTULO}
        rotas={rotas}
        filtro={filtro}
        editar={editar}
      />
    </div>
  );
}
