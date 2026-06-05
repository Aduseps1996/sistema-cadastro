type BadgeStatusProps = {
  status: string
}

export function BadgeStatus({ status }: BadgeStatusProps) {

  const statusFormatado = (status || "inativo").toLowerCase()

  const estilos: Record<string, string> = {
    ativo: "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-300",
    inativo: "bg-zinc-500/10 text-zinc-700 border-zinc-500/30 dark:text-zinc-300",
    aguardando: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:text-yellow-300",
    "em atendimento":"bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-300",
    finalizado: "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-300",
    cancelado:  "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300",
  }

  return (
    <span
      className={`
        inline-flex items-center rounded-full border px-2.5 py-1
        text-xs font-semibold
        ${estilos[statusFormatado] || estilos.inativo}
      `}
    >
      {status}
    </span>
  )
}