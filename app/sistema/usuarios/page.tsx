"use client"

import { useEffect, useState } from "react"

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc
} from "firebase/firestore"

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "firebase/auth"

import { db, auth, secondaryAuth } from "../../../lib/firebase"

type Usuario = {
  id?: string
  uid?: string
  nome: string
  email: string
  perfil: string
  ativo: boolean
}

const perfis = [
  "Administrador",
  "Recepção",
  "Atendente",
  "Consulta"
]

export default function UsuariosPage() {
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [perfil, setPerfil] = useState("")
  const [pesquisa, setPesquisa] = useState("")

  const [usuarios, setUsuarios] = useState<Usuario[]>([])

  const [editandoId, setEditandoId] = useState("")
  const [nomeEdicao, setNomeEdicao] = useState("")
  const [emailEdicao, setEmailEdicao] = useState("")
  const [perfilEdicao, setPerfilEdicao] = useState("")

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

  async function adicionarUsuario() {
    if (nome.trim() === "") {
      alert("Informe o nome.")
      return
    }

    if (email.trim() === "") {
      alert("Informe o e-mail.")
      return
    }

    if (senha.trim() === "") {
      alert("Informe a senha.")
      return
    }

    if (senha.length < 6) {
      alert("A senha precisa ter pelo menos 6 caracteres.")
      return
    }

    if (perfil === "") {
      alert("Selecione o perfil.")
      return
    }

    const emailFormatado = email.trim().toLowerCase()

    const emailExiste = usuarios.some(
      (usuario) => usuario.email.toLowerCase() === emailFormatado
    )

    if (emailExiste) {
      alert("Este e-mail já está cadastrado.")
      return
    }

    const credencial = await createUserWithEmailAndPassword(
      secondaryAuth,
      emailFormatado,
      senha
    )

    await addDoc(collection(db, "usuarios"), {
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

    alert("Usuário cadastrado com sucesso.")
  }

  async function salvarEdicaoUsuario(id: string) {
    if (nomeEdicao.trim() === "") {
      alert("Informe o nome.")
      return
    }

    if (emailEdicao.trim() === "") {
      alert("Informe o e-mail.")
      return
    }

    if (perfilEdicao === "") {
      alert("Selecione o perfil.")
      return
    }

    const emailFormatado = emailEdicao.trim().toLowerCase()

    const emailExiste = usuarios.some(
      (usuario) =>
        usuario.id !== id &&
        usuario.email.toLowerCase() === emailFormatado
    )

    if (emailExiste) {
      alert("Este e-mail já está cadastrado para outro usuário.")
      return
    }

    await updateDoc(doc(db, "usuarios", id), {
      nome: nomeEdicao.trim(),
      email: emailFormatado,
      perfil: perfilEdicao,
      atualizado_em: serverTimestamp()
    })

    cancelarEdicao()
  }

  async function alternarStatus(id: string, ativoAtual: boolean) {
    await updateDoc(doc(db, "usuarios", id), {
      ativo: !ativoAtual,
      atualizado_em: serverTimestamp()
    })
  }

  async function enviarRedefinicaoSenha(emailUsuario: string) {
    await sendPasswordResetEmail(auth, emailUsuario)

    alert("E-mail de redefinição de senha enviado.")
  }

  function iniciarEdicao(usuario: Usuario) {
    setEditandoId(usuario.id || "")
    setNomeEdicao(usuario.nome)
    setEmailEdicao(usuario.email)
    setPerfilEdicao(usuario.perfil)
  }

  function cancelarEdicao() {
    setEditandoId("")
    setNomeEdicao("")
    setEmailEdicao("")
    setPerfilEdicao("")
  }

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const termo = pesquisa.toLowerCase().trim()

    return (
      usuario.nome.toLowerCase().includes(termo) ||
      usuario.email.toLowerCase().includes(termo) ||
      usuario.perfil.toLowerCase().includes(termo)
    )
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">
          Usuários
        </h1>

        <p className="text-zinc-400">
          Cadastro dos usuários do sistema.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">
          Novo usuário
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          />

          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          />

          <input
            type="password"
            placeholder="Senha inicial"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          />

          <select
            value={perfil}
            onChange={(e) => setPerfil(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          >
            <option value="">Perfil</option>

            {perfis.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={adicionarUsuario}
          className="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold"
        >
          Adicionar
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h2 className="text-2xl font-bold">
            Usuários cadastrados
          </h2>

          <input
            type="text"
            placeholder="Pesquisar por nome, e-mail ou perfil"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            className="w-full md:w-96 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          />
        </div>

        <div className="space-y-3">
          {usuariosFiltrados.length === 0 && (
            <p className="text-zinc-500">
              Nenhum usuário encontrado.
            </p>
          )}

          {usuariosFiltrados.map((usuario) => (
            <div
              key={usuario.id}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="flex-1">
                {editandoId === usuario.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={nomeEdicao}
                      onChange={(e) => setNomeEdicao(e.target.value)}
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 outline-none"
                    />

                    <input
                      type="email"
                      value={emailEdicao}
                      onChange={(e) => setEmailEdicao(e.target.value)}
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 outline-none"
                    />

                    <select
                      value={perfilEdicao}
                      onChange={(e) => setPerfilEdicao(e.target.value)}
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 outline-none"
                    >
                      <option value="">Perfil</option>

                      {perfis.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <p className="font-bold text-lg">
                      {usuario.nome}
                    </p>

                    <p className="text-sm text-zinc-400">
                      E-mail: {usuario.email}
                    </p>

                    <p className="text-sm text-zinc-400">
                      Perfil: {usuario.perfil}
                    </p>
                  </>
                )}

                <p className="text-sm text-zinc-500 mt-1">
                  Status: {usuario.ativo ? "Ativo" : "Inativo"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {editandoId === usuario.id ? (
                  <>
                    <button
                      onClick={() => salvarEdicaoUsuario(usuario.id!)}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-bold"
                    >
                      Salvar
                    </button>

                    <button
                      onClick={cancelarEdicao}
                      className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-sm font-bold"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => iniciarEdicao(usuario)}
                      className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-sm font-bold"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => enviarRedefinicaoSenha(usuario.email)}
                      className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-sm font-bold"
                    >
                      Redefinir senha
                    </button>

                    {usuario.id && (
                      <button
                        onClick={() => alternarStatus(usuario.id!, usuario.ativo)}
                        className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-sm font-bold"
                      >
                        {usuario.ativo ? "Inativar" : "Reativar"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}