import type { Alerta, ResultadoCumulativo } from '@/engine/tipos'

const ORDEM = { critico: 0, atencao: 1, info: 2 } as const

/**
 * Reúne, num só lugar, tudo que o usuário precisa ver como ressalva.
 *
 * O motor cumulativo já eleva à visão do processo os alertas graves de cada
 * sucessão, identificados pelo falecido. Faltam os meramente informativos, que
 * ficam guardados dentro de cada óbito — e é aí que mora a armadilha: boa parte
 * deles é texto fixo ("o que este cálculo não inclui", "união estável
 * equiparada ao casamento") e reapareceria uma vez por óbito, idêntico. Num
 * processo com três falecidos o leitor veria o mesmo parágrafo três vezes.
 *
 * Então: deduplica pelo conteúdo, e só mantém o nome do falecido quando o
 * aviso de fato diz respeito a um deles em particular. Rotular um aviso
 * genérico com o nome do primeiro óbito seria pior que não rotular nada.
 */
export function reunirAlertas(r: ResultadoCumulativo): Alerta[] {
  const doProcesso = r.alertas

  const dosObitos = r.etapas.flatMap((e) =>
    e.resultado.alertas
      .filter((a) => a.nivel === 'info')
      .map((a) => ({
        ...a,
        obitoId: e.original.id,
        obitoNome: e.original.nomeFalecido || `Falecido ${e.indice + 1}`,
      })),
  )

  const chave = (a: Alerta) => `${a.nivel}|${a.titulo}|${a.texto}`

  // Quantos óbitos distintos produziram exatamente este mesmo aviso?
  const origens = new Map<string, Set<string>>()
  for (const a of dosObitos) {
    const conjunto = origens.get(chave(a)) ?? new Set<string>()
    conjunto.add(a.obitoId ?? '')
    origens.set(chave(a), conjunto)
  }

  const vistos = new Set<string>()
  const saida: Alerta[] = []

  for (const a of [...doProcesso, ...dosObitos]) {
    const k = chave(a)
    if (vistos.has(k)) continue
    vistos.add(k)
    const generico = (origens.get(k)?.size ?? 0) > 1
    saida.push(generico ? { ...a, obitoId: undefined, obitoNome: undefined } : a)
  }

  return saida.sort((a, b) => ORDEM[a.nivel] - ORDEM[b.nivel])
}

/** Quantos merecem atenção de verdade — o número que vai no rótulo da aba. */
export function contarRelevantes(r: ResultadoCumulativo): number {
  return reunirAlertas(r).filter((a) => a.nivel !== 'info').length
}
