import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from "baileys";
import { cifrar, decifrar, type ChaveCripto } from "@/lib/cripto";
import type { Banco } from "./banco";

/**
 * Estado de autenticação da Baileys guardado no banco (ofe_sessoes), cada chave cifrada com
 * AES-256-GCM e com o número e a chave como contexto. A biblioteca recomenda banco em vez de
 * arquivo para produção; aqui o volume do worker não guarda nada.
 */
export async function estadoNoBanco(
  banco: Banco,
  numero: string,
  chaves: { atual: ChaveCripto; todas: ChaveCripto[] },
): Promise<{ state: AuthenticationState; salvarCreds: () => Promise<void> }> {
  const ctx = (chave: string) => `ofe_sessoes:${numero}:${chave}`;
  const abrir = (chave: string, valor: string) =>
    JSON.parse(decifrar(valor, chaves.todas, ctx(chave)), BufferJSON.reviver);
  const fechar = (chave: string, valor: unknown) =>
    cifrar(JSON.stringify(valor, BufferJSON.replacer), chaves.atual, ctx(chave));

  const lidos = await banco.lerSessao(numero, ["creds"]);
  const creds: AuthenticationCreds = lidos.has("creds")
    ? abrir("creds", lidos.get("creds")!)
    : initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(tipo: T, ids: string[]) => {
          const nomes = ids.map((id) => `${tipo}-${id}`);
          const achados = await banco.lerSessao(numero, nomes);
          const saida: { [id: string]: SignalDataTypeMap[T] } = {};
          for (const id of ids) {
            const bruto = achados.get(`${tipo}-${id}`);
            if (!bruto) continue;
            let valor = abrir(`${tipo}-${id}`, bruto);
            if (tipo === "app-state-sync-key" && valor)
              valor = proto.Message.AppStateSyncKeyData.fromObject(valor);
            saida[id] = valor;
          }
          return saida;
        },
        set: async (dados) => {
          const pares: { chave: string; valor: string | null }[] = [];
          for (const tipo of Object.keys(dados) as (keyof SignalDataTypeMap)[]) {
            for (const [id, valor] of Object.entries(dados[tipo] ?? {})) {
              const chave = `${tipo}-${id}`;
              pares.push({ chave, valor: valor ? fechar(chave, valor) : null });
            }
          }
          if (pares.length) await banco.gravarSessao(numero, pares);
        },
      },
    },
    salvarCreds: async () => {
      await banco.gravarSessao(numero, [{ chave: "creds", valor: fechar("creds", creds) }]);
    },
  };
}
