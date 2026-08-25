/** Conversões e formatação de dinheiro. Internamente tudo é centavo em BigInt. */

export function reaisParaCentavos(reais: number): bigint {
  if (!Number.isFinite(reais) || reais <= 0) return 0n
  return BigInt(Math.round(reais * 100))
}

export function centavosParaReais(c: bigint): number {
  return Number(c) / 100
}

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatarCentavos(c: bigint): string {
  return BRL.format(centavosParaReais(c))
}

export function formatarReais(v: number): string {
  return BRL.format(Number.isFinite(v) ? v : 0)
}

/** "R$ 1,2 mi" / "R$ 850 mil" — para caber em nó de árvore e cartão pequeno. */
export function formatarCompacto(c: bigint): string {
  const v = centavosParaReais(c)
  const abs = Math.abs(v)
  if (abs >= 1_000_000_000) return `R$ ${(v / 1_000_000_000).toFixed(2).replace('.', ',')} bi`
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace('.', ',')} mi`
  if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(1).replace('.', ',')} mil`
  return BRL.format(v)
}

/** Aceita "1.234,56", "1234.56", "R$ 1.234,56" e devolve number. */
export function analisarValor(texto: string): number {
  if (!texto) return 0
  const limpo = texto
    .replace(/[R$\s ]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
  const n = Number.parseFloat(limpo)
  return Number.isFinite(n) && n > 0 ? n : 0
}
