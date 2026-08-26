import { describe, expect, it } from 'vitest'
import { calcularInventario } from '../cumulativo'
import { MODELOS } from '@/data/modelos'
import type { QuinhaoConsolidado, ResultadoCumulativo } from '../tipos'
import {
  conjuge,
  inventario,
  obito,
  patrimonio,
  pessoaId,
  semColaterais,
  semAscendentes,
} from './fabrica'

/* ------------------------------------------------------------------ *
 * Atalhos de leitura
 * ------------------------------------------------------------------ */

const reais = (c: bigint) => Number(c) / 100

function quem(r: ResultadoCumulativo, id: string): QuinhaoConsolidado | undefined {
  return r.consolidado.find((q) => q.id === id)
}

function recebe(r: ResultadoCumulativo, id: string): number {
  return reais(quem(r, id)?.totalCentavos ?? 0n)
}

/* ================================================================== *
 * O casal que falece em sequência — CPC art. 672, II
 * ================================================================== */

describe('inventário cumulativo do casal', () => {
  const montar = () => {
    const filhos = () => [pessoaId('f1', 'Filho 1'), pessoaId('f2', 'Filho 2')]
    return inventario([
      obito('o1', {
        nomeFalecido: 'Marido',
        conjuge: conjuge({
          id: 'esposa',
          nome: 'Esposa',
          regime: 'comunhao_parcial',
          situacao: 'pos_morto',
          obitoId: 'o2',
        }),
        descendentes: filhos(),
        patrimonio: patrimonio({ bensComuns: 800_000 }),
      }),
      obito('o2', {
        nomeFalecido: 'Esposa',
        conjuge: conjuge({
          id: 'marido',
          nome: 'Marido',
          regime: 'comunhao_parcial',
          situacao: 'pre_morto',
          obitoId: 'o1',
        }),
        descendentes: filhos(),
        patrimonio: patrimonio(),
      }),
    ])
  }

  it('a meação da viúva vira o acervo do segundo inventário', () => {
    const r = calcularInventario(montar())
    const segundo = r.etapas[1]

    // 800 mil comuns: 400 de meação para ela, 400 de herança para os filhos.
    expect(reais(r.etapas[0].resultado.meacao!.valorCentavos)).toBe(400_000)
    expect(segundo.aportes).toHaveLength(1)
    expect(reais(segundo.aportes[0].centavos)).toBe(400_000)
    expect(segundo.aportes[0].tipo).toBe('meacao')
    // Sem cônjuge sobrevivente no segundo óbito, o aporte é bem particular.
    expect(segundo.aportes[0].destino).toBe('particular')
    expect(reais(segundo.resultado.massa.herancaLiquidaCentavos)).toBe(400_000)
  })

  it('cada filho soma os dois quinhões e a viúva não aparece no consolidado', () => {
    const r = calcularInventario(montar())
    expect(recebe(r, 'f1')).toBe(400_000)
    expect(recebe(r, 'f2')).toBe(400_000)
    expect(quem(r, 'esposa')).toBeUndefined()
    expect(reais(r.totalConsolidadoCentavos)).toBe(800_000)
  })

  it('reconhece a cumulação pelo inciso II do art. 672', () => {
    const r = calcularInventario(montar())
    expect(r.fundamentos.map((f) => f.inciso)).toContain('CPC art. 672, II')
  })

  it('não perde nem ganha um centavo com valores indivisíveis', () => {
    const inv = montar()
    inv.obitos[0].patrimonio.bensComuns = 1_000_000.01
    const r = calcularInventario(inv)
    const distribuido = r.consolidado.reduce((s, q) => s + q.totalCentavos, 0n)
    expect(distribuido).toBe(r.totalConsolidadoCentavos)
    // Meação (metade, arredondada para baixo) + herança dos dois filhos.
    expect(distribuido).toBe(100_000_001n)
  })
})

/* ================================================================== *
 * O co-herdeiro que morre depois — a diferença que decide o caso
 * ================================================================== */

describe('herdeiro falecido no curso do inventário', () => {
  /** Pai com 900 mil e dois filhos; um deles morre depois, deixando viúva e filho. */
  const montarPosMorto = () =>
    inventario([
      obito('p1', {
        nomeFalecido: 'Pai',
        descendentes: [
          pessoaId('fa', 'Filho A', { situacao: 'pos_morto', obitoId: 'p2' }),
          pessoaId('fb', 'Filho B'),
        ],
        patrimonio: patrimonio({ bensParticulares: 900_000 }),
      }),
      obito('p2', {
        nomeFalecido: 'Filho A',
        conjuge: conjuge({ id: 'viuva', nome: 'Viúva', regime: 'comunhao_parcial' }),
        descendentes: [pessoaId('neto', 'Neto')],
        patrimonio: patrimonio(),
      }),
    ])

  /** O mesmo caso, mudando só a data: o filho morreu ANTES do pai. */
  const montarPreMorto = () =>
    inventario([
      obito('p1', {
        nomeFalecido: 'Pai',
        descendentes: [
          pessoaId('fa', 'Filho A', {
            situacao: 'pre_morto',
            filhos: [pessoaId('neto', 'Neto')],
          }),
          pessoaId('fb', 'Filho B'),
        ],
        patrimonio: patrimonio({ bensParticulares: 900_000 }),
      }),
    ])

  it('o pós-morto herda e transmite ao próprio espólio', () => {
    const r = calcularInventario(montarPosMorto())
    const quota = r.etapas[0].resultado.quotas.find((q) => q.id === 'fa')!

    expect(reais(quota.valorCentavos)).toBe(450_000)
    expect(quota.destinoObitoId).toBe('p2')
    expect(reais(r.etapas[1].aportes[0].centavos)).toBe(450_000)
  })

  it('a viúva do pós-morto recebe — o que a representação jamais lhe daria', () => {
    const r = calcularInventario(montarPosMorto())

    expect(recebe(r, 'fb')).toBe(450_000)
    // No espólio do filho há bens particulares (o que ele herdou do pai),
    // então a viúva concorre com o neto em quinhões iguais.
    expect(recebe(r, 'viuva')).toBe(225_000)
    expect(recebe(r, 'neto')).toBe(225_000)
    expect(quem(r, 'fa')).toBeUndefined()
  })

  it('trocando pós-morte por pré-morte, o neto leva tudo e a viúva nada', () => {
    const r = calcularInventario(montarPreMorto())

    expect(recebe(r, 'fb')).toBe(450_000)
    expect(recebe(r, 'neto')).toBe(450_000)
    expect(quem(r, 'viuva')).toBeUndefined()
  })

  it('avisa que a pré-morte e a pós-morte produzem partilhas diferentes', () => {
    const r = calcularInventario(montarPosMorto())
    const titulos = r.alertas.map((a) => a.titulo)
    expect(titulos).toContain('Pré-morte e pós-morte produzem partilhas diferentes')
  })

  it('aponta a dependência entre as partilhas (art. 672, III)', () => {
    const r = calcularInventario(montarPosMorto())
    expect(r.fundamentos.map((f) => f.inciso)).toContain('CPC art. 672, III')
  })

  it('reclama do quinhão sem destino quando falta o inventário do falecido', () => {
    const inv = montarPosMorto()
    inv.obitos = [inv.obitos[0]]
    inv.obitos[0].descendentes[0].obitoId = undefined

    const r = calcularInventario(inv)
    expect(quem(r, 'fa')?.pendente).toBeDefined()
    expect(r.alertas.some((a) => a.titulo === 'Há quinhão sem destino final')).toBe(true)
  })
})

/* ================================================================== *
 * Cadeia de três óbitos
 * ================================================================== */

describe('cadeia de sucessões', () => {
  it('o acervo atravessa três espólios e para nos netos', () => {
    const inv = inventario([
      obito('a1', {
        nomeFalecido: 'Avô',
        descendentes: [pessoaId('pai', 'Pai', { situacao: 'pos_morto', obitoId: 'a2' })],
        patrimonio: patrimonio({ bensParticulares: 1_200_000 }),
      }),
      obito('a2', {
        nomeFalecido: 'Pai',
        conjuge: conjuge({
          id: 'mae',
          nome: 'Mãe',
          regime: 'comunhao_parcial',
          situacao: 'pos_morto',
          obitoId: 'a3',
        }),
        descendentes: [pessoaId('n1', 'Neto 1'), pessoaId('n2', 'Neto 2')],
        patrimonio: patrimonio(),
      }),
      obito('a3', {
        nomeFalecido: 'Mãe',
        conjuge: conjuge({
          id: 'pai-conj',
          nome: 'Pai',
          regime: 'comunhao_parcial',
          situacao: 'pre_morto',
          obitoId: 'a2',
        }),
        descendentes: [pessoaId('n1', 'Neto 1'), pessoaId('n2', 'Neto 2')],
        patrimonio: patrimonio(),
      }),
    ])

    const r = calcularInventario(inv)

    // Pai herda 1,2 mi; a mãe concorre com dois netos sobre bens particulares:
    // 400 mil para cada um dos três. Ao morrer, ela repassa os 400 aos netos.
    expect(recebe(r, 'n1')).toBe(600_000)
    expect(recebe(r, 'n2')).toBe(600_000)
    expect(quem(r, 'pai')).toBeUndefined()
    expect(quem(r, 'mae')).toBeUndefined()
    expect(reais(r.totalConsolidadoCentavos)).toBe(1_200_000)
  })
})

/* ================================================================== *
 * Comoriência: duas heranças que não se comunicam
 * ================================================================== */

describe('comoriência do casal', () => {
  const montar = () => {
    const filhos = () => [pessoaId('c1', 'Filha 1'), pessoaId('c2', 'Filha 2')]
    return inventario([
      obito('k1', {
        nomeFalecido: 'Ele',
        conjuge: conjuge({
          id: 'ela-conj',
          nome: 'Ela',
          regime: 'comunhao_parcial',
          situacao: 'comoriente',
          obitoId: 'k2',
        }),
        descendentes: filhos(),
        patrimonio: patrimonio({ bensComuns: 600_000, bensParticulares: 300_000 }),
      }),
      obito('k2', {
        nomeFalecido: 'Ela',
        conjuge: conjuge({
          id: 'ele-conj',
          nome: 'Ele',
          regime: 'comunhao_parcial',
          situacao: 'comoriente',
          obitoId: 'k1',
        }),
        descendentes: filhos(),
        patrimonio: patrimonio({ bensParticulares: 200_000 }),
      }),
    ])
  }

  it('um não herda do outro: não há aporte entre as sucessões', () => {
    const r = calcularInventario(montar())
    expect(r.etapas.every((e) => e.aportes.length === 0)).toBe(true)
    expect(r.etapas[0].resultado.meacao).toBeNull()
  })

  it('não acusa contradição de ordem — a comoriência é neutra no tempo', () => {
    const r = calcularInventario(montar())
    const contradicoes = r.alertas.filter((a) => a.titulo.includes('ordem cronológica'))
    expect(contradicoes).toEqual([])
  })

  it('as filhas somam as duas heranças', () => {
    const r = calcularInventario(montar())
    // 900 mil dele (a massa comum inteira integra o espólio, sem meação a
    // destacar) e 200 mil dela: 550 mil para cada filha.
    expect(recebe(r, 'c1')).toBe(550_000)
    expect(recebe(r, 'c2')).toBe(550_000)
  })
})

/* ================================================================== *
 * Coerência dos elos
 * ================================================================== */

describe('verificação dos elos entre óbitos', () => {
  it('acusa quem consta vivo mas tem inventário cadastrado', () => {
    const inv = inventario([
      obito('v1', {
        nomeFalecido: 'Primeiro',
        descendentes: [pessoaId('x', 'Herdeiro', { obitoId: 'v2' })],
        patrimonio: patrimonio({ bensParticulares: 100_000 }),
      }),
      obito('v2', { nomeFalecido: 'Herdeiro' }),
    ])
    const r = calcularInventario(inv)
    expect(
      r.alertas.some((a) => a.titulo.includes('consta como vivo')),
    ).toBe(true)
  })

  it('acusa a ordem invertida entre a situação e a linha do tempo', () => {
    const inv = inventario([
      obito('w1', {
        nomeFalecido: 'Herdeiro',
        patrimonio: patrimonio({ bensParticulares: 50_000 }),
      }),
      obito('w2', {
        nomeFalecido: 'Primeiro',
        descendentes: [pessoaId('y', 'Herdeiro', { situacao: 'pos_morto', obitoId: 'w1' })],
        patrimonio: patrimonio({ bensParticulares: 100_000 }),
      }),
    ])
    const r = calcularInventario(inv)
    expect(r.alertas.some((a) => a.titulo.includes('ordem cronológica'))).toBe(true)
  })

  it('avisa quando os óbitos não têm nexo algum entre si', () => {
    const inv = inventario([
      obito('z1', {
        nomeFalecido: 'Um',
        descendentes: [pessoaId('u1', 'Filho de Um')],
        patrimonio: patrimonio({ bensParticulares: 100_000 }),
      }),
      obito('z2', {
        nomeFalecido: 'Outro',
        descendentes: [pessoaId('u2', 'Filho de Outro')],
        patrimonio: patrimonio({ bensParticulares: 100_000 }),
      }),
    ])
    const r = calcularInventario(inv)
    expect(r.fundamentos).toEqual([])
    expect(r.alertas.some((a) => a.titulo.includes('nexo que autoriza'))).toBe(true)
  })

  it('reconhece a identidade de partes do inciso I', () => {
    const irmaos = () => [
      { ...pessoaId('s1', 'Irmão vivo 1', { filhoDoConjuge: false }), vinculo: 'bilateral' as const },
      { ...pessoaId('s2', 'Irmão vivo 2', { filhoDoConjuge: false }), vinculo: 'bilateral' as const },
    ]
    const inv = inventario([
      obito('i1', {
        nomeFalecido: 'Solteiro A',
        ascendentes: semAscendentes,
        colaterais: { ...semColaterais, irmaos: irmaos() },
        patrimonio: patrimonio({ bensParticulares: 400_000 }),
      }),
      obito('i2', {
        nomeFalecido: 'Solteiro B',
        ascendentes: semAscendentes,
        colaterais: { ...semColaterais, irmaos: irmaos() },
        patrimonio: patrimonio({ bensParticulares: 260_000 }),
      }),
    ])
    const r = calcularInventario(inv)
    expect(r.fundamentos.map((f) => f.inciso)).toContain('CPC art. 672, I')
    expect(recebe(r, 's1')).toBe(330_000)
    expect(recebe(r, 's2')).toBe(330_000)
  })

  it('lembra que o ITCMD incide sobre cada transmissão', () => {
    const r = calcularInventario(MODELOS.find((m) => m.id === 'casal-sequencia')!.montar())
    expect(r.alertas.some((a) => a.titulo.includes('ITCMD'))).toBe(true)
  })
})

/* ================================================================== *
 * Os modelos prontos precisam fechar a conta
 * ================================================================== */

describe('modelos do catálogo', () => {
  it('todo modelo calcula sem erro e distribui exatamente o que foi consolidado', () => {
    for (const modelo of MODELOS) {
      const r = calcularInventario(modelo.montar())
      const soma = r.consolidado.reduce((s, q) => s + q.totalCentavos, 0n)
      expect(soma, modelo.titulo).toBe(r.totalConsolidadoCentavos)
      expect(r.totalConsolidadoCentavos >= 0n, modelo.titulo).toBe(true)
    }
  })

  it('nenhum modelo cumulativo fica sem fundamento para a cumulação', () => {
    for (const modelo of MODELOS.filter((m) => m.familia === 'cumulativo')) {
      const r = calcularInventario(modelo.montar())
      expect(r.fundamentos.length, modelo.titulo).toBeGreaterThan(0)
    }
  })

  it('nenhum modelo cumulativo apresenta elo incoerente', () => {
    for (const modelo of MODELOS.filter((m) => m.familia === 'cumulativo')) {
      const r = calcularInventario(modelo.montar())
      const incoerentes = r.alertas.filter(
        (a) =>
          a.titulo.includes('ordem cronológica') ||
          a.titulo.includes('consta como vivo') ||
          a.titulo.includes('óbito que não existe'),
      )
      expect(incoerentes.map((a) => a.titulo), modelo.titulo).toEqual([])
    }
  })

  it('todo modelo de um só óbito continua sendo tratado como não cumulativo', () => {
    for (const modelo of MODELOS.filter((m) => m.familia === 'simples')) {
      const r = calcularInventario(modelo.montar())
      expect(r.cumulativo, modelo.titulo).toBe(false)
      expect(r.etapas, modelo.titulo).toHaveLength(1)
    }
  })
})

/* ================================================================== *
 * O ascendente que herda e depois falece
 * ================================================================== */

describe('elo com pai ou mãe', () => {
  const montar = (ordemInvertida = false) => {
    const filha = obito('d1', {
      nomeFalecido: 'Filha',
      ascendentes: { ...semAscendentes, mae: true, nomeMae: 'Mãe', obitoMaeId: 'd2' },
      patrimonio: patrimonio({ bensParticulares: 500_000 }),
    })
    const mae = obito('d2', {
      nomeFalecido: 'Mãe',
      descendentes: [pessoaId('irmao', 'Irmão sobrevivente')],
      patrimonio: patrimonio({ bensParticulares: 200_000 }),
    })
    return inventario(ordemInvertida ? [mae, filha] : [filha, mae])
  }

  it('a herança sobe para a mãe e volta a descer para o outro filho', () => {
    const r = calcularInventario(montar())

    expect(reais(r.etapas[1].aportes[0].centavos)).toBe(500_000)
    expect(recebe(r, 'irmao')).toBe(700_000)
    expect(r.fundamentos.map((f) => f.inciso)).toContain('CPC art. 672, III')
  })

  it('acusa o ascendente que herda mas cujo óbito aparece antes', () => {
    const r = calcularInventario(montar(true))
    expect(r.alertas.some((a) => a.titulo.includes('o inventário dele vem antes'))).toBe(true)
  })
})
