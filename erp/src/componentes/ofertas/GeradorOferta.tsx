"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageUp, Search } from "lucide-react";
import { analisarUrl, publicarOferta, salvarOferta, type Analise } from "@/acoes/ofertas/ofertas";
import { assinarEnvioImagemOferta } from "@/acoes/upload";
import { enviarParaUrlAssinada } from "@/lib/upload-cliente";
import { erroPt } from "@/lib/erros-pt";
import { formatarDataHora } from "@/lib/formatos/data";
import { lerNumeroPt, numeroParaCampo } from "@/lib/formatos/numero";
import { PLATAFORMA_ROTULO, type Plataforma } from "@/dominio/ofertas/plataformas";
import { FONTE_DADO_ROTULO, dadoDesatualizado, type FonteDado } from "@/dominio/ofertas/produto";
import {
  escolherModelo,
  renderizarModelo,
  VARIAVEL_DESCRICAO,
  type Variavel,
} from "@/dominio/ofertas/modelos";
import { valoresDaOferta } from "@/dominio/ofertas/mensagem";
import { cupomPodeSair, SITUACAO_CUPOM_ROTULO, situacaoCupom } from "@/dominio/ofertas/cupons";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Banner } from "@/componentes/painel/Banner";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { DialogoPublicar, type GrupoOpcao } from "./DialogoPublicar";

export type OfertaInicial = {
  id: string;
  plataforma: Plataforma;
  url_original: string;
  url_produto: string | null;
  chave_produto: string | null;
  anunciante_awin: number | null;
  titulo: string | null;
  imagem_caminho: string | null;
  imagem_url: string | null;
  preco_atual: number | null;
  preco_anterior: number | null;
  desconto: number | null;
  preco_pix: number | null;
  parcelamento: string | null;
  avaliacao: number | null;
  avaliacoes_qtd: number | null;
  loja: string | null;
  preco_variavel: boolean;
  fontes: Record<string, string>;
  dados_atualizados_em: string | null;
  link_colado: string | null;
  cupom_id: string | null;
  modelo_id: string | null;
  cta: string | null;
  campanha: string | null;
  status: string;
};
export type ModeloOpcao = {
  id: string;
  nome: string;
  tipo: "oferta" | "cupom";
  plataforma: string | null;
  corpo: string;
  padrao: boolean;
  ativo: boolean;
};
export type CupomOpcao = {
  id: string;
  plataforma: string;
  codigo: string | null;
  descricao: string;
  beneficio: string | null;
  regras: string | null;
  valor_minimo: number | null;
  inicio_em: string | null;
  fim_em: string | null;
  validade_confirmada: boolean;
  status: string;
};

const CAMPOS = [
  { nome: "titulo", rotulo: "Nome do produto", tipo: "texto" },
  { nome: "preco_atual", rotulo: "Preço atual (R$)", tipo: "numero" },
  { nome: "preco_anterior", rotulo: "Preço anterior (R$)", tipo: "numero" },
  { nome: "desconto", rotulo: "Desconto (%)", tipo: "numero" },
  { nome: "preco_pix", rotulo: "Preço no Pix (R$)", tipo: "numero" },
  { nome: "parcelamento", rotulo: "Parcelamento", tipo: "texto" },
  { nome: "avaliacao", rotulo: "Nota (0 a 5)", tipo: "numero" },
  { nome: "avaliacoes_qtd", rotulo: "Quantidade de avaliações", tipo: "numero" },
  { nome: "loja", rotulo: "Loja ou vendedor", tipo: "texto" },
] as const;
type NomeCampo = (typeof CAMPOS)[number]["nome"];

function camposIniciais(o: OfertaInicial | null): Record<NomeCampo, string> {
  return {
    titulo: o?.titulo ?? "",
    preco_atual: numeroParaCampo(o?.preco_atual),
    preco_anterior: numeroParaCampo(o?.preco_anterior),
    desconto: o?.desconto ? numeroParaCampo(Number(o.desconto) * 100, 2) : "",
    preco_pix: numeroParaCampo(o?.preco_pix),
    parcelamento: o?.parcelamento ?? "",
    avaliacao: numeroParaCampo(o?.avaliacao, 1),
    avaliacoes_qtd: numeroParaCampo(o?.avaliacoes_qtd, 0),
    loja: o?.loja ?? "",
  };
}

const paraCampo = (v: string | null, casas = 2) =>
  v ? numeroParaCampo(Number(v), casas).replace(".", ",") : "";

export function GeradorOferta({
  inicial,
  imagemAssinada,
  grupos,
  modelos,
  cupons,
  liberadas,
}: {
  inicial: OfertaInicial | null;
  imagemAssinada: string | null;
  grupos: GrupoOpcao[];
  modelos: ModeloOpcao[];
  cupons: CupomOpcao[];
  liberadas: Plataforma[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState(inicial?.url_original ?? "");
  const [analise, setAnalise] = useState<Extract<Analise, { ok: true }> | null>(null);
  const [plataforma, setPlataforma] = useState<Plataforma | null>(inicial?.plataforma ?? null);
  const [base, setBase] = useState({
    url_original: inicial?.url_original ?? "",
    url_produto: inicial?.url_produto ?? "",
    chave_produto: inicial?.chave_produto ?? "",
    anunciante_awin: inicial?.anunciante_awin ? String(inicial.anunciante_awin) : "",
  });
  const [campos, setCampos] = useState(camposIniciais(inicial));
  const [variavel, setVariavel] = useState(inicial?.preco_variavel ?? false);
  const [fontesApi, setFontesApi] = useState<Record<string, string>>(inicial?.fontes ?? {});
  const [intocados, setIntocados] = useState<Set<string>>(
    new Set(
      Object.entries(inicial?.fontes ?? {})
        .filter(([, f]) => f !== "manual")
        .map(([c]) => c),
    ),
  );
  const [dadosApiEm, setDadosApiEm] = useState(inicial?.dados_atualizados_em ?? "");
  const [linkColado, setLinkColado] = useState(inicial?.link_colado ?? "");
  const [cupomId, setCupomId] = useState(inicial?.cupom_id ?? "");
  const [modeloId, setModeloId] = useState(inicial?.modelo_id ?? "");
  const [cta, setCta] = useState(inicial?.cta ?? "");
  const [campanha, setCampanha] = useState(inicial?.campanha ?? "");
  const [imagem, setImagem] = useState({
    caminho: inicial?.imagem_caminho ?? "",
    url: inicial?.imagem_url ?? "",
    previa: imagemAssinada ?? inicial?.imagem_url ?? "",
  });
  const [texto, setTexto] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroAnalise, setErroAnalise] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);
  const id = inicial?.id ?? null;

  const cuponsCompativeis = cupons.filter(
    (c) => c.plataforma === plataforma && (cupomPodeSair(c) || c.id === cupomId),
  );
  const cupom = cupons.find((c) => c.id === cupomId) ?? null;
  const modelo = plataforma
    ? escolherModelo(modelos, "oferta", plataforma, modeloId || null)
    : null;
  const corpo = texto.trim() || modelo?.corpo || "";
  const liberada = plataforma ? liberadas.includes(plataforma) : false;
  const desatualizado =
    !!campos.preco_atual && !!inicial && dadoDesatualizado(inicial.dados_atualizados_em);

  const previa = useMemo(() => {
    if (!plataforma || !corpo) return null;
    const n = (v: string) => lerNumeroPt(v);
    const desconto = n(campos.desconto);
    const linkPrevia =
      linkColado.trim() ||
      (analise?.link.ok ? analise.link.url : "") ||
      "[link de afiliado de cada grupo]";
    return renderizarModelo(
      corpo,
      valoresDaOferta(
        {
          plataforma,
          titulo: campos.titulo || null,
          preco_atual: n(campos.preco_atual),
          preco_anterior: n(campos.preco_anterior),
          desconto: desconto !== null ? desconto / 100 : null,
          preco_pix: n(campos.preco_pix),
          parcelamento: campos.parcelamento || null,
          avaliacao: n(campos.avaliacao),
          avaliacoes_qtd: n(campos.avaliacoes_qtd),
          loja: campos.loja || null,
          preco_variavel: variavel,
          cta: cta || null,
          dados_atualizados_em: campos.preco_atual
            ? intocados.has("preco_atual") && dadosApiEm
              ? dadosApiEm
              : new Date().toISOString()
            : null,
        },
        linkPrevia,
        cupom && cupom.plataforma === plataforma ? { ...cupom, plataforma } : null,
      ),
    );
  }, [plataforma, corpo, campos, variavel, cta, cupom, linkColado, analise, intocados, dadosApiEm]);

  function analisar() {
    setErroAnalise(null);
    iniciar(async () => {
      const r = await analisarUrl(url);
      if (!r.ok) {
        setErroAnalise(erroPt(r.erro) ?? r.erro);
        return;
      }
      setAnalise(r);
      setPlataforma(r.plataforma);
      setBase({
        url_original: r.url,
        url_produto: r.urlProduto,
        chave_produto: r.chaveProduto ?? "",
        anunciante_awin: r.anuncianteAwin ? String(r.anuncianteAwin) : "",
      });
      const p = r.produto;
      setCampos({
        titulo: p.titulo ?? "",
        preco_atual: paraCampo(p.preco_atual),
        preco_anterior: paraCampo(p.preco_anterior),
        desconto: p.desconto ? paraCampo(String(Number(p.desconto) * 100)) : "",
        preco_pix: paraCampo(p.preco_pix),
        parcelamento: p.parcelamento ?? "",
        avaliacao: p.avaliacao ? p.avaliacao.replace(".", ",") : "",
        avaliacoes_qtd: p.avaliacoes_qtd ? String(p.avaliacoes_qtd) : "",
        loja: p.loja ?? "",
      });
      setVariavel(p.preco_variavel);
      setFontesApi(p.fontes as Record<string, string>);
      setIntocados(new Set(Object.keys(p.fontes)));
      setDadosApiEm(p.atualizado_em ?? "");
      setImagem({ caminho: "", url: p.imagem_url ?? "", previa: p.imagem_url ?? "" });
      setCupomId("");
    });
  }

  function editar(nome: NomeCampo, valor: string) {
    setCampos((c) => ({ ...c, [nome]: valor }));
    setIntocados((s) => {
      const n = new Set(s);
      n.delete(nome === "desconto" ? "desconto" : nome);
      return n;
    });
  }

  async function trocarImagem(f: File) {
    setEnviandoImagem(true);
    const assinado = await assinarEnvioImagemOferta({
      nomeArquivo: f.name,
      tamanho: f.size,
      mime: f.type,
    });
    if (!assinado.ok) {
      toast.error(erroPt(assinado.erro));
      setEnviandoImagem(false);
      return;
    }
    const envio = await enviarParaUrlAssinada(assinado.url, f);
    setEnviandoImagem(false);
    if (!envio.ok) {
      toast.error(erroPt(envio.erro));
      return;
    }
    setImagem({ caminho: assinado.caminho, url: "", previa: URL.createObjectURL(f) });
    setIntocados((s) => {
      const n = new Set(s);
      n.delete("imagem_url");
      return n;
    });
  }

  function salvar() {
    if (!plataforma) return;
    const fd = new FormData();
    fd.set("plataforma", plataforma);
    for (const [k, v] of Object.entries(base)) fd.set(k, v);
    for (const [k, v] of Object.entries(campos)) fd.set(k, v);
    if (variavel) fd.set("preco_variavel", "on");
    fd.set("imagem_caminho", imagem.caminho);
    fd.set("imagem_url", imagem.caminho ? "" : imagem.url);
    fd.set("link_colado", linkColado);
    fd.set("cupom_id", cupomId);
    fd.set("modelo_id", modeloId);
    fd.set("cta", cta);
    fd.set("campanha", campanha);
    fd.set("fontes_api", JSON.stringify(fontesApi));
    fd.set(
      "intocados",
      [
        ...intocados,
        ...(imagem.url && !imagem.caminho && fontesApi.imagem_url ? ["imagem_url"] : []),
      ].join(","),
    );
    fd.set("dados_api_em", dadosApiEm);
    iniciar(async () => {
      const r = await salvarOferta(id, fd);
      setErros(r.erros);
      if (r.ok && r.id) {
        toast.success(r.mensagem ?? "Salvo.");
        if (!id) router.replace(`/ofertas/gerar?id=${r.id}`);
        else router.refresh();
      } else if (r.erros._form) toast.error(erroPt(r.erros._form));
    });
  }

  const fonteDe = (nome: string, valor: string) => {
    if (!valor) return "não informado";
    if (intocados.has(nome) && fontesApi[nome] && fontesApi[nome] !== "manual")
      return FONTE_DADO_ROTULO[fontesApi[nome] as FonteDado] ?? fontesApi[nome];
    return FONTE_DADO_ROTULO.manual;
  };

  return (
    <div className="space-y-5">
      <section
        className="space-y-3 rounded-2xl bg-card p-5 shadow-painel"
        aria-label="Link do produto"
      >
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            analisar();
          }}
        >
          <div className="min-w-0 flex-1 basis-72 space-y-1.5">
            <label htmlFor="url-oferta" className="text-sm font-medium">
              URL do produto ou link de afiliado
            </label>
            <Input
              id="url-oferta"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://shopee.com.br/... , amazon.com.br/dp/... , mercadolivre.com.br/..."
              inputMode="url"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" disabled={pendente || !url.trim()}>
            <Search className="size-4" /> {pendente ? "Analisando" : "Analisar"}
          </Button>
        </form>
        {erroAnalise && <p className="text-sm text-erro">{erroAnalise}</p>}
        {plataforma && (
          <p className="text-sm text-texto-2">
            Plataforma: <strong className="text-texto">{PLATAFORMA_ROTULO[plataforma]}</strong>
            {base.chave_produto
              ? ` · produto ${base.chave_produto.split(":").slice(1).join(" ")}`
              : " · produto não identificado na URL"}
            {analise?.jaAfiliado
              ? " · o link colado já tinha afiliação (será trocado pela nossa)"
              : ""}
          </p>
        )}
      </section>

      {plataforma && (
        <>
          {!liberada && (
            <Banner tipo="alerta" titulo="Só rascunho">
              {PLATAFORMA_ROTULO[plataforma]} ainda não tem o canal WhatsApp liberado em Integrações
              de afiliados. Dá para salvar, não para publicar.
            </Banner>
          )}
          {analise?.avisoProduto && <Banner tipo="info">{analise.avisoProduto}</Banner>}
          {analise && analise.repetidas.length > 0 && (
            <Banner tipo="alerta" titulo="Produto já ofertado nos últimos 7 dias">
              {analise.repetidas
                .map((r) => `${r.titulo ?? "Sem nome"} (${formatarDataHora(r.criado_em)})`)
                .join("; ")}
            </Banner>
          )}
          {desatualizado && (
            <Banner tipo="alerta" titulo="Dados desatualizados">
              Preço consultado em {formatarDataHora(inicial?.dados_atualizados_em)}. Confira na
              página do produto e salve de novo antes de publicar.
            </Banner>
          )}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section
              className="space-y-4 rounded-2xl bg-card p-5 shadow-painel"
              aria-label="Dados da oferta"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {CAMPOS.map((c) => {
                  const valor = campos[c.nome];
                  return (
                    <div
                      key={c.nome}
                      className={c.nome === "titulo" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <label htmlFor={`campo-${c.nome}`} className="text-sm font-medium">
                          {c.rotulo}
                        </label>
                        <span className={valor ? "text-xs text-texto-3" : "text-xs text-alerta"}>
                          {fonteDe(c.nome, valor)}
                        </span>
                      </div>
                      <Input
                        id={`campo-${c.nome}`}
                        value={valor}
                        onChange={(e) => editar(c.nome, e.target.value)}
                        inputMode={c.tipo === "numero" ? "decimal" : undefined}
                        maxLength={c.nome === "titulo" ? 300 : 120}
                      />
                      <CampoErro chave={erros[c.nome]} />
                    </div>
                  );
                })}
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-acao"
                    checked={variavel}
                    onChange={(e) => setVariavel(e.target.checked)}
                  />
                  Preço varia entre opções do produto (mostra &quot;a partir de&quot;)
                </label>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="link-colado" className="text-sm font-medium">
                  Link de afiliado colado{" "}
                  {plataforma === "mercado_livre" ? "(obrigatório)" : "(opcional)"}
                </label>
                <Input
                  id="link-colado"
                  value={linkColado}
                  onChange={(e) => setLinkColado(e.target.value)}
                  inputMode="url"
                />
                <p className="text-xs text-texto-3">
                  {plataforma === "mercado_livre"
                    ? "Gere no portal de afiliados do Mercado Livre. O sistema marca como colado, não verificado."
                    : analise?.link.ok
                      ? `Conversão automática disponível (${analise.link.origem}). Cole só se quiser usar outro link.`
                      : `Conversão automática indisponível${analise && !analise.link.ok ? `: ${analise.link.erro}` : ""}. Sem link colado, a publicação é recusada.`}
                </p>
                <CampoErro chave={erros.link_colado} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="cupom" className="text-sm font-medium">
                    Cupom vinculado
                  </label>
                  <SelectNativo
                    id="cupom"
                    value={cupomId}
                    onChange={(e) => setCupomId(e.target.value)}
                  >
                    <option value="">Sem cupom</option>
                    {cuponsCompativeis.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.codigo ?? c.descricao} · {SITUACAO_CUPOM_ROTULO[situacaoCupom(c)]}
                      </option>
                    ))}
                  </SelectNativo>
                  <CampoErro chave={erros.cupom_id} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="modelo" className="text-sm font-medium">
                    Modelo de mensagem
                  </label>
                  <SelectNativo
                    id="modelo"
                    value={modeloId}
                    onChange={(e) => setModeloId(e.target.value)}
                  >
                    <option value="">Padrão da plataforma</option>
                    {modelos
                      .filter(
                        (m) =>
                          m.ativo &&
                          m.tipo === "oferta" &&
                          (!m.plataforma || m.plataforma === plataforma),
                      )
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome}
                        </option>
                      ))}
                  </SelectNativo>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cta" className="text-sm font-medium">
                    Chamada (opcional)
                  </label>
                  <Input
                    id="cta"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="campanha" className="text-sm font-medium">
                    Campanha (opcional, vira sub ID)
                  </label>
                  <Input
                    id="campanha"
                    value={campanha}
                    onChange={(e) => setCampanha(e.target.value)}
                    maxLength={60}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Imagem</p>
                <div className="flex flex-wrap items-center gap-3">
                  {imagem.previa ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagem.previa}
                      alt="Imagem da oferta"
                      className="size-24 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="flex size-24 items-center justify-center rounded-xl bg-superficie-2 text-xs text-texto-3">
                      Sem imagem
                    </span>
                  )}
                  <div className="space-y-1">
                    <input
                      ref={arquivo}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && trocarImagem(e.target.files[0])}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={enviandoImagem}
                      onClick={() => arquivo.current?.click()}
                    >
                      <ImageUp className="size-4" />{" "}
                      {enviandoImagem ? "Enviando" : "Enviar imagem própria"}
                    </Button>
                    <p className="text-xs text-texto-3">
                      {imagem.caminho
                        ? "Imagem enviada por você."
                        : imagem.url
                          ? "Imagem oficial da plataforma (API)."
                          : plataforma === "amazon"
                            ? "Amazon: imagem própria ou sem imagem (a política proíbe guardar a imagem deles)."
                            : "PNG, JPG ou WEBP até 5 MB, com direito de uso."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-3 rounded-2xl bg-card p-5 shadow-painel" aria-label="Prévia">
              <h2 className="text-sm font-semibold">Prévia da mensagem</h2>
              {previa ? (
                <>
                  <pre className="rounded-xl bg-superficie-2 p-3 font-sans text-sm whitespace-pre-wrap">
                    {previa.texto || "(vazio)"}
                  </pre>
                  {previa.ausentes.length > 0 && (
                    <p className="text-sm text-alerta">
                      Faltam:{" "}
                      {previa.ausentes
                        .map((a) => VARIAVEL_DESCRICAO[a as Variavel] ?? a)
                        .join(", ")}
                      . Preencha ou edite o texto.
                    </p>
                  )}
                  {previa.erros.length > 0 && (
                    <p className="text-sm text-erro">
                      Texto com marcação inválida: {previa.erros.join(", ")}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-texto-3">Escolha um modelo para ver a prévia.</p>
              )}
              <div className="space-y-1.5">
                <label htmlFor="texto-post" className="text-sm font-medium">
                  Texto desta postagem (opcional)
                </label>
                <Textarea
                  id="texto-post"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={6}
                  placeholder={modelo?.corpo ?? ""}
                  maxLength={4000}
                />
                <p className="text-xs text-texto-3">
                  Vazio usa o modelo. Use {"{{link}}"} onde o link de afiliado de cada grupo deve
                  entrar.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="secondary" disabled={pendente} onClick={salvar}>
                  {pendente ? "Salvando" : id ? "Salvar alterações" : "Salvar rascunho"}
                </Button>
                {id && (
                  <DialogoPublicar
                    grupos={grupos}
                    desabilitado={!liberada || (previa?.ausentes.length ?? 0) > 0}
                    motivoDesabilitado={
                      !liberada ? "Plataforma sem canal liberado" : "Faltam dados no texto"
                    }
                    acao={(g, ag) =>
                      publicarOferta(id, {
                        grupos: g,
                        agendado_para: ag,
                        texto: texto.trim() || null,
                      })
                    }
                  />
                )}
              </div>
              {!id && <p className="text-xs text-texto-3">Salve antes de publicar.</p>}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
