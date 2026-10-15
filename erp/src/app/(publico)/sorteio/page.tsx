import type { Metadata } from "next";
import Image from "next/image";
import { listarProdutosSorteio } from "@/dados/publico/sorteio";
import { origemSorteio } from "@/dominio/sorteio/inscricao";
import { FOTOS_SORTEIO } from "@/componentes/sorteio/fotos";
import { FormSorteio } from "@/componentes/sorteio/FormSorteio";
import { Marquee } from "@/componentes/sorteio/Marquee";

// Sem cookies lidos, o Next pré-renderizaria a lista de produtos no build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Sorteio FCS 3D STUDIO" },
  description:
    "Comprou uma peça impressa em 3D da FCS 3D STUDIO? Cadastre seu pedido e concorra todo mês a um produto do nosso catálogo.",
  robots: { index: true, follow: true },
};

const CHANFRO =
  "[clip-path:polygon(14px_0,100%_0,100%_calc(100%-14px),calc(100%-14px)_100%,0_100%,0_14px)]";

const CARDS = [
  {
    titulo: "Impressão sob demanda",
    texto: "Cada peça sai da impressora depois do pedido. Nada de estoque parado.",
  },
  {
    titulo: "Games, miniaturas, F1 e carros",
    texto: "É o que a gente mais imprime: decoração, suporte, chaveiro e peça de coleção.",
  },
  {
    titulo: "Encomenda pelo WhatsApp",
    texto: "Tem um modelo ou uma ideia? Manda pra gente: a gente orça, imprime e envia.",
  },
];

const REGULAMENTO = [
  "Participa quem comprou na Shopee, no Mercado Livre ou no TikTok Shop e se cadastrou nesta página.",
  "Cada pedido vale uma inscrição. O mesmo pedido cadastrado duas vezes conta uma vez.",
  "O sorteio acontece no último dia útil de cada mês, entre as inscrições feitas naquele mês.",
  "O prêmio é um produto do nosso catálogo, à escolha do ganhador, com frete por nossa conta.",
  "O ganhador é avisado por WhatsApp e e-mail e tem 7 dias para responder. Sem resposta, sorteamos de novo.",
  "Seus dados ficam com a FCS 3D STUDIO, não são repassados e você pode pedir a remoção a qualquer momento pelo WhatsApp.",
];

export default async function PaginaSorteio({
  searchParams,
}: {
  searchParams: Promise<{ via?: string }>;
}) {
  const { via } = await searchParams;
  const produtos = await listarProdutosSorteio();
  const whatsappUrl = process.env.SORTEIO_WHATSAPP_URL ?? "";

  return (
    <main className="min-h-dvh bg-[#0A0A0A] text-white">
      <div className="mx-auto flex max-w-xl flex-col gap-12 px-4 pt-6 pb-16 sm:px-6">
        <header className="flex items-center justify-between">
          <Image
            src="/sorteio/logo-fcs.png"
            alt="FCS 3D Studio"
            width={700}
            height={192}
            className="h-9 w-auto"
            priority
          />
          <a
            href="#cadastro"
            className="rounded-[4px] border border-[#00D8FF] px-4 py-2 text-xs font-bold tracking-wider text-[#00D8FF] uppercase"
          >
            Cadastrar
          </a>
        </header>

        <section className="space-y-4">
          <p className="font-titulo text-xs font-semibold tracking-[0.25em] text-[#00D8FF] uppercase">
            Sorteio todo mês
          </p>
          <h1 className="font-titulo text-4xl leading-[1.05] font-bold tracking-tight uppercase sm:text-5xl">
            Obrigado por comprar com a gente
          </h1>
          <div className="h-1 w-16 bg-[#00D8FF]" aria-hidden="true" />
          <p className="max-w-md text-lg leading-relaxed text-[#A3AAB3]">
            Cadastre seu pedido abaixo e concorra a um produto do nosso catálogo. Leva um minuto.
          </p>
        </section>
      </div>

      <Marquee fotos={FOTOS_SORTEIO} />

      <div
        className={`mx-auto flex max-w-xl flex-col gap-12 px-4 pb-16 sm:px-6 ${FOTOS_SORTEIO.length ? "pt-12" : "pt-0"}`}
      >
        <section aria-label="O que a gente faz" className="grid gap-3 sm:grid-cols-3">
          {CARDS.map((c) => (
            <div key={c.titulo} className={`bg-[#1F1F1F] p-px ${CHANFRO}`}>
              <div className={`h-full bg-[#141414] p-5 ${CHANFRO}`}>
                <h2 className="font-titulo text-sm font-bold tracking-wide text-[#00D8FF] uppercase">
                  {c.titulo}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#A3AAB3]">{c.texto}</p>
              </div>
            </div>
          ))}
        </section>

        <section id="cadastro" className={`scroll-mt-6 bg-[rgba(0,216,255,0.3)] p-px ${CHANFRO}`}>
          <div className={`bg-[#141414] p-5 sm:p-8 ${CHANFRO}`}>
            <h2 className="font-titulo text-2xl font-bold tracking-tight uppercase">
              Cadastre seu pedido
            </h2>
            <p className="mt-2 mb-6 text-sm text-[#A3AAB3]">
              Os dados do pedido ficam na nossa base e você entra no grupo do WhatsApp no final.
            </p>
            <FormSorteio produtos={produtos} whatsappUrl={whatsappUrl} via={origemSorteio(via)} />
          </div>
        </section>

        <details className="group border-t border-[#1F1F1F] pt-5">
          <summary className="cursor-pointer list-none font-titulo text-sm font-semibold tracking-wider text-[#A3AAB3] uppercase marker:content-none group-open:text-[#00D8FF]">
            Regulamento do sorteio
          </summary>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[#A3AAB3]">
            {REGULAMENTO.map((r) => (
              <li key={r} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-[#00D8FF]" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </details>

        <footer className="space-y-1 border-t border-[#1F1F1F] pt-5 text-xs text-[#6F7781]">
          <p className="font-semibold tracking-wider text-[#A3AAB3] uppercase">FCS 3D STUDIO</p>
          <p>Lojas na Shopee, no Mercado Livre e no TikTok Shop.</p>
          <p>Seus dados ficam com a gente e não são repassados. Para remover, fale no WhatsApp.</p>
        </footer>
      </div>
    </main>
  );
}
