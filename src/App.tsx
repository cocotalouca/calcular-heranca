import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  useInventario,
  useObitoAtivo,
  useResultadoAtivo,
} from '@/store/inventario'
import { useTema } from '@/store/tema'
import { copiar, resumoTexto } from '@/lib/resumo'
import { contarRelevantes, reunirAlertas } from '@/lib/alertas'
import { Abas, Botao } from '@/components/ui/primitivos'
import {
  IconeAlvo,
  IconeBalanca,
  IconeCheck,
  IconeCopiar,
  IconeDocumento,
  IconeLivro,
  IconeLua,
  IconePlanilha,
  IconeSol,
} from '@/components/ui/icones'
import { ConstrutorCaso } from '@/components/wizard/ConstrutorCaso'
import { Abertura, BannerModelo } from '@/components/wizard/Abertura'
import { LinhaDoTempo } from '@/components/wizard/LinhaDoTempo'
import { ArvoreFamiliar } from '@/components/arvore/ArvoreFamiliar'
import { ResumoHeranca } from '@/components/resultado/ResumoHeranca'
import { PainelPartilha } from '@/components/resultado/PainelPartilha'
import { PainelConsolidado } from '@/components/resultado/PainelConsolidado'
import { PainelAlertas, PainelPassos } from '@/components/resultado/PainelExplicacao'

type AbaResultado = 'consolidado' | 'partilha' | 'raciocinio' | 'ressalvas'

export default function App() {
  const fase = useInventario((s) => s.fase)

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Cabecalho />

      <main className="mx-auto w-full max-w-[1460px] flex-1 space-y-4 px-4 pb-14 sm:px-6 lg:px-8">
        {fase === 'pronto' && <Calculadora />}
      </main>

      <Rodape />
      <Abertura />
    </div>
  )
}

/* ============================== cabeçalho ============================== */

function Cabecalho() {
  const { tema, alternar } = useTema()
  const abrirAbertura = useInventario((s) => s.abrirAbertura)

  return (
    <header className="sticky top-0 z-40 mb-5 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--ink-900)_84%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1460px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--ouro)_34%,transparent)] bg-[var(--ouro-fundo)] text-[var(--ouro)]">
          <IconeBalanca tamanho={21} />
        </span>
        <div className="min-w-0">
          <h1 className="titulo text-[19px] leading-tight font-semibold">Partilha Justa</h1>
          <p className="hidden text-[12px] text-[var(--texto-3)] sm:block">
            Sucessão e inventário cumulativo, calculados artigo por artigo
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Botao variante="suave" onClick={abrirAbertura}>
            <IconeLivro tamanho={15} />
            <span className="hidden sm:inline">Modelos e novo processo</span>
            <span className="sm:hidden">Modelos</span>
          </Botao>

          <button
            onClick={alternar}
            title={tema === 'escuro' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
            aria-label="Alternar tema"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--texto-2)] transition hover:border-[var(--ouro)] hover:text-[var(--ouro)]"
          >
            {tema === 'escuro' ? <IconeSol tamanho={16} /> : <IconeLua tamanho={16} />}
          </button>
        </div>
      </div>
    </header>
  )
}

/* ============================= calculadora ============================= */

function Calculadora() {
  const inventario = useInventario((s) => s.inventario)
  const resultado = useInventario((s) => s.resultado)
  const selecionarObito = useInventario((s) => s.selecionarObito)
  const caso = useObitoAtivo()
  const etapa = useResultadoAtivo()

  const cumulativo = resultado.cumulativo
  const [aba, setAba] = useState<AbaResultado>('partilha')
  const [selecionado, setSelecionado] = useState<string | null>(null)

  // Ao passar de um óbito para vários, a pergunta que importa muda: deixa de
  // ser "como se divide esta herança" e passa a ser "quanto sobra para cada um
  // no fim". A aba padrão acompanha essa mudança.
  useEffect(() => {
    setAba((atual) => {
      if (cumulativo && atual === 'partilha') return 'consolidado'
      if (!cumulativo && atual === 'consolidado') return 'partilha'
      return atual
    })
  }, [cumulativo])

  const ressalvas = reunirAlertas(resultado)
  const criticos = contarRelevantes(resultado)
  const passos = etapa?.resultado.passos.length ?? 0

  return (
    <>
      <LinhaDoTempo resultado={resultado} />
      {etapa && <ResumoHeranca resultado={etapa.resultado} />}
      <BannerModelo />

      <div className="grid gap-5 lg:grid-cols-[minmax(350px,400px)_1fr] lg:gap-6">
        {/* ------------------------- coluna de entrada ------------------------- */}
        <aside className="order-1 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto lg:pr-1 lg:pb-2">
          <div className="mb-3">
            <h2 className="titulo text-[19px] font-semibold">
              {caso.nomeFalecido ? `Sucessão de ${caso.nomeFalecido}` : 'Descreva o caso'}
            </h2>
            <p className="text-[12.5px] text-[var(--texto-3)]">
              O resultado se refaz a cada alteração.
            </p>
          </div>

          <ConstrutorCaso />
        </aside>

        {/* ------------------------- coluna de saída ------------------------- */}
        <section className="order-2 min-w-0 space-y-4">
          {/* ------------------------------ árvore ------------------------------ */}
          <div className="cartao overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-3">
              <h3 className="titulo text-[16px] font-semibold">
                Árvore da sucessão
                {cumulativo && caso.nomeFalecido ? ` de ${caso.nomeFalecido}` : ''}
              </h3>
              <p className="text-[11.5px] text-[var(--texto-3)]">
                arraste para mover · role para aproximar · clique em alguém para isolar
              </p>
            </div>
            <div className="h-[min(52vh,440px)] min-h-[320px] border-t border-[var(--border)]">
              {etapa && (
                <ArvoreFamiliar
                  caso={etapa.efetivo}
                  resultado={etapa.resultado}
                  selecionado={selecionado}
                  onSelecionar={setSelecionado}
                />
              )}
            </div>
          </div>

          {/* ------------------------------ detalhes ------------------------------ */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Abas<AbaResultado>
              valor={aba}
              onChange={setAba}
              itens={[
                ...(cumulativo
                  ? [{ valor: 'consolidado' as const, rotulo: 'Destino final' }]
                  : []),
                { valor: 'partilha', rotulo: cumulativo ? 'Esta sucessão' : 'Partilha' },
                { valor: 'raciocinio', rotulo: 'Raciocínio', contagem: passos },
                { valor: 'ressalvas', rotulo: 'Ressalvas', contagem: criticos },
              ]}
            />

            <BarraExportar />
          </div>

          <div className="cartao p-5">
            {/* Sem AnimatePresence: com StrictMode a saída animada podia travar e
                deixar o quadro vazio depois de trocar de aba. Uma transição de
                entrada, keyed pela aba, dá o mesmo efeito sem o risco. */}
            <motion.div
              key={`${aba}-${caso.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
            >
              {aba === 'consolidado' && (
                <PainelConsolidado resultado={resultado} onIrParaObito={selecionarObito} />
              )}
              {aba === 'partilha' && etapa && (
                <PainelPartilha
                  resultado={etapa.resultado}
                  aportes={etapa.aportes}
                  selecionado={selecionado}
                  onSelecionar={setSelecionado}
                  nomeDoObito={(id) => {
                    const i = inventario.obitos.findIndex((o) => o.id === id)
                    return i < 0 ? undefined : inventario.obitos[i].nomeFalecido || `Falecido ${i + 1}`
                  }}
                />
              )}
              {aba === 'raciocinio' && etapa && <PainelPassos resultado={etapa.resultado} />}
              {aba === 'ressalvas' && <PainelAlertas alertas={ressalvas} />}
            </motion.div>
          </div>
        </section>
      </div>
    </>
  )
}

/* ============================== exportar ============================== */

function BarraExportar() {
  const inventario = useInventario((s) => s.inventario)
  const resultado = useInventario((s) => s.resultado)
  const [copiado, setCopiado] = useState(false)
  const [ocupado, setOcupado] = useState<'xlsx' | 'pdf' | null>(null)

  const aoCopiar = async () => {
    const ok = await copiar(resumoTexto(inventario, resultado))
    if (ok) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
    }
  }

  // Os exportadores só chegam ao navegador quando alguém clica: o gerador de
  // PDF sozinho pesa mais que o resto do aplicativo inteiro, e a maioria das
  // visitas nunca precisa dele. Enquanto o módulo baixa e o arquivo se monta,
  // o botão diz que está trabalhando — o cálculo é síncrono e trava a thread
  // por um instante.
  const exportar = async (formato: 'xlsx' | 'pdf') => {
    setOcupado(formato)
    try {
      if (formato === 'xlsx') {
        const { exportarXlsx } = await import('@/lib/exportar/xlsx')
        exportarXlsx(inventario, resultado)
      } else {
        const { exportarPdf } = await import('@/lib/exportar/pdf')
        exportarPdf(inventario, resultado)
      }
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Botao variante="fantasma" tamanho="sm" onClick={aoCopiar} title="Copiar resumo em texto">
        {copiado ? <IconeCheck tamanho={14} /> : <IconeCopiar tamanho={14} />}
        <span className="hidden sm:inline">{copiado ? 'Copiado' : 'Copiar'}</span>
      </Botao>
      <Botao
        variante="suave"
        tamanho="sm"
        disabled={ocupado !== null}
        onClick={() => exportar('xlsx')}
        title="Baixar a planilha com uma aba por sucessão"
      >
        <IconePlanilha tamanho={14} />
        {ocupado === 'xlsx' ? 'Gerando…' : 'Planilha'}
      </Botao>
      <Botao
        variante="primario"
        tamanho="sm"
        disabled={ocupado !== null}
        onClick={() => exportar('pdf')}
        title="Baixar o relatório em PDF"
      >
        <IconeDocumento tamanho={14} />
        {ocupado === 'pdf' ? 'Gerando…' : 'PDF'}
      </Botao>
    </div>
  )
}

/* ================================ rodapé ================================ */

function Rodape() {
  return (
    <footer className="mt-4 border-t border-[var(--border)]">
      <div className="mx-auto flex w-full max-w-[1460px] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-[var(--texto-3)]">
          <strong className="text-[var(--texto-2)]">Ferramenta de estudo e simulação.</strong>{' '}
          Calcula a sucessão legítima segundo o Código Civil (Lei 10.406/2002), a Constituição e
          a jurisprudência consolidada do STF e do STJ, inclusive a cumulação de inventários do
          art. 672 do CPC. Ficam de fora o ITCMD, custas e honorários de inventário, bens
          gravados ou impenhoráveis, previdência privada, seguro de vida e as particularidades
          que só a leitura dos documentos revela. Não substitui a análise de um advogado no caso
          concreto.
        </p>
        <p className="flex shrink-0 items-center gap-1.5 text-[12px] text-[var(--texto-3)]">
          <IconeAlvo tamanho={13} />
          Aritmética exata — sem erro de arredondamento.
        </p>
      </div>
    </footer>
  )
}
