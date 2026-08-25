import { describe, expect, it } from 'vitest'
import { calcular } from '../calcular'
import { Fracao } from '@/lib/fracao'
import {
  caso,
  comRegime,
  conjuge,
  irmao,
  patrimonio,
  pessoa,
  semAscendentes,
  semColaterais,
  semConjuge,
} from './fabrica'
import type { Caso, Resultado } from '../tipos'

/* ----------------------------- utilidades ----------------------------- */

/** Fração de quem tem esse nome, como texto ("1/4"). */
function fr(r: Resultado, nome: string): string {
  const q = r.quotas.find((x) => x.nome === nome)
  if (!q) throw new Error(`quota não encontrada: ${nome} (tem: ${r.quotas.map((x) => x.nome).join(', ')})`)
  return q.fracaoHeranca.paraTexto()
}

function valor(r: Resultado, nome: string): bigint {
  const q = r.quotas.find((x) => x.nome === nome)
  if (!q) throw new Error(`quota não encontrada: ${nome}`)
  return q.valorCentavos
}

function nomes(r: Resultado): string[] {
  return r.quotas.map((q) => q.nome).sort()
}

/** Invariantes que TODO resultado precisa respeitar. */
function conferirIntegridade(r: Resultado) {
  const soma = Fracao.soma(r.quotas.map((q) => q.fracaoHeranca))
  if (r.quotas.length > 0) {
    expect(soma.paraTexto(), 'as frações devem somar exatamente 1').toBe('1')
  }
  const centavos = r.quotas.reduce((s, q) => s + q.valorCentavos, 0n)
  expect(centavos, 'a soma em centavos deve fechar com a herança líquida').toBe(
    r.massa.herancaLiquidaCentavos,
  )
  for (const q of r.quotas) {
    expect(q.valorCentavos >= 0n, `${q.nome} não pode ter quinhão negativo`).toBe(true)
  }
}

function rodar(c: Caso): Resultado {
  const r = calcular(c)
  conferirIntegridade(r)
  return r
}

const M = (reais: number) => reais

/* ==================================================================== *
 * 1ª classe — descendentes e a concorrência do cônjuge
 * ==================================================================== */

describe('descendentes e concorrência do cônjuge (art. 1.829, I)', () => {
  it('comunhão parcial SEM bens particulares: cônjuge fica só com a meação', () => {
    const r = rodar(
      caso({
        conjuge: comRegime('comunhao_parcial'),
        descendentes: [pessoa('Ana', 'vivo', [], true), pessoa('Bruno', 'vivo', [], true)],
        patrimonio: patrimonio({ bensComuns: M(1_000_000) }),
      }),
    )
    expect(r.classe).toBe('descendentes')
    expect(nomes(r)).toEqual(['Ana', 'Bruno'])
    expect(fr(r, 'Ana')).toBe('1/2')
    expect(r.meacao?.valorCentavos).toBe(50_000_000n)
    expect(r.massa.herancaLiquidaCentavos).toBe(50_000_000n)
  })

  it('comunhão universal: cônjuge nunca concorre, mesmo com bens particulares', () => {
    const r = rodar(
      caso({
        conjuge: comRegime('comunhao_universal'),
        descendentes: [pessoa('Ana', 'vivo', [], true)],
        patrimonio: patrimonio({ bensComuns: M(800_000), bensParticulares: M(200_000) }),
      }),
    )
    expect(nomes(r)).toEqual(['Ana'])
    expect(fr(r, 'Ana')).toBe('1')
  })

  it('separação obrigatória: cônjuge não concorre e, sem Súmula 377, não tem meação', () => {
    const r = rodar(
      caso({
        conjuge: comRegime('separacao_obrigatoria', { sumula377: false }),
        descendentes: [pessoa('Ana'), pessoa('Bruno')],
        patrimonio: patrimonio({ bensParticulares: M(600_000) }),
      }),
    )
    expect(r.meacao).toBeNull()
    expect(fr(r, 'Ana')).toBe('1/2')
  })

  it('separação obrigatória com Súmula 377: há meação sobre os aquestos, mas segue sem concorrência', () => {
    const r = rodar(
      caso({
        conjuge: comRegime('separacao_obrigatoria', { sumula377: true }),
        descendentes: [pessoa('Ana')],
        patrimonio: patrimonio({ bensComuns: M(400_000), bensParticulares: M(100_000) }),
      }),
    )
    expect(r.meacao?.valorCentavos).toBe(20_000_000n)
    expect(fr(r, 'Ana')).toBe('1')
    expect(r.massa.herancaLiquidaCentavos).toBe(30_000_000n)
  })

  it('separação convencional: cônjuge concorre sobre toda a herança — 3 filhos, 1/4 para cada', () => {
    const r = rodar(
      caso({
        conjuge: comRegime('separacao_convencional'),
        descendentes: [
          pessoa('Ana', 'vivo', [], true),
          pessoa('Bruno', 'vivo', [], true),
          pessoa('Carla', 'vivo', [], true),
        ],
        patrimonio: patrimonio({ bensParticulares: M(1_200_000) }),
      }),
    )
    expect(r.meacao).toBeNull()
    expect(fr(r, 'Cônjuge')).toBe('1/4')
    expect(fr(r, 'Ana')).toBe('1/4')
    expect(valor(r, 'Cônjuge')).toBe(30_000_000n)
  })

  it('reserva de 1/4 com 4 filhos comuns: cônjuge 1/4 e cada filho 3/16', () => {
    const r = rodar(
      caso({
        conjuge: comRegime('separacao_convencional'),
        descendentes: ['Ana', 'Bruno', 'Carla', 'Diego'].map((n) =>
          pessoa(n, 'vivo', [], true),
        ),
        patrimonio: patrimonio({ bensParticulares: M(1_600_000) }),
      }),
    )
    expect(fr(r, 'Cônjuge')).toBe('1/4')
    expect(fr(r, 'Ana')).toBe('3/16')
    expect(valor(r, 'Cônjuge')).toBe(40_000_000n)
    expect(valor(r, 'Ana')).toBe(30_000_000n)
  })

  it('sem a reserva: 4 filhos exclusivos do falecido, todos com 1/5 igual ao cônjuge', () => {
    const r = rodar(
      caso({
        conjuge: comRegime('separacao_convencional'),
        descendentes: ['Ana', 'Bruno', 'Carla', 'Diego'].map((n) =>
          pessoa(n, 'vivo', [], false),
        ),
        patrimonio: patrimonio({ bensParticulares: M(1_000_000) }),
      }),
    )
    expect(fr(r, 'Cônjuge')).toBe('1/5')
    expect(fr(r, 'Ana')).toBe('1/5')
  })

  it('filiação híbrida: por padrão (Enunciado 527) não se reserva a quarta parte', () => {
    const base = {
      conjuge: comRegime('separacao_convencional'),
      descendentes: [
        pessoa('Ana', 'vivo', [], true),
        pessoa('Bruno', 'vivo', [], true),
        pessoa('Carla', 'vivo', [], true),
        pessoa('Diego', 'vivo', [], false),
      ],
      patrimonio: patrimonio({ bensParticulares: M(1_000_000) }),
    }
    const semReserva = rodar(caso(base))
    expect(fr(semReserva, 'Cônjuge')).toBe('1/5')
    expect(semReserva.alertas.some((a) => a.titulo.includes('híbrida'))).toBe(true)

    const comReserva = rodar(
      caso({
        ...base,
        opcoes: { reservaQuartoFiliacaoHibrida: true, concorrenciaSoBensParticulares: true },
      }),
    )
    expect(fr(comReserva, 'Cônjuge')).toBe('1/4')
    expect(fr(comReserva, 'Ana')).toBe('3/16')
  })
})

/* ==================================================================== *
 * A tese do STJ sobre comunhão parcial
 * ==================================================================== */

describe('comunhão parcial COM bens particulares (STJ REsp 1.368.123/SP)', () => {
  /**
   * Comuns 600k (meação 300k ao cônjuge, 300k ao espólio) + particulares 300k.
   * Herança = 600k. A concorrência só toca os 300k particulares:
   *   cônjuge = 1/3 de 300k = 100k -> 1/6 da herança
   *   cada filho = 100k (particulares) + 150k (comuns) = 250k -> 5/12
   */
  it('a concorrência incide apenas sobre os bens particulares', () => {
    const r = rodar(
      caso({
        conjuge: comRegime('comunhao_parcial'),
        descendentes: [pessoa('Ana', 'vivo', [], true), pessoa('Bruno', 'vivo', [], true)],
        patrimonio: patrimonio({ bensComuns: M(600_000), bensParticulares: M(300_000) }),
      }),
    )
    expect(r.massa.herancaLiquidaCentavos).toBe(60_000_000n)
    expect(r.massa.parcelaComumCentavos).toBe(30_000_000n)
    expect(r.massa.parcelaParticularCentavos).toBe(30_000_000n)
    expect(fr(r, 'Cônjuge')).toBe('1/6')
    expect(fr(r, 'Ana')).toBe('5/12')
    expect(valor(r, 'Cônjuge')).toBe(10_000_000n)
    expect(valor(r, 'Ana')).toBe(25_000_000n)
  })

  it('a tese alternativa (concorrência sobre toda a herança) muda o resultado', () => {
    const r = rodar(
      caso({
        conjuge: comRegime('comunhao_parcial'),
        descendentes: [pessoa('Ana', 'vivo', [], true), pessoa('Bruno', 'vivo', [], true)],
        patrimonio: patrimonio({ bensComuns: M(600_000), bensParticulares: M(300_000) }),
        opcoes: { reservaQuartoFiliacaoHibrida: false, concorrenciaSoBensParticulares: false },
      }),
    )
    expect(fr(r, 'Cônjuge')).toBe('1/3')
    expect(fr(r, 'Ana')).toBe('1/3')
  })

  it('a reserva de 1/4 opera dentro da sub-massa particular', () => {
    // 4 filhos comuns; particulares 400k, comuns 800k (meação 400k).
    // Particulares: cônjuge 1/4 = 100k; filhos 300k/4 = 75k cada.
    // Comuns (400k ao espólio): só filhos, 100k cada.
    const r = rodar(
      caso({
        conjuge: comRegime('comunhao_parcial'),
        descendentes: ['Ana', 'Bruno', 'Carla', 'Diego'].map((n) =>
          pessoa(n, 'vivo', [], true),
        ),
        patrimonio: patrimonio({ bensComuns: M(800_000), bensParticulares: M(400_000) }),
      }),
    )
    expect(valor(r, 'Cônjuge')).toBe(10_000_000n)
    expect(valor(r, 'Ana')).toBe(17_500_000n)
  })
})

/* ==================================================================== *
 * Representação, renúncia e exclusão
 * ==================================================================== */

describe('direito de representação e afastamento de herdeiros', () => {
  it('filho pré-morto: os netos representam e dividem a quota do pai', () => {
    const r = rodar(
      caso({
        descendentes: [
          pessoa('Ana'),
          pessoa('Bruno', 'pre_morto', [pessoa('Caio'), pessoa('Duda')]),
        ],
        patrimonio: patrimonio({ bensParticulares: M(400_000) }),
      }),
    )
    expect(nomes(r)).toEqual(['Ana', 'Caio', 'Duda'])
    expect(fr(r, 'Ana')).toBe('1/2')
    expect(fr(r, 'Caio')).toBe('1/4')
    expect(valor(r, 'Caio')).toBe(10_000_000n)
  })

  it('representação em cadeia: neto pré-morto é representado pelo bisneto', () => {
    const r = rodar(
      caso({
        descendentes: [
          pessoa('Ana'),
          pessoa('Bruno', 'pre_morto', [
            pessoa('Caio'),
            pessoa('Duda', 'pre_morto', [pessoa('Enzo'), pessoa('Bia')]),
          ]),
        ],
        patrimonio: patrimonio({ bensParticulares: M(800_000) }),
      }),
    )
    expect(fr(r, 'Ana')).toBe('1/2')
    expect(fr(r, 'Caio')).toBe('1/4')
    expect(fr(r, 'Enzo')).toBe('1/8')
    expect(fr(r, 'Bia')).toBe('1/8')
  })

  it('renunciante não é representado: a quota acresce ao co-herdeiro', () => {
    const r = rodar(
      caso({
        descendentes: [
          pessoa('Ana'),
          pessoa('Bruno', 'renunciante', [pessoa('Caio'), pessoa('Duda')]),
        ],
        patrimonio: patrimonio({ bensParticulares: M(400_000) }),
      }),
    )
    expect(nomes(r)).toEqual(['Ana'])
    expect(fr(r, 'Ana')).toBe('1')
  })

  it('art. 1.811: renunciando TODOS os filhos, os netos sobem por cabeça', () => {
    const r = rodar(
      caso({
        descendentes: [
          pessoa('Ana', 'renunciante', [pessoa('Caio'), pessoa('Duda')]),
          pessoa('Bruno', 'renunciante', [pessoa('Elis')]),
        ],
        patrimonio: patrimonio({ bensParticulares: M(300_000) }),
      }),
    )
    expect(nomes(r)).toEqual(['Caio', 'Duda', 'Elis'])
    // Por cabeça: 1/3 para cada. Por estirpe seriam 1/4, 1/4 e 1/2.
    expect(fr(r, 'Caio')).toBe('1/3')
    expect(fr(r, 'Elis')).toBe('1/3')
    expect(r.alertas.some((a) => a.titulo.includes('por cabeça'))).toBe(true)
  })

  it('indignidade tem efeito pessoal: os filhos do excluído representam', () => {
    const r = rodar(
      caso({
        descendentes: [pessoa('Ana'), pessoa('Bruno', 'indigno', [pessoa('Caio')])],
        patrimonio: patrimonio({ bensParticulares: M(200_000) }),
      }),
    )
    expect(nomes(r)).toEqual(['Ana', 'Caio'])
    expect(fr(r, 'Caio')).toBe('1/2')
  })

  it('comoriente é tratado como pré-morto para fins de representação', () => {
    const r = rodar(
      caso({
        descendentes: [pessoa('Ana'), pessoa('Bruno', 'comoriente', [pessoa('Caio')])],
        patrimonio: patrimonio({ bensParticulares: M(200_000) }),
      }),
    )
    expect(fr(r, 'Caio')).toBe('1/2')
  })

  it('filho pré-morto sem descendentes some da partilha', () => {
    const r = rodar(
      caso({
        descendentes: [pessoa('Ana'), pessoa('Bruno', 'pre_morto', [])],
        patrimonio: patrimonio({ bensParticulares: M(100_000) }),
      }),
    )
    expect(nomes(r)).toEqual(['Ana'])
    expect(fr(r, 'Ana')).toBe('1')
  })

  it('a reserva de 1/4 conta cabeças, não pessoas: 4 estirpes com netos ainda dão 1/4', () => {
    const r = rodar(
      caso({
        conjuge: comRegime('separacao_convencional'),
        descendentes: [
          pessoa('Ana', 'vivo', [], true),
          pessoa('Bruno', 'vivo', [], true),
          pessoa('Carla', 'vivo', [], true),
          pessoa('Diego', 'pre_morto', [pessoa('Nina'), pessoa('Otto')], true),
        ],
        patrimonio: patrimonio({ bensParticulares: M(1_600_000) }),
      }),
    )
    expect(fr(r, 'Cônjuge')).toBe('1/4')
    expect(fr(r, 'Ana')).toBe('3/16')
    expect(fr(r, 'Nina')).toBe('3/32')
  })
})

/* ==================================================================== *
 * 2ª classe — ascendentes
 * ==================================================================== */

describe('ascendentes (arts. 1.836 e 1.837)', () => {
  it('pai e mãe vivos, sem cônjuge: metade para cada', () => {
    const r = rodar(
      caso({
        ascendentes: { ...semAscendentes, pai: true, mae: true },
        patrimonio: patrimonio({ bensParticulares: M(500_000) }),
      }),
    )
    expect(r.classe).toBe('ascendentes')
    expect(fr(r, 'Pai')).toBe('1/2')
    expect(fr(r, 'Mãe')).toBe('1/2')
  })

  it('pai e mãe com cônjuge: um terço para cada um dos três', () => {
    const r = rodar(
      caso({
        conjuge: conjuge(),
        ascendentes: { ...semAscendentes, pai: true, mae: true },
        patrimonio: patrimonio({ bensParticulares: M(900_000) }),
      }),
    )
    expect(fr(r, 'Cônjuge')).toBe('1/3')
    expect(fr(r, 'Pai')).toBe('1/3')
    expect(valor(r, 'Mãe')).toBe(30_000_000n)
  })

  it('só a mãe viva com cônjuge: metade e metade', () => {
    const r = rodar(
      caso({
        conjuge: conjuge(),
        ascendentes: { ...semAscendentes, mae: true },
        patrimonio: patrimonio({ bensParticulares: M(400_000) }),
      }),
    )
    expect(fr(r, 'Cônjuge')).toBe('1/2')
    expect(fr(r, 'Mãe')).toBe('1/2')
  })

  it('o regime de bens é irrelevante na concorrência com ascendentes', () => {
    for (const regime of ['comunhao_universal', 'separacao_obrigatoria'] as const) {
      const r = rodar(
        caso({
          conjuge: comRegime(regime, { sumula377: false }),
          ascendentes: { ...semAscendentes, pai: true, mae: true },
          patrimonio: patrimonio({ bensParticulares: M(300_000) }),
        }),
      )
      expect(fr(r, 'Cônjuge'), `regime ${regime}`).toBe('1/3')
    }
  })

  it('avós: um paterno e dois maternos — a linha paterna leva metade sozinha', () => {
    const r = rodar(
      caso({
        ascendentes: { ...semAscendentes, avosPaternos: 1, avosMaternos: 2 },
        patrimonio: patrimonio({ bensParticulares: M(400_000) }),
      }),
    )
    expect(fr(r, 'Avô/avó paterno(a)')).toBe('1/2')
    expect(fr(r, 'Avô/avó materno(a) 1')).toBe('1/4')
    expect(valor(r, 'Avô/avó paterno(a)')).toBe(20_000_000n)
  })

  it('avós de uma só linha dividem tudo por cabeça, sem reservar metade a ninguém', () => {
    const r = rodar(
      caso({
        ascendentes: { ...semAscendentes, avosMaternos: 2 },
        patrimonio: patrimonio({ bensParticulares: M(400_000) }),
      }),
    )
    expect(fr(r, 'Avô/avó materno(a) 1')).toBe('1/2')
    expect(fr(r, 'Avô/avó materno(a) 2')).toBe('1/2')
  })

  it('o grau mais próximo exclui o mais remoto, ainda que de outra linha', () => {
    const r = rodar(
      caso({
        ascendentes: { ...semAscendentes, avosMaternos: 1, bisavosPaternos: 4 },
        patrimonio: patrimonio({ bensParticulares: M(100_000) }),
      }),
    )
    expect(nomes(r)).toEqual(['Avô/avó materno(a)'])
    expect(fr(r, 'Avô/avó materno(a)')).toBe('1')
  })

  it('com avós e cônjuge, o cônjuge fica com metade', () => {
    const r = rodar(
      caso({
        conjuge: conjuge(),
        ascendentes: { ...semAscendentes, avosPaternos: 2, avosMaternos: 2 },
        patrimonio: patrimonio({ bensParticulares: M(800_000) }),
      }),
    )
    expect(fr(r, 'Cônjuge')).toBe('1/2')
    expect(fr(r, 'Avô/avó paterno(a) 1')).toBe('1/8')
  })

  it('descendentes excluem ascendentes por completo', () => {
    const r = rodar(
      caso({
        descendentes: [pessoa('Ana')],
        ascendentes: { ...semAscendentes, pai: true, mae: true },
        patrimonio: patrimonio({ bensParticulares: M(100_000) }),
      }),
    )
    expect(nomes(r)).toEqual(['Ana'])
  })
})

/* ==================================================================== *
 * 3ª e 4ª classes
 * ==================================================================== */

describe('cônjuge sozinho e colaterais', () => {
  it('sem descendentes nem ascendentes, o cônjuge herda tudo', () => {
    const r = rodar(
      caso({
        conjuge: comRegime('comunhao_parcial'),
        colaterais: { ...semColaterais, irmaos: [irmao('Irmão')] },
        patrimonio: patrimonio({ bensComuns: M(600_000) }),
      }),
    )
    expect(r.classe).toBe('conjuge')
    expect(fr(r, 'Cônjuge')).toBe('1')
    expect(r.meacao?.valorCentavos).toBe(30_000_000n)
    expect(valor(r, 'Cônjuge')).toBe(30_000_000n)
  })

  it('separado de fato há mais de 2 anos: perde a herança, conserva a meação', () => {
    const r = rodar(
      caso({
        conjuge: comRegime('comunhao_parcial', { separadoDeFato: true }),
        colaterais: { ...semColaterais, irmaos: [irmao('Irmão')] },
        patrimonio: patrimonio({ bensComuns: M(600_000) }),
      }),
    )
    expect(r.classe).toBe('colaterais')
    expect(r.meacao?.valorCentavos).toBe(30_000_000n)
    expect(fr(r, 'Irmão')).toBe('1')
    expect(r.alertas.some((a) => a.fundamento?.includes('1.830'))).toBe(true)
  })

  it('irmãos bilaterais e unilaterais: o unilateral recebe metade (art. 1.841)', () => {
    const r = rodar(
      caso({
        colaterais: {
          ...semColaterais,
          irmaos: [irmao('Bi1'), irmao('Bi2'), irmao('Uni', 'unilateral')],
        },
        patrimonio: patrimonio({ bensParticulares: M(500_000) }),
      }),
    )
    expect(fr(r, 'Bi1')).toBe('2/5')
    expect(fr(r, 'Uni')).toBe('1/5')
    expect(valor(r, 'Uni')).toBe(10_000_000n)
  })

  it('só unilaterais: dividem por igual (art. 1.842)', () => {
    const r = rodar(
      caso({
        colaterais: {
          ...semColaterais,
          irmaos: [irmao('U1', 'unilateral'), irmao('U2', 'unilateral')],
        },
        patrimonio: patrimonio({ bensParticulares: M(200_000) }),
      }),
    )
    expect(fr(r, 'U1')).toBe('1/2')
  })

  it('com irmão vivo, os sobrinhos herdam POR ESTIRPE', () => {
    const r = rodar(
      caso({
        colaterais: {
          ...semColaterais,
          irmaos: [
            irmao('Vivo'),
            irmao('Morto', 'bilateral', 'pre_morto', [pessoa('S1'), pessoa('S2')]),
          ],
        },
        patrimonio: patrimonio({ bensParticulares: M(400_000) }),
      }),
    )
    expect(fr(r, 'Vivo')).toBe('1/2')
    expect(fr(r, 'S1')).toBe('1/4')
    expect(fr(r, 'S2')).toBe('1/4')
  })

  it('sem nenhum irmão vivo, os sobrinhos herdam POR CABEÇA (art. 1.843, §1º)', () => {
    const r = rodar(
      caso({
        colaterais: {
          ...semColaterais,
          irmaos: [
            irmao('M1', 'bilateral', 'pre_morto', [pessoa('S1'), pessoa('S2')]),
            irmao('M2', 'bilateral', 'pre_morto', [pessoa('S3')]),
          ],
        },
        patrimonio: patrimonio({ bensParticulares: M(300_000) }),
      }),
    )
    // Por cabeça: 1/3 cada. Por estirpe seriam 1/4, 1/4 e 1/2.
    expect(fr(r, 'S1')).toBe('1/3')
    expect(fr(r, 'S3')).toBe('1/3')
  })

  it('sobrinhos de irmão unilateral recebem metade do que recebem os de bilateral', () => {
    const r = rodar(
      caso({
        colaterais: {
          ...semColaterais,
          irmaos: [
            irmao('Bi', 'bilateral', 'pre_morto', [pessoa('SB')]),
            irmao('Uni', 'unilateral', 'pre_morto', [pessoa('SU')]),
          ],
        },
        patrimonio: patrimonio({ bensParticulares: M(300_000) }),
      }),
    )
    expect(fr(r, 'SB')).toBe('2/3')
    expect(fr(r, 'SU')).toBe('1/3')
  })

  it('sobrinhos excluem tios, embora ambos sejam de 3º grau', () => {
    const r = rodar(
      caso({
        colaterais: {
          ...semColaterais,
          irmaos: [irmao('M', 'bilateral', 'pre_morto', [pessoa('Sobrinho')])],
          tios: 3,
        },
        patrimonio: patrimonio({ bensParticulares: M(100_000) }),
      }),
    )
    expect(nomes(r)).toEqual(['Sobrinho'])
  })

  it('filho de sobrinho não representa: a representação colateral para nos filhos de irmão', () => {
    const r = rodar(
      caso({
        colaterais: {
          ...semColaterais,
          irmaos: [
            irmao('M', 'bilateral', 'pre_morto', [pessoa('Sobrinho', 'pre_morto', [pessoa('Neto')])]),
          ],
          tios: 2,
        },
        patrimonio: patrimonio({ bensParticulares: M(100_000) }),
      }),
    )
    // O sobrinho pré-morto não transmite: caem-se para os tios.
    expect(nomes(r)).toEqual(['Tio(a) 1', 'Tio(a) 2'])
  })

  it('4º grau: primos, tios-avós e sobrinhos-netos dividem por igual', () => {
    const r = rodar(
      caso({
        colaterais: { ...semColaterais, primos: 2, tiosAvos: 1, sobrinhosNetos: 1 },
        patrimonio: patrimonio({ bensParticulares: M(400_000) }),
      }),
    )
    expect(fr(r, 'Primo(a) 1')).toBe('1/4')
    expect(fr(r, 'Tio(a)-avô(ó)')).toBe('1/4')
    expect(fr(r, 'Sobrinho(a)-neto(a)')).toBe('1/4')
  })

  it('sem ninguém até o 4º grau, a herança é vacante', () => {
    const r = rodar(caso({ patrimonio: patrimonio({ bensParticulares: M(250_000) }) }))
    expect(r.classe).toBe('vacante')
    expect(nomes(r)).toEqual(['Município / Distrito Federal'])
    expect(r.alertas.some((a) => a.nivel === 'critico')).toBe(true)
  })
})

/* ==================================================================== *
 * Testamento e colação
 * ==================================================================== */

describe('testamento', () => {
  it('legado de 50% com dois filhos: metade ao terceiro, 1/4 para cada filho', () => {
    const r = rodar(
      caso({
        descendentes: [pessoa('Ana'), pessoa('Bruno')],
        patrimonio: patrimonio({
          bensParticulares: M(1_000_000),
          legados: [
            { id: 'l1', beneficiario: 'Instituto', modo: 'percentual_heranca', quantia: 50 },
          ],
        }),
      }),
    )
    expect(fr(r, 'Instituto')).toBe('1/2')
    expect(fr(r, 'Ana')).toBe('1/4')
    expect(valor(r, 'Ana')).toBe(25_000_000n)
  })

  it('legado que invade a legítima é reduzido ao disponível', () => {
    const r = rodar(
      caso({
        descendentes: [pessoa('Ana')],
        patrimonio: patrimonio({
          bensParticulares: M(1_000_000),
          legados: [
            { id: 'l1', beneficiario: 'Amigo', modo: 'percentual_heranca', quantia: 90 },
          ],
        }),
      }),
    )
    expect(valor(r, 'Amigo')).toBe(50_000_000n)
    expect(valor(r, 'Ana')).toBe(50_000_000n)
    expect(r.alertas.some((a) => a.titulo.includes('excede a parte disponível'))).toBe(true)
  })

  it('sem herdeiros necessários, o testamento pode alcançar 100%', () => {
    const r = rodar(
      caso({
        colaterais: { ...semColaterais, irmaos: [irmao('Irmão')] },
        patrimonio: patrimonio({
          bensParticulares: M(500_000),
          legados: [{ id: 'l1', beneficiario: 'ONG', modo: 'percentual_heranca', quantia: 100 }],
        }),
      }),
    )
    expect(valor(r, 'ONG')).toBe(50_000_000n)
    expect(r.quotas.find((q) => q.nome === 'Irmão')?.valorCentavos).toBe(0n)
  })

  it('legado em valor fixo é respeitado', () => {
    const r = rodar(
      caso({
        descendentes: [pessoa('Ana'), pessoa('Bruno')],
        patrimonio: patrimonio({
          bensParticulares: M(1_000_000),
          legados: [{ id: 'l1', beneficiario: 'Sobrinha', modo: 'valor', quantia: M(200_000) }],
        }),
      }),
    )
    expect(valor(r, 'Sobrinha')).toBe(20_000_000n)
    expect(valor(r, 'Ana')).toBe(40_000_000n)
  })
})

describe('colação de doações em vida (arts. 2.002 e ss.)', () => {
  it('a doação a um filho é conferida e descontada do quinhão dele', () => {
    const ana = pessoa('Ana')
    const bruno = pessoa('Bruno')
    const r = rodar(
      caso({
        descendentes: [ana, bruno],
        patrimonio: patrimonio({
          bensParticulares: M(600_000),
          doacoes: [
            {
              id: 'd1',
              donatarioId: ana.id,
              nomeDonatario: 'Ana',
              valor: M(200_000),
              dispensada: false,
            },
          ],
        }),
      }),
    )
    // Monte conferido = 600k + 200k = 800k -> 400k para cada.
    // Ana já levou 200k, então recebe 200k; Bruno recebe 400k.
    expect(valor(r, 'Ana')).toBe(20_000_000n)
    expect(valor(r, 'Bruno')).toBe(40_000_000n)
  })

  it('doação que zera exatamente o quinhão não desequilibra o monte', () => {
    // Regressão: o donatário cujo saldo dá exatamente zero precisa entrar na
    // partilha refeita. Antes ele escapava e conservava o valor pré-colação,
    // fazendo a soma dos quinhões estourar a herança.
    const gustavo = pessoa('Gustavo')
    const r = rodar(
      caso({
        descendentes: [gustavo, pessoa('Letícia'), pessoa('Marcos')],
        patrimonio: patrimonio({
          bensParticulares: M(600_000),
          doacoes: [
            {
              id: 'd1',
              donatarioId: gustavo.id,
              nomeDonatario: 'Gustavo',
              valor: M(300_000),
              dispensada: false,
            },
          ],
        }),
      }),
    )
    // Monte conferido = 900k -> 300k para cada. Gustavo já levou os 300k dele.
    expect(valor(r, 'Gustavo')).toBe(0n)
    expect(valor(r, 'Letícia')).toBe(30_000_000n)
    expect(valor(r, 'Marcos')).toBe(30_000_000n)
  })

  it('doação maior que o quinhão gera dever de repor', () => {
    const ana = pessoa('Ana')
    const r = rodar(
      caso({
        descendentes: [ana, pessoa('Bruno')],
        patrimonio: patrimonio({
          bensParticulares: M(100_000),
          doacoes: [
            {
              id: 'd1',
              donatarioId: ana.id,
              nomeDonatario: 'Ana',
              valor: M(500_000),
              dispensada: false,
            },
          ],
        }),
      }),
    )
    expect(valor(r, 'Ana')).toBe(0n)
    expect(r.alertas.some((a) => a.titulo.includes('recebeu mais'))).toBe(true)
  })

  it('doação dispensada acima do disponível é sinalizada como inoficiosa', () => {
    const ana = pessoa('Ana')
    const r = rodar(
      caso({
        descendentes: [ana, pessoa('Bruno')],
        patrimonio: patrimonio({
          bensParticulares: M(200_000),
          doacoes: [
            {
              id: 'd1',
              donatarioId: ana.id,
              nomeDonatario: 'Ana',
              valor: M(400_000),
              dispensada: true,
            },
          ],
        }),
      }),
    )
    expect(r.alertas.some((a) => a.titulo.includes('inoficiosa'))).toBe(true)
    // Dispensada não volta ao monte: a partilha do acervo segue meio a meio.
    expect(valor(r, 'Ana')).toBe(10_000_000n)
  })
})

/* ==================================================================== *
 * Massa, dívidas e robustez numérica
 * ==================================================================== */

describe('massa e robustez', () => {
  it('dívidas e funeral saem da herança, nunca da meação', () => {
    const r = rodar(
      caso({
        conjuge: comRegime('comunhao_parcial'),
        descendentes: [pessoa('Ana', 'vivo', [], true)],
        patrimonio: patrimonio({
          bensComuns: M(1_000_000),
          dividas: M(100_000),
          despesasFuneral: M(20_000),
        }),
      }),
    )
    expect(r.meacao?.valorCentavos).toBe(50_000_000n)
    expect(r.massa.herancaLiquidaCentavos).toBe(38_000_000n)
    expect(valor(r, 'Ana')).toBe(38_000_000n)
  })

  it('espólio insolvente zera a herança e alerta', () => {
    const r = rodar(
      caso({
        descendentes: [pessoa('Ana')],
        patrimonio: patrimonio({ bensParticulares: M(100_000), dividas: M(400_000) }),
      }),
    )
    expect(r.massa.herancaLiquidaCentavos).toBe(0n)
    expect(valor(r, 'Ana')).toBe(0n)
    expect(r.alertas.some((a) => a.titulo.includes('insolvente'))).toBe(true)
  })

  it('valores indivisíveis não perdem centavo: 3 filhos sobre R$ 1.000,00', () => {
    const r = rodar(
      caso({
        descendentes: [pessoa('A'), pessoa('B'), pessoa('C')],
        patrimonio: patrimonio({ bensParticulares: 1000 }),
      }),
    )
    const soma = r.quotas.reduce((s, q) => s + q.valorCentavos, 0n)
    expect(soma).toBe(100_000n)
    expect(r.quotas.map((q) => q.valorCentavos).sort()).toEqual([
      33_333n,
      33_333n,
      33_334n,
    ])
  })

  it('7 herdeiros sobre R$ 0,01 continuam fechando a conta', () => {
    const r = rodar(
      caso({
        descendentes: Array.from({ length: 7 }, (_, i) => pessoa(`H${i}`)),
        patrimonio: patrimonio({ bensParticulares: 0.01 }),
      }),
    )
    expect(r.quotas.reduce((s, q) => s + q.valorCentavos, 0n)).toBe(1n)
  })

  it('patrimônio zerado ainda produz frações corretas', () => {
    const r = calcular(
      caso({
        conjuge: comRegime('separacao_convencional'),
        descendentes: [pessoa('Ana', 'vivo', [], true), pessoa('Bruno', 'vivo', [], true)],
      }),
    )
    expect(fr(r, 'Cônjuge')).toBe('1/3')
    expect(fr(r, 'Ana')).toBe('1/3')
  })

  it('união estável recebe o mesmo tratamento do casamento (STF Tema 809)', () => {
    const casamento = rodar(
      caso({
        conjuge: comRegime('comunhao_parcial'),
        descendentes: [pessoa('Ana', 'vivo', [], true)],
        patrimonio: patrimonio({ bensComuns: M(400_000), bensParticulares: M(200_000) }),
      }),
    )
    const uniao = rodar(
      caso({
        conjuge: comRegime('comunhao_parcial', { vinculo: 'uniao_estavel' }),
        descendentes: [pessoa('Ana', 'vivo', [], true)],
        patrimonio: patrimonio({ bensComuns: M(400_000), bensParticulares: M(200_000) }),
      }),
    )
    expect(fr(uniao, 'Cônjuge')).toBe(fr(casamento, 'Cônjuge'))
    expect(uniao.massa.herancaLiquidaCentavos).toBe(casamento.massa.herancaLiquidaCentavos)
  })

  it('sem cônjuge, bens informados como comuns integram o espólio', () => {
    const r = rodar(
      caso({
        conjuge: semConjuge,
        descendentes: [pessoa('Ana')],
        patrimonio: patrimonio({ bensComuns: M(500_000) }),
      }),
    )
    expect(r.meacao).toBeNull()
    expect(r.massa.herancaLiquidaCentavos).toBe(50_000_000n)
  })
})
