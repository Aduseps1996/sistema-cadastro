"use client"

import { useEffect, useState } from "react"

import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc
} from "firebase/firestore"

import { db } from "../lib/firebase"

type Atendimento = {
  id?: string
  nome: string
  matricula: string
  setor: string
  status: string
  prioridade: number
}

export default function Home() {

  const [nome, setNome] = useState("")
  const [matricula, setMatricula] = useState("")
  const [setor, setSetor] = useState("")
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])

  useEffect(() => {
    const consulta = query(
      collection(db, "atendimentos"),
      orderBy("data_hora_chegada", "desc")
    )

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Atendimento[]

      setAtendimentos(lista)
    })

    return () => unsubscribe()
  }, [])

  async function registrarChegada() {
    if (nome.trim() === "") {
      alert("Informe o nome.")
      return
    }

    if (setor === "") {
      alert("Selecione o setor.")
      return
    }

    await addDoc(collection(db, "atendimentos"), {
      nome,
      matricula,
      setor,
      status: "aguardando",
      prioridade: 0,
      data_hora_chegada: serverTimestamp()
    })

    setNome("")
    setMatricula("")
    setSetor("")

    alert("Chegada registrada.")
  }

  async function iniciarAtendimento(id: string) {
    await updateDoc(doc(db, "atendimentos", id), {
      status: "em atendimento",
      inicio_atendimento: serverTimestamp()
    })
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">

      <div className="max-w-7xl mx-auto">

        <div className="mb-10">

          <h1 className="text-4xl font-black">
            Sistema de Atendimento
          </h1>

          <p className="text-zinc-400 mt-2">
            Controle de chegada e atendimento ADUSEPS
          </p>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

            <h2 className="text-2xl font-bold mb-6">
              Novo Atendimento
            </h2>

            <div className="space-y-4">

              <input
                type="text"
                placeholder="Nome da pessoa"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
              />

              <input
                type="text"
                placeholder="Matrícula"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
              />

              <select
                  value={setor}
                  onChange={(e) => setSetor(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
                >
                  <option value="">Selecione o setor</option>
                  <option value="Jurídico">Jurídico</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Recepção">Recepção</option>
                </select>

              <button
                onClick={registrarChegada}
                className="w-full bg-blue-600 hover:bg-blue-700 transition rounded-xl py-3 font-bold"
              >
                Registrar chegada
              </button>

            </div>

          </div>

          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

            <h2 className="text-2xl font-bold mb-6">
              Atendimentos do dia
            </h2>

            <div className="space-y-3">
              {atendimentos.length === 0 && (
                <p className="text-zinc-500">
                  Nenhum atendimento registrado.
                </p>
              )}

              {atendimentos.map((atendimento) => (
                <div
                  key={atendimento.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-lg">
                      {atendimento.nome}
                    </p>

                    <p className="text-zinc-400 text-sm">
                      Matrícula: {atendimento.matricula || "Não informada"} • {atendimento.setor}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">

                    <span className="bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm font-bold">
                      {atendimento.status}
                    </span>

                    {atendimento.status === "aguardando" && atendimento.id && (
                      <button
                        onClick={() => iniciarAtendimento(atendimento.id!)}
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg text-sm font-bold"
                      >
                        Iniciar
                      </button>
                    )}

                  </div>

                </div>
              ))}
              
            </div>

          </div>

        </div>

      </div>

    </main>
  )
}