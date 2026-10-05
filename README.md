# Partilha Justa

Calculadora de herança e partilha segundo o Código Civil brasileiro, com árvore
genealógica interativa, fundamentação artigo por artigo e **cumulação de
inventários** — vários falecidos ligados entre si no mesmo processo, como manda
o art. 672 do CPC.

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
| **Pós-morte do co-herdeiro** | Quem sobrevive ao autor da herança **herda** (art. 1.784), ainda que morra no dia seguinte. O quinhão entra no espólio dele e se reparte na sucessão dele — não vai aos filhos por representação. |
| **Inventário cumulativo** | Vários óbitos em ordem cronológica no mesmo processo. O que um herdou é somado ao acervo do inventário seguinte, e o app aponta qual inciso do art. 672 do CPC autoriza a cumulação. |

### Pré-morte e pós-morte não são a mesma coisa

É o erro mais caro da prática, e a razão de esta calculadora existir na forma
que tem. Um pai deixa R$ 900 mil e dois filhos; um deles morre depois, deixando
viúva e um filho:

| | Quem recebe |
|---|---|
| Filho morreu **antes** do pai | Neto representa e leva os R$ 450 mil sozinho. A viúva não recebe nada. |
| Filho morreu **depois** do pai | O filho herdou. Os R$ 450 mil entram no espólio dele, onde a viúva concorre com o neto: R$ 225 mil para cada. |

Um dia de diferença nas certidões move R$ 225 mil de lugar. O app trata as duas
hipóteses como situações distintas, calcula as duas cadeias até o fim e mostra
quanto sobra para cada pessoa somando **todas** as sucessões.

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
npm test         # 98 testes: regras de sucessão, cumulação, layout e exportações
npm run build    # gera dist/
npm run preview  # serve o build local
```

---

## Como se usa

Ao abrir, o app **não vem preenchido com dado nenhum**. Ele pergunta de onde
você quer partir: retomar o rascunho guardado neste navegador, começar um
processo em branco, ou carregar um dos 22 modelos. Nada do que se digita sai da
máquina — o rascunho fica em `localStorage` e o cálculo roda todo no navegador.

Um processo começa com um óbito. Para cumular, há dois caminhos:

- **Acrescentar falecido** na linha do tempo, e descrever a família dele; ou
- marcar um herdeiro como *faleceu depois* e clicar em **abrir o inventário
  dele(a)** — o app cria o segundo óbito já ligado, na posição cronológica
  certa, com os filhos daquela pessoa copiados (mesmos identificadores, para
  que a soma final feche) e o quinhão herdado já somado ao acervo.

A ordem dos cartões **é** a ordem dos óbitos, e é ela que decide quem herdou de
quem. Quando a ordem contradiz a situação declarada de alguém, o app avisa.

## Relatórios

Dois formatos, ambos gerados no navegador:

- **Planilha (.xlsx)** — uma aba por sucessão, mais processo, destino final,
  raciocínio e ressalvas. Valores como número, com formato de moeda e
  percentual, para que somas e conferências funcionem. Escrita sem
  dependências: o `.xlsx` é um ZIP de XML, e há um empacotador de ~120 linhas
  em `src/lib/exportar/`.
- **PDF** — capa com o total consolidado, uma página por sucessão, destino
  final dos bens, fundamentação por extenso e pontos de atenção. O gerador só
  é baixado quando alguém clica: sozinho ele pesa mais que o resto do
  aplicativo.

---

## Publicando

> **Atenção:** a publicação descrita abaixo é reservada ao titular. Copiar,
> hospedar, executar ou modificar o Software fora da implantação oficial exige
> licença comercial e pagamento de royalties - veja a seção [Licença](#licença).

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
    alertas.ts       reúne e deduplica as ressalvas do processo inteiro
    exportar/
      zip.ts         empacotador ZIP mínimo, sem dependências
      planilha.ts    escritor de .xlsx (estilos, moeda, percentual, mesclagem)
      xlsx.ts        as abas do relatório em planilha
      pdf.ts         o relatório em PDF, carregado sob demanda
  engine/            ← o motor; não depende de React
    tipos.ts         modelo de domínio e tabela de regimes
    descendentes.ts  estirpes e direito de representação
    ascendentes.ts   graus e divisão por linhas
    colaterais.ts    irmãos, sobrinhos, tios e 4º grau
    calcular.ts      orquestra tudo: massa, vocação, legítima, colação
    cumulativo.ts    a cadeia de óbitos, os aportes entre espólios e o consolidado
    __tests__/       98 testes
  components/
    ui/              primitivos de interface e conjunto de ícones
    wizard/          abertura, linha do tempo dos óbitos e construção do caso
    arvore/          layout (puro) e renderização SVG da árvore
    resultado/       resumo, partilha, destino final, raciocínio e ressalvas
  data/
    modelos.ts       22 casos prontos, 6 deles cumulativos
  store/
    inventario.ts    o processo em edição, os elos entre óbitos e o resultado
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

**No inventário cumulativo, a economia é processual e não tributária:** há
tantas transmissões *causa mortis* quantos forem os óbitos, e o ITCMD é devido
em cada uma, sobre o valor dos bens ao tempo de cada abertura de sucessão. O
mesmo bem pode ser tributado duas vezes em poucos meses. O app avisa, mas não
calcula o imposto.

Ferramenta de estudo e simulação. Não substitui a análise de um advogado no
caso concreto.

---

## Licença

Software proprietário, com código-fonte visível apenas para consulta - **não é
código aberto**. Termos integrais em [`LICENSE`](LICENSE).

- **Uso gratuito:** liberado a qualquer pessoa, inclusive para fins
  profissionais, exclusivamente na implantação oficial,
  <https://cocotalouca.github.io/calcular-heranca/>.
- **Qualquer outro uso** (copiar, hospedar, executar, modificar, criar obra
  derivada ou incorporar o código, no todo ou em parte) depende de licença
  comercial prévia e por escrito, com royalties de **US$ 1.000,00 por mês de
  uso, por instância**.
- Licenciamento comercial: contato@pfbadv.com
