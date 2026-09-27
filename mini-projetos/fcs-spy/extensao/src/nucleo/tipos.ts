export type Selos = {
  ads: boolean | null
  indicado: boolean
  lojaOficial: boolean
}

export type Anuncio = {
  itemId: string
  shopId: string
  titulo: string
  loja: string | null
  preco: number
  vendas30d: number | null
  vendasTotal: number | null
  criadoEm: Date | null
  likes: number | null
  reviews: number | null
  nota: number | null
  selos: Selos
}

export type Variacoes = {
  itemId: string
  opcoes: { nome: string; preco: number }[]
}

// Percentuais guardados como fração: 0.2 = 20%.
export type Config = {
  comissaoPct: number
  taxaFixa: number
  margens: number[]
  impostoPct: number
  filamentoKg: number
  perdaPct: number
  potenciaW: number
  kwh: number
  desgasteHora: number
  maoDeObraHora: number
  embalagem: number
}

export type Leitura = {
  itemId: string
  data: string // AAAA-MM-DD local
  preco: number
  vendas30d: number | null
  vendasTotal: number | null
}

export type Tendencia = {
  dias: number
  difVendas30d: number | null
  difPreco: number
  seta: 'sobe' | 'cai' | 'estavel' | null
}
