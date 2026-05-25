type ToolbarPaginaProps = {
  titulo: string
  descricao?: string
  children?: React.ReactNode
}

export function ToolbarPagina({
  titulo,
  descricao,
  children
}: ToolbarPaginaProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {titulo}
        </h1>

        {descricao && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {descricao}
          </p>
        )}
      </div>

      {children && (
        <div className="w-full md:w-auto">
          {children}
        </div>
      )}
    </div>
  )
}