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

import { db, auth } from "../../../lib/firebase"

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

type Profissional = {
  id?: string
  nome: string
  cargo_id: string
  ativo: boolean
}

type Convenio = {
  id?: string
  nome: string
  ativo: boolean
}

type StatusAtendimento =
  | "aguardando"
  | "em_atendimento"
  | "finalizado"
  | "cancelado"

type TipoAtendimento = "associado" | "nao_associado"

type Atendimento = {
  id?: string
  pessoa_id: string
  associado_id?: string | null
  representante_id?: string | null
  profissional_id?: string | null
  profissional_preferencial_id?: string | null
  convenio_id?: string | null
  tipo: TipoAtendimento
  status: StatusAtendimento
  motivo?: string
  observacao?: string
  data_hora_chegada?: any
  inicio_atendimento?: any
  fim_atendimento?: any
}

const tiposRepresentante = [
  "Cônjuge",
  "Filho(a)",
  "Responsável",
  "Terceiro",
  "Advogado",
  "Outro"
]

export default function AtendimentosPage() {
  const [tipo, setTipo] = useState<TipoAtendimento>("associado")

  const [nomePessoa, setNomePessoa] = useState("")
  const [matricula, setMatricula] = useState("")
  const [convenioId, setConvenioId] = useState("")

  const [usarRepresentante, setUsarRepresentante] = useState(false)
  const [nomeRepresentante, setNomeRepresentante] = useState("")
  const [tipoRepresentante, setTipoRepresentante] = useState("")

  const [profissionalPreferencialId, setProfissionalPreferencialId] = useState("")
  const [profissionalInicioId, setProfissionalInicioId] = useState<Record<string, string>>({})
  const [buscaProfissionalInicio, setBuscaProfissionalInicio] = useState<Record<string, string>>({})

  const [observacao, setObservacao] = useState("")
  const [usuarioLogado, setUsuarioLogado] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todos")

  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [associados, setAssociados] = useState<Associado[]>([])
  const [representantes, setRepresentantes] = useState<Representante[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [convenios, setConvenios] = useState<Convenio[]>([])
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((usuario) => {
      setUsuarioLogado(usuario?.email || "")
    })

    return () => unsubscribe()
  }, [])

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

  function normalizarTexto(texto: string) {
    return texto.trim().toLowerCase()
  }

  function formatarNome(nome: string) {
    const minusculas = ["de", "do", "dos", "da", "das", "e"]

    return nome
      .trim()
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((palavra, index) => {
        if (index !== 0 && minusculas.includes(palavra)) {
          return palavra
        }

        return palavra.charAt(0).toUpperCase() + palavra.slice(1)
      })
      .join(" ")
  }

  function ehAtendimentoDeHoje(atendimento: Atendimento) {
    if (!atendimento.data_hora_chegada?.seconds) return false

    const dataAtendimento = new Date(atendimento.data_hora_chegada.seconds * 1000)
    const hoje = new Date()

    return (
      dataAtendimento.getDate() === hoje.getDate() &&
      dataAtendimento.getMonth() === hoje.getMonth() &&
      dataAtendimento.getFullYear() === hoje.getFullYear()
    )
  }

  function buscarPessoa(pessoa_id?: string | null) {
    return pessoas.find((item) => item.id === pessoa_id)
  }

  function buscarAssociado(associado_id?: string | null) {
    return associados.find((item) => item.id === associado_id)
  }

  function buscarRepresentante(representante_id?: string | null) {
    return representantes.find((item) => item.id === representante_id)
  }

  function buscarProfissional(profissional_id?: string | null) {
    return profissionais.find((item) => item.id === profissional_id)
  }

  function buscarConvenio(convenio_id?: string | null) {
    return convenios.find((item) => item.id === convenio_id)
  }

  function buscarPessoaPorNome(nome: string) {
    return pessoas.find(
      (pessoa) => normalizarTexto(pessoa.nome) === normalizarTexto(nome)
    )
  }

  function buscarAssociadoPorMatricula(matriculaInformada: string) {
    return associados.find(
      (associado) =>
        normalizarTexto(associado.matricula) === normalizarTexto(matriculaInformada)
    )
  }

  async function obterOuCriarPessoa(nome: string) {
    const nomeFormatado = formatarNome(nome)
    const pessoaExistente = buscarPessoaPorNome(nomeFormatado)

    if (pessoaExistente?.id) {
      return pessoaExistente.id
    }

    const novaPessoa = await addDoc(collection(db, "pessoas"), {
      nome: nomeFormatado,
      ativo: true,
      criado_por: usuarioLogado,
      criado_em: serverTimestamp(),
      atualizado_por: usuarioLogado,
      atualizado_em: serverTimestamp()
    })

    return novaPessoa.id
  }

  async function obterOuCriarAssociado(pessoa_id: string, matriculaInformada: string) {
    const associadoExistente = buscarAssociadoPorMatricula(matriculaInformada)

    if (associadoExistente?.id) {
      return associadoExistente.id
    }

    const novoAssociado = await addDoc(collection(db, "associados"), {
      pessoa_id,
      matricula: matriculaInformada.trim(),
      ativo: true,
      data_associacao: serverTimestamp(),
      criado_por: usuarioLogado,
      criado_em: serverTimestamp(),
      atualizado_por: usuarioLogado,
      atualizado_em: serverTimestamp()
    })

    return novoAssociado.id
  }

  async function obterOuCriarRepresentante(
    associado_id: string,
    pessoa_id: string,
    tipo: string
  ) {
    const representanteExistente = representantes.find(
      (representante) =>
        representante.associado_id === associado_id &&
        representante.pessoa_id === pessoa_id
    )

    if (representanteExistente?.id) {
      return representanteExistente.id
    }

    const novoRepresentante = await addDoc(collection(db, "associado_representantes"), {
      associado_id,
      pessoa_id,
      tipo,
      ativo: true,
      criado_por: usuarioLogado,
      criado_em: serverTimestamp(),
      atualizado_por: usuarioLogado,
      atualizado_em: serverTimestamp()
    })

    return novoRepresentante.id
  }

  async function registrarHistorico(
    atendimentoId: string,
    evento: string,
    observacaoHistorico = ""
  ) {
    await addDoc(collection(db, "historico_atendimento"), {
      atendimento_id: atendimentoId,
      evento,
      observacao: observacaoHistorico,
      usuario_id: usuarioLogado,
      criado_por: usuarioLogado,
      criado_em: serverTimestamp()
    })
  }

  async function registrarChegada() {
    if (nomePessoa.trim() === "") {
      alert("Informe o nome da pessoa.")
      return
    }

    if (tipo === "associado" && matricula.trim() === "") {
      alert("Informe a matrícula do associado.")
      return
    }

    if (tipo === "associado" && convenioId === "") {
      alert("Selecione o convênio do associado.")
      return
    }

    if (usarRepresentante && nomeRepresentante.trim() === "") {
      alert("Informe o nome do representante.")
      return
    }

    if (usarRepresentante && tipoRepresentante === "") {
      alert("Selecione o tipo do representante.")
      return
    }

    const pessoaPrincipalId = await obterOuCriarPessoa(nomePessoa)

    let associadoSelecionadoId: string | null = null
    let representanteSelecionadoId: string | null = null
    let convenioSelecionadoId: string | null = convenioId || null

    if (tipo === "associado") {
      associadoSelecionadoId = await obterOuCriarAssociado(
        pessoaPrincipalId,
        matricula
      )
    } else {
      convenioSelecionadoId = convenioId || null
    }

    if (usarRepresentante) {
      const pessoaRepresentanteId = await obterOuCriarPessoa(nomeRepresentante)

      if (associadoSelecionadoId) {
        representanteSelecionadoId = await obterOuCriarRepresentante(
          associadoSelecionadoId,
          pessoaRepresentanteId,
          tipoRepresentante
        )
      }
    }

    const novoAtendimento = await addDoc(collection(db, "atendimentos"), {
      pessoa_id: pessoaPrincipalId,
      associado_id: associadoSelecionadoId,
      representante_id: representanteSelecionadoId,
      profissional_id: null,
      profissional_preferencial_id: profissionalPreferencialId || null,
      convenio_id: convenioSelecionadoId,
      tipo,
      status: "aguardando",
      observacao: observacao.trim(),
      usuario_id: usuarioLogado,
      criado_por: usuarioLogado,
      criado_em: serverTimestamp(),
      atualizado_por: usuarioLogado,
      atualizado_em: serverTimestamp(),
      data_hora_chegada: serverTimestamp()
    })

    await registrarHistorico(novoAtendimento.id, "atendimento_criado")

    setTipo("associado")
    setNomePessoa("")
    setMatricula("")
    setConvenioId("")
    setUsarRepresentante(false)
    setNomeRepresentante("")
    setTipoRepresentante("")
    setProfissionalPreferencialId("")
    setObservacao("")

    alert("Chegada registrada.")
  }

  async function iniciarAtendimento(id: string) {
    const profissionalSelecionado = profissionalInicioId[id]

    if (!profissionalSelecionado) {
      alert("Selecione o profissional que vai iniciar o atendimento.")
      return
    }

    await updateDoc(doc(db, "atendimentos", id), {
      status: "em_atendimento",
      profissional_id: profissionalSelecionado,
      inicio_atendimento: serverTimestamp(),
      atualizado_em: serverTimestamp(),
      atualizado_por: usuarioLogado
    })

    await registrarHistorico(id, "atendimento_iniciado")

    setProfissionalInicioId((estadoAtual) => {
      const copia = { ...estadoAtual }
      delete copia[id]
      return copia
    })

    setBuscaProfissionalInicio((estadoAtual) => {
      const copia = { ...estadoAtual }
      delete copia[id]
      return copia
    })
  }

  async function finalizarAtendimento(id: string) {
    await updateDoc(doc(db, "atendimentos", id), {
      status: "finalizado",
      fim_atendimento: serverTimestamp(),
      atualizado_em: serverTimestamp(),
      atualizado_por: usuarioLogado
    })

    await registrarHistorico(id, "atendimento_finalizado")
  }

  async function cancelarAtendimento(id: string) {
    const motivo = prompt("Informe o motivo do cancelamento:")

    if (!motivo || motivo.trim() === "") {
      alert("O motivo do cancelamento é obrigatório.")
      return
    }

    await updateDoc(doc(db, "atendimentos", id), {
      status: "cancelado",
      motivo: motivo.trim(),
      fim_atendimento: serverTimestamp(),
      atualizado_em: serverTimestamp(),
      atualizado_por: usuarioLogado
    })

    await registrarHistorico(id, "atendimento_cancelado", motivo.trim())
  }

  function calcularTempo(timestamp: any) {
    if (!timestamp?.seconds) return ""

    const agora = new Date().getTime()
    const data = timestamp.seconds * 1000
    const minutosTotais = Math.floor((agora - data) / 1000 / 60)

    if (minutosTotais < 1) return "Agora"
    if (minutosTotais < 60) return `${minutosTotais} min`

    const horas = Math.floor(minutosTotais / 60)
    const minutos = minutosTotais % 60

    return `${horas}h ${minutos}min`
  }

  function calcularDuracao(inicio: any, fim?: any) {
    if (!inicio?.seconds) return ""

    const inicioMs = inicio.seconds * 1000
    const fimMs = fim?.seconds ? fim.seconds * 1000 : new Date().getTime()
    const minutosTotais = Math.floor((fimMs - inicioMs) / 1000 / 60)

    if (minutosTotais < 1) return "Agora"
    if (minutosTotais < 60) return `${minutosTotais} min`

    const horas = Math.floor(minutosTotais / 60)
    const minutos = minutosTotais % 60

    return `${horas}h ${minutos}min`
  }

  function nomeStatus(status: StatusAtendimento) {
    const nomes: Record<StatusAtendimento, string> = {
      aguardando: "Aguardando",
      em_atendimento: "Em atendimento",
      finalizado: "Finalizado",
      cancelado: "Cancelado"
    }

    return nomes[status]
  }

  function classeStatus(status: StatusAtendimento) {
    const classes: Record<StatusAtendimento, string> = {
      aguardando: "bg-amber-600 text-white",
      em_atendimento: "bg-sky-600 text-white",
      finalizado: "bg-emerald-600 text-white",
      cancelado: "bg-rose-600 text-white"
    }

    return classes[status]
  }

  function profissionaisEncontradosPorAtendimento(atendimentoId: string) {
    const termo = (buscaProfissionalInicio[atendimentoId] || "")
      .toLowerCase()
      .trim()

    if (termo.length < 2) return []

    return profissionais
      .filter((profissional) => profissional.ativo)
      .filter((profissional) =>
        profissional.nome.toLowerCase().includes(termo)
      )
      .slice(0, 8)
  }

  const atendimentosDoDia = atendimentos.filter(ehAtendimentoDeHoje)

  const atendimentosOrdenados = [...atendimentosDoDia].sort((a, b) => {
    const ordemStatus: Record<string, number> = {
      aguardando: 1,
      em_atendimento: 2,
      finalizado: 3,
      cancelado: 4
    }

    const ordemA = ordemStatus[a.status] || 99
    const ordemB = ordemStatus[b.status] || 99

    if (ordemA !== ordemB) return ordemA - ordemB

    const chegadaA = a.data_hora_chegada?.seconds || 0
    const chegadaB = b.data_hora_chegada?.seconds || 0

    return chegadaA - chegadaB
  })

  const atendimentosFiltrados = atendimentosOrdenados.filter((atendimento) => {
    if (filtroStatus === "todos") {
      return (
        atendimento.status === "aguardando" ||
        atendimento.status === "em_atendimento"
      )
    }

    return atendimento.status === filtroStatus
  })

  const totalAguardando = atendimentosDoDia.filter((a) => a.status === "aguardando").length
  const totalEmAtendimento = atendimentosDoDia.filter((a) => a.status === "em_atendimento").length
  const totalFinalizados = atendimentosDoDia.filter((a) => a.status === "finalizado").length
  const totalCancelados = atendimentosDoDia.filter((a) => a.status === "cancelado").length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black">Atendimentos</h1>

        <p className="text-zinc-400 mt-2">
          Registro de chegada, fila e controle de atendimento da ADUSEPS.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
          <p className="text-sm text-zinc-400">Aguardando</p>
          <p className="text-4xl font-black mt-2 text-amber-400">{totalAguardando}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
          <p className="text-sm text-zinc-400">Em atendimento</p>
          <p className="text-4xl font-black mt-2 text-sky-400">{totalEmAtendimento}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
          <p className="text-sm text-zinc-400">Finalizados</p>
          <p className="text-4xl font-black mt-2 text-emerald-400">{totalFinalizados}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
          <p className="text-sm text-zinc-400">Cancelados</p>
          <p className="text-4xl font-black mt-2 text-rose-400">{totalCancelados}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-6">Novo atendimento</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as TipoAtendimento)
              setMatricula("")
              setConvenioId("")
            }}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          >
            <option value="associado">Associado</option>
            <option value="nao_associado">Não associado</option>
          </select>

          <input
            type="text"
            placeholder="Nome da pessoa"
            value={nomePessoa}
            onChange={(e) => setNomePessoa(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          />

          <input
            type="text"
            placeholder={tipo === "associado" ? "Matrícula" : "Sem matrícula"}
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            disabled={tipo === "nao_associado"}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none disabled:opacity-50"
          />

          <select
            value={convenioId}
            onChange={(e) => setConvenioId(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          >
            <option value="">
              {tipo === "associado" ? "Convênio obrigatório" : "Convênio opcional"}
            </option>

            {convenios
              .filter((convenio) => convenio.ativo)
              .map((convenio) => (
                <option key={convenio.id} value={convenio.id}>
                  {convenio.nome}
                </option>
              ))}
          </select>

          <select
            value={usarRepresentante ? "sim" : "nao"}
            onChange={(e) => {
              setUsarRepresentante(e.target.value === "sim")
              setNomeRepresentante("")
              setTipoRepresentante("")
            }}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          >
            <option value="nao">Sem representante</option>
            <option value="sim">Com representante</option>
          </select>

          {usarRepresentante && (
            <>
              <input
                type="text"
                placeholder="Nome do representante"
                value={nomeRepresentante}
                onChange={(e) => setNomeRepresentante(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
              />

              <select
                value={tipoRepresentante}
                onChange={(e) => setTipoRepresentante(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
              >
                <option value="">Tipo de representante</option>

                {tiposRepresentante.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </>
          )}

          <select
            value={profissionalPreferencialId}
            onChange={(e) => setProfissionalPreferencialId(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
          >
            <option value="">Sem preferência por profissional</option>

            {profissionais
              .filter((profissional) => profissional.ativo)
              .map((profissional) => (
                <option key={profissional.id} value={profissional.id}>
                  {profissional.nome}
                </option>
              ))}
          </select>
        </div>

        <textarea
          placeholder="Observação / motivo do atendimento"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          className="mt-4 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none resize-none min-h-[100px]"
        />

        <div className="mt-4 flex justify-end">
          <button
            onClick={registrarChegada}
            className="bg-blue-600 hover:bg-blue-700 transition rounded-xl px-8 py-3 font-bold"
          >
            Salvar chegada
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold">Atendimentos do dia</h2>

          <div className="flex flex-wrap gap-2">
            {["todos", "aguardando", "em_atendimento", "finalizado", "cancelado"].map((status) => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                  filtroStatus === status
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {status === "todos" ? "Todos" : nomeStatus(status as StatusAtendimento)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {atendimentosFiltrados.length === 0 && (
            <p className="text-zinc-500">Nenhum atendimento registrado hoje.</p>
          )}

          {atendimentosFiltrados.map((atendimento) => {
            const pessoa = buscarPessoa(atendimento.pessoa_id)
            const associado = buscarAssociado(atendimento.associado_id)
            const representante = buscarRepresentante(atendimento.representante_id)
            const pessoaRepresentante = representante
              ? buscarPessoa(representante.pessoa_id)
              : null
            const profissional = buscarProfissional(atendimento.profissional_id)
            const profissionalPreferencial = buscarProfissional(
              atendimento.profissional_preferencial_id
            )
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
                        <span>Matrícula: {associado.matricula}</span>
                      )}

                      {convenio && (
                        <span>Convênio: {convenio.nome}</span>
                      )}

                      {atendimento.data_hora_chegada && (
                        <span>
                          Espera:{" "}
                          {atendimento.status === "aguardando"
                            ? calcularTempo(atendimento.data_hora_chegada)
                            : "—"}
                        </span>
                      )}
                    </div>

                    {(pessoaRepresentante || profissionalPreferencial || atendimento.observacao) && (
                      <div className="mt-2 text-sm text-zinc-400 space-y-1">
                        {pessoaRepresentante && representante && (
                          <p>
                            Representante: {pessoaRepresentante.nome} ({representante.tipo})
                          </p>
                        )}

                        {profissionalPreferencial && (
                          <p>Preferência: {profissionalPreferencial.nome}</p>
                        )}

                        {atendimento.observacao && (
                          <p className="text-zinc-300">
                            Obs: {atendimento.observacao}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-1 text-xs text-zinc-500">
                      {atendimento.data_hora_chegada && (
                        <span>
                          Chegada:{" "}
                          {new Date(
                            atendimento.data_hora_chegada.seconds * 1000
                          ).toLocaleString("pt-BR")}
                        </span>
                      )}

                      {atendimento.status === "em_atendimento" && atendimento.inicio_atendimento && (
                        <span>
                          {" • "}Em atendimento há: {calcularDuracao(atendimento.inicio_atendimento)}
                        </span>
                      )}

                      {atendimento.status === "finalizado" &&
                        atendimento.inicio_atendimento &&
                        atendimento.fim_atendimento && (
                          <span>
                            {" • "}Duração:{" "}
                            {calcularDuracao(
                              atendimento.inicio_atendimento,
                              atendimento.fim_atendimento
                            )}
                          </span>
                        )}

                      {profissional && (
                        <span>{" • "}Atendido por: {profissional.nome}</span>
                      )}

                      {atendimento.motivo && (
                        <span>{" • "}Cancelamento: {atendimento.motivo}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-[250px]">
                    {atendimento.status === "aguardando" && atendimento.id && (
                      <>
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Profissional que vai atender"
                            value={buscaProfissionalInicio[atendimento.id] || ""}
                            onChange={(e) => {
                              setBuscaProfissionalInicio((estadoAtual) => ({
                                ...estadoAtual,
                                [atendimento.id!]: e.target.value
                              }))

                              setProfissionalInicioId((estadoAtual) => ({
                                ...estadoAtual,
                                [atendimento.id!]: ""
                              }))
                            }}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none"
                          />

                          {(buscaProfissionalInicio[atendimento.id] || "").trim().length >= 2 &&
                            !profissionalInicioId[atendimento.id] && (
                              <div className="absolute z-30 mt-2 w-full bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden shadow-xl">
                                {profissionaisEncontradosPorAtendimento(atendimento.id).length === 0 && (
                                  <p className="px-4 py-3 text-sm text-zinc-400">
                                    Nenhum profissional encontrado.
                                  </p>
                                )}

                                {profissionaisEncontradosPorAtendimento(atendimento.id).map((profissionalItem) => (
                                  <button
                                    key={profissionalItem.id}
                                    type="button"
                                    onClick={() => {
                                      setProfissionalInicioId((estadoAtual) => ({
                                        ...estadoAtual,
                                        [atendimento.id!]: profissionalItem.id || ""
                                      }))

                                      setBuscaProfissionalInicio((estadoAtual) => ({
                                        ...estadoAtual,
                                        [atendimento.id!]: profissionalItem.nome
                                      }))
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-zinc-700 text-sm"
                                  >
                                    {profissionalItem.nome}
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>

                        <button
                          onClick={() => iniciarAtendimento(atendimento.id!)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap"
                        >
                          Iniciar
                        </button>
                      </>
                    )}

                    {atendimento.status === "em_atendimento" && atendimento.id && (
                      <button
                        onClick={() => finalizarAtendimento(atendimento.id!)}
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-bold"
                      >
                        Finalizar
                      </button>
                    )}

                    {atendimento.status !== "finalizado" &&
                      atendimento.status !== "cancelado" &&
                      atendimento.id && (
                        <button
                          onClick={() => cancelarAtendimento(atendimento.id!)}
                          className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-sm font-bold"
                        >
                          Cancelar
                        </button>
                      )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}