import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { resumoCategoriasCatalogo } from "@/dados/publico/catalogo";
import { linkOrcamentoGeral } from "@/dominio/catalogo/whatsapp";
import {
  CHANFRO,
  CabecalhoCatalogo,
  NavCategorias,
  RodapeCatalogo,
} from "@/componentes/catalogo/Catalogo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Catálogo FCS 3D STUDIO" },
  description:
    "Portfólio de peças impressas em 3D sob demanda: carros, games, personagens, decoração e mais. Escolha a peça e peça o orçamento pelo WhatsApp.",
  robots: { index: true, follow: true },
};

const PASSOS = ["Escolha a peça", "Peça o orçamento no WhatsApp", "A gente imprime e envia"];

export default async function PaginaCatalogo() {
  const categorias = await resumoCategoriasCatalogo();
  const totalPecas = categorias.reduce((soma, c) => soma + c.total, 0);

  return (
    <main className="min-h-dvh bg-[#0A0A0A] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-6 pb-16 sm:px-6">
        <CabecalhoCatalogo />

        <section className="space-y-4">
          <p className="font-titulo text-xs font-semibold tracking-[0.25em] text-[#00D8FF] uppercase">
            Catálogo sob demanda
          </p>
          <h1 className="max-w-3xl font-titulo text-4xl leading-[1.05] font-bold tracking-tight uppercase sm:text-6xl">
            Peças impressas em 3D para o seu hobby
          </h1>
          <div className="h-1 w-16 bg-[#00D8FF]" aria-hidden="true" />
          <p className="max-w-2xl text-lg leading-relaxed text-[#A3AAB3]">
            Esse é o nosso portfólio de produtos sob demanda que você pode pedir.
          </p>
          {totalPecas > 0 && (
            <p className="font-titulo text-sm font-semibold tracking-wider text-white uppercase">
              <span className="text-[#00D8FF]">{totalPecas}</span> peças em{" "}
              <span className="text-[#00D8FF]">{categorias.length}</span> categorias
            </p>
          )}
        </section>

        <ol
          className="grid gap-px overflow-hidden bg-[#1F1F1F] sm:grid-cols-3"
          aria-label="Como pedir"
        >
          {PASSOS.map((p, i) => (
            <li key={p} className="flex items-center gap-4 bg-[#0A0A0A] px-1 py-3 sm:px-5">
              <span className="font-titulo text-2xl font-bold text-[#00D8FF]">{i + 1}</span>
              <span className="text-sm font-medium text-[#A3AAB3]">{p}</span>
            </li>
          ))}
        </ol>

        {categorias.length > 0 ? (
          <>
            <NavCategorias categorias={categorias} />
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {categorias.map((c, i) => (
                <li
                  key={c.slug}
                  className={`group bg-[#1F1F1F] p-px transition-colors hover:bg-[rgba(0,216,255,0.45)] ${CHANFRO}`}
                >
                  <Link
                    href={`/portfolio/${c.slug}`}
                    className={`flex h-full flex-col bg-[#141414] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#00D8FF] ${CHANFRO}`}
                  >
                    <div className="grid aspect-square grid-cols-2 gap-px bg-[#0A0A0A]">
                      {c.capas.map((src) => (
                        <Image
                          key={src}
                          src={src}
                          alt=""
                          width={600}
                          height={600}
                          unoptimized
                          loading={i < 4 ? "eager" : "lazy"}
                          className="size-full object-cover"
                        />
                      ))}
                    </div>
                    <div className="flex items-end justify-between gap-2 p-3 sm:p-4">
                      <div>
                        <h2 className="font-titulo text-sm font-bold tracking-wide uppercase group-hover:text-[#00D8FF] sm:text-base">
                          {c.nome}
                        </h2>
                        <p className="text-xs text-[#6F7781]">{c.total} peças</p>
                      </div>
                      <span aria-hidden="true" className="font-titulo text-lg text-[#00D8FF]">
                        →
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <section className={`bg-[#141414] p-6 ${CHANFRO}`}>
            <h2 className="font-titulo text-lg font-bold uppercase">Catálogo em montagem</h2>
            <p className="mt-2 text-sm text-[#A3AAB3]">
              As peças estão sendo cadastradas. Enquanto isso, fale com a gente{" "}
              <a
                href={linkOrcamentoGeral()}
                target="_blank"
                rel="noopener"
                className="text-[#00D8FF] underline"
              >
                pelo WhatsApp
              </a>
              .
            </p>
          </section>
        )}

        <RodapeCatalogo />
      </div>
    </main>
  );
}
