// Memória limitada de itens vistos na página. Evita crescimento sem fim
// em buscas com rolagem infinita.
export const MAX_VISTOS = 300

// Devolve as chaves removidas por excesso, para quem guarda estado por chave (ex.: elemento desenhado) limpar também.
export function lembrar<T>(mapa: Map<string, T>, chave: string, valor: T, max = MAX_VISTOS): string[] {
  mapa.delete(chave)
  mapa.set(chave, valor)
  const removidas: string[] = []
  for (const antiga of mapa.keys()) {
    if (mapa.size <= max) break
    mapa.delete(antiga)
    removidas.push(antiga)
  }
  return removidas
}
