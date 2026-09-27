import type { Config } from './tipos'
import { taxaShopee } from './metricas'

export type EntradaCalculo = {
  preco: number
  gramas: number
  horas: number
  minutosAcabamento: number
  ads: boolean
  roas: number
}

export type ResultadoCalculo = {
  filamento: number
  energia: number
  desgaste: number
  acabamento: number
  custoProducao: number
  taxa: number
  imposto: number
  ads: number
  lucro: number
  margem: number
  roasMinimo: number | null
}

export function calcular(e: EntradaCalculo, c: Config): ResultadoCalculo {
  const filamento = e.gramas * (c.filamentoKg / 1000) * (1 + c.perdaPct)
  const energia = e.horas * (c.potenciaW / 1000) * c.kwh
  const desgaste = e.horas * c.desgasteHora
  const acabamento = (e.minutosAcabamento / 60) * c.maoDeObraHora
  const custoProducao = filamento + energia + desgaste + acabamento + c.embalagem
  const taxa = taxaShopee(e.preco, c)
  const imposto = e.preco * c.impostoPct
  const ads = e.ads && e.roas > 0 ? e.preco / e.roas : 0
  const lucro = e.preco - taxa - imposto - ads - custoProducao
  const sobraSemAds = e.preco - taxa - imposto - custoProducao
  return {
    filamento, energia, desgaste, acabamento, custoProducao, taxa, imposto, ads, lucro,
    margem: e.preco > 0 ? lucro / e.preco : 0,
    roasMinimo: sobraSemAds > 0 ? e.preco / sobraSemAds : null,
  }
}
