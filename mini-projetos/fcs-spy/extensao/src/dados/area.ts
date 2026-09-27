export type Area = {
  get(chaves: string | string[]): Promise<Record<string, unknown>>
  set(itens: Record<string, unknown>): Promise<void>
}

export function areaLocal(): Area {
  return chrome.storage.local as unknown as Area
}
