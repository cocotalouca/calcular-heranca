import { create } from 'zustand'
import { calcularInventario } from '@/engine/cumulativo'
import type { Caso, Inventario, Pessoa, ResultadoCumulativo } from '@/engine/tipos'
import { MODELOS, casoVazio, inventarioVazio, patrimonioVazio } from '@/data/modelos'
import { clonarPreservandoIds, encontrarNoObito, novoId } from '@/lib/arvore'

const CHAVE = 'partilha-justa:inventario:v2'

/** Etapa da sessão: a abertura pergunta de onde partir antes de mostrar dados. */
export type Fase = 'abertura' | 'pronto'

interface EstadoInventario {
  inventario: Inventario
  resultado: ResultadoCumulativo
  /** Óbito em edição. */
  obitoAtivo: string
  modeloAtivo: string | null
  fase: Fase
  /** Havia trabalho salvo quando a página abriu? */
  temRascunho: boolean

  /* --- abertura --- */
  comecarDoZero: () => void
  continuarRascunho: () => void
  carregarModelo: (id: string) => void
  abrirAbertura: () => void

  /* --- edição --- */
  atualizar: (mut: (c: Caso) => void) => void
  renomearProcesso: (titulo: string) => void
  selecionarObito: (id: string) => void
  adicionarObito: () => void
  removerObito: (id: string) => void
  moverObito: (id: string, direcao: -1 | 1) => void
  ordenarPorData: () => void
  /** Transforma um herdeiro que também faleceu em um novo óbito, já ligado. */
  criarObitoDePessoa: (obitoId: string, pessoaId: string) => void
  criarObitoDoConjuge: (obitoId: string) => void
  criarObitoDoAscendente: (obitoId: string, lado: 'pai' | 'mae') => void
  desligarObito: (obitoId: string, pessoaId: string) => void
}

/* ------------------------------------------------------------------ *
 * Persistência
 * ------------------------------------------------------------------ */

function ler(): Inventario | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return null
    const dados = JSON.parse(bruto) as Inventario
    if (!dados?.obitos?.length) return null
    return dados
  } catch {
    return null
  }
}

function salvar(inv: Inventario) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(inv))
  } catch {
    // Cota cheia ou modo privativo: seguir sem persistir é melhor que quebrar.
  }
}

const rascunho = typeof localStorage !== 'undefined' ? ler() : null
const vazio = inventarioVazio()

/* ------------------------------------------------------------------ *
 * Recalcular e guardar, num lugar só
 * ------------------------------------------------------------------ */

function aplicar(inv: Inventario, obitoAtivo?: string, modeloAtivo: string | null = null) {
  salvar(inv)
  const ativo =
    obitoAtivo && inv.obitos.some((o) => o.id === obitoAtivo)
      ? obitoAtivo
      : inv.obitos[0]?.id ?? ''
  return {
    inventario: inv,
    resultado: calcularInventario(inv),
    obitoAtivo: ativo,
    modeloAtivo,
  }
}

export const useInventario = create<EstadoInventario>((set) => ({
  inventario: vazio,
  resultado: calcularInventario(vazio),
  obitoAtivo: vazio.obitos[0].id,
  modeloAtivo: null,
  fase: 'abertura',
  temRascunho: rascunho !== null,

  /* ============================ abertura ============================ */

  comecarDoZero: () =>
    set(() => {
      const novo = inventarioVazio()
      return { ...aplicar(novo, novo.obitos[0].id), fase: 'pronto' as const }
    }),

  continuarRascunho: () =>
    set(() => {
      const salvo = ler() ?? inventarioVazio()
      return { ...aplicar(salvo, salvo.obitos[0].id), fase: 'pronto' as const }
    }),

  carregarModelo: (id) =>
    set(() => {
      const modelo = MODELOS.find((m) => m.id === id)
      if (!modelo) return {}
      const novo = modelo.montar()
      return { ...aplicar(novo, novo.obitos[0].id, id), fase: 'pronto' as const }
    }),

  abrirAbertura: () => set({ fase: 'abertura', temRascunho: true }),

  /* ============================= edição ============================= */

  atualizar: (mut) =>
    set((s) => {
      const inv: Inventario = structuredClone(s.inventario)
      const alvo = inv.obitos.find((o) => o.id === s.obitoAtivo)
      if (!alvo) return {}
      mut(alvo)
      return aplicar(inv, s.obitoAtivo)
    }),

  renomearProcesso: (titulo) =>
    set((s) => {
      const inv = { ...s.inventario, titulo }
      return aplicar(inv, s.obitoAtivo, s.modeloAtivo)
    }),

  selecionarObito: (id) => set({ obitoAtivo: id }),

  adicionarObito: () =>
    set((s) => {
      const inv: Inventario = structuredClone(s.inventario)
      const novo = casoVazio('')
      inv.obitos.push(novo)
      return aplicar(inv, novo.id)
    }),

  removerObito: (id) =>
    set((s) => {
      if (s.inventario.obitos.length <= 1) return {}
      const inv: Inventario = structuredClone(s.inventario)
      inv.obitos = inv.obitos.filter((o) => o.id !== id)
      // Vínculos órfãos viram ruído silencioso: melhor cortá-los na origem.
      for (const caso of inv.obitos) {
        limparVinculos(caso, id)
      }
      const proximo = inv.obitos[0].id
      return aplicar(inv, s.obitoAtivo === id ? proximo : s.obitoAtivo)
    }),

  moverObito: (id, direcao) =>
    set((s) => {
      const inv: Inventario = structuredClone(s.inventario)
      const i = inv.obitos.findIndex((o) => o.id === id)
      const j = i + direcao
      if (i < 0 || j < 0 || j >= inv.obitos.length) return {}
      ;[inv.obitos[i], inv.obitos[j]] = [inv.obitos[j], inv.obitos[i]]
      return aplicar(inv, s.obitoAtivo)
    }),

  ordenarPorData: () =>
    set((s) => {
      const inv: Inventario = structuredClone(s.inventario)
      // Quem não tem data fica ao fim, na ordem em que já estava.
      inv.obitos = inv.obitos
        .map((o, i) => ({ o, i }))
        .sort((a, b) => {
          const da = a.o.dataObito || ''
          const db = b.o.dataObito || ''
          if (da && db) return da.localeCompare(db) || a.i - b.i
          if (da) return -1
          if (db) return 1
          return a.i - b.i
        })
        .map((x) => x.o)
      return aplicar(inv, s.obitoAtivo)
    }),

  /* ------------------- criar óbito a partir de alguém ------------------- */

  criarObitoDePessoa: (obitoId, pessoaId) =>
    set((s) => {
      const inv: Inventario = structuredClone(s.inventario)
      const origem = inv.obitos.find((o) => o.id === obitoId)
      if (!origem) return {}
      const pessoa = encontrarNoObito(origem, pessoaId)
      if (!pessoa) return {}

      const novo = casoVazio(pessoa.nome || 'Herdeiro falecido')
      novo.parentesco = descreverParentesco(origem, pessoa)
      // Os filhos do herdeiro falecido são os descendentes da sucessão dele —
      // as MESMAS pessoas, com os mesmos ids, para que a soma final feche.
      novo.descendentes = clonarPreservandoIds(pessoa.filhos)
      pessoa.obitoId = novo.id
      if (pessoa.situacao === 'vivo') pessoa.situacao = 'pos_morto'

      inserir(inv, novo, origem.id, pessoa.situacao === 'pos_morto' ? 'depois' : 'antes')
      return aplicar(inv, novo.id)
    }),

  criarObitoDoConjuge: (obitoId) =>
    set((s) => {
      const inv: Inventario = structuredClone(s.inventario)
      const origem = inv.obitos.find((o) => o.id === obitoId)
      if (!origem || !origem.conjuge.existe) return {}

      const c = origem.conjuge
      const novo = casoVazio(c.nome || 'Cônjuge sobrevivente')
      novo.parentesco = `${c.vinculo === 'uniao_estavel' ? 'Companheiro(a)' : 'Cônjuge'} de ${
        origem.nomeFalecido || 'o primeiro falecido'
      }`

      // Os filhos comuns ao casal são também os descendentes desta sucessão.
      novo.descendentes = clonarPreservandoIds(
        origem.descendentes.filter((d) => d.filhoDoConjuge !== false),
      )
      novo.patrimonio = patrimonioVazio()

      // De volta: no inventário do sobrevivente, o primeiro falecido é o
      // cônjuge pré-morto — sem meação e sem herança, mas registrado.
      novo.conjuge = {
        ...origem.conjuge,
        id: novoId('c'),
        nome: origem.nomeFalecido || 'Primeiro falecido',
        situacao: c.situacao === 'comoriente' ? 'comoriente' : 'pre_morto',
        obitoId: origem.id,
      }

      c.obitoId = novo.id
      if (c.situacao === 'vivo') c.situacao = 'pos_morto'

      inserir(inv, novo, origem.id, c.situacao === 'pos_morto' ? 'depois' : 'antes')
      return aplicar(inv, novo.id)
    }),

  criarObitoDoAscendente: (obitoId, lado) =>
    set((s) => {
      const inv: Inventario = structuredClone(s.inventario)
      const origem = inv.obitos.find((o) => o.id === obitoId)
      if (!origem) return {}

      const ehPai = lado === 'pai'
      const a = origem.ascendentes
      if (ehPai ? !a.pai : !a.mae) return {}

      const nome = (ehPai ? a.nomePai : a.nomeMae) || (ehPai ? 'Pai' : 'Mãe')
      const novo = casoVazio(nome)
      novo.parentesco = `${ehPai ? 'Pai' : 'Mãe'} de ${origem.nomeFalecido || 'o primeiro falecido'}`

      // O falecido cujo inventário estamos vendo é filho desta pessoa: entra
      // como descendente pré-morto na sucessão dela, e os netos o representam.
      novo.descendentes = [
        {
          id: `desc-${origem.id}`,
          nome: origem.nomeFalecido || 'Filho(a) falecido(a)',
          situacao: 'pre_morto',
          filhos: clonarPreservandoIds(origem.descendentes),
          filhoDoConjuge: true,
          obitoId: origem.id,
        },
      ]

      if (ehPai) a.obitoPaiId = novo.id
      else a.obitoMaeId = novo.id

      inserir(inv, novo, origem.id, 'depois')
      return aplicar(inv, novo.id)
    }),
  desligarObito: (obitoId, pessoaId) =>
    set((s) => {
      const inv: Inventario = structuredClone(s.inventario)
      const origem = inv.obitos.find((o) => o.id === obitoId)
      if (!origem) return {}
      if (origem.conjuge.id === pessoaId) origem.conjuge.obitoId = undefined
      if (pessoaId === 'asc-1-paterna-0') origem.ascendentes.obitoPaiId = undefined
      if (pessoaId === 'asc-1-materna-0') origem.ascendentes.obitoMaeId = undefined
      const pessoa = encontrarNoObito(origem, pessoaId)
      if (pessoa) pessoa.obitoId = undefined
      return aplicar(inv, s.obitoAtivo)
    }),
}))

/* ------------------------------------------------------------------ *
 * Auxiliares
 * ------------------------------------------------------------------ */

function inserir(inv: Inventario, novo: Caso, refId: string, onde: 'antes' | 'depois') {
  const i = inv.obitos.findIndex((o) => o.id === refId)
  const pos = onde === 'depois' ? i + 1 : i
  inv.obitos.splice(Math.max(0, pos), 0, novo)
}

function limparVinculos(caso: Caso, obitoRemovido: string) {
  const visitar = (p: Pessoa) => {
    if (p.obitoId === obitoRemovido) p.obitoId = undefined
    p.filhos.forEach(visitar)
  }
  caso.descendentes.forEach(visitar)
  caso.colaterais.irmaos.forEach(visitar)
  if (caso.conjuge.obitoId === obitoRemovido) caso.conjuge.obitoId = undefined
  if (caso.ascendentes.obitoPaiId === obitoRemovido) caso.ascendentes.obitoPaiId = undefined
  if (caso.ascendentes.obitoMaeId === obitoRemovido) caso.ascendentes.obitoMaeId = undefined
}

function descreverParentesco(origem: Caso, pessoa: Pessoa): string {
  const nome = origem.nomeFalecido || 'o primeiro falecido'
  const ehIrmao = origem.colaterais.irmaos.some((i) => i.id === pessoa.id)
  if (ehIrmao) return `Irmão(ã) de ${nome}`
  const ehFilho = origem.descendentes.some((d) => d.id === pessoa.id)
  if (ehFilho) return `Filho(a) de ${nome}`
  return `Herdeiro(a) de ${nome}`
}

/** Óbito em edição no momento. */
export function useObitoAtivo(): Caso {
  return useInventario(
    (s) => s.inventario.obitos.find((o) => o.id === s.obitoAtivo) ?? s.inventario.obitos[0],
  )
}

/** Resultado da sucessão em edição. */
export function useResultadoAtivo() {
  return useInventario(
    (s) =>
      s.resultado.etapas.find((e) => e.original.id === s.obitoAtivo) ??
      s.resultado.etapas[0],
  )
}

/** Nome do falecido de um óbito, para exibir os elos entre inventários. */
export function useNomeDoObito() {
  const obitos = useInventario((s) => s.inventario.obitos)
  return (obitoId: string) => {
    const i = obitos.findIndex((o) => o.id === obitoId)
    if (i < 0) return undefined
    return obitos[i].nomeFalecido || `Falecido ${i + 1}`
  }
}
