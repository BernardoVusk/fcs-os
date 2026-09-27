// Memória limitada de itens vistos na página. Evita crescimento sem fim
// em buscas com rolagem infinita.
export const MAX_VISTOS = 300

export function lembrar<T>(mapa: Map<string, T>, chave: string, valor: T, max = MAX_VISTOS): void {
  mapa.delete(chave)
  mapa.set(chave, valor)
  for (const antiga of mapa.keys()) {
    if (mapa.size <= max) break
    mapa.delete(antiga)
  }
}
