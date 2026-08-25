import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CENARIOS, cenarioPorId } from '@/data/cenarios'
import { useCaso } from '@/store/caso'
import { Selo } from '@/components/ui/primitivos'
import { IconeFechar, IconeLupa, IconeSeta } from '@/components/ui/icones'

export function GaleriaCenarios({ aberta, onFechar }: { aberta: boolean; onFechar: () => void }) {
  const { cenarioAtivo, carregarCenario } = useCaso()
  const [busca, setBusca] = useState('')

  const termo = busca.trim().toLowerCase()
  const lista = termo
    ? CENARIOS.filter((c) =>
        `${c.titulo} ${c.gancho} ${c.descricao} ${c.etiqueta}`.toLowerCase().includes(termo),
      )
    : CENARIOS

  return (
    <AnimatePresence>
      {aberta && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onFechar}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(4,6,12,0.7)] p-4 backdrop-blur-sm sm:p-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="vidro my-auto w-full max-w-5xl rounded-3xl shadow-[var(--sombra-alta)]"
          >
            {/* ------------------------------ cabeçalho ------------------------------ */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] p-6 pb-5">
              <div className="min-w-0">
                <h2 className="titulo text-[24px] font-semibold">Casos para começar</h2>
                <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-[var(--texto-2)]">
                  Situações reais, das mais corriqueiras às que costumam derrubar quem responde de
                  cabeça. Carregue uma, mexa nos dados e veja a partilha se refazer.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <IconeLupa
                    tamanho={15}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--texto-3)]"
                  />
                  <input
                    autoFocus
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar caso…"
                    className="w-44 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pr-3 pl-9 text-[13px] transition placeholder:text-[var(--texto-3)] focus:border-[var(--ouro)] focus:outline-none sm:w-56"
                  />
                </div>
                <button
                  onClick={onFechar}
                  aria-label="Fechar"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--texto-2)] transition hover:border-[var(--border-forte)] hover:text-[var(--texto)]"
                >
                  <IconeFechar tamanho={16} />
                </button>
              </div>
            </div>

            {/* -------------------------------- grade -------------------------------- */}
            <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
              {lista.map((c, i) => {
                const ativo = cenarioAtivo === c.id
                return (
                  <motion.button
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    onClick={() => {
                      carregarCenario(c.id)
                      onFechar()
                    }}
                    className="group flex h-full flex-col rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--border-forte)] hover:shadow-[var(--sombra)]"
                    style={{
                      borderColor: ativo
                        ? 'color-mix(in srgb, var(--ouro) 42%, transparent)'
                        : 'var(--border)',
                      background: ativo ? 'var(--ouro-fundo)' : 'var(--surface)',
                    }}
                  >
                    <div className="mb-2.5 flex items-start justify-between gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[17px]">
                        {c.icone}
                      </span>
                      <Selo cor={ativo ? 'var(--ouro)' : 'var(--texto-3)'}>{c.etiqueta}</Selo>
                    </div>

                    <h3 className="titulo text-[15.5px] leading-snug font-semibold">{c.titulo}</h3>
                    <p className="mt-0.5 text-[12px] font-semibold text-[var(--ouro)]">
                      {c.gancho}
                    </p>
                    <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-[var(--texto-3)]">
                      {c.descricao}
                    </p>

                    <span className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--texto-3)] transition group-hover:text-[var(--ouro)]">
                      {ativo ? 'Caso carregado' : 'Carregar caso'}
                      <IconeSeta
                        tamanho={13}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </motion.button>
                )
              })}

              {lista.length === 0 && (
                <p className="col-span-full py-10 text-center text-[13px] text-[var(--texto-3)]">
                  Nenhum caso corresponde a “{busca}”.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Faixa com a lição do cenário carregado — o "porquê" do caso. */
export function BannerLicao() {
  const cenarioAtivo = useCaso((s) => s.cenarioAtivo)
  const cen = cenarioAtivo ? cenarioPorId(cenarioAtivo) : undefined
  if (!cen) return null

  return (
    <motion.div
      key={cen.id}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-2xl border px-4 py-3.5"
      style={{
        borderColor: 'color-mix(in srgb, var(--ouro) 26%, transparent)',
        background: 'var(--ouro-fundo)',
      }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--ouro)_28%,transparent)] text-[16px]">
        {cen.icone}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-[var(--ouro)]">{cen.gancho}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--texto-2)]">{cen.licao}</p>
      </div>
    </motion.div>
  )
}
