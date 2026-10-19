import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { enviosManuaisPendentes } from "@/dados/ofertas/ofertas";
import { formatarDataHora } from "@/lib/formatos/data";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Banner } from "@/componentes/painel/Banner";
import { Button } from "@/componentes/ui/button";
import { CartaoPublicar } from "@/componentes/ofertas/CartaoPublicar";
import { PrepararPendentes } from "@/componentes/ofertas/PrepararPendentes";

export const metadata = { title: "Publicar" };

export default async function PaginaPublicar() {
  const usuario = await exigirLeitura("ofertas");
  const envios = await enviosManuaisPendentes(24);
  const devidos = envios.filter((e) => e.devido);
  const proximos = envios.filter((e) => !e.devido);
  const escreve = podeEscrever(usuario.papel, "ofertas");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Publicar</h1>
          <p className="mt-1 max-w-3xl text-sm text-texto-2">
            Modo assistido: cada cartão é uma mensagem pronta, com o link de afiliado do grupo.
            Copie o texto, publique no grupo e marque como publicado. Nada é enviado sem você.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/ofertas/gerar">Gerar oferta</Link>
        </Button>
      </div>
      {escreve && <PrepararPendentes />}
      {devidos.length === 0 && proximos.length === 0 ? (
        <EstadoVazio
          titulo="Nada para publicar agora"
          descricao="Gere uma oferta e escolha os grupos. Os envios manuais aparecem aqui no horário escolhido."
        />
      ) : (
        <>
          {devidos.length > 0 && (
            <section className="space-y-3" aria-label="Para publicar agora">
              <h2 className="text-base font-semibold">Para publicar agora ({devidos.length})</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {devidos.map((e) => (
                  <CartaoPublicar
                    key={e.id}
                    envioId={e.id}
                    grupo={e.grupo.nome}
                    linkConvite={e.grupo.link_convite}
                    texto={e.texto_final ?? ""}
                    imagem={e.imagem}
                    titulo={e.oferta?.titulo ?? e.cupom?.codigo ?? "Oferta"}
                    podeMarcar={escreve}
                  />
                ))}
              </div>
            </section>
          )}
          {proximos.length > 0 && (
            <section className="space-y-3" aria-label="Programados">
              <h2 className="text-base font-semibold">
                Programados nas próximas 24 horas ({proximos.length})
              </h2>
              <ul className="divide-y divide-borda overflow-hidden rounded-2xl bg-card text-sm shadow-painel">
                {proximos.map((e) => (
                  <li key={e.id} className="flex flex-wrap justify-between gap-2 px-5 py-3">
                    <span>
                      {e.oferta?.titulo ?? (e.cupom ? `Cupom ${e.cupom.codigo ?? ""}` : "Oferta")}{" "}
                      em {e.grupo.nome}
                    </span>
                    <span className="numeros text-texto-2">
                      {formatarDataHora(e.agendado_para)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <Banner tipo="info" titulo="Sobre o envio automático">
        Para o sistema postar sozinho, conecte um número dedicado em Números de WhatsApp. A conexão
        por QR Code não é oficial e pode levar ao bloqueio do número; o modo assistido continua
        disponível sempre.
      </Banner>
    </div>
  );
}
