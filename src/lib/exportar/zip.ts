/**
 * ZIP mínimo, sem compressão e sem dependências.
 *
 * Um .xlsx é apenas um ZIP com XML dentro. Trazer uma biblioteca inteira só
 * para empacotar meia dúzia de arquivos custaria centenas de kilobytes no
 * navegador do usuário; o formato "stored" (sem deflate) é trivial de escrever
 * e todo leitor de planilha aceita. Os arquivos gerados aqui têm poucos KB —
 * comprimir não mudaria nada de perceptível.
 */

const TABELA_CRC = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

function crc32(dados: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < dados.length; i++) {
    c = TABELA_CRC[(c ^ dados[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

export interface ArquivoZip {
  nome: string
  conteudo: string | Uint8Array
}

export function zipar(arquivos: ArquivoZip[]): Blob {
  const enc = new TextEncoder()
  const partes: Uint8Array[] = []
  const central: Uint8Array[] = []
  let deslocamento = 0

  for (const arquivo of arquivos) {
    const nome = enc.encode(arquivo.nome)
    const dados =
      typeof arquivo.conteudo === 'string' ? enc.encode(arquivo.conteudo) : arquivo.conteudo
    const crc = crc32(dados)

    // ---- cabeçalho local ----
    const local = new Uint8Array(30 + nome.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true) // versão necessária
    lv.setUint16(6, 0x0800, true) // nomes em UTF-8
    lv.setUint16(8, 0, true) // método: armazenado
    lv.setUint16(10, 0, true) // hora
    lv.setUint16(12, 0x0021, true) // data fixa (1980-01-01): saída determinística
    lv.setUint32(14, crc, true)
    lv.setUint32(18, dados.length, true)
    lv.setUint32(22, dados.length, true)
    lv.setUint16(26, nome.length, true)
    lv.setUint16(28, 0, true)
    local.set(nome, 30)

    partes.push(local, dados)

    // ---- entrada no diretório central ----
    const cd = new Uint8Array(46 + nome.length)
    const cv = new DataView(cd.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, 0, true)
    cv.setUint16(14, 0x0021, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, dados.length, true)
    cv.setUint32(24, dados.length, true)
    cv.setUint16(28, nome.length, true)
    cv.setUint32(42, deslocamento, true)
    cd.set(nome, 46)
    central.push(cd)

    deslocamento += local.length + dados.length
  }

  const tamanhoCentral = central.reduce((s, c) => s + c.length, 0)

  const fim = new Uint8Array(22)
  const fv = new DataView(fim.buffer)
  fv.setUint32(0, 0x06054b50, true)
  fv.setUint16(8, arquivos.length, true)
  fv.setUint16(10, arquivos.length, true)
  fv.setUint32(12, tamanhoCentral, true)
  fv.setUint32(16, deslocamento, true)

  const pedacos = [...partes, ...central, fim] as unknown as BlobPart[]
  return new Blob(pedacos, { type: 'application/zip' })
}

/**
 * Caracteres de controle são inválidos em XML 1.0 e o Excel recusa o arquivo
 * inteiro por causa de um só — com uma mensagem de "conteúdo ilegível" que não
 * diz onde está o problema. Tabulação, quebra de linha e retorno de carro
 * passam; o resto é descartado.
 */
function semControles(texto: string): string {
  let saida = ''
  for (const ch of texto) {
    const c = ch.codePointAt(0) ?? 0
    if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) continue
    saida += ch
  }
  return saida
}

/** Escapa texto para dentro de um nó XML. */
export function xml(texto: string): string {
  return semControles(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function baixar(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
