import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Papel, QuinhaoConsolidado, ResultadoCumulativo } from '@/engine/tipos'
import { formatarCentavos } from '@/lib/moeda'
import { Selo, Vazio } from '@/components/ui/primitivos'
import { IconeAlvo, IconeElo } from '@/components/ui/icones'
import { corDoPapel } from './cores'

const ROTULO_PAPEL: Record<Papel, string> = {
  conjuge: 'Cônjuge / companheiro(a)',
  descendente: 'Descendente',
  ascendente: 'Ascendente',
  colateral: 'Colateral',
  legado: 'Beneficiário de testamento',
  municipio: 'Município — herança vacante',
  falecido: 'Autor da herança',
}

/**
 * Onde o dinheiro para.
 *
 * Num inventário cumulativo, olhar cada sucessão isoladamente engana: um
 * herdeiro pode aparecer com quinhão gordo no primeiro óbito e não levar nada
 * para casa, porque também faleceu e o valor apenas atravessou o espólio dele.
 * Este painel responde à única pergunta que o cliente faz — quanto sobra para
 * mim, somando tudo? — e mostra por quais sucessões cada real passou.
 */
export function PainelConsolidado({
  resultado,
  onIrParaObito,
}: {
  resultado: ResultadoCumulativo
  onIrParaObito: (obitoId: string) => void
}) {
  const { consolidado, totalConsolidadoCentavos, fundamentos } = resultado

  if (consolidado.length === 0) {
    return (
      <Vazio
        icone={<IconeAlvo tamanho={20} />}
        titulo="Ainda não há valores a consolidar"
        texto="Descreva o patrimônio e a família de cada falecido para ver quanto cada pessoa recebe ao final de todas as sucessões."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="rotulo-mini">Total que chega aos beneficiários finais</p>
          <p className="titulo num mt-1 text-[clamp(24px,3.6vw,34px)] font-semibold text-[var(--ouro)]">
            {formatarCentavos(totalConsolidadoCentavos)}
          </p>
        </div>
        <p className="max-w-md text-[12.5px] leading-relaxed text-[var(--texto-3)]">
          Somadas todas as sucessões e descontado o que apenas atravessou o espólio de quem
          também faleceu.
        </p>
      </div>

      <FaixaConsolidada quinhoes={consolidado} />

      <div className="space-y-2">
        {consolidado.map((q, i) => (
          <CartaoPessoa
            key={q.id}
            quinhao={q}
            indice={i}
            total={totalConsolidadoCentavos}
            onIrParaObito={onIrParaObito}
          />
        ))}
      </div>

      {fundamentos.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="rotulo-mini mb-2.5">Por que estes inventários podem ser cumulados</p>
          <div className="space-y-3">
            {fundamentos.map((f) => (
              <div key={f.inciso} className="flex items-start gap-2.5">
                <span className="mt-[3px] shrink-0 text-[var(--ouro)]">
                  <IconeElo tamanho={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-[var(--ouro)]">{f.inciso}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--texto-2)]">
                    {f.texto}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------------------- faixa proporcional ---------------------------- */

function FaixaConsolidada({ quinhoes }: { quinhoes: QuinhaoConsolidado[] }) {
  const visiveis = quinhoes.filter((q) => q.totalCentavos > 0n)
  if (visiveis.length === 0) return null

  return (
    <div className="flex h-11 w-full gap-[3px]">
      {visiveis.map((q) => {
        const cor = corDoPapel(q.papel)
        return (
          <div
            key={q.id}
            title={`${q.nome} — ${formatarCentavos(q.totalCentavos)}`}
            className="flex min-w-[4px] flex-col items-center justify-center overflow-hidden rounded-lg px-1"
            style={{
              flexGrow: Number(q.totalCentavos),
              flexBasis: 0,
              background: `color-mix(in srgb, ${cor} var(--faixa), transparent)`,
            }}
          >
            <span className="max-w-full truncate text-[10.5px] leading-tight font-bold text-[#0b0f19]">
              {q.nome}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* -------------------------------- cartões -------------------------------- */

function CartaoPessoa({
  quinhao,
  indice,
  total,
  onIrParaObito,
}: {
  quinhao: QuinhaoConsolidado
  indice: number
  total: bigint
  onIrParaObito: (obitoId: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  const cor = corDoPapel(quinhao.papel)
  const pct = total > 0n ? Number(quinhao.totalCentavos) / Number(total) : 0
  const varias = quinhao.origens.length > 1

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(indice * 0.035, 0.3) }}
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: aberto ? `color-mix(in srgb, ${cor} 48%, transparent)` : 'var(--border)',
        background: aberto ? `color-mix(in srgb, ${cor} 7%, var(--surface))` : 'var(--surface)',
      }}
    >
      <div className="flex items-stretch">
        <div className="w-[3px] shrink-0" style={{ background: cor }} />
        <button
          onClick={() => setAberto((a) => !a)}
          className="min-w-0 flex-1 px-4 py-3 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px] font-bold">
                {quinhao.nome}
                {varias && (
                  <Selo cor="var(--c-conjuge)">
                    {quinhao.origens.length} sucessões
                  </Selo>
                )}
                {quinhao.pendente && <Selo cor="var(--perigo)">destino em aberto</Selo>}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--texto-3)]">
                {ROTULO_PAPEL[quinhao.papel]}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="num text-[15.5px] font-bold" style={{ color: cor }}>
                {formatarCentavos(quinhao.totalCentavos)}
              </p>
              <p className="num mt-0.5 text-[11.5px] text-[var(--texto-3)]">
                {(pct * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do total
              </p>
            </div>
          </div>

          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: cor }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, pct * 100)}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-[var(--border)] px-4 py-3">
              {quinhao.pendente && (
                <p className="rounded-xl border border-[color-mix(in_srgb,var(--perigo)_26%,transparent)] bg-[color-mix(in_srgb,var(--perigo)_7%,transparent)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--texto-2)]">
                  {quinhao.pendente}
                </p>
              )}

              {quinhao.origens.map((o, k) => (
                <button
                  key={`${o.obitoId}-${k}`}
                  onClick={() => onIrParaObito(o.obitoId)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left transition hover:border-[var(--border-forte)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold text-[var(--texto-2)]">
                      Sucessão de {o.obitoNome}
                    </p>
                    <p className="mt-0.5 truncate text-[11.5px] text-[var(--texto-3)]">
                      {o.tipo === 'meacao'
                        ? 'Meação — direito próprio, não é herança'
                        : `${o.qualificacao} · ${o.fracao.paraTexto()} da herança`}
                      {o.representando ? ` · representa ${o.representando}` : ''}
                    </p>
                  </div>
                  <span className="num shrink-0 text-[13px] font-bold text-[var(--texto)]">
                    {formatarCentavos(o.centavos)}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
