const PADRAO = /^(\d{4})_[a-z0-9_]+\.sql$/;

/** Arquivos .sql ainda não aplicados, ordenados pelo número. */
export function pendentes(aplicadas, arquivos) {
  const sql = arquivos.filter((a) => a.endsWith(".sql"));
  const numeros = new Set();
  for (const a of sql) {
    const m = PADRAO.exec(a);
    if (!m) throw new Error(`Migracao fora do padrao NNNN_nome.sql: ${a}`);
    if (numeros.has(m[1])) throw new Error(`Numero de migracao repetido: ${m[1]}`);
    numeros.add(m[1]);
  }
  const feitas = new Set(aplicadas);
  return sql.filter((a) => !feitas.has(a)).sort();
}
