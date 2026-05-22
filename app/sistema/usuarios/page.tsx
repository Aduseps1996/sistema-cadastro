"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
  getDocs,
  where
} from "firebase/firestore"

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "firebase/auth"

import {
  db,
  auth,
  secondaryAuth
} from "../../../lib/firebase"

// =====================================================
// TIPO DO USUÁRIO
// =====================================================
// Representa a estrutura dos documentos da coleção "usuarios".
type Usuario = {
  id?: string
  uid?: string
  nome: string
  email: string
  perfil: string
  ativo: boolean
}

// =====================================================
// LISTA DE PERFIS DISPONÍVEIS
// =====================================================
// Perfis usados no controle de acesso do sistema.
const perfis = [
  "Administrador",
  "Recepção",
  "Atendente",
  "Consulta"
]

export default function UsuariosPage() {

  // =====================================================
  // ESTADOS DO FORMULÁRIO DE CADASTRO
  // =====================================================
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [perfil, setPerfil] = useState("")

  // =====================================================
  // ESTADO DA PESQUISA
  // =====================================================
  const [pesquisa, setPesquisa] = useState("")

  // =====================================================
  // LISTA DE USUÁRIOS
  // =====================================================
  const [usuarios, setUsuarios] = useState<Usuario[]>([])

  // =====================================================
  // ESTADOS DA EDIÇÃO INLINE
  // =====================================================
  const [editandoId, setEditandoId] = useState("")
  const [nomeEdicao, setNomeEdicao] = useState("")
  const [emailEdicao, setEmailEdicao] = useState("")
  const [perfilEdicao, setPerfilEdicao] = useState("")
  const [acaoEmAndamento, setAcaoEmAndamento] = useState("")

  const [carregando, setCarregando] = useState(false)

  // =====================================================
  // CONSULTA EM TEMPO REAL
  // =====================================================
  // Busca os usuários cadastrados e atualiza automaticamente.
  useEffect(() => {

    const consulta = query(
      collection(db, "usuarios"),
      orderBy("nome", "asc")
    )

    const unsubscribe = onSnapshot(consulta, (resultado) => {

      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Usuario[]

      setUsuarios(lista)
    })

    return () => unsubscribe()

  }, [])

  // =====================================================
  // CADASTRAR NOVO USUÁRIO
  // =====================================================
  // Cria:
  // 1. usuário no Firebase Authentication;
  // 2. documento na coleção "usuarios".
  async function adicionarUsuario() {

    if (nome.trim() === "") {
      toast.warning("Informe o nome.")
      return
    }

    if (email.trim() === "") {
      toast.warning("Informe o e-mail.")
      return
    }

    if (senha.trim() === "") {
      toast.warning("Informe a senha.")
      return
    }

    if (senha.length < 6) {
      toast.warning("A senha precisa ter pelo menos 6 caracteres.")
      return
    }

    if (perfil === "") {
      toast.warning("Selecione o perfil.")
      return
    }

    const emailFormatado =
      email.trim().toLowerCase()

    // =====================================================
    // VALIDAÇÃO DE E-MAIL DUPLICADO
    // =====================================================
    const emailExiste = usuarios.some(
      (usuario) =>
        usuario.email.toLowerCase() === emailFormatado
    )

    if (emailExiste) {
      toast.warning("Este e-mail já está cadastrado.")
      return
    }

    // =====================================================
    // CRIAÇÃO NO FIREBASE AUTH
    // =====================================================
    try {
      setAcaoEmAndamento("adicionar_usuario")

      const credencial =
        await createUserWithEmailAndPassword(
          secondaryAuth,
          emailFormatado,
          senha
        )

      await setDoc(doc(db, "usuarios", credencial.user.uid), {
        uid: credencial.user.uid,
        nome: nome.trim(),
        email: emailFormatado,
        perfil,
        ativo: true,
        criado_em: serverTimestamp(),
        atualizado_em: serverTimestamp()
      })

      await signOut(secondaryAuth)

      setNome("")
      setEmail("")
      setSenha("")
      setPerfil("")

      toast.success("Usuário cadastrado com sucesso.")

    } catch (error) {
      console.error(error)
      toast.error("Erro ao cadastrar usuário.")

    } finally {
      setAcaoEmAndamento("")
    }

  }

  // =====================================================
  // SALVAR EDIÇÃO
  // =====================================================
  async function salvarEdicaoUsuario(id: string) {

    if (nomeEdicao.trim() === "") {
      toast.warning("Informe o nome.")
      return
    }

    if (emailEdicao.trim() === "") {
      toast.warning("Informe o e-mail.")
      return
    }

    if (perfilEdicao === "") {
      toast.warning("Selecione o perfil.")
      return
    }

    const emailFormatado =
      emailEdicao.trim().toLowerCase()

    // =====================================================
    // VALIDAÇÃO DE E-MAIL DUPLICADO
    // =====================================================
    const emailExiste = usuarios.some(
      (usuario) =>
        usuario.id !== id &&
        usuario.email.toLowerCase() === emailFormatado
    )

    if (emailExiste) {
      toast.warning("Este e-mail já está cadastrado.")
      return
    }

    try {
      setAcaoEmAndamento(`salvar_${id}`)

      await updateDoc(doc(db, "usuarios", id), {
        nome: nomeEdicao.trim(),
        email: emailFormatado,
        perfil: perfilEdicao,
        atualizado_em: serverTimestamp()
      })

      toast.success("Usuário atualizado.")

      cancelarEdicao()

    } catch (error) {
      console.error(error)
      toast.error("Erro ao salvar alterações.")

    } finally {
      setAcaoEmAndamento("")
    }

  }

  // =====================================================
  // INATIVAR / REATIVAR
  // =====================================================
  async function alternarStatus(id: string, ativoAtual: boolean) {
    if (acaoEmAndamento) return

    try {
      setAcaoEmAndamento(`status_${id}`)

      await updateDoc(doc(db, "usuarios", id), {
        ativo: !ativoAtual,
        atualizado_em: serverTimestamp()
      })

      toast.success(
        ativoAtual
          ? "Usuário inativado."
          : "Usuário reativado."
      )
    } catch (error) {
      console.error(error)
      toast.error("Erro ao alterar status do usuário.")
    } finally {
      setAcaoEmAndamento("")
    }
  }
  // =====================================================
  // REDEFINIR SENHA
  // =====================================================
  // Envia e-mail de redefinição para o usuário.
  async function redefinirSenha(emailUsuario: string) {
    const emailFormatado = emailUsuario.trim().toLowerCase()

    if (emailFormatado === "") {
      toast.warning("E-mail inválido.")
      return
    }

    try {
      setAcaoEmAndamento(`senha_${emailFormatado}`)

      const consultaUsuario = query(
        collection(db, "usuarios"),
        where("email", "==", emailFormatado)
      )

      const resultado = await getDocs(consultaUsuario)

      if (resultado.empty) {
        toast.warning("E-mail não cadastrado no sistema.")
        return
      }

      const usuarioDoc = resultado.docs[0].data()

      if (!usuarioDoc.ativo) {
        toast.warning("Usuário inativo. Procure o administrador.")
        return
      }

      await sendPasswordResetEmail(
        auth,
        emailFormatado
      )

      toast.success("E-mail de redefinição enviado.")
    } catch (error) {
      console.error(error)
      toast.error("Não foi possível enviar o e-mail.")
    } finally {
      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // INICIAR EDIÇÃO
  // =====================================================
  function iniciarEdicao(usuario: Usuario) {

    setEditandoId(usuario.id || "")
    setNomeEdicao(usuario.nome)
    setEmailEdicao(usuario.email)
    setPerfilEdicao(usuario.perfil)
  }

  // =====================================================
  // CANCELAR EDIÇÃO
  // =====================================================
  function cancelarEdicao() {

    setEditandoId("")
    setNomeEdicao("")
    setEmailEdicao("")
    setPerfilEdicao("")
  }

  // =====================================================
  // FILTRO LOCAL DA TABELA
  // =====================================================
  const usuariosFiltrados = usuarios.filter((usuario) => {

    const termo =
      pesquisa.toLowerCase().trim()

    return (
      usuario.nome.toLowerCase().includes(termo) ||
      usuario.email.toLowerCase().includes(termo) ||
      usuario.perfil.toLowerCase().includes(termo)
    )
  })

  return (

    // =====================================================
    // CONTAINER PRINCIPAL
    // =====================================================
    <div className="space-y-6">

      {/* =====================================================
          CABEÇALHO DA PÁGINA
          ===================================================== */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Usuários
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Cadastro e gerenciamento dos usuários do sistema.
          </p>
        </div>

        {/* CAMPO DE PESQUISA */}
        <div className="w-full md:w-96">
          <input
            type="text"
            placeholder="Pesquisar por nome, e-mail ou perfil"
            value={pesquisa}
            onChange={(e) =>
              setPesquisa(e.target.value)
            }
            className="
              h-11 w-full rounded-xl border border-zinc-700
              bg-zinc-900 px-4 text-sm text-zinc-100
              outline-none transition
              placeholder:text-zinc-500
              focus:border-blue-500/60
              focus:ring-2 focus:ring-blue-500/20
            "
          />
        </div>

      </div>

      {/* =====================================================
          CARD DE CADASTRO
          ===================================================== */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">

        <div className="mb-4">

          <h2 className="text-base font-semibold text-zinc-100">
            Novo usuário
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Cadastre usuários com perfil de acesso ao sistema.
          </p>

        </div>

        {/* FORMULÁRIO */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">

          {/* NOME */}
          <input
            type="text"
            placeholder="Nome"
            value={nome}
            onChange={(e) =>
              setNome(e.target.value)
            }
            className="
              h-11 rounded-xl border border-zinc-700
              bg-zinc-950 px-4 text-sm text-zinc-100
              outline-none transition
              placeholder:text-zinc-500
              focus:border-blue-500/60
              focus:ring-2 focus:ring-blue-500/20
            "
          />

          {/* E-MAIL */}
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="
              h-11 rounded-xl border border-zinc-700
              bg-zinc-950 px-4 text-sm text-zinc-100
              outline-none transition
              placeholder:text-zinc-500
              focus:border-blue-500/60
              focus:ring-2 focus:ring-blue-500/20
            "
          />

          {/* SENHA */}
          <input
            type="password"
            placeholder="Senha inicial"
            value={senha}
            onChange={(e) =>
              setSenha(e.target.value)
            }
            className="
              h-11 rounded-xl border border-zinc-700
              bg-zinc-950 px-4 text-sm text-zinc-100
              outline-none transition
              placeholder:text-zinc-500
              focus:border-blue-500/60
              focus:ring-2 focus:ring-blue-500/20
            "
          />

          {/* PERFIL */}
          <select
            value={perfil}
            onChange={(e) =>
              setPerfil(e.target.value)
            }
            className="
              h-11 rounded-xl border border-zinc-700
              bg-zinc-950 px-4 text-sm text-zinc-100
              outline-none transition
              focus:border-blue-500/60
              focus:ring-2 focus:ring-blue-500/20
            "
          >
            <option value="">
              Perfil
            </option>

            {perfis.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

        </div>

        {/* BOTÃO */}
        <button
          onClick={adicionarUsuario}
          className="
            mt-4 h-11 rounded-xl border border-blue-500/40
            bg-blue-600 px-5 text-sm font-semibold text-white
            transition hover:bg-blue-500
          "
        >
          Adicionar usuário
        </button>

      </section>

      {/* =====================================================
          TABELA DE USUÁRIOS
          ===================================================== */}
      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-sm">

        {/* TOPO DA TABELA */}
        <div className="border-b border-zinc-800 px-5 py-4">

          <h2 className="text-base font-semibold text-zinc-100">
            Usuários cadastrados
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {usuariosFiltrados.length} registro(s) encontrado(s)
          </p>

        </div>

        {/* ESTADO VAZIO */}
        {usuariosFiltrados.length === 0 && (
          <div className="px-5 py-10 text-center">

            <p className="text-sm font-medium text-zinc-300">
              Nenhum usuário encontrado.
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Cadastre um novo usuário ou ajuste a pesquisa.
            </p>

          </div>
        )}

        {/* TABELA */}
        {usuariosFiltrados.length > 0 && (
          <div className="overflow-x-auto">

            <table className="w-full border-collapse text-sm">

              {/* CABEÇALHO */}
              <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-500">

                <tr>

                  <th className="px-5 py-3 text-left font-semibold">
                    Usuário
                  </th>

                  <th className="px-5 py-3 text-left font-semibold">
                    Perfil
                  </th>

                  <th className="w-32 px-5 py-3 text-left font-semibold">
                    Status
                  </th>

                  <th className="w-80 px-5 py-3 text-right font-semibold">
                    Ações
                  </th>

                </tr>

              </thead>

              {/* CORPO */}
              <tbody className="divide-y divide-zinc-800">

                {usuariosFiltrados.map((usuario) => {

                  const estaEditando =
                    editandoId === usuario.id

                  return (

                    <tr
                      key={usuario.id}
                      className="transition hover:bg-zinc-800/50"
                    >

                      {/* COLUNA USUÁRIO */}
                      <td className="px-5 py-3 align-middle">

                        {estaEditando ? (

                          <div className="grid grid-cols-1 gap-2">

                            <input
                              type="text"
                              value={nomeEdicao}
                              onChange={(e) =>
                                setNomeEdicao(e.target.value)
                              }
                              className="
                                h-10 rounded-lg border border-zinc-700
                                bg-zinc-950 px-3 text-sm text-zinc-100
                                outline-none transition
                                focus:border-blue-500/60
                                focus:ring-2 focus:ring-blue-500/20
                              "
                            />

                            <input
                              type="email"
                              value={emailEdicao}
                              onChange={(e) =>
                                setEmailEdicao(e.target.value)
                              }
                              className="
                                h-10 rounded-lg border border-zinc-700
                                bg-zinc-950 px-3 text-sm text-zinc-100
                                outline-none transition
                                focus:border-blue-500/60
                                focus:ring-2 focus:ring-blue-500/20
                              "
                            />

                          </div>

                        ) : (

                          <div>

                            <p className="font-semibold text-zinc-100">
                              {usuario.nome}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500">
                              {usuario.email}
                            </p>

                          </div>

                        )}

                      </td>

                      {/* COLUNA PERFIL */}
                      <td className="px-5 py-3 align-middle">

                        {estaEditando ? (

                          <select
                            value={perfilEdicao}
                            onChange={(e) =>
                              setPerfilEdicao(e.target.value)
                            }
                            className="
                              h-10 w-full rounded-lg border border-zinc-700
                              bg-zinc-950 px-3 text-sm text-zinc-100
                              outline-none transition
                              focus:border-blue-500/60
                              focus:ring-2 focus:ring-blue-500/20
                            "
                          >
                            <option value="">
                              Perfil
                            </option>

                            {perfis.map((item) => (
                              <option
                                key={item}
                                value={item}
                              >
                                {item}
                              </option>
                            ))}
                          </select>

                        ) : (

                          <p className="text-zinc-300">
                            {usuario.perfil}
                          </p>

                        )}

                      </td>

                      {/* COLUNA STATUS */}
                      <td className="px-5 py-3 align-middle">

                        <span
                          className={`
                            inline-flex items-center rounded-full border px-2.5 py-1
                            text-xs font-semibold
                            ${usuario.ativo
                              ? "border-green-500/30 bg-green-500/10 text-green-300"
                              : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"
                            }
                          `}
                        >
                          {usuario.ativo
                            ? "Ativo"
                            : "Inativo"}
                        </span>

                      </td>

                      {/* COLUNA AÇÕES */}
                      <td className="px-5 py-3 align-middle">

                        <div className="flex justify-end gap-2 flex-wrap">

                          {estaEditando ? (

                            <>
                              {/* SALVAR */}
                              <button
                                onClick={() =>
                                  salvarEdicaoUsuario(usuario.id!)
                                }
                                className="
                                  rounded-lg border border-blue-500/40
                                  bg-blue-600 px-3 py-2 text-xs font-semibold text-white
                                  transition hover:bg-blue-500
                                "
                              >
                                Salvar
                              </button>

                              {/* CANCELAR */}
                              <button
                                onClick={cancelarEdicao}
                                className="
                                  rounded-lg border border-zinc-700
                                  bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100
                                  transition hover:bg-zinc-700
                                "
                              >
                                Cancelar
                              </button>
                            </>

                          ) : (

                            <>
                              {/* EDITAR */}
                              <button
                                onClick={() =>
                                  iniciarEdicao(usuario)
                                }
                                className="
                                  rounded-lg border border-zinc-700
                                  bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100
                                  transition hover:bg-zinc-700
                                "
                              >
                                Editar
                              </button>

                              {/* REDEFINIR SENHA */}
                              <button
                                onClick={() =>
                                  redefinirSenha(usuario.email)
                                }
                                disabled={
                                  acaoEmAndamento === `senha_${usuario.email}`
                                }
                                className="
                              rounded-lg border border-blue-500/30
                              bg-blue-500/10 px-3 py-2
                              text-xs font-semibold text-blue-300
                              transition hover:bg-blue-500/20
                              disabled:cursor-not-allowed
                              disabled:opacity-50
                            "
                              >
                                {acaoEmAndamento === `senha_${usuario.email}`
                                  ? "Enviando..."
                                  : "Redefinir senha"}
                              </button>

                              {/* STATUS */}
                              {usuario.id && (
                                <button
                                  onClick={() =>
                                    alternarStatus(
                                      usuario.id!,
                                      usuario.ativo
                                    )
                                  }
                                  className={`
                                    rounded-lg border px-3 py-2 text-xs font-semibold transition
                                    ${usuario.ativo
                                      ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                                      : "border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20"
                                    }
                                  `}
                                >
                                  {usuario.ativo
                                    ? "Inativar"
                                    : "Reativar"}
                                </button>
                              )}
                            </>

                          )}

                        </div>

                      </td>

                    </tr>

                  )
                })}

              </tbody>

            </table>

          </div>
        )}

      </section>

    </div>
  )
}