import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCaso } from '@/store/caso'
import { REGIMES, type Irmao, type Regime, type Situacao } from '@/engine/tipos'
import {
  Botao,
  CampoTexto,
  CampoValor,
  Contador,
  Dica,
  Interruptor,
  Rotulo,
  Selecao,
  Selo,
} from '@/components/ui/primitivos'
import {
  IconeAscendentes,
  IconeBalanca,
  IconeChevron,
  IconeColaterais,
  IconeConjuge,
  IconeDescendentes,
  IconeFechar,
  IconeMais,
  IconePatrimonio,
  IconeTestamento,
} from '@/components/ui/icones'
import { criarPessoa, encontrar, nomeSugerido, nomesEmUso, novoId, remover } from '@/lib/arvore'
import {
  EditorPessoas,
  ROTULO_COLATERAL,
  ROTULO_DESCENDENTE,
} from './EditorPessoas'

export function ConstrutorCaso() {
  const { caso, resultado, atualizar } = useCaso()
  const [abertas, setAbertas] = useState<Record<string, boolean>>({
    familia: true,
    descendentes: true,
    patrimonio: true,
  })

  const alternar = (id: string) => setAbertas((a) => ({ ...a, [id]: !a[id] }))

  const temDescendentes = caso.descendentes.length > 0
  const classeAtiva = resultado.classe

  /* ------------------------- mutações de pessoas ------------------------- */

  const alterarPessoa = (id: string, mut: (p: import('@/engine/tipos').Pessoa) => void) =>
    atualizar((c) => {
      const p = encontrar(c.descendentes, id) ?? encontrar(c.colaterais.irmaos, id)
      if (p) mut(p)
    })

  const removerPessoa = (id: string) =>
    atualizar((c) => {
      if (!remover(c.descendentes, id)) remover(c.colaterais.irmaos, id)
    })

  const adicionarFilhoDe = (id: string) =>
    atualizar((c) => {
      const p = encontrar(c.descendentes, id) ?? encontrar(c.colaterais.irmaos, id)
      if (!p) return
      p.filhos.push(criarPessoa(nomeSugerido(nomesEmUso(c.descendentes)), false))
    })

  return (
    <div className="space-y-2">
      {/* ============================ família ============================ */}
      <Secao
        id="familia"
        titulo="O falecido e o cônjuge"
        numero="1"
        icone={<IconeConjuge tamanho={17} />}
        aberta={abertas.familia}
        onToggle={alternar}
        resumo={
          caso.conjuge.existe
            ? REGIMES[caso.conjuge.regime].curto
            : 'sem cônjuge'
        }
      >
        <div className="space-y-3">
          <div>
            <Rotulo>Nome do autor da herança</Rotulo>
            <CampoTexto
              valor={caso.nomeFalecido}
              onChange={(v) => atualizar((c) => void (c.nomeFalecido = v))}
              placeholder="Ex.: João da Silva"
            />
          </div>

          <Interruptor
            ligado={caso.conjuge.existe}
            onChange={(v) => atualizar((c) => void (c.conjuge.existe = v))}
            rotulo="Havia cônjuge ou companheiro(a) sobrevivente"
            descricao="Casamento e união estável recebem o mesmo tratamento desde o julgamento do STF."
          />

          <AnimatePresence initial={false}>
            {caso.conjuge.existe && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Rotulo>Nome</Rotulo>
                    <CampoTexto
                      valor={caso.conjuge.nome}
                      onChange={(v) => atualizar((c) => void (c.conjuge.nome = v))}
                      placeholder="Ex.: Maria"
                    />
                  </div>
                  <div>
                    <Rotulo>Vínculo</Rotulo>
                    <Selecao
                      valor={caso.conjuge.vinculo}
                      onChange={(v) => atualizar((c) => void (c.conjuge.vinculo = v))}
                      opcoes={[
                        { valor: 'casamento', rotulo: 'Casamento' },
                        { valor: 'uniao_estavel', rotulo: 'União estável' },
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <Rotulo dica="É o regime que decide se o cônjuge tem meação e se concorre com os descendentes. Na união estável sem contrato escrito, presume-se a comunhão parcial.">
                    Regime de bens
                  </Rotulo>
                  <Selecao<Regime>
                    valor={caso.conjuge.regime}
                    onChange={(v) =>
                      atualizar((c) => {
                        c.conjuge.regime = v
                        if (v !== 'separacao_obrigatoria') c.conjuge.sumula377 = false
                      })
                    }
                    opcoes={Object.values(REGIMES).map((r) => ({
                      valor: r.id,
                      rotulo: r.nome,
                    }))}
                  />
                  <p className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12px] leading-relaxed text-[var(--texto-2)]">
                    {REGIMES[caso.conjuge.regime].resumo}
                  </p>
                </div>

                <div>
                  <Rotulo>Situação do cônjuge</Rotulo>
                  <Selecao<Situacao>
                    valor={caso.conjuge.situacao}
                    onChange={(v) => atualizar((c) => void (c.conjuge.situacao = v))}
                    opcoes={[
                      { valor: 'vivo', rotulo: 'Sobreviveu ao falecido' },
                      { valor: 'renunciante', rotulo: 'Renunciou à herança' },
                      { valor: 'pre_morto', rotulo: 'Já era falecido(a)' },
                      { valor: 'comoriente', rotulo: 'Morreu junto (comoriência)' },
                      { valor: 'indigno', rotulo: 'Excluído por indignidade' },
                    ]}
                  />
                </div>

                {caso.conjuge.regime === 'separacao_obrigatoria' && (
                  <Interruptor
                    ligado={caso.conjuge.sumula377}
                    onChange={(v) => atualizar((c) => void (c.conjuge.sumula377 = v))}
                    rotulo="Aplicar a Súmula 377 do STF"
                    descricao="Comunica os bens adquiridos durante a união, gerando meação. Não altera a herança."
                  />
                )}

                <Interruptor
                  ligado={caso.conjuge.separadoDeFato}
                  onChange={(v) => atualizar((c) => void (c.conjuge.separadoDeFato = v))}
                  rotulo="Separado judicialmente ou de fato há mais de 2 anos"
                  descricao="Nessa hipótese o cônjuge perde a herança, mas conserva a meação (art. 1.830)."
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Secao>

      {/* ========================== descendentes ========================== */}
      <Secao
        id="descendentes"
        titulo="Descendentes"
        numero="2"
        icone={<IconeDescendentes tamanho={17} />}
        aberta={abertas.descendentes}
        onToggle={alternar}
        resumo={caso.descendentes.length > 0 ? `${caso.descendentes.length} filho(s)` : 'nenhum'}
        ativa={classeAtiva === 'descendentes'}
      >
        <div className="space-y-3">
          <p className="text-[12.5px] leading-relaxed text-[var(--texto-3)]">
            Comece pelos filhos. Marque alguém como falecido antes do autor da herança para que
            os netos entrem por representação.
          </p>

          <EditorPessoas
            pessoas={caso.descendentes}
            rotuloNivel={ROTULO_DESCENDENTE}
            mostrarVinculoConjuge={caso.conjuge.existe}
            nomeConjuge={caso.conjuge.nome}
            onAlterar={alterarPessoa}
            onRemover={removerPessoa}
            onAdicionarFilho={adicionarFilhoDe}
          />

          <Botao
            variante="contorno"
            onClick={() =>
              atualizar((c) =>
                void c.descendentes.push(
                  criarPessoa(nomeSugerido(nomesEmUso(c.descendentes)), c.conjuge.existe),
                ),
              )
            }
            className="w-full"
          >
            <IconeMais tamanho={15} /> Acrescentar filho(a)
          </Botao>
        </div>
      </Secao>

      {/* =========================== ascendentes =========================== */}
      <Secao
        id="ascendentes"
        titulo="Ascendentes"
        numero="3"
        icone={<IconeAscendentes tamanho={17} />}
        aberta={abertas.ascendentes}
        onToggle={alternar}
        resumo={resumoAscendentes(caso.ascendentes)}
        ativa={classeAtiva === 'ascendentes'}
        inerte={temDescendentes}
        avisoInerte="Havendo descendentes, os ascendentes não são chamados."
      >
        <div className="space-y-2.5">
          <div className="grid gap-2 sm:grid-cols-2">
            <Interruptor
              ligado={caso.ascendentes.pai}
              onChange={(v) => atualizar((c) => void (c.ascendentes.pai = v))}
              rotulo="Pai vivo"
            />
            <Interruptor
              ligado={caso.ascendentes.mae}
              onChange={(v) => atualizar((c) => void (c.ascendentes.mae = v))}
              rotulo="Mãe viva"
            />
          </div>

          <p className="pt-1 text-[12px] text-[var(--texto-3)]">
            Avós e bisavós só entram se nenhum ascendente de grau mais próximo sobreviver.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <Contador
              rotulo="Avós paternos"
              max={2}
              valor={caso.ascendentes.avosPaternos}
              onChange={(v) => atualizar((c) => void (c.ascendentes.avosPaternos = v))}
            />
            <Contador
              rotulo="Avós maternos"
              max={2}
              valor={caso.ascendentes.avosMaternos}
              onChange={(v) => atualizar((c) => void (c.ascendentes.avosMaternos = v))}
            />
            <Contador
              rotulo="Bisavós paternos"
              max={4}
              valor={caso.ascendentes.bisavosPaternos}
              onChange={(v) => atualizar((c) => void (c.ascendentes.bisavosPaternos = v))}
            />
            <Contador
              rotulo="Bisavós maternos"
              max={4}
              valor={caso.ascendentes.bisavosMaternos}
              onChange={(v) => atualizar((c) => void (c.ascendentes.bisavosMaternos = v))}
            />
          </div>
        </div>
      </Secao>

      {/* ============================ colaterais ============================ */}
      <Secao
        id="colaterais"
        titulo="Colaterais até o 4º grau"
        numero="4"
        icone={<IconeColaterais tamanho={17} />}
        aberta={abertas.colaterais}
        onToggle={alternar}
        resumo={
          caso.colaterais.irmaos.length > 0
            ? `${caso.colaterais.irmaos.length} irmão(s)`
            : 'nenhum'
        }
        ativa={classeAtiva === 'colaterais'}
        inerte={classeAtiva !== 'colaterais' && classeAtiva !== 'vacante'}
        avisoInerte="Descendentes, ascendentes e cônjuge excluem os colaterais."
      >
        <div className="space-y-3">
          <div className="space-y-2">
            {caso.colaterais.irmaos.map((irmao) => (
              <div
                key={irmao.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5"
              >
                <div className="flex items-center gap-2">
                  <CampoTexto
                    valor={irmao.nome}
                    onChange={(v) =>
                      atualizar((c) => {
                        const i = c.colaterais.irmaos.find((x) => x.id === irmao.id)
                        if (i) i.nome = v
                      })
                    }
                    placeholder="Nome do irmão(ã)"
                    className="!py-1.5 !text-[13px]"
                  />
                  <button
                    onClick={() =>
                      atualizar((c) => {
                        c.colaterais.irmaos = c.colaterais.irmaos.filter((x) => x.id !== irmao.id)
                      })
                    }
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--texto-3)] transition hover:bg-[color-mix(in_srgb,var(--perigo)_14%,transparent)] hover:bg-[color-mix(in_srgb,var(--perigo)_13%,transparent)] hover:text-[var(--perigo)]"
                  >
                    <IconeFechar tamanho={14} />
                  </button>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Selecao
                    valor={irmao.vinculo}
                    onChange={(v) =>
                      atualizar((c) => {
                        const i = c.colaterais.irmaos.find((x) => x.id === irmao.id)
                        if (i) i.vinculo = v
                      })
                    }
                    opcoes={[
                      { valor: 'bilateral', rotulo: 'Bilateral (mesmo pai e mãe)' },
                      { valor: 'unilateral', rotulo: 'Unilateral (só pai ou só mãe)' },
                    ]}
                  />
                  <Selecao
                    valor={irmao.situacao}
                    onChange={(v) =>
                      atualizar((c) => {
                        const i = c.colaterais.irmaos.find((x) => x.id === irmao.id)
                        if (i) i.situacao = v
                      })
                    }
                    opcoes={[
                      { valor: 'vivo', rotulo: 'Vivo(a)' },
                      { valor: 'pre_morto', rotulo: 'Faleceu antes' },
                      { valor: 'renunciante', rotulo: 'Renunciou' },
                    ]}
                  />
                </div>

                {irmao.vinculo === 'unilateral' && (
                  <p className="mt-2 text-[11.5px] text-[var(--texto-3)]">
                    Irmão unilateral herda metade do que herda cada bilateral (art. 1.841).
                  </p>
                )}

                {irmao.filhos.length > 0 && (
                  <EditorPessoas
                    pessoas={irmao.filhos}
                    nivel={2}
                    rotuloNivel={ROTULO_COLATERAL}
                    onAlterar={alterarPessoa}
                    onRemover={removerPessoa}
                    onAdicionarFilho={adicionarFilhoDe}
                  />
                )}

                <Botao
                  tamanho="sm"
                  variante="fantasma"
                  className="mt-2"
                  onClick={() =>
                    atualizar((c) => {
                      const i = c.colaterais.irmaos.find((x) => x.id === irmao.id)
                      if (i) i.filhos.push(criarPessoa(nomeSugerido(nomesEmUso(i.filhos)), false))
                    })
                  }
                >
                  <IconeMais tamanho={13} /> sobrinho(a)
                </Botao>
              </div>
            ))}
          </div>

          <Botao
            variante="contorno"
            className="w-full"
            onClick={() =>
              atualizar((c) => {
                const novo: Irmao = {
                  id: novoId('i'),
                  nome: nomeSugerido(c.colaterais.irmaos.map((i) => i.nome)),
                  situacao: 'vivo',
                  filhos: [],
                  vinculo: 'bilateral',
                }
                c.colaterais.irmaos.push(novo)
              })
            }
          >
            <IconeMais tamanho={15} /> Acrescentar irmão(ã)
          </Botao>

          <div className="grid gap-2 pt-1 sm:grid-cols-2">
            <Contador
              rotulo="Tios e tias (3º)"
              valor={caso.colaterais.tios}
              onChange={(v) => atualizar((c) => void (c.colaterais.tios = v))}
            />
            <Contador
              rotulo="Primos (4º)"
              valor={caso.colaterais.primos}
              onChange={(v) => atualizar((c) => void (c.colaterais.primos = v))}
            />
            <Contador
              rotulo="Tios-avós (4º)"
              valor={caso.colaterais.tiosAvos}
              onChange={(v) => atualizar((c) => void (c.colaterais.tiosAvos = v))}
            />
            <Contador
              rotulo="Sobrinhos-netos (4º)"
              valor={caso.colaterais.sobrinhosNetos}
              onChange={(v) => atualizar((c) => void (c.colaterais.sobrinhosNetos = v))}
            />
          </div>
        </div>
      </Secao>

      {/* ============================ patrimônio ============================ */}
      <Secao
        id="patrimonio"
        titulo="Patrimônio"
        numero="5"
        icone={<IconePatrimonio tamanho={17} />}
        aberta={abertas.patrimonio}
        onToggle={alternar}
        resumo="acervo e dívidas"
      >
        <div className="space-y-3">
          {caso.conjuge.existe && (
            <div>
              <Rotulo dica="Bens sobre os quais o cônjuge tem meação. Na comunhão parcial, os adquiridos onerosamente durante a união; na universal, praticamente todos.">
                Bens comuns do casal (valor total)
              </Rotulo>
              <CampoValor
                valor={caso.patrimonio.bensComuns}
                onChange={(v) => atualizar((c) => void (c.patrimonio.bensComuns = v))}
              />
            </div>
          )}

          <div>
            <Rotulo dica="Bens exclusivos do falecido: recebidos por herança ou doação, adquiridos antes da união, ou sub-rogados. São eles que abrem a concorrência do cônjuge na comunhão parcial.">
              {caso.conjuge.existe ? 'Bens particulares do falecido' : 'Acervo do falecido'}
            </Rotulo>
            <CampoValor
              valor={caso.patrimonio.bensParticulares}
              onChange={(v) => atualizar((c) => void (c.patrimonio.bensParticulares = v))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Rotulo>Dívidas do espólio</Rotulo>
              <CampoValor
                valor={caso.patrimonio.dividas}
                onChange={(v) => atualizar((c) => void (c.patrimonio.dividas = v))}
              />
            </div>
            <div>
              <Rotulo>Despesas de funeral</Rotulo>
              <CampoValor
                valor={caso.patrimonio.despesasFuneral}
                onChange={(v) => atualizar((c) => void (c.patrimonio.despesasFuneral = v))}
              />
            </div>
          </div>
        </div>
      </Secao>

      {/* ======================= testamento e doações ======================= */}
      <Secao
        id="testamento"
        titulo="Testamento e doações em vida"
        numero="6"
        icone={<IconeTestamento tamanho={17} />}
        aberta={abertas.testamento}
        onToggle={alternar}
        resumo={
          caso.patrimonio.legados.length + caso.patrimonio.doacoes.length > 0
            ? `${caso.patrimonio.legados.length} deixa(s) · ${caso.patrimonio.doacoes.length} doação(ões)`
            : 'nenhum'
        }
      >
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[12.5px] font-medium text-[var(--texto-2)]">
                Disposições testamentárias
              </span>
              <Dica texto="Com herdeiros necessários, o testamento alcança no máximo metade da herança. O excesso é reduzido automaticamente." />
            </div>

            <div className="space-y-2">
              {caso.patrimonio.legados.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5"
                >
                  <div className="min-w-[140px] flex-1">
                    <CampoTexto
                      valor={l.beneficiario}
                      onChange={(v) =>
                        atualizar((c) => {
                          const x = c.patrimonio.legados.find((y) => y.id === l.id)
                          if (x) x.beneficiario = v
                        })
                      }
                      placeholder="Beneficiário"
                      className="!py-1.5 !text-[13px]"
                    />
                  </div>
                  <div className="w-[128px]">
                    <Selecao
                      valor={l.modo}
                      onChange={(v) =>
                        atualizar((c) => {
                          const x = c.patrimonio.legados.find((y) => y.id === l.id)
                          if (x) x.modo = v
                        })
                      }
                      opcoes={[
                        { valor: 'percentual_heranca', rotulo: '% da herança' },
                        { valor: 'valor', rotulo: 'valor fixo' },
                      ]}
                    />
                  </div>
                  <div className="w-[130px]">
                    {l.modo === 'valor' ? (
                      <CampoValor
                        valor={l.quantia}
                        onChange={(v) =>
                          atualizar((c) => {
                            const x = c.patrimonio.legados.find((y) => y.id === l.id)
                            if (x) x.quantia = v
                          })
                        }
                      />
                    ) : (
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={l.quantia || ''}
                          onChange={(e) =>
                            atualizar((c) => {
                              const x = c.patrimonio.legados.find((y) => y.id === l.id)
                              if (x) x.quantia = Math.min(100, Math.max(0, +e.target.value))
                            })
                          }
                          className="num w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pr-7 pl-3 text-[14px] focus:border-[var(--ouro)] focus:outline-none"
                        />
                        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-[var(--texto-3)]">
                          %
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      atualizar((c) => {
                        c.patrimonio.legados = c.patrimonio.legados.filter((y) => y.id !== l.id)
                      })
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--texto-3)] transition hover:bg-[color-mix(in_srgb,var(--perigo)_13%,transparent)] hover:text-[var(--perigo)]"
                  >
                    <IconeFechar tamanho={14} />
                  </button>
                </div>
              ))}
            </div>

            <Botao
              variante="fantasma"
              tamanho="sm"
              className="mt-2"
              onClick={() =>
                atualizar((c) =>
                  void c.patrimonio.legados.push({
                    id: novoId('l'),
                    beneficiario: '',
                    modo: 'percentual_heranca',
                    quantia: 25,
                  }),
                )
              }
            >
              <IconeMais tamanho={13} /> Acrescentar deixa
            </Botao>
          </div>

          <div className="border-t border-[var(--border)] pt-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[12.5px] font-medium text-[var(--texto-2)]">
                Doações a herdeiros (colação)
              </span>
              <Dica texto="A doação de ascendente a descendente é adiantamento da legítima. O valor volta ao monte para o cálculo e é descontado do quinhão do donatário — salvo dispensa expressa, que o faz sair da parte disponível." />
            </div>

            {caso.descendentes.length === 0 ? (
              <p className="text-[12px] text-[var(--texto-3)]">
                Cadastre descendentes para registrar doações sujeitas a colação.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {caso.patrimonio.doacoes.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-[130px] flex-1">
                          <Selecao
                            valor={d.donatarioId}
                            onChange={(v) =>
                              atualizar((c) => {
                                const x = c.patrimonio.doacoes.find((y) => y.id === d.id)
                                const alvo = encontrar(c.descendentes, v)
                                if (x) {
                                  x.donatarioId = v
                                  x.nomeDonatario = alvo?.nome ?? ''
                                }
                              })
                            }
                            opcoes={caso.descendentes.map((p) => ({
                              valor: p.id,
                              rotulo: p.nome || 'Sem nome',
                            }))}
                          />
                        </div>
                        <div className="w-[150px]">
                          <CampoValor
                            valor={d.valor}
                            onChange={(v) =>
                              atualizar((c) => {
                                const x = c.patrimonio.doacoes.find((y) => y.id === d.id)
                                if (x) x.valor = v
                              })
                            }
                          />
                        </div>
                        <button
                          onClick={() =>
                            atualizar((c) => {
                              c.patrimonio.doacoes = c.patrimonio.doacoes.filter(
                                (y) => y.id !== d.id,
                              )
                            })
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--texto-3)] transition hover:text-[var(--perigo)]"
                        >
                          <IconeFechar tamanho={14} />
                        </button>
                      </div>
                      <Interruptor
                        ligado={d.dispensada}
                        onChange={(v) =>
                          atualizar((c) => {
                            const x = c.patrimonio.doacoes.find((y) => y.id === d.id)
                            if (x) x.dispensada = v
                          })
                        }
                        rotulo="Dispensada de colação"
                        descricao="Sai da parte disponível. Se ultrapassá-la, a doação é inoficiosa."
                      />
                    </div>
                  ))}
                </div>

                <Botao
                  variante="fantasma"
                  tamanho="sm"
                  className="mt-2"
                  onClick={() =>
                    atualizar((c) => {
                      const primeiro = c.descendentes[0]
                      if (!primeiro) return
                      c.patrimonio.doacoes.push({
                        id: novoId('d'),
                        donatarioId: primeiro.id,
                        nomeDonatario: primeiro.nome,
                        valor: 0,
                        dispensada: false,
                      })
                    })
                  }
                >
                  <IconeMais tamanho={13} /> Registrar doação
                </Botao>
              </>
            )}
          </div>
        </div>
      </Secao>

      {/* =========================== interpretação =========================== */}
      <Secao
        id="opcoes"
        titulo="Premissas interpretativas"
        numero="7"
        icone={<IconeBalanca tamanho={17} />}
        aberta={abertas.opcoes}
        onToggle={alternar}
        resumo="pontos controvertidos"
      >
        <div className="space-y-1">
          <p className="mb-2 text-[12.5px] leading-relaxed text-[var(--texto-3)]">
            Dois pontos em que a doutrina e a jurisprudência ainda divergem. Alterne e compare —
            o resultado muda de verdade.
          </p>
          <Interruptor
            ligado={caso.opcoes.concorrenciaSoBensParticulares}
            onChange={(v) =>
              atualizar((c) => void (c.opcoes.concorrenciaSoBensParticulares = v))
            }
            rotulo="Concorrência apenas sobre os bens particulares"
            descricao="Tese fixada pela 2ª Seção do STJ no REsp 1.368.123/SP. Desligando, o cônjuge concorre sobre toda a herança."
          />
          <Interruptor
            ligado={caso.opcoes.reservaQuartoFiliacaoHibrida}
            onChange={(v) =>
              atualizar((c) => void (c.opcoes.reservaQuartoFiliacaoHibrida = v))
            }
            rotulo="Reservar 1/4 ao cônjuge na filiação híbrida"
            descricao="O Enunciado 527 do CJF diz que não se reserva. Ligue para adotar a corrente contrária."
          />
        </div>
      </Secao>

    </div>
  )
}

/* ------------------------------ seção ------------------------------ */

/**
 * Bloco sanfonado do formulário.
 *
 * O cabeçalho carrega três informações de uma vez: onde você está (número e
 * ícone), o que já foi preenchido (resumo) e se aquilo influi no resultado —
 * a seção da classe chamada ganha a borda dourada, e as excluídas ficam
 * apagadas, mas continuam acessíveis.
 */
function Secao({
  id,
  numero,
  titulo,
  icone,
  resumo,
  aberta,
  onToggle,
  children,
  ativa,
  inerte,
  avisoInerte,
}: {
  id: string
  numero: string
  titulo: string
  icone: ReactNode
  resumo: string
  aberta: boolean
  onToggle: (id: string) => void
  children: ReactNode
  ativa?: boolean
  inerte?: boolean
  avisoInerte?: string
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl border transition-colors"
      style={{
        borderColor: ativa
          ? 'color-mix(in srgb, var(--ouro) 34%, transparent)'
          : 'var(--border)',
        background: 'var(--surface)',
      }}
    >
      <button
        onClick={() => onToggle(id)}
        aria-expanded={aberta}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-[var(--surface-2)]"
        style={{ background: ativa ? 'var(--ouro-fundo)' : undefined }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors"
          style={{
            borderColor: ativa
              ? 'color-mix(in srgb, var(--ouro) 32%, transparent)'
              : 'var(--border)',
            background: ativa ? 'var(--ouro-fundo)' : 'var(--surface-2)',
            color: ativa ? 'var(--ouro)' : inerte ? 'var(--texto-3)' : 'var(--texto-2)',
          }}
        >
          {icone}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="num text-[10.5px] font-bold tracking-widest text-[var(--texto-3)]">
              {numero}
            </span>
            <span className="titulo text-[15px] font-semibold">{titulo}</span>
            {ativa && <Selo cor="var(--ouro)">classe chamada</Selo>}
            {inerte && <Selo cor="var(--c-fora)">não influi</Selo>}
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-[var(--texto-3)]">
            {resumo}
          </span>
        </span>

        <motion.span
          animate={{ rotate: aberta ? 180 : 0 }}
          className="shrink-0 text-[var(--texto-3)]"
          transition={{ duration: 0.2 }}
        >
          <IconeChevron tamanho={16} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {aberta && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--border)] px-3.5 py-4">
              {inerte && avisoInerte && (
                <p className="mb-3 rounded-xl border border-dashed border-[var(--border-forte)] px-3 py-2 text-[12px] leading-snug text-[var(--texto-3)]">
                  {avisoInerte} Os dados ficam guardados caso a situação mude.
                </p>
              )}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function resumoAscendentes(a: import('@/engine/tipos').Ascendentes): string {
  const partes: string[] = []
  if (a.pai) partes.push('pai')
  if (a.mae) partes.push('mãe')
  const avos = a.avosPaternos + a.avosMaternos
  if (avos) partes.push(`${avos} avó(s)`)
  const bis = a.bisavosPaternos + a.bisavosMaternos
  if (bis) partes.push(`${bis} bisavó(s)`)
  return partes.length > 0 ? partes.join(' · ') : 'nenhum'
}
