import { xml, zipar, type ArquivoZip } from './zip'

/**
 * Escritor de .xlsx enxuto.
 *
 * Cobre o que um relatório de partilha precisa e nada além: texto, número,
 * moeda, percentual, títulos, cabeçalhos com fundo, largura de coluna,
 * mesclagem e congelamento da primeira linha. Tudo em strings inline, sem
 * tabela de strings compartilhadas — o arquivo fica um pouco maior e muito
 * mais simples de auditar.
 */

export type Estilo =
  | 'padrao'
  | 'titulo'
  | 'subtitulo'
  | 'cabecalho'
  | 'texto'
  | 'textoLongo'
  | 'moeda'
  | 'moedaForte'
  | 'percentual'
  | 'nota'
  | 'destaque'

const INDICE_ESTILO: Record<Estilo, number> = {
  padrao: 0,
  titulo: 1,
  subtitulo: 2,
  cabecalho: 3,
  texto: 4,
  moeda: 5,
  moedaForte: 6,
  percentual: 7,
  nota: 8,
  destaque: 9,
  textoLongo: 10,
}

export interface Celula {
  v: string | number | null
  s?: Estilo
}

export interface Aba {
  nome: string
  /** Largura de cada coluna, em caracteres. */
  larguras: number[]
  linhas: (Celula | null)[][]
  /** Intervalos mesclados, ex.: "A1:E1". */
  mesclas?: string[]
  /** Congelar as N primeiras linhas ao rolar. */
  congelar?: number
}

export function celula(v: string | number | null, s: Estilo = 'texto'): Celula {
  return { v, s }
}

export const vazia: Celula | null = null

/* ------------------------------------------------------------------ *
 * Peças fixas do pacote
 * ------------------------------------------------------------------ */

const CABECALHO_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

const ESTILOS = `${CABECALHO_XML}
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2">
<numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/>
<numFmt numFmtId="165" formatCode="0.00%"/>
</numFmts>
<fonts count="6">
<font><sz val="11"/><color rgb="FF1B2130"/><name val="Calibri"/></font>
<font><b/><sz val="16"/><color rgb="FF1B2130"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FF6B7280"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><i/><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FF1B2130"/><name val="Calibri"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF8F640B"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFAF1DA"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFE2E4E9"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="11">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="164" fontId="5" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="5" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

/* ------------------------------------------------------------------ *
 * Montagem
 * ------------------------------------------------------------------ */

export function gerarXlsx(abas: Aba[]): Blob {
  const arquivos: ArquivoZip[] = []

  arquivos.push({
    nome: '[Content_Types].xml',
    conteudo: `${CABECALHO_XML}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${abas
  .map(
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  )
  .join('\n')}
</Types>`,
  })

  arquivos.push({
    nome: '_rels/.rels',
    conteudo: `${CABECALHO_XML}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  })

  arquivos.push({
    nome: 'xl/workbook.xml',
    conteudo: `${CABECALHO_XML}
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${abas
  .map(
    (a, i) =>
      `<sheet name="${xml(nomeSeguro(a.nome))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
  )
  .join('\n')}
</sheets>
</workbook>`,
  })

  arquivos.push({
    nome: 'xl/_rels/workbook.xml.rels',
    conteudo: `${CABECALHO_XML}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${abas
  .map(
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  )
  .join('\n')}
<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
  })

  arquivos.push({ nome: 'xl/styles.xml', conteudo: ESTILOS })

  abas.forEach((aba, i) => {
    arquivos.push({ nome: `xl/worksheets/sheet${i + 1}.xml`, conteudo: montarAba(aba) })
  })

  return zipar(arquivos)
}

function montarAba(aba: Aba): string {
  const cols =
    aba.larguras.length > 0
      ? `<cols>${aba.larguras
          .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
          .join('')}</cols>`
      : ''

  const painel =
    aba.congelar && aba.congelar > 0
      ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${aba.congelar}" topLeftCell="A${aba.congelar + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
      : ''

  const linhas = aba.linhas
    .map((linha, r) => {
      const celulas = linha
        .map((c, k) => (c ? montarCelula(c, k, r + 1) : ''))
        .filter(Boolean)
        .join('')
      return `<row r="${r + 1}">${celulas}</row>`
    })
    .join('')

  const mesclas =
    aba.mesclas && aba.mesclas.length > 0
      ? `<mergeCells count="${aba.mesclas.length}">${aba.mesclas
          .map((m) => `<mergeCell ref="${m}"/>`)
          .join('')}</mergeCells>`
      : ''

  return `${CABECALHO_XML}
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${painel}${cols}<sheetData>${linhas}</sheetData>${mesclas}</worksheet>`
}

function montarCelula(c: Celula, coluna: number, linha: number): string {
  const ref = `${letraColuna(coluna)}${linha}`
  const s = INDICE_ESTILO[c.s ?? 'texto']

  if (c.v === null || c.v === '') return `<c r="${ref}" s="${s}"/>`
  if (typeof c.v === 'number') {
    if (!Number.isFinite(c.v)) return `<c r="${ref}" s="${s}"/>`
    return `<c r="${ref}" s="${s}"><v>${c.v}</v></c>`
  }
  return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xml(c.v)}</t></is></c>`
}

export function letraColuna(i: number): string {
  let n = i
  let saida = ''
  do {
    saida = String.fromCharCode(65 + (n % 26)) + saida
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return saida
}

/** O Excel recusa alguns caracteres e nomes com mais de 31 caracteres. */
function nomeSeguro(nome: string): string {
  const limpo = nome.replace(/[\\/?*[\]:]/g, '-').trim() || 'Planilha'
  return limpo.slice(0, 31)
}
