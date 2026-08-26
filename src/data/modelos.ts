import type {
  Ascendentes,
  Caso,
  Colaterais,
  Conjuge,
  Inventario,
  Patrimonio,
  Pessoa,
  Regime,
} from '@/engine/tipos'
import { OPCOES_PADRAO } from '@/engine/tipos'
import { clonarPreservandoIds, novoId } from '@/lib/arvore'

/* ==================================================================== *
 * Peças em branco
 * ==================================================================== */

export function conjugeVazio(): Conjuge {
  return {
    id: novoId('c'),
    existe: false,
    nome: '',
    vinculo: 'casamento',
    regime: 'comunhao_parcial',
    situacao: 'vivo',
    sumula377: false,
    separadoDeFato: false,
  }
}

export function ascendentesVazios(): Ascendentes {
  return {
    pai: false,
    mae: false,
    avosPaternos: 0,
    avosMaternos: 0,
    bisavosPaternos: 0,
    bisavosMaternos: 0,
  }
}

export function colateraisVazios(): Colaterais {
  return { irmaos: [], tios: 0, primos: 0, tiosAvos: 0, sobrinhosNetos: 0 }
}

export function patrimonioVazio(): Patrimonio {
  return {
    bensComuns: 0,
    bensParticulares: 0,
    dividas: 0,
    despesasFuneral: 0,
    doacoes: [],
    legados: [],
  }
}

export function casoVazio(nomeFalecido = ''): Caso {
  return {
    id: novoId('o'),
    nomeFalecido,
    dataObito: '',
    conjuge: conjugeVazio(),
    descendentes: [],
    ascendentes: ascendentesVazios(),
    colaterais: colateraisVazios(),
    patrimonio: patrimonioVazio(),
    opcoes: { ...OPCOES_PADRAO },
  }
}

/** Processo em branco: um único óbito, sem nada preenchido. */
export function inventarioVazio(): Inventario {
  return { titulo: '', obitos: [casoVazio()] }
}

/* ==================================================================== *
 * Auxiliares dos modelos
 * ==================================================================== */

/**
 * Cria uma pessoa com id fixo.
 *
 * Nos modelos cumulativos o id é escolhido a dedo: a mesma pessoa precisa
 * carregar o MESMO id nos dois inventários, senão a consolidação final a
 * trataria como duas pessoas diferentes e o total de cada herdeiro sairia
 * partido ao meio.
 */
function p(
  id: string,
  nome: string,
  extra: Partial<Pessoa> = {},
): Pessoa {
  return { id, nome, situacao: 'vivo', filhos: [], filhoDoConjuge: true, ...extra }
}

function conjuge(
  id: string,
  nome: string,
  regime: Regime,
  extra: Partial<Conjuge> = {},
): Conjuge {
  return {
    id,
    existe: true,
    nome,
    vinculo: 'casamento',
    regime,
    situacao: 'vivo',
    sumula377: regime === 'separacao_obrigatoria',
    separadoDeFato: false,
    ...extra,
  }
}

function obito(id: string, nomeFalecido: string, over: Partial<Caso> = {}): Caso {
  return { ...casoVazio(nomeFalecido), id, ...over }
}

function bens(over: Partial<Patrimonio>): Patrimonio {
  return { ...patrimonioVazio(), ...over }
}

/* ==================================================================== *
 * Catálogo
 * ==================================================================== */

export type FamiliaModelo = 'simples' | 'cumulativo'

export interface Modelo {
  id: string
  titulo: string
  gancho: string
  descricao: string
  etiqueta: string
  familia: FamiliaModelo
  /** O que este caso ensina — aparece como "por que este caso importa". */
  licao: string
  icone: string
  montar: () => Inventario
}

/* -------------------------------------------------------------------- *
 * Um único óbito
 * -------------------------------------------------------------------- */

const SIMPLES: Modelo[] = [
  {
    id: 'classico',
    titulo: 'Casal com dois filhos',
    gancho: 'O caso mais comum do país',
    etiqueta: 'Comum',
    familia: 'simples',
    icone: '🏠',
    descricao:
      'Casados em comunhão parcial. Todo o patrimônio foi construído junto: um apartamento e as economias do casal. Dois filhos, ambos do casal.',
    licao:
      'Muita gente se assusta ao descobrir que o cônjuge não herda nada aqui. Ele não precisa: metade do patrimônio já era dele por meação. A outra metade vai inteira aos filhos.',
    montar: () => ({
      titulo: 'Sucessão de A. (comunhão parcial)',
      obitos: [
        obito('m-classico', 'A.', {
          conjuge: conjuge('m-classico-c', 'B.', 'comunhao_parcial'),
          descendentes: [p('m-classico-1', 'C.'), p('m-classico-2', 'D.')],
          patrimonio: bens({ bensComuns: 800_000 }),
        }),
      ],
    }),
  },
  {
    id: 'apartamento-herdado',
    titulo: 'O apartamento que veio de herança',
    gancho: 'A regra que quase ninguém acerta',
    etiqueta: 'Tese do STJ',
    familia: 'simples',
    icone: '🔑',
    descricao:
      'Comunhão parcial. O casal construiu R$ 600 mil juntos, mas o falecido também herdou dos pais um apartamento de R$ 300 mil — bem particular, que nunca se comunicou.',
    licao:
      'Basta um único bem particular para o cônjuge passar a concorrer com os filhos. E o STJ fixou que essa concorrência recai só sobre os bens particulares: sobre os bens comuns, os filhos herdam sozinhos.',
    montar: () => ({
      titulo: 'Sucessão com bens particulares',
      obitos: [
        obito('m-part', 'A.', {
          conjuge: conjuge('m-part-c', 'B.', 'comunhao_parcial'),
          descendentes: [p('m-part-1', 'C.'), p('m-part-2', 'D.')],
          patrimonio: bens({ bensComuns: 600_000, bensParticulares: 300_000 }),
        }),
      ],
    }),
  },
  {
    id: 'familia-recomposta',
    titulo: 'Segunda união, filhos de dois lados',
    gancho: 'Filiação híbrida, terreno movediço',
    etiqueta: 'Controvertido',
    familia: 'simples',
    icone: '🧩',
    descricao:
      'Casamento em separação convencional. Três filhos: dois do primeiro casamento do falecido e um do casal atual.',
    licao:
      'Na separação convencional o cônjuge concorre sobre tudo. A pergunta difícil é a reserva de 1/4: ela exige ser ascendente de todos os descendentes. Com filiação híbrida, a doutrina se divide — e o resultado muda de verdade.',
    montar: () => ({
      titulo: 'Filiação híbrida',
      obitos: [
        obito('m-hib', 'A.', {
          conjuge: conjuge('m-hib-c', 'B.', 'separacao_convencional'),
          descendentes: [
            p('m-hib-1', 'C.', { filhoDoConjuge: false }),
            p('m-hib-2', 'D.', { filhoDoConjuge: false }),
            p('m-hib-3', 'E.', { filhoDoConjuge: true }),
          ],
          patrimonio: bens({ bensParticulares: 1_200_000 }),
        }),
      ],
    }),
  },
  {
    id: 'representacao',
    titulo: 'Os netos que ocupam o lugar do pai',
    gancho: 'Herança por estirpe',
    etiqueta: 'Representação',
    familia: 'simples',
    icone: '🌿',
    descricao:
      'Duas filhas, mas uma delas faleceu ANTES do pai, deixando três filhos. A outra filha está viva.',
    licao:
      'Os netos não dividem a herança em pé de igualdade com a tia: eles ocupam o lugar da mãe e repartem entre si a quota que seria dela. Metade para a tia, um sexto para cada neto. Compare com o caso do herdeiro que morre DEPOIS — o resultado é outro.',
    montar: () => ({
      titulo: 'Sucessão com representação',
      obitos: [
        obito('m-rep', 'A.', {
          descendentes: [
            p('m-rep-1', 'B.'),
            p('m-rep-2', 'C.', {
              situacao: 'pre_morto',
              filhos: [p('m-rep-2a', 'D.'), p('m-rep-2b', 'E.'), p('m-rep-2c', 'F.')],
            }),
          ],
          patrimonio: bens({ bensParticulares: 600_000 }),
        }),
      ],
    }),
  },
  {
    id: 'sem-filhos-pais-vivos',
    titulo: 'Sem filhos, mas com pais vivos',
    gancho: 'O cônjuge divide com os sogros',
    etiqueta: 'Ascendentes',
    familia: 'simples',
    icone: '👵',
    descricao: 'Casal sem filhos, casado em comunhão parcial. Os pais do falecido estão vivos.',
    licao:
      'Aqui o regime de bens não importa: o cônjuge concorre com os ascendentes em qualquer regime. Com pai e mãe vivos, cada um dos três fica com um terço da herança.',
    montar: () => ({
      titulo: 'Concorrência com ascendentes',
      obitos: [
        obito('m-asc', 'A.', {
          conjuge: conjuge('m-asc-c', 'B.', 'comunhao_parcial'),
          ascendentes: { ...ascendentesVazios(), pai: true, mae: true },
          patrimonio: bens({ bensComuns: 900_000 }),
        }),
      ],
    }),
  },
  {
    id: 'avos',
    titulo: 'Só os avós sobreviveram',
    gancho: 'Uma linha pode valer por duas pessoas',
    etiqueta: 'Linhas',
    familia: 'simples',
    icone: '🪞',
    descricao:
      'Solteiro, sem filhos. Os pais já morreram. Sobrevivem um avô paterno e os dois avós maternos.',
    licao:
      'A lei divide primeiro por linha e só depois por cabeça. O avô paterno, sozinho, leva metade da herança; os dois avós maternos repartem a outra metade — um quarto para cada.',
    montar: () => ({
      titulo: 'Ascendentes de 2º grau',
      obitos: [
        obito('m-avos', 'A.', {
          ascendentes: { ...ascendentesVazios(), avosPaternos: 1, avosMaternos: 2 },
          patrimonio: bens({ bensParticulares: 400_000 }),
        }),
      ],
    }),
  },
  {
    id: 'irmaos',
    titulo: 'Irmãos de pai e irmãos de sangue inteiro',
    gancho: 'O unilateral herda metade',
    etiqueta: 'Colaterais',
    familia: 'simples',
    icone: '⚖️',
    descricao:
      'Solteiro, sem filhos e sem ascendentes. Deixa dois irmãos bilaterais e um irmão só por parte de pai.',
    licao:
      'O Código manda que cada irmão unilateral receba metade do que recebe cada bilateral. Dois quintos, dois quintos e um quinto — e não um terço para cada.',
    montar: () => ({
      titulo: 'Colaterais de 2º grau',
      obitos: [
        obito('m-irm', 'A.', {
          colaterais: {
            ...colateraisVazios(),
            irmaos: [
              { ...p('m-irm-1', 'B.'), vinculo: 'bilateral' },
              { ...p('m-irm-2', 'C.'), vinculo: 'bilateral' },
              { ...p('m-irm-3', 'D.'), vinculo: 'unilateral' },
            ],
          },
          patrimonio: bens({ bensParticulares: 500_000 }),
        }),
      ],
    }),
  },
  {
    id: 'uniao-estavel',
    titulo: 'União estável de vinte anos',
    gancho: 'Depois do STF, igual ao casamento',
    etiqueta: 'STF Tema 809',
    familia: 'simples',
    icone: '💍',
    descricao:
      'Vinte anos de convivência sem contrato escrito, patrimônio construído a dois, uma filha do casal e um imóvel que ele já tinha antes.',
    licao:
      'O art. 1.790, que rebaixava o companheiro, foi declarado inconstitucional. Aplica-se o mesmo art. 1.829 do casamento — e, sem contrato, presume-se a comunhão parcial.',
    montar: () => ({
      titulo: 'União estável',
      obitos: [
        obito('m-ue', 'A.', {
          conjuge: conjuge('m-ue-c', 'B.', 'comunhao_parcial', { vinculo: 'uniao_estavel' }),
          descendentes: [p('m-ue-1', 'C.')],
          patrimonio: bens({ bensComuns: 700_000, bensParticulares: 250_000 }),
        }),
      ],
    }),
  },
  {
    id: 'setenta',
    titulo: 'Casamento após os 70 anos',
    gancho: 'Separação obrigatória e a Súmula 377',
    etiqueta: 'Súmula 377',
    familia: 'simples',
    icone: '🕰️',
    descricao:
      'Casou-se aos 74 anos, o que impõe o regime da separação obrigatória. Dois filhos do primeiro casamento. Durante a união o casal adquiriu um imóvel.',
    licao:
      'Na separação obrigatória o cônjuge não concorre com os descendentes. Mas a Súmula 377 do STF comunica os aquestos: ele fica com a meação do que foi comprado durante a união, e nada da herança.',
    montar: () => ({
      titulo: 'Separação obrigatória',
      obitos: [
        obito('m-70', 'A.', {
          conjuge: conjuge('m-70-c', 'B.', 'separacao_obrigatoria', { sumula377: true }),
          descendentes: [
            p('m-70-1', 'C.', { filhoDoConjuge: false }),
            p('m-70-2', 'D.', { filhoDoConjuge: false }),
          ],
          patrimonio: bens({ bensComuns: 400_000, bensParticulares: 900_000 }),
        }),
      ],
    }),
  },
  {
    id: 'testamento',
    titulo: 'Testamento até o limite',
    gancho: 'Metade é intocável',
    etiqueta: 'Testamento',
    familia: 'simples',
    icone: '📜',
    descricao: 'Viúvo com dois filhos, deixa em testamento 50% do patrimônio a uma instituição.',
    licao:
      'Com herdeiros necessários, o testamento alcança no máximo metade. Se dispuser de mais, a deixa é reduzida até caber no disponível — a legítima não se negocia.',
    montar: () => ({
      titulo: 'Sucessão testamentária',
      obitos: [
        obito('m-test', 'A.', {
          descendentes: [p('m-test-1', 'B.'), p('m-test-2', 'C.')],
          patrimonio: bens({
            bensParticulares: 1_000_000,
            legados: [
              {
                id: 'm-test-l1',
                beneficiario: 'Instituição beneficente',
                modo: 'percentual_heranca',
                quantia: 50,
              },
            ],
          }),
        }),
      ],
    }),
  },
  {
    id: 'colacao',
    titulo: 'O filho que ganhou o apartamento em vida',
    gancho: 'Adiantamento de legítima',
    etiqueta: 'Colação',
    familia: 'simples',
    icone: '🎁',
    descricao:
      'Três filhos. Anos atrás, o pai doou um apartamento de R$ 300 mil ao filho mais velho, sem dispensa de colação. Restam R$ 600 mil.',
    licao:
      'A doação de pai para filho é adiantamento da legítima. O valor volta ao monte só para o cálculo, a partilha se refaz sobre o total e o donatário recebe descontado o que já levou.',
    montar: () => ({
      titulo: 'Colação de doação em vida',
      obitos: [
        obito('m-col', 'A.', {
          descendentes: [p('m-col-1', 'B.'), p('m-col-2', 'C.'), p('m-col-3', 'D.')],
          patrimonio: bens({
            bensParticulares: 600_000,
            doacoes: [
              {
                id: 'm-col-d1',
                donatarioId: 'm-col-1',
                nomeDonatario: 'B.',
                valor: 300_000,
                dispensada: false,
              },
            ],
          }),
        }),
      ],
    }),
  },
  {
    id: 'renuncia-total',
    titulo: 'Quando todos os filhos renunciam',
    gancho: 'Netos por cabeça, não por estirpe',
    etiqueta: 'Art. 1.811',
    familia: 'simples',
    icone: '🚪',
    descricao:
      'Dois filhos renunciam à herança para deixá-la aos netos. Um deles tem dois filhos; o outro, apenas um.',
    licao:
      'Ninguém sucede representando renunciante. Como todos renunciaram, os netos vêm por direito próprio e dividem por cabeça: um terço para cada um dos três — e não metade para o ramo menor.',
    montar: () => ({
      titulo: 'Renúncia de toda a classe',
      obitos: [
        obito('m-ren', 'A.', {
          descendentes: [
            p('m-ren-1', 'B.', {
              situacao: 'renunciante',
              filhos: [p('m-ren-1a', 'D.'), p('m-ren-1b', 'E.')],
            }),
            p('m-ren-2', 'C.', { situacao: 'renunciante', filhos: [p('m-ren-2a', 'F.')] }),
          ],
          patrimonio: bens({ bensParticulares: 900_000 }),
        }),
      ],
    }),
  },
  {
    id: 'sobrinhos',
    titulo: 'Só restaram os sobrinhos',
    gancho: 'Aqui a partilha vira por cabeça',
    etiqueta: 'Art. 1.843',
    familia: 'simples',
    icone: '🫂',
    descricao: 'Nenhum irmão sobreviveu. De um irmão restaram dois filhos; de outro, apenas um.',
    licao:
      'Se ao menos um irmão estivesse vivo, os sobrinhos herdariam por estirpe. Como nenhum sobreviveu, eles herdam por cabeça: um terço para cada, e não metade por ramo.',
    montar: () => ({
      titulo: 'Colaterais de 3º grau',
      obitos: [
        obito('m-sob', 'A.', {
          colaterais: {
            ...colateraisVazios(),
            irmaos: [
              {
                ...p('m-sob-1', 'B.', {
                  situacao: 'pre_morto',
                  filhos: [p('m-sob-1a', 'D.'), p('m-sob-1b', 'E.')],
                }),
                vinculo: 'bilateral',
              },
              {
                ...p('m-sob-2', 'C.', { situacao: 'pre_morto', filhos: [p('m-sob-2a', 'F.')] }),
                vinculo: 'bilateral',
              },
            ],
          },
          patrimonio: bens({ bensParticulares: 300_000 }),
        }),
      ],
    }),
  },
  {
    id: 'universal',
    titulo: 'Casados em comunhão universal',
    gancho: 'Meação de tudo, herança de nada',
    etiqueta: 'Comunhão universal',
    familia: 'simples',
    icone: '🔗',
    descricao: 'Casamento antigo em comunhão universal, três filhos do casal, patrimônio todo comum.',
    licao:
      'Como o cônjuge já é meeiro de todo o acervo, a lei o exclui da concorrência. Ele fica com metade por meação e os filhos dividem a outra metade.',
    montar: () => ({
      titulo: 'Comunhão universal',
      obitos: [
        obito('m-uni', 'A.', {
          conjuge: conjuge('m-uni-c', 'B.', 'comunhao_universal'),
          descendentes: [p('m-uni-1', 'C.'), p('m-uni-2', 'D.'), p('m-uni-3', 'E.')],
          patrimonio: bens({ bensComuns: 1_500_000 }),
        }),
      ],
    }),
  },
  {
    id: 'quatro-filhos',
    titulo: 'Quatro filhos e a reserva de um quarto',
    gancho: 'O piso que protege o cônjuge',
    etiqueta: 'Art. 1.832',
    familia: 'simples',
    icone: '🛡️',
    descricao:
      'Separação convencional, quatro filhos, todos do casal. Divididos por cabeça, cada um ficaria com um quinto.',
    licao:
      'Um quinto seria menos do que um quarto. Como o cônjuge é ascendente de todos os filhos com quem concorre, a lei lhe garante o piso de 1/4 — e os filhos repartem os 3/4 restantes.',
    montar: () => ({
      titulo: 'Reserva da quarta parte',
      obitos: [
        obito('m-4f', 'A.', {
          conjuge: conjuge('m-4f-c', 'B.', 'separacao_convencional'),
          descendentes: [
            p('m-4f-1', 'C.'),
            p('m-4f-2', 'D.'),
            p('m-4f-3', 'E.'),
            p('m-4f-4', 'F.'),
          ],
          patrimonio: bens({ bensParticulares: 1_600_000 }),
        }),
      ],
    }),
  },
  {
    id: 'vacante',
    titulo: 'Ninguém para herdar',
    gancho: 'A herança vai para o Município',
    etiqueta: 'Vacância',
    familia: 'simples',
    icone: '🏛️',
    descricao: 'Sem cônjuge, sem descendentes, sem ascendentes e sem qualquer colateral até o 4º grau.',
    licao:
      'A herança é declarada jacente, arrecadada e, um ano depois do edital sem habilitação, declarada vacante — passando ao Município onde estavam os bens.',
    montar: () => ({
      titulo: 'Herança vacante',
      obitos: [obito('m-vac', 'A.', { patrimonio: bens({ bensParticulares: 350_000 }) })],
    }),
  },
]

/* -------------------------------------------------------------------- *
 * Inventários cumulativos — dois ou mais óbitos
 * -------------------------------------------------------------------- */

const CUMULATIVOS: Modelo[] = [
  {
    id: 'casal-sequencia',
    titulo: 'O casal que faleceu em sequência',
    gancho: 'A cumulação clássica',
    etiqueta: 'CPC 672, II',
    familia: 'cumulativo',
    icone: '👤👤',
    descricao:
      'O marido faleceu primeiro; a esposa, dois anos depois, sem ter feito o inventário. Dois filhos, ambos do casal, patrimônio todo construído a dois.',
    licao:
      'A viúva recebeu meação no primeiro óbito e nada de herança — comunhão parcial sem bens particulares. Mas essa meação é o acervo do segundo inventário. Um só processo resolve as duas sucessões, e ainda assim há dois ITCMD a pagar.',
    montar: () => {
      const filhos = [p('cs-f1', 'C.'), p('cs-f2', 'D.')]
      return {
        titulo: 'Inventário cumulativo do casal',
        obitos: [
          obito('cs-1', 'A.', {
            dataObito: '2021-03-10',
            parentesco: 'Marido de B.',
            conjuge: conjuge('cs-c', 'B.', 'comunhao_parcial', {
              situacao: 'pos_morto',
              obitoId: 'cs-2',
            }),
            descendentes: clonarPreservandoIds(filhos),
            patrimonio: bens({ bensComuns: 800_000 }),
          }),
          obito('cs-2', 'B.', {
            dataObito: '2023-07-22',
            parentesco: 'Esposa de A., falecida depois',
            conjuge: conjuge('cs-c2', 'A.', 'comunhao_parcial', {
              situacao: 'pre_morto',
              obitoId: 'cs-1',
            }),
            descendentes: clonarPreservandoIds(filhos),
            patrimonio: bens({ bensParticulares: 60_000 }),
          }),
        ],
      }
    },
  },
  {
    id: 'herdeiro-pos-morto',
    titulo: 'O filho que morreu durante o inventário',
    gancho: 'Pré-morte e pós-morte não são a mesma coisa',
    etiqueta: 'CPC 672, III',
    familia: 'cumulativo',
    icone: '⏳',
    descricao:
      'O pai faleceu deixando dois filhos e R$ 900 mil. Antes de concluída a partilha, um dos filhos faleceu, deixando esposa e um filho.',
    licao:
      'Este é o erro que mais aparece na prática. Como o filho sobreviveu ao pai, ele HERDOU — e o quinhão passa ao espólio dele, onde a viúva concorre com o neto. Se tivesse morrido antes, o neto o representaria e levaria os R$ 450 mil sozinho, sem nada para a viúva. Um dia de diferença nas certidões muda R$ 225 mil de lugar.',
    montar: () => ({
      titulo: 'Cumulação por dependência',
      obitos: [
        obito('hp-1', 'A.', {
          dataObito: '2022-05-04',
          parentesco: 'Pai de B. e C.',
          descendentes: [
            p('hp-f1', 'B.', { situacao: 'pos_morto', obitoId: 'hp-2', filhoDoConjuge: false }),
            p('hp-f2', 'C.', { filhoDoConjuge: false }),
          ],
          patrimonio: bens({ bensParticulares: 900_000 }),
        }),
        obito('hp-2', 'B.', {
          dataObito: '2023-01-18',
          parentesco: 'Filho de A., falecido no curso do inventário',
          conjuge: conjuge('hp-c', 'D.', 'comunhao_parcial'),
          descendentes: [p('hp-n1', 'E.')],
          patrimonio: patrimonioVazio(),
        }),
      ],
    }),
  },
  {
    id: 'mae-e-filha',
    titulo: 'A filha morreu primeiro; a mãe, depois',
    gancho: 'A herança sobe e volta a descer',
    etiqueta: 'Ordem inversa',
    familia: 'cumulativo',
    icone: '🔃',
    descricao:
      'A filha, solteira e sem descendentes, faleceu deixando R$ 500 mil. Herdou a mãe, única ascendente viva. Meses depois a mãe também faleceu, deixando outro filho.',
    licao:
      'Sem descendentes nem cônjuge, a segunda classe é chamada: a mãe herda tudo. Quando ela morre, aquele acervo desce novamente, agora para o irmão sobrevivente. Os bens percorrem duas transmissões — e dois ITCMD — para chegar onde a intuição diria que já estavam.',
    montar: () => ({
      titulo: 'Cumulação em ordem inversa',
      obitos: [
        obito('mf-1', 'A.', {
          dataObito: '2023-02-11',
          parentesco: 'Filha de B.',
          ascendentes: {
            ...ascendentesVazios(),
            mae: true,
            nomeMae: 'B.',
            obitoMaeId: 'mf-2',
          },
          patrimonio: bens({ bensParticulares: 500_000 }),
        }),
        obito('mf-2', 'B.', {
          dataObito: '2023-11-30',
          parentesco: 'Mãe de A., falecida depois',
          descendentes: [p('mf-f2', 'C.')],
          patrimonio: bens({ bensParticulares: 200_000 }),
        }),
      ],
    }),
  },
  {
    id: 'comoriencia-casal',
    titulo: 'Acidente: o casal morreu junto',
    gancho: 'Duas sucessões que não se tocam',
    etiqueta: 'Comoriência',
    familia: 'cumulativo',
    icone: '⚡',
    descricao:
      'Marido e mulher faleceram no mesmo acidente, sem que se possa apurar quem morreu primeiro. Dois filhos do casal. Cada um tinha também bens particulares.',
    licao:
      'Presumindo-se a morte simultânea, um não herda do outro: são duas heranças independentes, cada uma inteirinha para os filhos. A cumulação aqui não vem da dependência, mas da identidade de herdeiros — inciso I do art. 672. Note que a meação desaparece: sem sobrevivente, não há a quem destacá-la.',
    montar: () => {
      const filhos = [p('cm-f1', 'C.'), p('cm-f2', 'D.')]
      return {
        titulo: 'Comoriência do casal',
        obitos: [
          obito('cm-1', 'A.', {
            dataObito: '2024-01-15',
            parentesco: 'Marido de B.',
            conjuge: conjuge('cm-c1', 'B.', 'comunhao_parcial', {
              situacao: 'comoriente',
              obitoId: 'cm-2',
            }),
            descendentes: clonarPreservandoIds(filhos),
            patrimonio: bens({ bensComuns: 600_000, bensParticulares: 300_000 }),
          }),
          obito('cm-2', 'B.', {
            dataObito: '2024-01-15',
            parentesco: 'Esposa de A., comoriente',
            conjuge: conjuge('cm-c2', 'A.', 'comunhao_parcial', {
              situacao: 'comoriente',
              obitoId: 'cm-1',
            }),
            descendentes: clonarPreservandoIds(filhos),
            patrimonio: bens({ bensParticulares: 200_000 }),
          }),
        ],
      }
    },
  },
  {
    id: 'tres-obitos',
    titulo: 'Três gerações em cascata',
    gancho: 'Quando a cadeia não para',
    etiqueta: 'Cadeia',
    familia: 'cumulativo',
    icone: '⛓️',
    descricao:
      'O avô faleceu; o filho, que herdou, faleceu logo depois; e a viúva desse filho, que também herdou, faleceu em seguida. Nenhum inventário chegou ao fim.',
    licao:
      'Cada sobrevivente adquire no instante da morte anterior e transmite ao morrer. O acervo atravessa três sucessões antes de parar nas mãos dos netos — recolhendo imposto em cada passagem e mudando de titular a cada etapa.',
    montar: () => ({
      titulo: 'Cadeia de três óbitos',
      obitos: [
        obito('t3-1', 'A.', {
          dataObito: '2020-09-02',
          parentesco: 'Avô',
          descendentes: [p('t3-f1', 'B.', { situacao: 'pos_morto', obitoId: 't3-2' })],
          patrimonio: bens({ bensParticulares: 1_200_000 }),
        }),
        obito('t3-2', 'B.', {
          dataObito: '2021-06-19',
          parentesco: 'Filho de A.',
          conjuge: conjuge('t3-c', 'C.', 'comunhao_parcial', {
            situacao: 'pos_morto',
            obitoId: 't3-3',
          }),
          descendentes: [p('t3-n1', 'D.'), p('t3-n2', 'E.')],
          patrimonio: patrimonioVazio(),
        }),
        obito('t3-3', 'C.', {
          dataObito: '2022-04-27',
          parentesco: 'Viúva de B.',
          conjuge: conjuge('t3-c2', 'B.', 'comunhao_parcial', {
            situacao: 'pre_morto',
            obitoId: 't3-2',
          }),
          descendentes: [p('t3-n1', 'D.'), p('t3-n2', 'E.')],
          patrimonio: patrimonioVazio(),
        }),
      ],
    }),
  },
  {
    id: 'irmaos-cumulado',
    titulo: 'Dois irmãos solteiros, um após o outro',
    gancho: 'Herdeiros idênticos, processos reunidos',
    etiqueta: 'CPC 672, I',
    familia: 'cumulativo',
    icone: '🧾',
    descricao:
      'Dois irmãos solteiros e sem filhos faleceram com poucos meses de diferença. Os pais já eram falecidos. Sobrevivem outros dois irmãos.',
    licao:
      'Aqui não há dependência entre as partilhas: cada acervo é seu. O que autoriza a cumulação é a identidade das partes — os mesmos herdeiros nas duas heranças. Reunir os processos evita duplicar citações, avaliações e perícias.',
    montar: () => {
      const irmaos = (extra = '') => [
        { ...p(`ic-a${extra}`, 'C.', { filhoDoConjuge: false }), vinculo: 'bilateral' as const },
        { ...p(`ic-b${extra}`, 'D.', { filhoDoConjuge: false }), vinculo: 'bilateral' as const },
      ]
      return {
        titulo: 'Cumulação por identidade de partes',
        obitos: [
          obito('ic-1', 'A.', {
            dataObito: '2023-04-08',
            parentesco: 'Irmão de B., C. e D.',
            colaterais: { ...colateraisVazios(), irmaos: irmaos() },
            patrimonio: bens({ bensParticulares: 400_000 }),
          }),
          obito('ic-2', 'B.', {
            dataObito: '2023-10-21',
            parentesco: 'Irmão de A., C. e D.',
            colaterais: { ...colateraisVazios(), irmaos: irmaos() },
            patrimonio: bens({ bensParticulares: 260_000 }),
          }),
        ],
      }
    },
  },
]

export const MODELOS: Modelo[] = [...CUMULATIVOS, ...SIMPLES]

export function modeloPorId(id: string): Modelo | undefined {
  return MODELOS.find((m) => m.id === id)
}
