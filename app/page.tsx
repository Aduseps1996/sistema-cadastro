"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// =====================================================
// PÁGINA INICIAL DO SISTEMA
// =====================================================
// Essa é a rota raiz do projeto: "/".
//
// Como o sistema deve começar pelo login,
// essa página apenas redireciona o usuário para "/login".
export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/login")
  }, [router])

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <p className="text-sm text-zinc-400">
        Redirecionando para o login...
      </p>
    </main>
  )
}