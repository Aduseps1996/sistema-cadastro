"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast, Toaster } from "sonner"

import { onAuthStateChanged, signOut } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

import { auth, db } from "../../lib/firebase"

import { podeAcessarPagina } from "../utils/permissoes"
import { UsuarioProvider } from "../context/UsuarioContext"
import { TemaProvider, useTema } from "../context/TemaContext"

type UsuarioSistema = {
  nome: string
  email: string
  perfil: string
  ativo: boolean
}

type ItemMenu = {
  nome: string
  href: string
  grupo: "OPERACIONAL" | "CADASTROS" | "ADMINISTRAÇÃO"
}

const itensMenu: ItemMenu[] = [
  { nome: "Início", href: "/sistema/inicio", grupo: "OPERACIONAL" },
  { nome: "Atendimentos", href: "/sistema/atendimentos", grupo: "OPERACIONAL" },
  { nome: "Escala de Atendimentos", href: "/sistema/escala-atendimentos", grupo: "OPERACIONAL" },
  { nome: "Pessoas", href: "/sistema/pessoas", grupo: "CADASTROS" },
  { nome: "Associados", href: "/sistema/associados", grupo: "CADASTROS" },
  { nome: "Representantes", href: "/sistema/representantes", grupo: "CADASTROS" },
  { nome: "Cargos", href: "/sistema/cargos", grupo: "CADASTROS" },
  { nome: "Profissionais", href: "/sistema/profissionais", grupo: "CADASTROS" },
  { nome: "Convênios", href: "/sistema/convenios", grupo: "CADASTROS" },
  { nome: "Usuários", href: "/sistema/usuarios", grupo: "ADMINISTRAÇÃO" },
]

export default function SistemaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TemaProvider>
      <SistemaLayoutConteudo>{children}</SistemaLayoutConteudo>
    </TemaProvider>
  )
}

function SistemaLayoutConteudo({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  const { tema, alternarTema } = useTema()

  const [carregando, setCarregando] = useState(true)
  const [usuarioEmail, setUsuarioEmail] = useState("")
  const [usuarioSistema, setUsuarioSistema] =
    useState<UsuarioSistema | null>(null)

  useEffect(() => {
    if (!carregando) return

    const tempo = setTimeout(() => {
      window.location.reload()
    }, 3000)

    return () => clearTimeout(tempo)
  }, [carregando])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        router.replace("/login")
        return
      }

      setUsuarioEmail(usuario.email || "")

      try {
        const usuarioRef = doc(db, "usuarios", usuario.uid)
        const usuarioSnap = await getDoc(usuarioRef)

        if (!usuarioSnap.exists()) {
          toast.warning("Usuário sem permissão no sistema.")
          await signOut(auth)
          router.replace("/login")
          return
        }

        const dadosUsuario = usuarioSnap.data() as UsuarioSistema

        if (!dadosUsuario.ativo) {
          toast.warning("Usuário inativo.")
          await signOut(auth)
          router.replace("/login")
          return
        }

        setUsuarioSistema(dadosUsuario)

        const permitido = podeAcessarPagina(
          dadosUsuario.perfil,
          pathname
        )

        if (!permitido) {
          router.replace("/sistema/inicio")
          return
        }

        setCarregando(false)
      } catch (error) {
        console.error(error)

        toast.error("Erro ao validar acesso ao sistema.")

        await signOut(auth)
        router.replace("/login")

        setCarregando(false)
      }
    })

    return () => unsubscribe()
  }, [router, pathname])

  useEffect(() => {
    function aoVoltarDoCache(event: PageTransitionEvent) {
      if (event.persisted) {
        window.location.reload()
      }
    }

    window.addEventListener("pageshow", aoVoltarDoCache)

    return () => {
      window.removeEventListener("pageshow", aoVoltarDoCache)
    }
  }, [])

  async function sair() {
    await signOut(auth)
    router.replace("/login")
  }

  function podeVer(item: string) {
    const perfil = usuarioSistema?.perfil

    if (perfil === "Administrador") return true

    if (perfil === "Recepção") {
      return [
        "Início",
        "Atendimentos",
        "Escala de Atendimentos",
        "Pessoas",
        "Associados",
        "Representantes"
      ].includes(item)
    }

    if (perfil === "Atendente") {
      return [
        "Início", 
        "Atendimentos", 
        "Escala de Atendimentos"
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

  if (carregando) {
    return (
      <main className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex items-center justify-center">
        <div className="rounded-2xl border border-zinc-300 bg-white px-6 py-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Carregando sistema...
          </p>
        </div>
      </main>
    )
  }

  const itensVisiveis = itensMenu.filter((item) => podeVer(item.nome))

  const gruposMenu = [
    "OPERACIONAL",
    "CADASTROS",
    "ADMINISTRAÇÃO"
  ] as const

  return (
    <UsuarioProvider usuarioSistema={usuarioSistema}>
      <main className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex">
        <aside className="w-72 h-screen sticky top-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
          <div className="px-5 py-5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 overflow-hidden rounded-xl bg-white p-1 shadow-sm border border-zinc-200">
                <Image
                  src="/logos/logo.png"
                  alt="Logo ADUSEPS"
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              <div className="min-w-0">
                <h1 className="text-xl font-black tracking-tight leading-tight text-zinc-900 dark:text-zinc-100">
                  ADUSEPS
                </h1>

                <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-tight">
                  Sistema Administrativo
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-6">
              {gruposMenu.map((grupo) => {
                const itensDoGrupo = itensVisiveis.filter(
                  (item) => item.grupo === grupo
                )

                if (itensDoGrupo.length === 0) return null

                return (
                  <div key={grupo}>
                    <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
                      {grupo}
                    </p>

                    <div className="space-y-1">
                      {itensDoGrupo.map((item) => {
                        const ativo = pathname === item.href

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                              ativo
                                ? "bg-blue-50 text-blue-700 dark:bg-zinc-800 dark:text-white"
                                : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100"
                            }`}
                          >
                            {ativo && (
                              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-blue-500" />
                            )}

                            <span className="pl-2">
                              {item.nome}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={sair}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Sair
            </button>
          </div>
        </aside>

        <section className="flex-1 min-w-0 flex flex-col">
          <header className="
            sticky top-0 z-40
            h-16 border-b border-zinc-200
            bg-white/80 backdrop-blur
            dark:border-zinc-800
            dark:bg-zinc-950/80
            flex items-center justify-between px-8
          ">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Sistema Administrativo
                </p>

                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  Controle interno da ADUSEPS
                </p>
              </div>

              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                Ambiente de Teste
              </span>
            </div>

            <div className="hidden md:flex items-center gap-3 text-right">
              <button
                type="button"
                onClick={alternarTema}
                className="rounded-lg mr-8 border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                {tema === "dark" ? "Tema claro" : "Tema escuro"}
              </button>

              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {usuarioSistema?.nome || usuarioEmail}
                </p>

                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  {usuarioSistema?.perfil}
                </p>
              </div>

              <div className="w-9 h-9 rounded-full bg-zinc-100 border border-zinc-300 flex items-center justify-center text-sm font-bold text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300">
                {(usuarioSistema?.nome || usuarioEmail || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-950 p-8">
            <div className="mx-auto w-full max-w-[1600px]">
              {children}
            </div>
          </div>
        </section>

        <Toaster
          richColors
          position="top-right"
          theme={tema === "dark" ? "dark" : "light"}
        />
      </main>
    </UsuarioProvider>
  )
}