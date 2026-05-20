"use client"

import Link from "next/link"

import { useEffect, useState } from "react"
import Image from "next/image"

import {
  onAuthStateChanged,
  signOut
} from "firebase/auth"

import {
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore"

import {
  auth,
  db
} from "../../lib/firebase"

import { useRouter, usePathname } from "next/navigation"

import { podeAcessarPagina } from "../utils/permissoes"

type UsuarioSistema = {
  nome: string
  email: string
  perfil: string
  ativo: boolean
}

export default function SistemaLayout({
  children,
}: {
  children: React.ReactNode
}) {

  const router = useRouter()

  const pathname = usePathname()

  const [carregando, setCarregando] = useState(true)

  const [usuarioEmail, setUsuarioEmail] = useState("")

  const [usuarioSistema, setUsuarioSistema] =
    useState<UsuarioSistema | null>(null)

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(
      auth,
      async (usuario) => {

        if (!usuario) {
          router.push("/login")
          return
        }

        setUsuarioEmail(usuario.email || "")

        const consultaUsuario = query(
          collection(db, "usuarios"),
          where("email", "==", usuario.email)
        )

        const resultado = await getDocs(consultaUsuario)

        if (resultado.empty) {

          alert("Usuário sem permissão no sistema.")

          await signOut(auth)

          router.push("/login")

          return
        }

        const dadosUsuario =
          resultado.docs[0].data() as UsuarioSistema

        if (!dadosUsuario.ativo) {

          alert("Usuário inativo.")

          await signOut(auth)

          router.push("/login")

          return
        }

        setUsuarioSistema(dadosUsuario)

        const permitido = podeAcessarPagina(
          dadosUsuario.perfil,
          pathname
        )

        if (!permitido) {

          alert("Você não tem permissão para acessar esta página.")

          router.push("/sistema/inicio")

          return
        }

        setCarregando(false)
      }
    )

    return () => unsubscribe()

  }, [router, pathname])

  async function sair() {

    await signOut(auth)

    router.push("/login")
  }

  if (carregando) {

    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p>Carregando...</p>
      </main>
    )
  }

  function podeVer(item: string) {
    const perfil = usuarioSistema?.perfil

    if (perfil === "Administrador") {
      return true
    }

    if (perfil === "Recepção") {
      return [
        "Início",
        "Atendimentos",
        "Pessoas",
        "Associados",
        "Representantes"
      ].includes(item)
    }

    if (perfil === "Atendente") {
      return [
        "Início",
        "Atendimentos"
      ].includes(item)
    }

    if (perfil === "Consulta") {
      return [
        "Início",
        "Atendimentos",
        "Pessoas",
        "Associados",
        "Representantes"
      ].includes(item)
    }

    return false
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex">

      <aside className="w-72 h-screen sticky top-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">

        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-4">

            <div className="relative w-14 h-14 overflow-hidden rounded-2xl bg-white p-1">
              <Image
                src="/logos/logo.png"
                alt="Logo ADUSEPS"
                fill
                className="object-contain"
                priority
              />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight">
                ADUSEPS
              </h1>

              <p className="text-zinc-500 text-sm">
                Sistema Administrativo
              </p>
            </div>

          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          <nav className="space-y-2">

            {podeVer("Início") && (
              <Link
                href="/sistema/inicio"
                className="block px-4 py-3 rounded-xl hover:bg-zinc-800"
              >
                Início
              </Link>
            )}

            {podeVer("Atendimentos") && (
              <Link
                href="/sistema/atendimentos"
                className="block px-4 py-3 rounded-xl hover:bg-zinc-800"
              >
                Atendimentos
              </Link>
            )}

            {podeVer("Pessoas") && (
              <Link
                href="/sistema/pessoas"
                className="block px-4 py-3 rounded-xl hover:bg-zinc-800"
              >
                Pessoas
              </Link>
            )}

            {podeVer("Associados") && (
              <Link
                href="/sistema/associados"
                className="block px-4 py-3 rounded-xl hover:bg-zinc-800"
              >
                Associados
              </Link>
            )}

            {podeVer("Representantes") && (
              <Link
                href="/sistema/representantes"
                className="block px-4 py-3 rounded-xl hover:bg-zinc-800"
              >
                Representantes
              </Link>
            )}

            {podeVer("Cargos") && (
              <Link
                href="/sistema/cargos"
                className="block px-4 py-3 rounded-xl hover:bg-zinc-800"
              >
                Cargos
              </Link>
            )}

            {podeVer("Profissionais") && (
              <Link
                href="/sistema/profissionais"
                className="block px-4 py-3 rounded-xl hover:bg-zinc-800"
              >
                Profissionais
              </Link>
            )}

            {podeVer("Convênios") && (
              <Link
                href="/sistema/convenios"
                className="block px-4 py-3 rounded-xl hover:bg-zinc-800"
              >
                Convênios
              </Link>
            )}

            {podeVer("Usuários") && (
              <Link
                href="/sistema/usuarios"
                className="block px-4 py-3 rounded-xl hover:bg-zinc-800"
              >
                Usuários
              </Link>
            )}

          </nav>

        </div>

        <div className="p-6 border-t border-zinc-800">

          <div className="bg-zinc-800 rounded-xl p-4 mb-4">

            <p className="text-sm text-zinc-400">
              Usuário logado
            </p>

            <p className="font-bold break-all">
              {usuarioSistema?.nome || usuarioEmail}
            </p>

            <p className="text-sm text-zinc-400 mt-1">
              {usuarioSistema?.perfil}
            </p>

          </div>

          <button
            onClick={sair}
            className="w-full bg-zinc-800 hover:bg-zinc-700 transition rounded-xl py-3 font-bold"
          >
            Sair
          </button>

        </div>

      </aside>

      <section className="flex-1 p-8 overflow-auto">
        {children}
      </section>

    </main>
  )
}