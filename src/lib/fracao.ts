/**
 * Aritmetica racional exata com BigInt.
 *
 * Partilha hereditaria e' cheia de tercos, nonos, vinte-e-sete-avos. Ponto
 * flutuante acumula erro e faz a soma dos quinhoes nao fechar em 100%.
 * Aqui tudo e' fracao exata; o arredondamento so acontece na hora de exibir
 * dinheiro, e com sobra distribuida de forma deterministica.
 */

function mdc(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

export class Fracao {
  readonly n: bigint
  readonly d: bigint

  constructor(n: bigint | number, d: bigint | number = 1n) {
    let nn = typeof n === 'number' ? BigInt(Math.round(n)) : n
    let dd = typeof d === 'number' ? BigInt(Math.round(d)) : d
    if (dd === 0n) throw new Error('Fracao com denominador zero')
    if (dd < 0n) {
      nn = -nn
      dd = -dd
    }
    const g = mdc(nn, dd) || 1n
    this.n = nn / g
    this.d = dd / g
  }

  static readonly ZERO = new Fracao(0n, 1n)
  static readonly UM = new Fracao(1n, 1n)

  static de(n: number, d = 1): Fracao {
    return new Fracao(BigInt(n), BigInt(d))
  }

  mais(o: Fracao): Fracao {
    return new Fracao(this.n * o.d + o.n * this.d, this.d * o.d)
  }
  menos(o: Fracao): Fracao {
    return new Fracao(this.n * o.d - o.n * this.d, this.d * o.d)
  }
  vezes(o: Fracao | number): Fracao {
    const f = typeof o === 'number' ? new Fracao(BigInt(o)) : o
    return new Fracao(this.n * f.n, this.d * f.d)
  }
  dividido(o: Fracao | number): Fracao {
    const f = typeof o === 'number' ? new Fracao(BigInt(o)) : o
    if (f.n === 0n) throw new Error('Divisao por zero')
    return new Fracao(this.n * f.d, this.d * f.n)
  }

  ehZero(): boolean {
    return this.n === 0n
  }
  ehPositiva(): boolean {
    return this.n > 0n
  }
  compara(o: Fracao): number {
    const e = this.n * o.d - o.n * this.d
    return e === 0n ? 0 : e > 0n ? 1 : -1
  }
  menorQue(o: Fracao): boolean {
    return this.compara(o) < 0
  }
  maiorQue(o: Fracao): boolean {
    return this.compara(o) > 0
  }
  igual(o: Fracao): boolean {
    return this.compara(o) === 0
  }

  /** Valor aproximado em ponto flutuante. So para exibicao/graficos. */
  paraNumero(): number {
    return Number(this.n) / Number(this.d)
  }

  /** "1/3", "5/12", "1" ou "0". */
  paraTexto(): string {
    if (this.n === 0n) return '0'
    if (this.d === 1n) return this.n.toString()
    return `${this.n}/${this.d}`
  }

  /** Percentual com ate `casas` decimais, sem zeros a' direita. */
  paraPercentual(casas = 4): string {
    const p = this.paraNumero() * 100
    const s = p.toFixed(casas).replace(/0+$/, '').replace(/\.$/, '')
    return `${s.replace('.', ',')}%`
  }

  static soma(fs: Fracao[]): Fracao {
    return fs.reduce((a, b) => a.mais(b), Fracao.ZERO)
  }
}

export const F = (n: number, d = 1) => Fracao.de(n, d)

/**
 * Reparte um valor monetario (em centavos) segundo fracoes exatas.
 *
 * Usa maiores-restos (Hare/Niemeyer): distribui o piso de cada quinhao e
 * entrega os centavos restantes a quem tem o maior resto. Garante que a soma
 * dos valores devolvidos e' EXATAMENTE o total, sem centavo evaporando.
 */
export function repartirCentavos(totalCentavos: bigint, fracoes: Fracao[]): bigint[] {
  if (fracoes.length === 0) return []
  const somaF = Fracao.soma(fracoes)
  if (somaF.ehZero()) return fracoes.map(() => 0n)

  // Normaliza para o caso de as fracoes nao somarem exatamente 1.
  const norm = fracoes.map((f) => f.dividido(somaF))

  const pisos: bigint[] = []
  const restos: { i: number; resto: bigint; den: bigint }[] = []
  let distribuido = 0n

  norm.forEach((f, i) => {
    const num = totalCentavos * f.n
    const piso = num / f.d
    const resto = num % f.d
    pisos.push(piso)
    restos.push({ i, resto, den: f.d })
    distribuido += piso
  })

  let sobra = totalCentavos - distribuido
  // resto/den decrescente; empate resolvido pelo indice (deterministico).
  restos.sort((a, b) => {
    const cmp = b.resto * a.den - a.resto * b.den
    if (cmp !== 0n) return cmp > 0n ? 1 : -1
    return a.i - b.i
  })
  let k = 0
  while (sobra > 0n && restos.length > 0) {
    pisos[restos[k % restos.length].i] += 1n
    sobra -= 1n
    k++
  }
  return pisos
}
