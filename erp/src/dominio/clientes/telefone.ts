/** Telefone brasileiro guardado só com dígitos (DDD + número), sem o 55 do país. */

/** "(31) 99999-9999", "+55 31 ..." ou "5531..." viram "31999999999"; fora de 10 ou 11 dígitos devolve null. */
export function normalizarTelefone(texto: string | null | undefined): string | null {
  if (!texto) return null;
  let digitos = texto.replace(/\D/g, "");
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }
  return digitos.length === 10 || digitos.length === 11 ? digitos : null;
}

/** "31999999999" vira "(31) 99999-9999"; texto que não é telefone volta como veio. */
export function formatarTelefone(digitos: string | null | undefined): string {
  if (!digitos) return "";
  const d = normalizarTelefone(digitos);
  if (!d) return digitos;
  const ddd = d.slice(0, 2);
  const numero = d.slice(2);
  const corte = numero.length - 4;
  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
}
