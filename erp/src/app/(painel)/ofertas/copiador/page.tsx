import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarAutomacoes } from "@/dados/ofertas/copiador";
import { listarGrupos } from "@/dados/ofertas/cadastros";
import { listarNumeros } from "@/dados/ofertas/whatsapp";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Banner } from "@/componentes/painel/Banner";
import { Selo } from "@/componentes/ofertas/Selo";
import { FormAutomacao } from "@/componentes/ofertas/Copiador";
import { STATUS_AUTOMACAO } from "@/dominio/ofertas/copiador";

export const metadata = { title: "Copiador" };

export default async function PaginaCopiador({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const usuario = await exigirLeitura("ofertas");
  const { status } = await searchParams;
  const [automacoes, origens, numeros] = await Promise.all([
    listarAutomacoes(status && status in STATUS_AUTOMACAO ? status : undefined),
    listarGrupos({ funcao: "origem", ativos: true }),
    listarNumeros(),
  ]);
  const escreve = podeEscrever(usuario.papel, "ofertas");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Copiador</h1>
          <p className="mt-1 max-w-3xl text-sm text-texto-2">
            Acompanha um grupo de origem que a empresa tem autorização para usar e repassa as
            ofertas para os nossos grupos, com o nosso link de afiliado. Só grupos marcados como
            origem autorizada pelo dono aparecem aqui.
          </p>
        </div>
        {escreve && origens.length > 0 && (
          <DialogoNovo rotulo="Nova automação" titulo="Nova automação do copiador">
            <FormAutomacao
              origens={origens.map((o) => ({ id: o.id, nome: o.nome }))}
              numeros={numeros.map((n) => ({ id: n.id, rotulo: n.rotulo }))}
            />
          </DialogoNovo>
        )}
      </div>
      {origens.length === 0 && (
        <Banner tipo="info" titulo="Nenhum grupo de origem autorizado">
          O copiador lê mensagens pelo número conectado. Conecte um número, sincronize os grupos e
          peça ao dono para marcar o grupo de terceiro como origem autorizada em Grupos, registrando
          a autorização.
        </Banner>
      )}
      {automacoes.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma automação"
          descricao="Crie uma automação em prévia, confira o que ela faria e só então ative."
        />
      ) : (
        <ul className="divide-y divide-borda overflow-hidden rounded-2xl bg-card shadow-painel">
          {automacoes.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1 basis-64">
                <Link href={`/ofertas/copiador/${a.id}`} className="font-medium hover:text-acao">
                  {a.nome}
                </Link>
                <p className="text-xs text-texto-3">
                  Origem {a.origem?.nome ?? "removida"} ·{" "}
                  {a.numero ? `envia por ${a.numero.rotulo}` : "manual"} ·{" "}
                  {a.revisao_manual ? "com revisão" : "publica direto"}
                </p>
              </div>
              <Selo
                tom={
                  a.status === "ativa"
                    ? "sucesso"
                    : a.status === "erro"
                      ? "erro"
                      : a.status === "pausada"
                        ? "alerta"
                        : "neutro"
                }
              >
                {STATUS_AUTOMACAO[a.status]}
              </Selo>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
