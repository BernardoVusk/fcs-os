import type { Config } from '../nucleo/tipos'
import { areaLocal, type Area } from './area'

export const CHAVE_CONFIG = 'config'

// Ponto de partida. Comissão veio do Ziem Spy (20% + R$ 4).
// Custos de impressão são padrões a ajustar na tela de opções.
export const CONFIG_PADRAO: Config = {
  comissaoPct: 0.2,
  taxaFixa: 4,
  margens: [0.1, 0.15, 0.2],
  impostoPct: 0.04,
  filamentoKg: 120,
  perdaPct: 0.1,
  potenciaW: 150,
  kwh: 0.95,
  desgasteHora: 0.5,
  maoDeObraHora: 20,
  embalagem: 1.5,
  corteVerde: 300,
  corteAmarelo: 50,
}

export function mesclar(salvo: unknown): Config {
  const s = (salvo && typeof salvo === 'object' ? salvo : {}) as Record<string, unknown>
  const c: Config = { ...CONFIG_PADRAO, margens: [...CONFIG_PADRAO.margens] }
  for (const k of Object.keys(CONFIG_PADRAO) as (keyof Config)[]) {
    const v = s[k]
    if (k === 'margens') {
      if (Array.isArray(v) && v.length > 0 && v.every(n => typeof n === 'number' && Number.isFinite(n))) {
        c.margens = [...v]
      }
    } else if (k === 'corteVerde' || k === 'corteAmarelo') {
      if (typeof v === 'number' && Number.isInteger(v) && v >= 1) c[k] = v
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      c[k] = v
    }
  }
  // Faixa impossível (amarelo alcançando o verde) volta os dois cortes ao padrão.
  if (c.corteAmarelo >= c.corteVerde) {
    c.corteVerde = CONFIG_PADRAO.corteVerde
    c.corteAmarelo = CONFIG_PADRAO.corteAmarelo
  }
  return c
}

export async function lerConfig(area: Area = areaLocal()): Promise<Config> {
  const salvo = await area.get(CHAVE_CONFIG)
  return mesclar(salvo[CHAVE_CONFIG])
}

export async function salvarConfig(c: Config, area: Area = areaLocal()): Promise<void> {
  await area.set({ [CHAVE_CONFIG]: c })
}
