import { create } from 'zustand'
import { calcular } from '@/engine/calcular'
import type { Caso, Resultado } from '@/engine/tipos'
import { CENARIOS, casoVazio } from '@/data/cenarios'

interface EstadoCaso {
  caso: Caso
  resultado: Resultado
  cenarioAtivo: string | null

  atualizar: (mut: (c: Caso) => void) => void
  carregarCenario: (id: string) => void
  limpar: () => void
}

const inicial = CENARIOS[0].montar()

export const useCaso = create<EstadoCaso>((set) => ({
  caso: inicial,
  resultado: calcular(inicial),
  cenarioAtivo: CENARIOS[0].id,

  atualizar: (mut) =>
    set((s) => {
      const novo = structuredClone(s.caso)
      mut(novo)
      return { caso: novo, resultado: calcular(novo), cenarioAtivo: null }
    }),

  carregarCenario: (id) =>
    set((s) => {
      const cen = CENARIOS.find((c) => c.id === id)
      if (!cen) return s
      const novo = cen.montar()
      return { caso: novo, resultado: calcular(novo), cenarioAtivo: id }
    }),

  limpar: () =>
    set(() => {
      const novo = casoVazio()
      novo.nomeFalecido = ''
      return { caso: novo, resultado: calcular(novo), cenarioAtivo: null }
    }),
}))
