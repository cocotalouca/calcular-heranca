import { motion } from 'framer-motion'
import type { Alerta, Resultado } from '@/engine/tipos'
import { Selo, Vazio } from '@/components/ui/primitivos'
import { IconeBalanca, IconeCheck } from '@/components/ui/icones'

export function PainelPassos({ resultado }: { resultado: Resultado }) {
  if (resultado.passos.length === 0) {
    return (
      <Vazio
        icone={<IconeBalanca tamanho={20} />}
        titulo="Nada a explicar ainda"
        texto="Assim que houver um patrimônio e uma família descritos, o raciocínio aparece aqui, passo a passo."
      />
    )
  }

  return (
    <ol className="relative space-y-3 pl-7">
      {/* trilho vertical ligando os passos */}
      <span className="absolute top-2 bottom-2 left-[11px] w-px bg-[var(--border)]" />

      {resultado.passos.map((p, i) => (
        <motion.li
          key={`${p.titulo}-${i}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: Math.min(i * 0.05, 0.4) }}
          className="relative"
        >
          <span
            className="absolute top-[3px] -left-7 flex h-[23px] w-[23px] items-center justify-center rounded-full border text-[11px] font-bold"
            style={{
              borderColor:
                p.destaque === 'chave' ? 'var(--ouro)' : 'var(--border-forte)',
              background:
                p.destaque === 'chave' ? 'var(--ouro-fundo)' : 'var(--ink-700)',
              color: p.destaque === 'chave' ? 'var(--ouro)' : 'var(--texto-3)',
            }}
          >
            {i + 1}
          </span>

          <div
            className="rounded-2xl border px-4 py-3"
            style={{
              borderColor:
                p.destaque === 'chave'
                  ? 'color-mix(in srgb, var(--ouro) 26%, transparent)'
                  : 'var(--border)',
              background:
                p.destaque === 'chave' ? 'var(--ouro-fundo)' : 'var(--surface)',
            }}
          >
            <h4 className="titulo text-[15px] font-semibold">{p.titulo}</h4>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--texto-2)]">{p.texto}</p>

            {p.conta && (
              <p className="num mt-2.5 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--ink-900)_60%,transparent)] px-3 py-2 font-mono text-[12px] leading-relaxed text-[var(--ouro-claro)]">
                {p.conta}
              </p>
            )}

            {p.fundamento && (
              <p className="mt-2 text-[11.5px] text-[var(--texto-3)]">{p.fundamento}</p>
            )}
          </div>
        </motion.li>
      ))}
    </ol>
  )
}

/* ------------------------------ alertas ------------------------------ */

const TOM: Record<Alerta['nivel'], { cor: string; icone: string; rotulo: string }> = {
  info: { cor: 'var(--c-conjuge)', icone: 'ℹ', rotulo: 'nota' },
  atencao: { cor: 'var(--aviso)', icone: '▲', rotulo: 'atenção' },
  critico: { cor: 'var(--perigo)', icone: '●', rotulo: 'crítico' },
}

const ORDEM: Alerta['nivel'][] = ['critico', 'atencao', 'info']

export function PainelAlertas({ alertas }: { alertas: Alerta[] }) {
  const ordenados = [...alertas].sort(
    (a, b) => ORDEM.indexOf(a.nivel) - ORDEM.indexOf(b.nivel),
  )

  if (ordenados.length === 0) {
    return <Vazio icone={<IconeCheck tamanho={20} />} titulo="Nenhuma ressalva" texto="Nada de anômalo neste caso." />
  }

  return (
    <div className="space-y-2.5">
      {ordenados.map((a, i) => {
        const t = TOM[a.nivel]
        return (
          <motion.div
            key={`${a.titulo}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
            className="rounded-2xl border px-4 py-3"
            style={{
              borderColor: `color-mix(in srgb, ${t.cor} 26%, transparent)`,
              background: `color-mix(in srgb, ${t.cor} 7%, transparent)`,
            }}
          >
            <div className="flex items-start gap-2.5">
              <span
                className="mt-[2px] text-[11px] leading-5"
                style={{ color: t.cor }}
                aria-hidden
              >
                {t.icone}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
                  {a.titulo}
                  <Selo cor={t.cor}>{t.rotulo}</Selo>
                  {a.obitoNome && <Selo cor="var(--texto-3)">{a.obitoNome}</Selo>}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--texto-2)]">{a.texto}</p>
                {a.fundamento && (
                  <p className="mt-1.5 text-[11.5px] text-[var(--texto-3)]">{a.fundamento}</p>
                )}
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
