import { useId, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconeChevron, IconeMais, IconeMenos } from './icones'

/* ------------------------------ Botão ------------------------------ */

type VarianteBotao = 'primario' | 'suave' | 'contorno' | 'fantasma' | 'perigo'

const ESTILO_BOTAO: Record<VarianteBotao, string> = {
  primario:
    'bg-[var(--ouro)] text-[var(--ouro-contraste)] font-semibold shadow-[var(--sombra-ouro)] hover:brightness-110',
  suave:
    'bg-[var(--surface-2)] text-[var(--texto)] border border-[var(--border)] hover:bg-[var(--surface-3)] hover:border-[var(--border-forte)]',
  contorno:
    'border border-dashed border-[var(--border-forte)] text-[var(--texto-2)] hover:border-[var(--ouro)] hover:text-[var(--ouro)] hover:bg-[var(--ouro-fundo)]',
  fantasma: 'text-[var(--texto-2)] hover:text-[var(--texto)] hover:bg-[var(--surface-2)]',
  perigo: 'text-[var(--perigo)] hover:bg-[color-mix(in_srgb,var(--perigo)_13%,transparent)]',
}

export function Botao({
  children,
  onClick,
  variante = 'suave',
  tamanho = 'md',
  className = '',
  disabled,
  title,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variante?: VarianteBotao
  tamanho?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
  title?: string
  type?: 'button' | 'submit'
}) {
  const tam =
    tamanho === 'sm'
      ? 'text-[12.5px] px-2.5 py-1.5 gap-1.5 rounded-lg'
      : tamanho === 'lg'
        ? 'text-[15px] px-5 py-3 gap-2 rounded-xl'
        : 'text-[13.5px] px-3.5 py-2 gap-2 rounded-xl'
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center justify-center font-medium transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${ESTILO_BOTAO[variante]} ${tam} ${className}`}
    >
      {children}
    </button>
  )
}

/* ------------------------------ Campos ------------------------------ */

export function Rotulo({ children, dica }: { children: ReactNode; dica?: string }) {
  return (
    <span className="rotulo-mini mb-1.5 flex items-center gap-1.5">
      {children}
      {dica && <Dica texto={dica} />}
    </span>
  )
}

const CAMPO =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[14px] text-[var(--texto)] transition placeholder:text-[var(--texto-3)] hover:border-[var(--border-forte)] focus:border-[var(--ouro)] focus:bg-[var(--surface-2)] focus:outline-none'

export function CampoTexto({
  valor,
  onChange,
  placeholder,
  className = '',
}: {
  valor: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <input
      value={valor}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${CAMPO} px-3 py-2.5 ${className}`}
    />
  )
}

/** Campo monetário: aceita digitação livre e formata ao sair. */
export function CampoValor({
  valor,
  onChange,
  placeholder = '0,00',
}: {
  valor: number
  onChange: (v: number) => void
  placeholder?: string
}) {
  const [rascunho, setRascunho] = useState<string | null>(null)
  const exibido =
    rascunho ??
    (valor > 0
      ? valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '')

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[12px] font-semibold text-[var(--texto-3)]">
        R$
      </span>
      <input
        inputMode="decimal"
        value={exibido}
        placeholder={placeholder}
        onChange={(e) => {
          setRascunho(e.target.value)
          const limpo = e.target.value
            .replace(/[^\d.,]/g, '')
            .replace(/\.(?=\d{3}(\D|$))/g, '')
            .replace(',', '.')
          const n = Number.parseFloat(limpo)
          onChange(Number.isFinite(n) && n > 0 ? n : 0)
        }}
        onBlur={() => setRascunho(null)}
        className={`${CAMPO} num py-2.5 pr-3 pl-9 font-medium`}
      />
    </div>
  )
}

export function Selecao<T extends string>({
  valor,
  onChange,
  opcoes,
}: {
  valor: T
  onChange: (v: T) => void
  opcoes: { valor: T; rotulo: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value as T)}
        className={`${CAMPO} cursor-pointer appearance-none py-2.5 pr-9 pl-3`}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor} className="bg-[var(--ink-700)]">
            {o.rotulo}
          </option>
        ))}
      </select>
      <IconeChevron
        tamanho={15}
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[var(--texto-3)]"
      />
    </div>
  )
}

export function Interruptor({
  ligado,
  onChange,
  rotulo,
  descricao,
}: {
  ligado: boolean
  onChange: (v: boolean) => void
  rotulo: ReactNode
  descricao?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      onClick={() => onChange(!ligado)}
      className="group flex w-full items-start gap-3 rounded-xl border px-2.5 py-2.5 text-left transition"
      style={{
        borderColor: ligado ? 'color-mix(in srgb, var(--ouro) 28%, transparent)' : 'transparent',
        background: ligado ? 'var(--ouro-fundo)' : 'transparent',
      }}
    >
      <span
        className={`mt-0.5 flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-[3px] transition-colors ${
          ligado ? 'bg-[var(--ouro)]' : 'bg-[var(--surface-3)]'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 620, damping: 34 }}
          className={`h-4 w-4 rounded-full shadow ${
            ligado ? 'ml-auto bg-[var(--ouro-contraste)]' : 'bg-[var(--texto-3)]'
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] leading-snug font-medium text-[var(--texto)]">
          {rotulo}
        </span>
        {descricao && (
          <span className="mt-1 block text-[12px] leading-snug text-[var(--texto-3)]">
            {descricao}
          </span>
        )}
      </span>
    </button>
  )
}

export function Contador({
  valor,
  onChange,
  min = 0,
  max = 12,
  rotulo,
}: {
  valor: number
  onChange: (v: number) => void
  min?: number
  max?: number
  rotulo: string
}) {
  const passo =
    'flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--texto-2)] transition hover:bg-[var(--surface-3)] hover:text-[var(--texto)] disabled:opacity-25'
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition"
      style={{
        borderColor: valor > 0 ? 'color-mix(in srgb, var(--ouro) 24%, transparent)' : 'var(--border)',
        background: valor > 0 ? 'var(--ouro-fundo)' : 'var(--surface)',
      }}
    >
      <span className="text-[13px] text-[var(--texto-2)]">{rotulo}</span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          title="Diminuir"
          onClick={() => onChange(Math.max(min, valor - 1))}
          disabled={valor <= min}
          className={passo}
        >
          <IconeMenos tamanho={14} />
        </button>
        <span className="num w-5 text-center text-[14px] font-bold">{valor}</span>
        <button
          type="button"
          title="Aumentar"
          onClick={() => onChange(Math.min(max, valor + 1))}
          disabled={valor >= max}
          className={passo}
        >
          <IconeMais tamanho={14} />
        </button>
      </span>
    </div>
  )
}

/* ------------------------------ Selo ------------------------------ */

export function Selo({
  children,
  cor = 'var(--texto-3)',
  className = '',
}: {
  children: ReactNode
  cor?: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[10.5px] font-semibold tracking-wide whitespace-nowrap ${className}`}
      style={{
        color: cor,
        borderColor: `color-mix(in srgb, ${cor} 30%, transparent)`,
        background: `color-mix(in srgb, ${cor} 11%, transparent)`,
      }}
    >
      {children}
    </span>
  )
}

/** Bolinha da cor da classe — usada nas legendas e nos cabeçalhos. */
export function Ponto({ cor, tamanho = 8 }: { cor: string; tamanho?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ background: cor, width: tamanho, height: tamanho }}
    />
  )
}

/* ------------------------------ Dica ------------------------------ */

export function Dica({ texto }: { texto: string }) {
  const [aberto, setAberto] = useState(false)
  const id = useId()
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-describedby={id}
        aria-label="Explicação"
        onMouseEnter={() => setAberto(true)}
        onMouseLeave={() => setAberto(false)}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
        onClick={() => setAberto((a) => !a)}
        className="flex h-[15px] w-[15px] items-center justify-center rounded-full border border-[var(--border-forte)] text-[9.5px] leading-none font-bold text-[var(--texto-3)] transition hover:border-[var(--ouro)] hover:bg-[var(--ouro-fundo)] hover:text-[var(--ouro)]"
      >
        ?
      </button>
      <AnimatePresence>
        {aberto && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="vidro absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-2xl p-3 text-[12px] leading-relaxed font-normal tracking-normal normal-case shadow-[var(--sombra-alta)]"
            style={{ color: 'var(--texto-2)' }}
          >
            {texto}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

/* ------------------------------ Abas ------------------------------ */

export function Abas<T extends string>({
  valor,
  onChange,
  itens,
}: {
  valor: T
  onChange: (v: T) => void
  itens: { valor: T; rotulo: string; contagem?: number }[]
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1">
      {itens.map((i) => {
        const ativo = i.valor === valor
        return (
          <button
            key={i.valor}
            type="button"
            onClick={() => onChange(i.valor)}
            className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[13px] font-semibold transition ${
              ativo ? 'text-[var(--texto)]' : 'text-[var(--texto-3)] hover:text-[var(--texto-2)]'
            }`}
          >
            {ativo && (
              <motion.span
                layoutId="aba-ativa"
                transition={{ type: 'spring', stiffness: 480, damping: 40 }}
                className="absolute inset-0 rounded-xl border border-[var(--border-forte)] bg-[var(--surface-2)] shadow-[var(--sombra)]"
              />
            )}
            <span className="relative">{i.rotulo}</span>
            {i.contagem !== undefined && i.contagem > 0 && (
              <span className="num relative rounded-full bg-[var(--ouro-fundo)] px-1.5 text-[10.5px] font-bold text-[var(--ouro)]">
                {i.contagem}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------ Vazio ------------------------------ */

export function Vazio({
  icone,
  titulo,
  texto,
  acao,
}: {
  icone: ReactNode
  titulo: string
  texto: string
  acao?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--texto-3)]">
        {icone}
      </span>
      <p className="titulo text-[16px] font-semibold text-[var(--texto-2)]">{titulo}</p>
      <p className="max-w-sm text-[13px] leading-relaxed text-[var(--texto-3)]">{texto}</p>
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}
