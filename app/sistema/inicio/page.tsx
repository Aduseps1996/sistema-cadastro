"use client"

import { useEffect, useMemo, useState } from "react"

import {
  collection,
  onSnapshot,
  orderBy,
  query
} from "firebase/firestore"

import { db } from "../../../lib/firebase"

type Pessoa = {
  id?: string
  nome: string
}

type Associado = {
  id?: string
  pessoa_id: string
  matricula: string
}

type Profissional = {
  id?: string
  nome: string
}

type Convenio = {
  id?: string
  nome: string
}

type Atendimento = {
  id?: string
  pessoa_id: string
  associado_id?: string | null
  profissional_id?: string | null
  profissional_preferencial_id?: string | null
  convenio_id?: string | null
  tipo: "associado" | "nao_associado"
  status: "aguardando" | "em_atendimento" | "finalizado" | "cancelado"
  observacao?: string
  motivo?: string
  data_hora_chegada?: any
  inicio_atendimento?: any
  fim_atendimento?: any
}

const statusOpcoes = [
  { valor: "todos", nome: "Todos" },
  { valor: "aguardando", nome: "Aguardando" },
  { valor: "em_atendimento", nome: "Em atendimento" },
  { valor: "finalizado", nome: "Finalizado" },
  { valor: "cancelado", nome: "Cancelado" }
]

const tiposOpcoes = [
  { valor: "todos", nome: "Todos" },
  { valor: "associado", nome: "Associado" },
  { valor: "nao_associado", nome: "Não associado" }
]

export default function InicioPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [associados, setAssociados] = useState<Associado[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [convenios, setConvenios] = useState<Convenio[]>([])
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])

  const [dataInicial, setDataInicial] = useState("")
  const [dataFinal, setDataFinal] = useState("")
  const [busca, setBusca] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [tipoFiltro, setTipoFiltro] = useState("todos")
  const [profissionalFiltro, setProfissionalFiltro] = useState("todos")
  const [convenioFiltro, setConvenioFiltro] = useState("todos")

  const [paginaAtual, setPaginaAtual] = useState(1)

  const itensPorPagina = 50

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
    const consulta = query(collection(db, "profissionais"), orderBy("nome", "asc"))

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Profissional[]

      setProfissionais(lista)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const consulta = query(collection(db, "convenios"), orderBy("nome", "asc"))

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Convenio[]

      setConvenios(lista)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const consulta = query(
      collection(db, "atendimentos"),
      orderBy("data_hora_chegada", "desc")
    )

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Atendimento[]

      setAtendimentos(lista)
    })

    return () => unsubscribe()
  }, [])

  function buscarPessoa(id?: string | null) {
    return pessoas.find((pessoa) => pessoa.id === id)
  }

  function buscarAssociado(id?: string | null) {
    return associados.find((associado) => associado.id === id)
  }

  function buscarProfissional(id?: string | null) {
    return profissionais.find((profissional) => profissional.id === id)
  }

  function buscarConvenio(id?: string | null) {
    return convenios.find((convenio) => convenio.id === id)
  }

  function dataDoAtendimento(atendimento: Atendimento) {
    if (!atendimento.data_hora_chegada?.seconds) return null

    return new Date(atendimento.data_hora_chegada.seconds * 1000)
  }

  function formatarDataHora(atendimento: Atendimento) {
    const data = dataDoAtendimento(atendimento)

    if (!data) return "-"

    return data.toLocaleString("pt-BR")
  }

  function nomeStatus(status: string) {
    const nomes: Record<string, string> = {
      aguardando: "Aguardando",
      em_atendimento: "Em atendimento",
      finalizado: "Finalizado",
      cancelado: "Cancelado"
    }

    return nomes[status] || status
  }

  function classeStatus(status: string) {
    const classes: Record<string, string> = {
      aguardando: "bg-amber-600 text-white",
      em_atendimento: "bg-sky-600 text-white",
      finalizado: "bg-emerald-600 text-white",
      cancelado: "bg-rose-600 text-white"
    }

    return classes[status] || "bg-zinc-700 text-white"
  }

  function limparFiltros() {
    setDataInicial("")
    setDataFinal("")
    setBusca("")
    setStatusFiltro("todos")
    setTipoFiltro("todos")
    setProfissionalFiltro("todos")
    setConvenioFiltro("todos")
    setPaginaAtual(1)
  }

  const atendimentosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim()

    return atendimentos.filter((atendimento) => {
      const pessoa = buscarPessoa(atendimento.pessoa_id)
      const associado = buscarAssociado(atendimento.associado_id)
      const profissional = buscarProfissional(atendimento.profissional_id)
      const profissionalPreferencial = buscarProfissional(atendimento.profissional_preferencial_id)
      const convenio = buscarConvenio(atendimento.convenio_id)
      const data = dataDoAtendimento(atendimento)

      if (dataInicial) {
        const inicio = new Date(`${dataInicial}T00:00:00`)

        if (!data || data < inicio) return false
      }

      if (dataFinal) {
        const fim = new Date(`${dataFinal}T23:59:59`)

        if (!data || data > fim) return false
      }

      if (statusFiltro !== "todos" && atendimento.status !== statusFiltro) {
        return false
      }

      if (tipoFiltro !== "todos" && atendimento.tipo !== tipoFiltro) {
        return false
      }

      if (
        profissionalFiltro !== "todos" &&
        atendimento.profissional_id !== profissionalFiltro &&
        atendimento.profissional_preferencial_id !== profissionalFiltro
      ) {
        return false
      }

      if (convenioFiltro !== "todos" && atendimento.convenio_id !== convenioFiltro) {
        return false
      }

      if (termo) {
        const textoBusca = [
          pessoa?.nome,
          associado?.matricula,
          profissional?.nome,
          profissionalPreferencial?.nome,
          convenio?.nome,
          atendimento.observacao,
          atendimento.motivo,
          atendimento.tipo,
          atendimento.status
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        if (!textoBusca.includes(termo)) return false
      }

      return true
    })
  }, [
    atendimentos,
    pessoas,
    associados,
    profissionais,
    convenios,
    dataInicial,
    dataFinal,
    busca,
    statusFiltro,
    tipoFiltro,
    profissionalFiltro,
    convenioFiltro
  ])

  const totalPaginas = Math.max(1, Math.ceil(atendimentosFiltrados.length / itensPorPagina))
  const inicio = (paginaAtual - 1) * itensPorPagina
  const fim = inicio + itensPorPagina
  const atendimentosPaginados = atendimentosFiltrados.slice(inicio, fim)

  const totalAguardando = atendimentosFiltrados.filter((a) => a.status === "aguardando").length
  const totalEmAtendimento = atendimentosFiltrados.filter((a) => a.status === "em_atendimento").length
  const totalFinalizados = atendimentosFiltrados.filter((a) => a.status === "finalizado").length
  const totalCancelados = atendimentosFiltrados.filter((a) => a.status === "cancelado").length

  function alterarPagina(novaPagina: number) {
    if (novaPagina < 1 || novaPagina > totalPaginas) return

    setPaginaAtual(novaPagina)
  }

  useEffect(() => {
    setPaginaAtual(1)
  }, [
    dataInicial,
    dataFinal,
    busca,
    statusFiltro,
    tipoFiltro,
    profissionalFiltro,
    convenioFiltro
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black">
          Início
        </h1>

        <p className="text-zinc-400 mt-2">
          Visão geral e histórico de atendimentos do sistema.
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
          <p className="text-sm text-zinc-400">Total filtrado</p>
          <p className="text-4xl font-black mt-2 text-zinc-100">
            {atendimentosFiltrados.length}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
          <p className="text-sm text-zinc-400">Aguardando</p>
          <p className="text-4xl font-black mt-2 text-amber-400">
            {totalAguardando}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
          <p className="text-sm text-zinc-400">Em atendimento</p>
          <p className="text-4xl font-black mt-2 text-sky-400">
            {totalEmAtendimento}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
          <p className="text-sm text-zinc-400">Finalizados</p>
          <p className="text-4xl font-black mt-2 text-emerald-400">
            {totalFinalizados}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
          <p className="text-sm text-zinc-400">Cancelados</p>
          <p className="text-4xl font-black mt-2 text-rose-400">
            {totalCancelados}
          </p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold">
            Filtros
          </h2>

          <button
            onClick={limparFiltros}
            className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm font-bold"
          >
            Limpar filtros
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <input
            type="date"
            value={dataInicial}
            onChange={(e) => setDataInicial(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          />

          <input
            type="date"
            value={dataFinal}
            onChange={(e) => setDataFinal(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          />

          <input
            type="text"
            placeholder="Buscar por nome, matrícula, observação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none xl:col-span-2"
          />

          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          >
            {statusOpcoes.map((status) => (
              <option key={status.valor} value={status.valor}>
                Status: {status.nome}
              </option>
            ))}
          </select>

          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          >
            {tiposOpcoes.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>
                Tipo: {tipo.nome}
              </option>
            ))}
          </select>

          <select
            value={profissionalFiltro}
            onChange={(e) => setProfissionalFiltro(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          >
            <option value="todos">Profissional: Todos</option>

            {profissionais.map((profissional) => (
              <option key={profissional.id} value={profissional.id}>
                {profissional.nome}
              </option>
            ))}
          </select>

          <select
            value={convenioFiltro}
            onChange={(e) => setConvenioFiltro(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          >
            <option value="todos">Convênio: Todos</option>

            {convenios.map((convenio) => (
              <option key={convenio.id} value={convenio.id}>
                {convenio.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              Histórico de atendimentos
            </h2>

            <p className="text-sm text-zinc-500 mt-1">
              Mostrando {atendimentosPaginados.length} de {atendimentosFiltrados.length} registros filtrados.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alterarPagina(paginaAtual - 1)}
              disabled={paginaAtual === 1}
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 px-4 py-2 rounded-lg text-sm font-bold"
            >
              Anterior
            </button>

            <span className="text-sm text-zinc-400">
              Página {paginaAtual} de {totalPaginas}
            </span>

            <button
              onClick={() => alterarPagina(paginaAtual + 1)}
              disabled={paginaAtual === totalPaginas}
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 px-4 py-2 rounded-lg text-sm font-bold"
            >
              Próxima
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {atendimentosPaginados.length === 0 && (
            <p className="text-zinc-500">
              Nenhum atendimento encontrado.
            </p>
          )}

          {atendimentosPaginados.map((atendimento) => {
            const pessoa = buscarPessoa(atendimento.pessoa_id)
            const associado = buscarAssociado(atendimento.associado_id)
            const profissional = buscarProfissional(atendimento.profissional_id)
            const profissionalPreferencial = buscarProfissional(atendimento.profissional_preferencial_id)
            const convenio = buscarConvenio(atendimento.convenio_id)

            return (
              <div
                key={atendimento.id}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-base truncate">
                        {pessoa?.nome || "Pessoa não encontrada"}
                      </p>

                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${classeStatus(atendimento.status)}`}>
                        {nomeStatus(atendimento.status)}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
                      <span>
                        {atendimento.tipo === "associado" ? "Associado" : "Não associado"}
                      </span>

                      {associado && (
                        <span>
                          Matrícula: {associado.matricula}
                        </span>
                      )}

                      {convenio && (
                        <span>
                          Convênio: {convenio.nome}
                        </span>
                      )}

                      <span>
                        Chegada: {formatarDataHora(atendimento)}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      {profissional && (
                        <span>
                          Atendido por: {profissional.nome}
                        </span>
                      )}

                      {profissionalPreferencial && (
                        <span>
                          Preferência: {profissionalPreferencial.nome}
                        </span>
                      )}

                      {atendimento.observacao && (
                        <span>
                          Obs: {atendimento.observacao}
                        </span>
                      )}

                      {atendimento.motivo && (
                        <span>
                          Cancelamento: {atendimento.motivo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end items-center gap-2 mt-6">
          <button
            onClick={() => alterarPagina(paginaAtual - 1)}
            disabled={paginaAtual === 1}
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 px-4 py-2 rounded-lg text-sm font-bold"
          >
            Anterior
          </button>

          <span className="text-sm text-zinc-400">
            Página {paginaAtual} de {totalPaginas}
          </span>

          <button
            onClick={() => alterarPagina(paginaAtual + 1)}
            disabled={paginaAtual === totalPaginas}
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 px-4 py-2 rounded-lg text-sm font-bold"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  )
}