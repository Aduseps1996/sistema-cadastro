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

type Profissional = {
  id?: string
  nome: string
  cargo_id: string
  ativo: boolean
}

export default function ProfissionaisPage() {
  const [nome, setNome] = useState("")
  const [cargoId, setCargoId] = useState("")
  const [pesquisa, setPesquisa] = useState("")

  const [cargos, setCargos] = useState<Cargo[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])

  const [editandoId, setEditandoId] = useState("")
  const [nomeEdicao, setNomeEdicao] = useState("")
  const [cargoIdEdicao, setCargoIdEdicao] = useState("")

  useEffect(() => {
    const consultaCargos = query(
      collection(db, "cargos"),
      orderBy("nome", "asc")
    )

    const unsubscribeCargos = onSnapshot(consultaCargos, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Cargo[]

      setCargos(lista)
    })

    return () => unsubscribeCargos()
  }, [])

  useEffect(() => {
    const consultaProfissionais = query(
      collection(db, "profissionais"),
      orderBy("nome", "asc")
    )

    const unsubscribeProfissionais = onSnapshot(consultaProfissionais, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Profissional[]

      setProfissionais(lista)
    })

    return () => unsubscribeProfissionais()
  }, [])

  async function adicionarProfissional() {
    if (nome.trim() === "") {
      alert("Informe o nome do profissional.")
      return
    }

    if (cargoId === "") {
      alert("Selecione o cargo do profissional.")
      return
    }

    await addDoc(collection(db, "profissionais"), {
      nome: nome.trim(),
      cargo_id: cargoId,
      ativo: true,
      criado_em: serverTimestamp(),
      atualizado_em: serverTimestamp()
    })

    setNome("")
    setCargoId("")
  }

  async function salvarEdicaoProfissional(id: string) {
    if (nomeEdicao.trim() === "") {
      alert("Informe o nome do profissional.")
      return
    }

    if (cargoIdEdicao === "") {
      alert("Selecione o cargo do profissional.")
      return
    }

    await updateDoc(doc(db, "profissionais", id), {
      nome: nomeEdicao.trim(),
      cargo_id: cargoIdEdicao,
      atualizado_em: serverTimestamp()
    })

    cancelarEdicao()
  }

  async function alternarStatus(id: string, ativoAtual: boolean) {
    await updateDoc(doc(db, "profissionais", id), {
      ativo: !ativoAtual,
      atualizado_em: serverTimestamp()
    })
  }

  function iniciarEdicao(profissional: Profissional) {
    setEditandoId(profissional.id || "")
    setNomeEdicao(profissional.nome)
    setCargoIdEdicao(profissional.cargo_id)
  }

  function cancelarEdicao() {
    setEditandoId("")
    setNomeEdicao("")
    setCargoIdEdicao("")
  }

  function buscarNomeCargo(cargo_id: string) {
    const cargo = cargos.find((item) => item.id === cargo_id)
    return cargo ? cargo.nome : "Cargo não encontrado"
  }

  const profissionaisFiltrados = profissionais.filter((profissional) =>
    profissional.nome.toLowerCase().includes(pesquisa.toLowerCase().trim())
  )

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-black mb-2">
          Profissionais
        </h1>

        <p className="text-zinc-400 mb-8">
          Cadastro dos profissionais que realizam atendimentos.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">
            Novo profissional
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_260px_180px] gap-4">
            <input
              type="text"
              placeholder="Nome do profissional"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
            />

            <select
              value={cargoId}
              onChange={(e) => setCargoId(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
            >
              <option value="">Selecione o cargo</option>

              {cargos
                .filter((cargo) => cargo.ativo)
                .map((cargo) => (
                  <option key={cargo.id} value={cargo.id}>
                    {cargo.nome}
                  </option>
                ))}
            </select>

            <button
              onClick={adicionarProfissional}
              className="bg-blue-600 hover:bg-blue-700 transition rounded-xl font-bold"
            >
              Adicionar
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold">
              Profissionais cadastrados
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
            {profissionaisFiltrados.length === 0 && (
              <p className="text-zinc-500">
                Nenhum profissional encontrado.
              </p>
            )}

            {profissionaisFiltrados.map((profissional) => (
              <div
                key={profissional.id}
                className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="flex-1">
                  {editandoId === profissional.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-3">
                      <input
                        type="text"
                        value={nomeEdicao}
                        onChange={(e) => setNomeEdicao(e.target.value)}
                        className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 outline-none"
                      />

                      <select
                        value={cargoIdEdicao}
                        onChange={(e) => setCargoIdEdicao(e.target.value)}
                        className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 outline-none"
                      >
                        <option value="">Selecione o cargo</option>

                        {cargos
                          .filter((cargo) => cargo.ativo || cargo.id === profissional.cargo_id)
                          .map((cargo) => (
                            <option key={cargo.id} value={cargo.id}>
                              {cargo.nome}
                            </option>
                          ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <p className="font-bold text-lg">
                        {profissional.nome}
                      </p>

                      <p className="text-sm text-zinc-400">
                        Cargo: {buscarNomeCargo(profissional.cargo_id)}
                      </p>
                    </>
                  )}

                  <p className="text-sm text-zinc-400 mt-1">
                    Status: {profissional.ativo ? "Ativo" : "Inativo"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {editandoId === profissional.id ? (
                    <>
                      <button
                        onClick={() => salvarEdicaoProfissional(profissional.id!)}
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
                        onClick={() => iniciarEdicao(profissional)}
                        className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-sm font-bold"
                      >
                        Editar
                      </button>

                      {profissional.id && (
                        <button
                          onClick={() => alternarStatus(profissional.id!, profissional.ativo)}
                          className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-sm font-bold"
                        >
                          {profissional.ativo ? "Inativar" : "Reativar"}
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