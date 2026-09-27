import type { Area } from '../src/dados/area'

export function areaEmMemoria(inicial: Record<string, unknown> = {}): Area & { dados: Record<string, unknown> } {
  const dados: Record<string, unknown> = structuredClone(inicial)
  return {
    dados,
    async get(chaves) {
      const lista = Array.isArray(chaves) ? chaves : [chaves]
      return Object.fromEntries(lista.filter(c => c in dados).map(c => [c, structuredClone(dados[c])]))
    },
    async set(itens) {
      Object.assign(dados, structuredClone(itens))
    },
  }
}
