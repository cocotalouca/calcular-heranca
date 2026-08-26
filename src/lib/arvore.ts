import type { Caso, Inventario, Pessoa } from '@/engine/tipos'

let contador = 0
export const novoId = (p = 'x') => `${p}${Date.now().toString(36)}${(contador++).toString(36)}`

export function criarPessoa(nome: string, filhoDoConjuge = true): Pessoa {
  return { id: novoId('p'), nome, situacao: 'vivo', filhos: [], filhoDoConjuge }
}

/** Busca em profundidade por id, atravessando toda a descendência. */
export function encontrar(lista: Pessoa[], id: string): Pessoa | null {
  for (const p of lista) {
    if (p.id === id) return p
    const achado = encontrar(p.filhos, id)
    if (achado) return achado
  }
  return null
}

/** Remove o nó (e sua descendência) de onde quer que esteja. */
export function remover(lista: Pessoa[], id: string): boolean {
  const i = lista.findIndex((p) => p.id === id)
  if (i >= 0) {
    lista.splice(i, 1)
    return true
  }
  return lista.some((p) => remover(p.filhos, id))
}

/** Conta todas as pessoas da árvore, em qualquer profundidade. */
export function contar(lista: Pessoa[]): number {
  return lista.reduce((s, p) => s + 1 + contar(p.filhos), 0)
}

/** Todas as pessoas de um óbito, achatadas — inclusive o cônjuge. */
export function pessoasDoObito(caso: Caso): Pessoa[] {
  const saida: Pessoa[] = []
  const visitar = (p: Pessoa) => {
    saida.push(p)
    p.filhos.forEach(visitar)
  }
  caso.descendentes.forEach(visitar)
  caso.colaterais.irmaos.forEach(visitar)
  return saida
}

/** Localiza uma pessoa em qualquer lugar de um óbito (descendência ou colaterais). */
export function encontrarNoObito(caso: Caso, id: string): Pessoa | null {
  return encontrar(caso.descendentes, id) ?? encontrar(caso.colaterais.irmaos, id)
}

/**
 * Onde uma pessoa aparece dentro do processo inteiro.
 *
 * A mesma pessoa costuma figurar em mais de um inventário — a viúva que é
 * meeira no primeiro óbito e autora da herança no segundo, o filho que herda
 * do pai e depois morre. Manter o MESMO id em todos os lugares é o que permite
 * somar tudo no fim; esta busca é o que garante que a interface encontre a
 * pessoa onde quer que ela esteja.
 */
export function localizarPessoa(
  inv: Inventario,
  id: string,
): { caso: Caso; pessoa: Pessoa } | null {
  for (const caso of inv.obitos) {
    const p = encontrarNoObito(caso, id)
    if (p) return { caso, pessoa: p }
  }
  return null
}

/** Ids já usados no processo, para não repetir ao clonar famílias. */
export function idsEmUso(inv: Inventario): Set<string> {
  const ids = new Set<string>()
  for (const caso of inv.obitos) {
    ids.add(caso.id)
    ids.add(caso.conjuge.id)
    for (const p of pessoasDoObito(caso)) ids.add(p.id)
  }
  return ids
}

/** Nomes sugeridos, para que ninguém precise inventar um a cada clique. */
const NOMES = [
  'Herdeiro 1', 'Herdeiro 2', 'Herdeiro 3', 'Herdeiro 4', 'Herdeiro 5',
  'Herdeiro 6', 'Herdeiro 7', 'Herdeiro 8', 'Herdeiro 9', 'Herdeiro 10',
]

export function nomeSugerido(usados: string[]): string {
  const livre = NOMES.find((n) => !usados.includes(n))
  return livre ?? `Herdeiro ${usados.length + 1}`
}

export function nomesEmUso(lista: Pessoa[]): string[] {
  return lista.flatMap((p) => [p.nome, ...nomesEmUso(p.filhos)])
}

/**
 * Cópia profunda de uma linha de descendência preservando os ids.
 *
 * Usada quando os filhos do primeiro falecido são também os filhos do segundo:
 * são as MESMAS pessoas, e precisam do mesmo id nos dois inventários para que
 * a consolidação final some corretamente os quinhões.
 */
export function clonarPreservandoIds(lista: Pessoa[]): Pessoa[] {
  return lista.map((p) => ({
    ...p,
    filhos: clonarPreservandoIds(p.filhos),
  }))
}
