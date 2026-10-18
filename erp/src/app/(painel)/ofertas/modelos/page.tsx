import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarModelos } from "@/dados/ofertas/cadastros";
import { alternarModeloAtivo } from "@/acoes/ofertas/cadastros";
import { PLATAFORMA_ROTULO } from "@/dominio/ofertas/plataformas";
import { formatarDataHora } from "@/lib/formatos/data";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { Selo } from "@/componentes/ofertas/Selo";
import { EditorModelo } from "@/componentes/ofertas/EditorModelo";

export const metadata = { title: "Modelos de mensagem" };

export default async function PaginaModelos() {
  const usuario = await exigirLeitura("ofertas");
  const modelos = await listarModelos();
  const escreve = podeEscrever(usuario.papel, "ofertas");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            Modelos de mensagem
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-texto-2">
            Texto padrão de cada postagem. A oferta usa o modelo escolhido nela, senão o padrão da
            plataforma, senão o padrão geral. Cada postagem ainda pode ter o texto editado antes de
            publicar.
          </p>
        </div>
        {escreve && (
          <DialogoNovo rotulo="Novo modelo" titulo="Novo modelo">
            <EditorModelo />
          </DialogoNovo>
        )}
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {modelos.map((m) => (
          <li key={m.id} className="space-y-3 rounded-2xl bg-card p-5 shadow-painel">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{m.nome}</h2>
              <Selo tom="neutro">{m.tipo === "oferta" ? "Oferta" : "Cupom"}</Selo>
              <Selo tom="neutro">
                {m.plataforma ? PLATAFORMA_ROTULO[m.plataforma] : "Qualquer plataforma"}
              </Selo>
              {m.padrao && <Selo tom="info">Padrão</Selo>}
              {!m.ativo && <Selo tom="alerta">Desativado</Selo>}
            </div>
            <pre className="max-h-48 overflow-y-auto rounded-xl bg-superficie-2 p-3 font-mono text-xs whitespace-pre-wrap">
              {m.corpo}
            </pre>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-texto-3">
              <span>Atualizado {formatarDataHora(m.atualizado_em)}</span>
              {escreve && (
                <div className="flex gap-2">
                  <DialogoNovo rotulo="Editar" titulo={`Editar ${m.nome}`}>
                    <EditorModelo
                      modelo={{
                        id: m.id,
                        nome: m.nome,
                        tipo: m.tipo,
                        plataforma: m.plataforma,
                        corpo: m.corpo,
                        padrao: m.padrao,
                      }}
                    />
                  </DialogoNovo>
                  {!m.padrao && (
                    <BotaoAcao
                      acao={alternarModeloAtivo.bind(null, m.id, !m.ativo)}
                      variant="outline"
                    >
                      {m.ativo ? "Desativar" : "Reativar"}
                    </BotaoAcao>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
