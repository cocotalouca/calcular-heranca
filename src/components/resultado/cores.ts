import type { Papel, Quota } from '@/engine/tipos'

const COR: Record<Papel, string> = {
  falecido: 'var(--ouro)',
  conjuge: 'var(--c-conjuge)',
  descendente: 'var(--c-descendente)',
  ascendente: 'var(--c-ascendente)',
  colateral: 'var(--c-colateral)',
  legado: 'var(--c-legado)',
  municipio: 'var(--c-meacao)',
}

export function corDoPapel(papel: Papel): string {
  return COR[papel] ?? 'var(--c-descendente)'
}

/** Cor da classe a que o herdeiro pertence — a mesma da árvore e dos gráficos. */
export function corDaQuota(q: Quota): string {
  return corDoPapel(q.papel)
}

/** Mesmo mapa, para quem desenha por papel em vez de por quota. */
export const COR_PAPEL = COR
