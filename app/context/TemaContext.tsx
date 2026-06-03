"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react"

// =====================================================
// TIPOS DO TEMA
// =====================================================
type Tema = "dark" | "light"

type TemaContextType = {
  tema: Tema
  alternarTema: () => void
}

// =====================================================
// CONTEXTO DO TEMA
// =====================================================
const TemaContext = createContext<TemaContextType>({
  tema: "dark",
  alternarTema: () => {}
})

// =====================================================
// PROVIDER DO TEMA
// =====================================================
export function TemaProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [tema, setTema] = useState<Tema>(() => {
    if (typeof window === "undefined") return "dark"
    return (localStorage.getItem("tema") as Tema) || "dark"
  })

  useEffect(() => {
    document.documentElement.classList.remove("dark", "light")
    document.documentElement.classList.add(tema)
  }, [tema])

  function alternarTema() {
    const novoTema =
      tema === "dark" ? "light" : "dark"

    setTema(novoTema)

    localStorage.setItem("tema", novoTema)

    document.documentElement.classList.remove("dark", "light")
    document.documentElement.classList.add(novoTema)
  }

  return (
    <TemaContext.Provider value={{ tema, alternarTema }}>
      {children}
    </TemaContext.Provider>
  )
}

// =====================================================
// HOOK PARA USAR O TEMA NAS PÁGINAS
// =====================================================
export function useTema() {
  return useContext(TemaContext)
}