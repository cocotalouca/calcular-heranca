import type {
  Ascendentes,
  Caso,
  Colaterais,
  Conjuge,
  Irmao,
  Patrimonio,
  Pessoa,
  Regime,
  Situacao,
} from '../tipos'
import { OPCOES_PADRAO } from '../tipos'

let seq = 0
const id = (p: string) => `${p}-${++seq}`

export function pessoa(
  nome: string,
  situacao: Situacao = 'vivo',
  filhos: Pessoa[] = [],
  filhoDoConjuge?: boolean,
): Pessoa {
  return { id: id('p'), nome, situacao, filhos, filhoDoConjuge }
}

export function irmao(
  nome: string,
  vinculo: 'bilateral' | 'unilateral' = 'bilateral',
  situacao: Situacao = 'vivo',
  filhos: Pessoa[] = [],
): Irmao {
  return { id: id('i'), nome, situacao, filhos, vinculo }
}

export function conjuge(over: Partial<Conjuge> = {}): Conjuge {
  return {
    existe: true,
    nome: 'Cônjuge',
    vinculo: 'casamento',
    regime: 'comunhao_parcial',
    situacao: 'vivo',
    sumula377: false,
    separadoDeFato: false,
    ...over,
  }
}

export const semConjuge: Conjuge = {
  existe: false,
  nome: '',
  vinculo: 'casamento',
  regime: 'comunhao_parcial',
  situacao: 'vivo',
  sumula377: false,
  separadoDeFato: false,
}

export const semAscendentes: Ascendentes = {
  pai: false,
  mae: false,
  avosPaternos: 0,
  avosMaternos: 0,
  bisavosPaternos: 0,
  bisavosMaternos: 0,
}

export const semColaterais: Colaterais = {
  irmaos: [],
  tios: 0,
  primos: 0,
  tiosAvos: 0,
  sobrinhosNetos: 0,
}

export function patrimonio(over: Partial<Patrimonio> = {}): Patrimonio {
  return {
    bensComuns: 0,
    bensParticulares: 0,
    dividas: 0,
    despesasFuneral: 0,
    doacoes: [],
    legados: [],
    ...over,
  }
}

export function caso(over: Partial<Caso> = {}): Caso {
  return {
    nomeFalecido: 'De cujus',
    conjuge: semConjuge,
    descendentes: [],
    ascendentes: semAscendentes,
    colaterais: semColaterais,
    patrimonio: patrimonio(),
    opcoes: { ...OPCOES_PADRAO },
    ...over,
  }
}

export function comRegime(r: Regime, over: Partial<Conjuge> = {}): Conjuge {
  return conjuge({ regime: r, ...over })
}
