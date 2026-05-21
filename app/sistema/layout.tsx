"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Toaster } from "sonner"

import {
  onAuthStateChanged,
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

import { podeAcessarPagina } from "../utils/permissoes"
import { UsuarioProvider } from "../context/UsuarioContext"

// =====================================================
// TIPO DO USUÁRIO DO SISTEMA
// =====================================================
// Define o formato dos dados do usuário buscado na coleção "usuarios".
// Esse tipo ajuda o TypeScript a entender quais campos existem no usuário.
type UsuarioSistema = {
  nome: string
  email: string
  perfil: string
  ativo: boolean
}

// =====================================================
// TIPO DOS ITENS DO MENU LATERAL
// =====================================================
// Cada item do menu tem:
// - nome: texto exibido no menu;
// - href: rota da página;
// - grupo: categoria visual dentro da sidebar.
type ItemMenu = {
  nome: string
  href: string
  grupo: "OPERACIONAL" | "CADASTROS" | "ADMINISTRAÇÃO"
}

// =====================================================
// LISTA CENTRALIZADA DOS ITENS DO MENU
// =====================================================
// Em vez de repetir vários <Link> manualmente, o menu fica em uma lista.
// Isso deixa mais fácil adicionar, remover ou reorganizar páginas depois.
const itensMenu: ItemMenu[] = [
  {
    nome: "Início",
    href: "/sistema/inicio",
    grupo: "OPERACIONAL"
  },
  {
    nome: "Atendimentos",
    href: "/sistema/atendimentos",
    grupo: "OPERACIONAL"
  },
  {
    nome: "Pessoas",
    href: "/sistema/pessoas",
    grupo: "CADASTROS"
  },
  {
    nome: "Associados",
    href: "/sistema/associados",
    grupo: "CADASTROS"
  },
  {
    nome: "Representantes",
    href: "/sistema/representantes",
    grupo: "CADASTROS"
  },
  {
    nome: "Cargos",
    href: "/sistema/cargos",
    grupo: "CADASTROS"
  },
  {
    nome: "Profissionais",
    href: "/sistema/profissionais",
    grupo: "CADASTROS"
  },
  {
    nome: "Convênios",
    href: "/sistema/convenios",
    grupo: "CADASTROS"
  },
  {
    nome: "Usuários",
    href: "/sistema/usuarios",
    grupo: "ADMINISTRAÇÃO"
  }
]

export default function SistemaLayout({
  children,
}: {
  children: React.ReactNode
}) {

  // =====================================================
  // HOOKS DE ROTA
  // =====================================================
  // router: usado para redirecionar o usuário.
  // pathname: usado para saber qual página está aberta e marcar o menu ativo.
  const router = useRouter()
  const pathname = usePathname()

  // =====================================================
  // ESTADOS DO LAYOUT
  // =====================================================
  // carregando: controla a tela inicial enquanto valida login/permissão.
  // usuarioEmail: guarda o e-mail vindo do Firebase Auth.
  // usuarioSistema: guarda os dados completos vindos da coleção "usuarios".
  const [carregando, setCarregando] = useState(true)
  const [usuarioEmail, setUsuarioEmail] = useState("")

  const [usuarioSistema, setUsuarioSistema] =
    useState<UsuarioSistema | null>(null)

  // =====================================================
  // AUTENTICAÇÃO E AUTORIZAÇÃO
  // =====================================================
  // Esse bloco roda sempre que a autenticação muda ou quando a rota muda.
  // Ele verifica:
  // 1. Se existe usuário logado;
  // 2. Se o usuário existe na coleção "usuarios";
  // 3. Se o usuário está ativo;
  // 4. Se o perfil dele pode acessar a página atual.
  useEffect(() => {

    const unsubscribe = onAuthStateChanged(
      auth,
      async (usuario) => {

        // ---------------------------------------------
        // USUÁRIO NÃO LOGADO
        // ---------------------------------------------
        if (!usuario) {
          router.replace("/login")
          return
        }

        setUsuarioEmail(usuario.email || "")

        // ---------------------------------------------
        // BUSCA DO USUÁRIO NA COLEÇÃO "usuarios"
        // ---------------------------------------------
        const usuarioRef = doc(db, "usuarios", usuario.uid)

          const usuarioSnap = await getDoc(usuarioRef)

          if (!usuarioSnap.exists()) {
            alert("Usuário sem permissão no sistema.")

            await signOut(auth)

            router.replace("/login")
            return
          }

          const dadosUsuario =
            usuarioSnap.data() as UsuarioSistema
        // ---------------------------------------------
        // USUÁRIO INATIVO
        // ---------------------------------------------
        if (!dadosUsuario.ativo) {
          alert("Usuário inativo.")

          await signOut(auth)

          router.replace("/login")
          return
        }

        setUsuarioSistema(dadosUsuario)

        // ---------------------------------------------
        // PERMISSÃO POR ROTA
        // ---------------------------------------------
        const permitido = podeAcessarPagina(
          dadosUsuario.perfil,
          pathname
        )

        if (!permitido) {
          router.replace("/sistema/inicio")
          return
        }

        // ---------------------------------------------
        // SISTEMA LIBERADO
        // ---------------------------------------------
        setCarregando(false)
      }
    )

    return () => unsubscribe()

    }, [router, pathname])

  // =====================================================
  // FUNÇÃO DE SAIR DO SISTEMA
  // =====================================================
  // Encerra a sessão no Firebase Auth e volta para a tela de login.
  async function sair() {
    await signOut(auth)
    router.replace("/login")
  }

  // =====================================================
  // CONTROLE DE VISIBILIDADE DO MENU
  // =====================================================
  // Define quais itens cada perfil pode ver no menu lateral.
  // Isso é visual. A segurança real continua na função podeAcessarPagina.
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

  // =====================================================
  // TELA DE CARREGAMENTO
  // =====================================================
  // Aparece enquanto o sistema valida login, usuário ativo e permissões.
  if (carregando) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-5 shadow-xl">
          <p className="text-sm font-medium text-zinc-300">
            Carregando sistema...
          </p>
        </div>
      </main>
    )
  }

  // =====================================================
  // AGRUPAMENTO DOS ITENS VISÍVEIS DO MENU
  // =====================================================
  // Primeiro filtra pelo perfil do usuário.
  // Depois separa por grupo: OPERACIONAL, CADASTROS e ADMINISTRAÇÃO.
  const itensVisiveis = itensMenu.filter((item) => podeVer(item.nome))

  const gruposMenu = [
    "OPERACIONAL",
    "CADASTROS",
    "ADMINISTRAÇÃO"
  ] as const

  return (
    // =====================================================
    // FUNDO GERAL DO SISTEMA
    // =====================================================
    // bg-zinc-950: cor principal do fundo do sistema.
    // text-white: texto padrão claro.
    // flex: divide sidebar esquerda e conteúdo principal.
    <UsuarioProvider usuarioSistema={usuarioSistema}>
      <main className="min-h-screen bg-zinc-950 text-white flex">

      {/* =====================================================
          SIDEBAR / MENU LATERAL ESQUERDO
          =====================================================
          w-72: largura fixa da lateral.
          h-screen: ocupa a altura inteira da tela.
          sticky top-0: fica fixa no topo ao rolar.
          bg-zinc-900: cor de fundo da navegação lateral.
          border-r: linha separando menu e conteúdo.
      */}
      <aside className="w-72 h-screen sticky top-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">

        {/* =====================================================
            TOPO DA SIDEBAR / IDENTIDADE DO SISTEMA
            =====================================================
            Aqui fica a logo e o nome do sistema.
            É a área de identidade visual da aplicação.
        */}
        <div className="px-5 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">

            {/* LOGO DO SISTEMA */}
            <div className="relative w-12 h-12 overflow-hidden rounded-xl bg-white p-1 shadow-sm">
              <Image
                src="/logos/logo.png"
                alt="Logo ADUSEPS"
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* NOME E DESCRIÇÃO DO SISTEMA */}
            <div className="min-w-0">
              <h1 className="text-xl font-black tracking-tight leading-tight">
                ADUSEPS
              </h1>

              <p className="text-zinc-500 text-xs leading-tight">
                Sistema Administrativo
              </p>
            </div>

          </div>
        </div>

        {/* =====================================================
            ÁREA CENTRAL DO MENU
            =====================================================
            flex-1: ocupa todo o espaço disponível.
            overflow-y-auto: permite rolagem se o menu crescer.
            p-4: espaçamento interno mais compacto e profissional.
        */}
        <div className="flex-1 overflow-y-auto p-4">

          <nav className="space-y-6">

            {gruposMenu.map((grupo) => {
              const itensDoGrupo = itensVisiveis.filter(
                (item) => item.grupo === grupo
              )

              if (itensDoGrupo.length === 0) {
                return null
              }

              return (
                // =====================================================
                // GRUPO DO MENU
                // =====================================================
                // Exemplo: OPERACIONAL, CADASTROS, ADMINISTRAÇÃO.
                // Isso melhora muito a leitura do sistema.
                <div key={grupo}>

                  {/* TÍTULO DO GRUPO */}
                  <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                    {grupo}
                  </p>

                  {/* LINKS DO GRUPO */}
                  <div className="space-y-1">
                    {itensDoGrupo.map((item) => {
                      const ativo = pathname === item.href

                      return (
                        // =====================================================
                        // ITEM DO MENU
                        // =====================================================
                        // Item ativo:
                        // - fundo discreto;
                        // - texto branco;
                        // - barra lateral azul fina.
                        // Item normal:
                        // - texto cinza;
                        // - hover suave.
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                            ativo
                              ? "bg-zinc-800 text-white"
                              : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100"
                          }`}
                        >
                          {/* BARRA AZUL DO ITEM ATIVO */}
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

        {/* =====================================================
            RODAPÉ DA SIDEBAR / USUÁRIO LOGADO
            =====================================================
            Aqui aparecem dados básicos do usuário e o botão sair.
            Essa área fica sempre no final da lateral.
        */}
        <div className="p-4 border-t border-zinc-800">

          {/* CARD DO USUÁRIO LOGADO */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 mb-3">

            <p className="text-xs font-medium text-zinc-500">
              Usuário logado
            </p>

            <p className="mt-1 font-semibold text-sm text-zinc-100 truncate">
              {usuarioSistema?.nome || usuarioEmail}
            </p>

            <p className="text-xs text-zinc-500 mt-1">
              {usuarioSistema?.perfil}
            </p>

          </div>

          {/* BOTÃO SAIR */}
          <button
            onClick={sair}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
          >
            Sair
          </button>

        </div>

      </aside>

      {/* =====================================================
          ÁREA PRINCIPAL DO SISTEMA
          =====================================================
          Aqui fica tudo que muda de página para página.
          A sidebar é fixa; o conteúdo entra aqui via {children}.
      */}
      <section className="flex-1 min-w-0 flex flex-col">

        {/* =====================================================
            HEADER SUPERIOR
            =====================================================
            Esse cabeçalho dá mais cara de sistema corporativo.
            Depois podemos colocar busca global, notificações e usuário.
        */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur flex items-center justify-between px-8">

          {/* INFORMAÇÃO DA PÁGINA ATUAL */}
          <div>
            <p className="text-sm font-semibold text-zinc-100">
              Sistema Administrativo
            </p>

            <p className="text-xs text-zinc-500">
              Controle interno da ADUSEPS
            </p>
          </div>

          {/* PERFIL RESUMIDO NO TOPO */}
          <div className="hidden md:flex items-center gap-3 text-right">
            <div>
              <p className="text-sm font-semibold text-zinc-200">
                {usuarioSistema?.nome || usuarioEmail}
              </p>

              <p className="text-xs text-zinc-500">
                {usuarioSistema?.perfil}
              </p>
            </div>

            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300">
              {(usuarioSistema?.nome || usuarioEmail || "U")
                .charAt(0)
                .toUpperCase()}
            </div>
          </div>

        </header>

        {/* =====================================================
            CONTEÚDO DAS PÁGINAS
            =====================================================
            bg-zinc-950: mantém o fundo escuro.
            p-8: espaçamento interno padrão.
            overflow-auto: permite rolagem do conteúdo.
            max-w-[1600px]: evita que o conteúdo fique largo demais em telas grandes.
        */}
        <div className="flex-1 overflow-auto bg-zinc-950 p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </div>

            </section>

              {/* =====================================================
                  TOAST GLOBAL DO SISTEMA
                  =====================================================
                  Responsável pelas notificações elegantes:
                  - sucesso
                  - erro
                  - aviso
              */}
              <Toaster
                richColors
                position="top-right"
                theme="dark"
              />

            </main>

          </UsuarioProvider>
        )
}
