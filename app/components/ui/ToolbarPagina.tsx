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
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          {titulo}
        </h1>

        {descricao && (
          <p className="mt-1 text-sm text-zinc-500">
            {descricao}
          </p>
        )}
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-3">
          {children}
        </div>
      )}
    </div>
  )
}