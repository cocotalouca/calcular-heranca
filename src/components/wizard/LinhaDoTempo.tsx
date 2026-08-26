import { AnimatePresence, motion } from 'framer-motion'
import { useInventario } from '@/store/inventario'
import type { Caso, ResultadoCumulativo } from '@/engine/tipos'
import { formatarCompacto } from '@/lib/moeda'
import { Botao, Selo } from '@/components/ui/primitivos'
import {
  IconeCalendario,
  IconeElo,
  IconeFechar,
  IconeMais,
  IconeObito,
  IconeSetaBaixo,
  IconeSetaCima,
} from '@/components/ui/icones'

/**
 * A linha do tempo dos óbitos.
 *
 * A ordem aqui não é decorativa: ela É o dado. Quem morreu primeiro herdou de
 * ninguém; quem morreu depois pode ter herdado do anterior e transmitido o
 * que recebeu. Por isso os cartões vêm numerados, com a data à mostra e com
 * setas para reordenar — e por isso a interface avisa quando a ordem contradiz
 * a situação declarada de algum herdeiro.
 */
export function LinhaDoTempo({ resultado }: { resultado: ResultadoCumulativo }) {
  const {
    inventario,
    obitoAtivo,
    selecionarObito,
    adicionarObito,
    removerObito,
    moverObito,
    ordenarPorData,
    renomearProcesso,
  } = useInventario()

  const obitos = inventario.obitos
  const varios = obitos.length > 1
  const podeOrdenar = obitos.filter((o) => o.dataObito).length > 1

  return (
    <div className="cartao overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-4 pb-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--texto-2)]">
          <IconeObito tamanho={16} />
        </span>

        <div className="min-w-[180px] flex-1">
          <input
            value={inventario.titulo}
            onChange={(e) => renomearProcesso(e.target.value)}
            placeholder="Nome do processo (opcional)"
            className="titulo w-full bg-transparent text-[16px] font-semibold text-[var(--texto)] placeholder:font-normal placeholder:text-[var(--texto-3)] focus:outline-none"
          />
          <p className="text-[11.5px] text-[var(--texto-3)]">
            {varios
              ? `${obitos.length} sucessões cumuladas · a ordem abaixo é a ordem dos óbitos`
              : 'Uma sucessão. Acrescente outro falecido para cumular os inventários.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {podeOrdenar && (
            <Botao
              variante="fantasma"
              tamanho="sm"
              onClick={ordenarPorData}
              title="Reordenar os óbitos pela data informada"
            >
              <IconeCalendario tamanho={13} />
              <span className="hidden sm:inline">Ordenar por data</span>
            </Botao>
          )}
          <Botao variante="suave" tamanho="sm" onClick={adicionarObito}>
            <IconeMais tamanho={13} />
            Acrescentar falecido
          </Botao>
        </div>
      </div>

      <div className="flex gap-2.5 overflow-x-auto border-t border-[var(--border)] px-5 py-3.5">
        <AnimatePresence initial={false}>
          {obitos.map((obito, i) => (
            <CartaoObito
              key={obito.id}
              obito={obito}
              indice={i}
              total={obitos.length}
              ativo={obito.id === obitoAtivo}
              resultado={resultado}
              onSelecionar={() => selecionarObito(obito.id)}
              onRemover={() => removerObito(obito.id)}
              onMover={(d) => moverObito(obito.id, d)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function CartaoObito({
  obito,
  indice,
  total,
  ativo,
  resultado,
  onSelecionar,
  onRemover,
  onMover,
}: {
  obito: Caso
  indice: number
  total: number
  ativo: boolean
  resultado: ResultadoCumulativo
  onSelecionar: () => void
  onRemover: () => void
  onMover: (direcao: -1 | 1) => void
}) {
  const etapa = resultado.etapas.find((e) => e.original.id === obito.id)
  const recebeu = etapa ? etapa.aportes.reduce((s, a) => s + a.centavos, 0n) : 0n
  const liquida = etapa?.resultado.massa.herancaLiquidaCentavos ?? 0n
  const problemas = resultado.alertas.filter(
    (a) => a.obitoId === obito.id && a.nivel === 'critico',
  ).length

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="relative min-w-[212px] shrink-0 rounded-2xl border transition-colors"
      style={{
        borderColor: ativo
          ? 'color-mix(in srgb, var(--ouro) 45%, transparent)'
          : 'var(--border)',
        background: ativo ? 'var(--ouro-fundo)' : 'var(--surface)',
      }}
    >
      <button onClick={onSelecionar} className="w-full px-3.5 pt-3 pb-2.5 text-left">
        <div className="flex items-center gap-2">
          <span
            className="num flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10.5px] font-bold"
            style={{
              background: ativo ? 'var(--ouro)' : 'var(--surface-3)',
              color: ativo ? 'var(--ouro-contraste)' : 'var(--texto-3)',
            }}
          >
            {indice + 1}
          </span>
          <span className="titulo min-w-0 flex-1 truncate text-[14px] font-semibold">
            {obito.nomeFalecido || <span className="text-[var(--texto-3)]">Sem nome</span>}
          </span>
          {problemas > 0 && <Selo cor="var(--perigo)">{problemas}</Selo>}
        </div>

        <p className="mt-1 truncate text-[11.5px] text-[var(--texto-3)]">
          {obito.parentesco || (obito.dataObito ? formatarDataCurta(obito.dataObito) : 'sem data')}
        </p>

        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="num text-[14px] font-bold text-[var(--ouro)]">
            {formatarCompacto(liquida)}
          </span>
          <span className="text-[10.5px] text-[var(--texto-3)]">a partilhar</span>
        </div>

        {recebeu > 0n && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[var(--c-conjuge)]">
            <IconeElo tamanho={11} />
            recebeu {formatarCompacto(recebeu)} da sucessão anterior
          </p>
        )}
      </button>

      <div className="flex items-center gap-0.5 border-t border-[var(--border)] px-2 py-1">
        <BotaoMini
          titulo="Mover para antes"
          desativado={indice === 0}
          onClick={() => onMover(-1)}
        >
          <IconeSetaCima tamanho={12} />
        </BotaoMini>
        <BotaoMini
          titulo="Mover para depois"
          desativado={indice === total - 1}
          onClick={() => onMover(1)}
        >
          <IconeSetaBaixo tamanho={12} />
        </BotaoMini>
        <span className="flex-1" />
        <BotaoMini
          titulo="Remover este falecido do processo"
          desativado={total <= 1}
          perigo
          onClick={onRemover}
        >
          <IconeFechar tamanho={12} />
        </BotaoMini>
      </div>
    </motion.div>
  )
}

function BotaoMini({
  children,
  titulo,
  onClick,
  desativado,
  perigo,
}: {
  children: React.ReactNode
  titulo: string
  onClick: () => void
  desativado?: boolean
  perigo?: boolean
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      disabled={desativado}
      onClick={onClick}
      className={`flex h-6 w-6 items-center justify-center rounded-md text-[var(--texto-3)] transition disabled:opacity-25 ${
        perigo
          ? 'hover:bg-[color-mix(in_srgb,var(--perigo)_14%,transparent)] hover:text-[var(--perigo)]'
          : 'hover:bg-[var(--surface-2)] hover:text-[var(--texto)]'
      }`}
    >
      {children}
    </button>
  )
}

function formatarDataCurta(iso: string): string {
  const [a, m, d] = iso.split('-')
  if (!a || !m || !d) return iso
  return `óbito em ${d}/${m}/${a}`
}
