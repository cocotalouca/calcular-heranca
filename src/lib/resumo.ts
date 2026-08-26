import type { Inventario, ResultadoCumulativo } from '@/engine/tipos'
import { REGIMES } from '@/engine/tipos'
import { formatarCentavos } from './moeda'

/** Resumo em texto puro, pronto para colar num parecer, e-mail ou anotação. */
export function resumoTexto(inv: Inventario, r: ResultadoCumulativo): string {
  const L: string[] = []
  const titulo = inv.titulo?.trim() || tituloPadrao(inv)

  L.push(titulo.toUpperCase())
  L.push('='.repeat(Math.max(28, Math.min(72, titulo.length))))
  if (r.cumulativo) {
    L.push(`Inventário cumulativo — ${r.etapas.length} sucessões (CPC art. 672)`)
  }
  L.push('')

  /* ---------------- destino final, quando há mais de um óbito ---------------- */

  if (r.cumulativo) {
    L.push('DESTINO FINAL DOS BENS')
    L.push('-'.repeat(52))
    for (const q of r.consolidado) {
      L.push(`  ${q.nome}: ${formatarCentavos(q.totalCentavos)}`)
      for (const o of q.origens) {
        const como =
          o.tipo === 'meacao' ? 'meação' : `${o.qualificacao} — ${o.fracao.paraTexto()}`
        L.push(`      · de ${o.obitoNome} (${como}): ${formatarCentavos(o.centavos)}`)
      }
      if (q.pendente) L.push(`      ! ${q.pendente}`)
    }
    L.push('')
    L.push(`  TOTAL: ${formatarCentavos(r.totalConsolidadoCentavos)}`)
    L.push('')

    if (r.fundamentos.length > 0) {
      L.push('FUNDAMENTO DA CUMULAÇÃO')
      for (const f of r.fundamentos) {
        L.push(`  ${f.inciso}`)
        L.push(`     ${f.texto}`)
      }
      L.push('')
    }
  }

  /* ---------------- cada sucessão ---------------- */

  for (const etapa of r.etapas) {
    const { resultado, original, aportes } = etapa
    const m = resultado.massa
    const nome = original.nomeFalecido || `Falecido ${etapa.indice + 1}`

    L.push('='.repeat(52))
    L.push(`SUCESSÃO DE ${nome.toUpperCase()}`)
    if (original.dataObito) L.push(`Óbito em ${formatarData(original.dataObito)}`)
    if (original.parentesco) L.push(original.parentesco)
    L.push('')

    L.push('ACERVO')
    if (m.bensComunsCentavos > 0n) {
      L.push(`  Bens comuns do casal .... ${formatarCentavos(m.bensComunsCentavos)}`)
    }
    if (m.bensParticularesCentavos > 0n) {
      L.push(`  Bens particulares ....... ${formatarCentavos(m.bensParticularesCentavos)}`)
    }
    for (const a of aportes) {
      L.push(
        `    (herdado de ${a.origemNome}) ... ${formatarCentavos(a.centavos)}`,
      )
    }
    if (m.dividasCentavos > 0n) {
      L.push(`  (−) Dívidas e funeral ... ${formatarCentavos(m.dividasCentavos)}`)
    }
    if (resultado.meacao) {
      L.push(`  (−) Meação do cônjuge ... ${formatarCentavos(resultado.meacao.valorCentavos)}`)
    }
    L.push(`  HERANÇA LÍQUIDA ......... ${formatarCentavos(m.herancaLiquidaCentavos)}`)
    L.push('')

    if (original.conjuge.existe) {
      const v = original.conjuge.vinculo === 'uniao_estavel' ? 'União estável' : 'Casamento'
      L.push(`REGIME: ${v} — ${REGIMES[original.conjuge.regime].nome}`)
      L.push('')
    }

    if (m.temHerdeirosNecessarios) {
      L.push(
        `LEGÍTIMA ${formatarCentavos(m.legitimaCentavos)} · DISPONÍVEL ${formatarCentavos(m.disponivelCentavos)}`,
      )
      L.push('')
    }

    L.push(`CLASSE CHAMADA: ${resultado.classeLabel}`)
    L.push('')

    L.push('QUINHÕES')
    if (resultado.meacao) {
      L.push(
        `  ${resultado.meacao.nome} — MEAÇÃO (não é herança): ${formatarCentavos(resultado.meacao.valorCentavos)}`,
      )
    }
    for (const q of resultado.quotas) {
      const rep = q.representando ? ` [representa ${q.representando}]` : ''
      L.push(
        `  ${q.nome} (${q.qualificacao})${rep}: ${q.fracaoHeranca.paraTexto()} = ${formatarCentavos(q.valorCentavos)}`,
      )
      L.push(`      ${q.fundamento.join('; ')}`)
      if (q.destinoObitoId) {
        const alvo = r.etapas.find((e) => e.original.id === q.destinoObitoId)
        if (alvo) {
          L.push(
            `      >> transmitido ao espólio de ${alvo.original.nomeFalecido || 'outro falecido'}`,
          )
        }
      }
      if (q.transmissaoPendente) {
        L.push('      >> falecido depois da abertura; inventário dele não cadastrado')
      }
    }
    L.push('')

    L.push('FUNDAMENTAÇÃO')
    resultado.passos.forEach((p, i) => {
      L.push(`  ${i + 1}. ${p.titulo}`)
      L.push(`     ${p.texto}`)
      if (p.conta) L.push(`     ${p.conta}`)
      if (p.fundamento) L.push(`     (${p.fundamento})`)
    })
    L.push('')
  }

  /* ---------------- ressalvas ---------------- */

  const relevantes = r.alertas.filter((a) => a.nivel !== 'info')
  if (relevantes.length > 0) {
    L.push('='.repeat(52))
    L.push('PONTOS DE ATENÇÃO')
    for (const a of relevantes) {
      const onde = a.obitoNome ? ` — ${a.obitoNome}` : ''
      L.push(`  [${a.nivel.toUpperCase()}] ${a.titulo}${onde}`)
      L.push(`     ${a.texto}`)
      if (a.fundamento) L.push(`     (${a.fundamento})`)
    }
    L.push('')
  }

  L.push('-'.repeat(52))
  L.push('Cálculo da sucessão legítima conforme o Código Civil. Não inclui ITCMD,')
  L.push('custas, honorários nem particularidades do acervo. Não substitui a análise')
  L.push('de um advogado no caso concreto.')

  return L.join('\n')
}

function tituloPadrao(inv: Inventario): string {
  const nomes = inv.obitos.map((o) => o.nomeFalecido).filter(Boolean)
  if (nomes.length === 0) return 'Cálculo de partilha'
  if (nomes.length === 1) return `Partilha — sucessão de ${nomes[0]}`
  return `Partilha — sucessões de ${nomes.join(', ')}`
}

function formatarData(iso: string): string {
  const [a, m, d] = iso.split('-')
  if (!a || !m || !d) return iso
  return `${d}/${m}/${a}`
}

export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    // Fallback para navegadores sem permissão de área de transferência.
    const ta = document.createElement('textarea')
    ta.value = texto
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  }
}
