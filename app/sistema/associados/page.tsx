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
  telefone?: string
  email?: string
  ativo: boolean
}

type Associado = {
  id?: string
  pessoa_id: string
  matricula: string
  ativo: boolean
}

export default function AssociadosPage() {
  // =====================================================
  // LISTAS VINDAS DO FIRESTORE
  // =====================================================
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [associados, setAssociados] = useState<Associado[]>([])

  // =====================================================
  // ESTADOS DO CADASTRO
  // =====================================================
  const [pessoaId, setPessoaId] = useState("")
  const [matricula, setMatricula] = useState("")
  const [buscaPessoa, setBuscaPessoa] = useState("")

  // =====================================================
  // ESTADO DA PESQUISA DA TABELA
  // =====================================================
  const [pesquisa, setPesquisa] = useState("")


  // =====================================================
  // CONTROLE DE PROCESSAMENTO DAS AÇÕES
  // =====================================================
  const [acaoEmAndamento, setAcaoEmAndamento] = useState("")  

  // =====================================================
  // ESTADOS DA EDIÇÃO INLINE
  // =====================================================
  const [editandoId, setEditandoId] = useState("")
  const [pessoaIdEdicao, setPessoaIdEdicao] = useState("")
  const [matriculaEdicao, setMatriculaEdicao] = useState("")

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



  // =====================================================
  // BUSCA DE PESSOAS
  // =====================================================

  useEffect(() => {
    const consultaPessoas = query(
      collection(db, "pessoas"),
      orderBy("nome", "asc")
    )

    const unsubscribePessoas = onSnapshot(consultaPessoas, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Pessoa[]

      setPessoas(lista)
    })

    return () => unsubscribePessoas()
  }, [])

  // =====================================================
  // BUSCA DE ASSOCIADOS
  // =====================================================

  useEffect(() => {
    const consultaAssociados = query(
      collection(db, "associados"),
      orderBy("matricula", "asc")
    )

    const unsubscribeAssociados = onSnapshot(consultaAssociados, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Associado[]

      setAssociados(lista)
    })

    return () => unsubscribeAssociados()
  }, [])

  // =====================================================
  // ADICIONAR ASSOCIADO
  // =====================================================

  async function adicionarAssociado() {
    if (!podeGerenciar) {
      toast.warning("Você não tem permissão para cadastrar associados.")
      return
    }

    if (acaoEmAndamento) return

    if (pessoaId === "") {
      toast.warning("Selecione a pessoa.")
      return
    }

    if (matricula.trim() === "") {
      toast.warning("Informe a matrícula.")
      return
    }

    const matriculaFormatada = matricula.trim()

    const matriculaExiste = associados.some(
      (item) => item.matricula === matriculaFormatada
    )

    if (matriculaExiste) {
      toast.warning("Esta matrícula já existe.")
      return
    }

    const pessoaJaAssociada = associados.some(
      (item) => item.pessoa_id === pessoaId
    )

    if (pessoaJaAssociada) {
      toast.warning("Esta pessoa já possui cadastro de associado.")
      return
    }

    try {
      setAcaoEmAndamento("adicionar_associado")

      await addDoc(collection(db, "associados"), {
        pessoa_id: pessoaId,
        matricula: matriculaFormatada,
        ativo: true,
        data_associacao: serverTimestamp(),
        criado_em: serverTimestamp(),
        atualizado_em: serverTimestamp()
      })

      setPessoaId("")
      setMatricula("")
      setBuscaPessoa("")

      toast.success("Associado cadastrado.")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao cadastrar associado.")
    } finally {
      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // SALVAR EDIÇÃO DO ASSOCIADO
  // =====================================================

  async function salvarEdicaoAssociado(id: string) {
    if (pessoaIdEdicao === "") {
      toast.warning("Selecione a pessoa.")
      return
    }

    if (matriculaEdicao.trim() === "") {
      toast.warning("Informe a matrícula.")
      return
    }

    const matriculaFormatada = matriculaEdicao.trim()

    const matriculaExiste = associados.some(
      (item) => item.id !== id && item.matricula === matriculaFormatada
    )

    if (matriculaExiste) {
      toast.warning("Esta matrícula já existe.")
      return
    }

    const pessoaJaAssociada = associados.some(
      (item) => item.id !== id && item.pessoa_id === pessoaIdEdicao
    )

    if (pessoaJaAssociada) {
      toast.warning("Esta pessoa já possui cadastro de associado.")
      return
    }

    await updateDoc(doc(db, "associados", id), {
      pessoa_id: pessoaIdEdicao,
      matricula: matriculaFormatada,
      atualizado_em: serverTimestamp()
    })

    toast.success("Associado atualizado.")
    cancelarEdicao()
  }

  // =====================================================
  // INATIVAR / REATIVAR ASSOCIADO
  // =====================================================

  async function alternarStatus(id: string, ativoAtual: boolean) {

    if (!podeGerenciar) {
      toast.warning("Você não tem permissão.")
      return
    }

    if (acaoEmAndamento) return

    try {

      setAcaoEmAndamento(`status_${id}`)

      await updateDoc(doc(db, "associados", id), {
        ativo: !ativoAtual,
        atualizado_em: serverTimestamp()
      })

      toast.success(
        ativoAtual
          ? "Associado inativado."
          : "Associado reativado."
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

  function iniciarEdicao(associado: Associado) {
    setEditandoId(associado.id || "")
    setPessoaIdEdicao(associado.pessoa_id)
    setMatriculaEdicao(associado.matricula)
  }

  function cancelarEdicao() {
    setEditandoId("")
    setPessoaIdEdicao("")
    setMatriculaEdicao("")

    toast.success("Edição cancelada.")
  }

  // =====================================================
  // FUNÇÕES AUXILIARES
  // =====================================================

  function buscarPessoa(pessoa_id: string) {
    return pessoas.find((item) => item.id === pessoa_id)
  }

  function buscarNomePessoa(pessoa_id: string) {
    return buscarPessoa(pessoa_id)?.nome || "Pessoa não encontrada"
  }

  // =====================================================
  // AUTOCOMPLETE DE PESSOA
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

  const associadosFiltrados = associados.filter((associado) => {
    const termo = pesquisa.toLowerCase().trim()
    const pessoa = buscarPessoa(associado.pessoa_id)

    return (
      pessoa?.nome.toLowerCase().includes(termo) ||
      associado.matricula.toLowerCase().includes(termo)
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
            Associados
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Cadastro de associados da ADUSEPS.
          </p>
        </div>

        <div className="w-full md:w-96">
          <input
            type="text"
            placeholder="Pesquisar por nome ou matrícula"
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
              Novo associado
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Vincule uma pessoa cadastrada a uma matrícula de associado.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
            {/* BUSCA DA PESSOA */}

            <div className="relative">
              <input
                type="text"
                placeholder="Buscar pessoa por nome"
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

            {/* MATRÍCULA */}

            <input
              type="text"
              placeholder="Matrícula"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              className="
                h-11 rounded-xl border border-zinc-700
                bg-zinc-950 px-4 text-sm text-zinc-100
                outline-none transition placeholder:text-zinc-500
                focus:border-blue-500/60
                focus:ring-2 focus:ring-blue-500/20
              "
            />
          </div>

          <button
            onClick={adicionarAssociado}
            disabled={acaoEmAndamento === "adicionar_associado"}
            className="
              mt-4 h-11 rounded-xl border border-blue-500/40
              bg-blue-600 px-5 text-sm font-semibold text-white
              transition hover:bg-blue-500
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {acaoEmAndamento === "adicionar_associado"
              ? "Adicionando..."
              : "Adicionar associado"}
          </button>
        </section>
      )}

      {/* =====================================================
          TABELA DE ASSOCIADOS
          ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-sm">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-100">
            Associados cadastrados
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {associadosFiltrados.length} registro(s) encontrado(s)
          </p>
        </div>

        {associadosFiltrados.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-zinc-300">
              Nenhum associado encontrado.
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Cadastre um novo associado ou ajuste a pesquisa.
            </p>
          </div>
        )}

        {associadosFiltrados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">
                    Associado
                  </th>

                  <th className="w-40 px-5 py-3 text-left font-semibold">
                    Matrícula
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
                {associadosFiltrados.map((associado) => {
                  const estaEditando = editandoId === associado.id

                  return (
                    <tr
                      key={associado.id}
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
                                  pessoa.id === associado.pessoa_id
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
                              {buscarNomePessoa(associado.pessoa_id)}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500">
                              Pessoa vinculada como associado
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <input
                            type="text"
                            value={matriculaEdicao}
                            onChange={(e) =>
                              setMatriculaEdicao(e.target.value)
                            }
                            className="
                              h-10 w-full rounded-lg border border-zinc-700
                              bg-zinc-950 px-3 text-sm text-zinc-100
                              outline-none transition
                              focus:border-blue-500/60
                              focus:ring-2 focus:ring-blue-500/20
                            "
                          />
                        ) : (
                          <p className="text-zinc-300">
                            {associado.matricula}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        <span
                          className={`
                            inline-flex items-center rounded-full border px-2.5 py-1
                            text-xs font-semibold
                            ${
                              associado.ativo
                                ? "border-green-500/30 bg-green-500/10 text-green-300"
                                : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"
                            }
                          `}
                        >
                          {associado.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                          
                      {podeGerenciar && (
                        <td className="px-5 py-3 align-middle">
                          <div className="flex flex-wrap justify-end gap-2">
                            {estaEditando ? (
                              <>
                                <button
                                  onClick={() =>
                                    salvarEdicaoAssociado(associado.id!)
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
                                  onClick={() => iniciarEdicao(associado)}
                                  className="
                                    rounded-lg border border-zinc-700
                                    bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100
                                    transition hover:bg-zinc-700
                                  "
                                >
                                  Editar
                                </button>

                                {associado.id && (
                                  <button
                                    onClick={() =>
                                      alternarStatus(
                                        associado.id!,
                                        associado.ativo
                                      )
                                    }
                                    className={`
                                      rounded-lg border px-3 py-2 text-xs font-semibold transition
                                      ${
                                        associado.ativo
                                          ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                                          : "border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20"
                                      }
                                    `}
                                  >
                                    {associado.ativo ? "Inativar" : "Reativar"}
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