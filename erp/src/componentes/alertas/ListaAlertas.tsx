"use client";

import Link from "next/link";
import { reativarAlerta, resolverAlerta, silenciarAlerta } from "@/acoes/alertas";
import type { Alerta } from "@/dados/alertas";
import { formatarDataHora } from "@/lib/formatos/data";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { cn } from "@/lib/utils";

const SEVERIDADE: Record<string, { rotulo: string; classe: string }> = {
  critico: { rotulo: "Crítico", classe: "border-erro/50 text-erro" },
  atencao: { rotulo: "Atenção", classe: "border-alerta/50 text-alerta" },
  info: { rotulo: "Info", classe: "border-acao/50 text-acao" },
};

export function ListaAlertas({
  alertas,
  rotulos,
  rotas,
  filtro,
  editar,
}: {
  alertas: Alerta[];
  rotulos: Record<string, string>;
  rotas: Record<string, string | null>;
  filtro: "abertos" | "silenciados" | "resolvidos";
  editar: boolean;
}) {
  if (alertas.length === 0)
    return (
      <EstadoVazio
        titulo={
          filtro === "abertos"
            ? "Nenhum alerta aberto"
            : filtro === "silenciados"
              ? "Nada silenciado"
              : "Nenhum alerta resolvido"
        }
        descricao={
          filtro === "abertos"
            ? "Estoque, prazos, ordens, pedidos e manutenção estão em dia, ou a verificação ainda não rodou hoje."
            : undefined
        }
      />
    );
  return (
    <ul className="divide-y divide-borda rounded-2xl bg-card shadow-painel">
      {alertas.map((a) => {
        const sev = SEVERIDADE[a.severidade] ?? SEVERIDADE.info;
        const rota = rotas[a.id];
        return (
          <li
            key={a.id}
            className={cn(
              "flex flex-wrap items-start gap-3 px-5 py-3",
              a.resolvido_em && "opacity-70",
            )}
          >
            <Badge variant="outline" className={cn("mt-0.5 shrink-0", sev.classe)}>
              {sev.rotulo}
            </Badge>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{a.titulo}</p>
              {a.descricao && <p className="mt-0.5 text-sm text-texto-2">{a.descricao}</p>}
              <p className="numeros mt-1 text-xs text-texto-3">
                {rotulos[a.tipo] ?? a.tipo} · {formatarDataHora(a.criado_em)}
                {a.resolvido_em && ` · resolvido ${formatarDataHora(a.resolvido_em)}`}
                {!a.resolvido_em &&
                  a.silenciado_ate &&
                  new Date(a.silenciado_ate) > new Date() &&
                  ` · silenciado até ${formatarDataHora(a.silenciado_ate)}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {rota && (
                <Button asChild variant="secondary" size="sm">
                  <Link href={rota}>Abrir</Link>
                </Button>
              )}
              {editar && !a.resolvido_em && filtro === "abertos" && (
                <>
                  <BotaoAcao acao={() => silenciarAlerta(a.id, 7)}>7 dias</BotaoAcao>
                  <BotaoAcao acao={() => silenciarAlerta(a.id, 30)}>30 dias</BotaoAcao>
                  <BotaoAcao variant="outline" acao={() => resolverAlerta(a.id)}>
                    Resolver
                  </BotaoAcao>
                </>
              )}
              {editar && !a.resolvido_em && filtro === "silenciados" && (
                <>
                  <BotaoAcao acao={() => reativarAlerta(a.id)}>Reativar</BotaoAcao>
                  <BotaoAcao variant="outline" acao={() => resolverAlerta(a.id)}>
                    Resolver
                  </BotaoAcao>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
