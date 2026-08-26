import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { Caso, Resultado, Situacao } from '@/engine/tipos'
import { ROTULO_SITUACAO } from '@/engine/tipos'
import { formatarCompacto } from '@/lib/moeda'
import { IconeEnquadrar, IconeMais, IconeMenos } from '@/components/ui/icones'
import { Ponto } from '@/components/ui/primitivos'
import { COR_PAPEL, montarGrafo, type ArestaVis, type NoVis } from './layout'

const GX = 178
const GY = 138
const W = 152
const H = 66

interface Vista {
  escala: number
  dx: number
  dy: number
}

export function ArvoreFamiliar({
  caso,
  resultado,
  selecionado,
  onSelecionar,
}: {
  caso: Caso
  resultado: Resultado
  selecionado: string | null
  onSelecionar: (id: string | null) => void
}) {
  const grafo = useMemo(() => montarGrafo(caso, resultado), [caso, resultado])
  const container = useRef<HTMLDivElement>(null)
  const [vista, setVista] = useState<Vista>({ escala: 1, dx: 0, dy: 0 })
  const arrasto = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null)

  const caixa = useMemo(() => {
    const { minX, maxX, minY, maxY } = grafo.limites
    const pad = 90
    return {
      x: minX * GX - W / 2 - pad,
      y: minY * GY - H / 2 - pad,
      largura: (maxX - minX) * GX + W + pad * 2,
      altura: (maxY - minY) * GY + H + pad * 2,
    }
  }, [grafo.limites])

  // Reenquadra sempre que a família muda de forma.
  useEffect(() => {
    setVista({ escala: 1, dx: 0, dy: 0 })
  }, [caixa.largura, caixa.altura])

  // A roda do mouse aproxima em vez de rolar a página — e isso só é possível
  // com um listener não passivo, que o React não oferece via onWheel.
  useEffect(() => {
    const el = container.current
    if (!el) return
    const aoRolar = (e: WheelEvent) => {
      e.preventDefault()
      setVista((v) => ({
        ...v,
        escala: Math.min(2.6, Math.max(0.35, v.escala * (e.deltaY > 0 ? 0.9 : 1.1))),
      }))
    }
    el.addEventListener('wheel', aoRolar, { passive: false })
    return () => el.removeEventListener('wheel', aoRolar)
  }, [])

  return (
    <div className="flex h-full w-full flex-col">
      <div ref={container} className="relative min-h-0 flex-1 overflow-hidden">
      <div
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          arrasto.current = { x: e.clientX, y: e.clientY, dx: vista.dx, dy: vista.dy }
        }}
        onPointerMove={(e) => {
          if (!arrasto.current) return
          const a = arrasto.current
          setVista((v) => ({
            ...v,
            dx: a.dx + (e.clientX - a.x),
            dy: a.dy + (e.clientY - a.y),
          }))
        }}
        onPointerUp={() => {
          arrasto.current = null
        }}
        onPointerLeave={() => {
          arrasto.current = null
        }}
      >
        <svg
          viewBox={`${caixa.x} ${caixa.y} ${caixa.largura} ${caixa.altura}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="malha" width="34" height="34" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="var(--border)" />
            </pattern>
            <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="7" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect
            x={caixa.x}
            y={caixa.y}
            width={caixa.largura}
            height={caixa.altura}
            fill="url(#malha)"
            opacity={0.5}
          />

          <g
            transform={`translate(${vista.dx} ${vista.dy}) scale(${vista.escala})`}
            style={{ transformOrigin: 'center' }}
          >
            <g>
              {grafo.arestas.map((a) => (
                <Aresta key={a.id} aresta={a} />
              ))}
            </g>
            <g>
              {grafo.nos.map((no, i) => (
                <No
                  key={no.id}
                  no={no}
                  indice={i}
                  ativo={selecionado === no.id}
                  esmaecido={selecionado !== null && selecionado !== no.id}
                  onClick={() => onSelecionar(selecionado === no.id ? null : no.id)}
                />
              ))}
            </g>
          </g>
        </svg>
      </div>

        <Controles vista={vista} setVista={setVista} />
      </div>

      <Legenda />
    </div>
  )
}

/* ------------------------------ arestas ------------------------------ */

function Aresta({ aresta }: { aresta: ArestaVis }) {
  const x1 = aresta.de.x * GX
  const y1 = aresta.de.y * GY
  const x2 = aresta.para.x * GX
  const y2 = aresta.para.y * GY

  let d: string
  if (aresta.tipo === 'uniao') {
    d = `M ${x1 + W / 2} ${y1} L ${x2 - W / 2} ${y2}`
  } else {
    // Curva em S: sai pela base do nó de cima e entra pelo topo do de baixo.
    const descendo = y2 > y1
    const sy1 = y1 + (descendo ? H / 2 : -H / 2)
    const sy2 = y2 + (descendo ? -H / 2 : H / 2)
    const meio = (sy1 + sy2) / 2
    d = `M ${x1} ${sy1} C ${x1} ${meio}, ${x2} ${meio}, ${x2} ${sy2}`
  }

  const cor = aresta.ativa ? 'var(--ouro)' : 'var(--border-forte)'

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={cor}
        strokeWidth={aresta.ativa ? 1.7 : 1.2}
        opacity={aresta.ativa ? 0.55 : 0.32}
        strokeLinecap="round"
      />
      {aresta.ativa && (
        <path
          d={d}
          fill="none"
          stroke={aresta.tipo === 'representacao' ? 'var(--c-descendente)' : 'var(--ouro-claro)'}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="5 19"
          opacity={0.85}
          style={{ animation: 'fluxo 1.4s linear infinite' }}
        />
      )}
    </g>
  )
}

/* -------------------------------- nós -------------------------------- */

const MARCA_SITUACAO: Partial<Record<Situacao, string>> = {
  pre_morto: '†',
  pos_morto: '⧖',
  comoriente: '†',
  renunciante: '↩',
  indigno: '⊘',
  deserdado: '⊘',
}

function No({
  no,
  indice,
  ativo,
  esmaecido,
  onClick,
}: {
  no: NoVis
  indice: number
  ativo: boolean
  esmaecido: boolean
  onClick: () => void
}) {
  const cor = COR_PAPEL[no.papel]
  const foraDaPartilha = !no.herdeiro && no.papel !== 'falecido'
  const marca = no.situacao ? MARCA_SITUACAO[no.situacao] : undefined
  // Quem morreu ANTES nao herdou e aparece riscado. Quem morreu DEPOIS herdou:
  // o quinhao dele existe e apenas segue para outro inventario.
  const riscado = no.situacao === 'pre_morto' || no.situacao === 'comoriente'
  const transmite = no.situacao === 'pos_morto'
  const x = no.x * GX - W / 2
  const y = no.y * GY - H / 2

  return (
    <motion.g
      initial={{ opacity: 0, y: y + 12 }}
      animate={{ opacity: esmaecido ? 0.32 : 1, y }}
      transition={{ delay: Math.min(indice * 0.022, 0.5), type: 'spring', stiffness: 220, damping: 26 }}
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <g transform={`translate(${x} 0)`}>
        {(no.herdeiro || no.papel === 'falecido') && (
          <rect
            width={W}
            height={H}
            rx={14}
            fill={cor}
            opacity={ativo ? 0.28 : 0.14}
            filter={ativo ? 'url(#glow)' : undefined}
          />
        )}
        <rect
          width={W}
          height={H}
          rx={14}
          fill="var(--ink-700)"
          fillOpacity={0.92}
          stroke={foraDaPartilha ? 'var(--c-fora)' : cor}
          strokeWidth={ativo ? 2.2 : no.papel === 'falecido' ? 1.8 : 1.4}
          strokeDasharray={foraDaPartilha ? '5 4' : undefined}
        />

        {/* faixa lateral com a cor da classe */}
        {!foraDaPartilha && (
          <rect x={0} y={12} width={3.5} height={H - 24} rx={2} fill={cor} />
        )}

        <text
          x={14}
          y={24}
          fill={foraDaPartilha ? 'var(--texto-3)' : 'var(--texto)'}
          fontSize="13.5"
          fontWeight="600"
          style={{ textDecoration: riscado ? 'line-through' : undefined }}
        >
          {cortar(no.nome, 18)}
        </text>
        <text x={14} y={40} fill="var(--texto-3)" fontSize="10.5">
          {cortar(no.qualificacao, 27)}
        </text>

        {no.quota ? (
          <>
            <text x={14} y={56} fill={cor} fontSize="12" fontWeight="700">
              {no.quota.fracaoHeranca.paraTexto()}
            </text>
            <text
              x={W - 12}
              y={56}
              textAnchor="end"
              fill="var(--texto-2)"
              fontSize="10.5"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatarCompacto(no.quota.valorCentavos)}
            </text>
          </>
        ) : (
          no.papel !== 'falecido' && (
            <text x={14} y={56} fill="var(--c-fora)" fontSize="10.5">
              {marca && no.situacao
                ? ROTULO_SITUACAO[no.situacao]
                : 'não herda'}
            </text>
          )
        )}

        {marca && (
          <g transform={`translate(${W - 22} 16)`}>
            <circle r="10" fill="var(--ink-800)" stroke="var(--c-fora)" strokeWidth="1" />
            <text
              textAnchor="middle"
              dy="4"
              fontSize="11"
              fill="var(--texto-2)"
            >
              {marca}
            </text>
          </g>
        )}

        {(no.obitoLigado || transmite) && (
          <g transform={`translate(${W - 20} ${H - 13})`}>
            <rect
              x={-34}
              y={-8}
              width={48}
              height={16}
              rx={8}
              fill="var(--ink-800)"
              stroke={no.obitoLigado ? 'var(--c-conjuge)' : 'var(--aviso)'}
              strokeWidth="1"
            />
            <text
              x={-10}
              textAnchor="middle"
              dy="3.5"
              fontSize="8.5"
              fontWeight="700"
              fill={no.obitoLigado ? 'var(--c-conjuge)' : 'var(--aviso)'}
            >
              {no.obitoLigado ? 'transmite' : 'sem inv.'}
            </text>
          </g>
        )}

        {no.papel === 'falecido' && (
          <g transform={`translate(${W - 22} 16)`}>
            <circle r="10.5" fill="var(--ouro-fundo)" stroke="var(--ouro)" strokeWidth="1" />
            <text textAnchor="middle" dy="4" fontSize="10" fill="var(--ouro)">
              ✳
            </text>
          </g>
        )}
      </g>
    </motion.g>
  )
}

function cortar(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

/* ------------------------------ controles ------------------------------ */

function Controles({
  vista,
  setVista,
}: {
  vista: Vista
  setVista: (v: Vista | ((v: Vista) => Vista)) => void
}) {
  const botao =
    'flex h-8 w-8 items-center justify-center rounded-lg text-[var(--texto-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--texto)]'
  return (
    <div className="vidro absolute top-3 right-3 flex items-center gap-0.5 rounded-xl p-1 shadow-[var(--sombra)]">
      <button
        className={botao}
        title="Afastar"
        onClick={() => setVista((v) => ({ ...v, escala: Math.max(0.35, v.escala * 0.85) }))}
      >
        <IconeMenos tamanho={15} />
      </button>
      <span className="num w-11 text-center text-[11px] text-[var(--texto-3)]">
        {Math.round(vista.escala * 100)}%
      </span>
      <button
        className={botao}
        title="Aproximar"
        onClick={() => setVista((v) => ({ ...v, escala: Math.min(2.6, v.escala * 1.15) }))}
      >
        <IconeMais tamanho={15} />
      </button>
      <span className="mx-0.5 h-4 w-px bg-[var(--border)]" />
      <button
        className={botao}
        title="Reenquadrar"
        onClick={() => setVista({ escala: 1, dx: 0, dy: 0 })}
      >
        <IconeEnquadrar tamanho={15} />
      </button>
    </div>
  )
}

function Legenda() {
  const itens: { cor: string; rotulo: string }[] = [
    { cor: 'var(--ouro)', rotulo: 'Autor da herança' },
    { cor: 'var(--c-conjuge)', rotulo: 'Cônjuge' },
    { cor: 'var(--c-descendente)', rotulo: 'Descendentes' },
    { cor: 'var(--c-ascendente)', rotulo: 'Ascendentes' },
    { cor: 'var(--c-colateral)', rotulo: 'Colaterais' },
    { cor: 'var(--c-fora)', rotulo: 'Fora da partilha' },
    { cor: 'var(--c-conjuge)', rotulo: 'Herdou e transmite (inventario cumulado)' },
  ]
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--border)] px-4 py-2.5">
      {itens.map((i) => (
        <span
          key={i.rotulo}
          className="flex items-center gap-1.5 text-[11px] text-[var(--texto-3)]"
        >
          <Ponto cor={i.cor} tamanho={7} />
          {i.rotulo}
        </span>
      ))}
    </div>
  )
}
