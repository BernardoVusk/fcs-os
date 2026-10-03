import { describe, it, expect } from 'vitest'
import { rotaVendedor, limparUrlVendedor, TIPOS_VENDEDOR } from '../src/vendedor/rotas'

const S = 'https://seller.shopee.com.br'

describe('rotaVendedor', () => {
  it('lista fechada', () => {
    expect(rotaVendedor(`${S}/api/mydata/v3/dashboard/key-metrics/?SPC_CDS=x`)).toBe('indicadores')
    expect(rotaVendedor(`${S}/api/mydata/v1/dashboard/traffic-sources/?a=1`)).toBe('origens')
    expect(rotaVendedor(`${S}/api/mydata/v4/product/performance/?a=1`)).toBe('produtos')
    expect(rotaVendedor(`${S}/api/pas/v1/homepage/query/?a=1`)).toBe('campanhas')
    expect(rotaVendedor(`${S}/api/v3/affiliateplatform/dashboard/seller_daily?a=1`)).toBe('afiliados')
    expect(rotaVendedor(`${S}/api/mydata/marketing/new-discount/key-metrics/?a=1`)).toBe('marketing')
    expect(rotaVendedor('/api/mydata/v4/product/performance/?a=1')).toBe('produtos')
  })
  it('fora da lista não passa', () => {
    expect(rotaVendedor(`${S}/api/mydata/v1/dashboard/traffic-sources/product-contribution/?a=1`)).toBeNull()
    expect(rotaVendedor(`${S}/api/v2/login/`)).toBeNull()
    expect(rotaVendedor(`${S}/api/pas/v1/wallet/get/`)).toBeNull()
    expect(rotaVendedor('https://outro.com/api/mydata/v4/product/performance/')).toBeNull()
  })
  it('seis tipos', () => expect(TIPOS_VENDEDOR).toHaveLength(6))
})

describe('limparUrlVendedor', () => {
  it('tira parâmetros de sessão e mantém os de período e página', () => {
    const u = limparUrlVendedor(`${S}/api/mydata/v4/product/performance/?SPC_CDS=abc&SPC_CDS_VER=2&start_time=10&end_time=20&period=real_time&page_num=2&page_size=10&keyword=x`)
    expect(u).toBe('/api/mydata/v4/product/performance/?start_time=10&end_time=20&period=real_time&page_num=2&page_size=10')
  })
  it('endereço relativo sem sessão', () => {
    expect(limparUrlVendedor('/api/mydata/v4/product/performance/?SPC_CDS=a&page_num=3')).toBe('/api/mydata/v4/product/performance/?page_num=3')
  })
  it('descarta o fragmento', () => {
    expect(limparUrlVendedor(S + '/api/mydata/v4/product/performance/?start_time=1#x')).not.toContain('#x')
  })
})
