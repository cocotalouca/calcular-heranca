import { Fracao } from '@/lib/fracao'
import { centavosParaReais, formatarCentavos, reaisParaCentavos } from '@/lib/moeda'
import { calcular } from './calcular'
import {
  REGIMES,
  morreuAntes,
  type Alerta,
  type Aporte,
  type Caso,
  type EtapaInventario,
  type FundamentoCumulacao,
  type Inventario,
  type OrigemQuinhao,
  type Papel,
  type Pessoa,
  type QuinhaoConsolidado,
  type ResultadoCumulativo,
} from './tipos'

/* ================================================================== *
 * Inventário cumulativo — CPC arts. 672 e 673
 * ================================================================== *
 *
 * A ideia é simples e o efeito é grande: várias sucessões correm no mesmo
 * processo porque estão amarradas umas às outras. Quem sobreviveu ao primeiro
 * falecido herdou dele; se depois morreu, o que herdou passa aos herdeiros
 * DELE. A segunda partilha depende da primeira, e é por isso que a lei manda
 * cumular.
 *
 * O algoritmo percorre os óbitos em ordem cronológica. Cada quinhão que cai
 * na mão de alguém que também morreu vira "aporte" ao espólio desse alguém, e
 * o cálculo seguinte já parte do acervo aumentado. No fim, somamos o que cada
 * pessoa viva recebeu em todas as sucessões — que é a pergunta que o cliente
 * de fato faz: "quanto sobra para mim?".
 *
 * O ponto delicado, e a razão de existir deste módulo, é não confundir o
 * pré-morto com o pós-morto. O pré-morto nada herdou e é REPRESENTADO pelos
 * descendentes. O pós-morto herdou e TRANSMITE. Só o segundo gera cumulação.
 */

export function calcularInventario(inv: Inventario): ResultadoCumulativo {
  const obitos = inv.obitos
  const alertas: Alerta[] = []

  if (obitos.length === 0) {
    return {
      etapas: [],
      cumulativo: false,
      consolidado: [],
      totalConsolidadoCentavos: 0n,
      acervoDeclaradoCentavos: 0n,
      alertas: [],
      fundamentos: [],
    }
  }

  const indicePorId = new Map(obitos.map((o, i) => [o.id, i]))
  const nomePorId = new Map(
    obitos.map((o, i) => [o.id, o.nomeFalecido || `Falecido ${i + 1}`]),
  )

  verificarElos(obitos, indicePorId, alertas)

  /* ---------- percorrer os óbitos em ordem cronológica ---------- */

  const pendentes = new Map<string, Aporte[]>()
  const etapas: EtapaInventario[] = []

  obitos.forEach((original, indice) => {
    const aportes = pendentes.get(original.id) ?? []
    const efetivo = aplicarAportes(original, aportes)
    const resultado = calcular(efetivo)

    if (aportes.length > 0) {
      resultado.passos.unshift(passoDosAportes(original, aportes))
    }

    etapas.push({ indice, original, efetivo, resultado, aportes })

    /* --- o que sai daqui e entra no espólio de outro falecido --- */

    const registrar = (
      beneficiarioId: string,
      destinoObitoId: string | undefined,
      centavos: bigint,
      tipo: 'meacao' | 'heranca' | 'legado',
      descricao: string,
    ) => {
      if (!destinoObitoId || centavos <= 0n) return
      const destinoIndice = indicePorId.get(destinoObitoId)
      if (destinoIndice === undefined || destinoIndice <= indice) return

      const alvo = obitos[destinoIndice]
      const lista = pendentes.get(destinoObitoId) ?? []
      lista.push({
        origemObitoId: original.id,
        origemNome: nomePorId.get(original.id) ?? '',
        tipo,
        centavos,
        destino: destinoDoAporte(alvo),
        explicacao: descricao,
      })
      pendentes.set(destinoObitoId, lista)
      void beneficiarioId
    }

    if (resultado.meacao) {
      registrar(
        resultado.meacao.id,
        resultado.meacao.destinoObitoId,
        resultado.meacao.valorCentavos,
        'meacao',
        `Meação recebida na sucessão de ${nomePorId.get(original.id)}. Não é herança: já era patrimônio próprio, apenas destacado da massa comum.`,
      )
    }

    for (const q of resultado.quotas) {
      registrar(
        q.id,
        q.destinoObitoId,
        q.valorCentavos,
        q.tipo,
        `Quinhão de ${q.fracaoHeranca.paraTexto()} recebido na sucessão de ${nomePorId.get(original.id)} (${q.qualificacao}). A aquisição se deu no instante da morte, por força da saisine.`,
      )
    }
  })

  /* ---------- consolidar o destino final de cada pessoa ---------- */

  const consolidado = consolidar(etapas, indicePorId, nomePorId)
  const totalConsolidadoCentavos = consolidado.reduce((s, c) => s + c.totalCentavos, 0n)

  const acervoDeclaradoCentavos = obitos.reduce(
    (s, o) =>
      s + reaisParaCentavos(o.patrimonio.bensComuns) + reaisParaCentavos(o.patrimonio.bensParticulares),
    0n,
  )

  /* ---------- alertas do processo como um todo ---------- */

  const cumulativo = obitos.length > 1
  const fundamentos = cumulativo ? apurarFundamentos(obitos, etapas, indicePorId) : []

  if (cumulativo) {
    if (fundamentos.length === 0) {
      alertas.push({
        nivel: 'atencao',
        titulo: 'Não se vê o nexo que autoriza a cumulação',
        texto:
          'Os óbitos cadastrados não se comunicam: nenhum dos falecidos herdou do outro, não eram cônjuges entre si e os herdeiros não coincidem. Fora dessas três hipóteses o juiz tende a determinar o processamento em autos separados. Verifique se falta marcar alguém como falecido depois da abertura da sucessão, ou se os herdeiros deveriam ter o mesmo cadastro nos dois inventários.',
        fundamento: 'CPC arts. 672 e 673',
      })
    }

    alertas.push({
      nivel: 'atencao',
      titulo: 'O ITCMD incide sobre cada transmissão',
      texto:
        'Cumular os inventários é economia processual, não economia tributária. Há tantas transmissões causa mortis quantos forem os óbitos, e o imposto é devido em cada uma — sobre o valor dos bens ao tempo de cada abertura de sucessão, com a alíquota e a legislação estaduais então vigentes. O mesmo bem pode ser tributado duas vezes em poucos meses.',
      fundamento: 'CTN arts. 35 e 38; CF art. 155, I; Súmula 112/STF',
    })

    alertas.push({
      nivel: 'info',
      titulo: 'Um processo, várias partilhas',
      texto:
        'A cumulação reúne os inventários em autos únicos, mas cada herança conserva a sua individualidade: avaliação própria, plano de partilha próprio, formal de partilha próprio e cálculo de imposto próprio. Se a dependência for apenas parcial, o juiz pode ordenar a tramitação em separado.',
      fundamento: 'CPC arts. 672 e 673',
    })
  }

  const pendentesSemInventario = consolidado.filter((c) => c.pendente)
  if (pendentesSemInventario.length > 0) {
    alertas.push({
      nivel: 'critico',
      titulo: 'Há quinhão sem destino final',
      texto: `${pendentesSemInventario
        .map((c) => c.nome)
        .join(', ')} recebeu quinhão, mas também faleceu, e o inventário respectivo não foi cadastrado. Acrescente o óbito ao processo para acompanhar o valor até quem de fato o recebe.`,
      fundamento: 'CPC art. 672, III',
    })
  }

  // Os alertas de cada óbito sobem para a visão do processo, identificados.
  for (const etapa of etapas) {
    for (const a of etapa.resultado.alertas) {
      if (a.nivel === 'info') continue
      alertas.push({
        ...a,
        obitoId: etapa.original.id,
        obitoNome: nomePorId.get(etapa.original.id),
      })
    }
  }

  return {
    etapas,
    cumulativo,
    consolidado,
    totalConsolidadoCentavos,
    acervoDeclaradoCentavos,
    alertas,
    fundamentos,
  }
}

/* ================================================================== *
 * Aportes: o que um espólio recebe do outro
 * ================================================================== */

/**
 * Onde o valor herdado cai no acervo do segundo falecido.
 *
 * Regra do art. 1.659, I: bens recebidos por herança são PARTICULARES na
 * comunhão parcial — não se comunicam com o novo cônjuge. Só na comunhão
 * universal a herança entra na massa comum (art. 1.667), e ainda assim
 * ressalvada a cláusula de incomunicabilidade (art. 1.668, I).
 *
 * A distinção só tem efeito prático quando o segundo falecido tinha cônjuge
 * sobrevivente — do contrário não há massa comum alguma.
 */
function destinoDoAporte(alvo: Caso): 'comum' | 'particular' {
  const c = alvo.conjuge
  const conjugeSobrevive = c.existe && !morreuAntes(c.situacao)
  if (!conjugeSobrevive) return 'particular'
  return REGIMES[c.regime].herancaSeComunica ? 'comum' : 'particular'
}

function aplicarAportes(caso: Caso, aportes: Aporte[]): Caso {
  if (aportes.length === 0) return caso

  let comum = 0n
  let particular = 0n
  for (const a of aportes) {
    if (a.destino === 'comum') comum += a.centavos
    else particular += a.centavos
  }

  return {
    ...caso,
    patrimonio: {
      ...caso.patrimonio,
      bensComuns: caso.patrimonio.bensComuns + centavosParaReais(comum),
      bensParticulares: caso.patrimonio.bensParticulares + centavosParaReais(particular),
    },
  }
}

function passoDosAportes(caso: Caso, aportes: Aporte[]) {
  const total = aportes.reduce((s, a) => s + a.centavos, 0n)
  const comum = aportes.filter((a) => a.destino === 'comum').reduce((s, a) => s + a.centavos, 0n)
  const nome = caso.nomeFalecido || 'o segundo falecido'

  const linhas = aportes.map(
    (a) => `${a.origemNome}: ${formatarCentavos(a.centavos)} (${a.tipo === 'meacao' ? 'meação' : 'herança'})`,
  )

  return {
    titulo: 'Somar ao espólio o que este falecido já havia herdado',
    texto:
      `${nome} sobreviveu à abertura da sucessão anterior e adquiriu ali, no instante da morte do primeiro, o quinhão que lhe cabia. Esse valor não fica no inventário anterior à espera da partilha: ele já pertence a ${nome} e integra o acervo a ser partilhado agora. ` +
      (comum > 0n
        ? 'Como o regime de bens comunica a herança recebida, o aporte entrou na massa comum e o cônjuge sobrevivente é meeiro dele.'
        : 'A herança recebida é bem particular e não se comunica com o cônjuge sobrevivente (art. 1.659, I) — entra inteira no acervo hereditário.'),
    fundamento: 'CC arts. 1.784, 1.791 e 1.659, I; CPC art. 672, III',
    conta: `${linhas.join(' · ')} · total aportado ${formatarCentavos(total)}`,
    destaque: 'chave' as const,
  }
}

/* ================================================================== *
 * Consolidação: quem leva o quê, no fim de tudo
 * ================================================================== */

function consolidar(
  etapas: EtapaInventario[],
  indicePorId: Map<string, number>,
  nomePorId: Map<string, string>,
): QuinhaoConsolidado[] {
  const mapa = new Map<string, QuinhaoConsolidado>()

  const somar = (
    id: string,
    nome: string,
    papel: Papel,
    origem: OrigemQuinhao,
    pendente?: string,
  ) => {
    const atual = mapa.get(id)
    if (atual) {
      atual.totalCentavos += origem.centavos
      atual.origens.push(origem)
      if (pendente) atual.pendente = pendente
      return
    }
    mapa.set(id, {
      id,
      nome,
      papel,
      totalCentavos: origem.centavos,
      origens: [origem],
      pendente,
    })
  }

  for (const etapa of etapas) {
    const { resultado } = etapa
    const obitoNome = nomePorId.get(etapa.original.id) ?? resultado.nomeFalecido

    /* --- a meação, quando não segue para outro inventário --- */
    if (resultado.meacao && resultado.meacao.valorCentavos > 0n) {
      const seguiu = seguiuAdiante(resultado.meacao.destinoObitoId, etapa.indice, indicePorId)
      if (!seguiu) {
        somar(
          resultado.meacao.id,
          resultado.meacao.nome,
          'conjuge',
          {
            obitoId: etapa.original.id,
            obitoNome,
            tipo: 'meacao',
            fracao: Fracao.ZERO,
            centavos: resultado.meacao.valorCentavos,
            qualificacao: 'Meação — direito próprio, não é herança',
          },
        )
      }
    }

    /* --- os quinhões hereditários --- */
    for (const q of resultado.quotas) {
      if (q.valorCentavos <= 0n) continue
      if (seguiuAdiante(q.destinoObitoId, etapa.indice, indicePorId)) continue

      somar(
        q.id,
        q.nome,
        q.papel,
        {
          obitoId: etapa.original.id,
          obitoNome,
          tipo: q.tipo,
          fracao: q.fracaoHeranca,
          centavos: q.valorCentavos,
          qualificacao: q.qualificacao,
          representando: q.representando,
        },
        q.transmissaoPendente
          ? 'Faleceu depois da abertura da sucessão; o inventário dele ainda não foi cadastrado.'
          : undefined,
      )
    }
  }

  return [...mapa.values()].sort((a, b) => {
    const d = b.totalCentavos - a.totalCentavos
    if (d !== 0n) return d > 0n ? 1 : -1
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })
}

function seguiuAdiante(
  destinoObitoId: string | undefined,
  indiceAtual: number,
  indicePorId: Map<string, number>,
): boolean {
  if (!destinoObitoId) return false
  const destino = indicePorId.get(destinoObitoId)
  return destino !== undefined && destino > indiceAtual
}

/* ================================================================== *
 * Coerência dos elos entre óbitos
 * ================================================================== */

function verificarElos(
  obitos: Caso[],
  indicePorId: Map<string, number>,
  alertas: Alerta[],
) {
  const nome = (id: string) => obitos[indicePorId.get(id) ?? 0]?.nomeFalecido || 'outro falecido'

  obitos.forEach((caso, i) => {
    const conferir = (rotulo: string, situacao: Pessoa['situacao'], obitoId?: string) => {
      if (!obitoId) return
      const j = indicePorId.get(obitoId)

      if (j === undefined) {
        alertas.push({
          nivel: 'atencao',
          titulo: `${rotulo} aponta para um óbito que não existe mais`,
          texto:
            'O vínculo ficou órfão, provavelmente porque o óbito de destino foi removido do processo. Refaça a ligação ou marque a situação corretamente.',
          obitoId: caso.id,
          obitoNome: caso.nomeFalecido,
        })
        return
      }

      if (j === i) {
        alertas.push({
          nivel: 'critico',
          titulo: `${rotulo} está ligado ao próprio inventário`,
          texto: 'Uma pessoa não pode ser autora e herdeira da mesma sucessão. Desfaça o vínculo.',
          obitoId: caso.id,
          obitoNome: caso.nomeFalecido,
        })
        return
      }

      if (situacao === 'vivo') {
        alertas.push({
          nivel: 'critico',
          titulo: `${rotulo} consta como vivo, mas tem inventário cadastrado`,
          texto: `O vínculo aponta para a sucessão de ${nome(obitoId)}. Escolha a situação que corresponde à realidade: "faleceu antes" leva à representação pelos descendentes; "faleceu depois" transmite o quinhão ao espólio dele.`,
          obitoId: caso.id,
          obitoNome: caso.nomeFalecido,
        })
        return
      }

      if (situacao === 'pos_morto' && j < i) {
        alertas.push({
          nivel: 'critico',
          titulo: `A ordem cronológica contradiz a situação de ${rotulo.toLowerCase()}`,
          texto: `Está marcado como falecido DEPOIS de ${caso.nomeFalecido || 'o autor da herança'}, mas o inventário dele vem antes na linha do tempo do processo. Reordene os óbitos ou corrija a situação — a ordem decide quem herdou de quem.`,
          obitoId: caso.id,
          obitoNome: caso.nomeFalecido,
          fundamento: 'CC art. 1.784',
        })
      }

      // A comoriência é neutra quanto à ordem: presumem-se mortos no mesmo
      // instante, e nenhum dos dois herda do outro. Cobrar cronologia aqui
      // seria inventar uma sequência que a lei justamente diz não existir.
      if (situacao === 'pre_morto' && j > i) {
        alertas.push({
          nivel: 'critico',
          titulo: `A ordem cronológica contradiz a situação de ${rotulo.toLowerCase()}`,
          texto: `Está marcado como falecido ANTES de ${caso.nomeFalecido || 'o autor da herança'}, mas o inventário dele aparece depois na linha do tempo. Reordene os óbitos ou corrija a situação.`,
          obitoId: caso.id,
          obitoNome: caso.nomeFalecido,
          fundamento: 'CC art. 1.851',
        })
      }
    }

    const visitar = (p: Pessoa) => {
      conferir(p.nome || 'Um herdeiro', p.situacao, p.obitoId)
      p.filhos.forEach(visitar)
    }
    caso.descendentes.forEach(visitar)
    caso.colaterais.irmaos.forEach(visitar)

    if (caso.conjuge.existe) {
      conferir(caso.conjuge.nome || 'O cônjuge', caso.conjuge.situacao, caso.conjuge.obitoId)
    }

    // Pai e mãe só entram na sucessão se estavam vivos ao tempo dela. Se o
    // inventário de um deles também está no processo, ele só pode vir depois:
    // herdaram primeiro, morreram depois. A ordem invertida denuncia que o
    // ascendente foi marcado como vivo quando já era falecido.
    const ascendente = (rotulo: string, obitoId?: string) => {
      if (!obitoId) return
      const j = indicePorId.get(obitoId)
      if (j === undefined || j > i) return
      alertas.push({
        nivel: 'critico',
        titulo: `${rotulo} herda aqui, mas o inventário dele vem antes`,
        texto: `Para herdar de ${caso.nomeFalecido || 'o autor da herança'}, ${rotulo.toLowerCase()} precisava estar vivo na abertura desta sucessão — e então o óbito dele é posterior. Reordene a linha do tempo, ou desmarque o ascendente como sobrevivente.`,
        fundamento: 'CC arts. 1.784 e 1.836',
        obitoId: caso.id,
        obitoNome: caso.nomeFalecido,
      })
    }
    if (caso.ascendentes.pai) ascendente('O pai', caso.ascendentes.obitoPaiId)
    if (caso.ascendentes.mae) ascendente('A mãe', caso.ascendentes.obitoMaeId)
  })
}

/* ================================================================== *
 * Qual inciso do art. 672 autoriza a cumulação
 * ================================================================== */

function apurarFundamentos(
  obitos: Caso[],
  etapas: EtapaInventario[],
  indicePorId: Map<string, number>,
): FundamentoCumulacao[] {
  const fundamentos: FundamentoCumulacao[] = []

  /* --- III: uma partilha depende da outra --- */
  const dependencias = etapas.filter((e) => e.aportes.length > 0)
  if (dependencias.length > 0) {
    const pares = dependencias.flatMap((e) =>
      e.aportes.map((a) => `de ${a.origemNome} para ${e.original.nomeFalecido || 'o segundo falecido'}`),
    )
    fundamentos.push({
      inciso: 'CPC art. 672, III',
      texto: `Dependência de uma partilha em relação à outra — ${pares.join('; ')}. Só depois de apurado o quinhão na primeira sucessão se sabe o que há para partilhar na segunda.`,
    })
  }

  /* --- II: heranças dos dois cônjuges ou companheiros --- */
  const casais: string[] = []
  obitos.forEach((a, i) => {
    if (!a.conjuge.existe || !a.conjuge.obitoId) return
    const j = indicePorId.get(a.conjuge.obitoId)
    if (j === undefined || j <= i) return
    const b = obitos[j]
    const vinculo = a.conjuge.vinculo === 'uniao_estavel' ? 'companheiros' : 'cônjuges'
    casais.push(
      `${a.nomeFalecido || 'o primeiro falecido'} e ${b.nomeFalecido || 'o segundo falecido'} (${vinculo})`,
    )
  })
  if (casais.length > 0) {
    fundamentos.push({
      inciso: 'CPC art. 672, II',
      texto: `Heranças deixadas pelos dois cônjuges ou companheiros: ${casais.join('; ')}. É a hipótese mais comum de cumulação — o casal falece em sequência e um único processo resolve as duas sucessões.`,
    })
  }

  /* --- I: identidade de pessoas entre as quais se repartem os bens --- */
  const conjuntos = etapas.map(
    (e) =>
      new Set(
        e.resultado.quotas
          .filter((q) => q.valorCentavos > 0n && q.tipo === 'heranca')
          .map((q) => q.id),
      ),
  )
  const identicos =
    conjuntos.length > 1 &&
    conjuntos.every((s) => s.size > 0) &&
    conjuntos.every(
      (s) => s.size === conjuntos[0].size && [...s].every((id) => conjuntos[0].has(id)),
    )

  if (identicos) {
    fundamentos.push({
      inciso: 'CPC art. 672, I',
      texto:
        'Identidade de pessoas entre as quais devam ser repartidos os bens: os mesmos herdeiros comparecem em todas as sucessões cadastradas. Nada justificaria dois processos paralelos com as mesmas partes discutindo o mesmo acervo familiar.',
    })
  } else if (conjuntos.length > 1) {
    const comuns = [...conjuntos[0]].filter((id) => conjuntos.every((s) => s.has(id)))
    if (comuns.length > 0) {
      fundamentos.push({
        inciso: 'CPC art. 672, I (parcial)',
        texto: `Há herdeiros comuns a todas as sucessões, mas não identidade completa das partes. A cumulação continua possível pelos demais incisos; se a dependência for apenas parcial, o juiz pode determinar o processamento em separado (art. 673).`,
      })
    }
  }

  return fundamentos
}
