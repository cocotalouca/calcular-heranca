import type { Quota } from '@/engine/tipos'

/** Cor da classe a que o herdeiro pertence — a mesma da árvore e dos gráficos. */
export function corDaQuota(q: Quota): string {
  if (q.id === 'conjuge') return 'var(--c-conjuge)'
  if (q.tipo === 'legado') return 'var(--c-legado)'
  if (q.id === 'municipio') return 'var(--c-meacao)'
  if (q.id.startsWith('asc-') || (q.nivel ?? 0) < 0) return 'var(--c-ascendente)'

  const t = q.qualificacao.toLowerCase()
  if (
    t.includes('irmã') ||
    t.includes('irmão') ||
    t.includes('sobrinh') ||
    t.includes('tio') ||
    t.includes('primo') ||
    t.includes('colateral')
  ) {
    return 'var(--c-colateral)'
  }
  return 'var(--c-descendente)'
}
