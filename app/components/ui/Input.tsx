type InputProps = {
  label?: string
  value: string
  onChange: (valor: string) => void
  placeholder?: string
  type?: string
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: InputProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-zinc-300">
          {label}
        </span>
      )}

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          h-11 w-full rounded-xl border border-zinc-700
          bg-zinc-900 px-4 text-sm text-zinc-100
          outline-none transition
          placeholder:text-zinc-500
          focus:border-blue-500/60
          focus:ring-2 focus:ring-blue-500/20
        "
      />
    </label>
  )
}