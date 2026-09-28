// Tela de opções fora da extensão, com armazenamento em memória.
import { iniciarTela } from '../opcoes/opcoes'
import type { Area } from '../dados/area'

const dados: Record<string, unknown> = {}
const memoria: Area = {
  async get(chaves) {
    const lista = Array.isArray(chaves) ? chaves : [chaves]
    return Object.fromEntries(lista.filter(c => c in dados).map(c => [c, dados[c]]))
  },
  async set(itens) {
    Object.assign(dados, itens)
  },
}
void iniciarTela(document, memoria)
