export type IdProduto = { shopId: string; itemId: string }

const PADROES = [/-i\.(\d+)\.(\d+)/, /\/product\/(\d+)\/(\d+)/]

export function idDaUrl(url: string): IdProduto | null {
  for (const padrao of PADROES) {
    const m = url.match(padrao)
    if (m) return { shopId: m[1], itemId: m[2] }
  }
  return null
}

// Casa por prefixo. Quem usa confirma o id exato com idDaUrl.
export function seletorDoLink(id: IdProduto): string {
  return `a[href*="-i.${id.shopId}.${id.itemId}"], a[href*="/product/${id.shopId}/${id.itemId}"]`
}
