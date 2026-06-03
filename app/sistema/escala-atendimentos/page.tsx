"use client"

import { useState } from "react"
import { toast } from "sonner"

type Turno = "manha" | "tarde"

type DiaSemana =
  | "segunda"
  | "terca"
  | "quarta"
  | "quinta"
  | "sexta"

type Escala = Record<DiaSemana, Record<Turno, string[]>>

type Troca = {
  id: number
  dia: DiaSemana
  turno: Turno
  original: string
  substituto: string
  motivo: string
}

const dias: { id: DiaSemana; nome: string }[] = [
  { id: "segunda", nome: "Segunda" },
  { id: "terca", nome: "Terça" },
  { id: "quarta", nome: "Quarta" },
  { id: "quinta", nome: "Quinta" },
  { id: "sexta", nome: "Sexta" }
]

const turnos: { id: Turno; nome: string; horario: string }[] = [
  { id: "manha", nome: "Manhã", horario: "08h às 13h" },
  { id: "tarde", nome: "Tarde", horario: "13h às 18h" }
]

const profissionais = [
  "Artur",
  "Thiago",
  "Monica Luisa",
  "Henrique",
  "Aline",
  "Eduarda",
  "Fátima",
  "Leonardo Santos",
  "Paulo Ricardo",
  "Inácio",
  "Morgana",
  "Alexa",
  "Débora",
  "Financeiro",
  "Coordenação"
]

const escalaPadraoInicial: Escala = {
  segunda: {
    manha: ["Artur"],
    tarde: ["Eduarda"]
  },
  terca: {
    manha: ["Thiago"],
    tarde: ["Fátima"]
  },
  quarta: {
    manha: ["Monica Luisa"],
    tarde: ["Leonardo Santos"]
  },
  quinta: {
    manha: ["Henrique"],
    tarde: ["Paulo Ricardo"]
  },
  sexta: {
    manha: ["Aline"],
    tarde: ["Inácio"]
  }
}

function copiarEscala(escala: Escala): Escala {
  return {
    segunda: {
      manha: [...escala.segunda.manha],
      tarde: [...escala.segunda.tarde]
    },
    terca: {
      manha: [...escala.terca.manha],
      tarde: [...escala.terca.tarde]
    },
    quarta: {
      manha: [...escala.quarta.manha],
      tarde: [...escala.quarta.tarde]
    },
    quinta: {
      manha: [...escala.quinta.manha],
      tarde: [...escala.quinta.tarde]
    },
    sexta: {
      manha: [...escala.sexta.manha],
      tarde: [...escala.sexta.tarde]
    }
  }
}

export default function EscalaAtendimentosPage() {
  const [semana, setSemana] = useState("")
  const [modoEdicaoPadrao, setModoEdicaoPadrao] = useState(false)
  const [modoEdicaoSemana, setModoEdicaoSemana] = useState(false)

  const [escalaPadrao, setEscalaPadrao] =
    useState<Escala>(escalaPadraoInicial)

  const [escalaSemana, setEscalaSemana] =
    useState<Escala>(() => copiarEscala(escalaPadraoInicial))

  const [trocas, setTrocas] = useState<Troca[]>([])

  const [modalTrocaAberto, setModalTrocaAberto] = useState(false)
  const [diaTroca, setDiaTroca] = useState<DiaSemana>("segunda")
  const [turnoTroca, setTurnoTroca] = useState<Turno>("manha")
  const [originalTroca, setOriginalTroca] = useState("")
  const [substitutoTroca, setSubstitutoTroca] = useState("")
  const [motivoTroca, setMotivoTroca] = useState("")

  function nomeDia(dia: DiaSemana) {
    return dias.find((item) => item.id === dia)?.nome || dia
  }

  function nomeTurno(turno: Turno) {
    return turnos.find((item) => item.id === turno)?.nome || turno
  }

  function adicionarProfissional(
    tipoEscala: "padrao" | "semana",
    dia: DiaSemana,
    turno: Turno,
    profissional: string
  ) {
    if (!profissional) return

    const atualizar =
      tipoEscala === "padrao" ? setEscalaPadrao : setEscalaSemana

    atualizar((estadoAtual) => {
      const listaAtual = estadoAtual[dia][turno]

      if (listaAtual.includes(profissional)) {
        return estadoAtual
      }

      return {
        ...estadoAtual,
        [dia]: {
          ...estadoAtual[dia],
          [turno]: [...listaAtual, profissional]
        }
      }
    })
  }

  function removerProfissional(
    tipoEscala: "padrao" | "semana",
    dia: DiaSemana,
    turno: Turno,
    profissional: string
  ) {
    const atualizar =
      tipoEscala === "padrao" ? setEscalaPadrao : setEscalaSemana

    atualizar((estadoAtual) => ({
      ...estadoAtual,
      [dia]: {
        ...estadoAtual[dia],
        [turno]: estadoAtual[dia][turno].filter(
          (item) => item !== profissional
        )
      }
    }))
  }

  function aplicarPadraoNaSemana() {
    setEscalaSemana(copiarEscala(escalaPadrao))
    setTrocas([])
    toast.success("Escala da semana preenchida com base no padrão.")
  }

  function salvarPadrao() {
    setModoEdicaoPadrao(false)
    toast.success("Protótipo: escala padrão salva.")
  }

  function salvarSemana() {
    setModoEdicaoSemana(false)
    toast.success("Protótipo: escala da semana salva.")
  }

  function salvarEnviarEmail() {
    toast.success("Protótipo: escala salva e envio por e-mail simulado.")
    console.log({
      semana,
      escalaPadrao,
      escalaSemana,
      trocas
    })
  }

  function abrirModalTroca(dia: DiaSemana, turno: Turno) {
    setDiaTroca(dia)
    setTurnoTroca(turno)
    setOriginalTroca("")
    setSubstitutoTroca("")
    setMotivoTroca("")
    setModalTrocaAberto(true)
  }

  function registrarTroca() {
    if (!originalTroca) {
      toast.warning("Selecione quem será substituído.")
      return
    }

    if (motivoTroca.trim() === "") {
      toast.warning("Informe o motivo da troca.")
      return
    }

    setEscalaSemana((estadoAtual) => {
      const listaAtual = estadoAtual[diaTroca][turnoTroca]

      let novaLista = listaAtual.filter(
        (profissional) => profissional !== originalTroca
      )

      if (substitutoTroca && !novaLista.includes(substitutoTroca)) {
        novaLista = [...novaLista, substitutoTroca]
      }

      return {
        ...estadoAtual,
        [diaTroca]: {
          ...estadoAtual[diaTroca],
          [turnoTroca]: novaLista
        }
      }
    })

    setTrocas((listaAtual) => [
      {
        id: Date.now(),
        dia: diaTroca,
        turno: turnoTroca,
        original: originalTroca,
        substituto: substitutoTroca || "Sem substituto definido",
        motivo: motivoTroca.trim()
      },
      ...listaAtual
    ])

    setModalTrocaAberto(false)
    toast.success("Troca registrada.")
  }

  function CelulaEscala({
    tipoEscala,
    dia,
    turno,
    modoEdicao
  }: {
    tipoEscala: "padrao" | "semana"
    dia: DiaSemana
    turno: Turno
    modoEdicao: boolean
  }) {
    const escalaAtual =
      tipoEscala === "padrao" ? escalaPadrao : escalaSemana

    const lista = escalaAtual[dia][turno]

    const [profissionalSelecionado, setProfissionalSelecionado] =
      useState("")

    const temTroca =
      tipoEscala === "semana" &&
      trocas.some(
        (troca) => troca.dia === dia && troca.turno === turno
      )

    if (!modoEdicao) {
      return (
        <div className="space-y-1">
          {lista.length === 0 ? (
            <p className="text-sm text-zinc-400">Sem atendente</p>
          ) : (
            lista.map((profissional) => (
              <span
                key={profissional}
                className="mr-1 mb-1 inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300"
              >
                {profissional}
              </span>
            ))
          )}

          {temTroca && (
            <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
              Possui troca registrada
            </p>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {lista.length === 0 && (
            <p className="text-xs text-zinc-400">Nenhum selecionado</p>
          )}

          {lista.map((profissional) => (
            <span
              key={profissional}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {profissional}

              <button
                type="button"
                onClick={() =>
                  removerProfissional(
                    tipoEscala,
                    dia,
                    turno,
                    profissional
                  )
                }
                className="text-zinc-400 hover:text-rose-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <select
            value={profissionalSelecionado}
            onChange={(e) =>
              setProfissionalSelecionado(e.target.value)
            }
            className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-2 text-xs text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">Adicionar</option>

            {profissionais.map((profissional) => (
              <option key={profissional} value={profissional}>
                {profissional}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              adicionarProfissional(
                tipoEscala,
                dia,
                turno,
                profissionalSelecionado
              )
              setProfissionalSelecionado("")
            }}
            className="h-9 rounded-lg border border-blue-500/40 bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-500"
          >
            +
          </button>
        </div>

        {tipoEscala === "semana" && (
          <button
            type="button"
            onClick={() => abrirModalTroca(dia, turno)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Registrar troca
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Escala de atendimentos
        </h1>

        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Protótipo funcional da escala padrão e da escala semanal.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Escala padrão
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Base fixa usada para preencher automaticamente a semana.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!modoEdicaoPadrao ? (
              <button
                onClick={() => setModoEdicaoPadrao(true)}
                className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Editar padrão
              </button>
            ) : (
              <button
                onClick={salvarPadrao}
                className="h-10 rounded-lg border border-blue-500/40 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Salvar padrão
              </button>
            )}

            <button
              onClick={aplicarPadraoNaSemana}
              className="h-10 rounded-lg border border-emerald-500/40 bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Preencher semana
            </button>
          </div>
        </div>

        <TabelaEscala
          tipoEscala="padrao"
          modoEdicao={modoEdicaoPadrao}
          CelulaEscala={CelulaEscala}
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Semana
            </label>

            <input
              type="text"
              placeholder="Ex: 10/06 a 14/06"
              value={semana}
              onChange={(e) => setSemana(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 lg:w-72"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {!modoEdicaoSemana ? (
              <button
                onClick={() => setModoEdicaoSemana(true)}
                className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Editar escala
              </button>
            ) : (
              <button
                onClick={salvarSemana}
                className="h-10 rounded-lg border border-blue-500/40 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Salvar escala
              </button>
            )}

            <button
              onClick={salvarEnviarEmail}
              className="h-10 rounded-lg border border-emerald-500/40 bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Salvar e enviar por e-mail
            </button>
          </div>
        </div>

        <TabelaEscala
          tipoEscala="semana"
          modoEdicao={modoEdicaoSemana}
          CelulaEscala={CelulaEscala}
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Histórico de trocas da semana
        </h2>

        {trocas.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            Nenhuma troca registrada.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {trocas.map((troca) => (
              <div
                key={troca.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50"
              >
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {nomeDia(troca.dia)} — {nomeTurno(troca.turno)}
                </p>

                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Original: {troca.original}
                </p>

                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Substituto: {troca.substituto}
                </p>

                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                  Motivo: {troca.motivo}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {modalTrocaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Registrar troca
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {nomeDia(diaTroca)} — {nomeTurno(turnoTroca)}
            </p>

            <div className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Quem será substituído
                </label>

                <select
                  value={originalTroca}
                  onChange={(e) => setOriginalTroca(e.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="">Selecione</option>

                  {escalaSemana[diaTroca][turnoTroca].map(
                    (profissional) => (
                      <option key={profissional} value={profissional}>
                        {profissional}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Substituto opcional
                </label>

                <select
                  value={substitutoTroca}
                  onChange={(e) => setSubstitutoTroca(e.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="">Sem substituto definido</option>

                  {profissionais.map((profissional) => (
                    <option key={profissional} value={profissional}>
                      {profissional}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Motivo da troca
                </label>

                <textarea
                  value={motivoTroca}
                  onChange={(e) => setMotivoTroca(e.target.value)}
                  placeholder="Ex: férias, troca combinada, ausência, ajuste de agenda..."
                  className="min-h-[110px] w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalTrocaAberto(false)}
                className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={registrarTroca}
                className="h-10 rounded-lg border border-blue-500/40 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Registrar troca
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabelaEscala({
  tipoEscala,
  modoEdicao,
  CelulaEscala
}: {
  tipoEscala: "padrao" | "semana"
  modoEdicao: boolean
  CelulaEscala: any
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-950/60">
          <tr>
            <th className="w-44 px-4 py-3 text-left font-semibold">
              Turno
            </th>

            {dias.map((dia) => (
              <th key={dia.id} className="px-4 py-3 text-left font-semibold">
                {dia.nome}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {turnos.map((turno) => (
            <tr key={turno.id}>
              <td className="px-4 py-4 align-top">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {turno.nome}
                </p>

                <p className="mt-0.5 text-xs text-zinc-500">
                  {turno.horario}
                </p>
              </td>

              {dias.map((dia) => (
                <td key={dia.id} className="px-4 py-4 align-top">
                  <CelulaEscala
                    tipoEscala={tipoEscala}
                    dia={dia.id}
                    turno={turno.id}
                    modoEdicao={modoEdicao}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}