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
  ativo: boolean
}

type Associado = {
  id?: string
  pessoa_id: string
  matricula: string
  ativo: boolean
}

type Representante = {
  id?: string
  associado_id: string
  pessoa_id: string
  tipo: string
  ativo: boolean
}

const tiposRepresentante = [
  "Cônjuge",
  "Filho(a)",
  "Responsável",
  "Terceiro",
  "Advogado",
  "Outro"
]

export default function RepresentantesPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [associados, setAssociados] = useState<Associado[]>([])
  const [representantes, setRepresentantes] = useState<Representante[]>([])

  const [associadoId, setAssociadoId] = useState("")
  const [pessoaId, setPessoaId] = useState("")
  const [tipo, setTipo] = useState("")
  const [pesquisa, setPesquisa] = useState("")

  const [buscaAssociado, setBuscaAssociado] = useState("")
  const [buscaPessoa, setBuscaPessoa] = useState("")

  const [editandoId, setEditandoId] = useState("")
  const [associadoIdEdicao, setAssociadoIdEdicao] = useState("")
  const [pessoaIdEdicao, setPessoaIdEdicao] = useState("")
  const [tipoEdicao, setTipoEdicao] = useState("")

  useEffect(() => {
    const consulta = query(collection(db, "pessoas"), orderBy("nome", "asc"))

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Pessoa[]

      setPessoas(lista)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const consulta = query(collection(db, "associados"), orderBy("matricula", "asc"))

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Associado[]

      setAssociados(lista)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const consulta = query(
      collection(db, "associado_representantes"),
      orderBy("criado_em", "desc")
    )

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Representante[]

      setRepresentantes(lista)
    })

    return () => unsubscribe()
  }, [])

  async function adicionarRepresentante() {
    if (associadoId === "") {
      alert("Selecione o associado.")
      return
    }

    if (pessoaId === "") {
      alert("Selecione a pessoa representante.")
      return
    }

    if (tipo === "") {
      alert("Selecione o tipo de representante.")
      return
    }

    const representanteExiste = representantes.some(
      (representante) =>
        representante.associado_id === associadoId &&
        representante.pessoa_id === pessoaId
    )

    if (representanteExiste) {
      alert("Esta pessoa já está vinculada como representante deste associado.")
      return
    }

    await addDoc(collection(db, "associado_representantes"), {
      associado_id: associadoId,
      pessoa_id: pessoaId,
      tipo,
      ativo: true,
      criado_em: serverTimestamp(),
      atualizado_em: serverTimestamp()
    })

    setAssociadoId("")
    setPessoaId("")
    setTipo("")
    setBuscaAssociado("")
    setBuscaPessoa("")
  }

  async function salvarEdicaoRepresentante(id: string) {
    if (associadoIdEdicao === "") {
      alert("Selecione o associado.")
      return
    }

    if (pessoaIdEdicao === "") {
      alert("Selecione a pessoa representante.")
      return
    }

    if (tipoEdicao === "") {
      alert("Selecione o tipo de representante.")
      return
    }

    const representanteExiste = representantes.some(
      (representante) =>
        representante.id !== id &&
        representante.associado_id === associadoIdEdicao &&
        representante.pessoa_id === pessoaIdEdicao
    )

    if (representanteExiste) {
      alert("Esta pessoa já está vinculada como representante deste associado.")
      return
    }

    await updateDoc(doc(db, "associado_representantes", id), {
      associado_id: associadoIdEdicao,
      pessoa_id: pessoaIdEdicao,
      tipo: tipoEdicao,
      atualizado_em: serverTimestamp()
    })

    cancelarEdicao()
  }

  async function alternarStatus(id: string, ativoAtual: boolean) {
    await updateDoc(doc(db, "associado_representantes", id), {
      ativo: !ativoAtual,
      atualizado_em: serverTimestamp()
    })
  }

  function iniciarEdicao(representante: Representante) {
    setEditandoId(representante.id || "")
    setAssociadoIdEdicao(representante.associado_id)
    setPessoaIdEdicao(representante.pessoa_id)
    setTipoEdicao(representante.tipo)
  }

  function cancelarEdicao() {
    setEditandoId("")
    setAssociadoIdEdicao("")
    setPessoaIdEdicao("")
    setTipoEdicao("")
  }

  function buscarPessoa(pessoa_id: string) {
    return pessoas.find((item) => item.id === pessoa_id)
  }

  function buscarAssociado(associado_id: string) {
    return associados.find((item) => item.id === associado_id)
  }

  function buscarNomeAssociado(associado_id: string) {
    const associado = buscarAssociado(associado_id)

    if (!associado) return "Associado não encontrado"

    const pessoa = buscarPessoa(associado.pessoa_id)

    return pessoa
      ? `${pessoa.nome} - Matrícula ${associado.matricula}`
      : "Pessoa não encontrada"
  }

  const associadosEncontrados = associados
    .filter((associado) => associado.ativo)
    .filter((associado) => {
      const termo = buscaAssociado.toLowerCase().trim()
      const pessoa = buscarPessoa(associado.pessoa_id)

      if (termo.length < 2) return false

      return (
        pessoa?.nome.toLowerCase().includes(termo) ||
        associado.matricula.toLowerCase().includes(termo)
      )
    })
    .slice(0, 8)

  const pessoasEncontradas = pessoas
    .filter((pessoa) => pessoa.ativo)
    .filter((pessoa) => {
      const termo = buscaPessoa.toLowerCase().trim()

      if (termo.length < 2) return false

      return pessoa.nome.toLowerCase().includes(termo)
    })
    .slice(0, 8)

  const representantesFiltrados = representantes.filter((representante) => {
    const termo = pesquisa.toLowerCase().trim()
    const pessoaRepresentante = buscarPessoa(representante.pessoa_id)
    const nomeAssociado = buscarNomeAssociado(representante.associado_id)

    return (
      pessoaRepresentante?.nome.toLowerCase().includes(termo) ||
      nomeAssociado.toLowerCase().includes(termo) ||
      representante.tipo.toLowerCase().includes(termo)
    )
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">
          Representantes
        </h1>

        <p className="text-zinc-400">
          Vínculo entre associados e seus representantes.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">
          Novo representante
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar associado por nome ou matrícula"
              value={buscaAssociado}
              onChange={(e) => {
                setBuscaAssociado(e.target.value)
                setAssociadoId("")
              }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
            />

            {buscaAssociado.trim().length >= 2 && associadoId === "" && (
              <div className="absolute z-20 mt-2 w-full bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden shadow-xl">
                {associadosEncontrados.length === 0 && (
                  <p className="px-4 py-3 text-sm text-zinc-400">
                    Nenhum associado encontrado.
                  </p>
                )}

                {associadosEncontrados.map((associado) => (
                  <button
                    key={associado.id}
                    type="button"
                    onClick={() => {
                      setAssociadoId(associado.id || "")
                      setBuscaAssociado(buscarNomeAssociado(associado.id || ""))
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-700 text-sm"
                  >
                    {buscarNomeAssociado(associado.id || "")}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar pessoa representante"
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

          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          >
            <option value="">Tipo</option>

            {tiposRepresentante.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={adicionarRepresentante}
          className="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold"
        >
          Adicionar
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h2 className="text-2xl font-bold">
            Representantes cadastrados
          </h2>

          <input
            type="text"
            placeholder="Pesquisar por representante, associado ou tipo"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            className="w-full md:w-96 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          />
        </div>

        <div className="space-y-3">
          {representantesFiltrados.length === 0 && (
            <p className="text-zinc-500">
              Nenhum representante encontrado.
            </p>
          )}

          {representantesFiltrados.map((representante) => (
            <div
              key={representante.id}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="flex-1">
                {editandoId === representante.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                      value={associadoIdEdicao}
                      onChange={(e) => setAssociadoIdEdicao(e.target.value)}
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 outline-none"
                    >
                      <option value="">Selecione o associado</option>

                      {associados
                        .filter(
                          (associado) =>
                            associado.ativo ||
                            associado.id === representante.associado_id
                        )
                        .map((associado) => (
                          <option key={associado.id} value={associado.id}>
                            {buscarNomeAssociado(associado.id!)}
                          </option>
                        ))}
                    </select>

                    <select
                      value={pessoaIdEdicao}
                      onChange={(e) => setPessoaIdEdicao(e.target.value)}
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 outline-none"
                    >
                      <option value="">Selecione a pessoa</option>

                      {pessoas
                        .filter(
                          (pessoa) =>
                            pessoa.ativo ||
                            pessoa.id === representante.pessoa_id
                        )
                        .map((pessoa) => (
                          <option key={pessoa.id} value={pessoa.id}>
                            {pessoa.nome}
                          </option>
                        ))}
                    </select>

                    <select
                      value={tipoEdicao}
                      onChange={(e) => setTipoEdicao(e.target.value)}
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 outline-none"
                    >
                      <option value="">Tipo</option>

                      {tiposRepresentante.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <p className="font-bold text-lg">
                      {buscarPessoa(representante.pessoa_id)?.nome || "Pessoa não encontrada"}
                    </p>

                    <p className="text-sm text-zinc-400">
                      Representa: {buscarNomeAssociado(representante.associado_id)}
                    </p>

                    <p className="text-sm text-zinc-400">
                      Tipo: {representante.tipo}
                    </p>
                  </>
                )}

                <p className="text-sm text-zinc-500 mt-1">
                  Status: {representante.ativo ? "Ativo" : "Inativo"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {editandoId === representante.id ? (
                  <>
                    <button
                      onClick={() => salvarEdicaoRepresentante(representante.id!)}
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
                      onClick={() => iniciarEdicao(representante)}
                      className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-sm font-bold"
                    >
                      Editar
                    </button>

                    {representante.id && (
                      <button
                        onClick={() => alternarStatus(representante.id!, representante.ativo)}
                        className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-sm font-bold"
                      >
                        {representante.ativo ? "Inativar" : "Reativar"}
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