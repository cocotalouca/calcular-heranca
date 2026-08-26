import { motion } from 'framer-motion'
import type { Resultado } from '@/engine/tipos'
import { formatarCentavos } from '@/lib/moeda'
import { Dica, Ponto } from '@/components/ui/primitivos'

interface Fatia {
  chave: string
  rotulo: string
  valor: bigint
  cor: string
  dica?: string
  forte?: boolean
}

/**
 * O caminho do dinheiro, em duas barras.
 *
 * A primeira mostra como o acervo apurado vira herança: o que sai como
 * meação, o que sai para pagar dívidas e o que sobra para partilhar. A
 * segunda parte a herança em legítima e disponível. É a pergunta que todo
 * mundo faz primeiro — "sobre quanto, afinal, se está discutindo?".
 */
export function ResumoHeranca({ resultado }: { resultado: Resultado }) {
  const { massa, meacao, quotas } = resultado
  const acervo = massa.bensComunsCentavos + massa.bensParticularesCentavos
  const liquida = massa.herancaLiquidaCentavos

  const composicao: Fatia[] = [
    ...(meacao && meacao.valorCentavos > 0n
      ? [
          {
            chave: 'meacao',
            rotulo: 'Meação',
            valor: meacao.valorCentavos,
            cor: 'var(--c-meacao)',
            dica: `Metade da massa comum já pertence a ${meacao.nome} por direito próprio. Sai antes da partilha e não é herança.`,
          },
        ]
      : []),
    ...(massa.dividasCentavos > 0n
      ? [
          {
            chave: 'dividas',
            rotulo: 'Dívidas e funeral',
            valor: massa.dividasCentavos,
            cor: 'var(--perigo)',
            dica: 'Só se partilha o líquido: dívidas do espólio e despesas de funeral saem antes (arts. 1.847 e 1.997).',
          },
        ]
      : []),
    {
      chave: 'heranca',
      rotulo: 'Herança',
      valor: liquida,
      cor: 'var(--ouro)',
      forte: true,
    },
  ]

  const reparticao: Fatia[] = massa.temHerdeirosNecessarios
    ? [
        {
          chave: 'legitima',
          rotulo: 'Legítima',
          valor: massa.legitimaCentavos,
          cor: 'var(--c-descendente)',
          dica: 'Metade intocável da herança, reservada por lei aos herdeiros necessários — descendentes, ascendentes e cônjuge (art. 1.846).',
        },
        {
          chave: 'disponivel',
          rotulo: 'Parte disponível',
          valor: massa.disponivelCentavos,
          cor: 'var(--c-legado)',
          dica: 'A metade de que o falecido podia dispor livremente em testamento ou em doação dispensada de colação.',
        },
      ]
    : [
        {
          chave: 'disponivel',
          rotulo: 'Livre disposição',
          valor: massa.disponivelCentavos,
          cor: 'var(--c-legado)',
          dica: 'Sem herdeiros necessários, toda a herança podia ser destinada por testamento.',
        },
      ]

  const herdeiros = quotas.filter((q) => q.valorCentavos > 0n).length

  return (
    <div className="cartao overflow-hidden">
      {/* ---------------------------- número-chave ---------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-5 pt-5 pb-4">
        <div>
          <p className="rotulo-mini">Herança a partilhar</p>
          <p className="titulo num mt-1 text-[clamp(28px,4.4vw,40px)] font-semibold text-[var(--ouro)]">
            {formatarCentavos(liquida)}
          </p>
          <p className="mt-1 text-[12.5px] text-[var(--texto-3)]">
            de um acervo de{' '}
            <span className="num font-semibold text-[var(--texto-2)]">
              {formatarCentavos(acervo)}
            </span>
          </p>
        </div>

        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="rotulo-mini">Classe chamada</span>
          <span className="titulo text-[17px] font-semibold">{resultado.classeLabel}</span>
          <span className="text-[12.5px] text-[var(--texto-3)]">
            {herdeiros === 0
              ? 'nenhum herdeiro'
              : herdeiros === 1
                ? '1 quinhão'
                : `${herdeiros} quinhões`}
          </span>
        </div>
      </div>

      {/* ----------------------------- as barras ----------------------------- */}
      <div className="space-y-4 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4">
        <Composicao titulo="De onde vem" fatias={composicao} total={acervo} />
        {liquida > 0n && (
          <Composicao titulo="Como se divide" fatias={reparticao} total={liquida} />
        )}
      </div>
    </div>
  )
}

/* --------------------------- barra de composição --------------------------- */

function Composicao({
  titulo,
  fatias,
  total,
}: {
  titulo: string
  fatias: Fatia[]
  total: bigint
}) {
  const visiveis = fatias.filter((f) => f.valor > 0n)
  if (total <= 0n || visiveis.length === 0) {
    return (
      <div>
        <p className="rotulo-mini mb-1.5">{titulo}</p>
        <div className="h-2.5 w-full rounded-full border border-dashed border-[var(--border-forte)]" />
        <p className="mt-1.5 text-[12px] text-[var(--texto-3)]">
          Informe o patrimônio no formulário para ver os valores.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="rotulo-mini mb-1.5">{titulo}</p>

      <div className="flex h-2.5 w-full gap-[3px] overflow-hidden">
        {visiveis.map((f) => (
          <motion.span
            key={f.chave}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'spring', stiffness: 140, damping: 24 }}
            title={`${f.rotulo} — ${formatarCentavos(f.valor)}`}
            className="min-w-[6px] rounded-full"
            style={{
              flexGrow: Number(f.valor),
              flexBasis: 0,
              background: f.cor,
              opacity: f.forte ? 1 : 0.6,
            }}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
        {visiveis.map((f) => (
          <span key={f.chave} className="flex items-center gap-1.5">
            <Ponto cor={f.cor} />
            <span className="text-[12px] text-[var(--texto-3)]">{f.rotulo}</span>
            {f.dica && <Dica texto={f.dica} />}
            <span
              className="num text-[12.5px] font-semibold"
              style={{ color: f.forte ? f.cor : 'var(--texto-2)' }}
            >
              {formatarCentavos(f.valor)}
            </span>
            <span className="num text-[11px] text-[var(--texto-3)]">
              {porcentagem(f.valor, total)}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function porcentagem(parte: bigint, total: bigint): string {
  if (total <= 0n) return ''
  const pct = (Number(parte) / Number(total)) * 100
  return `${pct.toLocaleString('pt-BR', { maximumFractionDigits: pct < 10 ? 1 : 0 })}%`
}
