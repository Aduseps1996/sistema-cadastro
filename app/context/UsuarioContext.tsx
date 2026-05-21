"use client"

import {
  createContext,
  useContext
} from "react"

// =====================================================
// TIPO DO USUÁRIO DO SISTEMA
// =====================================================
type UsuarioSistema = {
  nome: string
  email: string
  perfil: string
  ativo: boolean
}

// =====================================================
// TIPO DO CONTEXTO
// =====================================================
type UsuarioContextType = {
  usuarioSistema: UsuarioSistema | null
}

// =====================================================
// CONTEXTO DO USUÁRIO
// =====================================================
const UsuarioContext = createContext<UsuarioContextType>({
  usuarioSistema: null
})

// =====================================================
// PROVIDER DO USUÁRIO
// =====================================================
export function UsuarioProvider({
  children,
  usuarioSistema
}: {
  children: React.ReactNode
  usuarioSistema: UsuarioSistema | null
}) {
  return (
    <UsuarioContext.Provider value={{ usuarioSistema }}>
      {children}
    </UsuarioContext.Provider>
  )
}

// =====================================================
// HOOK PARA USAR O USUÁRIO NAS PÁGINAS
// =====================================================
export function useUsuario() {
  return useContext(UsuarioContext)
}