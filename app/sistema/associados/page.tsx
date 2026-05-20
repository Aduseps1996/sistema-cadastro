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

type Pessoa = {
  id?: string
  nome: string
  telefone?: string
  email?: string
  ativo: boolean
}

type Associado = {
  id?: string
  pessoa_id: string
  matricula: string
  ativo: boolean
}

export default function AssociadosPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [associados, setAssociados] = useState<Associado[]>([])

  const [pessoaId, setPessoaId] = useState("")
  const [matricula, setMatricula] = useState("")
  const [buscaPessoa, setBuscaPessoa] = useState("")
  const [pesquisa, setPesquisa] = useState("")

  const [editandoId, setEditandoId] = useState("")
  const [pessoaIdEdicao, setPessoaIdEdicao] = useState("")
  const [matriculaEdicao, setMatriculaEdicao] = useState("")

  useEffect(() => {
    const consultaPessoas = query(
      collection(db, "pessoas"),
      orderBy("nome", "asc")
    )

    const unsubscribePessoas = onSnapshot(consultaPessoas, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Pessoa[]

      setPessoas(lista)
    })

    return () => unsubscribePessoas()
  }, [])

  useEffect(() => {
    const consultaAssociados = query(
      collection(db, "associados"),
      orderBy("matricula", "asc")
    )

    const unsubscribeAssociados = onSnapshot(consultaAssociados, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Associado[]

      setAssociados(lista)
    })

    return () => unsubscribeAssociados()
  }, [])

  async function adicionarAssociado() {
    if (pessoaId === "") {
      alert("Selecione a pessoa.")
      return
    }

    if (matricula.trim() === "") {
      alert("Informe a matrícula.")
      return
    }

    const matriculaFormatada = matricula.trim()

    const matriculaExiste = associados.some(
      (item) => item.matricula === matriculaFormatada
    )

    if (matriculaExiste) {
      alert("Esta matrícula já existe.")
      return
    }

    const pessoaJaAssociada = associados.some(
      (item) => item.pessoa_id === pessoaId
    )

    if (pessoaJaAssociada) {
      alert("Esta pessoa já possui cadastro de associado.")
      return
    }

    await addDoc(collection(db, "associados"), {
      pessoa_id: pessoaId,
      matricula: matriculaFormatada,
      ativo: true,
      data_associacao: serverTimestamp(),
      criado_em: serverTimestamp(),
      atualizado_em: serverTimestamp()
    })

    setPessoaId("")
    setMatricula("")
    setBuscaPessoa("")
  }

  async function salvarEdicaoAssociado(id: string) {
    if (pessoaIdEdicao === "") {
      alert("Selecione a pessoa.")
      return
    }

    if (matriculaEdicao.trim() === "") {
      alert("Informe a matrícula.")
      return
    }

    const matriculaFormatada = matriculaEdicao.trim()

    const matriculaExiste = associados.some(
      (item) => item.id !== id && item.matricula === matriculaFormatada
    )

    if (matriculaExiste) {
      alert("Esta matrícula já existe.")
      return
    }

    const pessoaJaAssociada = associados.some(
      (item) => item.id !== id && item.pessoa_id === pessoaIdEdicao
    )

    if (pessoaJaAssociada) {
      alert("Esta pessoa já possui cadastro de associado.")
      return
    }

    await updateDoc(doc(db, "associados", id), {
      pessoa_id: pessoaIdEdicao,
      matricula: matriculaFormatada,
      atualizado_em: serverTimestamp()
    })

    cancelarEdicao()
  }

  async function alternarStatus(id: string, ativoAtual: boolean) {
    await updateDoc(doc(db, "associados", id), {
      ativo: !ativoAtual,
      atualizado_em: serverTimestamp()
    })
  }

  function iniciarEdicao(associado: Associado) {
    setEditandoId(associado.id || "")
    setPessoaIdEdicao(associado.pessoa_id)
    setMatriculaEdicao(associado.matricula)
  }

  function cancelarEdicao() {
    setEditandoId("")
    setPessoaIdEdicao("")
    setMatriculaEdicao("")
  }

  function buscarPessoa(pessoa_id: string) {
    return pessoas.find((item) => item.id === pessoa_id)
  }

  function buscarNomePessoa(pessoa_id: string) {
    return buscarPessoa(pessoa_id)?.nome || "Pessoa não encontrada"
  }

  const pessoasEncontradas = pessoas
    .filter((pessoa) => pessoa.ativo)
    .filter((pessoa) => {
      const termo = buscaPessoa.toLowerCase().trim()

      if (termo.length < 2) return false

      return pessoa.nome.toLowerCase().includes(termo)
    })
    .slice(0, 8)

  const associadosFiltrados = associados.filter((associado) => {
    const termo = pesquisa.toLowerCase().trim()
    const pessoa = buscarPessoa(associado.pessoa_id)

    return (
      pessoa?.nome.toLowerCase().includes(termo) ||
      associado.matricula.toLowerCase().includes(termo)
    )
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">
          Associados
        </h1>

        <p className="text-zinc-400">
          Cadastro de associados da ADUSEPS.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">
          Novo associado
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar pessoa por nome"
              value={buscaPessoa}
              onChange={(e) => {
                setBuscaPessoa(e.target.value)
                setPessoaId("")
              }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
            />

            {buscaPessoa.trim().length >= 2 && pessoaId === "" && (
              <div className="absolute z-20 mt-2 w-full bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden shadow-xl">
                {pessoasEncontradas.length === 0 && (
                  <p className="px-4 py-3 text-sm text-zinc-400">
                    Nenhuma pessoa encontrada.
                  </p>
                )}

                {pessoasEncontradas.map((pessoa) => (
                  <button
                    key={pessoa.id}
                    type="button"
                    onClick={() => {
                      setPessoaId(pessoa.id || "")
                      setBuscaPessoa(pessoa.nome)
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-700 text-sm"
                  >
                    {pessoa.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder="Matrícula"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          />
        </div>

        <button
          onClick={adicionarAssociado}
          className="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold"
        >
          Adicionar
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h2 className="text-2xl font-bold">
            Associados cadastrados
          </h2>

          <input
            type="text"
            placeholder="Pesquisar por nome ou matrícula"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            className="w-full md:w-96 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          />
        </div>

        <div className="space-y-3">
          {associadosFiltrados.length === 0 && (
            <p className="text-zinc-500">
              Nenhum associado encontrado.
            </p>
          )}

          {associadosFiltrados.map((associado) => (
            <div
              key={associado.id}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="flex-1">
                {editandoId === associado.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={pessoaIdEdicao}
                      onChange={(e) => setPessoaIdEdicao(e.target.value)}
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 outline-none"
                    >
                      <option value="">
                        Selecione a pessoa
                      </option>

                      {pessoas
                        .filter(
                          (pessoa) =>
                            pessoa.ativo ||
                            pessoa.id === associado.pessoa_id
                        )
                        .map((pessoa) => (
                          <option
                            key={pessoa.id}
                            value={pessoa.id}
                          >
                            {pessoa.nome}
                          </option>
                        ))}
                    </select>

                    <input
                      type="text"
                      value={matriculaEdicao}
                      onChange={(e) => setMatriculaEdicao(e.target.value)}
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <p className="font-bold text-lg">
                      {buscarNomePessoa(associado.pessoa_id)}
                    </p>

                    <p className="text-sm text-zinc-400">
                      Matrícula: {associado.matricula}
                    </p>
                  </>
                )}

                <p className="text-sm text-zinc-500 mt-1">
                  Status: {associado.ativo ? "Ativo" : "Inativo"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {editandoId === associado.id ? (
                  <>
                    <button
                      onClick={() => salvarEdicaoAssociado(associado.id!)}
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
                      onClick={() => iniciarEdicao(associado)}
                      className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-sm font-bold"
                    >
                      Editar
                    </button>

                    {associado.id && (
                      <button
                        onClick={() => alternarStatus(associado.id!, associado.ativo)}
                        className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-sm font-bold"
                      >
                        {associado.ativo ? "Inativar" : "Reativar"}
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