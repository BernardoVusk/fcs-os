/** Licenças do MakerWorld que permitem vender a peça impressa (Creative Commons sem NC). */
const LICENCAS_COM_VENDA = new Set(["BY", "BY-SA", "BY-ND", "CC0"]);

const ROTULOS: Record<string, string> = {
  "Standard Digital File License": "Padrão",
  "MakerWorld Exclusive License": "Exclusiva",
};

/** Rótulo curto para o selo que só o dono vê no portfólio. */
export function rotuloLicenca(licenca: string | null) {
  if (!licenca) return "Não coletada";
  return ROTULOS[licenca] ?? licenca;
}

export function permiteVenda(licenca: string | null) {
  return licenca !== null && LICENCAS_COM_VENDA.has(licenca);
}
