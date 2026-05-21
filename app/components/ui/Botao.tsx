type BotaoProps = {
  children: React.ReactNode
  onClick?: () => void
  type?: "button" | "submit"
  variante?: "primario" | "secundario" | "perigo"
  className?: string
}

export function Botao({
  children,
  onClick,
  type = "button",
  variante = "primario",
  className = ""
}: BotaoProps) {

  const estilos = {
    primario:
      "bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/40",
    secundario:
      "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700",
    perigo:
      "bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30"
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={`
        rounded-xl px-4 py-2.5 text-sm font-semibold
        transition disabled:opacity-50 disabled:cursor-not-allowed
        ${estilos[variante]}
        ${className}
      `}
    >
      {children}
    </button>
  )
}