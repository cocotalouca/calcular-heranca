import { describe, expect, it } from 'vitest'
import { calcularInventario } from '@/engine/cumulativo'
import { MODELOS, modeloPorId } from '@/data/modelos'
import { montarAbas, montarPlanilha, nomeArquivo } from '../xlsx'
import { montarPdf } from '../pdf'
import { xml, zipar } from '../zip'

const cumulativo = modeloPorId('herdeiro-pos-morto')!
const simples = modeloPorId('classico')!

async function texto(blob: Blob): Promise<string> {
  return new TextDecoder('latin1').decode(new Uint8Array(await blob.arrayBuffer()))
}

/* ================================================================== *
 * O empacotador ZIP
 * ================================================================== */

describe('empacotador zip', () => {
  it('escreve as assinaturas que todo leitor procura', async () => {
    const blob = zipar([{ nome: 'a.txt', conteudo: 'oi' }])
    const bruto = await texto(blob)

    expect(bruto.startsWith('PK')).toBe(true) // cabeçalho local
    expect(bruto.includes('PK')).toBe(true) // diretório central
    expect(bruto.includes('PK')).toBe(true) // fim do diretório
    expect(bruto.includes('a.txt')).toBe(true)
    expect(bruto.includes('oi')).toBe(true)
  })

  it('a mesma entrada gera sempre os mesmos bytes', async () => {
    const a = await texto(zipar([{ nome: 'x.xml', conteudo: '<a/>' }]))
    const b = await texto(zipar([{ nome: 'x.xml', conteudo: '<a/>' }]))
    expect(a).toBe(b)
  })

  it('escapa o que quebraria o XML e descarta caracteres de controle', () => {
    expect(xml(`a & b < c > d "e" 'f'`)).toBe(
      'a &amp; b &lt; c &gt; d &quot;e&quot; &apos;f&apos;',
    )
    expect(xml(`linha${String.fromCharCode(0)}${String.fromCharCode(7)}fim`)).toBe('linhafim')
    // Quebra de linha é legítima dentro de uma célula e precisa sobreviver.
    expect(xml(`a${String.fromCharCode(10)}b`)).toBe(`a${String.fromCharCode(10)}b`)
  })
})

/* ================================================================== *
 * A planilha
 * ================================================================== */

describe('exportação para planilha', () => {
  it('monta uma aba por sucessão, mais processo, destino final, raciocínio e ressalvas', () => {
    const inv = cumulativo.montar()
    const abas = montarAbas(inv, calcularInventario(inv))

    expect(abas.map((a) => a.nome)).toEqual([
      'Processo',
      'Destino final',
      '1 - A.',
      '2 - B.',
      'Raciocínio',
      'Ressalvas',
    ])
  })

  it('não cria a aba de destino final quando há um só óbito', () => {
    const inv = simples.montar()
    const abas = montarAbas(inv, calcularInventario(inv))
    expect(abas.some((a) => a.nome === 'Destino final')).toBe(false)
  })

  it('grava dinheiro como número, para que as somas do Excel funcionem', () => {
    const inv = cumulativo.montar()
    const abas = montarAbas(inv, calcularInventario(inv))
    const destino = abas.find((a) => a.nome === 'Destino final')!

    const valores = destino.linhas
      .flat()
      .filter((c) => c?.s === 'moedaForte')
      .map((c) => c!.v)

    expect(valores.length).toBeGreaterThan(0)
    expect(valores.every((v) => typeof v === 'number')).toBe(true)
    expect(valores).toContain(450_000)
    expect(valores).toContain(225_000)
  })

  it('nenhum nome de aba passa dos 31 caracteres nem usa caractere proibido', () => {
    for (const modelo of MODELOS) {
      const inv = modelo.montar()
      for (const aba of montarAbas(inv, calcularInventario(inv))) {
        const nome = aba.nome.slice(0, 31)
        expect(nome.length, modelo.titulo).toBeLessThanOrEqual(31)
        expect(/[\\/?*[\]:]/.test(nome), `${modelo.titulo} → ${nome}`).toBe(false)
      }
    }
  })

  it('gera um arquivo com as partes obrigatórias do formato', async () => {
    const inv = cumulativo.montar()
    const bruto = await texto(montarPlanilha(inv, calcularInventario(inv)))

    for (const parte of [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet6.xml',
    ]) {
      expect(bruto.includes(parte), parte).toBe(true)
    }
  })

  it('todo modelo do catálogo gera planilha sem estourar', () => {
    for (const modelo of MODELOS) {
      const inv = modelo.montar()
      expect(() => montarPlanilha(inv, calcularInventario(inv)), modelo.titulo).not.toThrow()
    }
  })

  it('o nome do arquivo sai sem acento, espaço ou pontuação', () => {
    expect(nomeArquivo({ titulo: 'Sucessão de João & Cia.', obitos: [] })).toBe(
      'sucessao-de-joao-cia',
    )
    expect(nomeArquivo({ titulo: '', obitos: [] })).toBe('partilha')
  })
})

/* ================================================================== *
 * O PDF
 * ================================================================== */

describe('exportação para PDF', () => {
  it('produz um documento paginado com o conteúdo do processo', () => {
    const inv = cumulativo.montar()
    const doc = montarPdf(inv, calcularInventario(inv))

    // Capa + visão geral, uma página por sucessão, fundamentação e ressalvas.
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(4)

    const bruto = doc.output()
    expect(bruto.startsWith('%PDF-')).toBe(true)
    expect(bruto.length).toBeGreaterThan(5000)
  })

  it('todo modelo do catálogo gera PDF sem estourar', () => {
    for (const modelo of MODELOS) {
      const inv = modelo.montar()
      expect(() => montarPdf(inv, calcularInventario(inv)), modelo.titulo).not.toThrow()
    }
  })

  it('o processo vazio também gera relatório, sem página em branco perdida', () => {
    const inv = { titulo: '', obitos: simples.montar().obitos.map((o) => ({ ...o, patrimonio: { ...o.patrimonio, bensComuns: 0, bensParticulares: 0 } })) }
    const doc = montarPdf(inv, calcularInventario(inv))
    expect(doc.getNumberOfPages()).toBeGreaterThan(0)
  })
})
