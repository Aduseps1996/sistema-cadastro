type BadgeStatusProps = {
  status: string
}

export function BadgeStatus({ status }: BadgeStatusProps) {

  const statusFormatado = status.toLowerCase()

  const estilos: Record<string, string> = {
    ativo: "bg-green-500/10 text-green-300 border-green-500/30",
    inativo: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30",
    aguardando: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
    "em atendimento": "bg-blue-500/10 text-blue-300 border-blue-500/30",
    finalizado: "bg-green-500/10 text-green-300 border-green-500/30",
    cancelado: "bg-red-500/10 text-red-300 border-red-500/30"
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