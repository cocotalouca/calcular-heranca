import { AnimatePresence, motion } from 'framer-motion'
import type { Pessoa, Situacao } from '@/engine/tipos'
import { ROTULO_SITUACAO } from '@/engine/tipos'
import { Botao, CampoTexto, Selecao, Selo } from '@/components/ui/primitivos'
import { IconeAmpulheta, IconeCheck, IconeElo, IconeFechar, IconeMais } from '@/components/ui/icones'

const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: 'vivo', rotulo: 'Vivo(a)' },
  { valor: 'pre_morto', rotulo: 'Faleceu ANTES do autor da herança' },
  { valor: 'pos_morto', rotulo: 'Faleceu DEPOIS, antes da partilha' },
  { valor: 'comoriente', rotulo: 'Morreu junto (comoriência)' },
  { valor: 'renunciante', rotulo: 'Renunciou à herança' },
  { valor: 'indigno', rotulo: 'Excluído por indignidade' },
  { valor: 'deserdado', rotulo: 'Deserdado(a)' },
]

const COR_SITUACAO: Partial<Record<Situacao, string>> = {
  pre_morto: 'var(--c-fora)',
  pos_morto: 'var(--c-conjuge)',
  comoriente: 'var(--c-fora)',
  renunciante: 'var(--aviso)',
  indigno: 'var(--perigo)',
  deserdado: 'var(--perigo)',
}

/**
 * Editor recursivo de uma linha de descendência.
 *
 * A profundidade importa. Só faz sentido acrescentar filhos a quem NÃO herda
 * (pré-morto, comoriente, excluído), porque é exatamente aí que a representação
 * entra em cena. Quando o herdeiro está vivo, os filhos dele ficam fora da
 * partilha e o editor avisa.
 *
 * O pós-morto é o terceiro caso, e o mais escorregadio: ele herdou, então os
 * filhos não o representam — recebem através do inventário dele. Por isso o
 * editor oferece ali mesmo o botão que abre a sucessão dessa pessoa e cumula
 * os processos.
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
  onAbrirInventario,
  onDesligar,
  nomeDoObito,
}: {
  pessoas: Pessoa[]
  nivel?: number
  rotuloNivel: (n: number) => string
  mostrarVinculoConjuge?: boolean
  nomeConjuge?: string
  onAlterar: (id: string, mut: (p: Pessoa) => void) => void
  onRemover: (id: string) => void
  onAdicionarFilho: (id: string) => void
  onAbrirInventario?: (id: string) => void
  onDesligar?: (id: string) => void
  /** Devolve o nome do falecido ligado a um óbito, para exibir o elo. */
  nomeDoObito?: (obitoId: string) => string | undefined
}) {
  return (
    <div className={nivel > 1 ? 'mt-2 space-y-2 border-l border-[var(--border)] pl-3' : 'space-y-2'}>
      <AnimatePresence initial={false}>
        {pessoas.map((p) => {
          const podeRepresentar =
            p.situacao !== 'vivo' && p.situacao !== 'renunciante' && p.situacao !== 'pos_morto'
          const inerte =
            (p.situacao === 'vivo' || p.situacao === 'pos_morto') && p.filhos.length > 0
          const ligado = p.obitoId ? nomeDoObito?.(p.obitoId) : undefined
          const falecido = p.situacao !== 'vivo' && p.situacao !== 'renunciante'

          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="rounded-xl border p-3"
                style={{
                  borderColor: p.obitoId
                    ? 'color-mix(in srgb, var(--c-conjuge) 34%, transparent)'
                    : 'var(--border)',
                  background: 'var(--surface)',
                }}
              >
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
                  <div className="min-w-[210px] flex-1">
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

                  {podeRepresentar && (
                    <Botao
                      tamanho="sm"
                      variante="fantasma"
                      onClick={() => onAdicionarFilho(p.id)}
                      title="Acrescentar um descendente desta pessoa"
                    >
                      <IconeMais tamanho={13} />
                      {rotuloNivel(nivel + 1).toLowerCase()}
                    </Botao>
                  )}
                </div>

                {/* ------------------- elo com outro inventário ------------------- */}

                {ligado ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--c-conjuge)_28%,transparent)] bg-[color-mix(in_srgb,var(--c-conjuge)_8%,transparent)] px-2.5 py-2">
                    <span className="text-[var(--c-conjuge)]">
                      <IconeElo tamanho={13} />
                    </span>
                    <span className="min-w-0 flex-1 text-[11.5px] leading-snug text-[var(--texto-2)]">
                      A sucessão de <strong>{ligado}</strong> está cadastrada no processo. O que
                      esta pessoa {p.situacao === 'pos_morto' ? 'herdar aqui segue para lá' : 'deixou é partilhado lá'}.
                    </span>
                    {onDesligar && (
                      <button
                        onClick={() => onDesligar(p.id)}
                        className="text-[11px] font-semibold text-[var(--texto-3)] transition hover:text-[var(--perigo)]"
                      >
                        desfazer elo
                      </button>
                    )}
                  </div>
                ) : (
                  falecido &&
                  onAbrirInventario && (
                    <Botao
                      tamanho="sm"
                      variante="contorno"
                      className="mt-2 w-full"
                      onClick={() => onAbrirInventario(p.id)}
                    >
                      <IconeAmpulheta tamanho={13} />
                      Abrir o inventário de {p.nome || 'esta pessoa'}
                    </Botao>
                  )
                )}

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

                {p.situacao === 'pos_morto' && (
                  <p className="mt-2 rounded-lg bg-[color-mix(in_srgb,var(--c-conjuge)_10%,transparent)] px-2.5 py-1.5 text-[11.5px] leading-snug text-[var(--texto-2)]">
                    Sobreviveu ao autor da herança, ainda que por pouco: <strong>herdou</strong>.
                    O quinhão não vai aos filhos por representação — entra no espólio desta
                    pessoa e se reparte segundo a sucessão dela (arts. 1.784 e 1.787).
                  </p>
                )}

                {p.situacao === 'renunciante' && p.filhos.length > 0 && (
                  <p className="mt-2 rounded-lg bg-[color-mix(in_srgb,var(--aviso)_10%,transparent)] px-2.5 py-1.5 text-[11.5px] leading-snug text-[var(--texto-2)]">
                    Ninguém sucede representando renunciante. Estes descendentes só entram se
                    todos os herdeiros da classe também renunciarem — e aí por cabeça (art. 1.811).
                  </p>
                )}

                {inerte && (
                  <p className="mt-2 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-[11.5px] leading-snug text-[var(--texto-3)]">
                    Como {p.nome || 'esta pessoa'} herda, a descendência dela fica fora desta
                    partilha. {p.situacao === 'pos_morto'
                      ? 'Os filhos aparecem no inventário dela, não neste.'
                      : 'Ela só apareceria por representação.'}
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
                  onAbrirInventario={onAbrirInventario}
                  onDesligar={onDesligar}
                  nomeDoObito={nomeDoObito}
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
