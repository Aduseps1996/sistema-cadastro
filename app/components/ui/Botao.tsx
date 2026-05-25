type BotaoProps = {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit"
  variante?: 
    |"primario" 
    | "secundario" 
    | "perigo" 
    | "sucesso"
    | "info"
  className?: string
}

export function Botao({
  children,
  onClick,
  disabled,
  type = "button",
  variante = "primario",
  className = ""
}: BotaoProps) {

  const estilos = {

    primario:
      "bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/40",

    secundario:
      `
        bg-white hover:bg-zinc-100
        text-zinc-800 border border-zinc-300

        dark:bg-zinc-800
        dark:hover:bg-zinc-700
        dark:text-zinc-100
        dark:border-zinc-700
      `,
    
    perigo:
      `
        border-red-500/30
        bg-red-500/10
        text-red-600
        hover:bg-red-500/20
        dark:text-red-300
      `,

    sucesso:
      `
        border-green-500/30
        bg-green-500/10
        text-green-700
        hover:bg-green-500/20
        dark:text-green-300
      `,

    info:
      `
        border-blue-500/30
        bg-blue-500/10
        text-blue-700
        hover:bg-blue-500/20
        dark:text-blue-300
      `
    
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-xl border px-4 py-2.5 text-sm font-semibold
        transition disabled:opacity-50 disabled:cursor-not-allowed
        ${estilos[variante]}
        ${className}
      `}
    >
      {children}
    </button>
  )
}

