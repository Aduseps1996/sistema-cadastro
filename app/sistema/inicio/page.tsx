"use client"

import { useEffect, useMemo, useState } from "react"

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore"

import { db } from "../../../lib/firebase"
import { useUsuario } from "../../context/UsuarioContext"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// Tipos de dados usados na página
import { FileSpreadsheet } from "lucide-react"

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
  motivo_categoria?: string
  motivo_detalhe?: string | null
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
  /* Estados de dados */
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

  /* Modal do Inicio */
  const { usuarioSistema } = useUsuario()

  const podeEditarHistorico =
    usuarioSistema?.perfil === "Administrador" ||
    usuarioSistema?.perfil === "Recepção"

  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [atendimentoSelecionado, setAtendimentoSelecionado] =
    useState<Atendimento | null>(null)

  const [editConvenioId, setEditConvenioId] = useState("")
  const [editProfissionalPreferencialId, setEditProfissionalPreferencialId] =
    useState("")
  const [editObservacao, setEditObservacao] = useState("")
  /* Fim modal */

  /* Carregar pessoas */
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

  /* Carregar associados */
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

  /* Carregar profissionais */
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

  /* Carregar convênios */
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

  /* Carregar atendimentos */
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

  /* Funções de busca de relacionamentos */
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

  /* Funções de formatação e datas */
  function dataDoAtendimento(atendimento: Atendimento) {
    if (!atendimento.data_hora_chegada?.seconds) return null

    return new Date(atendimento.data_hora_chegada.seconds * 1000)
  }

  function formatarDataHora(atendimento: Atendimento) {
    const data = dataDoAtendimento(atendimento)

    if (!data) return "-"

    return data.toLocaleString("pt-BR")
  }

  /* Funções de status visual */
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
      aguardando:
        "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      em_atendimento:
        "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      finalizado:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      cancelado:
        "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
    }

    return (
      classes[status] ||
      "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300"
    )
  }

  /* Função de limpeza de filtros */
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

  /* Cálculo de atendimentos filtrados */
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

  /* Paginação dos resultados */
  const totalPaginas = Math.max(
    1,
    Math.ceil(atendimentosFiltrados.length / itensPorPagina)
  )

  const inicio = (paginaAtual - 1) * itensPorPagina
  const fim = inicio + itensPorPagina

  const atendimentosPaginados = atendimentosFiltrados.slice(inicio, fim)

  function alterarPagina(novaPagina: number) {
    if (novaPagina < 1 || novaPagina > totalPaginas) return

    setPaginaAtual(novaPagina)
  }

  /* Resetar página sempre que filtros mudarem */
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

  /* Totais por status para o painel */
  const totalAguardando =
    atendimentosFiltrados.filter((a) => a.status === "aguardando").length

  const totalEmAtendimento =
    atendimentosFiltrados.filter((a) => a.status === "em_atendimento").length

  const totalFinalizados =
    atendimentosFiltrados.filter((a) => a.status === "finalizado").length

  const totalCancelados =
    atendimentosFiltrados.filter((a) => a.status === "cancelado").length


  /* Exportação de dados CSV */
  function formatarTimestampCSV(timestamp: any) {
    if (!timestamp?.seconds) return ""

    return format(
      new Date(timestamp.seconds * 1000),
      "dd/MM/yyyy HH:mm",
      { locale: ptBR }
    )
  }

  function limparCampoCSV(valor: string | undefined | null) {
    if (!valor) return ""

    return valor
      .replace(/;/g, ",")
      .replace(/\n/g, " ")
      .replace(/\r/g, " ")
  }

  function exportarAtendimentosCSV() {
    if (atendimentosFiltrados.length === 0) {
      alert("Não há atendimentos para exportar.")
      return
    }

    const cabecalho = [
      "Data chegada",
      "Pessoa",
      "Tipo",
      "Matrícula",
      "Convênio",
      "Profissional",
      "Preferência",
      "Status",
      "Início atendimento",
      "Fim atendimento",
      "Observação",
      "Motivo cancelamento"
    ]

    const linhas = atendimentosFiltrados.map((atendimento) => {
      const pessoa = buscarPessoa(atendimento.pessoa_id)
      const associado = buscarAssociado(atendimento.associado_id)
      const profissional = buscarProfissional(atendimento.profissional_id)
      const profissionalPreferencial = buscarProfissional(
        atendimento.profissional_preferencial_id
      )
      const convenio = buscarConvenio(atendimento.convenio_id)

      return [
        formatarTimestampCSV(atendimento.data_hora_chegada),
        limparCampoCSV(pessoa?.nome),
        atendimento.tipo === "associado" ? "Associado" : "Não associado",
        limparCampoCSV(associado?.matricula),
        limparCampoCSV(convenio?.nome),
        limparCampoCSV(profissional?.nome),
        limparCampoCSV(profissionalPreferencial?.nome),
        nomeStatus(atendimento.status),
        formatarTimestampCSV(atendimento.inicio_atendimento),
        formatarTimestampCSV(atendimento.fim_atendimento),
        limparCampoCSV(atendimento.observacao),
        limparCampoCSV(atendimento.motivo)
      ].join(";")
    })

    const conteudoCSV = [
      cabecalho.join(";"),
      ...linhas
    ].join("\n")

    const blob = new Blob(
      ["\uFEFF" + conteudoCSV],
      { type: "text/csv;charset=utf-8;" }
    )

    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = `atendimentos-${format(new Date(), "yyyy-MM-dd-HH-mm")}.csv`
    link.click()

    URL.revokeObjectURL(url)
  }

  /* Funções ligas ao modal inicio */
  function abrirDetalhesAtendimento(atendimento: Atendimento) {
    setAtendimentoSelecionado(atendimento)
    setEditConvenioId(atendimento.convenio_id || "")
    setEditProfissionalPreferencialId(
      atendimento.profissional_preferencial_id || ""
    )
    setEditObservacao(atendimento.observacao || "")
    setModoEdicao(false)
    setModalDetalhesAberto(true)
  }

  function fecharDetalhesAtendimento() {
    setModalDetalhesAberto(false)
    setModoEdicao(false)
    setAtendimentoSelecionado(null)
  }

  function calcularTempoAtendimento(atendimento: Atendimento | null) {
    if (!atendimento?.inicio_atendimento?.seconds) return "-"

    const inicio = atendimento.inicio_atendimento.seconds * 1000
    const fim = atendimento.fim_atendimento?.seconds
      ? atendimento.fim_atendimento.seconds * 1000
      : new Date().getTime()

    const minutosTotais = Math.floor((fim - inicio) / 1000 / 60)

    if (minutosTotais < 1) return "Agora"
    if (minutosTotais < 60) return `${minutosTotais} min`

    const horas = Math.floor(minutosTotais / 60)
    const minutos = minutosTotais % 60

    return `${horas}h ${minutos}min`
  }

  function formatarTimestamp(timestamp: any) {
    if (!timestamp?.seconds) return "-"

    return format(
      new Date(timestamp.seconds * 1000),
      "dd/MM/yyyy HH:mm",
      { locale: ptBR }
    )
  }

  async function salvarEdicaoAtendimento() {
    if (!atendimentoSelecionado?.id) return

    await updateDoc(doc(db, "atendimentos", atendimentoSelecionado.id), {
      convenio_id: editConvenioId || null,
      profissional_preferencial_id: editProfissionalPreferencialId || null,
      observacao: editObservacao.trim(),
      atualizado_em: serverTimestamp()
    })

    setModoEdicao(false)
  }

  /* Fim das funções ligadas ao modal */

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Início
        </h1>

        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
          Visão geral e histórico de atendimentos do sistema.
        </p>
      </div>

      {/* Painel resumo */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <p className="text-xs font-medium text-zinc-500">Total filtrado</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {atendimentosFiltrados.length}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <p className="text-xs font-medium text-zinc-500">Aguardando</p>
          <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">
            {totalAguardando}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <p className="text-xs font-medium text-zinc-500">Em atendimento</p>
          <p className="mt-1 text-2xl font-bold text-sky-700 dark:text-sky-300">
            {totalEmAtendimento}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <p className="text-xs font-medium text-zinc-500">Finalizados</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {totalFinalizados}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <p className="text-xs font-medium text-zinc-500">Cancelados</p>
          <p className="mt-1 text-2xl font-bold text-rose-700 dark:text-rose-300">
            {totalCancelados}
          </p>
        </div>
      </div>

      {/* Bloco de filtros */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Filtros
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
              Refine a consulta por data, status, tipo, profissional ou convênio.
            </p>
          </div>

          <button
            onClick={limparFiltros}
            className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Limpar filtros
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Data inicial
            </label>

            <input
              type="text"
              placeholder="dd/mm/aaaa"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              onFocus={(e) => {
                e.currentTarget.type = "date"
                e.currentTarget.showPicker?.()
              }}
              onBlur={(e) => {
                if (!e.currentTarget.value) {
                  e.currentTarget.type = "text"
                }
              }}
              className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Data final
            </label>

            <input
              type="text"
              placeholder="dd/mm/aaaa"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              onFocus={(e) => {
                e.currentTarget.type = "date"
                e.currentTarget.showPicker?.()
              }}
              onBlur={(e) => {
                if (!e.currentTarget.value) {
                  e.currentTarget.type = "text"
                }
              }}
              className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Buscar
            </label>

            <input
              type="text"
              placeholder="Nome, matrícula, observação..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Status
            </label>

            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {statusOpcoes.map((status) => (
                <option key={status.valor} value={status.valor}>
                  {status.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Tipo
            </label>

            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {tiposOpcoes.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Profissional
            </label>

            <select
              value={profissionalFiltro}
              onChange={(e) => setProfissionalFiltro(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="todos">Todos</option>

              {profissionais.map((profissional) => (
                <option key={profissional.id} value={profissional.id}>
                  {profissional.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Convênio
            </label>

            <select
              value={convenioFiltro}
              onChange={(e) => setConvenioFiltro(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="todos">Todos</option>

              {convenios.map((convenio) => (
                <option key={convenio.id} value={convenio.id}>
                  {convenio.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

      </section>

      {/* Botão de exportação CSV */}
      <div className="flex justify-end">
        <button
          onClick={exportarAtendimentosCSV}
          title="Exportar CSV"
          className="
            inline-flex items-center gap-2
            text-sm font-semibold
            text-zinc-500
            transition
            hover:text-emerald-600
            dark:text-zinc-400
            dark:hover:text-emerald-400
          "
        >
          <FileSpreadsheet className="h-4 w-4" />
          {/* <span>Exportar CSV</span> */}
        </button>
      </div>

      {/* Histórico de atendimentos */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">

        <div className="flex flex-col gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
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
              className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Anterior
            </button>

            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Página {paginaAtual} de {totalPaginas}
            </span>

            <button
              onClick={() => alterarPagina(paginaAtual + 1)}
              disabled={paginaAtual === totalPaginas}
              className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Próxima
            </button>
          </div>
        </div>

        {atendimentosPaginados.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
              <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-950/60">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Pessoa</th>
                  <th className="hidden px-4 py-2 text-left font-semibold hidden md:table-cell">Tipo / Matrícula</th>
                  <th className="hidden px-4 py-2 text-left font-semibold hidden lg:table-cell">Convênio</th>
                  <th className="hidden px-4 py-2 text-left font-semibold hidden lg:table-cell">Profissional</th>
                  <th className="w-36 px-4 py-2 text-left font-semibold">Status</th>
                  <th className="w-44 px-4 py-2 text-left font-semibold">Chegada</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {atendimentosPaginados.map((atendimento) => {
                  const pessoa = buscarPessoa(atendimento.pessoa_id)
                  const associado = buscarAssociado(atendimento.associado_id)
                  const profissional = buscarProfissional(atendimento.profissional_id)
                  const profissionalPreferencial = buscarProfissional(
                    atendimento.profissional_preferencial_id
                  )
                  const convenio = buscarConvenio(atendimento.convenio_id)

                  return (
                    <tr
                      key={atendimento.id}
                      className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <td className="px-4 py-2 align-middle">
                        <div>
                          <button
                            type="button"
                            onClick={() => abrirDetalhesAtendimento(atendimento)}
                            className="line-clamp-1 text-left text-sm font-semibold text-zinc-900 underline-offset-4 transition hover:text-blue-700 hover:underline dark:text-zinc-100 dark:hover:text-blue-300"
                          >
                            {pessoa?.nome.toUpperCase() || "Pessoa não encontrada"}
                          </button>

                          {(atendimento.observacao || atendimento.motivo) && (
                            <p className="mt-0.5 hidden max-w-[320px] truncate text-xs text-zinc-500 lg:block">
                              {atendimento.observacao ||
                                `Cancelamento: ${atendimento.motivo}`}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="hidden px-4 py-2 align-middle text-zinc-700 dark:text-zinc-300 md:table-cell">
                        <div>
                          <p className="text-sm">
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

                      <td className="hidden px-4 py-2 align-middle text-zinc-700 dark:text-zinc-300 xl:table-cell">
                        {convenio?.nome || "Não informado"}
                      </td>

                      <td className="hidden px-4 py-2 align-middle xl:table-cell">
                        <div>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            {profissional?.nome || "Não definido"}
                          </p>

                          {profissionalPreferencial && (
                            <p className="mt-0.5 text-xs text-zinc-500">
                              Preferência: {profissionalPreferencial.nome}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-2 align-middle">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${classeStatus(
                            atendimento.status
                          )}`}
                        >
                          {nomeStatus(atendimento.status)}
                        </span>
                      </td>

                      <td className="px-4 py-2 align-middle text-xs text-zinc-600 dark:text-zinc-400">
                        {formatarDataHora(atendimento)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end items-center gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <button
            onClick={() => alterarPagina(paginaAtual - 1)}
            disabled={paginaAtual === 1}
            className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Anterior
          </button>

          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Página {paginaAtual} de {totalPaginas}
          </span>

          <button
            onClick={() => alterarPagina(paginaAtual + 1)}
            disabled={paginaAtual === totalPaginas}
            className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Próxima
          </button>
        </div>
      </section>

      {/* Modal de detalhes */}
      {modalDetalhesAberto && atendimentoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  Detalhes do atendimento
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Consulte as informações completas do atendimento.
                </p>
              </div>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classeStatus(
                  atendimentoSelecionado.status
                )}`}
              >
                {nomeStatus(atendimentoSelecionado.status)}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Pessoa
                </p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {buscarPessoa(atendimentoSelecionado.pessoa_id)?.nome || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Matrícula
                </p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {buscarAssociado(atendimentoSelecionado.associado_id)?.matricula ||
                    "Sem matrícula"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Convênio
                </p>

                {modoEdicao ? (
                  <select
                    value={editConvenioId}
                    onChange={(e) => setEditConvenioId(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="">Não informado</option>

                    {convenios.map((convenio) => (
                      <option key={convenio.id} value={convenio.id}>
                        {convenio.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                    {buscarConvenio(atendimentoSelecionado.convenio_id)?.nome ||
                      "Não informado"}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Profissional preferencial
                </p>

                {modoEdicao ? (
                  <select
                    value={editProfissionalPreferencialId}
                    onChange={(e) =>
                      setEditProfissionalPreferencialId(e.target.value)
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="">Sem preferência</option>

                    {profissionais.map((profissional) => (
                      <option key={profissional.id} value={profissional.id}>
                        {profissional.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                    {buscarProfissional(
                      atendimentoSelecionado.profissional_preferencial_id
                    )?.nome || "Sem preferência"}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Profissional responsável
                </p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {buscarProfissional(atendimentoSelecionado.profissional_id)?.nome ||
                    "Não definido"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Tipo
                </p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {atendimentoSelecionado.tipo === "associado"
                    ? "Associado"
                    : "Não associado"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Motivo
                </p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {atendimentoSelecionado.motivo_categoria || "-"}
                  {atendimentoSelecionado.motivo_detalhe
                    ? ` / ${atendimentoSelecionado.motivo_detalhe}`
                    : ""}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Tempo de atendimento
                </p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {calcularTempoAtendimento(atendimentoSelecionado)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Chegada
                </p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {formatarTimestamp(atendimentoSelecionado.data_hora_chegada)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Início
                </p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {formatarTimestamp(atendimentoSelecionado.inicio_atendimento)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Fim
                </p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {formatarTimestamp(atendimentoSelecionado.fim_atendimento)}
                </p>
              </div>

              {atendimentoSelecionado.motivo && (
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    Motivo do cancelamento
                  </p>
                  <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                    {atendimentoSelecionado.motivo}
                  </p>
                </div>
              )}

              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Observação
                </p>

                {modoEdicao ? (
                  <textarea
                    value={editObservacao}
                    onChange={(e) => setEditObservacao(e.target.value)}
                    className="mt-1 min-h-[100px] w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                ) : (
                  <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                    {atendimentoSelecionado.observacao || "-"}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={fecharDetalhesAtendimento}
                className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Fechar
              </button>

              {podeEditarHistorico && !modoEdicao && (
                <button
                  type="button"
                  onClick={() => setModoEdicao(true)}
                  className="h-10 rounded-lg border border-blue-500/40 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  Editar
                </button>
              )}

              {podeEditarHistorico && modoEdicao && (
                <>
                  <button
                    type="button"
                    onClick={() => setModoEdicao(false)}
                    className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={salvarEdicaoAtendimento}
                    className="h-10 rounded-lg border border-blue-500/40 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    Salvar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Fim modal inicio */}

    </div>
  )
}