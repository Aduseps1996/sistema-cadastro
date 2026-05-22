"use client"

import { useState } from "react"
import { toast, Toaster } from "sonner"

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "firebase/auth"

import {
  doc,
  getDoc
} from "firebase/firestore"

import {
  auth,
  db
} from "../../lib/firebase"

import { useRouter } from "next/navigation"

import {
  Eye,
  EyeOff
} from "lucide-react"

export default function LoginPage() {

  const router = useRouter()

  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [carregando, setCarregando] = useState(false)

  // =====================================================
  // CONTROLE DE VISIBILIDADE DA SENHA
  // =====================================================
  const [mostrarSenha, setMostrarSenha] = useState(false)

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

        const credencial = await signInWithEmailAndPassword(
          auth,
          email.trim().toLowerCase(),
          senha
        )

        const usuarioRef = doc(
          db,
          "usuarios",
          credencial.user.uid
        )

        const usuarioSnap = await getDoc(usuarioRef)

        if (!usuarioSnap.exists()) {
          await signOut(auth)
          toast.error("Usuário sem permissão no sistema.")
          return
        }

        const dadosUsuario = usuarioSnap.data()

        if (!dadosUsuario.ativo) {
          await signOut(auth)
          toast.warning("Usuário inativo. Procure o administrador.")
          return
        }

        router.replace("/sistema/inicio")

      } catch (error) {
        console.error(error)
        toast.error("E-mail ou senha inválidos.")

      } finally {
        setCarregando(false)
      }
    }

  // =====================================================
  // REDEFINIÇÃO DE SENHA
  // =====================================================
  async function redefinirSenha() {

    if (email.trim() === "") {
      toast.warning("Informe o e-mail para redefinir a senha.")
      return
    }

    try {

      await sendPasswordResetEmail(
        auth,
        email.trim().toLowerCase()
      )

      toast.success(
        "E-mail de redefinição enviado."
      )

    } catch (error) {

      console.error(error)

      toast.error(
        "Não foi possível enviar o e-mail."
      )
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

          {/* =====================================================
              CAMPO SENHA
              ===================================================== */}
          <div className="relative">

            <input
              className="
                h-11 w-full rounded-xl border border-zinc-700
                bg-zinc-800 px-4 pr-12 text-sm text-zinc-100
                outline-none transition
                placeholder:text-zinc-500
                focus:border-blue-500/60
                focus:ring-2 focus:ring-blue-500/20
              "
              type={mostrarSenha ? "text" : "password"}
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />

            {/* =====================================================
                BOTÃO MOSTRAR SENHA
                ===================================================== */}
            <button
              type="button"
              onClick={() =>
                setMostrarSenha(!mostrarSenha)
              }
              className="
                absolute right-3 top-1/2
                -translate-y-1/2
                text-zinc-400 transition
                hover:text-zinc-200
              "
            >
              {mostrarSenha ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>

          </div>

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

          {/* =====================================================
              LINK REDEFINIR SENHA
              ===================================================== */}
          <button
            type="button"
            onClick={redefinirSenha}
            className="
              w-full text-center text-sm text-zinc-400
              transition hover:text-zinc-200
            "
          >
            Esqueci minha senha
          </button>

        </form>

      </div>

    </main>
  )
}