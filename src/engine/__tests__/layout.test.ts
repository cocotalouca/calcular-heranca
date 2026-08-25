import { describe, expect, it } from 'vitest'
import { montarGrafo } from '@/components/arvore/layout'
import { calcular } from '../calcular'
import { CENARIOS } from '@/data/cenarios'
import { caso, conjuge, irmao, patrimonio, pessoa, semAscendentes, semColaterais } from './fabrica'

// Mesmas medidas do renderer, convertidas para unidades de grade.
const GX = 178
const GY = 138
const LARGURA_NO = 152
const ALTURA_NO = 66
const MEIA_LARGURA = LARGURA_NO / GX / 2
const MEIA_ALTURA = ALTURA_NO / GY / 2

function sobreposicoes(nos: { id: string; nome: string; x: number; y: number }[]) {
  const colisoes: string[] = []
  for (let i = 0; i < nos.length; i++) {
    for (let j = i + 1; j < nos.length; j++) {
      const a = nos[i]
      const b = nos[j]
      const dx = Math.abs(a.x - b.x)
      const dy = Math.abs(a.y - b.y)
      if (dx < MEIA_LARGURA * 2 && dy < MEIA_ALTURA * 2) {
        colisoes.push(`${a.nome}(${a.x.toFixed(2)},${a.y}) × ${b.nome}(${b.x.toFixed(2)},${b.y})`)
      }
    }
  }
  return colisoes
}

describe('layout da árvore genealógica', () => {
  it('nenhum cenário pronto produz nós sobrepostos', () => {
    for (const c of CENARIOS) {
      const caso = c.montar()
      const g = montarGrafo(caso, calcular(caso))
      expect(sobreposicoes(g.nos), `cenário "${c.titulo}"`).toEqual([])
    }
  })

  it('todo herdeiro do resultado aparece na árvore', () => {
    for (const c of CENARIOS) {
      const caso = c.montar()
      const r = calcular(caso)
      const g = montarGrafo(caso, r)
      const idsNaArvore = new Set(g.nos.map((n) => n.id))
      for (const q of r.quotas) {
        expect(
          idsNaArvore.has(q.id),
          `cenário "${c.titulo}": ${q.nome} recebe quinhão mas não está na árvore`,
        ).toBe(true)
      }
    }
  })

  it('todo nó da árvore com quota traz a mesma fração do resultado', () => {
    for (const c of CENARIOS) {
      const caso = c.montar()
      const r = calcular(caso)
      const g = montarGrafo(caso, r)
      for (const no of g.nos) {
        if (!no.quota) continue
        const q = r.quotas.find((x) => x.id === no.id)
        expect(q, `${c.titulo}: nó ${no.nome} tem quota fantasma`).toBeDefined()
        expect(no.quota.fracaoHeranca.paraTexto()).toBe(q!.fracaoHeranca.paraTexto())
      }
    }
  })

  it('uma família densa em quatro gerações continua sem colisões', () => {
    const denso = caso({
      nomeFalecido: 'Patriarca',
      conjuge: conjuge({ regime: 'separacao_convencional' }),
      descendentes: [
        pessoa('A', 'pre_morto', [
          pessoa('A1', 'pre_morto', [pessoa('A1a'), pessoa('A1b'), pessoa('A1c')]),
          pessoa('A2'),
        ], true),
        pessoa('B', 'vivo', [], true),
        pessoa('C', 'pre_morto', [pessoa('C1'), pessoa('C2'), pessoa('C3'), pessoa('C4')], true),
      ],
      patrimonio: patrimonio({ bensParticulares: 1_000_000 }),
    })
    const g = montarGrafo(denso, calcular(denso))
    expect(sobreposicoes(g.nos)).toEqual([])
    // 4 gerações: falecido + cônjuge + 3 filhos + 6 netos + 3 bisnetos
    expect(g.nos.length).toBe(14)
    expect(g.nos.filter((n) => n.y === 3).map((n) => n.nome).sort()).toEqual([
      'A1a',
      'A1b',
      'A1c',
    ])
  })

  it('ascendentes, colaterais e legados convivem sem se atropelar', () => {
    const cheio = caso({
      nomeFalecido: 'Complexo',
      conjuge: conjuge({ regime: 'separacao_convencional' }),
      ascendentes: {
        ...semAscendentes,
        pai: true,
        mae: true,
        avosPaternos: 2,
        avosMaternos: 2,
        bisavosPaternos: 4,
        bisavosMaternos: 4,
      },
      colaterais: {
        ...semColaterais,
        irmaos: [
          irmao('I1', 'bilateral', 'pre_morto', [pessoa('S1'), pessoa('S2')]),
          irmao('I2', 'unilateral', 'vivo'),
          irmao('I3', 'bilateral', 'pre_morto', [pessoa('S3')]),
        ],
      },
      patrimonio: patrimonio({
        bensParticulares: 900_000,
        legados: [
          { id: 'l1', beneficiario: 'Fundação', modo: 'percentual_heranca', quantia: 20 },
          { id: 'l2', beneficiario: 'Amigo', modo: 'percentual_heranca', quantia: 10 },
        ],
      }),
    })
    const g = montarGrafo(cheio, calcular(cheio))
    expect(sobreposicoes(g.nos)).toEqual([])
  })

  it('os limites do grafo envolvem todos os nós', () => {
    for (const c of CENARIOS) {
      const caso = c.montar()
      const g = montarGrafo(caso, calcular(caso))
      for (const n of g.nos) {
        expect(n.x).toBeGreaterThanOrEqual(g.limites.minX)
        expect(n.x).toBeLessThanOrEqual(g.limites.maxX)
        expect(n.y).toBeGreaterThanOrEqual(g.limites.minY)
        expect(n.y).toBeLessThanOrEqual(g.limites.maxY)
      }
    }
  })
})
