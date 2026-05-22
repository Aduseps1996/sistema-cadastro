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
  ativo: boolean
}

type Representante = {
  id?: string
  associado_id: string
  pessoa_id: string
  tipo: string
  ativo: boolean
}

// =====================================================
// TIPOS POSSÍVEIS DE REPRESENTANTE
// =====================================================

const tiposRepresentante = [
  "Cônjuge",
  "Filho(a)",
  "Responsável",
  "Terceiro",
  "Advogado",
  "Outro"
]

export default function RepresentantesPage() {
  // =====================================================
  // LISTAS VINDAS DO FIRESTORE
  // =====================================================
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [associados, setAssociados] = useState<Associado[]>([])
  const [representantes, setRepresentantes] = useState<Representante[]>([])

  // =====================================================
  // ESTADOS DO CADASTRO
  // =====================================================
  const [associadoId, setAssociadoId] = useState("")
  const [pessoaId, setPessoaId] = useState("")
  const [tipo, setTipo] = useState("")

  // =====================================================
  // ESTADOS DE BUSCA
  // =====================================================
  const [pesquisa, setPesquisa] = useState("")
  const [buscaAssociado, setBuscaAssociado] = useState("")
  const [buscaPessoa, setBuscaPessoa] = useState("")

  // =====================================================
  // CONTROLE DE PROCESSAMENTO DAS AÇÕES
  // =====================================================
  const [acaoEmAndamento, setAcaoEmAndamento] = useState("")


  // =====================================================
  // ESTADOS DA EDIÇÃO INLINE
  // =====================================================
  const [editandoId, setEditandoId] = useState("")
  const [associadoIdEdicao, setAssociadoIdEdicao] = useState("")
  const [pessoaIdEdicao, setPessoaIdEdicao] = useState("")
  const [tipoEdicao, setTipoEdicao] = useState("")
  // =====================================================
  // BUSCA DE PESSOAS
  // =====================================================


  const { usuarioSistema } = useUsuario()
  // =====================================================
  // CONTROLE DE PERMISSÃO DE GERENCIAMENTO
  // =====================================================
  // Apenas Administrador e Recepção podem:
  // - cadastrar
  // - editar
  // - inativar
  // - reativar
  const podeGerenciar =
    usuarioSistema?.perfil === "Administrador" ||
    usuarioSistema?.perfil === "Recepção"

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
  // BUSCA DE ASSOCIADOS
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
  // BUSCA DE REPRESENTANTES
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
  // ADICIONAR REPRESENTANTE
  // =====================================================

  async function adicionarRepresentante() {

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
    if (associadoId === "") {
      toast.warning("Selecione o associado.")
      return
    }

    if (pessoaId === "") {
      toast.warning("Selecione a pessoa.")
      return
    }

    if (tipo.trim() === "") {
      toast.warning("Informe o tipo do representante.")
      return
    }

    // =====================================================
    // EVITA REPRESENTANTE DUPLICADO
    // =====================================================
    const representanteExiste = representantes.some(
      (item) =>
        item.associado_id === associadoId &&
        item.pessoa_id === pessoaId
    )

    if (representanteExiste) {
      toast.warning("Esse representante já está vinculado.")
      return
    }

    try {

      setAcaoEmAndamento("adicionar_representante")

      await addDoc(collection(db, "associado_representantes"), {
        associado_id: associadoId,
        pessoa_id: pessoaId,
        tipo: tipo.trim(),
        ativo: true,
        criado_em: serverTimestamp(),
        atualizado_em: serverTimestamp()
      })

      // =====================================================
      // LIMPA FORMULÁRIO
      // =====================================================
      setAssociadoId("")
      setPessoaId("")
      setTipo("")
      setBuscaAssociado("")
      setBuscaPessoa("")

      toast.success("Representante cadastrado.")

    } catch (error) {

      console.error(error)

      toast.error("Erro ao cadastrar representante.")

    } finally {

      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // SALVAR EDIÇÃO DO REPRESENTANTE
  // =====================================================

  async function salvarEdicaoRepresentante(id: string) {
    if (associadoIdEdicao === "") {
      toast.warning("Selecione o associado.")
      return
    }

    if (pessoaIdEdicao === "") {
      toast.warning("Selecione a pessoa representante.")
      return
    }

    if (tipoEdicao === "") {
      toast.warning("Selecione o tipo de representante.")
      return
    }

    const representanteExiste = representantes.some(
      (representante) =>
        representante.id !== id &&
        representante.associado_id === associadoIdEdicao &&
        representante.pessoa_id === pessoaIdEdicao
    )

    if (representanteExiste) {
      toast.warning("Esta pessoa já está vinculada como representante deste associado.")
      return
    }

    await updateDoc(doc(db, "associado_representantes", id), {
      associado_id: associadoIdEdicao,
      pessoa_id: pessoaIdEdicao,
      tipo: tipoEdicao,
      atualizado_em: serverTimestamp()
    })

    toast.success("Representante atualizado.")

    cancelarEdicao()
  }

  // =====================================================
  // INATIVAR / REATIVAR REPRESENTANTE
  // =====================================================

  async function alternarStatusRepresentante(
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

      await updateDoc(doc(db, "associado_representantes", id), {
        ativo: !ativoAtual,
        atualizado_em: serverTimestamp()
      })

      toast.success(
        ativoAtual
          ? "Representante inativado."
          : "Representante reativado."
      )

    } catch (error) {

      console.error(error)

      toast.error("Erro ao alterar status.")

    } finally {

      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // CONTROLE DE EDIÇÃO
  // =====================================================

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

    toast.success("Edição cancelada.")
  }

  // =====================================================
  // FUNÇÕES AUXILIARES
  // =====================================================

  function buscarPessoa(pessoa_id: string) {
    return pessoas.find((item) => item.id === pessoa_id)
  }

  function buscarAssociado(associado_id: string) {
    return associados.find((item) => item.id === associado_id)
  }

  function buscarNomeAssociado(associado_id: string) {
    const associado = buscarAssociado(associado_id)

    if (!associado) {
      return "Associado não encontrado"
    }

    const pessoa = buscarPessoa(associado.pessoa_id)

    return pessoa
      ? `${pessoa.nome} - Matrícula ${associado.matricula}`
      : "Pessoa não encontrada"
  }

  // =====================================================
  // AUTOCOMPLETE DE ASSOCIADO
  // =====================================================

  const associadosEncontrados = associados
    .filter((associado) => associado.ativo)
    .filter((associado) => {
      const termo = buscaAssociado.toLowerCase().trim()
      const pessoa = buscarPessoa(associado.pessoa_id)

      if (termo.length < 2) {
        return false
      }

      return (
        pessoa?.nome.toLowerCase().includes(termo) ||
        associado.matricula.toLowerCase().includes(termo)
      )
    })
    .slice(0, 8)

  // =====================================================
  // AUTOCOMPLETE DE PESSOA REPRESENTANTE
  // =====================================================

  const pessoasEncontradas = pessoas
    .filter((pessoa) => pessoa.ativo)
    .filter((pessoa) => {
      const termo = buscaPessoa.toLowerCase().trim()

      if (termo.length < 2) {
        return false
      }

      return pessoa.nome.toLowerCase().includes(termo)
    })
    .slice(0, 8)

  // =====================================================
  // FILTRO DA TABELA
  // =====================================================

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
    <div className="space-y-6">
      {/* =====================================================
          CABEÇALHO DA PÁGINA
          ===================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Representantes
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Vínculo entre associados e seus representantes.
          </p>
        </div>

        <div className="w-full md:w-96">
          <input
            type="text"
            placeholder="Pesquisar por representante, associado ou tipo"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            className="
              h-11 w-full rounded-xl border border-zinc-700
              bg-zinc-900 px-4 text-sm text-zinc-100
              outline-none transition placeholder:text-zinc-500
              focus:border-blue-500/60
              focus:ring-2 focus:ring-blue-500/20
            "
          />
        </div>
      </div>

      {/* =====================================================
          CARD DE CADASTRO
          ===================================================== */}
      {podeGerenciar && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-zinc-100">
              Novo representante
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Vincule uma pessoa como representante de um associado.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_220px]">
            {/* BUSCA DO ASSOCIADO */}

            <div className="relative">
              <input
                type="text"
                placeholder="Buscar associado por nome ou matrícula"
                value={buscaAssociado}
                onChange={(e) => {
                  setBuscaAssociado(e.target.value)
                  setAssociadoId("")
                }}
                className="
                  h-11 w-full rounded-xl border border-zinc-700
                  bg-zinc-950 px-4 text-sm text-zinc-100
                  outline-none transition placeholder:text-zinc-500
                  focus:border-blue-500/60
                  focus:ring-2 focus:ring-blue-500/20
                "
              />

              {buscaAssociado.trim().length >= 2 && associadoId === "" && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
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
                      className="
                        w-full px-4 py-3 text-left text-sm text-zinc-200
                        transition hover:bg-zinc-800
                      "
                    >
                      {buscarNomeAssociado(associado.id || "")}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* BUSCA DA PESSOA REPRESENTANTE */}

            <div className="relative">
              <input
                type="text"
                placeholder="Buscar pessoa representante"
                value={buscaPessoa}
                onChange={(e) => {
                  setBuscaPessoa(e.target.value)
                  setPessoaId("")
                }}
                className="
                  h-11 w-full rounded-xl border border-zinc-700
                  bg-zinc-950 px-4 text-sm text-zinc-100
                  outline-none transition placeholder:text-zinc-500
                  focus:border-blue-500/60
                  focus:ring-2 focus:ring-blue-500/20
                "
              />

              {buscaPessoa.trim().length >= 2 && pessoaId === "" && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
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
                      className="
                        w-full px-4 py-3 text-left text-sm text-zinc-200
                        transition hover:bg-zinc-800
                      "
                    >
                      {pessoa.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* TIPO DO REPRESENTANTE */}

            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="
                h-11 rounded-xl border border-zinc-700
                bg-zinc-950 px-4 text-sm text-zinc-100
                outline-none transition
                focus:border-blue-500/60
                focus:ring-2 focus:ring-blue-500/20
              "
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
            disabled={acaoEmAndamento === "adicionar_representante"}
            className="
              mt-4 h-11 rounded-xl border border-blue-500/40
              bg-blue-600 px-5 text-sm font-semibold text-white
              transition hover:bg-blue-500
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {acaoEmAndamento === "adicionar_representante"
              ? "Adicionando..."
              : "Adicionar representante"}
          </button>
        </section>
      )}

      {/* =====================================================
          TABELA DE REPRESENTANTES
          ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-sm">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-100">
            Representantes cadastrados
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {representantesFiltrados.length} registro(s) encontrado(s)
          </p>
        </div>

        {representantesFiltrados.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-zinc-300">
              Nenhum representante encontrado.
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Cadastre um novo representante ou ajuste a pesquisa.
            </p>
          </div>
        )}

        {representantesFiltrados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">
                    Representante
                  </th>

                  <th className="px-5 py-3 text-left font-semibold">
                    Associado
                  </th>

                  <th className="w-40 px-5 py-3 text-left font-semibold">
                    Tipo
                  </th>

                  <th className="w-32 px-5 py-3 text-left font-semibold">
                    Status
                  </th>

                  {podeGerenciar && (
                    <th className="w-56 px-5 py-3 text-right font-semibold">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800">
                {representantesFiltrados.map((representante) => {
                  const estaEditando = editandoId === representante.id

                  return (
                    <tr
                      key={representante.id}
                      className="transition hover:bg-zinc-800/50"
                    >
                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <select
                            value={pessoaIdEdicao}
                            onChange={(e) => setPessoaIdEdicao(e.target.value)}
                            className="
                              h-10 w-full rounded-lg border border-zinc-700
                              bg-zinc-950 px-3 text-sm text-zinc-100
                              outline-none transition
                              focus:border-blue-500/60
                              focus:ring-2 focus:ring-blue-500/20
                            "
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
                        ) : (
                          <div>
                            <p className="font-semibold text-zinc-100">
                              {buscarPessoa(representante.pessoa_id)?.nome ||
                                "Pessoa não encontrada"}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500">
                              Pessoa vinculada como representante
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <select
                            value={associadoIdEdicao}
                            onChange={(e) =>
                              setAssociadoIdEdicao(e.target.value)
                            }
                            className="
                              h-10 w-full rounded-lg border border-zinc-700
                              bg-zinc-950 px-3 text-sm text-zinc-100
                              outline-none transition
                              focus:border-blue-500/60
                              focus:ring-2 focus:ring-blue-500/20
                            "
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
                        ) : (
                          <p className="text-zinc-300">
                            {buscarNomeAssociado(representante.associado_id)}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <select
                            value={tipoEdicao}
                            onChange={(e) => setTipoEdicao(e.target.value)}
                            className="
                              h-10 w-full rounded-lg border border-zinc-700
                              bg-zinc-950 px-3 text-sm text-zinc-100
                              outline-none transition
                              focus:border-blue-500/60
                              focus:ring-2 focus:ring-blue-500/20
                            "
                          >
                            <option value="">Tipo</option>

                            {tiposRepresentante.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-zinc-300">
                            {representante.tipo}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        <span
                          className={`
                            inline-flex items-center rounded-full border px-2.5 py-1
                            text-xs font-semibold
                            ${representante.ativo
                              ? "border-green-500/30 bg-green-500/10 text-green-300"
                              : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"
                            }
                          `}
                        >
                          {representante.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      {podeGerenciar && (
                        <td className="px-5 py-3 align-middle">
                          <div className="flex flex-wrap justify-end gap-2">
                            {estaEditando ? (
                              <>
                                <button
                                  onClick={() =>
                                    salvarEdicaoRepresentante(representante.id!)
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
                                  onClick={() => iniciarEdicao(representante)}
                                  className="
                                    rounded-lg border border-zinc-700
                                    bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100
                                    transition hover:bg-zinc-700
                                  "
                                >
                                  Editar
                                </button>

                                {representante.id && (
                                  <button
                                    onClick={() =>
                                      alternarStatusRepresentante(
                                        representante.id!,
                                        representante.ativo
                                      )
                                    }
                                    disabled={acaoEmAndamento === `status_${representante.id}`}
                                    className={`
                                      rounded-lg border px-3 py-2 text-xs font-semibold transition
                                      disabled:cursor-not-allowed disabled:opacity-50
                                      ${representante.ativo
                                        ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                                        : "border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20"
                                      }
                                    `}
                                  >
                                    {acaoEmAndamento === `status_${representante.id}`
                                      ? "Aguarde..."
                                      : representante.ativo
                                        ? "Inativar"
                                        : "Reativar"}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      )}
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