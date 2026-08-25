# Partilha Justa

Calculadora de herança e partilha segundo o Código Civil brasileiro, com árvore
genealógica interativa e fundamentação artigo por artigo.

Roda inteiramente no navegador: nenhum dado sai da máquina do usuário, e o
resultado é um site estático que se hospeda de graça no GitHub Pages, Vercel,
Netlify ou Cloudflare Pages.

---

## O que ela resolve

Calculadoras de herança costumam acertar o caso fácil — cônjuge, dois filhos,
um apartamento — e errar tudo o que vem depois. Esta foi escrita a partir das
regras que realmente decidem os casos difíceis:

| Ponto | Tratamento |
|---|---|
| Meação × herança | Separadas antes de qualquer partilha. A meação não é herança e não se divide. |
| Concorrência do cônjuge (art. 1.829, I) | Depende do regime. Comunhão universal e separação obrigatória afastam; separação convencional admite; comunhão parcial só com bens particulares. |
| Comunhão parcial com bens particulares | A concorrência recai **apenas** sobre os particulares (STJ, REsp 1.368.123/SP). Os bens comuns vão inteiros aos descendentes. |
| Reserva de 1/4 (art. 1.832) | Só quando o cônjuge é ascendente de todos os descendentes com quem concorre. Filiação híbrida é tratada como ponto controvertido, alternável. |
| Representação (arts. 1.851–1.855) | Recursiva, em quantas gerações forem necessárias. Pré-morto, comoriente, indigno e deserdado abrem representação. |
| Renúncia (art. 1.811) | Não se representa renunciante. Renunciando todos os filhos, os netos sobem **por cabeça** — não por estirpe. |
| Ascendentes (arts. 1.836–1.837) | Grau mais próximo exclui o remoto; divisão por linhas só quando as duas linhas têm representantes naquele grau. |
| Colaterais (arts. 1.839–1.843) | Bilateral herda o dobro do unilateral. Sobrinhos preferem tios. Com irmão vivo herdam por estirpe; sem nenhum, **por cabeça**. |
| União estável | Equiparada ao casamento (STF, Temas 809 e 498). O art. 1.790 não é aplicado. |
| Separação de fato > 2 anos | Afasta a herança, preserva a meação (art. 1.830). |
| Testamento | Legítima intocável; deixas que a invadem são reduzidas proporcionalmente. |
| Colação | Doação a descendente volta ao monte, a partilha se refaz e o donatário recebe descontado. Doação inoficiosa é sinalizada. |
| Vacância | Herança jacente → vacante → Município (arts. 1.819–1.822 e 1.844). |

### Aritmética exata

Partilha vive de terços, sextos e vinte-e-sete-avos. Ponto flutuante acumula
erro e faz a soma dos quinhões não fechar em 100%. Aqui todo cálculo é feito em
frações exatas sobre `BigInt` (`src/lib/fracao.ts`), e a conversão para dinheiro
usa maiores-restos, de modo que a soma dos quinhões é **sempre** exatamente a
herança líquida — sem centavo evaporando. Isso é verificado em teste para todos
os cenários.

---

## Rodando

```bash
npm install
npm run dev
```

Outros comandos:

```bash
npm test         # 60 testes cobrindo as regras de sucessão e o layout da árvore
npm run build    # gera dist/
npm run preview  # serve o build local
```

---

## Publicando

O `vite.config.ts` usa `base: './'`, então o `dist/` funciona em qualquer
hospedagem — inclusive em subpasta, como `usuario.github.io/repositorio/`.

**GitHub Pages** — já há um workflow em `.github/workflows/deploy.yml`. Basta:

1. Criar o repositório e dar push na branch `main`.
2. Em *Settings → Pages*, escolher **GitHub Actions** como origem.

O workflow roda os testes antes de publicar: se uma regra de sucessão quebrar,
nada vai ao ar.

**Vercel / Netlify / Cloudflare Pages** — build `npm run build`, diretório
`dist`. Sem variáveis de ambiente.

---

## Como o código está organizado

```
src/
  lib/
    fracao.ts        aritmética racional exata (BigInt) e repartição de centavos
    moeda.ts         conversão e formatação em BRL
    arvore.ts        manipulação da árvore de pessoas
    resumo.ts        exportação do resultado em texto
  engine/            ← o motor; não depende de React
    tipos.ts         modelo de domínio e tabela de regimes
    descendentes.ts  estirpes e direito de representação
    ascendentes.ts   graus e divisão por linhas
    colaterais.ts    irmãos, sobrinhos, tios e 4º grau
    calcular.ts      orquestra tudo: massa, vocação, legítima, colação
    __tests__/       60 testes
  components/
    ui/              primitivos de interface e conjunto de ícones
    wizard/          construção do caso e galeria de cenários
    arvore/          layout (puro) e renderização SVG da árvore
    resultado/       resumo, partilha, raciocínio passo a passo e ressalvas
  data/
    cenarios.ts      16 casos prontos
  store/
    caso.ts          o caso em edição e seu resultado
    tema.ts          preferência de tema (claro/escuro)
```

O motor (`src/engine/`) é independente da interface: não importa React, não toca
no DOM e pode ser reaproveitado noutro contexto — inclusive em Node.

---

## Limites

O cálculo é o da sucessão legítima em abstrato. **Ficam de fora:** ITCMD
(alíquota estadual, de 1% a 8%), custas e honorários de inventário, bens
impenhoráveis ou gravados, previdência privada (VGBL/PGBL, que em regra não
integra a herança), seguro de vida (que vai ao beneficiário, não ao espólio),
holdings familiares e usufrutos já constituídos.

Nos dois pontos em que a doutrina não é pacífica — concorrência na comunhão
parcial e reserva de 1/4 na filiação híbrida — a premissa adotada fica visível
e pode ser invertida em *Premissas interpretativas*, para comparar resultados.

Ferramenta de estudo e simulação. Não substitui a análise de um advogado no
caso concreto.
