import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tema = 'escuro' | 'claro'

interface EstadoTema {
  tema: Tema
  alternar: () => void
}

function aplicar(t: Tema) {
  document.documentElement.dataset.tema = t
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', t === 'escuro' ? '#080a12' : '#f7f6f3')
}

/**
 * Preferência de tema, guardada no navegador.
 *
 * O tema entra no <html data-tema> porque as cores vivem em variáveis CSS —
 * assim a troca é instantânea e nenhum componente precisa reagir a ela.
 */
export const useTema = create<EstadoTema>()(
  persist(
    (set) => ({
      tema: 'escuro',
      alternar: () =>
        set((s) => {
          const t: Tema = s.tema === 'escuro' ? 'claro' : 'escuro'
          aplicar(t)
          return { tema: t }
        }),
    }),
    {
      name: 'partilha-justa:tema',
      onRehydrateStorage: () => (estado) => {
        if (estado?.tema) aplicar(estado.tema)
      },
    },
  ),
)
