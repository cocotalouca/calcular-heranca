import { Fracao, F } from '@/lib/fracao'
import {
  SITUACOES_COM_REPRESENTACAO,
  type Pessoa,
} from './tipos'

/** Um herdeiro concreto dentro de uma estirpe, já com sua fração interna. */
export interface MembroEstirpe {
  pessoa: Pessoa
  /** Fração DA ESTIRPE que cabe a este membro (soma 1 dentro da estirpe). */
  fracaoInterna: Fracao
  /** Quantas gerações abaixo do falecido (1 = filho, 2 = neto…). */
  nivel: number
  /** Nome do ascendente representado, se herda por representação. */
  representando?: string
  /** Descende também do cônjuge sobrevivente? Usado na reserva do art. 1.832. */
  viaConjuge?: boolean
}

export interface Estirpe {
  /** Cabeça da estirpe — o descendente de 1º grau (ou o neto, no caso do art. 1.811). */
  raiz: Pessoa
  membros: MembroEstirpe[]
  /** Algum membro herda por representação (art. 1.851)? */
  porRepresentacao: boolean
}

export interface ColetaDescendentes {
  estirpes: Estirpe[]
  /**
   * Número de "cabeças" para efeito do art. 1.832 — quantos sucedem por
   * direito próprio no grau mais próximo. É com este número que se compara
   * o quinhão do cônjuge.
   */
  cabecas: number
  /** Grau em que a sucessão efetivamente se abriu (1 = filhos, 2 = netos…). */
  grauOperativo: number
  /** A classe caiu para o grau seguinte por renúncia de todos (art. 1.811). */
  aplicou1811: boolean
  /** Herdeiros que caíram fora e por quê — para explicar ao usuário. */
  descartados: { nome: string; motivo: string }[]
}

/**
 * Percorre uma estirpe recursivamente aplicando o direito de representação.
 *
 * Devolve `null` quando a estirpe está extinta: ou porque o herdeiro renunciou
 * (art. 1.811 — não se representa renunciante), ou porque faleceu sem deixar
 * quem o representasse.
 */
function resolverEstirpe(
  pessoa: Pessoa,
  nivel: number,
  descartados: { nome: string; motivo: string }[],
  representadoPor?: string,
): MembroEstirpe[] | null {
  if (pessoa.situacao === 'vivo') {
    return [
      {
        pessoa,
        fracaoInterna: Fracao.UM,
        nivel,
        representando: representadoPor,
      },
    ]
  }

  if (pessoa.situacao === 'renunciante') {
    descartados.push({
      nome: pessoa.nome,
      motivo:
        'Renunciou à herança. Ninguém sucede representando renunciante (art. 1.811), então sua parte acresce aos co-herdeiros.',
    })
    return null
  }

  if (SITUACOES_COM_REPRESENTACAO.includes(pessoa.situacao)) {
    const sub = pessoa.filhos
      .map((f) => resolverEstirpe(f, nivel + 1, descartados, pessoa.nome))
      .filter((x): x is MembroEstirpe[] => x !== null)

    if (sub.length === 0) {
      descartados.push({
        nome: pessoa.nome,
        motivo:
          'Não sobreviveu ao autor da herança e não deixou descendentes aptos a representá-lo. A estirpe se extingue e a parte acresce aos co-herdeiros.',
      })
      return null
    }

    // Art. 1.855: o quinhão do representado divide-se por igual entre os
    // representantes — cada ramo vale 1/n, e dentro dele a fração já apurada.
    const peso = F(1, sub.length)
    return sub.flatMap((ramo) =>
      ramo.map((m) => ({ ...m, fracaoInterna: m.fracaoInterna.vezes(peso) })),
    )
  }

  return null
}

/**
 * Monta as estirpes de descendentes chamadas a suceder.
 *
 * Regra geral: os filhos herdam por cabeça; os netos, por estirpe, representando
 * o pai pré-morto (arts. 1.833 e 1.835).
 *
 * Exceção do art. 1.811: se TODOS os descendentes de 1º grau renunciarem (ou se
 * o único renunciar), os filhos deles vêm à sucessão por direito próprio e
 * POR CABEÇA — e não por estirpe. A diferença é real: com dois filhos
 * renunciantes, um com 2 filhos e outro com 1, os três netos recebem 1/3 cada,
 * e não 1/4, 1/4 e 1/2.
 */
export function coletarDescendentes(
  descendentes: Pessoa[],
): ColetaDescendentes {
  const descartados: { nome: string; motivo: string }[] = []

  const estirpes: Estirpe[] = []
  for (const filho of descendentes) {
    const membros = resolverEstirpe(filho, 1, descartados)
    if (membros && membros.length > 0) {
      estirpes.push({
        raiz: filho,
        membros,
        porRepresentacao: membros.some((m) => m.representando !== undefined),
      })
    }
  }

  if (estirpes.length > 0) {
    return {
      estirpes,
      cabecas: estirpes.length,
      grauOperativo: 1,
      aplicou1811: false,
      descartados,
    }
  }

  // Nenhuma estirpe sobreviveu. Se isso ocorreu porque todos renunciaram,
  // e há netos, eles sobem por direito próprio e por cabeça (art. 1.811).
  const renunciantes = descendentes.filter((d) => d.situacao === 'renunciante')
  const todosRenunciaram =
    descendentes.length > 0 && renunciantes.length === descendentes.length

  if (todosRenunciaram) {
    const netos: MembroEstirpe[] = []
    for (const r of renunciantes) {
      for (const neto of r.filhos) {
        const m = resolverEstirpe(neto, 2, descartados)
        // O vínculo com o cônjuge sobrevivente atravessa a geração: se o filho
        // renunciante era do casal, os netos que sobem também descendem dele.
        if (m) netos.push(...m.map((x) => ({ ...x, viaConjuge: r.filhoDoConjuge })))
      }
    }
    if (netos.length > 0) {
      // Por cabeça: cada neto é sua própria estirpe, com peso idêntico.
      return {
        estirpes: netos.map((m) => ({
          raiz: { ...m.pessoa, filhoDoConjuge: m.viaConjuge },
          membros: [{ ...m, fracaoInterna: Fracao.UM, representando: undefined }],
          porRepresentacao: false,
        })),
        cabecas: netos.length,
        grauOperativo: 2,
        aplicou1811: true,
        descartados,
      }
    }
  }

  return {
    estirpes: [],
    cabecas: 0,
    grauOperativo: 0,
    aplicou1811: false,
    descartados,
  }
}

/**
 * O cônjuge é ascendente de todos os descendentes com quem concorre?
 * É esse o pressuposto da reserva de 1/4 do art. 1.832.
 *
 * Devolve 'todos' | 'nenhum' | 'hibrida'.
 */
export function analisarFiliacao(
  estirpes: Estirpe[],
): 'todos' | 'nenhum' | 'hibrida' {
  if (estirpes.length === 0) return 'nenhum'
  const flags = estirpes.map((e) => e.raiz.filhoDoConjuge === true)
  const comuns = flags.filter(Boolean).length
  if (comuns === flags.length) return 'todos'
  if (comuns === 0) return 'nenhum'
  return 'hibrida'
}
