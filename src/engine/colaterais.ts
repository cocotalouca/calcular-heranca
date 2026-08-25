import { Fracao, F } from '@/lib/fracao'
import { SITUACOES_COM_REPRESENTACAO, type Colaterais, type Irmao, type Pessoa } from './tipos'

export interface HerdeiroColateral {
  id: string
  nome: string
  qualificacao: string
  /** Fração da quota total dos colaterais (soma 1). */
  fracao: Fracao
  grau: number
  representando?: string
  observacao?: string
}

export interface ColetaColaterais {
  herdeiros: HerdeiroColateral[]
  grau: number
  regra: string
  fundamento: string
}

/** Peso do art. 1.841: o bilateral herda o dobro do unilateral. */
const PESO = { bilateral: 2, unilateral: 1 } as const

/**
 * Chama os colaterais até o 4º grau (arts. 1.839 a 1.843).
 *
 * A ordem interna é mais sutil do que "o mais próximo exclui o mais remoto":
 *
 *  • 2º grau — irmãos. Bilaterais herdam o dobro dos unilaterais (art. 1.841);
 *    não havendo bilateral, os unilaterais dividem por igual (art. 1.842).
 *
 *  • 3º grau — sobrinhos e tios. Os sobrinhos PREFEREM os tios (art. 1.843),
 *    embora ambos sejam de 3º grau. E o modo de partilhar muda conforme haja
 *    ou não irmão vivo:
 *       – com irmão vivo, os sobrinhos representam o pai e herdam POR ESTIRPE;
 *       – sem nenhum irmão vivo, herdam POR CABEÇA (art. 1.843, §1º).
 *    A proporção 2:1 entre linhas bilateral e unilateral persiste (§2º e §3º).
 *
 *  • 4º grau — primos, tios-avós e sobrinhos-netos, todos por cabeça e em
 *    igualdade. Não há representação: ela só alcança filhos de irmãos
 *    (art. 1.853), por isso o filho de um sobrinho pré-morto não sobe.
 */
export function coletarColaterais(c: Colaterais): ColetaColaterais {
  const irmaosVivos = c.irmaos.filter((i) => i.situacao === 'vivo')
  const irmaosRepresentaveis = c.irmaos.filter(
    (i) =>
      SITUACOES_COM_REPRESENTACAO.includes(i.situacao) &&
      sobrinhosAptos(i).length > 0,
  )

  if (irmaosVivos.length > 0 || irmaosRepresentaveis.length > 0) {
    return irmaosVivos.length > 0
      ? partilhaComIrmaoVivo(irmaosVivos, irmaosRepresentaveis)
      : partilhaSoSobrinhos(irmaosRepresentaveis)
  }

  // 3º grau: tios, agora que não há irmão nem sobrinho.
  if (c.tios > 0) {
    const q = F(1, c.tios)
    return {
      herdeiros: rotular(c.tios, 'Tio(a)', 'tio', 3, q, 'Colateral de 3º grau'),
      grau: 3,
      regra: 'Sem irmãos nem sobrinhos, os tios são chamados e dividem a herança por cabeça.',
      fundamento: 'CC arts. 1.839 e 1.840',
    }
  }

  // 4º grau: todos em pé de igualdade.
  const quarto = c.primos + c.tiosAvos + c.sobrinhosNetos
  if (quarto > 0) {
    const q = F(1, quarto)
    const herdeiros: HerdeiroColateral[] = [
      ...rotular(c.primos, 'Primo(a)', 'primo', 4, q, 'Colateral de 4º grau'),
      ...rotular(c.tiosAvos, 'Tio(a)-avô(ó)', 'tioavo', 4, q, 'Colateral de 4º grau'),
      ...rotular(
        c.sobrinhosNetos,
        'Sobrinho(a)-neto(a)',
        'sobneto',
        4,
        q,
        'Colateral de 4º grau',
      ),
    ]
    return {
      herdeiros,
      grau: 4,
      regra:
        'Esgotados os graus anteriores, os colaterais de 4º grau — primos, tios-avós e sobrinhos-netos — herdam por cabeça, em partes iguais.',
      fundamento: 'CC arts. 1.839 e 1.840',
    }
  }

  return { herdeiros: [], grau: 0, regra: '', fundamento: '' }
}

/** Sobrinhos vivos de um irmão — únicos representantes admitidos (art. 1.853). */
function sobrinhosAptos(irmao: Irmao): Pessoa[] {
  return irmao.filhos.filter((f) => f.situacao === 'vivo')
}

/**
 * Há pelo menos um irmão vivo: as estirpes dos irmãos pré-mortos são
 * representadas pelos sobrinhos, que dividem entre si a quota do pai.
 */
function partilhaComIrmaoVivo(
  vivos: Irmao[],
  representados: Irmao[],
): ColetaColaterais {
  const estirpes = [...vivos, ...representados]
  const pesoTotal = estirpes.reduce((s, i) => s + PESO[i.vinculo], 0)
  const herdeiros: HerdeiroColateral[] = []

  for (const irmao of estirpes) {
    const quota = F(PESO[irmao.vinculo], pesoTotal)
    const vinculoTxt = irmao.vinculo === 'bilateral' ? 'bilateral' : 'unilateral'

    if (irmao.situacao === 'vivo') {
      herdeiros.push({
        id: irmao.id,
        nome: irmao.nome,
        qualificacao: `Irmão(ã) ${vinculoTxt}`,
        fracao: quota,
        grau: 2,
      })
      continue
    }

    const sobrinhos = sobrinhosAptos(irmao)
    const porSobrinho = quota.dividido(sobrinhos.length)
    for (const s of sobrinhos) {
      herdeiros.push({
        id: s.id,
        nome: s.nome,
        qualificacao: `Sobrinho(a) · ${vinculoTxt}`,
        fracao: porSobrinho,
        grau: 3,
        representando: irmao.nome,
        observacao: `Representa ${irmao.nome} e divide a quota dele com os demais filhos.`,
      })
    }
  }

  const temUnilateral = estirpes.some((i) => i.vinculo === 'unilateral')
  const temBilateral = estirpes.some((i) => i.vinculo === 'bilateral')

  return {
    herdeiros,
    grau: 2,
    regra:
      temBilateral && temUnilateral
        ? 'Irmãos bilaterais e unilaterais concorrem: cada unilateral recebe metade do que recebe cada bilateral. Sobrinhos de irmão falecido herdam por estirpe, representando o pai.'
        : 'Os irmãos dividem a herança por igual. Sobrinhos de irmão falecido herdam por estirpe, representando o pai.',
    fundamento: 'CC arts. 1.840, 1.841, 1.842 e 1.853',
  }
}

/**
 * Nenhum irmão vivo — só sobrinhos. Aqui a partilha é POR CABEÇA
 * (art. 1.843, §1º), mantida a proporção 2:1 entre filhos de irmão bilateral e
 * de irmão unilateral (§2º). Se todos vierem do mesmo tipo de vínculo,
 * dividem por igual (§3º).
 */
function partilhaSoSobrinhos(representados: Irmao[]): ColetaColaterais {
  const lista: { sobrinho: Pessoa; irmao: Irmao }[] = []
  for (const irmao of representados) {
    for (const s of sobrinhosAptos(irmao)) lista.push({ sobrinho: s, irmao })
  }

  const pesoTotal = lista.reduce((s, x) => s + PESO[x.irmao.vinculo], 0)
  const herdeiros = lista.map(({ sobrinho, irmao }) => ({
    id: sobrinho.id,
    nome: sobrinho.nome,
    qualificacao: `Sobrinho(a) · ${irmao.vinculo}`,
    fracao: F(PESO[irmao.vinculo], pesoTotal),
    grau: 3,
    observacao: `Filho(a) de ${irmao.nome}. Herda por direito próprio, e não por representação.`,
  }))

  const misto =
    lista.some((x) => x.irmao.vinculo === 'bilateral') &&
    lista.some((x) => x.irmao.vinculo === 'unilateral')

  return {
    herdeiros,
    grau: 3,
    regra: misto
      ? 'Como nenhum irmão sobreviveu, os sobrinhos herdam por cabeça — e não por estirpe. Os filhos de irmão unilateral recebem metade do que recebem os filhos de irmão bilateral.'
      : 'Como nenhum irmão sobreviveu, os sobrinhos herdam por cabeça, em partes iguais — e não por estirpe.',
    fundamento: 'CC art. 1.843, §§ 1º a 3º',
  }
}

function rotular(
  n: number,
  rotulo: string,
  prefixo: string,
  grau: number,
  fracao: Fracao,
  qualificacao: string,
): HerdeiroColateral[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `col-${prefixo}-${i}`,
    nome: n > 1 ? `${rotulo} ${i + 1}` : rotulo,
    qualificacao,
    fracao,
    grau,
  }))
}
