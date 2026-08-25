import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Quota, Resultado } from '@/engine/tipos'
import { formatarCentavos } from '@/lib/moeda'
import { Botao, Selo, Vazio } from '@/components/ui/primitivos'
import { IconeCheck, IconeCopiar, IconeDescendentes } from '@/components/ui/icones'
import { corDaQuota } from './cores'

export function PainelPartilha({
  resultado,
  selecionado,
  onSelecionar,
  onCopiar,
  copiado,
  onAbrirGaleria,
}: {
  resultado: Resultado
  selecionado: string | null
  onSelecionar: (id: string | null) => void
  onCopiar: () => void
  copiado: boolean
  onAbrirGaleria: () => void
}) {
  const { massa, quotas, meacao } = resultado

  if (quotas.length === 0) {
    return (
      <Vazio
        icone={<IconeDescendentes tamanho={20} />}
        titulo="Nenhum herdeiro chamado"
        texto="Descreva a família no formulário — ou carregue um caso de exemplo — para ver a partilha se montar."
        acao={
          <Botao variante="primario" onClick={onAbrirGaleria}>
            Ver casos de exemplo
          </Botao>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* ------------------------- faixa de partilha ------------------------- */}
      {massa.herancaLiquidaCentavos > 0n && (
        <FaixaPartilha quotas={quotas} selecionado={selecionado} onSelecionar={onSelecionar} />
      )}

      <div className="flex items-center justify-between gap-3">
        <h4 className="titulo text-[16px] font-semibold">Quinhão de cada herdeiro</h4>
        <Botao variante="fantasma" tamanho="sm" onClick={onCopiar}>
          {copiado ? <IconeCheck tamanho={14} /> : <IconeCopiar tamanho={14} />}
          {copiado ? 'Copiado' : 'Copiar resumo'}
        </Botao>
      </div>

      <div className="space-y-2">
        {meacao && (
          <CartaoMeacao
            nome={meacao.nome}
            valor={meacao.valorCentavos}
            texto={meacao.explicacao}
          />
        )}

        {quotas.map((q, i) => (
          <CartaoQuota
            key={q.id}
            quota={q}
            indice={i}
            aberto={selecionado === q.id}
            onToggle={() => onSelecionar(selecionado === q.id ? null : q.id)}
          />
        ))}
      </div>

      <p className="text-[11.5px] text-[var(--texto-3)]">
        Clique num herdeiro para ver o fundamento legal do quinhão e destacá-lo na árvore.
      </p>
    </div>
  )
}

/* --------------------------- faixa de partilha --------------------------- */

function FaixaPartilha({
  quotas,
  selecionado,
  onSelecionar,
}: {
  quotas: Quota[]
  selecionado: string | null
  onSelecionar: (id: string | null) => void
}) {
  const visiveis = quotas.filter((q) => q.fracaoHeranca.paraNumero() > 0.0001)
  if (visiveis.length === 0) return null

  return (
    <div className="flex h-12 w-full gap-[3px]">
      {visiveis.map((q) => {
        const cor = corDaQuota(q)
        const pct = q.fracaoHeranca.paraNumero() * 100
        const ativo = selecionado === q.id
        return (
          <motion.button
            key={q.id}
            layout
            onClick={() => onSelecionar(ativo ? null : q.id)}
            title={`${q.nome} — ${q.fracaoHeranca.paraPercentual(2)}`}
            className="group relative flex min-w-[4px] flex-col items-center justify-center overflow-hidden rounded-lg transition-all"
            style={{
              flexGrow: pct,
              flexBasis: 0,
              background: `color-mix(in srgb, ${cor} var(${ativo ? '--faixa-ativa' : '--faixa'}), transparent)`,
              outline: ativo ? `2px solid ${cor}` : 'none',
              outlineOffset: '2px',
            }}
            animate={{ opacity: selecionado && !ativo ? 0.4 : 1 }}
          >
            {pct > 8 && (
              <span className="num px-1 text-[11.5px] leading-tight font-bold text-[#0b0f19]">
                {q.fracaoHeranca.paraTexto()}
              </span>
            )}
            {pct > 15 && (
              <span className="max-w-full truncate px-1.5 text-[10px] leading-tight font-semibold text-[#0b0f19]">
                {q.nome}
              </span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

/* ------------------------------ cartões ------------------------------ */

function CartaoMeacao({ nome, valor, texto }: { nome: string; valor: bigint; texto: string }) {
  const [aberto, setAberto] = useState(false)
  return (
    <button
      onClick={() => setAberto((a) => !a)}
      className="w-full rounded-2xl border border-dashed border-[var(--border-forte)] bg-[var(--surface)] px-4 py-3 text-left transition hover:border-[var(--c-meacao)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
            {nome}
            <Selo cor="var(--c-meacao)">meação · não é herança</Selo>
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--texto-3)]">
            Direito próprio decorrente do regime de bens
          </p>
        </div>
        <p className="num shrink-0 text-[15px] font-bold text-[var(--c-meacao)]">
          {formatarCentavos(valor)}
        </p>
      </div>
      <AnimatePresence>
        {aberto && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden text-[12.5px] leading-relaxed text-[var(--texto-2)]"
          >
            <span className="mt-2 block">{texto}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </button>
  )
}

function CartaoQuota({
  quota,
  indice,
  aberto,
  onToggle,
}: {
  quota: Quota
  indice: number
  aberto: boolean
  onToggle: () => void
}) {
  const cor = corDaQuota(quota)
  const pct = quota.fracaoHeranca.paraNumero()

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(indice * 0.035, 0.35) }}
      onClick={onToggle}
      className="w-full overflow-hidden rounded-2xl border text-left transition hover:bg-[var(--surface-2)]"
      style={{
        borderColor: aberto ? `color-mix(in srgb, ${cor} 48%, transparent)` : 'var(--border)',
        background: aberto
          ? `color-mix(in srgb, ${cor} 7%, var(--surface))`
          : 'var(--surface)',
      }}
    >
      <div className="flex items-stretch">
        <div className="w-[3px] shrink-0" style={{ background: cor }} />
        <div className="min-w-0 flex-1 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px] font-bold">
                {quota.nome}
                {quota.representando && (
                  <Selo cor="var(--c-descendente)">representa {quota.representando}</Selo>
                )}
                {quota.tipo === 'legado' && <Selo cor="var(--c-legado)">testamento</Selo>}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--texto-3)]">{quota.qualificacao}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="num text-[15.5px] font-bold" style={{ color: cor }}>
                {formatarCentavos(quota.valorCentavos)}
              </p>
              <p className="num mt-0.5 text-[11.5px] text-[var(--texto-3)]">
                {quota.fracaoHeranca.paraTexto()} · {quota.fracaoHeranca.paraPercentual(2)}
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

          <AnimatePresence>
            {aberto && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
                  {quota.observacao && (
                    <p className="text-[12.5px] leading-relaxed text-[var(--texto-2)]">
                      {quota.observacao}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {quota.fundamento.map((f) => (
                      <Selo key={f} cor="var(--ouro)">
                        {f}
                      </Selo>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.button>
  )
}
