import { describe, it, expect } from 'vitest'
import { idDaUrl, seletorDoLink } from '../src/shopee/url'

describe('idDaUrl', () => {
  it('lê o padrão -i.shop.item da captura', () => {
    const url = 'https://shopee.com.br/F%C3%B3rmula-1-Miniatura-i.1762381981.58207314279?extraParams=x'
    expect(idDaUrl(url)).toEqual({ shopId: '1762381981', itemId: '58207314279' })
  })
  it('lê o padrão /product/shop/item', () => {
    expect(idDaUrl('https://shopee.com.br/product/12/34')).toEqual({ shopId: '12', itemId: '34' })
  })
  it('busca não é produto', () => {
    expect(idDaUrl('https://shopee.com.br/search?keyword=miniatura%20f1')).toBeNull()
  })
})

describe('seletorDoLink', () => {
  it('cobre os dois padrões', () => {
    expect(seletorDoLink({ shopId: '2', itemId: '1' })).toBe('a[href*="-i.2.1"], a[href*="/product/2/1"]')
  })
})
