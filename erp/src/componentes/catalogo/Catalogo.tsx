import Image from "next/image";
import Link from "next/link";
import { linkOrcamento, linkOrcamentoGeral } from "@/dominio/catalogo/whatsapp";
import type { CategoriaCatalogo, ItemCatalogo } from "@/dados/publico/catalogo";
import { FaixaCategorias } from "./FaixaCategorias";

/*
 * Peças da página pública /portfolio (catálogo sob demanda). Cores fixas como no /sorteio (não seguem o cookie de tema),
 * chanfro do logo em clip-path e ciano só em destaque e botão (identidade/design-guide.md).
 */
export const CHANFRO =
  "[clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)]";
const CHANFRO_BOTAO =
  "[clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]";

export function CabecalhoCatalogo() {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/portfolio" aria-label="FCS 3D Studio, início do catálogo">
        <Image
          src="/sorteio/logo-fcs.png"
          alt="FCS 3D Studio"
          width={700}
          height={192}
          className="h-9 w-auto"
          priority
        />
      </Link>
      <a
        href={linkOrcamentoGeral()}
        target="_blank"
        rel="noopener"
        className="rounded-[4px] border border-[#00D8FF] px-4 py-2 text-xs font-bold tracking-wider text-[#00D8FF] uppercase transition-colors hover:bg-[#00D8FF] hover:text-[#0A0A0A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00D8FF]"
      >
        Pedir orçamento
      </a>
    </header>
  );
}

/** Faixa de categorias: rola na horizontal no celular; a atual fica em ciano. */
export function NavCategorias({
  categorias,
  atual,
}: {
  categorias: CategoriaCatalogo[];
  atual?: string;
}) {
  const itens = [{ slug: "", nome: "Todas" }, ...categorias];
  return (
    <FaixaCategorias>
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap sm:gap-1.5">
        {itens.map((c) => {
          const ativa = (atual ?? "") === c.slug;
          return (
            <li key={c.slug || "todas"}>
              <Link
                href={c.slug ? `/portfolio/${c.slug}` : "/portfolio"}
                aria-current={ativa ? "page" : undefined}
                className={`block px-4 py-2 font-titulo text-xs font-semibold tracking-wider whitespace-nowrap uppercase sm:px-3 sm:tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00D8FF] ${CHANFRO_BOTAO} ${
                  ativa
                    ? "bg-[#00D8FF] text-[#0A0A0A]"
                    : "bg-[#141414] text-[#A3AAB3] hover:bg-[#1F1F1F] hover:text-white"
                }`}
              >
                {c.nome}
              </Link>
            </li>
          );
        })}
      </ul>
    </FaixaCategorias>
  );
}

export function CardProduto({
  item,
  categoria,
  prioridade = false,
}: {
  item: ItemCatalogo;
  categoria: string;
  prioridade?: boolean;
}) {
  return (
    <li
      className={`group bg-[#1F1F1F] p-px transition-colors hover:bg-[rgba(0,216,255,0.45)] ${CHANFRO}`}
    >
      <article className={`flex h-full flex-col bg-[#141414] ${CHANFRO}`}>
        <div className="aspect-square overflow-hidden bg-[#0F0F0F]">
          <Image
            src={item.imagem}
            alt={item.nome}
            width={600}
            height={600}
            unoptimized
            loading={prioridade ? "eager" : "lazy"}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
        <div className="flex flex-1 flex-col gap-3 p-3">
          <h2 className="line-clamp-2 min-h-[2lh] text-sm leading-snug font-medium text-white">
            {item.nome}
          </h2>
          <a
            href={linkOrcamento(item.nome, categoria)}
            target="_blank"
            rel="noopener"
            aria-label={`Pedir orçamento de ${item.nome} pelo WhatsApp`}
            className={`mt-auto block bg-[#00D8FF] px-2 py-2.5 text-center text-[11px] font-bold tracking-wide whitespace-nowrap text-[#0A0A0A] uppercase transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-3 sm:text-xs sm:tracking-wider ${CHANFRO_BOTAO}`}
          >
            Pedir orçamento
          </a>
        </div>
      </article>
    </li>
  );
}

export function RodapeCatalogo() {
  return (
    <footer className="space-y-1 border-t border-[#1F1F1F] pt-5 text-xs text-[#6F7781]">
      <p className="font-semibold tracking-wider text-[#A3AAB3] uppercase">FCS 3D STUDIO</p>
      <p>Peças impressas em 3D sob demanda. Orçamento pelo WhatsApp (31) 99253-7279.</p>
      <p>Lojas na Shopee, no Mercado Livre e no TikTok Shop.</p>
    </footer>
  );
}
