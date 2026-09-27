import type { Anuncio } from '../src/nucleo/tipos'

export function anuncio(parcial: Partial<Anuncio> = {}): Anuncio {
  return {
    itemId: '1',
    shopId: '2',
    titulo: 'Par de Manopla Punho de Bike',
    loja: 'Loja Teste',
    preco: 9.9,
    vendas30d: 1151,
    vendasTotal: 4595,
    criadoEm: new Date('2025-09-02T12:00:00Z'),
    likes: 1031,
    reviews: 2354,
    nota: 4.9,
    selos: { ads: null, indicado: false, lojaOficial: false },
    ...parcial,
  }
}
