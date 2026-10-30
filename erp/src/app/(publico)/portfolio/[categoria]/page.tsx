import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listarCategoriasCatalogo, listarItensCategoria } from "@/dados/publico/catalogo";
import { fontesDaCategoria } from "@/dados/catalogo";
import {
  CabecalhoCatalogo,
  CardProduto,
  NavCategorias,
  RodapeCatalogo,
} from "@/componentes/catalogo/Catalogo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ categoria: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const dados = await listarItensCategoria(categoria);
  if (!dados) return { title: { absolute: "Catálogo FCS 3D STUDIO" } };
  return {
    title: { absolute: `${dados.categoria.nome} | Catálogo FCS 3D STUDIO` },
    description: `${dados.itens.length} peças de ${dados.categoria.nome.toLowerCase()} impressas em 3D sob demanda. Escolha a peça e peça o orçamento pelo WhatsApp.`,
    robots: { index: true, follow: true },
  };
}

export default async function PaginaCategoria({ params }: Props) {
  const { categoria } = await params;
  // fontes: link do MakerWorld e licença, só para quem está logado no ERP (vazio para o visitante).
  const [dados, categorias, fontes] = await Promise.all([
    listarItensCategoria(categoria),
    listarCategoriasCatalogo(),
    fontesDaCategoria(categoria),
  ]);
  if (!dados) notFound();

  return (
    <main className="min-h-dvh bg-[#0A0A0A] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-6 pb-16 sm:px-6">
        <CabecalhoCatalogo />
        <NavCategorias categorias={categorias} atual={dados.categoria.slug} />

        <section className="space-y-3">
          <h1 className="font-titulo text-3xl leading-[1.05] font-bold tracking-tight uppercase sm:text-5xl">
            {dados.categoria.nome}
          </h1>
          <div className="h-1 w-16 bg-[#00D8FF]" aria-hidden="true" />
          <p className="text-sm text-[#A3AAB3]">
            {dados.itens.length} peças. Toque em <span className="text-white">Pedir orçamento</span>{" "}
            e a mensagem já chega no nosso WhatsApp com a peça escolhida.
          </p>
        </section>

        {dados.itens.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {dados.itens.map((item, i) => (
              <CardProduto
                key={item.id}
                item={item}
                categoria={dados.categoria.nome}
                fonte={fontes[item.id]}
                prioridade={i < 4}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#A3AAB3]">Nenhuma peça nesta categoria por enquanto.</p>
        )}

        <RodapeCatalogo />
      </div>
    </main>
  );
}
