"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// =====================================================
// PÁGINA BASE DO SISTEMA
// =====================================================
// Essa rota é "/sistema".
//
// Como não existe uma tela principal solta em "/sistema",
// ela redireciona automaticamente para "/sistema/inicio".
export default function SistemaPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/sistema/inicio")
  }, [router])

  return (
    <div>
      <p className="text-sm text-zinc-400">
        Redirecionando para o início...
      </p>
    </div>
  )
}