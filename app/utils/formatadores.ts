/* Primeira letra maiuscula */
export function formatarNome(nome: string) {

  const palavrasMinusculas = [
    "da",
    "de",
    "do",
    "das",
    "dos",
    "e"
  ]

  return nome
    .trim()
    .toLowerCase()
    .split(" ")
    .filter((palavra) => palavra !== "")
    .map((palavra, index) => {

      if (
        index !== 0 &&
        palavrasMinusculas.includes(palavra)
      ) {
        return palavra
      }

      return (
        palavra.charAt(0).toUpperCase() +
        palavra.slice(1)
      )
    })
    .join(" ")
}

/* Formata CPF */
export function formatarCPF(cpf: string) {

  const numeros = cpf.replace(/\D/g, "")

  return numeros
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

/* Formata Telefone */
export function formatarTelefone(telefone: string) {

  const numeros = telefone.replace(/\D/g, "")

  if (numeros.length === 11) {
    return numeros.replace(
      /(\d{2})(\d{5})(\d{4})/,
      "($1) $2-$3"
    )
  }

  return numeros.replace(
    /(\d{2})(\d{4})(\d{4})/,
    "($1) $2-$3"
  )
}