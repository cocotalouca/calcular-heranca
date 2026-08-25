import type { Caso, Pessoa, Quota, Resultado, Situacao } from '@/engine/tipos'

export type Papel =
  | 'falecido'
  | 'conjuge'
  | 'descendente'
  | 'ascendente'
  | 'colateral'
  | 'legado'
  | 'municipio'

export interface NoVis {
  id: string
  nome: string
  papel: Papel
  qualificacao: string
  situacao: Situacao | null
  /** Coordenadas em unidades de grade; a conversão para pixels é do renderer. */
  x: number
  y: number
  quota?: Quota
  herdeiro: boolean
}

export interface ArestaVis {
  id: string
  de: { x: number; y: number }
  para: { x: number; y: number }
  tipo: 'filiacao' | 'uniao' | 'representacao'
  ativa: boolean
}

export interface Grafo {
  nos: NoVis[]
  arestas: ArestaVis[]
  limites: { minX: number; maxX: number; minY: number; maxY: number }
}

const ROW_ASC = 1.18 // altura de cada geração ascendente
const GAP_ASC = 0.98 // afastamento lateral entre ascendentes da mesma linha

/** Ponto logo acima do falecido onde nascem os vínculos de irmandade. */
const JUNCAO = (x: number) => ({ x, y: -0.5 })

/**
 * Dispõe toda a família num plano.
 *
 * O eixo vertical é a linha do tempo das gerações: ascendentes acima do
 * falecido, descendentes abaixo, colaterais ao lado. O eixo horizontal usa
 * o método clássico de árvores "arrumadas": folhas ocupam colunas
 * sequenciais e cada pai fica centrado sobre os seus filhos — assim os
 * ramos nunca se cruzam.
 */
export function montarGrafo(caso: Caso, resultado: Resultado): Grafo {
  const nos: NoVis[] = []
  const arestas: ArestaVis[] = []
  const porId = new Map(resultado.quotas.map((q) => [q.id, q]))
  const posicao = new Map<string, { x: number; y: number }>()

  /* ---------------- descendentes ---------------- */

  let coluna = 0
  const registrarDescendente = (p: Pessoa, nivel: number): number => {
    let x: number
    if (p.filhos.length === 0) {
      x = coluna
      coluna += 1
    } else {
      const xs = p.filhos.map((f) => registrarDescendente(f, nivel + 1))
      x = (xs[0] + xs[xs.length - 1]) / 2
    }
    const q = porId.get(p.id)
    nos.push({
      id: p.id,
      nome: p.nome,
      papel: 'descendente',
      qualificacao: q?.qualificacao ?? rotuloGeracao(nivel),
      situacao: p.situacao,
      x,
      y: nivel,
      quota: q,
      herdeiro: !!q,
    })
    posicao.set(p.id, { x, y: nivel })
    return x
  }

  for (const filho of caso.descendentes) registrarDescendente(filho, 1)

  const larguraDesc = coluna
  const centroDesc = larguraDesc > 0 ? (larguraDesc - 1) / 2 : 0

  // Recentraliza os descendentes em torno de zero.
  for (const no of nos) {
    if (no.papel === 'descendente') {
      no.x -= centroDesc
      posicao.set(no.id, { x: no.x, y: no.y })
    }
  }

  /* ---------------- o casal ---------------- */

  const temConjuge = caso.conjuge.existe
  const xFalecido = temConjuge ? -0.62 : 0
  const xConjuge = 0.62

  nos.push({
    id: '__falecido',
    nome: caso.nomeFalecido || 'Autor da herança',
    papel: 'falecido',
    qualificacao: 'Autor da herança',
    situacao: null,
    x: xFalecido,
    y: 0,
    herdeiro: false,
  })
  posicao.set('__falecido', { x: xFalecido, y: 0 })

  if (temConjuge) {
    const q = porId.get('conjuge')
    nos.push({
      id: 'conjuge',
      nome: caso.conjuge.nome || (caso.conjuge.vinculo === 'uniao_estavel' ? 'Companheiro(a)' : 'Cônjuge'),
      papel: 'conjuge',
      qualificacao:
        q?.qualificacao ??
        (caso.conjuge.vinculo === 'uniao_estavel' ? 'Companheiro(a)' : 'Cônjuge'),
      situacao: caso.conjuge.situacao,
      x: xConjuge,
      y: 0,
      quota: q,
      herdeiro: !!q,
    })
    posicao.set('conjuge', { x: xConjuge, y: 0 })
    arestas.push({
      id: 'uniao',
      de: { x: xFalecido, y: 0 },
      para: { x: xConjuge, y: 0 },
      tipo: 'uniao',
      ativa: !!q,
    })
  }

  /* ---------------- ligações de filiação ---------------- */

  // Os filhos de 1º grau descem do ponto médio do casal.
  const origemFilhos = { x: temConjuge ? 0 : xFalecido, y: 0 }
  for (const filho of caso.descendentes) {
    const p = posicao.get(filho.id)
    if (!p) continue
    arestas.push({
      id: `f-${filho.id}`,
      de: origemFilhos,
      para: p,
      tipo: 'filiacao',
      ativa: temHerdeiroAbaixo(filho, porId),
    })
    ligarDescendentes(filho, posicao, porId, arestas)
  }

  /* ---------------- ascendentes ---------------- */

  const linhas: { grau: number; paterna: string[]; materna: string[] }[] = [
    {
      grau: 1,
      paterna: caso.ascendentes.pai ? ['asc-1-paterna-0'] : [],
      materna: caso.ascendentes.mae ? ['asc-1-materna-0'] : [],
    },
    {
      grau: 2,
      paterna: ids('asc-2-paterna', caso.ascendentes.avosPaternos),
      materna: ids('asc-2-materna', caso.ascendentes.avosMaternos),
    },
    {
      grau: 3,
      paterna: ids('asc-3-paterna', caso.ascendentes.bisavosPaternos),
      materna: ids('asc-3-materna', caso.ascendentes.bisavosMaternos),
    },
  ]

  for (const linha of linhas) {
    const colocar = (lista: string[], lado: -1 | 1) => {
      lista.forEach((id, i) => {
        const x = xFalecido + lado * (0.62 + i * GAP_ASC)
        const y = -linha.grau * ROW_ASC
        const q = porId.get(id)
        nos.push({
          id,
          nome: q?.nome ?? nomeAscendente(linha.grau, lado, i, lista.length),
          papel: 'ascendente',
          qualificacao: q?.qualificacao ?? `Ascendente de ${linha.grau}º grau`,
          situacao: 'vivo',
          x,
          y,
          quota: q,
          herdeiro: !!q,
        })
        arestas.push({
          id: `a-${id}`,
          de: { x, y },
          para: { x: xFalecido, y: 0 },
          tipo: 'filiacao',
          ativa: !!q,
        })
      })
    }
    colocar(linha.paterna, -1)
    colocar(linha.materna, 1)
  }

  /* ---------------- colaterais ---------------- */

  const minAtual = nos.length > 0 ? Math.min(...nos.map((n) => n.x)) : 0
  let cursor = minAtual - 1.5

  const colaterais = caso.colaterais.irmaos
  if (colaterais.length > 0) {
    // Reserva um bloco à esquerda, com largura suficiente para os sobrinhos.
    const largura = colaterais.reduce(
      (s, i) => s + Math.max(1, i.filhos.length) * 1.02,
      0,
    )
    cursor = minAtual - 1.5 - largura
    let x = cursor

    for (const irmao of colaterais) {
      const nFilhos = irmao.filhos.length
      const largIrmao = Math.max(1, nFilhos) * 1.02
      const xIrmao = x + largIrmao / 2 - 0.51
      const q = porId.get(irmao.id)

      nos.push({
        id: irmao.id,
        nome: irmao.nome,
        papel: 'colateral',
        qualificacao:
          q?.qualificacao ??
          `Irmão(ã) ${irmao.vinculo}`,
        situacao: irmao.situacao,
        x: xIrmao,
        y: 0,
        quota: q,
        herdeiro: !!q,
      })
      // Irmãos não descendem do falecido: descendem dos mesmos pais. A linha
      // sobe até o ponto de junção acima dele, que é onde o parentesco nasce.
      arestas.push({
        id: `c-${irmao.id}`,
        de: { x: xIrmao, y: 0 },
        para: JUNCAO(xFalecido),
        tipo: 'filiacao',
        ativa: !!q,
      })

      irmao.filhos.forEach((s, i) => {
        const xs = x + i * 1.02 + 0.0
        const qs = porId.get(s.id)
        nos.push({
          id: s.id,
          nome: s.nome,
          papel: 'colateral',
          qualificacao: qs?.qualificacao ?? 'Sobrinho(a)',
          situacao: s.situacao,
          x: xs,
          y: 1,
          quota: qs,
          herdeiro: !!qs,
        })
        arestas.push({
          id: `cs-${s.id}`,
          de: { x: xIrmao, y: 0 },
          para: { x: xs, y: 1 },
          tipo: qs?.representando ? 'representacao' : 'filiacao',
          ativa: !!qs,
        })
      })

      x += largIrmao
    }
  }

  // Colaterais de 3º e 4º grau que não vêm de irmãos (tios, primos…).
  const avulsos = resultado.quotas.filter(
    (q) => q.id.startsWith('col-') && !nos.some((n) => n.id === q.id),
  )
  avulsos.forEach((q, i) => {
    const x = cursor - 1.4 - i * 1.05
    nos.push({
      id: q.id,
      nome: q.nome,
      papel: 'colateral',
      qualificacao: q.qualificacao,
      situacao: 'vivo',
      x,
      y: 0,
      quota: q,
      herdeiro: true,
    })
    arestas.push({
      id: `av-${q.id}`,
      de: { x, y: 0 },
      para: JUNCAO(xFalecido),
      tipo: 'filiacao',
      ativa: true,
    })
  })

  /* ---------------- legados e vacância ---------------- */

  const maxAtual = nos.length > 0 ? Math.max(...nos.map((n) => n.x)) : 0
  const especiais = resultado.quotas.filter(
    (q) => q.tipo === 'legado' || q.id === 'municipio',
  )
  especiais.forEach((q, i) => {
    const x = maxAtual + 1.5 + i * 1.05
    nos.push({
      id: q.id,
      nome: q.nome,
      papel: q.id === 'municipio' ? 'municipio' : 'legado',
      qualificacao: q.qualificacao,
      situacao: null,
      x,
      y: 1,
      quota: q,
      herdeiro: true,
    })
    arestas.push({
      id: `l-${q.id}`,
      de: { x: xFalecido, y: 0 },
      para: { x, y: 1 },
      tipo: 'filiacao',
      ativa: true,
    })
  })

  const xs = nos.map((n) => n.x)
  const ys = nos.map((n) => n.y)

  return {
    nos,
    arestas,
    limites: {
      minX: Math.min(...xs, 0),
      maxX: Math.max(...xs, 0),
      minY: Math.min(...ys, 0),
      maxY: Math.max(...ys, 0),
    },
  }
}

/* ------------------------------ auxiliares ------------------------------ */

function ligarDescendentes(
  p: Pessoa,
  posicao: Map<string, { x: number; y: number }>,
  porId: Map<string, Quota>,
  arestas: ArestaVis[],
) {
  const origem = posicao.get(p.id)
  if (!origem) return
  for (const filho of p.filhos) {
    const destino = posicao.get(filho.id)
    if (!destino) continue
    const q = porId.get(filho.id)
    arestas.push({
      id: `f-${filho.id}`,
      de: origem,
      para: destino,
      tipo: q?.representando ? 'representacao' : 'filiacao',
      ativa: temHerdeiroAbaixo(filho, porId),
    })
    ligarDescendentes(filho, posicao, porId, arestas)
  }
}

function temHerdeiroAbaixo(p: Pessoa, porId: Map<string, Quota>): boolean {
  if (porId.has(p.id)) return true
  return p.filhos.some((f) => temHerdeiroAbaixo(f, porId))
}

function ids(prefixo: string, n: number): string[] {
  return Array.from({ length: Math.max(0, Math.floor(n)) }, (_, i) => `${prefixo}-${i}`)
}

function nomeAscendente(grau: number, lado: -1 | 1, i: number, total: number): string {
  const base =
    grau === 1
      ? lado === -1
        ? 'Pai'
        : 'Mãe'
      : grau === 2
        ? `Avô/avó ${lado === -1 ? 'paterno(a)' : 'materno(a)'}`
        : `Bisavô/bisavó ${lado === -1 ? 'paterno(a)' : 'materno(a)'}`
  return total > 1 ? `${base} ${i + 1}` : base
}

function rotuloGeracao(nivel: number): string {
  return ['', 'Filho(a)', 'Neto(a)', 'Bisneto(a)', 'Trineto(a)'][nivel] ?? `${nivel}º grau`
}

export const COR_PAPEL: Record<Papel, string> = {
  falecido: 'var(--ouro)',
  conjuge: 'var(--c-conjuge)',
  descendente: 'var(--c-descendente)',
  ascendente: 'var(--c-ascendente)',
  colateral: 'var(--c-colateral)',
  legado: 'var(--c-legado)',
  municipio: 'var(--c-meacao)',
}
