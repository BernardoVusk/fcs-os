import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeLer } from "@/lib/auth/papeis";
import { resumoPainelOfertas } from "@/dados/ofertas/painel";
import { PLATAFORMA_ROTULO, STATUS_INTEGRACAO_ROTULO } from "@/dominio/ofertas/plataformas";
import { CartaoIndicador } from "@/componentes/painel/CartaoIndicador";
import { Selo } from "@/componentes/ofertas/Selo";

export const metadata = { title: "Painel de ofertas" };

export default async function PaginaPainelOfertas() {
  const usuario = await exigirLeitura("ofertas");
  const resumo = await resumoPainelOfertas();
  const comErro = resumo.integracoes.filter(
    (i) => i.status === "erro" || i.status === "credencial_expirada",
  );
  const veCredenciais = podeLer(usuario.papel, "usuarios");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
          Painel de ofertas
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-texto-2">
          Operação dos grupos de ofertas: integrações de afiliado, publicações, filas, números de
          WhatsApp e cupons. Números vêm só de dado registrado; o que a integração não fornece
          aparece como indisponível.
        </p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
        <CartaoIndicador
          rotulo="Alertas do módulo"
          valor={String(resumo.alertasAbertos)}
          link={{ href: "/alertas", rotulo: "Abrir alertas" }}
        />
        <CartaoIndicador
          rotulo="Integrações com erro"
          valor={String(comErro.length)}
          link={
            veCredenciais ? { href: "/ofertas/integracoes", rotulo: "Ver integrações" } : undefined
          }
        />
      </div>
      <section className="rounded-2xl bg-card p-5 shadow-painel" aria-label="Integrações">
        <h2 className="mb-3 text-base font-semibold">Integrações de afiliados</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {resumo.integracoes.map((i) => (
            <li key={i.plataforma} className="flex items-center justify-between gap-2 text-sm">
              <span>{PLATAFORMA_ROTULO[i.plataforma]}</span>
              <Selo
                tom={
                  i.status === "conectada"
                    ? "sucesso"
                    : i.status === "indisponivel"
                      ? "info"
                      : i.status === "nao_configurada"
                        ? "neutro"
                        : "erro"
                }
              >
                {STATUS_INTEGRACAO_ROTULO[i.status]}
              </Selo>
            </li>
          ))}
        </ul>
        {veCredenciais && (
          <Link
            href="/ofertas/integracoes"
            className="mt-4 inline-block text-sm font-medium text-acao hover:underline"
          >
            Configurar integrações
          </Link>
        )}
      </section>
    </div>
  );
}
