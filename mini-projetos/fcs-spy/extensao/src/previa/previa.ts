// Monta os componentes reais com dados de exemplo para conferir o visual fora da Shopee.
import { montarCard, type EstadoHistorico } from '../ui/card'
import { montarBarra } from '../ui/barra'
import { montarPainel } from '../ui/painel'
import { calcularMetricas } from '../nucleo/metricas'
import { CONFIG_PADRAO } from '../dados/config'
import type { Anuncio } from '../nucleo/tipos'

const hoje = new Date('2026-09-27T12:00:00Z')
const base: Anuncio = {
  itemId: '1', shopId: '2', titulo: 'Miniatura F1 12cm 4 Equipes', loja: 'Importadora Zenit', preco: 9.9,
  vendas30d: 1151, vendasTotal: 4595, criadoEm: new Date('2025-09-02T12:00:00Z'),
  likes: 1031, reviews: 2354, nota: 4.9, selos: { ads: null, indicado: true, lojaOficial: false },
}
const exemplos: [Anuncio, EstadoHistorico][] = [
  [base, { dias: 7, difVendas30d: 120, difPreco: 0, seta: 'sobe' }],
  [{ ...base, itemId: '3', titulo: 'Carrinho F1 Metal Fricção', preco: 19.7, vendas30d: 1345, vendasTotal: 2572, criadoEm: new Date('2026-04-28T12:00:00Z'), likes: 2901, reviews: 1459 },
    { dias: 1, difVendas30d: -40, difPreco: -1, seta: 'cai' }],
  [{ ...base, itemId: '4', titulo: 'Bburago 1:43 2025 F1', preco: 60, vendas30d: 188, vendasTotal: 1020, criadoEm: new Date('2026-08-28T12:00:00Z'), selos: { ads: null, indicado: false, lojaOficial: true } }, null],
]

const grade = document.getElementById('grade')!
for (const [a, h] of exemplos) {
  const li = document.createElement('li')
  li.className = 'shopee'
  const foto = document.createElement('div')
  foto.className = 'foto'
  const info = document.createElement('div')
  info.className = 'info'
  info.textContent = a.titulo
  li.append(foto, info, montarCard({ anuncio: a, metricas: calcularMetricas(a, CONFIG_PADRAO, hoje), historico: h }))
  grade.append(li)
}
// Segundo card aberto, para conferir o "ver mais".
grade.children[1].querySelector('[data-fcs-spy-card]')!.shadowRoot!.querySelector<HTMLButtonElement>('.mais')!.click()

const barra = montarBarra(() => {}, () => {}, () => {})
barra.style.position = 'static'
document.getElementById('barra')!.append(barra)

const painel = montarPainel({
  config: CONFIG_PADRAO, preco: null, leitura: { itemId: '1', data: '2026-09-27', preco: 17.9, vendas30d: 196, vendasTotal: 1596 },
  variacoes: { itemId: '1', opcoes: [{ nome: 'Kit com 4', preco: 54.9 }, { nome: 'Preto', preco: 24.9 }] },
  aoAbrirCustos: () => {},
})
painel.style.position = 'static'
document.getElementById('painel')!.append(painel)
