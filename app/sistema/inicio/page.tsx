"use client"

import { useEffect, useMemo, useState } from "react"

import {
  collection,
  onSnapshot,
  orderBy,
  query
} from "firebase/firestore"

import { db } from "../../../lib/firebase"

// =====================================================
// TIPOS DAS ENTIDADES
// =====================================================

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

// =====================================================
// OPÇÕES DOS FILTROS
// =====================================================

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
  // =====================================================
  // LISTAS VINDAS DO FIRESTORE
  // =====================================================

  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [associados, setAssociados] = useState<Associado[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [convenios, setConvenios] = useState<Convenio[]>([])
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])

  // =====================================================
  // ESTADOS DOS FILTROS
  // =====================================================

  const [dataInicial, setDataInicial] = useState("")
  const [dataFinal, setDataFinal] = useState("")
  const [busca, setBusca] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [tipoFiltro, setTipoFiltro] = useState("todos")
  const [profissionalFiltro, setProfissionalFiltro] = useState("todos")
  const [convenioFiltro, setConvenioFiltro] = useState("todos")

  // =====================================================
  // ESTADO DA PAGINAÇÃO
  // =====================================================

  const [paginaAtual, setPaginaAtual] = useState(1)
  const itensPorPagina = 50

  // =====================================================
  // CONSULTA DE PESSOAS
  // =====================================================

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

  // =====================================================
  // CONSULTA DE ASSOCIADOS
  // =====================================================

  useEffect(() => {
    const consulta = query(
      collection(db, "associados"),
      orderBy("matricula", "asc")
    )

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Associado[]

      setAssociados(lista)
    })

    return () => unsubscribe()
  }, [])

  // =====================================================
  // CONSULTA DE PROFISSIONAIS
  // =====================================================

  useEffect(() => {
    const consulta = query(
      collection(db, "profissionais"),
      orderBy("nome", "asc")
    )

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Profissional[]

      setProfissionais(lista)
    })

    return () => unsubscribe()
  }, [])

  // =====================================================
  // CONSULTA DE CONVÊNIOS
  // =====================================================

  useEffect(() => {
    const consulta = query(
      collection(db, "convenios"),
      orderBy("nome", "asc")
    )

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Convenio[]

      setConvenios(lista)
    })

    return () => unsubscribe()
  }, [])

  // =====================================================
  // CONSULTA DE ATENDIMENTOS
  // =====================================================

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

  // =====================================================
  // FUNÇÕES AUXILIARES DE BUSCA POR ID
  // =====================================================

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

  // =====================================================
  // DATA DO ATENDIMENTO
  // =====================================================

  function dataDoAtendimento(atendimento: Atendimento) {
    if (!atendimento.data_hora_chegada?.seconds) return null

    return new Date(atendimento.data_hora_chegada.seconds * 1000)
  }

  function formatarDataHora(atendimento: Atendimento) {
    const data = dataDoAtendimento(atendimento)

    if (!data) return "-"

    return data.toLocaleString("pt-BR")
  }

  // =====================================================
  // STATUS VISUAL
  // =====================================================

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
      aguardando: "border-amber-500/30 bg-amber-500/10 text-amber-300",
      em_atendimento: "border-sky-500/30 bg-sky-500/10 text-sky-300",
      finalizado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      cancelado: "border-rose-500/30 bg-rose-500/10 text-rose-300"
    }

    return classes[status] || "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"
  }

  // =====================================================
  // LIMPAR FILTROS
  // =====================================================

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

  // =====================================================
  // FILTRO PRINCIPAL DOS ATENDIMENTOS
  // =====================================================

  const atendimentosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim()

    return atendimentos.filter((atendimento) => {
      const pessoa = buscarPessoa(atendimento.pessoa_id)
      const associado = buscarAssociado(atendimento.associado_id)
      const profissional = buscarProfissional(atendimento.profissional_id)
      const profissionalPreferencial = buscarProfissional(
        atendimento.profissional_preferencial_id
      )
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

      if (
        convenioFiltro !== "todos" &&
        atendimento.convenio_id !== convenioFiltro
      ) {
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

  // =====================================================
  // PAGINAÇÃO
  // =====================================================

  const totalPaginas = Math.max(
    1,
    Math.ceil(atendimentosFiltrados.length / itensPorPagina)
  )

  const inicio = (paginaAtual - 1) * itensPorPagina
  const fim = inicio + itensPorPagina

  const atendimentosPaginados =
    atendimentosFiltrados.slice(inicio, fim)

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

  // =====================================================
  // CONTADORES
  // =====================================================

  const totalAguardando =
    atendimentosFiltrados.filter((a) => a.status === "aguardando").length

  const totalEmAtendimento =
    atendimentosFiltrados.filter((a) => a.status === "em_atendimento").length

  const totalFinalizados =
    atendimentosFiltrados.filter((a) => a.status === "finalizado").length

  const totalCancelados =
    atendimentosFiltrados.filter((a) => a.status === "cancelado").length

  return (
    <div className="space-y-6">
      {/* =====================================================
          CABEÇALHO DA PÁGINA
          ===================================================== */}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Início
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          Visão geral e histórico de atendimentos do sistema.
        </p>
      </div>

      {/* =====================================================
          CARDS RESUMO
          ===================================================== */}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs font-medium text-zinc-500">Total filtrado</p>
          <p className="mt-1 text-2xl font-bold text-zinc-100">
            {atendimentosFiltrados.length}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs font-medium text-zinc-500">Aguardando</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">
            {totalAguardando}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs font-medium text-zinc-500">Em atendimento</p>
          <p className="mt-1 text-2xl font-bold text-sky-300">
            {totalEmAtendimento}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs font-medium text-zinc-500">Finalizados</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">
            {totalFinalizados}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs font-medium text-zinc-500">Cancelados</p>
          <p className="mt-1 text-2xl font-bold text-rose-300">
            {totalCancelados}
          </p>
        </div>
      </div>

      {/* =====================================================
          FILTROS
          ===================================================== */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Filtros
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Refine a consulta por data, status, tipo, profissional ou convênio.
            </p>
          </div>

          <button
            onClick={limparFiltros}
            className="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-4 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
          >
            Limpar filtros
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="date"
            value={dataInicial}
            onChange={(e) => setDataInicial(e.target.value)}
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
          />

          <input
            type="date"
            value={dataFinal}
            onChange={(e) => setDataFinal(e.target.value)}
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
          />

          <input
            type="text"
            placeholder="Buscar por nome, matrícula, observação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 xl:col-span-2"
          />

          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
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
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
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
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
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
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="todos">Convênio: Todos</option>

            {convenios.map((convenio) => (
              <option key={convenio.id} value={convenio.id}>
                {convenio.nome}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* =====================================================
          HISTÓRICO DE ATENDIMENTOS
          ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-zinc-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Histórico de atendimentos
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Mostrando {atendimentosPaginados.length} de{" "}
              {atendimentosFiltrados.length} registros filtrados.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alterarPagina(paginaAtual - 1)}
              disabled={paginaAtual === 1}
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-4 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>

            <span className="text-sm text-zinc-400">
              Página {paginaAtual} de {totalPaginas}
            </span>

            <button
              onClick={() => alterarPagina(paginaAtual + 1)}
              disabled={paginaAtual === totalPaginas}
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-4 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>

        {atendimentosPaginados.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-zinc-300">
              Nenhum atendimento encontrado.
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Ajuste os filtros para consultar outros registros.
            </p>
          </div>
        )}

        {atendimentosPaginados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">
                    Pessoa
                  </th>

                  <th className="px-5 py-3 text-left font-semibold">
                    Tipo / Matrícula
                  </th>

                  <th className="px-5 py-3 text-left font-semibold">
                    Convênio
                  </th>

                  <th className="px-5 py-3 text-left font-semibold">
                    Profissional
                  </th>

                  <th className="w-40 px-5 py-3 text-left font-semibold">
                    Status
                  </th>

                  <th className="w-48 px-5 py-3 text-left font-semibold">
                    Chegada
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800">
                {atendimentosPaginados.map((atendimento) => {
                  const pessoa = buscarPessoa(atendimento.pessoa_id)
                  const associado = buscarAssociado(atendimento.associado_id)
                  const profissional = buscarProfissional(
                    atendimento.profissional_id
                  )
                  const profissionalPreferencial = buscarProfissional(
                    atendimento.profissional_preferencial_id
                  )
                  const convenio = buscarConvenio(atendimento.convenio_id)

                  return (
                    <tr
                      key={atendimento.id}
                      className="transition hover:bg-zinc-800/50"
                    >
                      <td className="px-5 py-3 align-middle">
                        <div>
                          <p className="font-semibold text-zinc-100">
                            {pessoa?.nome || "Pessoa não encontrada"}
                          </p>

                          {(atendimento.observacao || atendimento.motivo) && (
                            <p className="mt-0.5 max-w-[360px] truncate text-xs text-zinc-500">
                              {atendimento.observacao ||
                                `Cancelamento: ${atendimento.motivo}`}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3 align-middle text-zinc-300">
                        <div>
                          <p>
                            {atendimento.tipo === "associado"
                              ? "Associado"
                              : "Não associado"}
                          </p>

                          <p className="mt-0.5 text-xs text-zinc-500">
                            {associado
                              ? `Matrícula ${associado.matricula}`
                              : "Sem matrícula"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-3 align-middle text-zinc-300">
                        {convenio?.nome || "Não informado"}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        <div>
                          <p className="text-zinc-300">
                            {profissional?.nome || "Não definido"}
                          </p>

                          {profissionalPreferencial && (
                            <p className="mt-0.5 text-xs text-zinc-500">
                              Preferência: {profissionalPreferencial.nome}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3 align-middle">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${classeStatus(
                            atendimento.status
                          )}`}
                        >
                          {nomeStatus(atendimento.status)}
                        </span>
                      </td>

                      <td className="px-5 py-3 align-middle text-zinc-400">
                        {formatarDataHora(atendimento)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end items-center gap-2 border-t border-zinc-800 px-5 py-4">
          <button
            onClick={() => alterarPagina(paginaAtual - 1)}
            disabled={paginaAtual === 1}
            className="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-4 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>

          <span className="text-sm text-zinc-400">
            Página {paginaAtual} de {totalPaginas}
          </span>

          <button
            onClick={() => alterarPagina(paginaAtual + 1)}
            disabled={paginaAtual === totalPaginas}
            className="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-4 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </section>
    </div>
  )
}