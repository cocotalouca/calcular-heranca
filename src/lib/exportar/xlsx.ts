import type { Inventario, ResultadoCumulativo } from '@/engine/tipos'
import { REGIMES } from '@/engine/tipos'
import { centavosParaReais } from '@/lib/moeda'
import { reunirAlertas } from '@/lib/alertas'
import { celula as c, gerarXlsx, type Aba, type Celula } from './planilha'
import { baixar } from './zip'

const NIVEL_ROTULO = { critico: 'Crítico', atencao: 'Atenção', info: 'Nota' } as const

/**
 * Exporta o cálculo inteiro para planilha.
 *
 * A ideia é entregar algo que o advogado possa abrir e trabalhar: valores como
 * NÚMERO, não como texto formatado, para que somas e conferências funcionem;
 * uma aba por sucessão, porque cada herança conserva a sua individualidade
 * mesmo cumulada; e uma aba de destino final, que é a resposta que o cliente
 * quer e que nenhum inventário isolado consegue dar.
 */
/** As abas do relatorio, montadas. Separado do download para poder ser testado. */
export function montarAbas(inv: Inventario, r: ResultadoCumulativo): Aba[] {
  const abas: Aba[] = [resumoProcesso(inv, r)]
  if (r.cumulativo) abas.push(destinoFinal(r))
  r.etapas.forEach((etapa) => abas.push(abaDoObito(etapa, r)))
  abas.push(raciocinio(r), ressalvas(r))
  return abas
}

export function montarPlanilha(inv: Inventario, r: ResultadoCumulativo): Blob {
  return gerarXlsx(montarAbas(inv, r))
}

export function exportarXlsx(inv: Inventario, r: ResultadoCumulativo) {
  baixar(montarPlanilha(inv, r), `${nomeArquivo(inv)}.xlsx`)
}

/* ------------------------------------------------------------------ *
 * Aba 1 — o processo em uma tela
 * ------------------------------------------------------------------ */

function resumoProcesso(inv: Inventario, r: ResultadoCumulativo): Aba {
  const linhas: (Celula | null)[][] = []

  linhas.push([c(inv.titulo || 'Cálculo de partilha', 'titulo')])
  linhas.push([
    c(
      `${r.etapas.length} ${r.etapas.length === 1 ? 'sucessão' : 'sucessões'}${
        r.cumulativo ? ' em inventário cumulativo (CPC art. 672)' : ''
      } · gerado em ${hoje()}`,
      'subtitulo',
    ),
  ])
  linhas.push([])

  linhas.push([
    c('Ordem', 'cabecalho'),
    c('Autor da herança', 'cabecalho'),
    c('Data do óbito', 'cabecalho'),
    c('Vínculo', 'cabecalho'),
    c('Regime de bens', 'cabecalho'),
    c('Acervo declarado', 'cabecalho'),
    c('Recebido de outra sucessão', 'cabecalho'),
    c('Meação destacada', 'cabecalho'),
    c('Herança líquida', 'cabecalho'),
    c('Classe chamada', 'cabecalho'),
  ])

  for (const etapa of r.etapas) {
    const { resultado, original, efetivo, aportes } = etapa
    const acervo =
      original.patrimonio.bensComuns + original.patrimonio.bensParticulares
    const aportado = aportes.reduce((s, a) => s + a.centavos, 0n)

    linhas.push([
      c(etapa.indice + 1, 'texto'),
      c(original.nomeFalecido || `Falecido ${etapa.indice + 1}`, 'texto'),
      c(formatarData(original.dataObito), 'texto'),
      c(original.parentesco ?? '', 'texto'),
      c(efetivo.conjuge.existe ? REGIMES[efetivo.conjuge.regime].nome : '—', 'texto'),
      c(acervo, 'moeda'),
      c(centavosParaReais(aportado), 'moeda'),
      c(resultado.meacao ? centavosParaReais(resultado.meacao.valorCentavos) : 0, 'moeda'),
      c(centavosParaReais(resultado.massa.herancaLiquidaCentavos), 'moedaForte'),
      c(resultado.classeLabel, 'texto'),
    ])
  }

  linhas.push([])
  linhas.push([
    c('Total distribuído a beneficiários finais', 'destaque'),
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    c(centavosParaReais(r.totalConsolidadoCentavos), 'moedaForte'),
  ])

  if (r.fundamentos.length > 0) {
    linhas.push([])
    linhas.push([c('Fundamento da cumulação', 'cabecalho'), c('Explicação', 'cabecalho')])
    for (const f of r.fundamentos) {
      linhas.push([c(f.inciso, 'texto'), c(f.texto, 'textoLongo')])
    }
  }

  linhas.push([])
  linhas.push([c(AVISO, 'nota')])

  return {
    nome: 'Processo',
    larguras: [8, 26, 14, 26, 28, 18, 22, 18, 18, 34],
    linhas,
    mesclas: ['A1:J1', 'A2:J2'],
  }
}

/* ------------------------------------------------------------------ *
 * Aba 2 — quem leva o quê no fim de tudo
 * ------------------------------------------------------------------ */

function destinoFinal(r: ResultadoCumulativo): Aba {
  const linhas: (Celula | null)[][] = []
  const total = Number(r.totalConsolidadoCentavos)

  linhas.push([c('Destino final dos bens', 'titulo')])
  linhas.push([
    c(
      'Soma do que cada pessoa recebe em todas as sucessões cumuladas, já descontado o que apenas passou pelo espólio de quem também faleceu.',
      'subtitulo',
    ),
  ])
  linhas.push([])

  linhas.push([
    c('Beneficiário', 'cabecalho'),
    c('Posição', 'cabecalho'),
    c('Total recebido', 'cabecalho'),
    c('% do total', 'cabecalho'),
    c('Situação', 'cabecalho'),
  ])

  for (const q of r.consolidado) {
    linhas.push([
      c(q.nome, 'texto'),
      c(rotuloPapel(q.papel), 'texto'),
      c(centavosParaReais(q.totalCentavos), 'moedaForte'),
      c(total > 0 ? Number(q.totalCentavos) / total : 0, 'percentual'),
      c(q.pendente ?? 'Beneficiário final', 'textoLongo'),
    ])
  }

  linhas.push([])
  linhas.push([])
  linhas.push([c('Detalhamento por origem', 'titulo')])
  linhas.push([])
  linhas.push([
    c('Beneficiário', 'cabecalho'),
    c('Sucessão de', 'cabecalho'),
    c('Título', 'cabecalho'),
    c('Qualificação', 'cabecalho'),
    c('Fração', 'cabecalho'),
    c('Valor', 'cabecalho'),
  ])

  for (const q of r.consolidado) {
    for (const o of q.origens) {
      linhas.push([
        c(q.nome, 'texto'),
        c(o.obitoNome, 'texto'),
        c(rotuloTitulo(o.tipo), 'texto'),
        c(o.representando ? `${o.qualificacao} (representa ${o.representando})` : o.qualificacao, 'textoLongo'),
        c(o.tipo === 'meacao' ? '—' : o.fracao.paraTexto(), 'texto'),
        c(centavosParaReais(o.centavos), 'moeda'),
      ])
    }
  }

  return {
    nome: 'Destino final',
    larguras: [26, 24, 14, 40, 12, 18],
    linhas,
    mesclas: ['A1:E1', 'A2:E2'],
    congelar: 4,
  }
}

/* ------------------------------------------------------------------ *
 * Uma aba por sucessão
 * ------------------------------------------------------------------ */

function abaDoObito(
  etapa: ResultadoCumulativo['etapas'][number],
  r: ResultadoCumulativo,
): Aba {
  const { resultado, original, aportes } = etapa
  const m = resultado.massa
  const linhas: (Celula | null)[][] = []
  const nome = original.nomeFalecido || `Falecido ${etapa.indice + 1}`

  linhas.push([c(`Sucessão de ${nome}`, 'titulo')])
  linhas.push([
    c(
      [
        original.dataObito ? `Óbito em ${formatarData(original.dataObito)}` : null,
        original.parentesco,
        resultado.classeLabel,
      ]
        .filter(Boolean)
        .join(' · '),
      'subtitulo',
    ),
  ])
  linhas.push([])

  /* ---- composição da massa ---- */
  linhas.push([c('Apuração do acervo', 'cabecalho'), c('Valor', 'cabecalho')])
  const linha = (rotulo: string, valor: bigint, estilo: 'moeda' | 'moedaForte' = 'moeda') =>
    linhas.push([c(rotulo, 'texto'), c(centavosParaReais(valor), estilo)])

  linha('Bens comuns do casal (total)', m.bensComunsCentavos)
  linha('Bens particulares do falecido', m.bensParticularesCentavos)
  if (aportes.length > 0) {
    linha(
      'dos quais recebidos de sucessão anterior',
      aportes.reduce((s, a) => s + a.centavos, 0n),
    )
  }
  linha('(−) Dívidas e despesas de funeral', m.dividasCentavos)
  if (resultado.meacao) linha('(−) Meação do cônjuge sobrevivente', resultado.meacao.valorCentavos)
  linha('Herança líquida a partilhar', m.herancaLiquidaCentavos, 'moedaForte')
  if (m.temHerdeirosNecessarios) {
    linha('Legítima (intocável por testamento)', m.legitimaCentavos)
    linha('Parte disponível', m.disponivelCentavos)
  }

  /* ---- aportes ---- */
  if (aportes.length > 0) {
    linhas.push([])
    linhas.push([
      c('Recebido de sucessão anterior', 'cabecalho'),
      c('Título', 'cabecalho'),
      c('Entrou como', 'cabecalho'),
      c('Valor', 'cabecalho'),
    ])
    for (const a of aportes) {
      linhas.push([
        c(`Sucessão de ${a.origemNome}`, 'texto'),
        c(rotuloTitulo(a.tipo), 'texto'),
        c(a.destino === 'comum' ? 'Bem comum (há meação)' : 'Bem particular', 'texto'),
        c(centavosParaReais(a.centavos), 'moeda'),
      ])
    }
  }

  /* ---- quinhões ---- */
  linhas.push([])
  linhas.push([
    c('Herdeiro / beneficiário', 'cabecalho'),
    c('Qualificação', 'cabecalho'),
    c('Fração', 'cabecalho'),
    c('%', 'cabecalho'),
    c('Valor', 'cabecalho'),
    c('Fundamento legal', 'cabecalho'),
    c('Observação', 'cabecalho'),
  ])

  if (resultado.meacao) {
    linhas.push([
      c(resultado.meacao.nome, 'texto'),
      c('Meação — direito próprio, não é herança', 'textoLongo'),
      c('—', 'texto'),
      c('', 'texto'),
      c(centavosParaReais(resultado.meacao.valorCentavos), 'moeda'),
      c('CC art. 1.829 e regime de bens', 'textoLongo'),
      c(destinoTexto(resultado.meacao.destinoObitoId, r), 'textoLongo'),
    ])
  }

  for (const q of resultado.quotas) {
    linhas.push([
      c(q.nome, 'texto'),
      c(q.representando ? `${q.qualificacao} (representa ${q.representando})` : q.qualificacao, 'textoLongo'),
      c(q.fracaoHeranca.paraTexto(), 'texto'),
      c(q.fracaoHeranca.paraNumero(), 'percentual'),
      c(centavosParaReais(q.valorCentavos), 'moedaForte'),
      c(q.fundamento.join('; '), 'textoLongo'),
      c(
        [q.observacao, destinoTexto(q.destinoObitoId, r), q.transmissaoPendente ? PENDENTE : null]
          .filter(Boolean)
          .join(' '),
        'textoLongo',
      ),
    ])
  }

  linhas.push([])
  linhas.push([
    c('Total da herança', 'destaque'),
    null,
    null,
    null,
    c(centavosParaReais(m.herancaLiquidaCentavos), 'moedaForte'),
  ])

  return {
    nome: `${etapa.indice + 1} - ${nome}`,
    larguras: [26, 38, 10, 10, 18, 44, 46],
    linhas,
    mesclas: ['A1:G1', 'A2:G2'],
  }
}

/* ------------------------------------------------------------------ *
 * Raciocínio e ressalvas
 * ------------------------------------------------------------------ */

function raciocinio(r: ResultadoCumulativo): Aba {
  const linhas: (Celula | null)[][] = []
  linhas.push([c('Fundamentação passo a passo', 'titulo')])
  linhas.push([])
  linhas.push([
    c('Sucessão', 'cabecalho'),
    c('#', 'cabecalho'),
    c('Passo', 'cabecalho'),
    c('Explicação', 'cabecalho'),
    c('Cálculo', 'cabecalho'),
    c('Fundamento', 'cabecalho'),
  ])

  for (const etapa of r.etapas) {
    etapa.resultado.passos.forEach((p, i) => {
      linhas.push([
        c(etapa.original.nomeFalecido || `Falecido ${etapa.indice + 1}`, 'texto'),
        c(i + 1, 'texto'),
        c(p.titulo, 'textoLongo'),
        c(p.texto, 'textoLongo'),
        c(p.conta ?? '', 'textoLongo'),
        c(p.fundamento ?? '', 'textoLongo'),
      ])
    })
  }

  return {
    nome: 'Raciocínio',
    larguras: [22, 5, 34, 82, 40, 38],
    linhas,
    mesclas: ['A1:F1'],
    congelar: 3,
  }
}

function ressalvas(r: ResultadoCumulativo): Aba {
  const linhas: (Celula | null)[][] = []
  linhas.push([c('Pontos de atenção', 'titulo')])
  linhas.push([])
  linhas.push([
    c('Nível', 'cabecalho'),
    c('Sucessão', 'cabecalho'),
    c('Ponto', 'cabecalho'),
    c('Detalhe', 'cabecalho'),
    c('Fundamento', 'cabecalho'),
  ])

  for (const a of reunirAlertas(r)) {
    linhas.push([
      c(NIVEL_ROTULO[a.nivel], a.nivel === 'critico' ? 'destaque' : 'texto'),
      c(a.obitoNome ?? '—', 'texto'),
      c(a.titulo, 'textoLongo'),
      c(a.texto, 'textoLongo'),
      c(a.fundamento ?? '', 'textoLongo'),
    ])
  }

  linhas.push([])
  linhas.push([c(AVISO, 'nota')])

  return {
    nome: 'Ressalvas',
    larguras: [12, 22, 38, 90, 38],
    linhas,
    mesclas: ['A1:E1'],
    congelar: 3,
  }
}

/* ------------------------------------------------------------------ *
 * Auxiliares compartilhados
 * ------------------------------------------------------------------ */

export const AVISO =
  'Cálculo da sucessão legítima conforme o Código Civil (Lei 10.406/2002) e a jurisprudência consolidada do STF e do STJ. Não inclui ITCMD, custas, honorários de inventário, bens gravados ou impenhoráveis, previdência privada, seguro de vida nem as particularidades que só a leitura dos documentos revela. Não substitui a análise de um advogado no caso concreto.'

const PENDENTE =
  'Faleceu depois da abertura da sucessão e o inventário dele não foi cadastrado: o destino final deste valor está em aberto.'

export function rotuloPapel(papel: string): string {
  const mapa: Record<string, string> = {
    conjuge: 'Cônjuge / companheiro(a)',
    descendente: 'Descendente',
    ascendente: 'Ascendente',
    colateral: 'Colateral',
    legado: 'Beneficiário de testamento',
    municipio: 'Município (vacância)',
    falecido: 'Autor da herança',
  }
  return mapa[papel] ?? papel
}

export function rotuloTitulo(tipo: string): string {
  if (tipo === 'meacao') return 'Meação'
  if (tipo === 'legado') return 'Legado'
  return 'Herança'
}

export function destinoTexto(
  destinoObitoId: string | undefined,
  r: ResultadoCumulativo,
): string {
  if (!destinoObitoId) return ''
  const alvo = r.etapas.find((e) => e.original.id === destinoObitoId)
  if (!alvo) return ''
  return `Transmitido ao espólio de ${alvo.original.nomeFalecido || 'outro falecido'} e repartido na sucessão dele.`
}

export function formatarData(iso?: string): string {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  if (!a || !m || !d) return iso
  return `${d}/${m}/${a}`
}

export function hoje(): string {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function nomeArquivo(inv: Inventario): string {
  const base =
    inv.titulo?.trim() ||
    inv.obitos.map((o) => o.nomeFalecido).filter(Boolean).join(' e ') ||
    'partilha'
  return base
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60)
}
