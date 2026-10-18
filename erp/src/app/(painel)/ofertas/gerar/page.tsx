import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import {
  gruposDestino,
  listarCupons,
  listarModelos,
  plataformasLiberadas,
} from "@/dados/ofertas/cadastros";
import {
  listarOfertas,
  obterOferta,
  publicacoesDaOferta,
  urlImagem,
} from "@/dados/ofertas/ofertas";
import { arquivarOferta } from "@/acoes/ofertas/ofertas";
import { PLATAFORMA_ROTULO } from "@/dominio/ofertas/plataformas";
import {
  STATUS_OFERTA_ROTULO,
  STATUS_PUBLICACAO_ROTULO,
  TOM_PUBLICACAO,
} from "@/dominio/ofertas/status";
import { formatarDataHora } from "@/lib/formatos/data";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { Banner } from "@/componentes/painel/Banner";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Selo } from "@/componentes/ofertas/Selo";
import { GeradorOferta } from "@/componentes/ofertas/GeradorOferta";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Gerar oferta" };

export default async function PaginaGerarOferta({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const usuario = await exigirLeitura("ofertas");
  const { id } = await searchParams;
  const oferta = id ? await obterOferta(id) : null;
  if (id && !oferta) notFound();
  const [grupos, modelos, cupons, liberadas, recentes, imagem, publicacoes] = await Promise.all([
    gruposDestino(),
    listarModelos(),
    listarCupons(),
    plataformasLiberadas(),
    listarOfertas(undefined, 30),
    urlImagem(oferta?.imagem_caminho ?? null),
    oferta ? publicacoesDaOferta(oferta.id) : Promise.resolve([]),
  ]);
  const escreve = podeEscrever(usuario.papel, "ofertas");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            {oferta ? "Editar oferta" : "Gerar oferta"}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-texto-2">
            Cole a URL do produto. O sistema identifica a plataforma, busca dados só em fonte
            autorizada e converte o link para a nossa afiliação. Campo sem fonte fica como não
            informado.
          </p>
        </div>
        {oferta && (
          <Button asChild size="sm" variant="outline">
            <Link href="/ofertas/gerar">Nova oferta</Link>
          </Button>
        )}
      </div>
      {!escreve ? (
        <Banner tipo="info">Seu papel só lê. Peça a um operador para gerar ofertas.</Banner>
      ) : (
        <GeradorOferta
          key={oferta?.id ?? "nova"}
          inicial={oferta}
          imagemAssinada={imagem}
          grupos={grupos.map((g) => ({ id: g.id, nome: g.nome, funcao: g.funcao }))}
          modelos={modelos}
          cupons={cupons}
          liberadas={liberadas}
        />
      )}

      {oferta && publicacoes.length > 0 && (
        <section
          className="rounded-2xl bg-card p-5 shadow-painel"
          aria-label="Publicações desta oferta"
        >
          <h2 className="mb-3 text-base font-semibold">Publicações desta oferta</h2>
          <ul className="space-y-2 text-sm">
            {publicacoes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {formatarDataHora(p.agendado_para)} · {p.enviados}/{p.total} grupo(s) ·{" "}
                  {p.modo === "manual" ? "manual" : "automático"}
                </span>
                <Selo tom={TOM_PUBLICACAO[p.status]}>{STATUS_PUBLICACAO_ROTULO[p.status]}</Selo>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3" aria-label="Ofertas recentes">
        <h2 className="text-base font-semibold">Ofertas recentes</h2>
        {recentes.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma oferta ainda"
            descricao="As ofertas salvas aparecem aqui para editar e publicar."
          />
        ) : (
          <ul className="divide-y divide-borda overflow-hidden rounded-2xl bg-card shadow-painel">
            {recentes.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <div className="min-w-0 flex-1 basis-64">
                  <Link href={`/ofertas/gerar?id=${o.id}`} className="font-medium hover:text-acao">
                    {o.titulo ?? "Sem nome"}
                  </Link>
                  <p className="text-xs text-texto-3">
                    {PLATAFORMA_ROTULO[o.plataforma]} ·{" "}
                    {o.preco_atual ? formatarMoeda(o.preco_atual) : "preço não informado"} ·
                    atualizada {formatarDataHora(o.atualizado_em)}
                  </p>
                </div>
                <Selo tom={o.status === "pronta" ? "sucesso" : "neutro"}>
                  {STATUS_OFERTA_ROTULO[o.status] ?? o.status}
                </Selo>
                {escreve && (
                  <BotaoAcao
                    acao={arquivarOferta.bind(null, o.id)}
                    confirmar={{
                      titulo: "Arquivar esta oferta?",
                      descricao: "Ela sai da lista. Publicações já feitas ficam no histórico.",
                      rotulo: "Arquivar",
                    }}
                  >
                    Arquivar
                  </BotaoAcao>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
