type InputProps = {
  type?: string
  placeholder?: string
  value: string
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void
  disabled?: boolean
  className?: string
}

export function Input({
  type = "text",
  placeholder,
  value,
  onChange,
  disabled,
  className = ""
}: InputProps) {

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`
        h-11 w-full rounded-xl border border-zinc-300
        bg-white px-4 text-sm text-zinc-900
        outline-none transition
        placeholder:text-zinc-400
        focus:border-blue-500/60
        focus:ring-2 focus:ring-blue-500/20
        disabled:cursor-not-allowed
        disabled:opacity-50
        dark:border-zinc-700
        dark:bg-zinc-950
        dark:text-zinc-100
        dark:placeholder:text-zinc-500
        ${className}
      `}
    />
  )
}