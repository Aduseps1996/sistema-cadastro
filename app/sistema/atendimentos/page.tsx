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
  updateDoc,
  setDoc
} from "firebase/firestore"

import { db, auth } from "../../../lib/firebase"
import { useUsuario } from "../../context/UsuarioContext"

import { Select } from "../../components/ui/Select"
import { Botao } from "../../components/ui/Botao"

// =====================================================
// TIPOS DAS ENTIDADES
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
  convenio_id?: string | null
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
// TIPOS E STATUS DE ATENDIMENTO
// =====================================================

type StatusAtendimento =
  | "aguardando"
  | "chamado"
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
  motivo_categoria?: string
  motivo_detalhe?: string | null
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

const motivosAtendimento: Record<string, string[]> = {
  Financeiro: [
    "Pagamento",
    "Cancelamento",
    "Autorização",
    "Reembolso",
    "Cobrança",
    "Outro"
  ],

  Jurídico: [
    "Entrega de documentos",
    "Informação processual",
    "Orientação Jurídica",
    "Nova demanda",
    "Assinatura de documentos",
    "Retorno jurídico",
    "Outro"
  ],

  Inscrição: [
    "Inscrição simples",
    "Inscrição + jurídico"
  ],

  "Atualização cadastral": [],

  Reclamação: [],

  Informação: [],

  Outro: []
}

export default function AtendimentosPage() {
  // =====================================================
  // FORMULÁRIO DE CHEGADA E INFORMAÇÕES DE CONTEXTO
  // =====================================================

  const { usuarioSistema } = useUsuario()

  // =====================================================
  // PERMISSÕES DE AÇÃO
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

  // =====================================================
  // ESTADOS DO FORMULÁRIO E CONTROLES DO USUÁRIO
  // =====================================================

  const [tipo, setTipo] = useState<TipoAtendimento>("associado")
  const [nomePessoa, setNomePessoa] = useState("")
  const [matricula, setMatricula] = useState("")
  const [matriculaNaoEncontrada, setMatriculaNaoEncontrada] = useState(false)
  const [convenioId, setConvenioId] = useState("")
  const [buscaConvenio, setBuscaConvenio] = useState("")
  const [mostrarListaConvenios, setMostrarListaConvenios] = useState(false)
  const [usarRepresentante, setUsarRepresentante] = useState(false)
  const [nomeRepresentante, setNomeRepresentante] = useState("")
  const [tipoRepresentante, setTipoRepresentante] = useState("")
  const [profissionalPreferencialId, setProfissionalPreferencialId] = useState("")
  const [motivoCategoria, setMotivoCategoria] = useState("")
  const [motivoDetalhe, setMotivoDetalhe] = useState("")
  const [observacao, setObservacao] = useState("")

  // =====================================================
  // INDICADOR DE AÇÃO EM ANDAMENTO
  // =====================================================
  // Guarda qual ação está em andamento. Evita clique duplo e dá feedback visual.
  const [acaoEmAndamento, setAcaoEmAndamento] = useState("")

  // =====================================================
  // CONTROLE OPERACIONAL DA FILA
  // =====================================================

  const [usuarioLogado, setUsuarioLogado] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todos")


  // =====================================================
  // MODAIS E ESTADOS DE PENDÊNCIAS
  // =====================================================
  const [modalCancelamentoAberto, setModalCancelamentoAberto] =
    useState(false)
  const [atendimentoCancelandoId, setAtendimentoCancelandoId] =
    useState("")
  const [motivoCancelamento, setMotivoCancelamento] =
    useState("")
  const [modalPendenciaAberto, setModalPendenciaAberto] = useState(false)
  const [atendimentoPendenteId, setAtendimentoPendenteId] = useState("")
  const [observacaoPendencia, setObservacaoPendencia] = useState("")

  // =====================================================
  // ESTADOS DE CHAMADA DE PROFISSIONAL
  // =====================================================
  const [profissionalChamadaId, setProfissionalChamadaId] = useState("")
  const [buscaProfissionalChamada, setBuscaProfissionalChamada] = useState("")

  // =====================================================
  // ESTADOS DE DADOS CARREGADOS DO FIRESTORE
  // =====================================================

  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [associados, setAssociados] = useState<Associado[]>([])
  const [representantes, setRepresentantes] = useState<Representante[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [convenios, setConvenios] = useState<Convenio[]>([])
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])


  // =====================================================
  // AUTENTICAÇÃO E USUÁRIO LOGADO
  // =====================================================

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((usuario) => {
      setUsuarioLogado(usuario?.email || "")
    })

    return () => unsubscribe()
  }, [])


  // =====================================================
  // FIRESTORE: PESSOAS
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
  // FIRESTORE: ASSOCIADOS
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
  // FIRESTORE: REPRESENTANTES
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
  // FIRESTORE: PROFISSIONAIS
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
  // FIRESTORE: CONVÊNIOS
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
  // FIRESTORE: ATENDIMENTOS
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
  // UTILITÁRIOS DE TEXTO
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
  // UTILITÁRIO DE DATA PARA ATENDIMENTOS
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
  // BUSCAS POR ID DE ENTIDADES
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

  function preencherDadosPorMatricula(matriculaInformada: string) {
  const valor = matriculaInformada.trim()

  if (valor === "") {
    setMatriculaNaoEncontrada(false)
    return
  }

  const associado = buscarAssociadoPorMatricula(valor)

  if (!associado) {
    setMatriculaNaoEncontrada(true)
    return
  }

  const pessoa = buscarPessoa(associado.pessoa_id)
  const convenio = buscarConvenio(associado.convenio_id)

  setNomePessoa(pessoa?.nome || "")
  setConvenioId(associado.convenio_id || "")
  setBuscaConvenio(convenio?.nome || "")
  setMatriculaNaoEncontrada(false)
}

  function profissionalDoUsuarioLogado() {
    if (!usuarioSistema?.profissional_id) return null

    return profissionais.find(
      (profissional) =>
        profissional.id === usuarioSistema.profissional_id
    )
  }


  // =====================================================
  // CRIAR OU REAPROVEITAR PESSOA
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
  // CRIAR OU REAPROVEITAR ASSOCIADO
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
          convenio_id: convenioId || null,
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
  // CRIAR OU REAPROVEITAR REPRESENTANTE
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
  // HISTÓRICO DE ATENDIMENTOS
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
  // AÇÃO: REGISTRAR CHEGADA
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

    if (motivoCategoria === "") {
      toast.warning("Selecione o motivo do atendimento.")
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
        motivo_categoria: motivoCategoria,
        motivo_detalhe: motivoDetalhe || null,
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
      setMatriculaNaoEncontrada(false)
      setConvenioId("")
      setBuscaConvenio("")
      setUsarRepresentante(false)
      setNomeRepresentante("")
      setTipoRepresentante("")
      setProfissionalPreferencialId("")
      setMotivoCategoria("")
      setMotivoDetalhe("")
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
  // AÇÃO: CHAMAR PRÓXIMO ATENDIMENTO
  // =====================================================
  async function chamarProximoAtendimento() {
    if (!podeOperarAtendimento) {
      toast.error("Você não tem permissão para operar a fila.")
      return
    }

    if (acaoEmAndamento) return

    const profissionalResponsavel =
      usuarioSistema?.perfil === "Atendente"
        ? usuarioSistema?.profissional_id || ""
        : profissionalChamadaId

    if (profissionalResponsavel === "") {
      toast.warning("Selecione o profissional que vai atender.")
      return
    }

    const atendimentoAbertoDoProfissional = atendimentos.find(
      (atendimento) =>
        atendimento.status === "em_atendimento" &&
        atendimento.profissional_id === profissionalResponsavel
    )

    if (atendimentoAbertoDoProfissional) {
      toast.warning("Este profissional já possui um atendimento em aberto.")
      return
    }

    const filaAguardando = atendimentosOrdenados.filter(
      (atendimento) => atendimento.status === "aguardando"
    )

    const atendimentoSelecionado = filaAguardando.find((atendimento) => {
      const preferencia = atendimento.profissional_preferencial_id

      return (
        !preferencia ||
        preferencia === profissionalResponsavel
      )
    })

    if (!atendimentoSelecionado?.id) {
      toast.warning("Nenhum atendimento compatível na fila.")
      return
    }

    try {
      setAcaoEmAndamento("chamar_proximo")

      await updateDoc(doc(db, "atendimentos", atendimentoSelecionado.id), {
        status: "chamado",
        profissional_id: profissionalResponsavel,
        data_hora_chamada: serverTimestamp(),
        atualizado_em: serverTimestamp(),
        atualizado_por: usuarioLogado
      })

      await setDoc(doc(db, "painel_chamadas", "atual"), {
        ativo: true,
        atendimento_id: atendimentoSelecionado.id,
        nome: buscarPessoa(atendimentoSelecionado.pessoa_id)?.nome || "",
        matricula: buscarAssociado(atendimentoSelecionado.associado_id)?.matricula || "",
        profissional: buscarProfissional(profissionalResponsavel)?.nome || "",
        criado_em: serverTimestamp()
      })

      await registrarHistorico(
        atendimentoSelecionado.id,
        "atendimento_chamado"
      )

      toast.success("Próximo atendimento iniciado.")

      if (
        usuarioSistema?.perfil === "Administrador" ||
        usuarioSistema?.perfil === "Recepção"
      ) {
        setProfissionalChamadaId("")
      }
    } catch (error) {
      console.error(error)
      toast.error("Erro ao chamar próximo atendimento.")
    } finally {
      setAcaoEmAndamento("")
    }
  }

  async function alterarPreferenciaAtendimento(
    atendimentoId: string,
    profissionalId: string
  ) {
    if (
      usuarioSistema?.perfil !== "Administrador" &&
      usuarioSistema?.perfil !== "Recepção"
    ) {
      toast.warning("Você não tem permissão para alterar preferência.")
      return
    }

    try {
      setAcaoEmAndamento(`preferencia_${atendimentoId}`)

      await updateDoc(doc(db, "atendimentos", atendimentoId), {
        profissional_preferencial_id: profissionalId || null,
        atualizado_em: serverTimestamp(),
        atualizado_por: usuarioLogado
      })

      await registrarHistorico(
        atendimentoId,
        "preferencia_alterada",
        profissionalId
          ? "Preferência profissional alterada."
          : "Preferência profissional removida."
      )

      toast.success("Preferência atualizada.")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao alterar preferência.")
    } finally {
      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // AÇÃO: INICIAR ATENDIMENTO
  // =====================================================

  async function iniciarAtendimento(id: string) {
  if (!podeOperarAtendimento) {
    toast.warning("Você não tem permissão para iniciar atendimento.")
    return
  }

  if (acaoEmAndamento) return

  try {
    setAcaoEmAndamento(`iniciar_${id}`)

    await updateDoc(doc(db, "atendimentos", id), {
      status: "em_atendimento",
      inicio_atendimento: serverTimestamp(),
      atualizado_em: serverTimestamp(),
      atualizado_por: usuarioLogado
    })

    await registrarHistorico(id, "atendimento_iniciado")

    toast.success("Atendimento iniciado.")
  } catch (error) {
    console.error(error)
    toast.error("Erro ao iniciar atendimento.")
  } finally {
    setAcaoEmAndamento("")
  }
}

  // =====================================================
  // AÇÃO: FINALIZAR ATENDIMENTO
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

  async function finalizarAtendimentoPendente() {
    if (!atendimentoPendenteId) {
      toast.error("Atendimento não identificado.")
      return
    }

    if (observacaoPendencia.trim() === "") {
      toast.warning("Informe uma observação para encerrar.")
      return
    }

    try {
      setAcaoEmAndamento(`finalizar_pendente_${atendimentoPendenteId}`)

      await updateDoc(doc(db, "atendimentos", atendimentoPendenteId), {
        status: "finalizado",
        fim_atendimento: serverTimestamp(),
        observacao_encerramento: observacaoPendencia.trim(),
        atualizado_em: serverTimestamp(),
        atualizado_por: usuarioLogado
      })

      await registrarHistorico(
        atendimentoPendenteId,
        "atendimento_finalizado_posteriormente",
        observacaoPendencia.trim()
      )

      toast.success("Atendimento pendente encerrado.")

      setModalPendenciaAberto(false)
      setAtendimentoPendenteId("")
      setObservacaoPendencia("")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao encerrar atendimento pendente.")
    } finally {
      setAcaoEmAndamento("")
    }
  }


  // =====================================================
  // AÇÃO: CONFIRMAR CANCELAMENTO DE ATENDIMENTO
  // =====================================================
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
  // UTILITÁRIOS DE TEMPO
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
  // UTILITÁRIOS DE DURAÇÃO
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
  // DESCRITIVO DE STATUS
  // =====================================================

  function nomeStatus(status: StatusAtendimento) {
    const nomes: Record<StatusAtendimento, string> = {
      aguardando: "Aguardando",
      chamado: "Chamado",
      em_atendimento: "Em atendimento",
      finalizado: "Finalizado",
      cancelado: "Cancelado"
    }

    return nomes[status]
  }

  // =====================================================
  // ESTILO POR STATUS
  // =====================================================

  function classeStatus(status: StatusAtendimento) {
    const classes: Record<StatusAtendimento, string> = {
      aguardando:
        "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      chamado:
        "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
      em_atendimento:
        "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      finalizado:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      cancelado:
        "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
    }

    return classes[status]
  }



  // =====================================================
  // FILTRAGEM: ATENDIMENTOS DO DIA
  // =====================================================

  const atendimentosDoDia = atendimentos.filter(ehAtendimentoDeHoje)

  // =====================================================
  // ORDENAÇÃO DA FILA
  // =====================================================

  const atendimentosOrdenados = [...atendimentosDoDia].sort((a, b) => {
    const ordemStatus: Record<string, number> = {
      chamado: 0,
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
  // FILTRAGEM POR STATUS
  // =====================================================

  const atendimentosFiltrados = atendimentosOrdenados.filter((atendimento) => {
    if (filtroStatus === "todos") {
      return (
        atendimento.status === "chamado" ||
        atendimento.status === "aguardando" ||
        atendimento.status === "em_atendimento"
      )
    }

    return atendimento.status === filtroStatus
  })

  // =====================================================
  // CONTADORES DE STATUS
  // =====================================================

  const totalAguardando =
    atendimentosDoDia.filter((a) => a.status === "aguardando").length

  const totalEmAtendimento =
    atendimentosDoDia.filter((a) => a.status === "em_atendimento").length

  const totalFinalizados =
    atendimentosDoDia.filter((a) => a.status === "finalizado").length

  const totalCancelados =
    atendimentosDoDia.filter((a) => a.status === "cancelado").length

  // =====================================================
  // ATENDIMENTOS EM ABERTO DE DIAS ANTERIORES
  // =====================================================
  const atendimentosAbertosAnteriores = atendimentos.filter((atendimento) => {
    return (
      atendimento.status === "em_atendimento" &&
      !ehAtendimentoDeHoje(atendimento)
    )
  })


  const profissionalAutomatico = profissionalDoUsuarioLogado()

  function obterNomeProfissional(id?: string | null) {
    if (!id) return null

    return profissionais.find(
      (profissional) => profissional.id === id
    )?.nome
  }

  const conveniosFiltrados = convenios
  .filter((convenio) => convenio.ativo)
  .filter((convenio) =>
    convenio.nome
      .toLowerCase()
      .includes(buscaConvenio.toLowerCase().trim())
  )

  return (
    <div className="space-y-6">
      {/* ================ CABEÇALHO DA PÁGINA ================ */}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Atendimentos
        </h1>

        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
          Registro de chegada, fila e controle de atendimento da ADUSEPS.
        </p>
      </div>

      {/* ==================== CARDS RESUMO ==================== */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80 p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Aguardando</p>
          <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">
            {totalAguardando}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80 p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Em atendimento</p>
          <p className="mt-1 text-2xl font-bold text-sky-700 dark:text-sky-300">
            {totalEmAtendimento}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80 p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Finalizados</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {totalFinalizados}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80 p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Cancelados</p>
          <p className="mt-1 text-2xl font-bold text-rose-700 dark:text-rose-300">
            {totalCancelados}
          </p>
        </div>
      </div>

      {/* ================ FORMULÁRIO DE ATENDIMENTO ================ */}
      {podeRegistrarChegada && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Cadastrar Atendimento
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Registre a chegada da pessoa e envie para a fila de atendimento.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <p className="mb-3 border-l-4 border-blue-500 pl-3 text-sm font-bold    uppercase tracking-wide text-zinc-800 dark:text-zinc-100">
                Dados principais
              </p>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="space-y-1 md:col-span-3">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Tipo de atendimento
                  </label>

                  <select
                    value={tipo}
                    onChange={(e) => {
                      setTipo(e.target.value as TipoAtendimento)
                      setMatricula("")
                      setConvenioId("")
                      setBuscaConvenio("")
                    }}
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="associado">Associado</option>
                    <option value="nao_associado">Não associado</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Matrícula
                  </label>

                  <input
                    type="text"
                    placeholder={tipo === "associado" ? "Nº matrícula" : "Sem matrícula"}
                    value={matricula}
                    onChange={(e) => {
                      const valor = e.target.value
                      setMatricula(valor)
                      preencherDadosPorMatricula(valor)
                    }}
                    disabled={tipo === "nao_associado"}
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 disabled:opacity-50 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />

                  {matriculaNaoEncontrada && (
                    <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      Matrícula não localizada. Confira ou preencha os dados manualmente.
                    </p>
                  )}
                </div>

                <div className="space-y-1 md:col-span-5">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Nome da pessoa
                  </label>

                  <input
                    type="text"
                    placeholder="Digite o nome"
                    value={nomePessoa}
                    onChange={(e) => setNomePessoa(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                </div>


                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Convênio
                  </label>

                  <div className="relative">
  <input
    type="text"
    placeholder={
      tipo === "associado"
        ? "Digite o convênio"
        : "Convênio opcional"
    }
    value={buscaConvenio}
    onChange={(e) => {
      setBuscaConvenio(e.target.value)
      setConvenioId("")
      setMostrarListaConvenios(true)
    }}
    onFocus={() => setMostrarListaConvenios(true)}
    onBlur={() => {
      setTimeout(() => {
        setMostrarListaConvenios(false)
      }, 150)
    }}
    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
  />

  {mostrarListaConvenios && buscaConvenio.trim() !== "" && (
    <div className="absolute z-50 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
      {conveniosFiltrados.length === 0 && (
        <p className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
          Nenhum convênio encontrado.
        </p>
      )}

      {conveniosFiltrados.map((convenio) => (
        <button
          key={convenio.id}
          type="button"
          onMouseDown={() => {
            setConvenioId(convenio.id || "")
            setBuscaConvenio(convenio.nome)
            setMostrarListaConvenios(false)
          }}
          className="w-full px-4 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {convenio.nome}
        </button>
      ))}
    </div>
  )}
</div>
                </div>
                
              </div>
            </div>

            <div>
              <p className="mb-3 border-l-4 border-blue-500 pl-3 text-sm font-bold    uppercase tracking-wide text-zinc-800 dark:text-zinc-100">
                Representante e preferência
              </p>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="space-y-1 md:col-span-3">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Representante
                  </label>

                  <select
                    value={usarRepresentante ? "sim" : "nao"}
                    onChange={(e) => {
                      setUsarRepresentante(e.target.value === "sim")
                      setNomeRepresentante("")
                      setTipoRepresentante("")
                    }}
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="nao">Sem representante</option>
                    <option value="sim">Com representante</option>
                  </select>
                </div>

                {usarRepresentante && (
                  <>
                    <div className="space-y-1 md:col-span-5">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Nome do representante
                      </label>

                      <input
                        type="text"
                        placeholder="Digite o nome"
                        value={nomeRepresentante}
                        onChange={(e) => setNomeRepresentante(e.target.value)}
                        className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-4">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Tipo de representante
                      </label>

                      <select
                        value={tipoRepresentante}
                        onChange={(e) => setTipoRepresentante(e.target.value)}
                        className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      >
                        <option value="">Selecione</option>

                        {tiposRepresentante.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="space-y-1 md:col-span-4">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Preferência profissional
                  </label>

                  <select
                    value={profissionalPreferencialId}
                    onChange={(e) => setProfissionalPreferencialId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="">Sem preferência</option>

                    {profissionais
                      .filter((profissional) => profissional.ativo)
                      .map((profissional) => (
                        <option key={profissional.id} value={profissional.id}>
                          {profissional.nome}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-3 border-l-4 border-blue-500 pl-3 text-sm font-bold    uppercase tracking-wide text-zinc-800 dark:text-zinc-100">
                Motivo do atendimento
              </p>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="space-y-1 md:col-span-3">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Categoria
                  </label>

                  <select
                    value={motivoCategoria}
                    onChange={(e) => {
                      setMotivoCategoria(e.target.value)
                      setMotivoDetalhe("")
                    }}
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="">Selecione</option>

                    {Object.keys(motivosAtendimento).map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 md:col-span-3">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Detalhe
                  </label>

                  <select
                    value={motivoDetalhe}
                    onChange={(e) => setMotivoDetalhe(e.target.value)}
                    disabled={
                      motivoCategoria === "" ||
                      motivosAtendimento[motivoCategoria]?.length === 0
                    }
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition disabled:opacity-50 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="">
                      {motivoCategoria === ""
                        ? "Selecione a categoria"
                        : motivosAtendimento[motivoCategoria]?.length === 0
                          ? "Sem detalhe"
                          : "Selecione"}
                    </option>

                    {(motivosAtendimento[motivoCategoria] || []).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 md:col-span-6">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Observação complementar
                  </label>

                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Observações adicionais"
                    className="min-h-22 w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <button
                onClick={registrarChegada}
                disabled={acaoEmAndamento === "registrar_chegada"}
                className="h-11 rounded-xl border border-blue-500/40 bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {acaoEmAndamento === "registrar_chegada"
                  ? "Salvando..."
                  : "Salvar chegada"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ==================== CHAMADA DA FILA ==================== */}
      {podeOperarAtendimento && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Chamada da fila
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Chame o próximo atendimento conforme a ordem da fila e preferência profissional.
            </p>

            {usuarioSistema?.perfil === "Atendente" && (
              <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  Profissional vinculado
                </p>

                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {profissionalAutomatico?.nome || "Nenhum profissional vinculado"}
                </p>

                {!profissionalAutomatico && (
                  <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                    Vincule este usuário a um profissional para usar a chamada automática.
                  </p>
                )}
              </div>
            )}

          </div>

          <div
            className={
              usuarioSistema?.perfil === "Atendente"
                ? "flex justify-end"
                : "grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px]"
            }
          >
            {usuarioSistema?.perfil !== "Atendente" && (
              <Select
                value={profissionalChamadaId}
                onChange={(e) => setProfissionalChamadaId(e.target.value)}
              >
                <option value="">Selecione o profissional</option>

                {profissionais
                  .filter((profissional) => profissional.ativo)
                  .map((profissional) => (
                    <option key={profissional.id} value={profissional.id}>
                      {profissional.nome}
                    </option>
                  ))}
              </Select>
            )}
            <Botao
              onClick={chamarProximoAtendimento}
              disabled={acaoEmAndamento === "chamar_proximo"}
              className="h-11 px-5"
            >
              {acaoEmAndamento === "chamar_proximo"
                ? "Chamando..."
                : "Chamar próximo"}
            </Botao>
          </div>
        </section>
      )}

      {/* ================= ATENDIMENTOS ABERTOS ANTERIORES ================= */}
      {atendimentosAbertosAnteriores.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-700/50 dark:bg-amber-950/20">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-amber-900 dark:text-amber-200">
              Atendimentos em aberto de dias anteriores
            </h2>

            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              Estes atendimentos foram iniciados anteriormente e ainda não foram finalizados.
            </p>
          </div>

          <div className="space-y-3">
            {atendimentosAbertosAnteriores.map((atendimento) => {
              const pessoa = buscarPessoa(atendimento.pessoa_id)
              const profissional = buscarProfissional(atendimento.profissional_id)

              return (
                <div
                  key={atendimento.id}
                  className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white p-4 dark:border-amber-800 dark:bg-zinc-950 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {pessoa?.nome || "Pessoa não encontrada"}
                    </p>

                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      Profissional: {profissional?.nome || "Não definido"}
                    </p>

                    {atendimento.inicio_atendimento && (
                      <p className="mt-1 text-xs text-zinc-500">
                        Iniciado em:{" "}
                        {new Date(
                          atendimento.inicio_atendimento.seconds * 1000
                        ).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setAtendimentoPendenteId(atendimento.id || "")
                      setObservacaoPendencia("")
                      setModalPendenciaAberto(true)
                    }}
                    disabled={
                      acaoEmAndamento === `finalizar_pendente_${atendimento.id}`
                    }
                    className="h-10 rounded-lg border border-amber-500/40 bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {acaoEmAndamento === `finalizar_pendente_${atendimento.id}`
                      ? "Encerrando..."
                      : "Encerrar com observação"}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* =====================================================
          FILA DE ATENDIMENTOS
          ===================================================== */}

      <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Atendimentos do dia
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
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
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${filtroStatus === status
                  ? "border-zinc-300 bg-blue-600 text-white dark:border-zinc-700 dark:bg-blue-600 dark:text-zinc-100"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
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
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50 px-5 py-8 text-center">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
                className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50 px-4 py-3 transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
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

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
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
                      atendimento.profissional_id ||
                      atendimento.motivo_categoria ||
                      atendimento.motivo_detalhe ||
                      atendimento.observacao) && (
                        <div className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
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

                          {(usuarioSistema?.perfil === "Administrador" ||
                            usuarioSistema?.perfil === "Recepção") &&
                            atendimento.status === "aguardando" &&
                            atendimento.id && (
                              <div className="mt-2 max-w-sm">
                                <label className="mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                  Alterar preferência
                                </label>

                                <select
                                  value={atendimento.profissional_preferencial_id || ""}
                                  onChange={(e) =>
                                    alterarPreferenciaAtendimento(
                                      atendimento.id!,
                                      e.target.value
                                    )
                                  }
                                  disabled={acaoEmAndamento === `preferencia_${atendimento.id}`}
                                  className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-xs text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                >
                                  <option value="">Sem preferência</option>

                                  {profissionais
                                    .filter((profissional) => profissional.ativo)
                                    .map((profissional) => (
                                      <option key={profissional.id} value={profissional.id}>
                                        {profissional.nome}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            )}

                          {atendimento.profissional_id && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Atendendo com:
                              <span className="ml-1 font-medium text-zinc-700 dark:text-zinc-200">
                                {obterNomeProfissional(atendimento.profissional_id)}
                              </span>
                            </p>
                          )}

                          {atendimento.motivo_categoria && (
                            <p>
                              Motivo: {atendimento.motivo_categoria}
                              {atendimento.motivo_detalhe
                                ? ` / ${atendimento.motivo_detalhe}`
                                : ""}
                            </p>
                          )}

                          {atendimento.observacao && (
                            <p className="text-zinc-700 dark:text-zinc-300">
                              Obs: {atendimento.observacao}
                            </p>
                          )}
                        </div>
                      )}

                    <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
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

                  <div className="flex flex-col gap-2 lg:w-65">

                    {podeOperarAtendimento &&
                      atendimento.status === "chamado" &&
                      atendimento.id && (
                        <button
                          onClick={() => iniciarAtendimento(atendimento.id!)}
                          disabled={acaoEmAndamento === `iniciar_${atendimento.id}`}
                          className="h-10 w-full rounded-lg border border-blue-500/40 bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {acaoEmAndamento === `iniciar_${atendimento.id}`
                            ? "Iniciando..."
                            : "Iniciar"}
                        </button>
                      )}

                    {podeOperarAtendimento &&
                      atendimento.status === "em_atendimento" &&
                      atendimento.id && (
                        <button
                          onClick={() => finalizarAtendimento(atendimento.id!)}
                          disabled={acaoEmAndamento === `finalizar_${atendimento.id}`}
                          className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
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
                          className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
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

      {/* Modal para encerramento de atendimento em aberto
       com observação */}

      {modalPendenciaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Encerrar atendimento pendente
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Informe uma observação para registrar o motivo do encerramento posterior.
            </p>

            <textarea
              value={observacaoPendencia}
              onChange={(e) => setObservacaoPendencia(e.target.value)}
              placeholder="Exemplo: Atendimento foi concluído no dia anterior, mas não foi finalizado no sistema."
              className="mt-4 min-h-30 w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalPendenciaAberto(false)
                  setAtendimentoPendenteId("")
                  setObservacaoPendencia("")
                }}
                disabled={acaoEmAndamento.startsWith("finalizar_pendente_")}
                className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={finalizarAtendimentoPendente}
                disabled={acaoEmAndamento.startsWith("finalizar_pendente_")}
                className="h-10 rounded-lg border border-amber-500/40 bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {acaoEmAndamento.startsWith("finalizar_pendente_")
                  ? "Encerrando..."
                  : "Confirmar encerramento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 
        MODAL CANCELAMENTO DE ATENDIMENTO
       ==================== */}
      {modalCancelamentoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">

            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Cancelar atendimento
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
              Informe o motivo do cancelamento para registrar no histórico.
            </p>

            <textarea
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              placeholder="Digite o motivo do cancelamento"
              className="
              mt-4 min-h-30 w-full resize-none rounded-xl
              border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950 px-4 py-3
              text-sm text-zinc-900 dark:text-zinc-100 outline-none transition
              placeholder:text-zinc-400 dark:placeholder:text-zinc-500
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
                className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={confirmarCancelamentoAtendimento}
                disabled={acaoEmAndamento.startsWith("cancelar_")}
                className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
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