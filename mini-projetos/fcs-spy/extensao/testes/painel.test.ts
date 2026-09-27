// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { montarPainel, textoLeitura, ATRIBUTO_PAINEL } from '../src/ui/painel'
import { CONFIG_PADRAO } from '../src/dados/config'
import { reais } from '../src/nucleo/formato'
import type { Config } from '../src/nucleo/tipos'

const cfg: Config = {
  ...CONFIG_PADRAO,
  filamentoKg: 100, perdaPct: 0, potenciaW: 0, kwh: 0,
  desgasteHora: 0, maoDeObraHora: 0, embalagem: 0.2, impostoPct: 0.04,
}

function preencher(raiz: ShadowRoot, nome: string, valor: string) {
  const input = raiz.querySelector<HTMLInputElement>(`input[name="${nome}"]`)!
  input.value = valor
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
const valor = (raiz: ShadowRoot, campo: string) =>
  raiz.querySelector(`[data-campo="${campo}"] .valor`)!.textContent

describe('textoLeitura', () => {
  it('sem leitura', () => expect(textoLeitura(null)).toBe('abra pela busca para ver vendas'))
  it('com leitura', () => {
    expect(textoLeitura({ itemId: '1', data: '2026-09-27', preco: 17.9, vendas30d: 196, vendasTotal: 1596 }))
      .toBe('vendas 30D 196, total 1.596 (leitura de 27/09/2026)')
  })
})

describe('botão Custos', () => {
  const botaoCustos = (raiz: ShadowRoot) =>
    [...raiz.querySelectorAll('button')].find(b => b.textContent === 'Custos')

  it('com callback, mostra o botão e chama ao clicar', () => {
    const aoAbrirCustos = vi.fn()
    const raiz = montarPainel({ config: cfg, preco: 10, variacoes: null, leitura: null, aoAbrirCustos }).shadowRoot!
    botaoCustos(raiz)!.click()
    expect(aoAbrirCustos).toHaveBeenCalledOnce()
  })
  it('sem callback, não mostra o botão', () => {
    const raiz = montarPainel({ config: cfg, preco: 10, variacoes: null, leitura: null }).shadowRoot!
    expect(botaoCustos(raiz)).toBeUndefined()
  })
})

describe('montarPainel', () => {
  it('confere com a calculadora do Ziem', () => {
    const host = montarPainel({ config: cfg, preco: 15.9, variacoes: null, leitura: null })
    expect(host.hasAttribute(ATRIBUTO_PAINEL)).toBe(true)
    const raiz = host.shadowRoot!
    preencher(raiz, 'gramas', '48')
    const ads = raiz.querySelector<HTMLInputElement>('input[name="ads"]')!
    ads.checked = true
    ads.dispatchEvent(new Event('change', { bubbles: true }))
    preencher(raiz, 'roas', '30')
    expect(valor(raiz, 'custoProducao')).toBe('R$ 5,00')
    expect(valor(raiz, 'taxa')).toBe('R$ 7,18')
    expect(valor(raiz, 'lucro')).toBe('R$ 2,55')
    expect(valor(raiz, 'margem')).toBe('16,1%')
    expect(valor(raiz, 'roasMinimo')).toBe('5,16x')
  })
  it('aceita vírgula decimal', () => {
    const raiz = montarPainel({ config: cfg, preco: 15.9, variacoes: null, leitura: null }).shadowRoot!
    preencher(raiz, 'gramas', '48,0')
    expect(valor(raiz, 'custoProducao')).toBe('R$ 5,00')
  })
  it('conta que não fecha', () => {
    const raiz = montarPainel({ config: CONFIG_PADRAO, preco: 5, variacoes: null, leitura: null }).shadowRoot!
    expect(valor(raiz, 'roasMinimo')).toBe('prejuízo mesmo sem ads')
  })
  it('preço ausente mostra sem dado', () => {
    const raiz = montarPainel({ config: cfg, preco: null, variacoes: null, leitura: null }).shadowRoot!
    const preco = raiz.querySelector<HTMLInputElement>('input[name="preco"]')!
    expect(preco.value).toBe('')
    expect(preco.placeholder).toBe('sem dado, digite o preço')
    expect(valor(raiz, 'lucro')).toBe('sem dado')
    expect(valor(raiz, 'roasMinimo')).toBe('sem dado')
  })
  it('digitar o preço depois de vazio volta a calcular', () => {
    const raiz = montarPainel({ config: cfg, preco: null, variacoes: null, leitura: null }).shadowRoot!
    preencher(raiz, 'preco', '15,9')
    preencher(raiz, 'gramas', '48')
    expect(valor(raiz, 'custoProducao')).toBe('R$ 5,00')
  })
  it('variação preenche o preço', () => {
    const raiz = montarPainel({
      config: cfg, preco: null, leitura: null,
      variacoes: { itemId: '1', opcoes: [{ nome: 'Preto', preco: 24.9 }, { nome: 'Kit com 4', preco: 54.9 }] },
    }).shadowRoot!
    const preco = raiz.querySelector<HTMLInputElement>('input[name="preco"]')!
    expect(preco.value).toBe('24.9')
    const select = raiz.querySelector('select')!
    select.value = '1'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(preco.value).toBe('54.9')
  })
  it('recolher esconde o corpo', () => {
    const raiz = montarPainel({ config: cfg, preco: 10, variacoes: null, leitura: null }).shadowRoot!
    const botao = raiz.querySelector('button')!
    botao.click()
    expect(raiz.querySelector<HTMLElement>('.corpo')!.hidden).toBe(true)
    expect(botao.textContent).toBe('Abrir')
  })
  it('ads marcado com roas vazio mostra sem dado em ads, lucro e margem, mas taxa normal', () => {
    const raiz = montarPainel({ config: cfg, preco: 15.9, variacoes: null, leitura: null }).shadowRoot!
    const ads = raiz.querySelector<HTMLInputElement>('input[name="ads"]')!
    ads.checked = true
    ads.dispatchEvent(new Event('change', { bubbles: true }))
    preencher(raiz, 'roas', '')
    expect(valor(raiz, 'ads')).toBe('sem dado')
    expect(valor(raiz, 'lucro')).toBe('sem dado')
    expect(valor(raiz, 'margem')).toBe('sem dado')
    expect(valor(raiz, 'taxa')).toBe(reais(15.9 * cfg.comissaoPct + cfg.taxaFixa))
  })
  it('ads marcado com roas 0 também mostra sem dado', () => {
    const raiz = montarPainel({ config: cfg, preco: 15.9, variacoes: null, leitura: null }).shadowRoot!
    const ads = raiz.querySelector<HTMLInputElement>('input[name="ads"]')!
    ads.checked = true
    ads.dispatchEvent(new Event('change', { bubbles: true }))
    preencher(raiz, 'roas', '0')
    expect(valor(raiz, 'ads')).toBe('sem dado')
    expect(valor(raiz, 'lucro')).toBe('sem dado')
    expect(valor(raiz, 'margem')).toBe('sem dado')
  })
  it('ads desmarcado com roas vazio mostra ads real, não sem dado', () => {
    const raiz = montarPainel({ config: cfg, preco: 15.9, variacoes: null, leitura: null }).shadowRoot!
    preencher(raiz, 'roas', '')
    expect(valor(raiz, 'ads')).toBe(reais(0))
  })
})
