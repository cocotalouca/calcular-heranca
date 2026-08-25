/**
 * Conjunto mínimo de ícones desenhados a traço.
 *
 * São poucos e feitos à mão de propósito: emoji muda de desenho conforme o
 * sistema operacional e nunca acompanha a cor do texto. Traço de 1,6 no grid
 * de 24, tudo em currentColor.
 */

type Props = { className?: string; tamanho?: number }

function Svg({
  children,
  className = '',
  tamanho = 18,
}: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/* --------------------------- classes de herdeiro --------------------------- */

/** Duas alianças entrelaçadas — cônjuge ou companheiro. */
export const IconeConjuge = (p: Props) => (
  <Svg {...p}>
    <circle cx="9" cy="14" r="5.2" />
    <circle cx="15" cy="14" r="5.2" />
    <path d="M9 5.2 10.6 7.6h-3.2L9 5.2Z" />
  </Svg>
)

/** Tronco que desce e se abre — descendentes. */
export const IconeDescendentes = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="4.6" r="2.2" />
    <path d="M12 6.8v4.4M5.5 17v-1.2a6.5 6.5 0 0 1 13 0V17" />
    <circle cx="5.5" cy="19.4" r="2.2" />
    <circle cx="18.5" cy="19.4" r="2.2" />
  </Svg>
)

/** Duas raízes que sobem e se encontram — ascendentes. */
export const IconeAscendentes = (p: Props) => (
  <Svg {...p}>
    <circle cx="5.5" cy="4.6" r="2.2" />
    <circle cx="18.5" cy="4.6" r="2.2" />
    <path d="M5.5 6.8v1.4a6.5 6.5 0 0 0 13 0V6.8M12 12.6v4.6" />
    <circle cx="12" cy="19.4" r="2.2" />
  </Svg>
)

/** Duas figuras lado a lado — colaterais. */
export const IconeColaterais = (p: Props) => (
  <Svg {...p}>
    <circle cx="8" cy="7.5" r="3" />
    <circle cx="17" cy="8.5" r="2.4" />
    <path d="M2.8 19.2a5.2 5.2 0 0 1 10.4 0M14.8 13.6a4.6 4.6 0 0 1 6.4 4.3" />
  </Svg>
)

/* ------------------------------- patrimônio ------------------------------- */

/** Frontão clássico sobre colunas — o acervo. */
export const IconePatrimonio = (p: Props) => (
  <Svg {...p}>
    <path d="M3.2 9.2 12 4.2l8.8 5M5.5 9.6v8M10 9.6v8M14 9.6v8M18.5 9.6v8M3.4 20.2h17.2" />
  </Svg>
)

/** Pergaminho lacrado — testamento e doações. */
export const IconeTestamento = (p: Props) => (
  <Svg {...p}>
    <path d="M6.5 2.8h8.2l4 4v14.4H6.5z" />
    <path d="M14.7 2.8v4h4M9.4 11h5.2M9.4 14.4h5.2M9.4 17.8h3" />
  </Svg>
)

/** Balança em equilíbrio — a marca e as premissas interpretativas. */
export const IconeBalanca = (p: Props) => (
  <Svg {...p}>
    <path d="M12 3.4v16.4M7.4 20.6h9.2M4.6 6.6h14.8M12 6.6 8.6 6.2" />
    <path d="M4.6 6.6 2.2 12.4a2.6 2.6 0 0 0 4.8 0L4.6 6.6ZM19.4 6.6 17 12.4a2.6 2.6 0 0 0 4.8 0L19.4 6.6Z" />
  </Svg>
)

/* -------------------------------- interface -------------------------------- */

export const IconeSol = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.6v2.2M12 19.2v2.2M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.4 19.6 6 18M18 6l1.6-1.6" />
  </Svg>
)

export const IconeLua = (p: Props) => (
  <Svg {...p}>
    <path d="M20.4 14.2A8.6 8.6 0 0 1 9.8 3.6a8.6 8.6 0 1 0 10.6 10.6Z" />
  </Svg>
)

export const IconeLivro = (p: Props) => (
  <Svg {...p}>
    <path d="M4 4.4h5.2A2.8 2.8 0 0 1 12 7.2v13a2.2 2.2 0 0 0-2.2-2.2H4z" />
    <path d="M20 4.4h-5.2A2.8 2.8 0 0 0 12 7.2v13a2.2 2.2 0 0 1 2.2-2.2H20z" />
  </Svg>
)

export const IconeCopiar = (p: Props) => (
  <Svg {...p}>
    <rect x="8.6" y="8.6" width="12" height="12" rx="2.6" />
    <path d="M15.4 5.4A2.6 2.6 0 0 0 12.8 3.4H6a2.6 2.6 0 0 0-2.6 2.6v6.8a2.6 2.6 0 0 0 2 2.5" />
  </Svg>
)

export const IconeCheck = (p: Props) => (
  <Svg {...p}>
    <path d="m4.6 12.6 4.8 4.8 10-11" />
  </Svg>
)

export const IconeFechar = (p: Props) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

export const IconeMais = (p: Props) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const IconeMenos = (p: Props) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
)

export const IconeSeta = (p: Props) => (
  <Svg {...p}>
    <path d="M4.5 12h14M13 6.5l5.5 5.5-5.5 5.5" />
  </Svg>
)

export const IconeChevron = (p: Props) => (
  <Svg {...p}>
    <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
  </Svg>
)

export const IconeRecomecar = (p: Props) => (
  <Svg {...p}>
    <path d="M20 11.4a8 8 0 1 0-.8 4.4" />
    <path d="M20.4 4.6v6h-6" />
  </Svg>
)

export const IconeLupa = (p: Props) => (
  <Svg {...p}>
    <circle cx="10.8" cy="10.8" r="6.6" />
    <path d="m15.8 15.8 4.4 4.4" />
  </Svg>
)

export const IconeEnquadrar = (p: Props) => (
  <Svg {...p}>
    <path d="M4 9V5.6A1.6 1.6 0 0 1 5.6 4H9M15 4h3.4A1.6 1.6 0 0 1 20 5.6V9M20 15v3.4a1.6 1.6 0 0 1-1.6 1.6H15M9 20H5.6A1.6 1.6 0 0 1 4 18.4V15" />
  </Svg>
)
