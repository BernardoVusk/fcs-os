/**
 * XLSX sem dependência: um zip "stored" (sem compressão) com o mínimo de XML que o Excel e o
 * LibreOffice abrem. Texto vai como inline string (acentos em UTF-8), número como número,
 * e célula que parece fórmula vai como texto, nunca como fórmula.
 */
import { protegerFormula, type Celula } from "./csv";

export type Planilha = {
  nome: string;
  cabecalho: readonly string[];
  linhas: readonly (readonly Celula[])[];
};

const codificador = new TextEncoder();

function xml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

/** A1, B1, ..., AA1. */
export function referenciaCelula(coluna: number, linha: number): string {
  let c = coluna + 1;
  let letras = "";
  while (c > 0) {
    const resto = (c - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    c = Math.floor((c - 1) / 26);
  }
  return `${letras}${linha + 1}`;
}

function celulaXml(valor: Celula, coluna: number, linha: number): string {
  const ref = referenciaCelula(coluna, linha);
  if (valor == null || valor === "") return "";
  if (typeof valor === "number" && Number.isFinite(valor))
    return `<c r="${ref}"><v>${valor}</v></c>`;
  if (typeof valor === "boolean") return `<c r="${ref}" t="b"><v>${valor ? 1 : 0}</v></c>`;
  const texto = protegerFormula(String(valor));
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(texto)}</t></is></c>`;
}

function planilhaXml(p: Planilha): string {
  const todas = [p.cabecalho, ...p.linhas];
  const linhas = todas
    .map((l, i) => `<row r="${i + 1}">${l.map((v, j) => celulaXml(v, j, i)).join("")}</row>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${linhas}</sheetData></worksheet>`;
}

function nomeAba(nome: string, indice: number): string {
  const limpo = nome
    .replace(/[\\/?*[\]:]/g, " ")
    .trim()
    .slice(0, 31);
  return limpo || `Planilha${indice + 1}`;
}

/** Arquivos do pacote: caminho e conteúdo. */
export function arquivosXlsx(
  planilhas: readonly Planilha[],
): { caminho: string; conteudo: string }[] {
  const lista = planilhas.length ? planilhas : [{ nome: "Planilha1", cabecalho: [], linhas: [] }];
  const abas = lista
    .map(
      (p, i) => `<sheet name="${xml(nomeAba(p.nome, i))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
    )
    .join("");
  const rels = lista
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join("");
  const tipos = lista
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("");
  return [
    {
      caminho: "[Content_Types].xml",
      conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${tipos}</Types>`,
    },
    {
      caminho: "_rels/.rels",
      conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      caminho: "xl/workbook.xml",
      conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${abas}</sheets></workbook>`,
    },
    {
      caminho: "xl/_rels/workbook.xml.rels",
      conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`,
    },
    ...lista.map((p, i) => ({
      caminho: `xl/worksheets/sheet${i + 1}.xml`,
      conteudo: planilhaXml(p),
    })),
  ];
}

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number): number[] {
  return [n & 0xff, (n >>> 8) & 0xff];
}
function u32(n: number): number[] {
  return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
}

/** Zip "stored": cada entrada com cabeçalho local, depois o diretório central e o fim. Data fixa (1/1/2026). */
export function zipStored(arquivos: readonly { caminho: string; conteudo: string }[]): Uint8Array {
  const partes: number[] = [];
  const central: number[] = [];
  const dataDos = u16(0);
  const dataDia = u16(((2026 - 1980) << 9) | (1 << 5) | 1);
  for (const a of arquivos) {
    const nome = codificador.encode(a.caminho);
    const dados = codificador.encode(a.conteudo);
    const crc = crc32(dados);
    const offset = partes.length;
    partes.push(
      ...u32(0x04034b50),
      ...u16(20),
      ...u16(0x0800),
      ...u16(0),
      ...dataDos,
      ...dataDia,
      ...u32(crc),
      ...u32(dados.length),
      ...u32(dados.length),
      ...u16(nome.length),
      ...u16(0),
      ...nome,
      ...dados,
    );
    central.push(
      ...u32(0x02014b50),
      ...u16(20),
      ...u16(20),
      ...u16(0x0800),
      ...u16(0),
      ...dataDos,
      ...dataDia,
      ...u32(crc),
      ...u32(dados.length),
      ...u32(dados.length),
      ...u16(nome.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
      ...nome,
    );
  }
  const inicioCentral = partes.length;
  const saida = [
    ...partes,
    ...central,
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(arquivos.length),
    ...u16(arquivos.length),
    ...u32(central.length),
    ...u32(inicioCentral),
    ...u16(0),
  ];
  return Uint8Array.from(saida);
}

export function gerarXlsx(planilhas: readonly Planilha[]): Uint8Array {
  return zipStored(arquivosXlsx(planilhas));
}

/** Leitura mínima de um zip stored (para testes): nomes e conteúdo em texto. */
export function lerZipStored(bytes: Uint8Array): { caminho: string; conteudo: string }[] {
  const decodificador = new TextDecoder();
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const saida: { caminho: string; conteudo: string }[] = [];
  let p = 0;
  while (p + 4 <= bytes.length && dv.getUint32(p, true) === 0x04034b50) {
    const tamanho = dv.getUint32(p + 18, true);
    const nomeLen = dv.getUint16(p + 26, true);
    const extraLen = dv.getUint16(p + 28, true);
    const nome = decodificador.decode(bytes.subarray(p + 30, p + 30 + nomeLen));
    const inicio = p + 30 + nomeLen + extraLen;
    saida.push({
      caminho: nome,
      conteudo: decodificador.decode(bytes.subarray(inicio, inicio + tamanho)),
    });
    p = inicio + tamanho;
  }
  return saida;
}
