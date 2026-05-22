"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

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
import { useUsuario } from "../../context/UsuarioContext"

type Cargo = {
  id?: string
  nome: string
  ativo: boolean
}

type Profissional = {
  id?: string
  nome: string
  cargo_id: string
  ativo: boolean
}

export default function ProfissionaisPage() {
  // =====================================================
  // USUÁRIO LOGADO
  // =====================================================
  const { usuarioSistema } = useUsuario()

  // =====================================================
  // CONTROLE DE PERMISSÃO
  // =====================================================
  const podeGerenciar =
    usuarioSistema?.perfil === "Administrador" ||
    usuarioSistema?.perfil === "Recepção"


  const [nome, setNome] = useState("")
  const [cargoId, setCargoId] = useState("")
  const [pesquisa, setPesquisa] = useState("")

  const [cargos, setCargos] = useState<Cargo[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])

  const [editandoId, setEditandoId] = useState("")
  const [nomeEdicao, setNomeEdicao] = useState("")
  const [cargoIdEdicao, setCargoIdEdicao] = useState("")
  // =====================================================
  // CONTROLE DE PROCESSAMENTO DAS AÇÕES
  // =====================================================
  const [acaoEmAndamento, setAcaoEmAndamento] = useState("")

  useEffect(() => {
    const consultaCargos = query(
      collection(db, "cargos"),
      orderBy("nome", "asc")
    )

    const unsubscribeCargos = onSnapshot(consultaCargos, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Cargo[]

      setCargos(lista)
    })

    return () => unsubscribeCargos()
  }, [])

  useEffect(() => {
    const consultaProfissionais = query(
      collection(db, "profissionais"),
      orderBy("nome", "asc")
    )

    const unsubscribeProfissionais = onSnapshot(
      consultaProfissionais,
      (resultado) => {
        const lista = resultado.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        })) as Profissional[]

        setProfissionais(lista)
      }
    )

    return () => unsubscribeProfissionais()
  }, [])

  async function adicionarProfissional() {

    // =====================================================
    // PERMISSÃO
    // =====================================================
    if (!podeGerenciar) {
      toast.warning("Você não tem permissão.")
      return
    }

    // =====================================================
    // EVITA DUPLO CLIQUE
    // =====================================================
    if (acaoEmAndamento) return

    // =====================================================
    // VALIDAÇÕES
    // =====================================================
    if (nome.trim() === "") {
      toast.warning("Informe o nome do profissional.")
      return
    }

    if (cargoId === "") {
      toast.warning("Selecione o cargo.")
      return
    }

    // =====================================================
    // EVITA DUPLICIDADE
    // =====================================================
    const profissionalExiste = profissionais.some(
      (item) =>
        item.nome.toLowerCase() ===
        nome.trim().toLowerCase()
    )

    if (profissionalExiste) {
      toast.warning("Esse profissional já existe.")
      return
    }

    try {

      setAcaoEmAndamento("adicionar_profissional")

      await addDoc(collection(db, "profissionais"), {
        nome: nome.trim(),
        cargo_id: cargoId,
        ativo: true,
        criado_em: serverTimestamp(),
        atualizado_em: serverTimestamp()
      })

      setNome("")
      setCargoId("")

      toast.success("Profissional cadastrado.")

    } catch (error) {

      console.error(error)

      toast.error("Erro ao cadastrar profissional.")

    } finally {

      setAcaoEmAndamento("")
    }
  }

  async function salvarEdicaoProfissional(id: string) {

    if (!podeGerenciar) {
      toast.warning("Você não tem permissão.")
      return
    }

    if (acaoEmAndamento) return

    if (nomeEdicao.trim() === "") {
      toast.warning("Informe o nome.")
      return
    }

    if (cargoId === "") {
      toast.warning("Selecione o cargo.")
      return
    }

    try {

      setAcaoEmAndamento(`salvar_${id}`)

      await updateDoc(doc(db, "profissionais", id), {
        nome: nomeEdicao.trim(),
        cargo_id: cargoId,
        atualizado_em: serverTimestamp()
      })

      cancelarEdicao()

      toast.success("Profissional atualizado.")

    } catch (error) {

      console.error(error)

      toast.error("Erro ao atualizar profissional.")

    } finally {

      setAcaoEmAndamento("")
    }
  }

  async function alternarStatus(
    id: string,
    ativoAtual: boolean
  ) {

    if (!podeGerenciar) {
      toast.warning("Você não tem permissão.")
      return
    }

    if (acaoEmAndamento) return

    try {

      setAcaoEmAndamento(`status_${id}`)

      await updateDoc(doc(db, "profissionais", id), {
        ativo: !ativoAtual,
        atualizado_em: serverTimestamp()
      })

      toast.success(
        ativoAtual
          ? "Profissional inativado."
          : "Profissional reativado."
      )

    } catch (error) {

      console.error(error)

      toast.error("Erro ao alterar status.")

    } finally {

      setAcaoEmAndamento("")
    }
  }

  function iniciarEdicao(profissional: Profissional) {
    setEditandoId(profissional.id || "")
    setNomeEdicao(profissional.nome)
    setCargoIdEdicao(profissional.cargo_id)
  }

  function cancelarEdicao() {
    setEditandoId("")
    setNomeEdicao("")
    setCargoIdEdicao("")

    toast.success("Edição cancelada.")
  }

  function buscarNomeCargo(cargo_id: string) {
    const cargo = cargos.find((item) => item.id === cargo_id)
    return cargo ? cargo.nome : "Cargo não encontrado"
  }

  const profissionaisFiltrados = profissionais.filter((profissional) =>
    profissional.nome.toLowerCase().includes(pesquisa.toLowerCase().trim())
  )

  return (
    <div className="space-y-6">

      {/* CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Profissionais
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Cadastro dos profissionais que realizam atendimentos.
          </p>
        </div>

        <div className="w-full md:w-80">
          <input
            type="text"
            placeholder="Pesquisar por nome"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            className="
              h-11 w-full rounded-xl border border-zinc-700
              bg-zinc-900 px-4 text-sm text-zinc-100
              outline-none transition
              placeholder:text-zinc-500
              focus:border-blue-500/60
              focus:ring-2 focus:ring-blue-500/20
            "
          />
        </div>
      </div>

      {/* CARD DE CADASTRO */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-zinc-100">
            Novo profissional
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Informe o profissional e vincule ao cargo correspondente.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_260px_160px]">
          <input
            type="text"
            placeholder="Nome do profissional"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="
              h-11 rounded-xl border border-zinc-700
              bg-zinc-950 px-4 text-sm text-zinc-100
              outline-none transition
              placeholder:text-zinc-500
              focus:border-blue-500/60
              focus:ring-2 focus:ring-blue-500/20
            "
          />

          <select
            value={cargoId}
            onChange={(e) => setCargoId(e.target.value)}
            className="
              h-11 rounded-xl border border-zinc-700
              bg-zinc-950 px-4 text-sm text-zinc-100
              outline-none transition
              focus:border-blue-500/60
              focus:ring-2 focus:ring-blue-500/20
            "
          >
            <option value="">Selecione o cargo</option>

            {cargos
              .filter((cargo) => cargo.ativo)
              .map((cargo) => (
                <option key={cargo.id} value={cargo.id}>
                  {cargo.nome}
                </option>
              ))}
          </select>

          <button
            onClick={adicionarProfissional}
            disabled={acaoEmAndamento === "adicionar_profissional"}
            className="
              h-11 rounded-xl border border-blue-500/40
              bg-blue-600 px-5 text-sm font-semibold text-white
              transition hover:bg-blue-500
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {acaoEmAndamento === "adicionar_profissional"
              ? "Adicionando..."
              : "Adicionar profissional"}
          </button>
        </div>
      </section>

      {/* LISTAGEM EM TABELA */}
      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Profissionais cadastrados
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {profissionaisFiltrados.length} registro(s) encontrado(s)
            </p>
          </div>
        </div>

        {profissionaisFiltrados.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-zinc-300">
              Nenhum profissional encontrado.
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Cadastre um novo profissional ou ajuste o termo pesquisado.
            </p>
          </div>
        )}

        {profissionaisFiltrados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">
                    Profissional
                  </th>

                  <th className="px-5 py-3 text-left font-semibold">
                    Cargo
                  </th>

                  <th className="w-32 px-5 py-3 text-left font-semibold">
                    Status
                  </th>

                  <th className="w-56 px-5 py-3 text-right font-semibold">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800">
                {profissionaisFiltrados.map((profissional) => {
                  const estaEditando = editandoId === profissional.id

                  return (
                    <tr
                      key={profissional.id}
                      className="transition hover:bg-zinc-800/50"
                    >
                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <input
                            type="text"
                            value={nomeEdicao}
                            onChange={(e) => setNomeEdicao(e.target.value)}
                            className="
                              h-10 w-full rounded-lg border border-zinc-700
                              bg-zinc-950 px-3 text-sm text-zinc-100
                              outline-none transition
                              focus:border-blue-500/60
                              focus:ring-2 focus:ring-blue-500/20
                            "
                          />
                        ) : (
                          <div>
                            <p className="font-semibold text-zinc-100">
                              {profissional.nome}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500">
                              Profissional de atendimento
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <select
                            value={cargoIdEdicao}
                            onChange={(e) => setCargoIdEdicao(e.target.value)}
                            className="
                              h-10 w-full rounded-lg border border-zinc-700
                              bg-zinc-950 px-3 text-sm text-zinc-100
                              outline-none transition
                              focus:border-blue-500/60
                              focus:ring-2 focus:ring-blue-500/20
                            "
                          >
                            <option value="">Selecione o cargo</option>

                            {cargos
                              .filter(
                                (cargo) =>
                                  cargo.ativo ||
                                  cargo.id === profissional.cargo_id
                              )
                              .map((cargo) => (
                                <option key={cargo.id} value={cargo.id}>
                                  {cargo.nome}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <p className="text-zinc-300">
                            {buscarNomeCargo(profissional.cargo_id)}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        <span
                          className={`
                            inline-flex items-center rounded-full border px-2.5 py-1
                            text-xs font-semibold
                            ${profissional.ativo
                              ? "border-green-500/30 bg-green-500/10 text-green-300"
                              : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"
                            }
                          `}
                        >
                          {profissional.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>

                      <td className="px-5 py-3 align-middle">
                        <div className="flex justify-end gap-2">
                          {estaEditando ? (
                            <>
                              <button
                                onClick={() =>
                                  salvarEdicaoProfissional(profissional.id!)
                                }
                                className="
                                  rounded-lg border border-blue-500/40
                                  bg-blue-600 px-3 py-2 text-xs font-semibold text-white
                                  transition hover:bg-blue-500
                                "
                              >
                                Salvar
                              </button>

                              <button
                                onClick={cancelarEdicao}
                                className="
                                  rounded-lg border border-zinc-700
                                  bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100
                                  transition hover:bg-zinc-700
                                "
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => iniciarEdicao(profissional)}
                                className="
                                  rounded-lg border border-zinc-700
                                  bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100
                                  transition hover:bg-zinc-700
                                "
                              >
                                Editar
                              </button>

                              {profissional.id && (
                                <button
                                  onClick={() =>
                                    alternarStatus(
                                      profissional.id!,
                                      profissional.ativo
                                    )
                                  }
                                  className={`
                                    rounded-lg border px-3 py-2 text-xs font-semibold transition
                                    ${profissional.ativo
                                      ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                                      : "border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20"
                                    }
                                  `}
                                >
                                  {profissional.ativo ? "Inativar" : "Reativar"}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}