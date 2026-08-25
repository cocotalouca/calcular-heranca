import type { Caso, Conjuge, Pessoa, Regime } from '@/engine/tipos'
import { OPCOES_PADRAO } from '@/engine/tipos'

let n = 0
const uid = (p = 'p') => `${p}${++n}`

export function novaPessoa(nome: string, filhoDoConjuge = true): Pessoa {
  return { id: uid(), nome, situacao: 'vivo', filhos: [], filhoDoConjuge }
}

export function casoVazio(): Caso {
  return {
    nomeFalecido: '',
    conjuge: {
      existe: false,
      nome: '',
      vinculo: 'casamento',
      regime: 'comunhao_parcial',
      situacao: 'vivo',
      sumula377: false,
      separadoDeFato: false,
    },
    descendentes: [],
    ascendentes: {
      pai: false,
      mae: false,
      avosPaternos: 0,
      avosMaternos: 0,
      bisavosPaternos: 0,
      bisavosMaternos: 0,
    },
    colaterais: { irmaos: [], tios: 0, primos: 0, tiosAvos: 0, sobrinhosNetos: 0 },
    patrimonio: {
      bensComuns: 0,
      bensParticulares: 0,
      dividas: 0,
      despesasFuneral: 0,
      doacoes: [],
      legados: [],
    },
    opcoes: { ...OPCOES_PADRAO },
  }
}

function comConjuge(regime: Regime, over: Partial<Conjuge> = {}): Conjuge {
  return {
    existe: true,
    nome: over.nome ?? 'Cônjuge',
    vinculo: 'casamento',
    regime,
    situacao: 'vivo',
    sumula377: regime === 'separacao_obrigatoria',
    separadoDeFato: false,
    ...over,
  }
}

export interface Cenario {
  id: string
  titulo: string
  gancho: string
  descricao: string
  etiqueta: string
  /** O que este cenário ensina — aparece como "por que este caso importa". */
  licao: string
  icone: string
  montar: () => Caso
}

/* ==================================================================== *
 * Cenários prontos — do mais corriqueiro ao mais capcioso
 * ==================================================================== */

export const CENARIOS: Cenario[] = [
  {
    id: 'classico',
    titulo: 'Casal com dois filhos',
    gancho: 'O caso mais comum do país',
    etiqueta: 'Comum',
    icone: '🏠',
    descricao:
      'Casados em comunhão parcial. Todo o patrimônio foi construído junto: um apartamento e as economias do casal. Dois filhos, ambos do casal.',
    licao:
      'Muita gente se assusta ao descobrir que o cônjuge não herda nada aqui. Ele não precisa: metade do patrimônio já era dele por meação. A outra metade vai inteira aos filhos.',
    montar: () => ({
      ...casoVazio(),
      nomeFalecido: 'João',
      conjuge: comConjuge('comunhao_parcial', { nome: 'Maria' }),
      descendentes: [novaPessoa('Pedro'), novaPessoa('Júlia')],
      patrimonio: {
        ...casoVazio().patrimonio,
        bensComuns: 800_000,
      },
    }),
  },
  {
    id: 'apartamento-herdado',
    titulo: 'O apartamento que veio de herança',
    gancho: 'A regra que quase ninguém acerta',
    etiqueta: 'Tese do STJ',
    icone: '🔑',
    descricao:
      'Comunhão parcial. O casal construiu R$ 600 mil juntos, mas o falecido também herdou dos pais um apartamento de R$ 300 mil — bem particular, que nunca se comunicou.',
    licao:
      'Basta um único bem particular para o cônjuge passar a concorrer com os filhos. E o STJ fixou que essa concorrência recai só sobre os bens particulares: sobre os bens comuns, os filhos herdam sozinhos.',
    montar: () => ({
      ...casoVazio(),
      nomeFalecido: 'Ricardo',
      conjuge: comConjuge('comunhao_parcial', { nome: 'Helena' }),
      descendentes: [novaPessoa('Lucas'), novaPessoa('Camila')],
      patrimonio: {
        ...casoVazio().patrimonio,
        bensComuns: 600_000,
        bensParticulares: 300_000,
      },
    }),
  },
  {
    id: 'familia-recomposta',
    titulo: 'Segunda união, filhos de dois lados',
    gancho: 'Filiação híbrida, terreno movediço',
    etiqueta: 'Controvertido',
    icone: '🧩',
    descricao:
      'Casamento em separação convencional. Três filhos: dois do primeiro casamento do falecido e um do casal atual.',
    licao:
      'Na separação convencional o cônjuge concorre sobre tudo. A pergunta difícil é a reserva de 1/4: ela exige ser ascendente de todos os descendentes. Com filiação híbrida, a doutrina se divide — e o resultado muda de verdade.',
    montar: () => ({
      ...casoVazio(),
      nomeFalecido: 'Alberto',
      conjuge: comConjuge('separacao_convencional', { nome: 'Beatriz' }),
      descendentes: [
        novaPessoa('Rafael', false),
        novaPessoa('Marina', false),
        novaPessoa('Théo', true),
      ],
      patrimonio: { ...casoVazio().patrimonio, bensParticulares: 1_200_000 },
    }),
  },
  {
    id: 'representacao',
    titulo: 'Os netos que ocupam o lugar do pai',
    gancho: 'Herança por estirpe',
    etiqueta: 'Representação',
    icone: '🌿',
    descricao:
      'Duas filhas, mas uma delas faleceu antes do pai, deixando três filhos. A outra filha está viva.',
    licao:
      'Os netos não dividem a herança em pé de igualdade com a tia: eles ocupam o lugar da mãe e repartem entre si a quota que seria dela. Metade para a tia, um sexto para cada neto.',
    montar: () => {
      const falecida: Pessoa = {
        id: uid(),
        nome: 'Clara',
        situacao: 'pre_morto',
        filhoDoConjuge: true,
        filhos: [novaPessoa('Nina'), novaPessoa('Otto'), novaPessoa('Iris')],
      }
      return {
        ...casoVazio(),
        nomeFalecido: 'Sebastião',
        descendentes: [novaPessoa('Regina'), falecida],
        patrimonio: { ...casoVazio().patrimonio, bensParticulares: 600_000 },
      }
    },
  },
  {
    id: 'sem-filhos-pais-vivos',
    titulo: 'Sem filhos, mas com pais vivos',
    gancho: 'O cônjuge divide com os sogros',
    etiqueta: 'Ascendentes',
    icone: '👵',
    descricao:
      'Casal sem filhos, casado em comunhão parcial. Os pais do falecido estão vivos.',
    licao:
      'Aqui o regime de bens não importa: o cônjuge concorre com os ascendentes em qualquer regime. Com pai e mãe vivos, cada um dos três fica com um terço da herança.',
    montar: () => ({
      ...casoVazio(),
      nomeFalecido: 'Daniel',
      conjuge: comConjuge('comunhao_parcial', { nome: 'Sofia' }),
      ascendentes: { ...casoVazio().ascendentes, pai: true, mae: true },
      patrimonio: { ...casoVazio().patrimonio, bensComuns: 900_000 },
    }),
  },
  {
    id: 'avos',
    titulo: 'Só os avós sobreviveram',
    gancho: 'Uma linha pode valer por duas pessoas',
    etiqueta: 'Linhas',
    icone: '🪞',
    descricao:
      'Solteiro, sem filhos. Os pais já morreram. Sobrevivem um avô paterno e os dois avós maternos.',
    licao:
      'A lei divide primeiro por linha e só depois por cabeça. O avô paterno, sozinho, leva metade da herança; os dois avós maternos repartem a outra metade — um quarto para cada.',
    montar: () => ({
      ...casoVazio(),
      nomeFalecido: 'Vitor',
      ascendentes: { ...casoVazio().ascendentes, avosPaternos: 1, avosMaternos: 2 },
      patrimonio: { ...casoVazio().patrimonio, bensParticulares: 400_000 },
    }),
  },
  {
    id: 'irmaos',
    titulo: 'Irmãos de pai e irmãos de sangue inteiro',
    gancho: 'O unilateral herda metade',
    etiqueta: 'Colaterais',
    icone: '⚖️',
    descricao:
      'Solteiro, sem filhos e sem ascendentes. Deixa dois irmãos bilaterais e um irmão só por parte de pai.',
    licao:
      'O Código manda que cada irmão unilateral receba metade do que recebe cada bilateral. Dois quintos, dois quintos e um quinto — e não um terço para cada.',
    montar: () => ({
      ...casoVazio(),
      nomeFalecido: 'Henrique',
      colaterais: {
        ...casoVazio().colaterais,
        irmaos: [
          { id: uid('i'), nome: 'Paulo', situacao: 'vivo', filhos: [], vinculo: 'bilateral' },
          { id: uid('i'), nome: 'Renata', situacao: 'vivo', filhos: [], vinculo: 'bilateral' },
          { id: uid('i'), nome: 'Tiago', situacao: 'vivo', filhos: [], vinculo: 'unilateral' },
        ],
      },
      patrimonio: { ...casoVazio().patrimonio, bensParticulares: 500_000 },
    }),
  },
  {
    id: 'uniao-estavel',
    titulo: 'União estável de vinte anos',
    gancho: 'Depois do STF, igual ao casamento',
    etiqueta: 'STF Tema 809',
    icone: '💍',
    descricao:
      'Vinte anos de convivência sem contrato escrito, patrimônio construído a dois, uma filha do casal e um imóvel que ele já tinha antes.',
    licao:
      'O art. 1.790, que rebaixava o companheiro, foi declarado inconstitucional. Aplica-se o mesmo art. 1.829 do casamento — e, sem contrato, presume-se a comunhão parcial.',
    montar: () => ({
      ...casoVazio(),
      nomeFalecido: 'Marcos',
      conjuge: comConjuge('comunhao_parcial', { nome: 'Lívia', vinculo: 'uniao_estavel' }),
      descendentes: [novaPessoa('Alice')],
      patrimonio: {
        ...casoVazio().patrimonio,
        bensComuns: 700_000,
        bensParticulares: 250_000,
      },
    }),
  },
  {
    id: 'setenta',
    titulo: 'Casamento após os 70 anos',
    gancho: 'Separação obrigatória e a Súmula 377',
    etiqueta: 'Súmula 377',
    icone: '🕰️',
    descricao:
      'Casou-se aos 74 anos, o que impõe o regime da separação obrigatória. Dois filhos do primeiro casamento. Durante a união o casal adquiriu um imóvel.',
    licao:
      'Na separação obrigatória o cônjuge não concorre com os descendentes. Mas a Súmula 377 do STF comunica os aquestos: ele fica com a meação do que foi comprado durante a união, e nada da herança.',
    montar: () => ({
      ...casoVazio(),
      nomeFalecido: 'Arnaldo',
      conjuge: comConjuge('separacao_obrigatoria', { nome: 'Dulce', sumula377: true }),
      descendentes: [novaPessoa('Fábio', false), novaPessoa('Sílvia', false)],
      patrimonio: {
        ...casoVazio().patrimonio,
        bensComuns: 400_000,
        bensParticulares: 900_000,
      },
    }),
  },
  {
    id: 'testamento',
    titulo: 'Testamento até o limite',
    gancho: 'Metade é intocável',
    etiqueta: 'Testamento',
    icone: '📜',
    descricao:
      'Viúvo com dois filhos, deixa em testamento 50% do patrimônio a uma instituição de caridade.',
    licao:
      'Com herdeiros necessários, o testamento alcança no máximo metade. Se dispuser de mais, a deixa é reduzida até caber no disponível — a legítima não se negocia.',
    montar: () => ({
      ...casoVazio(),
      nomeFalecido: 'Otávio',
      descendentes: [novaPessoa('Bruno'), novaPessoa('Elisa')],
      patrimonio: {
        ...casoVazio().patrimonio,
        bensParticulares: 1_000_000,
        legados: [
          {
            id: uid('l'),
            beneficiario: 'Instituto Semear',
            modo: 'percentual_heranca',
            quantia: 50,
          },
        ],
      },
    }),
  },
  {
    id: 'colacao',
    titulo: 'O filho que ganhou o apartamento em vida',
    gancho: 'Adiantamento de legítima',
    etiqueta: 'Colação',
    icone: '🎁',
    descricao:
      'Três filhos. Anos atrás, o pai doou um apartamento de R$ 300 mil ao filho mais velho, sem dispensa de colação. Restam R$ 600 mil.',
    licao:
      'A doação de pai para filho é adiantamento da legítima. O valor volta ao monte só para o cálculo, a partilha se refaz sobre o total e o donatário recebe descontado o que já levou.',
    montar: () => {
      const primo = novaPessoa('Gustavo')
      return {
        ...casoVazio(),
        nomeFalecido: 'Nelson',
        descendentes: [primo, novaPessoa('Letícia'), novaPessoa('Marcos')],
        patrimonio: {
          ...casoVazio().patrimonio,
          bensParticulares: 600_000,
          doacoes: [
            {
              id: uid('d'),
              donatarioId: primo.id,
              nomeDonatario: primo.nome,
              valor: 300_000,
              dispensada: false,
            },
          ],
        },
      }
    },
  },
  {
    id: 'renuncia-total',
    titulo: 'Quando todos os filhos renunciam',
    gancho: 'Netos por cabeça, não por estirpe',
    etiqueta: 'Art. 1.811',
    icone: '🚪',
    descricao:
      'Dois filhos renunciam à herança para deixá-la aos netos. Um deles tem dois filhos; o outro, apenas um.',
    licao:
      'Ninguém sucede representando renunciante. Como todos renunciaram, os netos vêm por direito próprio e dividem por cabeça: um terço para cada um dos três — e não metade para o ramo menor.',
    montar: () => ({
      ...casoVazio(),
      nomeFalecido: 'Aurélio',
      descendentes: [
        {
          id: uid(),
          nome: 'Cecília',
          situacao: 'renunciante',
          filhoDoConjuge: true,
          filhos: [novaPessoa('Léo'), novaPessoa('Mia')],
        },
        {
          id: uid(),
          nome: 'Fernando',
          situacao: 'renunciante',
          filhoDoConjuge: true,
          filhos: [novaPessoa('Tom')],
        },
      ],
      patrimonio: { ...casoVazio().patrimonio, bensParticulares: 900_000 },
    }),
  },
  {
    id: 'sobrinhos',
    titulo: 'Só restaram os sobrinhos',
    gancho: 'Aqui a partilha vira por cabeça',
    etiqueta: 'Art. 1.843',
    icone: '🫂',
    descricao:
      'Nenhum irmão sobreviveu. De um irmão restaram dois filhos; de outro, apenas um.',
    licao:
      'Se ao menos um irmão estivesse vivo, os sobrinhos herdariam por estirpe. Como nenhum sobreviveu, eles herdam por cabeça: um terço para cada, e não metade por ramo.',
    montar: () => ({
      ...casoVazio(),
      nomeFalecido: 'Ivo',
      colaterais: {
        ...casoVazio().colaterais,
        irmaos: [
          {
            id: uid('i'),
            nome: 'Rui',
            situacao: 'pre_morto',
            vinculo: 'bilateral',
            filhos: [novaPessoa('Ana'), novaPessoa('Bento')],
          },
          {
            id: uid('i'),
            nome: 'Zilda',
            situacao: 'pre_morto',
            vinculo: 'bilateral',
            filhos: [novaPessoa('Caio')],
          },
        ],
      },
      patrimonio: { ...casoVazio().patrimonio, bensParticulares: 300_000 },
    }),
  },
  {
    id: 'universal',
    titulo: 'Casados em comunhão universal',
    gancho: 'Meação de tudo, herança de nada',
    etiqueta: 'Comunhão universal',
    icone: '🔗',
    descricao:
      'Casamento antigo em comunhão universal, três filhos do casal, patrimônio todo comum.',
    licao:
      'Como o cônjuge já é meeiro de todo o acervo, a lei o exclui da concorrência. Ele fica com metade por meação e os filhos dividem a outra metade.',
    montar: () => ({
      ...casoVazio(),
      nomeFalecido: 'Geraldo',
      conjuge: comConjuge('comunhao_universal', { nome: 'Neusa' }),
      descendentes: [novaPessoa('Ivan'), novaPessoa('Paula'), novaPessoa('Rosa')],
      patrimonio: { ...casoVazio().patrimonio, bensComuns: 1_500_000 },
    }),
  },
  {
    id: 'quatro-filhos',
    titulo: 'Quatro filhos e a reserva de um quarto',
    gancho: 'O piso que protege o cônjuge',
    etiqueta: 'Art. 1.832',
    icone: '🛡️',
    descricao:
      'Separação convencional, quatro filhos, todos do casal. Divididos por cabeça, cada um ficaria com um quinto.',
    licao:
      'Um quinto seria menos do que um quarto. Como o cônjuge é ascendente de todos os filhos com quem concorre, a lei lhe garante o piso de 1/4 — e os filhos repartem os 3/4 restantes.',
    montar: () => ({
      ...casoVazio(),
      nomeFalecido: 'Estêvão',
      conjuge: comConjuge('separacao_convencional', { nome: 'Antônia' }),
      descendentes: [
        novaPessoa('Ana'),
        novaPessoa('Bento'),
        novaPessoa('Cauê'),
        novaPessoa('Dora'),
      ],
      patrimonio: { ...casoVazio().patrimonio, bensParticulares: 1_600_000 },
    }),
  },
  {
    id: 'vacante',
    titulo: 'Ninguém para herdar',
    gancho: 'A herança vai para o Município',
    etiqueta: 'Vacância',
    icone: '🏛️',
    descricao:
      'Sem cônjuge, sem descendentes, sem ascendentes e sem qualquer colateral até o quarto grau.',
    licao:
      'A herança é declarada jacente, arrecadada e, um ano depois do edital sem habilitação, declarada vacante — passando ao Município onde estavam os bens.',
    montar: () => ({
      ...casoVazio(),
      nomeFalecido: 'Anônimo',
      patrimonio: { ...casoVazio().patrimonio, bensParticulares: 350_000 },
    }),
  },
]

export function cenarioPorId(id: string): Cenario | undefined {
  return CENARIOS.find((c) => c.id === id)
}
