import { Fracao, F } from '@/lib/fracao'
import type { Ascendentes } from './tipos'

export interface HerdeiroAscendente {
  id: string
  nome: string
  qualificacao: string
  /** Fração da quota total dos ascendentes (soma 1). */
  fracao: Fracao
  linha: 'paterna' | 'materna'
  grau: number
}

export interface ColetaAscendentes {
  herdeiros: HerdeiroAscendente[]
  /** 1 = pais, 2 = avós, 3 = bisavós. 0 = nenhum. */
  grau: number
  /** Havia ascendentes em ambas as linhas naquele grau? */
  duasLinhas: boolean
  descricaoGrau: string
}

interface NivelAscendente {
  grau: number
  descricao: string
  paterna: { rotulo: string; quantidade: number }
  materna: { rotulo: string; quantidade: number }
}

/**
 * Chama os ascendentes à sucessão (art. 1.836).
 *
 * §1º — o grau mais próximo exclui o mais remoto, sem distinção de linhas:
 * um único avô materno vivo exclui todos os bisavós paternos.
 *
 * §2º — havendo igualdade em grau e diversidade em linha, metade vai para a
 * linha paterna e metade para a materna. A divisão por linha só faz sentido se
 * as DUAS linhas tiverem representantes naquele grau; se só uma sobrou, seus
 * integrantes dividem tudo por cabeça.
 */
export function coletarAscendentes(a: Ascendentes): ColetaAscendentes {
  const niveis: NivelAscendente[] = [
    {
      grau: 1,
      descricao: 'Pais (1º grau)',
      paterna: { rotulo: 'Pai', quantidade: a.pai ? 1 : 0 },
      materna: { rotulo: 'Mãe', quantidade: a.mae ? 1 : 0 },
    },
    {
      grau: 2,
      descricao: 'Avós (2º grau)',
      paterna: { rotulo: 'Avô/avó paterno(a)', quantidade: clamp(a.avosPaternos, 2) },
      materna: { rotulo: 'Avô/avó materno(a)', quantidade: clamp(a.avosMaternos, 2) },
    },
    {
      grau: 3,
      descricao: 'Bisavós (3º grau)',
      paterna: { rotulo: 'Bisavô/bisavó paterno(a)', quantidade: clamp(a.bisavosPaternos, 4) },
      materna: { rotulo: 'Bisavô/bisavó materno(a)', quantidade: clamp(a.bisavosMaternos, 4) },
    },
  ]

  for (const nivel of niveis) {
    const totalNivel = nivel.paterna.quantidade + nivel.materna.quantidade
    if (totalNivel === 0) continue

    const duasLinhas = nivel.paterna.quantidade > 0 && nivel.materna.quantidade > 0
    const herdeiros: HerdeiroAscendente[] = []

    const montar = (
      lado: 'paterna' | 'materna',
      dados: { rotulo: string; quantidade: number },
    ) => {
      if (dados.quantidade === 0) return
      // Com as duas linhas presentes, cada linha vale 1/2 e se reparte dentro.
      // Com uma só linha, ela toma o todo e se reparte por cabeça.
      const quotaLinha = duasLinhas ? F(1, 2) : Fracao.UM
      const porPessoa = quotaLinha.dividido(dados.quantidade)
      for (let i = 0; i < dados.quantidade; i++) {
        const sufixo = dados.quantidade > 1 ? ` ${i + 1}` : ''
        herdeiros.push({
          id: `asc-${nivel.grau}-${lado}-${i}`,
          nome: `${dados.rotulo}${sufixo}`,
          qualificacao: `Ascendente de ${nivel.grau}º grau — linha ${lado}`,
          fracao: porPessoa,
          linha: lado,
          grau: nivel.grau,
        })
      }
    }

    montar('paterna', nivel.paterna)
    montar('materna', nivel.materna)

    return {
      herdeiros,
      grau: nivel.grau,
      duasLinhas,
      descricaoGrau: nivel.descricao,
    }
  }

  return { herdeiros: [], grau: 0, duasLinhas: false, descricaoGrau: '' }
}

function clamp(n: number, max: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(Math.floor(n), max)
}
