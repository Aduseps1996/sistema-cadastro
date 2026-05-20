"use client"

import { useState } from "react"

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
      alert("Informe o e-mail.")
      return
    }

    if (senha.trim() === "") {
      alert("Informe a senha.")
      return
    }

    try {

      setCarregando(true)

      await signInWithEmailAndPassword(
        auth,
        email,
        senha
      )

      router.push("/sistema")

    } catch (error) {

      alert("E-mail ou senha inválidos.")

    } finally {

      setCarregando(false)

    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8">

        <h1 className="text-4xl font-black mb-2">
          ADUSEPS
        </h1>

        <p className="text-zinc-400 mb-8">
          Sistema Administrativo
        </p>

        <div className="space-y-4">

          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          />

          <button
            onClick={fazerLogin}
            disabled={carregando}
            className="w-full bg-blue-600 hover:bg-blue-700 transition rounded-xl py-3 font-bold disabled:opacity-50"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>

        </div>

      </div>

    </main>
  )
}