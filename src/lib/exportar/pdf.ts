import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Inventario, ResultadoCumulativo } from '@/engine/tipos'
import { REGIMES } from '@/engine/tipos'
import { formatarCentavos } from '@/lib/moeda'
import { reunirAlertas } from '@/lib/alertas'
import {
  AVISO,
  destinoTexto,
  formatarData,
  hoje,
  nomeArquivo,
  rotuloPapel,
  rotuloTitulo,
} from './xlsx'

/* ------------------------------------------------------------------ *
 * Paleta e medidas
 * ------------------------------------------------------------------ */

const OURO: [number, number, number] = [143, 100, 11]
const OURO_CLARO: [number, number, number] = [250, 241, 218]
const TINTA: [number, number, number] = [27, 33, 48]
const CINZA: [number, number, number] = [107, 114, 128]
const LINHA: [number, number, number] = [226, 228, 233]
const PERIGO: [number, number, number] = [162, 44, 60]
const AVISO_COR: [number, number, number] = [154, 106, 13]

const MARGEM = 42
const LARGURA = 595.28 // A4 retrato, em pontos
const ALTURA = 841.89
const UTIL = LARGURA - MARGEM * 2

interface Cursor {
  y: number
}

/**
 * Relatório em PDF.
 *
 * Pensado para ser juntado a um processo ou enviado ao cliente: uma capa
 * sóbria, uma tabela por sucessão, o destino final consolidado e a
 * fundamentação por extenso. A tipografia é a padrão do PDF (Helvetica), que
 * cobre bem os acentos do português e não obriga a embutir fontes — o arquivo
 * sai com poucas dezenas de kilobytes.
 */
/** Monta o documento sem salvar — e o que os testes exercitam. */
export function montarPdf(inv: Inventario, r: ResultadoCumulativo): jsPDF {
  const doc = comTextoSeguro(new jsPDF({ unit: 'pt', format: 'a4' }))
  const cur: Cursor = { y: 0 }

  capa(doc, inv, r, cur)
  visaoGeral(doc, r, cur)
  if (r.cumulativo) destinoConsolidado(doc, r, cur)
  r.etapas.forEach((etapa) => sucessao(doc, etapa, r, cur))
  fundamentacao(doc, r, cur)
  pontosDeAtencao(doc, r, cur)
  rodapes(doc)

  return doc
}

export function exportarPdf(inv: Inventario, r: ResultadoCumulativo) {
  montarPdf(inv, r).save(`${nomeArquivo(inv)}.pdf`)
}


/* ------------------------------------------------------------------ *
 * Glifos que as fontes padrao do PDF nao conhecem
 * ------------------------------------------------------------------ */

/**
 * As fontes embutidas no PDF (Helvetica e companhia) usam WinAnsi, que cobre
 * bem o portugues — acentos, cedilha, travessao, aspas curvas — mas nao tem
 * a seta nem o sinal matematico de menos. Sem tratamento, esses caracteres
 * saem como lixo E desalinham o calculo de largura, quebrando a linha inteira
 * ao redor. Trocamos por equivalentes que existem na codificacao.
 */
const SUBSTITUTOS: Record<string, string> = {
  '\u2192': '>',
  '\u2190': '<',
  '\u2212': '-',
  '\u2264': '<=',
  '\u2265': '>=',
  '\u2248': '~',
  '\u2022': '\u00b7',
  '\u29d6': '',
  '\u2020': '+',
}

function sanear(texto: string): string {
  let saida = ''
  for (const ch of texto) {
    const troca = SUBSTITUTOS[ch]
    if (troca !== undefined) {
      saida += troca
      continue
    }
    const c = ch.codePointAt(0) ?? 0
    // Acima de U+00FF so passam os poucos simbolos que o WinAnsi acrescenta
    // ao Latin-1; o resto viraria caixa vazia no leitor.
    if (c > 0x00ff && !EXTRAS_WINANSI.has(ch)) continue
    saida += ch
  }
  return saida
}

const EXTRAS_WINANSI = new Set(
  '\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178',
)

/**
 * Intercepta a saida de texto do documento — inclusive a das tabelas, que
 * desenham por dentro do mesmo metodo — para que nenhum glifo desconhecido
 * escape.
 */
function comTextoSeguro(doc: jsPDF): jsPDF {
  const escrever = doc.text.bind(doc)
  const quebrar = doc.splitTextToSize.bind(doc)

  doc.text = ((conteudo: string | string[], ...resto: unknown[]) =>
    escrever(
      Array.isArray(conteudo) ? conteudo.map(sanear) : sanear(String(conteudo)),
      ...(resto as [number, number]),
    )) as typeof doc.text

  doc.splitTextToSize = ((conteudo: string, largura: number, ...resto: unknown[]) =>
    quebrar(sanear(String(conteudo)), largura, ...(resto as []))) as typeof doc.splitTextToSize

  return doc
}
/* ------------------------------------------------------------------ *
 * Blocos
 * ------------------------------------------------------------------ */

function capa(doc: jsPDF, inv: Inventario, r: ResultadoCumulativo, cur: Cursor) {
  doc.setFillColor(...OURO)
  doc.rect(0, 0, LARGURA, 6, 'F')

  cur.y = 96

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...OURO)
  doc.text('PARTILHA E SUCESSÃO LEGÍTIMA', MARGEM, cur.y)

  cur.y += 30
  doc.setFontSize(26)
  doc.setTextColor(...TINTA)
  const titulo = inv.titulo?.trim() || tituloPadrao(inv)
  const linhasTitulo = doc.splitTextToSize(titulo, UTIL) as string[]
  doc.text(linhasTitulo, MARGEM, cur.y)
  cur.y += linhasTitulo.length * 30

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(...CINZA)
  const subtitulo = r.cumulativo
    ? `Inventário cumulativo — ${r.etapas.length} sucessões reunidas num só processo (CPC, art. 672)`
    : 'Cálculo da sucessão legítima'
  doc.text(subtitulo, MARGEM, cur.y)
  cur.y += 16
  doc.text(`Elaborado em ${hoje()}`, MARGEM, cur.y)

  cur.y += 26
  doc.setDrawColor(...LINHA)
  doc.setLineWidth(0.8)
  doc.line(MARGEM, cur.y, LARGURA - MARGEM, cur.y)
  cur.y += 30

  /* --- número-chave --- */
  const caixaAltura = 76
  doc.setFillColor(...OURO_CLARO)
  doc.roundedRect(MARGEM, cur.y, UTIL, caixaAltura, 6, 6, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...OURO)
  doc.text('TOTAL DISTRIBUÍDO AOS BENEFICIÁRIOS FINAIS', MARGEM + 18, cur.y + 24)

  doc.setFontSize(22)
  doc.setTextColor(...TINTA)
  doc.text(formatarCentavos(r.totalConsolidadoCentavos), MARGEM + 18, cur.y + 52)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...CINZA)
  const nBenef = r.consolidado.length
  doc.text(
    `${nBenef} ${nBenef === 1 ? 'beneficiário' : 'beneficiários'}`,
    LARGURA - MARGEM - 18,
    cur.y + 52,
    { align: 'right' },
  )

  cur.y += caixaAltura + 30
}

function visaoGeral(doc: jsPDF, r: ResultadoCumulativo, cur: Cursor) {
  secao(doc, cur, 'As sucessões do processo')

  autoTable(doc, {
    startY: cur.y,
    margin: { left: MARGEM, right: MARGEM },
    head: [['#', 'Autor da herança', 'Óbito', 'Regime de bens', 'Herança líquida', 'Classe chamada']],
    body: r.etapas.map((e) => [
      String(e.indice + 1),
      e.original.nomeFalecido || `Falecido ${e.indice + 1}`,
      formatarData(e.original.dataObito),
      e.efetivo.conjuge.existe ? REGIMES[e.efetivo.conjuge.regime].curto : '—',
      formatarCentavos(e.resultado.massa.herancaLiquidaCentavos),
      e.resultado.classeLabel,
    ]),
    ...estiloTabela(),
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 58 },
      4: { halign: 'right', fontStyle: 'bold' },
    },
  })
  cur.y = fimDaTabela(doc) + 24

  if (r.fundamentos.length > 0) {
    subtitulo(doc, cur, 'O que autoriza reunir os inventários')
    for (const f of r.fundamentos) {
      paragrafo(doc, cur, f.texto, f.inciso)
    }
    cur.y += 8
  }
}

function destinoConsolidado(doc: jsPDF, r: ResultadoCumulativo, cur: Cursor) {
  novaPaginaSePreciso(doc, cur, 200)
  secao(doc, cur, 'Destino final dos bens')
  paragrafo(
    doc,
    cur,
    'Somando todas as sucessões cumuladas, e desconsiderando os valores que apenas atravessaram o espólio de quem também faleceu, cada pessoa recebe ao final:',
  )

  const total = Number(r.totalConsolidadoCentavos)

  autoTable(doc, {
    startY: cur.y,
    margin: { left: MARGEM, right: MARGEM },
    head: [['Beneficiário', 'Posição', 'Proveniência', 'Total', '%']],
    body: r.consolidado.map((q) => [
      q.nome,
      rotuloPapel(q.papel),
      q.origens
        .map((o) => `${rotuloTitulo(o.tipo)} de ${o.obitoNome}: ${formatarCentavos(o.centavos)}`)
        .join('\n'),
      formatarCentavos(q.totalCentavos),
      total > 0 ? `${((Number(q.totalCentavos) / total) * 100).toFixed(1)}%` : '—',
    ]),
    ...estiloTabela(),
    columnStyles: {
      3: { halign: 'right', fontStyle: 'bold', cellWidth: 78 },
      4: { halign: 'right', cellWidth: 34 },
    },
  })
  cur.y = fimDaTabela(doc) + 26
}

function sucessao(
  doc: jsPDF,
  etapa: ResultadoCumulativo['etapas'][number],
  r: ResultadoCumulativo,
  cur: Cursor,
) {
  const { resultado, original, aportes } = etapa
  const m = resultado.massa
  const nome = original.nomeFalecido || `Falecido ${etapa.indice + 1}`

  doc.addPage()
  cur.y = 72

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...OURO)
  doc.text(`SUCESSÃO ${etapa.indice + 1} DE ${r.etapas.length}`, MARGEM, cur.y)

  cur.y += 22
  doc.setFontSize(18)
  doc.setTextColor(...TINTA)
  doc.text(nome, MARGEM, cur.y)

  cur.y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...CINZA)
  const legenda = [
    original.dataObito ? `Óbito em ${formatarData(original.dataObito)}` : null,
    original.parentesco,
    resultado.classeLabel,
  ]
    .filter(Boolean)
    .join('  ·  ')
  doc.text(legenda, MARGEM, cur.y)
  cur.y += 22

  /* ---- apuração do acervo ---- */
  const corpo: string[][] = [
    ['Bens comuns do casal (valor total)', formatarCentavos(m.bensComunsCentavos)],
    ['Bens particulares do falecido', formatarCentavos(m.bensParticularesCentavos)],
  ]
  if (aportes.length > 0) {
    corpo.push([
      '  dos quais recebidos de sucessão anterior',
      formatarCentavos(aportes.reduce((s, a) => s + a.centavos, 0n)),
    ])
  }
  if (m.dividasCentavos > 0n) {
    corpo.push(['(−) Dívidas e despesas de funeral', formatarCentavos(m.dividasCentavos)])
  }
  if (resultado.meacao) {
    corpo.push([
      `(−) Meação de ${resultado.meacao.nome}`,
      formatarCentavos(resultado.meacao.valorCentavos),
    ])
  }
  corpo.push(['HERANÇA LÍQUIDA A PARTILHAR', formatarCentavos(m.herancaLiquidaCentavos)])
  if (m.temHerdeirosNecessarios) {
    corpo.push(['Legítima (reservada por lei)', formatarCentavos(m.legitimaCentavos)])
    corpo.push(['Parte disponível', formatarCentavos(m.disponivelCentavos)])
  }

  autoTable(doc, {
    startY: cur.y,
    margin: { left: MARGEM, right: MARGEM },
    head: [['Apuração do acervo', 'Valor']],
    body: corpo,
    ...estiloTabela(),
    columnStyles: { 1: { halign: 'right', cellWidth: 120 } },
    didParseCell: (dados) => {
      if (dados.section !== 'body') return
      const rotulo = String(dados.row.raw ? (dados.row.raw as string[])[0] : '')
      if (rotulo.startsWith('HERANÇA')) {
        dados.cell.styles.fontStyle = 'bold'
        dados.cell.styles.fillColor = OURO_CLARO
      }
    },
  })
  cur.y = fimDaTabela(doc) + 22

  /* ---- quinhões ---- */
  novaPaginaSePreciso(doc, cur, 160)
  subtitulo(doc, cur, 'Quinhão de cada herdeiro')

  const linhas: string[][] = []
  if (resultado.meacao) {
    linhas.push([
      resultado.meacao.nome,
      'Meação — direito próprio, não é herança',
      '—',
      formatarCentavos(resultado.meacao.valorCentavos),
    ])
  }
  for (const q of resultado.quotas) {
    const notas = [
      q.representando ? `representa ${q.representando}` : null,
      destinoTexto(q.destinoObitoId, r),
      q.transmissaoPendente ? 'Inventário deste herdeiro ainda não cadastrado.' : null,
    ].filter(Boolean)
    linhas.push([
      q.nome,
      [q.qualificacao, ...notas].join(' — '),
      q.fracaoHeranca.paraTexto(),
      formatarCentavos(q.valorCentavos),
    ])
  }

  if (linhas.length === 0) {
    paragrafo(doc, cur, 'Nenhum herdeiro foi chamado a suceder nesta herança.')
  } else {
    autoTable(doc, {
      startY: cur.y,
      margin: { left: MARGEM, right: MARGEM },
      head: [['Herdeiro', 'Qualificação e observações', 'Fração', 'Valor']],
      body: linhas,
      ...estiloTabela(),
      columnStyles: {
        0: { cellWidth: 96, fontStyle: 'bold' },
        2: { cellWidth: 44, halign: 'center' },
        3: { cellWidth: 92, halign: 'right', fontStyle: 'bold' },
      },
    })
    cur.y = fimDaTabela(doc) + 22
  }

  /* ---- fundamento de cada quinhão ---- */
  const fundamentos = resultado.quotas
    .map((q) => `${q.nome}: ${q.fundamento.join('; ')}`)
    .filter(Boolean)
  if (fundamentos.length > 0) {
    novaPaginaSePreciso(doc, cur, 80)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...CINZA)
    const texto = doc.splitTextToSize(
      `Fundamento legal — ${fundamentos.join('  ·  ')}`,
      UTIL,
    ) as string[]
    doc.text(texto, MARGEM, cur.y)
    cur.y += texto.length * 10 + 12
  }
}

function fundamentacao(doc: jsPDF, r: ResultadoCumulativo, cur: Cursor) {
  doc.addPage()
  cur.y = 72
  secao(doc, cur, 'Fundamentação, passo a passo')

  for (const etapa of r.etapas) {
    novaPaginaSePreciso(doc, cur, 100)
    subtitulo(
      doc,
      cur,
      `Sucessão de ${etapa.original.nomeFalecido || `Falecido ${etapa.indice + 1}`}`,
    )

    etapa.resultado.passos.forEach((p, i) => {
      novaPaginaSePreciso(doc, cur, 90)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...TINTA)
      const titulo = doc.splitTextToSize(`${i + 1}. ${p.titulo}`, UTIL) as string[]
      doc.text(titulo, MARGEM, cur.y)
      cur.y += titulo.length * 13 + 3

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(60, 66, 80)
      const corpo = doc.splitTextToSize(p.texto, UTIL) as string[]
      doc.text(corpo, MARGEM, cur.y)
      cur.y += corpo.length * 12 + 4

      if (p.conta) {
        doc.setFont('courier', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...OURO)
        const conta = doc.splitTextToSize(p.conta, UTIL - 12) as string[]
        doc.setFillColor(250, 249, 246)
        doc.rect(MARGEM, cur.y - 9, UTIL, conta.length * 11 + 10, 'F')
        doc.text(conta, MARGEM + 6, cur.y)
        cur.y += conta.length * 11 + 8
      }

      if (p.fundamento) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.setTextColor(...CINZA)
        const f = doc.splitTextToSize(p.fundamento, UTIL) as string[]
        doc.text(f, MARGEM, cur.y)
        cur.y += f.length * 10
      }

      cur.y += 14
    })
  }
}

function pontosDeAtencao(doc: jsPDF, r: ResultadoCumulativo, cur: Cursor) {
  const alertas = reunirAlertas(r)
  if (alertas.length === 0) return

  doc.addPage()
  cur.y = 72
  secao(doc, cur, 'Pontos de atenção')

  for (const a of alertas) {
    novaPaginaSePreciso(doc, cur, 90)

    const cor = a.nivel === 'critico' ? PERIGO : a.nivel === 'atencao' ? AVISO_COR : CINZA
    const inicio = cur.y - 10

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...TINTA)
    const cabecalho = a.obitoNome ? `${a.titulo}  ·  ${a.obitoNome}` : a.titulo
    const titulo = doc.splitTextToSize(cabecalho, UTIL - 18) as string[]
    doc.text(titulo, MARGEM + 14, cur.y)
    cur.y += titulo.length * 13 + 3

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(60, 66, 80)
    const corpo = doc.splitTextToSize(a.texto, UTIL - 18) as string[]
    doc.text(corpo, MARGEM + 14, cur.y)
    cur.y += corpo.length * 12

    if (a.fundamento) {
      cur.y += 3
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(...CINZA)
      doc.text(a.fundamento, MARGEM + 14, cur.y)
      cur.y += 10
    }

    // Barra lateral colorida indicando a gravidade.
    doc.setFillColor(...cor)
    doc.rect(MARGEM, inicio, 3, Math.max(12, cur.y - inicio + 2), 'F')

    cur.y += 18
  }
}

/* ------------------------------------------------------------------ *
 * Tipografia e utilidades
 * ------------------------------------------------------------------ */

function secao(doc: jsPDF, cur: Cursor, texto: string) {
  novaPaginaSePreciso(doc, cur, 120)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...TINTA)
  doc.text(texto, MARGEM, cur.y)
  cur.y += 10
  doc.setDrawColor(...OURO)
  doc.setLineWidth(1.6)
  doc.line(MARGEM, cur.y, MARGEM + 34, cur.y)
  cur.y += 20
}

function subtitulo(doc: jsPDF, cur: Cursor, texto: string) {
  novaPaginaSePreciso(doc, cur, 70)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...OURO)
  doc.text(texto, MARGEM, cur.y)
  cur.y += 16
}

function paragrafo(doc: jsPDF, cur: Cursor, texto: string, prefixo?: string) {
  novaPaginaSePreciso(doc, cur, 60)
  if (prefixo) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...OURO)
    doc.text(prefixo, MARGEM, cur.y)
    cur.y += 12
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(60, 66, 80)
  const linhas = doc.splitTextToSize(texto, UTIL) as string[]
  doc.text(linhas, MARGEM, cur.y)
  cur.y += linhas.length * 12 + 12
}

function estiloTabela() {
  return {
    theme: 'grid' as const,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 6,
      lineColor: LINHA,
      lineWidth: 0.5,
      textColor: TINTA,
      overflow: 'linebreak' as const,
      valign: 'top' as const,
    },
    headStyles: {
      fillColor: OURO,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [250, 250, 249] as [number, number, number] },
  }
}

function fimDaTabela(doc: jsPDF): number {
  const info = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
  return info?.finalY ?? 200
}

function novaPaginaSePreciso(doc: jsPDF, cur: Cursor, espacoNecessario: number) {
  if (cur.y + espacoNecessario > ALTURA - 72) {
    doc.addPage()
    cur.y = 72
  }
}

function rodapes(doc: jsPDF) {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINHA)
    doc.setLineWidth(0.5)
    doc.line(MARGEM, ALTURA - 54, LARGURA - MARGEM, ALTURA - 54)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...CINZA)
    const aviso = doc.splitTextToSize(AVISO, UTIL - 60) as string[]
    doc.text(aviso.slice(0, 3), MARGEM, ALTURA - 40)

    doc.setFontSize(8)
    doc.text(`${i}/${total}`, LARGURA - MARGEM, ALTURA - 26, { align: 'right' })
  }
}

function tituloPadrao(inv: Inventario): string {
  const nomes = inv.obitos.map((o) => o.nomeFalecido).filter(Boolean)
  if (nomes.length === 0) return 'Cálculo de partilha'
  if (nomes.length === 1) return `Sucessão de ${nomes[0]}`
  return `Sucessões de ${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}
