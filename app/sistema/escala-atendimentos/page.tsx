"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore"

import { db } from "../../../lib/firebase"
import { useUsuario } from "../../context/UsuarioContext"

type Turno = "manha" | "tarde"
type DiaSemana = "segunda" | "terca" | "quarta" | "quinta" | "sexta"
type Aba = "semana" | "presencial" | "ocorrencias"

type TipoOcorrencia =
  | "Substituição"
  | "Ausência"
  | "Férias"
  | "Apoio extra"

type Atividade =
  | "atendimento"
  | "coordenacao"
  | "telefoneFixo"
  | "telefoneCelular"
  | "atividadesDiversas"
  | "atividadesExternas"
  | "forum"
  | "advogadoForum"

type ModeloTrabalho = "presencial" | "homeOffice"

type EscalaOperacional = Record<
  DiaSemana,
  Record<Turno, Partial<Record<Atividade, string[]>>>
>

type EscalaPresencial = Record<
  DiaSemana,
  Record<ModeloTrabalho, string[]>
>

type Ocorrencia = {
  id: number
  tipo: TipoOcorrencia
  dia: DiaSemana
  turno: Turno
  atividade: Atividade
  profissionalSaindo: string
  profissionalEntrando: string
  motivo: string
}

const dias: { id: DiaSemana; nome: string }[] = [
  { id: "segunda", nome: "Segunda" },
  { id: "terca", nome: "Terça" },
  { id: "quarta", nome: "Quarta" },
  { id: "quinta", nome: "Quinta" },
  { id: "sexta", nome: "Sexta" }
]

const turnos: { id: Turno; nome: string }[] = [
  { id: "manha", nome: "Manhã" },
  { id: "tarde", nome: "Tarde" }
]

const atividadesManha: { id: Atividade; nome: string }[] = [
  { id: "atendimento", nome: "Atendimento" },
  { id: "telefoneFixo", nome: "Atendimento ligação telefone fixo" },
  { id: "telefoneCelular", nome: "Atendimento telefone celular / WhatsApp" },
  { id: "atividadesDiversas", nome: "Atividades diversas / petições" },
  { id: "forum", nome: "Fórum" },
  { id: "advogadoForum", nome: "Advogado fórum" }
]

const atividadesTarde: { id: Atividade; nome: string }[] = [
  { id: "atendimento", nome: "Atendimento" },
  { id: "coordenacao", nome: "Atendimento coordenação" },
  { id: "telefoneFixo", nome: "Atendimento ligação telefone fixo" },
  { id: "telefoneCelular", nome: "Atendimento telefone celular / WhatsApp" },
  { id: "atividadesDiversas", nome: "Atividades diversas / petições" },
  { id: "atividadesExternas", nome: "Atividades externas" }
]

const escalaVazia: EscalaOperacional = {
  segunda: {
    manha: {},
    tarde: {}
  },
  terca: {
    manha: {},
    tarde: {}
  },
  quarta: {
    manha: {},
    tarde: {}
  },
  quinta: {
    manha: {},
    tarde: {}
  },
  sexta: {
    manha: {},
    tarde: {}
  }
}

const presencialVazio: EscalaPresencial = {
  segunda: {
    presencial: [],
    homeOffice: []
  },
  terca: {
    presencial: [],
    homeOffice: []
  },
  quarta: {
    presencial: [],
    homeOffice: []
  },
  quinta: {
    presencial: [],
    homeOffice: []
  },
  sexta: {
    presencial: [],
    homeOffice: []
  }
}

export default function EscalaAtendimentosPage() {
  const { usuarioSistema } = useUsuario()

  const podeEditarEscala =
    usuarioSistema?.perfil === "Administrador" ||
    usuarioSistema?.perfil === "Recepção"

  const [aba, setAba] = useState<Aba>("semana")
  const [profissionais, setProfissionais] = useState<string[]>([])
  const [semana, setSemana] = useState("01/06/2026 a 05/06/2026")
  const [escalaSemana, setEscalaSemana] = useState<EscalaOperacional>(escalaVazia)
  const [escalaPresencial, setEscalaPresencial] =
    useState<EscalaPresencial>(presencialVazio)

  const [editandoSemana, setEditandoSemana] = useState(false)
  const [editandoPresencial, setEditandoPresencial] = useState(false)

  const [modalCelulaAberto, setModalCelulaAberto] = useState(false)
  const [modalPresencialAberto, setModalPresencialAberto] = useState(false)

  const [diaSelecionado, setDiaSelecionado] = useState<DiaSemana>("segunda")
  const [turnoSelecionado, setTurnoSelecionado] = useState<Turno>("manha")
  const [atividadeSelecionada, setAtividadeSelecionada] =
    useState<Atividade>("atendimento")
  const [modeloSelecionado, setModeloSelecionado] =
    useState<ModeloTrabalho>("presencial")
  const [profissionalSelecionado, setProfissionalSelecionado] = useState("")

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [tipoOcorrencia, setTipoOcorrencia] =
    useState<TipoOcorrencia>("Substituição")
  const [diaOcorrencia, setDiaOcorrencia] = useState<DiaSemana>("segunda")
  const [turnoOcorrencia, setTurnoOcorrencia] = useState<Turno>("manha")
  const [atividadeOcorrencia, setAtividadeOcorrencia] =
    useState<Atividade>("atendimento")
  const [profissionalSaindo, setProfissionalSaindo] = useState("")
  const [profissionalEntrando, setProfissionalEntrando] = useState("")
  const [motivo, setMotivo] = useState("")
  const [aplicarSemanaToda, setAplicarSemanaToda] = useState(false)

  const emailOrigem = "arquivo.aduseps1996@gmail.com"

  const [modalEmailAberto, setModalEmailAberto] = useState(false)
  const [enviandoEmail, setEnviandoEmail] = useState(false)

  const [assuntoEmail, setAssuntoEmail] = useState(
    `HORÁRIO JURÍDICO - ${semana.toUpperCase()}`
  )

  const [corpoEmail, setCorpoEmail] = useState(`Observações:

Férias:

Fátima (primeiros 15 dias): 18/05/2026 a 01/06/2026, volta dia 02/06/2026

Eric (30 dias): 01/06/2026 a 30/06/2026

Vivian (últimos 15 dias): 02/06/2026 a 16/06/2026

Horário de prova dos estagiários:

01/06/2026 - segunda - Henrique

05/06/2026 - sexta - Clara


ATENÇÃO:

É MUITO IMPORTANTE TODOS SABERMOS QUE TRABALHAMOS EM EQUIPE E PRECISAMOS AJUDAR UNS AOS OUTROS, então, quando uma função (atendimento presencial/atendimento telefone fixo/atendimento telefone celular ou outras) estiver um pouco mais livre buscar auxiliar nas demais para diminuir a sobrecarga em quem possa estar com acúmulo desnecessário de serviço.

Os horários de chegada, almoço e saída definidos de todos os advogados devem ser seguidos.

Ressalto a importância da pontualidade para que as atividades e a equipe não sejam prejudicadas.

CASO HAJA NECESSIDADE, CATARINA PODERÁ AJUDAR NAS ATIVIDADES DO JURÍDICO.

Os atendimentos por rodízio seguirão a lista de rodízio contida nas planilhas de distribuição.

O advogado do turno da manhã só poderá sair da bancada quando o da tarde chegar, portanto a PONTUALIDADE é essencial.

COM RELAÇÃO AO HORÁRIO DE ALMOÇO AINDA EVITAR SAÍREM AO MESMO TEMPO, OS ADVOGADOS E ASSISTENTES NÃO PODEM SAIR PARA ALMOÇAR AO MESMO TEMPO, DEVEM ATER-SE AO HORÁRIO ESTABELECIDO.

O assistente que estiver no atendimento deve seguir os seguintes horários, 8 às 13 ou 13 às 18 e os horários de almoço devem se amoldar nesses horários, ou seja se atender pela manhã almoçará às 13h e se atender no turno da tarde almoçará às 12h.`)

  const [destinatariosEmail, setDestinatariosEmail] = useState<string[]>([
    ""
  ])


  const [filtroTipoHistorico, setFiltroTipoHistorico] = useState("todos")
  const [filtroDiaHistorico, setFiltroDiaHistorico] = useState("todos")
  const [editandoMotivoId, setEditandoMotivoId] = useState<number | null>(null)
  const [motivoEdicao, setMotivoEdicao] = useState("")

  function manterPosicaoScroll(acao: () => void) {
    const container =
      document.querySelector<HTMLElement>("section.flex-1 > div.flex-1.overflow-auto") ||
      document.querySelector<HTMLElement>(".overflow-auto")

    const posicaoContainer = container?.scrollTop || 0
    const posicaoJanela = window.scrollY

    acao()

    requestAnimationFrame(() => {
      if (container) {
        container.scrollTop = posicaoContainer
      }

      window.scrollTo({
        top: posicaoJanela,
        behavior: "auto"
      })
    })
  }

  useEffect(() => {
    const consulta = query(
      collection(db, "profissionais"),
      orderBy("nome", "asc")
    )

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs
        .map((documento) => documento.data())
        .filter((profissional) => profissional.ativo !== false)
        .map((profissional) => String(profissional.nome || ""))
        .filter((nome) => nome.trim() !== "")

      setProfissionais(lista)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    async function carregarEscalaSalva() {
      const referencia = doc(db, "escalas_semanais", "semana_atual")
      const documento = await getDoc(referencia)

      if (!documento.exists()) return

      const dados = documento.data()

      if (dados.semana) {
        setSemana(dados.semana)
      }

      if (dados.escalaSemana) {
        setEscalaSemana(dados.escalaSemana as EscalaOperacional)
      }

      if (dados.escalaPresencial) {
        setEscalaPresencial(dados.escalaPresencial as EscalaPresencial)
      }

      if (dados.ocorrencias) {
        setOcorrencias(dados.ocorrencias as Ocorrencia[])
      }
    }

    carregarEscalaSalva()
  }, [])

  useEffect(() => {
    async function carregarConfiguracaoEmail() {
      const referencia = doc(db, "configuracoes_email", "escala_juridica")
      const documento = await getDoc(referencia)

      if (!documento.exists()) return

      const dados = documento.data()

      if (Array.isArray(dados.destinatarios)) {
        setDestinatariosEmail(dados.destinatarios)
      }
    }

    carregarConfiguracaoEmail()
  }, [])

  function atividadesPorTurno(turno: Turno) {
    return turno === "manha" ? atividadesManha : atividadesTarde
  }

  function nomeDia(dia: DiaSemana) {
    return dias.find((item) => item.id === dia)?.nome || dia
  }

  function nomeTurno(turno: Turno) {
    return turnos.find((item) => item.id === turno)?.nome || turno
  }

  function nomeAtividade(atividade: Atividade) {
    return [...atividadesManha, ...atividadesTarde].find(
      (item) => item.id === atividade
    )?.nome || atividade
  }

  function atualizarAssuntoEmailPelaSemana() {
    setAssuntoEmail(`HORÁRIO JURÍDICO - ${semana.toUpperCase()}`)
  }

  function adicionarDestinatarioEmail() {
    setDestinatariosEmail((atual) => [...atual, ""])
  }

  function editarDestinatarioEmail(index: number, valor: string) {
    setDestinatariosEmail((atual) =>
      atual.map((email, posicao) => (posicao === index ? valor : email))
    )
  }

  function removerDestinatarioEmail(index: number) {
    setDestinatariosEmail((atual) =>
      atual.filter((_, posicao) => posicao !== index)
    )
  }

  function textoParaHtml(texto: string) {
    return texto
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br />")
  }

  function gerarTabelaOperacionalEmail(titulo: string, turno: Turno) {
    const atividades = atividadesPorTurno(turno)

    const linhas = atividades
      .map((atividade) => {
        const colunasDias = dias
          .map((dia) => {
            const lista = escalaSemana[dia.id][turno][atividade.id] || []
            const nomes = lista.length > 0 ? lista.join("<br />") : "—"

            return `
            <td style="border:1px solid #d4d4d8;padding:10px;text-align:center;vertical-align:top;">
              ${nomes}
            </td>
          `
          })
          .join("")

        return `
        <tr>
          <td style="border:1px solid #d4d4d8;padding:10px;font-weight:bold;background:#f4f4f5;">
            ${atividade.nome}
          </td>
          ${colunasDias}
        </tr>
      `
      })
      .join("")

    return `
    <h2 style="margin:28px 0 10px;font-size:18px;color:#18181b;text-transform:uppercase;">
      ${titulo}
    </h2>

    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
      <thead>
        <tr style="background:#2563eb;color:#ffffff;">
          <th style="border:1px solid #1d4ed8;padding:10px;text-align:left;">Atividade</th>
          ${dias
        .map(
          (dia) =>
            `<th style="border:1px solid #1d4ed8;padding:10px;text-align:center;">${dia.nome}</th>`
        )
        .join("")}
        </tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `
  }

  function gerarTabelaPresencialEmail(
    titulo: string,
    modelo: ModeloTrabalho
  ) {
    return `
    <h2 style="margin:28px 0 10px;font-size:18px;color:#18181b;text-transform:uppercase;">
      ${titulo}
    </h2>

    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
      <thead>
        <tr style="background:#2563eb;color:#ffffff;">
          ${dias
        .map(
          (dia) =>
            `<th style="border:1px solid #1d4ed8;padding:10px;text-align:center;">${dia.nome}</th>`
        )
        .join("")}
        </tr>
      </thead>

      <tbody>
        <tr>
          ${dias
        .map((dia) => {
          const lista = escalaPresencial[dia.id][modelo]
          const nomes = lista.length > 0 ? lista.join("<br />") : "—"

          return `
                <td style="border:1px solid #d4d4d8;padding:12px;text-align:center;vertical-align:top;">
                  ${nomes}
                </td>
              `
        })
        .join("")}
        </tr>
      </tbody>
    </table>
  `
  }

  function gerarCorpoHtmlEmail() {
    return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;padding:24px;color:#18181b;">
      <div style="max-width:1100px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;">
        <div style="background:#1d4ed8;color:#ffffff;padding:22px 26px;">
          <h1 style="margin:0;font-size:22px;text-transform:uppercase;">
            ${assuntoEmail}
          </h1>
          <p style="margin:8px 0 0;font-size:13px;">
            Remetente: ${emailOrigem}
          </p>
        </div>

        <div style="padding:26px;">
          <div style="font-size:14px;line-height:1.6;margin-bottom:24px;">
            ${textoParaHtml(corpoEmail)}
          </div>

          ${gerarTabelaOperacionalEmail("Horário manhã", "manha")}
          ${gerarTabelaOperacionalEmail("Horário tarde", "tarde")}
          ${gerarTabelaPresencialEmail("Escala dos dias presenciais", "presencial")}
          ${gerarTabelaPresencialEmail("Escala do home office", "homeOffice")}

          <p style="margin-top:28px;font-size:12px;color:#71717a;">
            E-mail enviado automaticamente pelo sistema de escala operacional da ADUSEPS.
          </p>
        </div>
      </div>
    </div>
  `
  }

  async function enviarTabelasPorEmail() {
    const destinatariosValidos = destinatariosEmail
      .map((email) => email.trim())
      .filter((email) => email !== "")

    if (destinatariosValidos.length === 0) {
      toast.warning("Informe pelo menos um e-mail de destino.")
      return
    }

    if (!assuntoEmail.trim()) {
      toast.warning("Informe o título do e-mail.")
      return
    }

    if (!corpoEmail.trim()) {
      toast.warning("Informe o corpo do e-mail.")
      return
    }

    await salvarDestinatariosEmail(destinatariosValidos)

    try {
      setEnviandoEmail(true)

      const resposta = await fetch("/api/enviar-tabelas-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          assunto: assuntoEmail,
          corpoHtml: gerarCorpoHtmlEmail(),
          destinatarios: destinatariosValidos
        })
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao enviar e-mail.")
      }

      await addDoc(collection(db, "historico_emails"), {
        tipo: "escala_juridica",
        assunto: assuntoEmail,
        destinatarios: destinatariosValidos,
        remetente: emailOrigem,
        semana,
        enviado_por: usuarioSistema?.email || "",
        enviado_em: serverTimestamp()
      })

      toast.success("Tabelas enviadas por e-mail.")
      setModalEmailAberto(false)
    } catch (erro) {
      console.error(erro)
      toast.error("Não foi possível enviar o e-mail.")
    } finally {
      setEnviandoEmail(false)
    }
  }

  async function salvarDestinatariosEmail(destinatarios: string[]) {
    await setDoc(
      doc(db, "configuracoes_email", "escala_juridica"),
      {
        destinatarios,
        atualizado_em: serverTimestamp(),
        atualizado_por: usuarioSistema?.email || ""
      },
      { merge: true }
    )
  }


  function abrirCelula(
    dia: DiaSemana,
    turno: Turno,
    atividade: Atividade
  ) {
    if (!podeEditarEscala) return

    manterPosicaoScroll(() => {
      setDiaSelecionado(dia)
      setTurnoSelecionado(turno)
      setAtividadeSelecionada(atividade)
      setProfissionalSelecionado("")
      setAplicarSemanaToda(false)
      setModalCelulaAberto(true)
    })
  }

  function adicionarProfissionalNaEscala(
    dia: DiaSemana,
    turno: Turno,
    atividade: Atividade,
    profissional: string
  ) {
    if (!profissional) return

    setEscalaSemana((atual) => {
      const listaAtual =
        atual[dia][turno][atividade] || []

      if (listaAtual.includes(profissional)) {
        return atual
      }

      return {
        ...atual,
        [dia]: {
          ...atual[dia],
          [turno]: {
            ...atual[dia][turno],
            [atividade]: [...listaAtual, profissional]
          }
        }
      }
    })
  }

  function adicionarNaEscala() {
    if (!profissionalSelecionado) {
      toast.warning("Selecione um profissional.")
      return
    }

    if (aplicarSemanaToda) {
      dias.forEach((dia) => {
        adicionarProfissionalNaEscala(
          dia.id,
          turnoSelecionado,
          atividadeSelecionada,
          profissionalSelecionado
        )
      })
    } else {
      adicionarProfissionalNaEscala(
        diaSelecionado,
        turnoSelecionado,
        atividadeSelecionada,
        profissionalSelecionado
      )
    }

    setAplicarSemanaToda(false)
    setModalCelulaAberto(false)
    toast.success("Profissional adicionado.")
  }

  function removerDaEscala(
    dia: DiaSemana,
    turno: Turno,
    atividade: Atividade,
    profissional: string
  ) {
    if (!podeEditarEscala) return

    setEscalaSemana((atual) => {
      const listaAtual = atual[dia][turno][atividade] || []

      return {
        ...atual,
        [dia]: {
          ...atual[dia],
          [turno]: {
            ...atual[dia][turno],
            [atividade]: listaAtual.filter((item) => item !== profissional)
          }
        }
      }
    })
  }

  function abrirModalPresencial(dia: DiaSemana, modelo: ModeloTrabalho) {
    if (!podeEditarEscala) return

    manterPosicaoScroll(() => {
      setDiaSelecionado(dia)
      setModeloSelecionado(modelo)
      setProfissionalSelecionado("")
      setModalPresencialAberto(true)
    })
  }

  function adicionarPresencial() {
    if (!profissionalSelecionado) {
      toast.warning("Selecione um profissional.")
      return
    }

    setEscalaPresencial((atual) => {
      const listaAtual = atual[diaSelecionado][modeloSelecionado]

      if (listaAtual.includes(profissionalSelecionado)) return atual

      return {
        ...atual,
        [diaSelecionado]: {
          ...atual[diaSelecionado],
          [modeloSelecionado]: [...listaAtual, profissionalSelecionado]
        }
      }
    })

    setModalPresencialAberto(false)
    toast.success("Profissional adicionado.")
  }

  function removerPresencial(
    dia: DiaSemana,
    modelo: ModeloTrabalho,
    profissional: string
  ) {
    if (!podeEditarEscala) return

    setEscalaPresencial((atual) => ({
      ...atual,
      [dia]: {
        ...atual[dia],
        [modelo]: atual[dia][modelo].filter((item) => item !== profissional)
      }
    }))
  }

  function registrarOcorrencia() {
    if (!podeEditarEscala) return

    if (tipoOcorrencia !== "Apoio extra" && !profissionalSaindo) {
      toast.warning("Informe o profissional relacionado.")
      return
    }

    if (
      (tipoOcorrencia === "Substituição" ||
        tipoOcorrencia === "Apoio extra") &&
      !profissionalEntrando
    ) {
      toast.warning("Informe o profissional entrando.")
      return
    }

    if (!motivo.trim()) {
      toast.warning("Informe o motivo.")
      return
    }

    setEscalaSemana((atual) => {
      let listaAtual = [
        ...(atual[diaOcorrencia][turnoOcorrencia][atividadeOcorrencia] || [])
      ]

      if (
        tipoOcorrencia === "Substituição" ||
        tipoOcorrencia === "Ausência" ||
        tipoOcorrencia === "Férias"
      ) {
        listaAtual = listaAtual.filter(
          (item) => item !== profissionalSaindo
        )
      }

      if (
        profissionalEntrando &&
        !listaAtual.includes(profissionalEntrando)
      ) {
        listaAtual.push(profissionalEntrando)
      }

      return {
        ...atual,
        [diaOcorrencia]: {
          ...atual[diaOcorrencia],
          [turnoOcorrencia]: {
            ...atual[diaOcorrencia][turnoOcorrencia],
            [atividadeOcorrencia]: listaAtual
          }
        }
      }
    })

    setOcorrencias((atual) => [
      {
        id: Date.now(),
        tipo: tipoOcorrencia,
        dia: diaOcorrencia,
        turno: turnoOcorrencia,
        atividade: atividadeOcorrencia,
        profissionalSaindo:
          tipoOcorrencia === "Apoio extra" ? "-" : profissionalSaindo,
        profissionalEntrando: profissionalEntrando || "-",
        motivo: motivo.trim()
      },
      ...atual
    ])

    setProfissionalSaindo("")
    setProfissionalEntrando("")
    setMotivo("")

    toast.success("Ocorrência registrada.")
  }

  async function salvarEscala() {
    if (!podeEditarEscala) {
      toast.warning("Você não tem permissão para alterar a escala.")
      return
    }

    try {
      const referencia = doc(db, "escalas_semanais", "semana_atual")

      await setDoc(
        referencia,
        {
          semana,
          escalaSemana,
          escalaPresencial,
          ocorrencias,
          atualizado_em: serverTimestamp(),
          atualizado_por: usuarioSistema?.email || ""
        },
        { merge: true }
      )

      manterPosicaoScroll(() => {
        setEditandoSemana(false)
        setEditandoPresencial(false)
      })

      toast.success("Escala salva no banco.")
    } catch (erro) {
      console.error(erro)
      toast.error("Não foi possível salvar a escala.")
    }
  }

  function TabelaOperacional({
    titulo,
    turno,
    editando
  }: {
    titulo: string
    turno: Turno
    editando: boolean
  }) {
    const atividades = atividadesPorTurno(turno)

    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="border-b border-zinc-200 bg-zinc-100 px-5 py-3 text-center dark:border-zinc-800 dark:bg-zinc-800">
          <h2 className="text-base font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
            {titulo}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                <th className="bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 uppercase">
                  Atividade
                </th>

                {dias.map((dia) => (
                  <th
                    key={dia.id}
                    className="border border-zinc-300 px-4 py-3 text-center font-bold uppercase dark:border-zinc-700"
                  >
                    {dia.nome}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {atividades.map((atividade, index) => (
                <tr
                  key={atividade.id}
                  className={
                    index % 2 === 0
                      ? "bg-white dark:bg-zinc-900"
                      : "bg-blue-50 dark:bg-zinc-950"
                  }
                >
                  <td className="border border-zinc-300 bg-zinc-100 px-4 py-3 align-middle text-sm font-bold uppercase text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                    {atividade.nome}
                  </td>

                  {dias.map((dia) => {
                    const lista =
                      escalaSemana[dia.id][turno][atividade.id] || []

                    return (
                      <td
                        key={dia.id}
                        className="border border-zinc-300 px-3 py-3 align-top dark:border-zinc-700"
                      >
                        <div className="flex min-h-[54px] flex-col items-center justify-center gap-1">
                          {lista.length === 0 ? (
                            <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                          ) : (
                            lista.map((profissional) => (
                              <span
                                key={profissional}
                                className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-800 dark:text-blue-300"
                              >
                                {profissional}

                                {editando && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      manterPosicaoScroll(() =>
                                        removerDaEscala(
                                          dia.id,
                                          turno,
                                          atividade.id,
                                          profissional
                                        )
                                      )
                                    }
                                    className="text-blue-500 hover:text-rose-600"
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            ))
                          )}

                          {editando && (
                            <button
                              type="button"
                              onClick={() =>
                                abrirCelula(dia.id, turno, atividade.id)
                              }
                              className="mt-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-white"
                            >
                              Adicionar
                            </button>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function TabelaPresencialHomeOffice() {
    return (
      <div className="space-y-5">
        {[
          { id: "presencial" as ModeloTrabalho, nome: "Escala dos dias presenciais" },
          { id: "homeOffice" as ModeloTrabalho, nome: "Escala do home office" }
        ].map((modelo) => (
          <div
            key={modelo.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
          >
            <div className="border-b border-zinc-200 bg-zinc-100 px-5 py-3 text-center dark:border-zinc-800 dark:bg-zinc-800">
              <h2 className="text-base font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
                {modelo.nome}
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                    {dias.map((dia) => (
                      <th
                        key={dia.id}
                        className="border border-zinc-300 px-4 py-3 text-center font-bold uppercase dark:border-zinc-700"
                      >
                        {dia.nome}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    {dias.map((dia) => {
                      const lista = escalaPresencial[dia.id][modelo.id]

                      return (
                        <td
                          key={dia.id}
                          className="border border-zinc-300 px-3 py-4 align-top dark:border-zinc-700"
                        >
                          <div className="flex min-h-[160px] flex-col items-center gap-2">
                            {lista.length === 0 ? (
                              <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                            ) : (
                              lista.map((profissional) => (
                                <span
                                  key={profissional}
                                  className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-800 dark:text-blue-300"
                                >
                                  {profissional}

                                  {editandoPresencial && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        manterPosicaoScroll(() =>
                                          removerPresencial(
                                            dia.id,
                                            modelo.id,
                                            profissional
                                          )
                                        )
                                      }
                                      className="text-blue-500 hover:text-rose-600"
                                    >
                                      ×
                                    </button>
                                  )}
                                </span>
                              ))
                            )}

                            {editandoPresencial && (
                              <button
                                type="button"
                                onClick={() =>
                                  abrirModalPresencial(dia.id, modelo.id)
                                }
                                className="mt-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-white"
                              >
                                Adicionar
                              </button>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const ocorrenciasFiltradas = ocorrencias.filter((item) => {
    if (
      filtroTipoHistorico !== "todos" &&
      item.tipo !== filtroTipoHistorico
    ) {
      return false
    }

    if (
      filtroDiaHistorico !== "todos" &&
      item.dia !== filtroDiaHistorico
    ) {
      return false
    }

    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Escala operacional semanal
        </h1>

        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Controle de atendimento, telefone, fórum, atividades internas,
          externas, presencial e home office.
        </p>
      </div>

      {!podeEditarEscala && (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          Modo consulta. Apenas administradores podem alterar a escala.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { id: "semana", nome: "Semana atual" },
          { id: "presencial", nome: "Presencial / Home Office" },
          { id: "ocorrencias", nome: "Ocorrências" }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() =>
              manterPosicaoScroll(() => setAba(item.id as Aba))
            }
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${aba === item.id
              ? "border-blue-500 bg-blue-600 text-white"
              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-white"
              }`}
          >
            {item.nome}
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            atualizarAssuntoEmailPelaSemana()
            setModalEmailAberto(true)
          }}
          className="rounded-lg border border-emerald-500/40 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Enviar tabelas por e-mail
        </button>
      </div>

      {aba === "semana" && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Semana
                </label>

                <input
                  type="text"
                  value={semana}
                  disabled={!podeEditarEscala}
                  onChange={(e) => setSemana(e.target.value)}
                  className="
                    h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none
                    disabled:bg-zinc-100 disabled:text-zinc-700  disabled:opacity-100
                    dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-300
                    dark:disabled:opacity-100 lg:w-80"
                />
              </div>

              {podeEditarEscala && (
                <div className="flex flex-wrap gap-2">
                  {!editandoSemana ? (
                    <button
                      onClick={() =>
                        manterPosicaoScroll(() => setEditandoSemana(true))
                      }
                      className="h-10 rounded-lg border border-blue-500/40 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 dark:hover:bg-blue-500"
                    >
                      Editar semana
                    </button>
                  ) : (
                    <button
                      onClick={salvarEscala}
                      className="h-10 rounded-lg border border-emerald-500/40 bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 dark:hover:bg-emerald-500"
                    >
                      Salvar semana
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          <TabelaOperacional
            titulo="Horário manhã"
            turno="manha"
            editando={podeEditarEscala && editandoSemana}
          />

          <TabelaOperacional
            titulo="Horário tarde"
            turno="tarde"
            editando={podeEditarEscala && editandoSemana}
          />
        </div>
      )}

      {aba === "presencial" && (
        <div className="space-y-4">
          {podeEditarEscala && (
            <div className="flex justify-end">
              {!editandoPresencial ? (
                <button
                  onClick={() =>
                    manterPosicaoScroll(() => setEditandoPresencial(true))
                  }
                  className="h-10 rounded-lg border border-blue-500/40 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 dark:hover:bg-blue-500"
                >
                  Editar presencial / home office
                </button>
              ) : (
                <button
                  onClick={salvarEscala}
                  className="h-10 rounded-lg border border-emerald-500/40 bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 dark:hover:bg-emerald-500"
                >
                  Salvar
                </button>
              )}
            </div>
          )}

          <TabelaPresencialHomeOffice />
        </div>
      )}

      {aba === "ocorrencias" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
          {podeEditarEscala && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Nova ocorrência
              </h2>

              <div className="mt-4 space-y-3">
                <select
                  value={tipoOcorrencia}
                  onChange={(e) =>
                    setTipoOcorrencia(e.target.value as TipoOcorrencia)
                  }
                  className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option>Substituição</option>
                  <option>Ausência</option>
                  <option>Férias</option>
                  <option>Apoio extra</option>
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={diaOcorrencia}
                    onChange={(e) =>
                      setDiaOcorrencia(e.target.value as DiaSemana)
                    }
                    className="h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    {dias.map((dia) => (
                      <option key={dia.id} value={dia.id}>
                        {dia.nome}
                      </option>
                    ))}
                  </select>

                  <select
                    value={turnoOcorrencia}
                    onChange={(e) =>
                      setTurnoOcorrencia(e.target.value as Turno)
                    }
                    className="h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    {turnos.map((turno) => (
                      <option key={turno.id} value={turno.id}>
                        {turno.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  value={atividadeOcorrencia}
                  onChange={(e) =>
                    setAtividadeOcorrencia(e.target.value as Atividade)
                  }
                  className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  {atividadesPorTurno(turnoOcorrencia).map((atividade) => (
                    <option key={atividade.id} value={atividade.id}>
                      {atividade.nome}
                    </option>
                  ))}
                </select>

                {tipoOcorrencia !== "Apoio extra" && (
                  <select
                    value={profissionalSaindo}
                    onChange={(e) => setProfissionalSaindo(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="">Profissional relacionado</option>

                    {profissionais.map((profissional) => (
                      <option key={profissional} value={profissional}>
                        {profissional}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={profissionalEntrando}
                  onChange={(e) => setProfissionalEntrando(e.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="">
                    {tipoOcorrencia === "Apoio extra"
                      ? "Profissional de apoio"
                      : "Substituto / profissional entrando"}
                  </option>

                  {profissionais.map((profissional) => (
                    <option key={profissional} value={profissional}>
                      {profissional}
                    </option>
                  ))}
                </select>

                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Motivo da ocorrência"
                  className="min-h-[110px] w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />

                <button
                  onClick={registrarOcorrencia}
                  className="h-10 w-full rounded-lg border border-blue-500/40 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 dark:hover:bg-blue-500"
                >
                  Registrar ocorrência
                </button>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Histórico de ocorrências
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
              <select
                value={filtroTipoHistorico}
                onChange={(e) => setFiltroTipoHistorico(e.target.value)}
                className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="todos">Todos os tipos</option>
                <option value="Substituição">Substituição</option>
                <option value="Ausência">Ausência</option>
                <option value="Férias">Férias</option>
                <option value="Apoio extra">Apoio extra</option>
              </select>

              <select
                value={filtroDiaHistorico}
                onChange={(e) => setFiltroDiaHistorico(e.target.value)}
                className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="todos">Todos os dias</option>

                {dias.map((dia) => (
                  <option key={dia.id} value={dia.id}>
                    {dia.nome}
                  </option>
                ))}
              </select>
            </div>

            {ocorrenciasFiltradas.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                Nenhuma ocorrência registrada.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {ocorrenciasFiltradas.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50"
                  >
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.tipo} — {nomeDia(item.dia)} / {nomeTurno(item.turno)}
                    </p>

                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      Atividade: {nomeAtividade(item.atividade)}
                    </p>

                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Sai/relacionado: {item.profissionalSaindo}
                    </p>

                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Entra/apoio: {item.profissionalEntrando}
                    </p>

                    {editandoMotivoId === item.id ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={motivoEdicao}
                          onChange={(e) => setMotivoEdicao(e.target.value)}
                          className="min-h-20 w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              manterPosicaoScroll(() => {
                                setEditandoMotivoId(null)
                                setMotivoEdicao("")
                              })
                            }
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-white"
                          >
                            Cancelar
                          </button>

                          <button
                            onClick={() => {
                              if (motivoEdicao.trim() === "") {
                                toast.warning("Informe o motivo.")
                                return
                              }

                              manterPosicaoScroll(() => {
                                setOcorrencias((atual) =>
                                  atual.map((ocorrencia) =>
                                    ocorrencia.id === item.id
                                      ? { ...ocorrencia, motivo: motivoEdicao.trim() }
                                      : ocorrencia
                                  )
                                )

                                setEditandoMotivoId(null)
                                setMotivoEdicao("")
                              })

                              toast.success("Motivo atualizado.")
                            }}
                            className="rounded-lg border border-blue-500/40 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500 dark:hover:bg-blue-500"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-start justify-between gap-3">
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                          Motivo: {item.motivo}
                        </p>

                        {podeEditarEscala && (
                          <button
                            onClick={() =>
                              manterPosicaoScroll(() => {
                                setEditandoMotivoId(item.id)
                                setMotivoEdicao(item.motivo)
                              })
                            }
                            className="text-xs font-semibold text-blue-600 transition hover:text-blue-700 hover:underline dark:text-blue-300 dark:hover:text-blue-200"
                          >
                            Editar motivo
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {modalCelulaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Adicionar profissional
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {nomeDia(diaSelecionado)} — {nomeTurno(turnoSelecionado)}
            </p>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {nomeAtividade(atividadeSelecionada)}
            </p>

            <select
              value={profissionalSelecionado}
              onChange={(e) => setProfissionalSelecionado(e.target.value)}
              className="mt-4 h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="">Selecione</option>

              {profissionais.map((profissional) => (
                <option key={profissional} value={profissional}>
                  {profissional}
                </option>
              ))}
            </select>

            <label className="mt-4 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={aplicarSemanaToda}
                onChange={(e) =>
                  setAplicarSemanaToda(e.target.checked)
                }
              />

              Aplicar em toda semana nesta atividade
            </label>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() =>
                  manterPosicaoScroll(() => setModalCelulaAberto(false))
                }
                className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-white"
              >
                Voltar
              </button>

              <button
                onClick={() => manterPosicaoScroll(adicionarNaEscala)}
                className="h-10 rounded-lg border border-blue-500/40 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 dark:hover:bg-blue-500"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalPresencialAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Adicionar profissional
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {nomeDia(diaSelecionado)} —{" "}
              {modeloSelecionado === "presencial" ? "Presencial" : "Home Office"}
            </p>

            <select
              value={profissionalSelecionado}
              onChange={(e) => setProfissionalSelecionado(e.target.value)}
              className="mt-4 h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="">Selecione</option>

              {profissionais.map((profissional) => (
                <option key={profissional} value={profissional}>
                  {profissional}
                </option>
              ))}
            </select>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() =>
                  manterPosicaoScroll(() => setModalPresencialAberto(false))
                }
                className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-white"
              >
                Voltar
              </button>

              <button
                onClick={() => manterPosicaoScroll(adicionarPresencial)}
                className="h-10 rounded-lg border border-blue-500/40 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 dark:hover:bg-blue-500"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de envio de e-mail */}
      {modalEmailAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-1 border-b border-zinc-200 pb-4 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Enviar tabelas por e-mail
              </h2>

              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Origem: <strong>{emailOrigem}</strong>
              </p>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Título do e-mail
                </label>

                <input
                  type="text"
                  value={assuntoEmail}
                  onChange={(e) => setAssuntoEmail(e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    E-mails de destino
                  </label>

                  <button
                    type="button"
                    onClick={adicionarDestinatarioEmail}
                    className="rounded-lg border border-blue-500/40 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
                  >
                    Adicionar e-mail
                  </button>
                </div>

                <div className="space-y-2">
                  {destinatariosEmail.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) =>
                          editarDestinatarioEmail(index, e.target.value)
                        }
                        placeholder="email@exemplo.com"
                        className="h-10 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />

                      <button
                        type="button"
                        onClick={() => removerDestinatarioEmail(index)}
                        className="rounded-lg border border-rose-500/40 bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-500"
                      >
                        Excluir
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Corpo do e-mail
                </label>

                <textarea
                  value={corpoEmail}
                  onChange={(e) => setCorpoEmail(e.target.value)}
                  className="mt-2 min-h-[360px] w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm leading-6 text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
                As tabelas de horário manhã, horário tarde, presencial e home office serão incluídas automaticamente no corpo do e-mail.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setModalEmailAberto(false)}
                disabled={enviandoEmail}
                className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-white"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={enviarTabelasPorEmail}
                disabled={enviandoEmail}
                className="h-10 rounded-lg border border-emerald-500/40 bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {enviandoEmail ? "Enviando..." : "Enviar e-mail"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}