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

import { db } from "../../../lib/firebase"

type Cargo = {
  id?: string
  nome: string
  ativo: boolean
}

export default function CargosPage() {
  const [nome, setNome] = useState("")
  const [pesquisa, setPesquisa] = useState("")

  const [cargos, setCargos] = useState<Cargo[]>([])

  const [editandoId, setEditandoId] = useState("")
  const [nomeEdicao, setNomeEdicao] = useState("")

  useEffect(() => {
    const consulta = query(
      collection(db, "cargos"),
      orderBy("nome", "asc")
    )

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Cargo[]

      setCargos(lista)
    })

    return () => unsubscribe()
  }, [])

  async function adicionarCargo() {
    if (nome.trim() === "") {
      alert("Informe o nome do cargo.")
      return
    }

    await addDoc(collection(db, "cargos"), {
      nome: nome.trim(),
      ativo: true,
      criado_em: serverTimestamp(),
      atualizado_em: serverTimestamp()
    })

    setNome("")
  }

  async function salvarEdicaoCargo(id: string) {
    if (nomeEdicao.trim() === "") {
      alert("Informe o nome do cargo.")
      return
    }

    await updateDoc(doc(db, "cargos", id), {
      nome: nomeEdicao.trim(),
      atualizado_em: serverTimestamp()
    })

    cancelarEdicao()
  }

  async function alternarStatus(id: string, ativoAtual: boolean) {
    await updateDoc(doc(db, "cargos", id), {
      ativo: !ativoAtual,
      atualizado_em: serverTimestamp()
    })
  }

  function iniciarEdicao(cargo: Cargo) {
    setEditandoId(cargo.id || "")
    setNomeEdicao(cargo.nome)
  }

  function cancelarEdicao() {
    setEditandoId("")
    setNomeEdicao("")
  }

  const cargosFiltrados = cargos.filter((cargo) =>
    cargo.nome.toLowerCase().includes(pesquisa.toLowerCase().trim())
  )

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-black mb-2">
          Cargos
        </h1>

        <p className="text-zinc-400 mb-8">
          Cadastro de cargos e funções dos profissionais.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">
            Novo cargo
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4">
            <input
              type="text"
              placeholder="Nome do cargo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
            />

            <button
              onClick={adicionarCargo}
              className="bg-blue-600 hover:bg-blue-700 transition rounded-xl font-bold"
            >
              Adicionar
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold">
              Cargos cadastrados
            </h2>

            <input
              type="text"
              placeholder="Pesquisar por nome"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              className="w-full md:w-80 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
            />
          </div>

          <div className="space-y-3">
            {cargosFiltrados.length === 0 && (
              <p className="text-zinc-500">
                Nenhum cargo encontrado.
              </p>
            )}

            {cargosFiltrados.map((cargo) => (
              <div
                key={cargo.id}
                className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="flex-1">
                  {editandoId === cargo.id ? (
                    <input
                      type="text"
                      value={nomeEdicao}
                      onChange={(e) => setNomeEdicao(e.target.value)}
                      className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 outline-none"
                    />
                  ) : (
                    <p className="font-bold text-lg">
                      {cargo.nome}
                    </p>
                  )}

                  <p className="text-sm text-zinc-400 mt-1">
                    Status: {cargo.ativo ? "Ativo" : "Inativo"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {editandoId === cargo.id ? (
                    <>
                      <button
                        onClick={() => salvarEdicaoCargo(cargo.id!)}
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
                        onClick={() => iniciarEdicao(cargo)}
                        className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-sm font-bold"
                      >
                        Editar
                      </button>

                      {cargo.id && (
                        <button
                          onClick={() => alternarStatus(cargo.id!, cargo.ativo)}
                          className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-sm font-bold"
                        >
                          {cargo.ativo ? "Inativar" : "Reativar"}
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
    </main>
  )
}