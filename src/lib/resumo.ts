import type { Caso, Resultado } from '@/engine/tipos'
import { REGIMES } from '@/engine/tipos'
import { formatarCentavos } from './moeda'

/** Resumo em texto puro, pronto para colar num parecer, e-mail ou anotação. */
export function resumoTexto(caso: Caso, r: Resultado): string {
  const L: string[] = []
  const nome = caso.nomeFalecido || 'o autor da herança'

  L.push(`PARTILHA — SUCESSÃO DE ${nome.toUpperCase()}`)
  L.push('='.repeat(52))
  L.push('')

  L.push('ACERVO')
  if (r.massa.bensComunsCentavos > 0n) {
    L.push(`  Bens comuns do casal .... ${formatarCentavos(r.massa.bensComunsCentavos)}`)
  }
  if (r.massa.bensParticularesCentavos > 0n) {
    L.push(`  Bens particulares ....... ${formatarCentavos(r.massa.bensParticularesCentavos)}`)
  }
  if (r.massa.dividasCentavos > 0n) {
    L.push(`  (−) Dívidas e funeral ... ${formatarCentavos(r.massa.dividasCentavos)}`)
  }
  if (r.meacao) {
    L.push(`  (−) Meação do cônjuge ... ${formatarCentavos(r.meacao.valorCentavos)}`)
  }
  L.push(`  HERANÇA LÍQUIDA ......... ${formatarCentavos(r.massa.herancaLiquidaCentavos)}`)
  L.push('')

  if (caso.conjuge.existe) {
    const v = caso.conjuge.vinculo === 'uniao_estavel' ? 'União estável' : 'Casamento'
    L.push(`REGIME: ${v} — ${REGIMES[caso.conjuge.regime].nome}`)
    L.push('')
  }

  if (r.massa.temHerdeirosNecessarios) {
    L.push(
      `LEGÍTIMA ${formatarCentavos(r.massa.legitimaCentavos)} · DISPONÍVEL ${formatarCentavos(r.massa.disponivelCentavos)}`,
    )
    L.push('')
  }

  L.push(`CLASSE CHAMADA: ${r.classeLabel}`)
  L.push('')

  L.push('QUINHÕES')
  if (r.meacao) {
    L.push(
      `  ${r.meacao.nome} — MEAÇÃO (não é herança): ${formatarCentavos(r.meacao.valorCentavos)}`,
    )
  }
  for (const q of r.quotas) {
    const rep = q.representando ? ` [representa ${q.representando}]` : ''
    L.push(
      `  ${q.nome} (${q.qualificacao})${rep}: ${q.fracaoHeranca.paraTexto()} = ${formatarCentavos(q.valorCentavos)}`,
    )
    L.push(`      ${q.fundamento.join('; ')}`)
  }
  L.push('')

  L.push('FUNDAMENTAÇÃO')
  r.passos.forEach((p, i) => {
    L.push(`  ${i + 1}. ${p.titulo}`)
    L.push(`     ${p.texto}`)
    if (p.conta) L.push(`     ${p.conta}`)
    if (p.fundamento) L.push(`     (${p.fundamento})`)
  })
  L.push('')

  const relevantes = r.alertas.filter((a) => a.nivel !== 'info')
  if (relevantes.length > 0) {
    L.push('PONTOS DE ATENÇÃO')
    for (const a of relevantes) {
      L.push(`  [${a.nivel.toUpperCase()}] ${a.titulo}`)
      L.push(`     ${a.texto}`)
      if (a.fundamento) L.push(`     (${a.fundamento})`)
    }
    L.push('')
  }

  L.push('-'.repeat(52))
  L.push(
    'Cálculo da sucessão legítima conforme o Código Civil. Não inclui ITCMD,',
  )
  L.push(
    'custas, honorários nem particularidades do acervo. Não substitui a análise',
  )
  L.push('de um advogado no caso concreto.')

  return L.join('\n')
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
