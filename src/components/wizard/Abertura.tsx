import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MODELOS, type Modelo } from '@/data/modelos'
import { useInventario } from '@/store/inventario'
import { Selo } from '@/components/ui/primitivos'
import {
  IconeBalanca,
  IconeElo,
  IconeLupa,
  IconeRecomecar,
  IconeSeta,
} from '@/components/ui/icones'

type Passo = 'escolha' | 'modelos'

/**
 * A porta de entrada.
 *
 * Abrir uma calculadora de herança já preenchida com nomes de pessoas é um
 * mau começo: quem chega não sabe se aquilo é exemplo ou dado real, e quem
 * volta não sabe se o caso guardado ainda está lá. Por isso a primeira coisa
 * que aparece é uma pergunta simples — de onde você quer partir? — e nada
 * mais.
 */
export function Abertura() {
  const { fase, temRascunho, comecarDoZero, continuarRascunho, carregarModelo } =
    useInventario()
  const [passo, setPasso] = useState<Passo>('escolha')

  if (fase !== 'abertura') return null

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[rgba(4,6,12,0.82)] p-4 backdrop-blur-md sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="vidro my-auto w-full max-w-4xl rounded-3xl shadow-[var(--sombra-alta)]"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {passo === 'escolha' ? (
            <motion.div
              key="escolha"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Escolha
                temRascunho={temRascunho}
                onZero={comecarDoZero}
                onContinuar={continuarRascunho}
                onModelos={() => setPasso('modelos')}
              />
            </motion.div>
          ) : (
            <motion.div
              key="modelos"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ListaModelos
                onVoltar={() => setPasso('escolha')}
                onEscolher={(id) => carregarModelo(id)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

/* ------------------------------ passo 1 ------------------------------ */

function Escolha({
  temRascunho,
  onZero,
  onContinuar,
  onModelos,
}: {
  temRascunho: boolean
  onZero: () => void
  onContinuar: () => void
  onModelos: () => void
}) {
  return (
    <div className="p-7 sm:p-9">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--ouro)_34%,transparent)] bg-[var(--ouro-fundo)] text-[var(--ouro)]">
        <IconeBalanca tamanho={24} />
      </span>

      <h2 className="titulo mt-5 text-[26px] leading-tight font-semibold">
        Por onde você quer começar?
      </h2>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--texto-2)]">
        Esta calculadora resolve desde a sucessão de uma única pessoa até o inventário
        cumulativo de vários falecidos ligados entre si — o casal que morre em sequência, o
        herdeiro que falece antes do fim do processo, a herança que sobe para os pais e desce
        de novo.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {temRascunho && (
          <Cartao
            destaque
            icone={<IconeSeta tamanho={19} />}
            titulo="Continuar de onde parei"
            texto="Retoma o processo que estava aberto neste navegador, com todos os óbitos e valores."
            acao="Retomar"
            onClick={onContinuar}
          />
        )}

        <Cartao
          destaque={!temRascunho}
          icone={<IconeRecomecar tamanho={19} />}
          titulo="Começar do zero"
          texto="Um processo em branco, sem nome nenhum preenchido. Você descreve a família e o patrimônio do seu caso."
          acao="Criar processo em branco"
          onClick={onZero}
        />

        <Cartao
          icone={<IconeElo tamanho={19} />}
          titulo="Partir de um modelo"
          texto="Vinte e dois casos prontos, dos mais corriqueiros aos que costumam derrubar quem responde de cabeça. Carregue um e ajuste ao seu."
          acao="Ver os modelos"
          onClick={onModelos}
        />
      </div>

      <p className="mt-6 text-[12px] leading-relaxed text-[var(--texto-3)]">
        Nada do que você digitar sai deste navegador: o cálculo roda inteiramente na sua
        máquina e o rascunho fica guardado apenas localmente.
      </p>
    </div>
  )
}

function Cartao({
  icone,
  titulo,
  texto,
  acao,
  onClick,
  destaque,
}: {
  icone: React.ReactNode
  titulo: string
  texto: string
  acao: string
  onClick: () => void
  destaque?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="group flex h-full flex-col rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--sombra)]"
      style={{
        borderColor: destaque
          ? 'color-mix(in srgb, var(--ouro) 42%, transparent)'
          : 'var(--border)',
        background: destaque ? 'var(--ouro-fundo)' : 'var(--surface)',
      }}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl border"
        style={{
          borderColor: destaque
            ? 'color-mix(in srgb, var(--ouro) 32%, transparent)'
            : 'var(--border)',
          color: destaque ? 'var(--ouro)' : 'var(--texto-2)',
        }}
      >
        {icone}
      </span>
      <h3 className="titulo mt-3 text-[16px] font-semibold">{titulo}</h3>
      <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-[var(--texto-3)]">{texto}</p>
      <span className="mt-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--ouro)]">
        {acao}
        <IconeSeta tamanho={13} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}

/* ------------------------------ passo 2 ------------------------------ */

function ListaModelos({
  onVoltar,
  onEscolher,
}: {
  onVoltar: () => void
  onEscolher: (id: string) => void
}) {
  const [busca, setBusca] = useState('')
  const termo = busca.trim().toLowerCase()
  const filtrar = (m: Modelo) =>
    !termo ||
    `${m.titulo} ${m.gancho} ${m.descricao} ${m.etiqueta}`.toLowerCase().includes(termo)

  const cumulativos = MODELOS.filter((m) => m.familia === 'cumulativo' && filtrar(m))
  const simples = MODELOS.filter((m) => m.familia === 'simples' && filtrar(m))

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] p-6 pb-5">
        <div className="min-w-0">
          <button
            onClick={onVoltar}
            className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--texto-3)] transition hover:text-[var(--ouro)]"
          >
            <IconeSeta tamanho={12} className="rotate-180" />
            voltar
          </button>
          <h2 className="titulo text-[24px] font-semibold">Escolha um modelo</h2>
          <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-[var(--texto-2)]">
            Carregue um caso, mexa nos dados e veja a partilha se refazer. Os nomes são letras
            avulsas de propósito — o que importa aqui é a estrutura da família.
          </p>
        </div>

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
      </div>

      <div className="max-h-[62vh] overflow-y-auto p-6">
        {cumulativos.length > 0 && (
          <Grupo
            titulo="Inventários cumulativos"
            subtitulo="Mais de um falecido no mesmo processo — CPC, art. 672"
            modelos={cumulativos}
            onEscolher={onEscolher}
          />
        )}
        {simples.length > 0 && (
          <Grupo
            titulo="Sucessão de uma pessoa"
            subtitulo="Um único óbito, do caso trivial ao mais capcioso"
            modelos={simples}
            onEscolher={onEscolher}
          />
        )}
        {cumulativos.length === 0 && simples.length === 0 && (
          <p className="py-10 text-center text-[13px] text-[var(--texto-3)]">
            Nenhum modelo corresponde a “{busca}”.
          </p>
        )}
      </div>
    </div>
  )
}

function Grupo({
  titulo,
  subtitulo,
  modelos,
  onEscolher,
}: {
  titulo: string
  subtitulo: string
  modelos: Modelo[]
  onEscolher: (id: string) => void
}) {
  return (
    <section className="mb-7 last:mb-0">
      <div className="mb-3">
        <h3 className="titulo text-[15px] font-semibold">{titulo}</h3>
        <p className="text-[12px] text-[var(--texto-3)]">{subtitulo}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modelos.map((m) => (
          <CartaoModelo key={m.id} modelo={m} onClick={() => onEscolher(m.id)} />
        ))}
      </div>
    </section>
  )
}

export function CartaoModelo({
  modelo,
  ativo,
  onClick,
}: {
  modelo: Modelo
  ativo?: boolean
  onClick: () => void
}) {
  const cumulativo = modelo.familia === 'cumulativo'
  return (
    <button
      onClick={onClick}
      className="group flex h-full flex-col rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--border-forte)] hover:shadow-[var(--sombra)]"
      style={{
        borderColor: ativo
          ? 'color-mix(in srgb, var(--ouro) 42%, transparent)'
          : 'var(--border)',
        background: ativo ? 'var(--ouro-fundo)' : 'var(--surface)',
      }}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <span className="flex h-9 min-w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-1.5 text-[15px]">
          {modelo.icone}
        </span>
        <Selo cor={cumulativo ? 'var(--c-conjuge)' : ativo ? 'var(--ouro)' : 'var(--texto-3)'}>
          {modelo.etiqueta}
        </Selo>
      </div>

      <h4 className="titulo text-[15px] leading-snug font-semibold">{modelo.titulo}</h4>
      <p className="mt-0.5 text-[12px] font-semibold text-[var(--ouro)]">{modelo.gancho}</p>
      <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-[var(--texto-3)]">
        {modelo.descricao}
      </p>

      <span className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--texto-3)] transition group-hover:text-[var(--ouro)]">
        {ativo ? 'Modelo carregado' : 'Carregar modelo'}
        <IconeSeta tamanho={13} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}

/* ------------------------ faixa do modelo carregado ------------------------ */

/** A lição do modelo em uso — o "porquê" do caso, logo abaixo do resumo. */
export function BannerModelo() {
  const modeloAtivo = useInventario((s) => s.modeloAtivo)
  const modelo = modeloAtivo ? MODELOS.find((m) => m.id === modeloAtivo) : undefined
  if (!modelo) return null

  return (
    <motion.div
      key={modelo.id}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-2xl border px-4 py-3.5"
      style={{
        borderColor: 'color-mix(in srgb, var(--ouro) 26%, transparent)',
        background: 'var(--ouro-fundo)',
      }}
    >
      <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--ouro)_28%,transparent)] px-1 text-[14px]">
        {modelo.icone}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-[var(--ouro)]">{modelo.gancho}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--texto-2)]">{modelo.licao}</p>
      </div>
    </motion.div>
  )
}
