import { Fracao, F, repartirCentavos } from '@/lib/fracao'
import { formatarCentavos, reaisParaCentavos } from '@/lib/moeda'
import { coletarAscendentes } from './ascendentes'
import { coletarColaterais } from './colaterais'
import { analisarFiliacao, coletarDescendentes, type Estirpe } from './descendentes'
import {
  REGIMES,
  type Alerta,
  type Caso,
  type Classe,
  type Passo,
  type Quota,
  type Resultado,
} from './tipos'

/** Parte de um beneficiário dentro da massa que lhe é destinada. */
interface Parte {
  id: string
  nome: string
  qualificacao: string
  fracao: Fracao
  fundamento: string[]
  representando?: string
  observacao?: string
  nivel?: number
  ehConjuge?: boolean
}

/* ================================================================== *
 * Entrada principal
 * ================================================================== */

export function calcular(caso: Caso): Resultado {
  const passos: Passo[] = []
  const alertas: Alerta[] = []
  const info = REGIMES[caso.conjuge.regime]

  /* ---------- 1. Quem é o cônjuge, afinal ---------- */

  const conjugeSobrevive =
    caso.conjuge.existe &&
    caso.conjuge.situacao !== 'pre_morto' &&
    caso.conjuge.situacao !== 'comoriente'

  const conjugeHerdeiro =
    conjugeSobrevive &&
    caso.conjuge.situacao === 'vivo' &&
    !caso.conjuge.separadoDeFato

  if (caso.conjuge.existe && caso.conjuge.separadoDeFato) {
    alertas.push({
      nivel: 'atencao',
      titulo: 'Cônjuge afastado da sucessão pela separação',
      texto:
        'Separado judicialmente, ou de fato há mais de dois anos ao tempo da morte, o sobrevivente perde o direito sucessório — mas conserva a meação, que é direito patrimonial e não hereditário. A lei ressalva a prova de que a convivência se tornara impossível sem culpa do sobrevivente, hipótese em que ele volta a herdar.',
      fundamento: 'CC art. 1.830',
    })
  }

  if (caso.conjuge.existe && caso.conjuge.situacao === 'renunciante') {
    alertas.push({
      nivel: 'info',
      titulo: 'Cônjuge renunciou à herança',
      texto:
        'A renúncia atinge apenas a herança. A meação permanece intacta: ela não decorre da sucessão, mas do regime de bens.',
      fundamento: 'CC arts. 1.804 a 1.813',
    })
  }

  /* ---------- 2. Massa: meação, dívidas, herança líquida ---------- */

  const temMeacao =
    conjugeSobrevive &&
    (info.temMeacao ||
      (caso.conjuge.regime === 'separacao_obrigatoria' && caso.conjuge.sumula377))

  let comuns = reaisParaCentavos(caso.patrimonio.bensComuns)
  let particulares = reaisParaCentavos(caso.patrimonio.bensParticulares)

  if (!temMeacao && comuns > 0n) {
    // Sem meação não existe massa comum a partilhar: o acervo informado como
    // comum integra o espólio.
    particulares += comuns
    comuns = 0n
  }

  const meacaoCentavos = comuns / 2n
  const parcelaComumBruta = comuns - meacaoCentavos

  const dividas = reaisParaCentavos(caso.patrimonio.dividas)
  const funeral = reaisParaCentavos(caso.patrimonio.despesasFuneral)
  const bruto = parcelaComumBruta + particulares
  const abatimento = min(dividas + funeral, bruto)

  const abComum = bruto > 0n ? (abatimento * parcelaComumBruta) / bruto : 0n
  const abParticular = abatimento - abComum
  const parcelaComum = parcelaComumBruta - abComum
  const parcelaParticular = particulares - abParticular
  const herancaLiquida = parcelaComum + parcelaParticular

  if (dividas + funeral > bruto && bruto > 0n) {
    alertas.push({
      nivel: 'critico',
      titulo: 'Espólio insolvente',
      texto:
        'As dívidas e despesas superam o acervo. Os herdeiros não respondem por encargos além das forças da herança: recebem zero, mas nada devem do próprio bolso. O caso pede insolvência civil do espólio.',
      fundamento: 'CC arts. 1.792 e 1.997',
    })
  }

  passos.push({
    titulo: 'Separar a meação da herança',
    texto: temMeacao
      ? `No regime de ${info.nome.toLowerCase()}, metade da massa comum já pertence ao cônjuge sobrevivente por direito próprio. Essa metade não é herança e não se partilha: apenas se destaca. O que sobra — a outra metade dos bens comuns somada aos bens particulares do falecido — forma o acervo hereditário.`
      : `No regime de ${info.nome.toLowerCase()} não há meação a destacar. Todo o acervo do falecido forma a herança.`,
    fundamento: info.fundamento,
    conta: temMeacao
      ? `Meação = ${formatarCentavos(comuns)} ÷ 2 = ${formatarCentavos(meacaoCentavos)}`
      : undefined,
    destaque: 'chave',
  })

  if (abatimento > 0n) {
    passos.push({
      titulo: 'Abater dívidas e despesas',
      texto:
        'A herança é o que resta depois de pagas as dívidas do falecido e as despesas de funeral. Só o líquido se partilha, e é sobre ele que a legítima se calcula.',
      fundamento: 'CC arts. 1.847 e 1.997',
      conta: `${formatarCentavos(bruto)} − ${formatarCentavos(abatimento)} = ${formatarCentavos(herancaLiquida)}`,
    })
  }

  /* ---------- 3. Vocação hereditária ---------- */

  const coletaDesc = coletarDescendentes(caso.descendentes)
  const coletaAsc = coletarAscendentes(caso.ascendentes)

  let classe: Classe = 'vacante'
  let classeLabel = 'Herança vacante'
  let partesParticular: Parte[] = []
  let partesComum: Parte[] = []

  if (coletaDesc.estirpes.length > 0) {
    classe = 'descendentes'
    const r = distribuirDescendentes(
      caso,
      coletaDesc.estirpes,
      coletaDesc.cabecas,
      conjugeHerdeiro,
      parcelaParticular,
      passos,
      alertas,
    )
    partesParticular = r.particular
    partesComum = r.comum
    // O rótulo só menciona concorrência se ela de fato ocorreu: sobreviver ao
    // falecido não basta, o regime de bens pode afastar o cônjuge.
    classeLabel = concorreuDeFato(partesParticular, partesComum)
      ? 'Descendentes em concorrência com o cônjuge'
      : 'Descendentes'

    if (coletaDesc.aplicou1811) {
      alertas.push({
        nivel: 'atencao',
        titulo: 'Netos herdam por cabeça, não por estirpe',
        texto:
          'Todos os filhos renunciaram. Como ninguém sucede representando renunciante, os netos não sobem por representação: vêm à herança por direito próprio e dividem tudo por cabeça, em partes iguais — mesmo que um ramo tenha mais filhos que o outro.',
        fundamento: 'CC art. 1.811, parte final',
      })
    }
  } else if (coletaAsc.herdeiros.length > 0) {
    classe = 'ascendentes'
    partesParticular = distribuirAscendentes(caso, coletaAsc, conjugeHerdeiro, passos, alertas)
    partesComum = partesParticular
    classeLabel = concorreuDeFato(partesParticular, partesComum)
      ? 'Ascendentes em concorrência com o cônjuge'
      : 'Ascendentes'
  } else if (conjugeHerdeiro) {
    classe = 'conjuge'
    classeLabel = 'Cônjuge/companheiro sobrevivente'
    partesParticular = [
      {
        id: 'conjuge',
        nome: caso.conjuge.nome || 'Cônjuge sobrevivente',
        qualificacao: rotuloConjuge(caso),
        fracao: Fracao.UM,
        fundamento: ['CC art. 1.838'],
        ehConjuge: true,
      },
    ]
    partesComum = partesParticular
    passos.push({
      titulo: 'O cônjuge herda sozinho',
      texto:
        'Não há descendentes nem ascendentes. O cônjuge sobrevivente é chamado na terceira ordem e recebe a totalidade da herança, além da meação que já lhe cabia.',
      fundamento: 'CC arts. 1.829, III e 1.838',
      destaque: 'chave',
    })
  } else {
    const coletaCol = coletarColaterais(caso.colaterais)
    if (coletaCol.herdeiros.length > 0) {
      classe = 'colaterais'
      classeLabel = `Colaterais de ${coletaCol.grau}º grau`
      partesParticular = coletaCol.herdeiros.map((h) => ({
        id: h.id,
        nome: h.nome,
        qualificacao: h.qualificacao,
        fracao: h.fracao,
        fundamento: [coletaCol.fundamento],
        representando: h.representando,
        observacao: h.observacao,
        nivel: h.grau,
      }))
      partesComum = partesParticular
      passos.push({
        titulo: `Chamamento dos colaterais (${coletaCol.grau}º grau)`,
        texto: coletaCol.regra,
        fundamento: coletaCol.fundamento,
        destaque: 'chave',
      })
      alertas.push({
        nivel: 'info',
        titulo: 'Colaterais não são herdeiros necessários',
        texto:
          'Irmãos, sobrinhos, tios e primos não têm legítima. O falecido poderia ter disposto de 100% do patrimônio em testamento e deixá-los sem nada.',
        fundamento: 'CC art. 1.845',
      })
    }
  }

  /* ---------- 4. Legítima, disponível e testamento ---------- */

  const temHerdeirosNecessarios =
    classe === 'descendentes' || classe === 'ascendentes' || classe === 'conjuge'

  const disponivel = temHerdeirosNecessarios ? herancaLiquida / 2n : herancaLiquida
  const legitima = herancaLiquida - disponivel

  if (temHerdeirosNecessarios) {
    passos.push({
      titulo: 'Legítima e parte disponível',
      texto:
        'Havendo herdeiros necessários — descendentes, ascendentes ou cônjuge —, metade da herança lhes é reservada por lei. Nenhum testamento alcança essa metade. A outra metade é de livre disposição.',
      fundamento: 'CC arts. 1.845, 1.846 e 1.789',
      conta: `Legítima = ${formatarCentavos(legitima)} · Disponível = ${formatarCentavos(disponivel)}`,
    })
  }

  const { partesLegado, totalLegados } = calcularLegados(
    caso,
    herancaLiquida,
    disponivel,
    temHerdeirosNecessarios,
    alertas,
  )

  const paraLegitimos = herancaLiquida - totalLegados

  /* ---------- 5. Compor as frações finais sobre a herança ---------- */

  const usarSubMassas =
    partesParticular !== partesComum && herancaLiquida > 0n

  const pesoParticular = herancaLiquida > 0n
    ? new Fracao(parcelaParticular, herancaLiquida)
    : Fracao.ZERO
  const pesoComum = herancaLiquida > 0n
    ? new Fracao(parcelaComum, herancaLiquida)
    : Fracao.ZERO

  const mapa = new Map<string, Parte & { fracaoClasse: Fracao }>()

  const acumular = (partes: Parte[], peso: Fracao) => {
    for (const p of partes) {
      const anterior = mapa.get(p.id)
      const add = p.fracao.vezes(peso)
      if (anterior) anterior.fracaoClasse = anterior.fracaoClasse.mais(add)
      else mapa.set(p.id, { ...p, fracaoClasse: add })
    }
  }

  if (usarSubMassas) {
    acumular(partesParticular, pesoParticular)
    acumular(partesComum, pesoComum)
  } else {
    // Distribuição uniforme: uma única massa, fração pura da lei.
    acumular(partesParticular.length > 0 ? partesParticular : partesComum, Fracao.UM)
  }

  // Escala pela porção que efetivamente sobrou aos herdeiros legítimos.
  const escala = herancaLiquida > 0n
    ? new Fracao(paraLegitimos, herancaLiquida)
    : Fracao.UM

  const legitimos = [...mapa.values()]
  const fracoesFinais = legitimos.map((p) => p.fracaoClasse.vezes(escala))

  /* ---------- 6. Repartir os centavos sem perder um só ---------- */

  const todasFracoes = [
    ...fracoesFinais,
    ...partesLegado.map((l) => l.fracao),
  ]
  const valores =
    herancaLiquida > 0n
      ? repartirCentavos(herancaLiquida, todasFracoes)
      : todasFracoes.map(() => 0n)

  let quotas: Quota[] = legitimos.map((p, i) => ({
    id: p.id,
    nome: p.nome,
    qualificacao: p.qualificacao,
    tipo: 'heranca' as const,
    fracaoHeranca: fracoesFinais[i],
    valorCentavos: valores[i],
    fundamento: p.fundamento,
    representando: p.representando,
    observacao: p.observacao,
    nivel: p.nivel,
  }))

  partesLegado.forEach((l, k) => {
    quotas.push({
      id: l.id,
      nome: l.nome,
      qualificacao: 'Beneficiário de testamento',
      tipo: 'legado',
      fracaoHeranca: l.fracao,
      valorCentavos: valores[legitimos.length + k],
      fundamento: ['CC arts. 1.857 e 1.912 e ss.'],
    })
  })

  /* ---------- 7. Colação de doações em vida ---------- */

  quotas = aplicarColacao(caso, quotas, paraLegitimos, disponivel, passos, alertas)

  /* ---------- 8. Herança vacante ---------- */

  if (quotas.length === 0 && herancaLiquida > 0n) {
    quotas.push({
      id: 'municipio',
      nome: 'Município / Distrito Federal',
      qualificacao: 'Herança vacante',
      tipo: 'heranca',
      fracaoHeranca: Fracao.UM,
      valorCentavos: herancaLiquida,
      fundamento: ['CC arts. 1.819 a 1.822 e 1.844'],
    })
    alertas.push({
      nivel: 'critico',
      titulo: 'Ninguém foi chamado a suceder',
      texto:
        'Não há descendentes, ascendentes, cônjuge nem colaterais até o 4º grau. A herança será declarada jacente, arrecadada e, após um ano da primeira publicação do edital sem habilitação, declarada vacante — passando ao Município ou ao Distrito Federal onde estavam os bens.',
      fundamento: 'CC arts. 1.819 a 1.822 e 1.844',
    })
  }

  /* ---------- 9. Avisos gerais ---------- */

  reunirAlertasGerais(caso, classe, coletaDesc.descartados, alertas)

  const resumo = montarResumo(caso, classe, quotas)

  return {
    classe,
    classeLabel,
    quotas: quotas.sort(ordenarQuotas),
    meacao:
      temMeacao && meacaoCentavos > 0n
        ? {
            valorCentavos: meacaoCentavos,
            nome: caso.conjuge.nome || 'Cônjuge sobrevivente',
            explicacao: `Metade da massa comum (${formatarCentavos(comuns)}), destacada antes de qualquer partilha. Não é herança: é patrimônio próprio do sobrevivente, decorrente do regime de bens.`,
          }
        : null,
    massa: {
      bensComunsCentavos: comuns,
      bensParticularesCentavos: particulares,
      dividasCentavos: abatimento,
      herancaLiquidaCentavos: herancaLiquida,
      parcelaComumCentavos: parcelaComum,
      parcelaParticularCentavos: parcelaParticular,
      legitimaCentavos: legitima,
      disponivelCentavos: disponivel,
      temHerdeirosNecessarios,
    },
    passos,
    alertas,
    resumo,
  }
}

/* ================================================================== *
 * Distribuição: descendentes (art. 1.829, I e art. 1.832)
 * ================================================================== */

function distribuirDescendentes(
  caso: Caso,
  estirpes: Estirpe[],
  cabecas: number,
  conjugeHerdeiro: boolean,
  parcelaParticular: bigint,
  passos: Passo[],
  alertas: Alerta[],
): { particular: Parte[]; comum: Parte[] } {
  const info = REGIMES[caso.conjuge.regime]
  const filiacao = analisarFiliacao(estirpes)

  let concorre = false
  let soSobreParticulares = false

  if (conjugeHerdeiro) {
    switch (info.concorrenciaDescendentes) {
      case 'sempre':
        concorre = true
        break
      case 'nunca':
        concorre = false
        break
      case 'se_particulares':
        concorre = parcelaParticular > 0n
        soSobreParticulares = concorre && caso.opcoes.concorrenciaSoBensParticulares
        break
    }
  }

  /* --- explicação do porquê --- */
  if (conjugeHerdeiro && !concorre) {
    passos.push({
      titulo: 'O cônjuge não concorre com os descendentes',
      texto:
        info.concorrenciaDescendentes === 'nunca'
          ? `${info.nome} está entre as exceções do art. 1.829, I. O sobrevivente fica com a meação e nada mais: a herança inteira é dos descendentes.`
          : 'Na comunhão parcial, a concorrência depende da existência de bens particulares do falecido. Não havendo nenhum, o cônjuge fica só com a meação.',
      fundamento: 'CC art. 1.829, I',
      destaque: 'chave',
    })
  }

  if (concorre && soSobreParticulares) {
    passos.push({
      titulo: 'A concorrência recai só sobre os bens particulares',
      texto:
        'Na comunhão parcial, o cônjuge já é meeiro dos bens comuns — concorrer também sobre eles o privilegiaria duas vezes. Por isso o STJ fixou que a concorrência incide apenas sobre os bens particulares do falecido. A metade do falecido nos bens comuns vai integralmente aos descendentes.',
      fundamento: 'STJ REsp 1.368.123/SP, 2ª Seção; Enunciado 270 do CJF',
      destaque: 'chave',
    })
  }

  /* --- a quota do cônjuge --- */
  const podeReservar =
    filiacao === 'todos' ||
    (filiacao === 'hibrida' && caso.opcoes.reservaQuartoFiliacaoHibrida)

  let quotaConjuge = F(1, cabecas + 1)
  let reservaAplicada = false
  if (concorre && podeReservar && quotaConjuge.menorQue(F(1, 4))) {
    quotaConjuge = F(1, 4)
    reservaAplicada = true
  }

  if (concorre) {
    // Quando a concorrência se limita aos bens particulares, as frações deste
    // passo são frações DAQUELA parcela — não da herança inteira. Dizer isso
    // evita a impressão de contradição com o quinhão final exibido depois.
    const base = soSobreParticulares ? 'dos bens particulares' : 'da herança'
    const nota = soSobreParticulares
      ? ' Atenção: estas frações são da parcela dos bens particulares, não da herança inteira — sobre os bens comuns o cônjuge nada recebe, de modo que o quinhão final dele será menor.'
      : ''

    passos.push({
      titulo: 'Quinhão do cônjuge em concorrência',
      texto:
        (reservaAplicada
          ? `Dividido por cabeça entre ${cabecas} descendentes mais o cônjuge, cada um ficaria com ${F(1, cabecas + 1).paraTexto()} — menos de um quarto. Como o cônjuge é ascendente de todos os descendentes com quem concorre, a lei lhe garante o piso de 1/4 ${base}. O restante se reparte entre os descendentes.`
          : `O cônjuge recebe quinhão igual ao de cada descendente que sucede por cabeça: são ${cabecas} descendentes mais o cônjuge, logo ${quotaConjuge.paraTexto()} ${base} para cada um.`) + nota,
      fundamento: 'CC art. 1.832',
      conta: reservaAplicada
        ? `Cônjuge = 1/4 ${base} · Cada descendente = (1 − 1/4) ÷ ${cabecas} = ${F(3, 4).dividido(cabecas).paraTexto()}`
        : `${cabecas} descendentes + 1 cônjuge = ${cabecas + 1} quinhões de ${quotaConjuge.paraTexto()} ${base}`,
      destaque: 'chave',
    })

    if (filiacao === 'hibrida') {
      alertas.push({
        nivel: 'atencao',
        titulo: 'Filiação híbrida — ponto controvertido',
        texto: caso.opcoes.reservaQuartoFiliacaoHibrida
          ? 'Parte dos descendentes é comum ao casal e parte não. Aqui a reserva de 1/4 foi aplicada. Saiba que o Enunciado 527 do CJF sustenta o oposto: não se reserva a quarta parte na filiação híbrida. O tema não está pacificado — o resultado muda conforme a tese adotada.'
          : 'Parte dos descendentes é comum ao casal e parte não. Seguimos o Enunciado 527 do CJF e NÃO reservamos a quarta parte ao cônjuge. Há corrente respeitável em sentido contrário, e o tema não está pacificado. Você pode inverter essa premissa nas opções avançadas e comparar os resultados.',
        fundamento: 'Enunciado 527 da V Jornada de Direito Civil; CC art. 1.832',
      })
    }
  }

  /* --- montar as partes --- */
  const comConjuge = montarPartesDescendentes(caso, estirpes, quotaConjuge, true)
  const semConjuge = montarPartesDescendentes(caso, estirpes, Fracao.ZERO, false)

  if (!concorre) return { particular: semConjuge, comum: semConjuge }
  if (soSobreParticulares) return { particular: comConjuge, comum: semConjuge }
  return { particular: comConjuge, comum: comConjuge }
}

function montarPartesDescendentes(
  caso: Caso,
  estirpes: Estirpe[],
  quotaConjuge: Fracao,
  incluirConjuge: boolean,
): Parte[] {
  const partes: Parte[] = []
  const restante = Fracao.UM.menos(quotaConjuge)
  const porEstirpe = restante.dividido(estirpes.length)

  if (incluirConjuge && quotaConjuge.ehPositiva()) {
    partes.push({
      id: 'conjuge',
      nome: caso.conjuge.nome || 'Cônjuge sobrevivente',
      qualificacao: rotuloConjuge(caso),
      fracao: quotaConjuge,
      fundamento: ['CC arts. 1.829, I e 1.832'],
      ehConjuge: true,
      nivel: 0,
    })
  }

  for (const estirpe of estirpes) {
    for (const m of estirpe.membros) {
      partes.push({
        id: m.pessoa.id,
        nome: m.pessoa.nome,
        qualificacao: qualificarDescendente(m.nivel, m.representando !== undefined),
        fracao: porEstirpe.vezes(m.fracaoInterna),
        fundamento: m.representando
          ? ['CC arts. 1.833, 1.851 a 1.855']
          : ['CC arts. 1.829, I e 1.833'],
        representando: m.representando,
        observacao: m.representando
          ? `Herda por representação de ${m.representando}, dividindo a quota dele com os demais representantes.`
          : undefined,
        nivel: m.nivel,
      })
    }
  }

  return partes
}

function qualificarDescendente(nivel: number, porRepresentacao: boolean): string {
  const nomes = ['', 'Filho(a)', 'Neto(a)', 'Bisneto(a)', 'Trineto(a)']
  const base = nomes[nivel] ?? `Descendente de ${nivel}º grau`
  return porRepresentacao ? `${base} por representação` : base
}

/* ================================================================== *
 * Distribuição: ascendentes (art. 1.836 e art. 1.837)
 * ================================================================== */

function distribuirAscendentes(
  caso: Caso,
  coleta: ReturnType<typeof coletarAscendentes>,
  conjugeHerdeiro: boolean,
  passos: Passo[],
  alertas: Alerta[],
): Parte[] {
  const partes: Parte[] = []

  let quotaConjuge = Fracao.ZERO
  if (conjugeHerdeiro) {
    // Um terço só quando concorre com DOIS ascendentes de 1º grau.
    const doisPaisVivos = coleta.grau === 1 && coleta.herdeiros.length === 2
    quotaConjuge = doisPaisVivos ? F(1, 3) : F(1, 2)

    partes.push({
      id: 'conjuge',
      nome: caso.conjuge.nome || 'Cônjuge sobrevivente',
      qualificacao: rotuloConjuge(caso),
      fracao: quotaConjuge,
      fundamento: ['CC arts. 1.829, II e 1.837'],
      ehConjuge: true,
      nivel: 0,
    })

    passos.push({
      titulo: 'Cônjuge em concorrência com ascendentes',
      texto: doisPaisVivos
        ? 'Concorrendo com pai e mãe, ao cônjuge cabe um terço da herança; os outros dois terços se repartem entre os dois ascendentes. Note que aqui o regime de bens é irrelevante: o cônjuge concorre com ascendentes em qualquer regime.'
        : coleta.grau === 1
          ? 'Sobrevivendo um único ascendente de primeiro grau, o cônjuge sobe para metade da herança. O regime de bens não interfere nessa concorrência.'
          : `Como os ascendentes são de ${coleta.grau}º grau, o cônjuge recebe metade da herança. O regime de bens não interfere nessa concorrência.`,
      fundamento: 'CC art. 1.837',
      conta: `Cônjuge = ${quotaConjuge.paraTexto()} · Ascendentes = ${Fracao.UM.menos(quotaConjuge).paraTexto()}`,
      destaque: 'chave',
    })
  }

  const paraAscendentes = Fracao.UM.menos(quotaConjuge)

  for (const h of coleta.herdeiros) {
    partes.push({
      id: h.id,
      nome: h.nome,
      qualificacao: h.qualificacao,
      fracao: paraAscendentes.vezes(h.fracao),
      fundamento: ['CC arts. 1.829, II e 1.836'],
      nivel: -h.grau,
    })
  }

  passos.push({
    titulo: `Chamamento dos ascendentes — ${coleta.descricaoGrau}`,
    texto: coleta.duasLinhas
      ? 'Na classe dos ascendentes o grau mais próximo exclui o mais remoto, sem distinção de linhas. Havendo igualdade de grau e diversidade de linha, metade cabe à linha paterna e metade à materna — e cada linha reparte a sua metade entre os que dela fazem parte.'
      : 'Na classe dos ascendentes o grau mais próximo exclui o mais remoto. Como só uma das linhas tem sobreviventes nesse grau, não há divisão por linhas: seus integrantes dividem tudo por cabeça.',
    fundamento: 'CC art. 1.836, §§ 1º e 2º',
  })

  if (coleta.grau >= 2 && coleta.duasLinhas) {
    alertas.push({
      nivel: 'info',
      titulo: 'A divisão por linhas pode surpreender',
      texto:
        'Um avô sozinho de um lado recebe tanto quanto dois avós do outro lado somados: a lei divide primeiro por linha, e só depois por cabeça dentro de cada linha.',
      fundamento: 'CC art. 1.836, § 2º',
    })
  }

  return partes
}

/* ================================================================== *
 * Testamento
 * ================================================================== */

function calcularLegados(
  caso: Caso,
  herancaLiquida: bigint,
  disponivel: bigint,
  temHerdeirosNecessarios: boolean,
  alertas: Alerta[],
): { partesLegado: { id: string; nome: string; fracao: Fracao }[]; totalLegados: bigint } {
  const legados = caso.patrimonio.legados.filter((l) => l.quantia > 0)
  if (legados.length === 0 || herancaLiquida <= 0n) {
    return { partesLegado: [], totalLegados: 0n }
  }

  const brutos = legados.map((l) => {
    const c =
      l.modo === 'valor'
        ? reaisParaCentavos(l.quantia)
        : (herancaLiquida * BigInt(Math.round(l.quantia * 100))) / 10000n
    return { id: l.id, nome: l.beneficiario || 'Beneficiário', centavos: c }
  })

  const somaBruta = brutos.reduce((s, b) => s + b.centavos, 0n)
  const teto = temHerdeirosNecessarios ? disponivel : herancaLiquida

  let efetivos = brutos
  let total = somaBruta

  if (somaBruta > teto) {
    // Redução proporcional das disposições testamentárias.
    const fatorFracoes = brutos.map((b) => new Fracao(b.centavos, somaBruta))
    const reduzidos = repartirCentavos(teto, fatorFracoes)
    efetivos = brutos.map((b, i) => ({ ...b, centavos: reduzidos[i] }))
    total = teto

    alertas.push({
      nivel: 'critico',
      titulo: 'Testamento excede a parte disponível',
      texto: temHerdeirosNecessarios
        ? `As disposições somam ${formatarCentavos(somaBruta)}, mas a parte disponível é de apenas ${formatarCentavos(disponivel)}. O excesso invade a legítima e é nulo nessa medida: as deixas foram reduzidas proporcionalmente até caberem no disponível.`
        : `As disposições somam mais do que a herança comporta e foram reduzidas proporcionalmente.`,
      fundamento: 'CC arts. 1.789, 1.846, 1.966 e 1.967',
    })
  }

  return {
    partesLegado: efetivos.map((e) => ({
      id: `legado-${e.id}`,
      nome: e.nome,
      fracao: new Fracao(e.centavos, herancaLiquida),
    })),
    totalLegados: total,
  }
}

/* ================================================================== *
 * Colação (arts. 2.002 a 2.012)
 * ================================================================== */

function aplicarColacao(
  caso: Caso,
  quotas: Quota[],
  paraLegitimos: bigint,
  disponivel: bigint,
  passos: Passo[],
  alertas: Alerta[],
): Quota[] {
  const doacoes = caso.patrimonio.doacoes.filter((d) => d.valor > 0)
  if (doacoes.length === 0) return quotas

  const dispensadas = doacoes.filter((d) => d.dispensada)
  const colacionaveis = doacoes.filter((d) => !d.dispensada)

  const somaDispensada = dispensadas.reduce((s, d) => s + reaisParaCentavos(d.valor), 0n)
  if (somaDispensada > disponivel && disponivel >= 0n) {
    alertas.push({
      nivel: 'critico',
      titulo: 'Doação inoficiosa',
      texto: `As doações dispensadas de colação somam ${formatarCentavos(somaDispensada)} e ultrapassam a parte disponível de ${formatarCentavos(disponivel)}. A dispensa só vale nos limites do disponível; no excedente a doação é nula e o valor deve retornar para compor a legítima.`,
      fundamento: 'CC arts. 549, 2.005 e 2.007',
    })
  }

  if (colacionaveis.length === 0) return quotas

  const somaColacao = colacionaveis.reduce((s, d) => s + reaisParaCentavos(d.valor), 0n)
  const massa = paraLegitimos + somaColacao

  passos.push({
    titulo: 'Conferir as doações em vida (colação)',
    texto:
      'A doação de ascendente a descendente é adiantamento da legítima. O valor volta ao monte apenas para efeito de cálculo, a partilha é refeita sobre esse total e, ao final, cada donatário recebe descontado o que já havia recebido. É assim que a lei devolve a igualdade entre os filhos.',
    fundamento: 'CC arts. 544, 2.002 a 2.004',
    conta: `${formatarCentavos(paraLegitimos)} + ${formatarCentavos(somaColacao)} = ${formatarCentavos(massa)} (monte para conferência)`,
    destaque: 'chave',
  })

  const recebido = new Map<string, bigint>()
  for (const d of colacionaveis) {
    recebido.set(
      d.donatarioId,
      (recebido.get(d.donatarioId) ?? 0n) + reaisParaCentavos(d.valor),
    )
  }

  const herdeiros = quotas.filter((q) => q.tipo === 'heranca')
  const somaFracoes = Fracao.soma(herdeiros.map((q) => q.fracaoHeranca))
  if (somaFracoes.ehZero()) return quotas

  // Quinhão ideal sobre o monte conferido, menos o que já foi adiantado.
  const ideais = herdeiros.map((q) => {
    const parte = q.fracaoHeranca.dividido(somaFracoes)
    const ideal = (massa * parte.n) / parte.d
    const ja = recebido.get(q.id) ?? 0n
    return { quota: q, ideal, ja, liquido: ideal - ja }
  })

  const excedentes = ideais.filter((x) => x.liquido < 0n)
  for (const e of excedentes) {
    alertas.push({
      nivel: 'critico',
      titulo: `${e.quota.nome} recebeu mais do que a sua parte`,
      texto: `O adiantamento de ${formatarCentavos(e.ja)} supera o quinhão de ${formatarCentavos(e.ideal)} que lhe caberia. O excesso de ${formatarCentavos(-e.liquido)} sai da parte disponível se houver dispensa; não havendo, deve ser reposto ao monte em espécie ou em dinheiro.`,
      fundamento: 'CC arts. 2.003, parágrafo único, e 2.007',
    })
  }

  // Zera os negativos e redistribui o buraco entre quem ainda tem saldo.
  // Todo herdeiro conferido entra no mapa — inclusive quem ficou exatamente em
  // zero porque o adiantamento igualou o quinhão. Sem isso ele escaparia da
  // substituição adiante e conservaria o valor calculado antes da colação.
  const finais = new Map<string, bigint>(ideais.map((x) => [x.quota.id, 0n]))

  const positivos = ideais.filter((x) => x.liquido > 0n)
  const somaPositivos = positivos.reduce((s, x) => s + x.liquido, 0n)
  const somaNegativa = excedentes.reduce((s, x) => s + -x.liquido, 0n)

  if (somaPositivos > 0n) {
    const alvo = somaPositivos - min(somaNegativa, somaPositivos)
    const repartido = repartirCentavos(
      alvo,
      positivos.map((x) => new Fracao(x.liquido, somaPositivos)),
    )
    positivos.forEach((x, i) => finais.set(x.quota.id, repartido[i]))
  }

  const totalFinal = [...finais.values()].reduce((s, v) => s + v, 0n)

  return quotas.map((q) => {
    if (q.tipo !== 'heranca') return q
    const v = finais.get(q.id)
    if (v === undefined) return q
    const ja = recebido.get(q.id) ?? 0n
    return {
      ...q,
      valorCentavos: v,
      fracaoHeranca: totalFinal > 0n ? new Fracao(v, totalFinal) : Fracao.ZERO,
      observacao: ja > 0n
        ? `${q.observacao ? q.observacao + ' ' : ''}Já recebeu ${formatarCentavos(ja)} em doação, valor conferido e descontado do quinhão.`
        : q.observacao,
    }
  })
}

/* ================================================================== *
 * Avisos gerais
 * ================================================================== */

function reunirAlertasGerais(
  caso: Caso,
  classe: Classe,
  descartados: { nome: string; motivo: string }[],
  alertas: Alerta[],
) {
  for (const d of descartados) {
    alertas.push({ nivel: 'info', titulo: `${d.nome} não herda`, texto: d.motivo })
  }

  if (caso.conjuge.existe && caso.conjuge.vinculo === 'uniao_estavel') {
    alertas.push({
      nivel: 'info',
      titulo: 'União estável equiparada ao casamento',
      texto:
        'O art. 1.790, que dava ao companheiro tratamento inferior, foi declarado inconstitucional pelo STF em repercussão geral. Aplica-se à união estável o mesmo art. 1.829 do casamento — foi o que fizemos aqui. Não havendo contrato escrito, presume-se a comunhão parcial.',
      fundamento: 'STF RE 878.694 (Tema 809) e RE 646.721 (Tema 498); CC art. 1.725',
    })
  }

  if (
    caso.conjuge.existe &&
    caso.conjuge.regime === 'separacao_obrigatoria' &&
    caso.conjuge.sumula377
  ) {
    alertas.push({
      nivel: 'atencao',
      titulo: 'Súmula 377 aplicada aos aquestos',
      texto:
        'Na separação obrigatória, a Súmula 377 do STF comunica os bens adquiridos na constância. O STJ presume o esforço comum, mas o ponto ainda gera litígio e a prova em contrário pode afastar a meação.',
      fundamento: 'Súmula 377/STF; STJ EREsp 1.623.858/MG',
    })
  }

  if (classe === 'descendentes') {
    const temComoriente = caso.descendentes.some((d) => d.situacao === 'comoriente')
    if (temComoriente) {
      alertas.push({
        nivel: 'atencao',
        titulo: 'Comoriência presumida',
        texto:
          'Não se podendo apurar quem morreu primeiro, presumem-se simultaneamente mortos. Um não herda do outro — mas os descendentes do comoriente o representam, exatamente como se pré-morto fosse.',
        fundamento: 'CC arts. 8º e 1.851',
      })
    }
  }

  alertas.push({
    nivel: 'info',
    titulo: 'O que este cálculo não inclui',
    texto:
      'A partilha aqui apurada é a sucessão legítima em abstrato. Fora do cálculo ficam o ITCMD (alíquota estadual, de 1% a 8%), custas e honorários do inventário, bens impenhoráveis ou gravados, previdência privada (VGBL/PGBL, que em regra não integra a herança), seguro de vida (que vai ao beneficiário e não ao espólio), holding familiar e usufrutos já constituídos.',
  })
}

/* ================================================================== *
 * Auxiliares
 * ================================================================== */

function rotuloConjuge(caso: Caso): string {
  const base = caso.conjuge.vinculo === 'uniao_estavel' ? 'Companheiro(a)' : 'Cônjuge'
  return `${base} — ${REGIMES[caso.conjuge.regime].curto}`
}

function ordenarQuotas(a: Quota, b: Quota): number {
  const peso = (q: Quota) => (q.tipo === 'legado' ? 100 : (q.nivel ?? 50))
  const d = peso(a) - peso(b)
  if (d !== 0) return d
  return b.fracaoHeranca.compara(a.fracaoHeranca)
}

function montarResumo(caso: Caso, classe: Classe, quotas: Quota[]): string {
  const n = quotas.filter((q) => q.tipo === 'heranca').length
  const mapa: Record<Classe, string> = {
    descendentes: 'descendentes',
    ascendentes: 'ascendentes',
    conjuge: 'cônjuge',
    colaterais: 'colaterais',
    vacante: 'ninguém',
  }
  const conj = caso.conjuge.existe ? ` · ${REGIMES[caso.conjuge.regime].curto}` : ''
  return `${n} herdeiro${n === 1 ? '' : 's'} · classe: ${mapa[classe]}${conj}`
}

function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b
}

/** O cônjuge chegou a receber quinhão hereditário em alguma das sub-massas? */
function concorreuDeFato(a: Parte[], b: Parte[]): boolean {
  return a.some((p) => p.ehConjuge) || b.some((p) => p.ehConjuge)
}
