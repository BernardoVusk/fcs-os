import { createHash } from "node:crypto";
import { formatarDataHora } from "@/lib/formatos/data";
import { idMensagemDoEnvio } from "@/dominio/ofertas/conector";
import type { Banco } from "./banco";
import type { GerenciadorSessoes } from "./sessoes";
import { log, mensagemDeErro } from "./log";

/** Processa um comando do ERP por vez. Devolve false quando a fila está vazia. */
export async function processarComando(
  banco: Banco,
  sessoes: GerenciadorSessoes,
  worker: string,
): Promise<boolean> {
  const c = await banco.proximoComando(worker);
  if (!c) return false;
  const numeros = await banco.numeros();
  const n = numeros.find((x) => x.id === c.numero_id);
  let ok = false;
  let resultado = "";
  try {
    if (!n) throw new Error("numero_nao_encontrado");
    switch (c.tipo) {
      case "conectar":
      case "parear": {
        if (!n.aceito || !n.ativo) throw new Error("aceite_obrigatorio");
        if (c.tipo === "parear" && !n.telefone) throw new Error("telefone_obrigatorio");
        await sessoes.fechar(n.id, false);
        ok = await sessoes.abrir(n, c.tipo === "parear" ? n.telefone : null);
        resultado = ok
          ? c.tipo === "parear"
            ? "Código de pareamento a caminho da tela."
            : "QR Code a caminho da tela."
          : "Outro worker está com este número.";
        break;
      }
      case "desconectar":
      case "remover": {
        await sessoes.fechar(n.id, true);
        await banco.apagarSessao(n.id);
        await banco.estado(n.id, c.tipo === "remover" ? "removido" : "desconectado", {
          erro: null,
          detalhe: "pedido no ERP",
        });
        if (c.tipo === "remover") await banco.eventoNumero(n.id, "removido");
        ok = true;
        resultado =
          c.tipo === "remover" ? "Número removido e sessão encerrada." : "Sessão encerrada.";
        break;
      }
      case "sincronizar_grupos": {
        const total = await sessoes.sincronizar(n.id);
        ok = true;
        resultado = `${total} grupo(s) sincronizado(s).`;
        break;
      }
      case "enviar_teste": {
        const conector = sessoes.conector(n.id);
        if (!conector) throw new Error("sessao_desconectada");
        const grupo = await banco.grupoTeste(String(c.payload.grupo_id ?? ""));
        if (!grupo) throw new Error("grupo_teste_obrigatorio");
        const id = await idMensagemDoEnvio(c.id, (t) =>
          createHash("sha256").update(t).digest("hex"),
        );
        await conector.enviar(
          grupo.jid,
          { texto: `Mensagem de teste do FCS ERP, ${formatarDataHora(new Date())}. Pode apagar.` },
          id,
        );
        ok = true;
        resultado = `Teste enviado para ${grupo.nome}.`;
        break;
      }
    }
  } catch (e) {
    ok = false;
    resultado = mensagemDeErro(e);
  }
  await banco.concluirComando(c.id, ok, resultado);
  await banco
    .eventoNumero(c.numero_id, "comando", `${c.tipo}: ${ok ? "ok" : "falhou"}`)
    .catch(() => {});
  log(ok ? "info" : "aviso", "comando", { tipo: c.tipo, numero: c.numero_id, ok, resultado });
  return true;
}
