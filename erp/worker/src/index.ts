import { hostname } from "node:os";
import { chavesDoAmbiente } from "@/lib/cripto";
import { BancoPg, criarPool } from "./banco";
import { ConectorBaileys } from "./conector-baileys";
import { GerenciadorSessoes } from "./sessoes";
import { processarComando } from "./comandos";
import { iniciarDespacho } from "./despacho";
import { iniciarCopiador } from "./copiador";
import { log, mensagemDeErro, registrarSegredo } from "./log";

/**
 * Worker do WhatsApp do Grupos de Ofertas. Sem porta de entrada: lê comandos e envios do banco,
 * escreve estado. Uma máquina na Fly; a trava por número impede duas sessões iguais.
 */

const VERSAO = "0.1.0";
const url = process.env.OFERTAS_WORKER_DB_URL;
if (!url) throw new Error("OFERTAS_WORKER_DB_URL não definida");
const worker = process.env.OFERTAS_WORKER_ID || `fly-${hostname()}`;
const chaves = chavesDoAmbiente();
registrarSegredo(url, process.env.OFERTAS_CHAVE_CRIPTO, process.env.OFERTAS_CHAVE_CRIPTO_ANTERIOR);

const banco = new BancoPg(criarPool(url));
const sessoes = new GerenciadorSessoes(
  banco,
  worker,
  (numero) => new ConectorBaileys(banco, numero, chaves),
);
const laços: ReturnType<typeof setInterval>[] = [];
let parando = false;

function repetir(nome: string, ms: number, f: () => Promise<unknown>) {
  let ocupado = false;
  laços.push(
    setInterval(async () => {
      if (ocupado || parando) return;
      ocupado = true;
      try {
        await f();
      } catch (e) {
        log("erro", nome, { erro: mensagemDeErro(e) });
      } finally {
        ocupado = false;
      }
    }, ms),
  );
}

async function principal() {
  log("info", "iniciando", { worker, versao: VERSAO });
  await banco.batimento(worker, VERSAO);
  await sessoes.retomar();
  repetir("batimento", 30_000, () => banco.batimento(worker, VERSAO));
  repetir("travas", 30_000, () => sessoes.renovarTravas());
  repetir("comandos", 2_000, async () => {
    while (!parando && (await processarComando(banco, sessoes, worker)));
  });
  repetir("sincronizacao", 6 * 3_600_000, () => sessoes.sincronizarTodos());
  repetir("alertas", 5 * 60_000, () => banco.gerarAlertas());
  laços.push(...iniciarDespacho({ banco, sessoes, worker, chaves, parando: () => parando }));
  iniciarCopiador({ banco, sessoes, chaves });
}

async function encerrar(sinal: string) {
  if (parando) return;
  parando = true;
  log("info", "encerrando", { sinal });
  for (const l of laços) clearInterval(l);
  try {
    await sessoes.fecharTodas();
  } catch (e) {
    log("erro", "fechar_sessoes", { erro: mensagemDeErro(e) });
  }
  await banco.fechar().catch(() => {});
  process.exit(0);
}

process.on("SIGTERM", () => void encerrar("SIGTERM"));
process.on("SIGINT", () => void encerrar("SIGINT"));
process.on("unhandledRejection", (e) =>
  log("erro", "promessa_rejeitada", { erro: mensagemDeErro(e) }),
);

principal().catch((e) => {
  log("erro", "falha_na_subida", { erro: mensagemDeErro(e) });
  process.exit(1);
});
