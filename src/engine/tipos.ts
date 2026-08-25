import type { Fracao } from '@/lib/fracao'

/* ------------------------------------------------------------------ *
 * Situação de cada parente diante da sucessão
 * ------------------------------------------------------------------ */

export type Situacao =
  /** Vivo e apto a suceder. */
  | 'vivo'
  /** Morreu antes do autor da herança. Seus descendentes representam (art. 1.851). */
  | 'pre_morto'
  /** Morreu junto, sem prova de quem primeiro. Não há transmissão entre eles (art. 8º). */
  | 'comoriente'
  /** Renunciou. NÃO há representação: a quota acresce aos co-herdeiros (art. 1.811). */
  | 'renunciante'
  /** Excluído por indignidade. Efeito pessoal: os descendentes representam (art. 1.816). */
  | 'indigno'
  /** Deserdado em testamento. Mesmo efeito pessoal do indigno (arts. 1.961 e 1.816). */
  | 'deserdado'

/** Situações em que o parente não recebe, mas abre caminho à representação. */
export const SITUACOES_COM_REPRESENTACAO: Situacao[] = [
  'pre_morto',
  'comoriente',
  'indigno',
  'deserdado',
]

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  vivo: 'Vivo(a)',
  pre_morto: 'Pré-morto(a)',
  comoriente: 'Comoriente',
  renunciante: 'Renunciou',
  indigno: 'Excluído por indignidade',
  deserdado: 'Deserdado(a)',
}

/* ------------------------------------------------------------------ *
 * Regime de bens
 * ------------------------------------------------------------------ */

export type Regime =
  | 'comunhao_parcial'
  | 'comunhao_universal'
  | 'separacao_convencional'
  | 'separacao_obrigatoria'
  | 'participacao_final'

export interface InfoRegime {
  id: Regime
  nome: string
  curto: string
  resumo: string
  /** Há meação sobre a massa comum? */
  temMeacao: boolean
  /** Concorre com descendentes (1ª classe)? */
  concorrenciaDescendentes: 'sempre' | 'nunca' | 'se_particulares'
  fundamento: string
}

export const REGIMES: Record<Regime, InfoRegime> = {
  comunhao_parcial: {
    id: 'comunhao_parcial',
    nome: 'Comunhão parcial de bens',
    curto: 'Comunhão parcial',
    resumo:
      'Regime legal desde 1977. Comunicam-se os bens adquiridos onerosamente na constância do casamento. O cônjuge só concorre com os descendentes se o falecido deixou bens particulares — e a concorrência recai apenas sobre esses bens.',
    temMeacao: true,
    concorrenciaDescendentes: 'se_particulares',
    fundamento: 'CC arts. 1.658–1.666 e 1.829, I; STJ REsp 1.368.123/SP (2ª Seção)',
  },
  comunhao_universal: {
    id: 'comunhao_universal',
    nome: 'Comunhão universal de bens',
    curto: 'Comunhão universal',
    resumo:
      'Comunicam-se todos os bens, presentes e futuros. Como o cônjuge já é meeiro de tudo, a lei o exclui da concorrência com os descendentes.',
    temMeacao: true,
    concorrenciaDescendentes: 'nunca',
    fundamento: 'CC arts. 1.667–1.671 e 1.829, I',
  },
  separacao_convencional: {
    id: 'separacao_convencional',
    nome: 'Separação convencional (pacto antenupcial)',
    curto: 'Separação convencional',
    resumo:
      'Escolhida livremente pelo casal em pacto antenupcial. Não há meação — mas o cônjuge é herdeiro necessário e CONCORRE com os descendentes sobre toda a herança.',
    temMeacao: false,
    concorrenciaDescendentes: 'sempre',
    fundamento: 'CC arts. 1.687–1.688 e 1.829, I; STJ REsp 1.472.945/RJ',
  },
  separacao_obrigatoria: {
    id: 'separacao_obrigatoria',
    nome: 'Separação obrigatória (legal)',
    curto: 'Separação obrigatória',
    resumo:
      'Imposta por lei (maior de 70 anos, causa suspensiva, suprimento judicial). O cônjuge NÃO concorre com os descendentes. Pela Súmula 377/STF os aquestos podem se comunicar, gerando meação.',
    temMeacao: false,
    concorrenciaDescendentes: 'nunca',
    fundamento: 'CC arts. 1.641 e 1.829, I; Súmula 377/STF; STF Tema 1.236',
  },
  participacao_final: {
    id: 'participacao_final',
    nome: 'Participação final nos aquestos',
    curto: 'Participação final',
    resumo:
      'Cada cônjuge administra seu patrimônio; na dissolução apura-se a meação sobre os aquestos. Não está entre as exceções do art. 1.829, I — logo o cônjuge concorre com os descendentes.',
    temMeacao: true,
    concorrenciaDescendentes: 'sempre',
    fundamento: 'CC arts. 1.672–1.686 e 1.829, I',
  },
}

/* ------------------------------------------------------------------ *
 * Árvore de parentes
 * ------------------------------------------------------------------ */

export interface Pessoa {
  id: string
  nome: string
  situacao: Situacao
  /** Descendentes desta pessoa, para fins de representação. */
  filhos: Pessoa[]
  /** Só para descendentes de 1º grau: é filho também do cônjuge sobrevivente? */
  filhoDoConjuge?: boolean
}

export interface Irmao extends Pessoa {
  vinculo: 'bilateral' | 'unilateral'
}

export interface Conjuge {
  existe: boolean
  nome: string
  /** O tratamento sucessório é o mesmo (STF Temas 809 e 498). */
  vinculo: 'casamento' | 'uniao_estavel'
  regime: Regime
  situacao: Situacao
  /**
   * Separação obrigatória: aplicar a Súmula 377/STF e comunicar os aquestos?
   * Afeta apenas a meação, nunca a herança.
   */
  sumula377: boolean
  /**
   * Separado judicialmente, ou de fato há mais de 2 anos ao tempo da morte.
   * Nesse caso o cônjuge perde o direito sucessório, mas não a meação
   * (art. 1.830).
   */
  separadoDeFato: boolean
}

export interface Ascendentes {
  pai: boolean
  mae: boolean
  /** Avós vivos por linha (0 a 2 em cada). */
  avosPaternos: number
  avosMaternos: number
  /** Bisavós vivos por linha (0 a 4 em cada). */
  bisavosPaternos: number
  bisavosMaternos: number
}

export interface Colaterais {
  /** 2º grau. Os filhos de cada um são os sobrinhos (3º grau, com representação). */
  irmaos: Irmao[]
  /** 3º grau, excluídos pelos sobrinhos (art. 1.843). */
  tios: number
  /** 4º grau — herdam por cabeça, em igualdade, se nada houver no 3º grau. */
  primos: number
  tiosAvos: number
  sobrinhosNetos: number
}

/* ------------------------------------------------------------------ *
 * Patrimônio
 * ------------------------------------------------------------------ */

export interface Doacao {
  id: string
  /** id do herdeiro donatário (descendente ou cônjuge). */
  donatarioId: string
  nomeDonatario: string
  /** Valor ao tempo da doação, em reais (art. 2.004). */
  valor: number
  /** Dispensada de colação — sai da parte disponível (art. 2.005). */
  dispensada: boolean
}

export interface Legado {
  id: string
  beneficiario: string
  modo: 'percentual_heranca' | 'valor'
  /** Percentual (0–100) da herança líquida, ou valor fixo em reais. */
  quantia: number
}

export interface Patrimonio {
  /** Massa comum do casal, sobre a qual incide a meação. Valor TOTAL (dos dois). */
  bensComuns: number
  /** Bens exclusivos do falecido (herdados, doados, anteriores ao casamento…). */
  bensParticulares: number
  /** Dívidas do espólio. */
  dividas: number
  despesasFuneral: number
  doacoes: Doacao[]
  legados: Legado[]
}

/* ------------------------------------------------------------------ *
 * Caso completo
 * ------------------------------------------------------------------ */

export interface OpcoesInterpretativas {
  /**
   * Filiação híbrida (alguns filhos são do cônjuge, outros não): reservar 1/4
   * ao cônjuge? Padrão: NÃO (Enunciado 527 da V Jornada de Direito Civil).
   */
  reservaQuartoFiliacaoHibrida: boolean
  /**
   * Comunhão parcial com bens particulares: a concorrência recai só sobre os
   * particulares (STJ REsp 1.368.123/SP) ou sobre toda a herança?
   */
  concorrenciaSoBensParticulares: boolean
}

export const OPCOES_PADRAO: OpcoesInterpretativas = {
  reservaQuartoFiliacaoHibrida: false,
  concorrenciaSoBensParticulares: true,
}

export interface Caso {
  nomeFalecido: string
  conjuge: Conjuge
  descendentes: Pessoa[]
  ascendentes: Ascendentes
  colaterais: Colaterais
  patrimonio: Patrimonio
  opcoes: OpcoesInterpretativas
}

/* ------------------------------------------------------------------ *
 * Resultado
 * ------------------------------------------------------------------ */

export type TipoQuota = 'meacao' | 'heranca' | 'legado'

export interface Quota {
  id: string
  nome: string
  /** Parentesco legível: "Filha", "Cônjuge", "Neto (por representação)". */
  qualificacao: string
  tipo: TipoQuota
  /** Fração da HERANÇA LÍQUIDA. Zero para meação pura. */
  fracaoHeranca: Fracao
  valorCentavos: bigint
  fundamento: string[]
  representando?: string
  observacao?: string
  /** Grau/geração, para desenhar a árvore. */
  nivel?: number
}

export interface Passo {
  titulo: string
  texto: string
  fundamento?: string
  /** Linha de cálculo, ex.: "1/4 × R$ 800.000,00 = R$ 200.000,00". */
  conta?: string
  destaque?: 'info' | 'alerta' | 'chave'
}

export interface Alerta {
  nivel: 'info' | 'atencao' | 'critico'
  titulo: string
  texto: string
  fundamento?: string
}

export type Classe =
  | 'descendentes'
  | 'ascendentes'
  | 'conjuge'
  | 'colaterais'
  | 'vacante'

export interface Resultado {
  classe: Classe
  classeLabel: string
  quotas: Quota[]
  meacao: { valorCentavos: bigint; nome: string; explicacao: string } | null
  massa: {
    bensComunsCentavos: bigint
    bensParticularesCentavos: bigint
    dividasCentavos: bigint
    /** (comuns/2 + particulares) − dívidas − funeral. */
    herancaLiquidaCentavos: bigint
    /** Sub-massa: metade do falecido nos bens comuns. */
    parcelaComumCentavos: bigint
    /** Sub-massa: bens particulares do falecido. */
    parcelaParticularCentavos: bigint
    legitimaCentavos: bigint
    disponivelCentavos: bigint
    temHerdeirosNecessarios: boolean
  }
  passos: Passo[]
  alertas: Alerta[]
  resumo: string
}
