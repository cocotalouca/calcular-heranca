import type { Pessoa } from '@/engine/tipos'

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

/** Nomes sugeridos, para que ninguém precise inventar um a cada clique. */
const NOMES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Hugo',
  'Isabel', 'Jonas', 'Késia', 'Lucas', 'Mariana', 'Nuno', 'Olívia', 'Paulo',
  'Rafaela', 'Sérgio', 'Tereza', 'Vitor',
]

export function nomeSugerido(usados: string[]): string {
  const livre = NOMES.find((n) => !usados.includes(n))
  return livre ?? `Herdeiro ${usados.length + 1}`
}

export function nomesEmUso(lista: Pessoa[]): string[] {
  return lista.flatMap((p) => [p.nome, ...nomesEmUso(p.filhos)])
}
