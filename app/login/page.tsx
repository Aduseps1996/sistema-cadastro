"use client"

import { useState } from "react"
import { toast, Toaster } from "sonner"

import { signInWithEmailAndPassword } from "firebase/auth"

import { auth } from "../../lib/firebase"

import { useRouter } from "next/navigation"

export default function LoginPage() {

  const router = useRouter()

  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [carregando, setCarregando] = useState(false)

  async function fazerLogin() {

    if (email.trim() === "") {
      toast.warning("Informe o e-mail.")
      return
    }

    if (senha.trim() === "") {
      toast.warning("Informe a senha.")
      return
    }

    try {
      setCarregando(true)

      await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        senha
      )

      router.replace("/sistema/inicio")

    } catch (error) {
      toast.error("E-mail ou senha inválidos.")
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">

      <Toaster
        richColors
        position="top-right"
        theme="dark"
      />

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8">

        <h1 className="text-4xl font-black mb-2">
          ADUSEPS
        </h1>

        <p className="text-zinc-400 mb-8">
          Sistema Administrativo
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            fazerLogin()
          }}
        >

          <input
            className="
              h-11 w-full rounded-xl border border-zinc-700
              bg-zinc-800 px-4 text-sm text-zinc-100
              outline-none transition
              placeholder:text-zinc-500
              focus:border-blue-500/60
              focus:ring-2 focus:ring-blue-500/20
            "
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="
              h-11 w-full rounded-xl border border-zinc-700
              bg-zinc-800 px-4 text-sm text-zinc-100
              outline-none transition
              placeholder:text-zinc-500
              focus:border-blue-500/60
              focus:ring-2 focus:ring-blue-500/20
            "
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          <button
            type="submit"
            disabled={carregando}
            className="
              h-11 w-full rounded-xl
              border border-blue-500/40
              bg-blue-600 text-sm font-semibold text-white
              transition hover:bg-blue-500
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>

        </form>

      </div>

    </main>
  )
}