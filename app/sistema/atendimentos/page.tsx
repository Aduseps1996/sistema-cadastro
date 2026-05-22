"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

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
import { useUsuario } from "../../context/UsuarioContext"

// =====================================================
// TIPOS DAS ENTIDADES DO SISTEMA
// =====================================================

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

// =====================================================
// TIPOS DO ATENDIMENTO
// =====================================================

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

// =====================================================
// LISTA FIXA DE TIPOS DE REPRESENTANTE
// =====================================================

const tiposRepresentante = [
  "Cônjuge",
  "Filho(a)",
  "Responsável",
  "Terceiro",
  "Advogado",
  "Outro"
]

export default function AtendimentosPage() {
  // =====================================================
  // ESTADOS DO FORMULÁRIO DE NOVO ATENDIMENTO
  // =====================================================

  const { usuarioSistema } = useUsuario()

  // =====================================================
  // CONTROLE DE PERMISSÃO
  // =====================================================

  // Apenas Administrador e Recepção podem
  // registrar chegada.
  const podeRegistrarChegada =
    usuarioSistema?.perfil === "Administrador" ||
    usuarioSistema?.perfil === "Recepção"

  // Administrador, Recepção e Atendente
  // podem operar a fila.
  const podeOperarAtendimento =
    usuarioSistema?.perfil === "Administrador" ||
    usuarioSistema?.perfil === "Recepção" ||
    usuarioSistema?.perfil === "Atendente"

  // =========================================
  // RESTO DOS STATES
  // =========================================

  const [tipo, setTipo] = useState<TipoAtendimento>("associado")
  const [nomePessoa, setNomePessoa] = useState("")
  const [matricula, setMatricula] = useState("")
  const [convenioId, setConvenioId] = useState("")
  const [usarRepresentante, setUsarRepresentante] = useState(false)
  const [nomeRepresentante, setNomeRepresentante] = useState("")
  const [tipoRepresentante, setTipoRepresentante] = useState("")
  const [profissionalPreferencialId, setProfissionalPreferencialId] = useState("")
  const [observacao, setObservacao] = useState("")

  // =====================================================
  // ESTADO DE PROCESSAMENTO DAS AÇÕES
  // =====================================================
  // Guarda qual ação está em andamento.
  // Evita clique duplo e dá feedback visual ao usuário.
  const [acaoEmAndamento, setAcaoEmAndamento] = useState("")

  // =====================================================
  // ESTADOS OPERACIONAIS DA FILA
  // =====================================================

  const [profissionalInicioId, setProfissionalInicioId] =
    useState<Record<string, string>>({})

  const [buscaProfissionalInicio, setBuscaProfissionalInicio] =
    useState<Record<string, string>>({})

  const [usuarioLogado, setUsuarioLogado] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todos")


  const [modalCancelamentoAberto, setModalCancelamentoAberto] =
    useState(false)

  const [atendimentoCancelandoId, setAtendimentoCancelandoId] =
    useState("")

  const [motivoCancelamento, setMotivoCancelamento] =
    useState("")

  // =====================================================
  // LISTAS VINDAS DO FIRESTORE
  // =====================================================

  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [associados, setAssociados] = useState<Associado[]>([])
  const [representantes, setRepresentantes] = useState<Representante[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [convenios, setConvenios] = useState<Convenio[]>([])
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])


  // =====================================================
  // USUÁRIO LOGADO
  // =====================================================

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((usuario) => {
      setUsuarioLogado(usuario?.email || "")
    })

    return () => unsubscribe()
  }, [])


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
  // CONSULTA DE REPRESENTANTES
  // =====================================================

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
  // FUNÇÕES DE TEXTO
  // =====================================================

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

  // =====================================================
  // FILTRO DE ATENDIMENTOS DO DIA
  // =====================================================

  function ehAtendimentoDeHoje(atendimento: Atendimento) {
    if (!atendimento.data_hora_chegada?.seconds) return false

    const dataAtendimento =
      new Date(atendimento.data_hora_chegada.seconds * 1000)

    const hoje = new Date()

    return (
      dataAtendimento.getDate() === hoje.getDate() &&
      dataAtendimento.getMonth() === hoje.getMonth() &&
      dataAtendimento.getFullYear() === hoje.getFullYear()
    )
  }

  // =====================================================
  // FUNÇÕES AUXILIARES DE BUSCA POR ID
  // =====================================================

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
      (pessoa) =>
        normalizarTexto(pessoa.nome) === normalizarTexto(nome)
    )
  }

  function buscarAssociadoPorMatricula(matriculaInformada: string) {
    return associados.find(
      (associado) =>
        normalizarTexto(associado.matricula) ===
        normalizarTexto(matriculaInformada)
    )
  }

  // =====================================================
  // CRIA OU REAPROVEITA PESSOA
  // =====================================================

  async function obterOuCriarPessoa(nome: string) {

    const nomeFormatado = formatarNome(nome)

    const pessoaExistente =
      buscarPessoaPorNome(nomeFormatado)

    if (pessoaExistente?.id) {
      return pessoaExistente.id
    }

    try {

      const novaPessoa = await addDoc(
        collection(db, "pessoas"),
        {
          nome: nomeFormatado,
          ativo: true,
          criado_por: usuarioLogado,
          criado_em: serverTimestamp(),
          atualizado_por: usuarioLogado,
          atualizado_em: serverTimestamp()
        }
      )

      return novaPessoa.id

    } catch (error) {

      console.error(error)

      throw error
    }
  }

  // =====================================================
  // CRIA OU REAPROVEITA ASSOCIADO
  // =====================================================

  async function obterOuCriarAssociado(
    pessoa_id: string,
    matriculaInformada: string
  ) {

    try {

      const associadoExistente =
        buscarAssociadoPorMatricula(
          matriculaInformada
        )

      if (associadoExistente?.id) {
        return associadoExistente.id
      }

      const novoAssociado = await addDoc(
        collection(db, "associados"),
        {
          pessoa_id,
          matricula: matriculaInformada.trim(),
          ativo: true,
          data_associacao: serverTimestamp(),
          criado_por: usuarioLogado,
          criado_em: serverTimestamp(),
          atualizado_por: usuarioLogado,
          atualizado_em: serverTimestamp()
        }
      )

      return novoAssociado.id

    } catch (error) {

      console.error(error)

      throw error
    }
  }

  // =====================================================
  // CRIA OU REAPROVEITA REPRESENTANTE
  // =====================================================

  async function obterOuCriarRepresentante(
    associado_id: string,
    pessoa_id: string,
    tipo: string
  ) {

    try {
      const representanteExistente = representantes.find(
        (representante) =>
          representante.associado_id === associado_id &&
          representante.pessoa_id === pessoa_id
      )

      if (representanteExistente?.id) {
        return representanteExistente.id
      }

      const novoRepresentante = await addDoc(
        collection(db, "associado_representantes"),
        {
          associado_id,
          pessoa_id,
          tipo,
          ativo: true,
          criado_por: usuarioLogado,
          criado_em: serverTimestamp(),
          atualizado_por: usuarioLogado,
          atualizado_em: serverTimestamp()
        }
      )

      return novoRepresentante.id

    } catch (error) {
      console.error(error)

      throw error
    }
  }

  // =====================================================
  // HISTÓRICO DO ATENDIMENTO
  // =====================================================

  async function registrarHistorico(
    atendimentoId: string,
    evento: string,
    observacaoHistorico = ""
  ) {

    try {

      await addDoc(collection(db, "historico_atendimento"), {
        atendimento_id: atendimentoId,
        evento,
        observacao: observacaoHistorico,
        usuario_id: usuarioLogado,
        criado_por: usuarioLogado,
        criado_em: serverTimestamp()
      })

    } catch (error) {
      console.error("Erro ao registrar histórico:", error)

      throw error
    }
  }
  // =====================================================
  // REGISTRAR CHEGADA
  // =====================================================

  async function registrarChegada() {
    if (!podeRegistrarChegada) {
      toast.error("Você não tem permissão para registrar chegada.")
      return
    }

    if (acaoEmAndamento) return

    if (nomePessoa.trim() === "") {
      toast.warning("Informe o nome da pessoa.")
      return
    }

    if (tipo === "associado" && matricula.trim() === "") {
      toast.warning("Informe a matrícula do associado.")
      return
    }

    if (tipo === "associado" && convenioId === "") {
      toast.warning("Selecione o convênio do associado.")
      return
    }

    try {
      setAcaoEmAndamento("registrar_chegada")

      const pessoaPrincipalId = await obterOuCriarPessoa(nomePessoa)

      let associadoSelecionadoId: string | null = null
      let representanteSelecionadoId: string | null = null
      const convenioSelecionadoId: string | null = convenioId || null

      if (tipo === "associado") {
        associadoSelecionadoId = await obterOuCriarAssociado(
          pessoaPrincipalId,
          matricula
        )
      }

      if (usarRepresentante) {
        const pessoaRepresentanteId =
          await obterOuCriarPessoa(nomeRepresentante)

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

      toast.success("Chegada registrada.")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao registrar chegada. Tente novamente.")
    } finally {
      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // INICIAR ATENDIMENTO
  // =====================================================

  async function iniciarAtendimento(id: string) {
    if (!podeOperarAtendimento) {
      toast.error("Você não tem permissão para iniciar atendimento.")
      return
    }

    if (acaoEmAndamento) return

    const profissionalSelecionado = profissionalInicioId[id]

    if (!profissionalSelecionado) {
      toast.warning("Selecione o profissional que vai iniciar o atendimento.")
      return
    }

    try {
      setAcaoEmAndamento(`iniciar_${id}`)

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
    } catch (error) {
      console.error(error)
      toast.error("Erro ao iniciar atendimento. Tente novamente.")
    } finally {
      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // FINALIZAR ATENDIMENTO
  // =====================================================

  async function finalizarAtendimento(id: string) {
    if (!podeOperarAtendimento) {
      toast.warning("Você não tem permissão para finalizar atendimento.")
      return
    }

    if (acaoEmAndamento) return

    try {
      setAcaoEmAndamento(`finalizar_${id}`)

      await updateDoc(doc(db, "atendimentos", id), {
        status: "finalizado",
        fim_atendimento: serverTimestamp(),
        atualizado_em: serverTimestamp(),
        atualizado_por: usuarioLogado
      })

      await registrarHistorico(id, "atendimento_finalizado")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao finalizar atendimento. Tente novamente.")
    } finally {
      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // CANCELAR ATENDIMENTO
  // =====================================================

  // =====================================================
  // CONFIRMAR CANCELAMENTO DO ATENDIMENTO
  // =====================================================
  // Essa função é chamada pelo modal de cancelamento.
  // Ela usa o motivo digitado no textarea do modal.
  async function confirmarCancelamentoAtendimento() {
    if (!podeOperarAtendimento) {
      toast.warning("Você não tem permissão para cancelar atendimento.")
      return
    }

    if (acaoEmAndamento) return

    if (!atendimentoCancelandoId) {
      toast.error("Atendimento não identificado.")
      return
    }

    if (motivoCancelamento.trim() === "") {
      toast.warning("Informe o motivo do cancelamento.")
      return
    }

    try {
      setAcaoEmAndamento(`cancelar_${atendimentoCancelandoId}`)

      await updateDoc(doc(db, "atendimentos", atendimentoCancelandoId), {
        status: "cancelado",
        motivo: motivoCancelamento.trim(),
        fim_atendimento: serverTimestamp(),
        atualizado_em: serverTimestamp(),
        atualizado_por: usuarioLogado
      })

      await registrarHistorico(
        atendimentoCancelandoId,
        "atendimento_cancelado",
        motivoCancelamento.trim()
      )

      toast.success("Atendimento cancelado.")

      setModalCancelamentoAberto(false)
      setAtendimentoCancelandoId("")
      setMotivoCancelamento("")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao cancelar atendimento.")
    } finally {
      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // CÁLCULO DE TEMPO DE ESPERA
  // =====================================================

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

  // =====================================================
  // CÁLCULO DE DURAÇÃO DO ATENDIMENTO
  // =====================================================

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

  // =====================================================
  // NOME VISUAL DOS STATUS
  // =====================================================

  function nomeStatus(status: StatusAtendimento) {
    const nomes: Record<StatusAtendimento, string> = {
      aguardando: "Aguardando",
      em_atendimento: "Em atendimento",
      finalizado: "Finalizado",
      cancelado: "Cancelado"
    }

    return nomes[status]
  }

  // =====================================================
  // CLASSE VISUAL DOS STATUS
  // =====================================================

  function classeStatus(status: StatusAtendimento) {
    const classes: Record<StatusAtendimento, string> = {
      aguardando:
        "border-amber-500/30 bg-amber-500/10 text-amber-300",
      em_atendimento:
        "border-sky-500/30 bg-sky-500/10 text-sky-300",
      finalizado:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      cancelado:
        "border-rose-500/30 bg-rose-500/10 text-rose-300"
    }

    return classes[status]
  }

  // =====================================================
  // AUTOCOMPLETE DE PROFISSIONAL PARA INICIAR ATENDIMENTO
  // =====================================================

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

  // =====================================================
  // ATENDIMENTOS DO DIA
  // =====================================================

  const atendimentosDoDia = atendimentos.filter(ehAtendimentoDeHoje)

  // =====================================================
  // ORDENAÇÃO DA FILA
  // =====================================================

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

  // =====================================================
  // FILTRO DE STATUS DA FILA
  // =====================================================

  const atendimentosFiltrados = atendimentosOrdenados.filter((atendimento) => {
    if (filtroStatus === "todos") {
      return (
        atendimento.status === "aguardando" ||
        atendimento.status === "em_atendimento"
      )
    }

    return atendimento.status === filtroStatus
  })

  // =====================================================
  // CONTADORES DO DIA
  // =====================================================

  const totalAguardando =
    atendimentosDoDia.filter((a) => a.status === "aguardando").length

  const totalEmAtendimento =
    atendimentosDoDia.filter((a) => a.status === "em_atendimento").length

  const totalFinalizados =
    atendimentosDoDia.filter((a) => a.status === "finalizado").length

  const totalCancelados =
    atendimentosDoDia.filter((a) => a.status === "cancelado").length

  return (
    <div className="space-y-6">
      {/* =====================================================
          CABEÇALHO DA PÁGINA
          ===================================================== */}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Atendimentos
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          Registro de chegada, fila e controle de atendimento da ADUSEPS.
        </p>
      </div>

      {/* =====================================================
          CARDS RESUMO
          ===================================================== */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          FORMULÁRIO DE NOVO ATENDIMENTO
          ===================================================== */}
      {podeRegistrarChegada && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-zinc-100">
              Novo atendimento
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Registre a chegada da pessoa e envie para a fila de atendimento.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value as TipoAtendimento)
                setMatricula("")
                setConvenioId("")
              }}
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="associado">Associado</option>
              <option value="nao_associado">Não associado</option>
            </select>

            <input
              type="text"
              placeholder="Nome da pessoa"
              value={nomePessoa}
              onChange={(e) => setNomePessoa(e.target.value)}
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
            />

            <input
              type="text"
              placeholder={tipo === "associado" ? "Matrícula" : "Sem matrícula"}
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              disabled={tipo === "nao_associado"}
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 disabled:opacity-50 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
            />

            <select
              value={convenioId}
              onChange={(e) => setConvenioId(e.target.value)}
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">
                {tipo === "associado"
                  ? "Convênio obrigatório"
                  : "Convênio opcional"}
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
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
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
                  className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                />

                <select
                  value={tipoRepresentante}
                  onChange={(e) => setTipoRepresentante(e.target.value)}
                  className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
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
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
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
            className="mt-3 min-h-[88px] w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
          />

          <div className="mt-4 flex justify-end">
            <button
              onClick={registrarChegada}
              disabled={acaoEmAndamento === "registrar_chegada"}
              className="
                h-11 rounded-xl border border-blue-500/40
                bg-blue-600 px-6 text-sm font-semibold text-white
                transition hover:bg-blue-500
                disabled:cursor-not-allowed disabled:opacity-50
              "
            >
              {acaoEmAndamento === "registrar_chegada"
                ? "Salvando..."
                : "Salvar chegada"}
            </button>
          </div>
        </section>
      )}

      {/* =====================================================
          FILA DE ATENDIMENTOS
          ===================================================== */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Atendimentos do dia
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {atendimentosFiltrados.length} atendimento(s) na visualização atual
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              "todos",
              "aguardando",
              "em_atendimento",
              "finalizado",
              "cancelado"
            ].map((status) => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${filtroStatus === status
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
              >
                {status === "todos"
                  ? "Ativos"
                  : nomeStatus(status as StatusAtendimento)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {atendimentosFiltrados.length === 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-5 py-8 text-center">
              <p className="text-sm font-medium text-zinc-300">
                Nenhum atendimento registrado hoje.
              </p>
            </div>
          )}

          {atendimentosFiltrados.map((atendimento) => {
            const pessoa = buscarPessoa(atendimento.pessoa_id)
            const associado = buscarAssociado(atendimento.associado_id)
            const representante = buscarRepresentante(
              atendimento.representante_id
            )

            const pessoaRepresentante = representante
              ? buscarPessoa(representante.pessoa_id)
              : null

            const profissional = buscarProfissional(
              atendimento.profissional_id
            )

            const profissionalPreferencial = buscarProfissional(
              atendimento.profissional_preferencial_id
            )

            const convenio = buscarConvenio(atendimento.convenio_id)

            return (
              <div
                key={atendimento.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 transition hover:bg-zinc-900"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-zinc-100">
                        {pessoa?.nome.toUpperCase() || "Pessoa não encontrada"}
                      </p>

                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${classeStatus(
                          atendimento.status
                        )}`}
                      >
                        {nomeStatus(atendimento.status)}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
                      <span>
                        {atendimento.tipo === "associado"
                          ? "Associado"
                          : "Não associado"}
                      </span>

                      {associado && (
                        <span>Matrícula: {associado.matricula}</span>
                      )}

                      {convenio && <span>Convênio: {convenio.nome}</span>}

                      {atendimento.data_hora_chegada && (
                        <span>
                          Espera:{" "}
                          {atendimento.status === "aguardando"
                            ? calcularTempo(atendimento.data_hora_chegada)
                            : "—"}
                        </span>
                      )}
                    </div>

                    {(pessoaRepresentante ||
                      profissionalPreferencial ||
                      atendimento.observacao) && (
                        <div className="mt-2 space-y-1 text-sm text-zinc-400">
                          {pessoaRepresentante && representante && (
                            <p>
                              Representante: {pessoaRepresentante.nome} (
                              {representante.tipo})
                            </p>
                          )}

                          {profissionalPreferencial && (
                            <p>
                              Preferência: {profissionalPreferencial.nome}
                            </p>
                          )}

                          {atendimento.observacao && (
                            <p className="text-zinc-300">
                              Obs: {atendimento.observacao}
                            </p>
                          )}
                        </div>
                      )}

                    <div className="mt-2 text-xs text-zinc-500">
                      {atendimento.data_hora_chegada && (
                        <span>
                          Chegada:{" "}
                          {new Date(
                            atendimento.data_hora_chegada.seconds * 1000
                          ).toLocaleString("pt-BR")}
                        </span>
                      )}

                      {atendimento.status === "em_atendimento" &&
                        atendimento.inicio_atendimento && (
                          <span>
                            {" • "}Em atendimento há:{" "}
                            {calcularDuracao(atendimento.inicio_atendimento)}
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
                        <span>
                          {" • "}Cancelamento: {atendimento.motivo}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 lg:w-[260px]">

                    {podeOperarAtendimento &&
                      atendimento.status === "aguardando" && atendimento.id && (
                        <>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Profissional que vai atender"
                              value={
                                buscaProfissionalInicio[atendimento.id] || ""
                              }
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
                              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                            />

                            {(buscaProfissionalInicio[atendimento.id] || "")
                              .trim()
                              .length >= 2 &&
                              !profissionalInicioId[atendimento.id] && (
                                <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
                                  {profissionaisEncontradosPorAtendimento(
                                    atendimento.id
                                  ).length === 0 && (
                                      <p className="px-4 py-3 text-sm text-zinc-400">
                                        Nenhum profissional encontrado.
                                      </p>
                                    )}

                                  {profissionaisEncontradosPorAtendimento(
                                    atendimento.id
                                  ).map((profissionalItem) => (
                                    <button
                                      key={profissionalItem.id}
                                      type="button"
                                      onClick={() => {
                                        setProfissionalInicioId(
                                          (estadoAtual) => ({
                                            ...estadoAtual,
                                            [atendimento.id!]:
                                              profissionalItem.id || ""
                                          })
                                        )

                                        setBuscaProfissionalInicio(
                                          (estadoAtual) => ({
                                            ...estadoAtual,
                                            [atendimento.id!]:
                                              profissionalItem.nome
                                          })
                                        )
                                      }}
                                      className="w-full px-4 py-3 text-left text-sm text-zinc-200 transition hover:bg-zinc-800"
                                    >
                                      {profissionalItem.nome}
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>

                          <button
                            onClick={() => iniciarAtendimento(atendimento.id!)}
                            disabled={acaoEmAndamento === `iniciar_${atendimento.id}`}
                            className="
                              h-10 rounded-lg border border-blue-500/40
                              bg-blue-600 px-3 text-sm font-semibold text-white
                              transition hover:bg-blue-500
                              disabled:cursor-not-allowed disabled:opacity-50
                            "
                          >
                            {acaoEmAndamento === `iniciar_${atendimento.id}`
                              ? "Iniciando..."
                              : "Iniciar"}
                          </button>

                        </>
                      )}

                    {podeOperarAtendimento &&
                      atendimento.status === "em_atendimento" &&
                      atendimento.id && (
                        <button
                          onClick={() => finalizarAtendimento(atendimento.id!)}
                          disabled={acaoEmAndamento === `finalizar_${atendimento.id}`}
                          className="
                                h-10 rounded-lg border border-emerald-500/30
                                bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-300
                                transition hover:bg-emerald-500/20
                                disabled:cursor-not-allowed disabled:opacity-50
                              "
                        >
                          {acaoEmAndamento === `finalizar_${atendimento.id}`
                            ? "Finalizando..."
                            : "Finalizar"}
                        </button>
                      )}

                    {podeOperarAtendimento &&
                      atendimento.status !== "finalizado" &&
                      atendimento.status !== "cancelado" &&
                      atendimento.id && (
                        <button
                          onClick={() => {
                            setAtendimentoCancelandoId(atendimento.id!)
                            setMotivoCancelamento("")
                            setModalCancelamentoAberto(true)
                          }}
                          disabled={acaoEmAndamento === `cancelar_${atendimento.id}`}
                          className="
                            h-10 rounded-lg border border-red-500/30
                            bg-red-500/10 px-3 text-sm font-semibold text-red-300
                            transition hover:bg-red-500/20
                            disabled:cursor-not-allowed disabled:opacity-50
                          "
                        >
                          {acaoEmAndamento === `cancelar_${atendimento.id}`
                            ? "Cancelando..."
                            : "Cancelar"}
                        </button>
                      )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* =====================================================
    MODAL DE CANCELAMENTO
    ===================================================== */}
      {modalCancelamentoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">

            <h2 className="text-lg font-semibold text-zinc-100">
              Cancelar atendimento
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Informe o motivo do cancelamento para registrar no histórico.
            </p>

            <textarea
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              placeholder="Digite o motivo do cancelamento"
              className="
              mt-4 min-h-[120px] w-full resize-none rounded-xl
              border border-zinc-700 bg-zinc-950 px-4 py-3
              text-sm text-zinc-100 outline-none transition
              placeholder:text-zinc-500
              focus:border-blue-500/60
              focus:ring-2 focus:ring-blue-500/20
            "
            />

            <div className="mt-5 flex justify-end gap-3">

              <button
                type="button"
                onClick={() => {
                  setModalCancelamentoAberto(false)
                  setAtendimentoCancelandoId("")
                  setMotivoCancelamento("")
                }}
                disabled={acaoEmAndamento.startsWith("cancelar_")}
                className="
                h-10 rounded-lg border border-zinc-700
                bg-zinc-800 px-4 text-sm font-semibold text-zinc-100
                transition hover:bg-zinc-700
                disabled:cursor-not-allowed disabled:opacity-50
              "
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={confirmarCancelamentoAtendimento}
                disabled={acaoEmAndamento.startsWith("cancelar_")}
                className="
                h-10 rounded-lg border border-red-500/30
                bg-red-500/10 px-4 text-sm font-semibold text-red-300
                transition hover:bg-red-500/20
                disabled:cursor-not-allowed disabled:opacity-50
              "
              >
                {acaoEmAndamento.startsWith("cancelar_")
                  ? "Cancelando..."
                  : "Confirmar cancelamento"}
              </button>

            </div>

          </div>

        </div>
      )}
    </div>
  )
}