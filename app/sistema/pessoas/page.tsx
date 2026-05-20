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
  updateDoc,
  deleteDoc
} from "firebase/firestore"

import { db } from "../../../lib/firebase"

type Pessoa = {
  id?: string
  nome: string
  telefone?: string
  email?: string
  cpf?: string
  ativo: boolean
}

export default function PessoasPage() {

  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [cpf, setCpf] = useState("")

  const [pessoas, setPessoas] = useState<Pessoa[]>([])

  const [editandoId, setEditandoId] = useState("")

  const [nomeEdicao, setNomeEdicao] = useState("")
  const [telefoneEdicao, setTelefoneEdicao] = useState("")
  const [emailEdicao, setEmailEdicao] = useState("")
  const [cpfEdicao, setCpfEdicao] = useState("")

  useEffect(() => {
    const consulta = query(
      collection(db, "pessoas"),
      orderBy("nome", "asc")
    )

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Pessoa[]

      setPessoas(lista)
    })

    return () => unsubscribe()
  }, [])

  async function adicionarPessoa() {

    if (nome.trim() === "") {
      alert("Informe o nome.")
      return
    }

    await addDoc(collection(db, "pessoas"), {
      nome: nome.trim(),
      telefone: telefone.trim(),
      email: email.trim(),
      cpf: cpf.trim(),
      ativo: true,
      data_cadastro: serverTimestamp()
    })

    setNome("")
    setTelefone("")
    setEmail("")
    setCpf("")
  }

  async function salvarEdicaoPessoa(id: string) {

    if (nomeEdicao.trim() === "") {
      alert("Informe o nome.")
      return
    }

    await updateDoc(doc(db, "pessoas", id), {
      nome: nomeEdicao.trim(),
      telefone: telefoneEdicao.trim(),
      email: emailEdicao.trim(),
      cpf: cpfEdicao.trim()
    })

    setEditandoId("")
    setNomeEdicao("")
    setTelefoneEdicao("")
    setEmailEdicao("")
    setCpfEdicao("")
  }

  async function alternarStatus(id: string, ativoAtual: boolean) {
    await updateDoc(doc(db, "pessoas", id), {
      ativo: !ativoAtual
    })
  }

  async function excluirPessoa(id: string) {

    const confirmar = confirm("Deseja excluir esta pessoa?")

    if (!confirmar) return

    await deleteDoc(doc(db, "pessoas", id))
  }

  return (
    <div>

      <div className="mb-8">

        <h1 className="text-4xl font-black mb-2">
          Pessoas
        </h1>

        <p className="text-zinc-400">
          Cadastro geral de pessoas do sistema.
        </p>

      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">

        <h2 className="text-2xl font-bold mb-4">
          Nova pessoa
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <input
            type="text"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          />

          <input
            type="text"
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
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
            type="text"
            placeholder="CPF (opcional)"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          />

        </div>

        <button
          onClick={adicionarPessoa}
          className="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold"
        >
          Adicionar
        </button>

      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

        <h2 className="text-2xl font-bold mb-4">
          Pessoas cadastradas
        </h2>

        <div className="space-y-3">

          {pessoas.length === 0 && (
            <p className="text-zinc-500">
              Nenhuma pessoa cadastrada.
            </p>
          )}

          {pessoas.map((pessoa) => (
            <div
              key={pessoa.id}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex items-center justify-between gap-4"
            >

              <div className="flex-1">

                {editandoId === pessoa.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    <input
                      type="text"
                      value={nomeEdicao}
                      onChange={(e) => setNomeEdicao(e.target.value)}
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 outline-none"
                    />

                    <input
                      type="text"
                      value={telefoneEdicao}
                      onChange={(e) => setTelefoneEdicao(e.target.value)}
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 outline-none"
                    />

                    <input
                      type="email"
                      value={emailEdicao}
                      onChange={(e) => setEmailEdicao(e.target.value)}
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 outline-none"
                    />

                    <input
                      type="text"
                      value={cpfEdicao}
                      onChange={(e) => setCpfEdicao(e.target.value)}
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 outline-none"
                    />

                  </div>
                ) : (
                  <>
                    <p className="font-bold text-lg">
                      {pessoa.nome}
                    </p>

                    {pessoa.telefone && (
                      <p className="text-sm text-zinc-400">
                        Telefone: {pessoa.telefone}
                      </p>
                    )}

                    {pessoa.email && (
                      <p className="text-sm text-zinc-400">
                        E-mail: {pessoa.email}
                      </p>
                    )}

                    {pessoa.cpf && (
                      <p className="text-sm text-zinc-400">
                        CPF: {pessoa.cpf}
                      </p>
                    )}
                  </>
                )}

                <p className="text-sm text-zinc-500 mt-1">
                  {pessoa.ativo ? "Ativo" : "Inativo"}
                </p>

              </div>

              <div className="flex items-center gap-2">

                {editandoId === pessoa.id ? (
                  <>
                    <button
                      onClick={() => salvarEdicaoPessoa(pessoa.id!)}
                      className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg text-sm font-bold"
                    >
                      Salvar
                    </button>

                    <button
                      onClick={() => {
                        setEditandoId("")
                        setNomeEdicao("")
                        setTelefoneEdicao("")
                        setEmailEdicao("")
                        setCpfEdicao("")
                      }}
                      className="bg-zinc-600 hover:bg-zinc-700 px-3 py-1 rounded-lg text-sm font-bold"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setEditandoId(pessoa.id || "")
                      setNomeEdicao(pessoa.nome)
                      setTelefoneEdicao(pessoa.telefone || "")
                      setEmailEdicao(pessoa.email || "")
                      setCpfEdicao(pessoa.cpf || "")
                    }}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg text-sm font-bold"
                  >
                    Editar
                  </button>
                )}

                {pessoa.id && (
                  <button
                    onClick={() => alternarStatus(pessoa.id!, pessoa.ativo)}
                    className={`px-3 py-1 rounded-lg text-sm font-bold ${
                      pessoa.ativo
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {pessoa.ativo ? "Inativar" : "Ativar"}
                  </button>
                )}

                {pessoa.id && (
                  <button
                    onClick={() => excluirPessoa(pessoa.id!)}
                    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-sm font-bold"
                  >
                    Excluir
                  </button>
                )}

              </div>

            </div>
          ))}

        </div>

      </div>

    </div>
  )
}