import { AnimatePresence, motion } from 'framer-motion'
import type { Pessoa, Situacao } from '@/engine/tipos'
import { ROTULO_SITUACAO } from '@/engine/tipos'
import { Botao, CampoTexto, Selecao, Selo } from '@/components/ui/primitivos'
import { IconeCheck, IconeFechar, IconeMais } from '@/components/ui/icones'

const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: 'vivo', rotulo: 'Vivo(a)' },
  { valor: 'pre_morto', rotulo: 'Faleceu antes' },
  { valor: 'comoriente', rotulo: 'Morreu junto (comoriência)' },
  { valor: 'renunciante', rotulo: 'Renunciou à herança' },
  { valor: 'indigno', rotulo: 'Excluído por indignidade' },
  { valor: 'deserdado', rotulo: 'Deserdado(a)' },
]

const COR_SITUACAO: Partial<Record<Situacao, string>> = {
  pre_morto: 'var(--c-fora)',
  comoriente: 'var(--c-fora)',
  renunciante: 'var(--aviso)',
  indigno: 'var(--perigo)',
  deserdado: 'var(--perigo)',
}

/**
 * Editor recursivo de uma linha de descendência.
 *
 * A profundidade importa: só faz sentido acrescentar filhos a alguém que não
 * herda (pré-morto, comoriente, excluído), porque é exatamente aí que a
 * representação entra em cena. Quando o herdeiro está vivo, os filhos dele
 * ficam fora da partilha e o editor avisa.
 */
export function EditorPessoas({
  pessoas,
  nivel = 1,
  rotuloNivel,
  mostrarVinculoConjuge,
  nomeConjuge,
  onAlterar,
  onRemover,
  onAdicionarFilho,
}: {
  pessoas: Pessoa[]
  nivel?: number
  rotuloNivel: (n: number) => string
  mostrarVinculoConjuge?: boolean
  nomeConjuge?: string
  onAlterar: (id: string, mut: (p: Pessoa) => void) => void
  onRemover: (id: string) => void
  onAdicionarFilho: (id: string) => void
}) {
  return (
    <div className={nivel > 1 ? 'mt-2 space-y-2 border-l border-[var(--border)] pl-3' : 'space-y-2'}>
      <AnimatePresence initial={false}>
        {pessoas.map((p) => {
          const podeRepresentar = p.situacao !== 'vivo' && p.situacao !== 'renunciante'
          const inerte = p.situacao === 'vivo' && p.filhos.length > 0

          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-[10.5px] font-medium tracking-wide text-[var(--texto-3)] uppercase">
                    {rotuloNivel(nivel)}
                  </span>
                  <CampoTexto
                    valor={p.nome}
                    onChange={(v) => onAlterar(p.id, (x) => void (x.nome = v))}
                    placeholder="Nome"
                    className="!py-1.5 !text-[13px]"
                  />
                  <button
                    onClick={() => onRemover(p.id)}
                    title="Remover"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--texto-3)] transition hover:bg-[color-mix(in_srgb,var(--perigo)_14%,transparent)] hover:text-[var(--perigo)]"
                  >
                    <IconeFechar tamanho={14} />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="min-w-[190px] flex-1">
                    <Selecao
                      valor={p.situacao}
                      onChange={(v) => onAlterar(p.id, (x) => void (x.situacao = v))}
                      opcoes={SITUACOES}
                    />
                  </div>

                  {p.situacao !== 'vivo' && (
                    <Selo cor={COR_SITUACAO[p.situacao] ?? 'var(--c-fora)'}>
                      {ROTULO_SITUACAO[p.situacao]}
                    </Selo>
                  )}

                  <Botao
                    tamanho="sm"
                    variante="fantasma"
                    onClick={() => onAdicionarFilho(p.id)}
                    title="Acrescentar um descendente desta pessoa"
                  >
                    <IconeMais tamanho={13} />
                    {rotuloNivel(nivel + 1).toLowerCase()}
                  </Botao>
                </div>

                {mostrarVinculoConjuge && nivel === 1 && (
                  <button
                    onClick={() =>
                      onAlterar(p.id, (x) => void (x.filhoDoConjuge = !x.filhoDoConjuge))
                    }
                    className="mt-2 flex w-full items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-left text-[12px] transition hover:bg-[var(--surface-2)]"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border text-[10px] ${
                        p.filhoDoConjuge
                          ? 'border-[var(--c-conjuge)] bg-[var(--c-conjuge)] text-[#0d1220]'
                          : 'border-[var(--border-forte)] text-transparent'
                      }`}
                    >
                      <IconeCheck tamanho={11} />
                    </span>
                    <span className={p.filhoDoConjuge ? 'text-[var(--texto-2)]' : 'text-[var(--texto-3)]'}>
                      Também é filho(a) de {nomeConjuge || 'cônjuge sobrevivente'}
                    </span>
                  </button>
                )}

                {p.situacao === 'renunciante' && p.filhos.length > 0 && (
                  <p className="mt-2 rounded-lg bg-[color-mix(in_srgb,var(--aviso)_10%,transparent)] px-2.5 py-1.5 text-[11.5px] leading-snug text-[var(--texto-2)]">
                    Ninguém sucede representando renunciante. Estes descendentes só entram se
                    todos os herdeiros da classe também renunciarem — e aí por cabeça (art. 1.811).
                  </p>
                )}

                {inerte && (
                  <p className="mt-2 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-[11.5px] leading-snug text-[var(--texto-3)]">
                    Como {p.nome || 'esta pessoa'} está viva e herda, sua descendência fica fora da
                    partilha. Ela só apareceria por representação.
                  </p>
                )}

                {podeRepresentar && p.filhos.length === 0 && (
                  <p className="mt-2 text-[11.5px] leading-snug text-[var(--texto-3)]">
                    Sem descendentes, esta estirpe se extingue e a parte acresce aos co-herdeiros.
                  </p>
                )}
              </div>

              {p.filhos.length > 0 && (
                <EditorPessoas
                  pessoas={p.filhos}
                  nivel={nivel + 1}
                  rotuloNivel={rotuloNivel}
                  onAlterar={onAlterar}
                  onRemover={onRemover}
                  onAdicionarFilho={onAdicionarFilho}
                />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export const ROTULO_DESCENDENTE = (n: number) =>
  ['', 'Filho', 'Neto', 'Bisneto', 'Trineto', 'Tataraneto'][n] ?? `${n}º grau`

export const ROTULO_COLATERAL = (n: number) =>
  ['', 'Irmão', 'Sobrinho', 'Sobrinho-neto'][n] ?? `${n}º grau`
