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
// TIPO DA PESSOA
// =====================================================
type Pessoa = {
  id?: string
  nome: string
  telefone?: string
  email?: string
  cpf?: string
  ativo: boolean
}

export default function PessoasPage() {
  // =====================================================
  // ESTADOS DO CADASTRO
  // =====================================================
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [cpf, setCpf] = useState("")

  // =====================================================
  // ESTADO DA PESQUISA
  // =====================================================
  const [pesquisa, setPesquisa] = useState("")

  // =====================================================
  // LISTA DE PESSOAS
  // =====================================================
  const [pessoas, setPessoas] = useState<Pessoa[]>([])

  // =====================================================
  // ESTADO DE PROCESSAMENTO DAS AÇÕES
  // =====================================================
  // Controla qual ação está em andamento.
  // Evita clique duplo e mostra feedback nos botões.
  const [acaoEmAndamento, setAcaoEmAndamento] = useState("")

  // =====================================================
  // ESTADOS DA EDIÇÃO INLINE
  // =====================================================
  const [editandoId, setEditandoId] = useState("")
  const [nomeEdicao, setNomeEdicao] = useState("")
  const [telefoneEdicao, setTelefoneEdicao] = useState("")
  const [emailEdicao, setEmailEdicao] = useState("")
  const [cpfEdicao, setCpfEdicao] = useState("")

  const { usuarioSistema } = useUsuario()

  const podeGerenciar =
    usuarioSistema?.perfil === "Administrador" ||
    usuarioSistema?.perfil === "Recepção"

  // =====================================================
  // CONSULTA EM TEMPO REAL
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
  // ADICIONAR PESSOA
  // =====================================================
  async function adicionarPessoa() {
    if (!podeGerenciar) {
      toast.warning("Você não tem permissão para cadastrar pessoas.")
      return
    }

    if (acaoEmAndamento) return

    if (nome.trim() === "") {
      toast.warning("Informe o nome.")
      return
    }

    try {
      setAcaoEmAndamento("adicionar_pessoa")

      await addDoc(collection(db, "pessoas"), {
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: email.trim().toLowerCase(),
        cpf: cpf.trim(),
        ativo: true,
        data_cadastro: serverTimestamp(),
        criado_em: serverTimestamp(),
        atualizado_em: serverTimestamp()
      })

      setNome("")
      setTelefone("")
      setEmail("")
      setCpf("")

      toast.success("Pessoa cadastrada.")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao cadastrar pessoa.")
    } finally {
      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // SALVAR EDIÇÃO
  // =====================================================
  async function salvarEdicaoPessoa(id: string) {
    if (!podeGerenciar) {
      toast.warning("Você não tem permissão para editar pessoas.")
      return
    }

    if (acaoEmAndamento) return

    if (nomeEdicao.trim() === "") {
      toast.warning("Informe o nome.")
      return
    }

    try {
      setAcaoEmAndamento(`salvar_${id}`)

      await updateDoc(doc(db, "pessoas", id), {
        nome: nomeEdicao.trim(),
        telefone: telefoneEdicao.trim(),
        email: emailEdicao.trim().toLowerCase(),
        cpf: cpfEdicao.trim(),
        atualizado_em: serverTimestamp()
      })

      cancelarEdicao()

      toast.success("Pessoa atualizada.")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao atualizar pessoa.")
    } finally {
      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // INATIVAR / REATIVAR
  // =====================================================
  async function alternarStatus(id: string, ativoAtual: boolean) {
    if (!podeGerenciar) {
      toast.warning("Você não tem permissão para alterar o status.")
      return
    }

    if (acaoEmAndamento) return

    try {
      setAcaoEmAndamento(`status_${id}`)

      await updateDoc(doc(db, "pessoas", id), {
        ativo: !ativoAtual,
        atualizado_em: serverTimestamp()
      })

      toast.success(
        ativoAtual
          ? "Pessoa inativada."
          : "Pessoa reativada."
      )
    } catch (error) {
      console.error(error)
      toast.error("Erro ao alterar status.")
    } finally {
      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // INICIAR EDIÇÃO
  // =====================================================
  function iniciarEdicao(pessoa: Pessoa) {
    setEditandoId(pessoa.id || "")
    setNomeEdicao(pessoa.nome)
    setTelefoneEdicao(pessoa.telefone || "")
    setEmailEdicao(pessoa.email || "")
    setCpfEdicao(pessoa.cpf || "")
  }

  // =====================================================
  // CANCELAR EDIÇÃO
  // =====================================================
  function cancelarEdicao() {
    setEditandoId("")
    setNomeEdicao("")
    setTelefoneEdicao("")
    setEmailEdicao("")
    setCpfEdicao("")

    toast.success("Edição cancelada.")
  }

  // =====================================================
  // FILTRO DA TABELA
  // =====================================================
  const pessoasFiltradas = pessoas.filter((pessoa) => {
    const termo = pesquisa.toLowerCase().trim()

    return (
      pessoa.nome.toLowerCase().includes(termo) ||
      (pessoa.telefone || "").toLowerCase().includes(termo) ||
      (pessoa.email || "").toLowerCase().includes(termo) ||
      (pessoa.cpf || "").toLowerCase().includes(termo)
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
            Pessoas
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Cadastro geral de pessoas do sistema.
          </p>
        </div>

        <div className="w-full md:w-96">
          <input
            type="text"
            placeholder="Pesquisar por nome, telefone, e-mail ou CPF"
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
              Nova pessoa
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Cadastre pessoas que poderão ser associadas, representantes ou atendidas.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              type="text"
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="
                h-11 rounded-xl border border-zinc-700
                bg-zinc-950 px-4 text-sm text-zinc-100
                outline-none transition placeholder:text-zinc-500
                focus:border-blue-500/60
                focus:ring-2 focus:ring-blue-500/20
              "
            />

            <input
              type="text"
              placeholder="Telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="
                h-11 rounded-xl border border-zinc-700
                bg-zinc-950 px-4 text-sm text-zinc-100
                outline-none transition placeholder:text-zinc-500
                focus:border-blue-500/60
                focus:ring-2 focus:ring-blue-500/20
              "
            />

            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="
                h-11 rounded-xl border border-zinc-700
                bg-zinc-950 px-4 text-sm text-zinc-100
                outline-none transition placeholder:text-zinc-500
                focus:border-blue-500/60
                focus:ring-2 focus:ring-blue-500/20
              "
            />

            <input
              type="text"
              placeholder="CPF"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
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
            onClick={adicionarPessoa}
            disabled={acaoEmAndamento === "adicionar_pessoa"}
            className="
              mt-4 h-11 rounded-xl border border-blue-500/40
              bg-blue-600 px-5 text-sm font-semibold text-white
              transition hover:bg-blue-500
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {acaoEmAndamento === "adicionar_pessoa"
              ? "Adicionando..."
              : "Adicionar pessoa"}
          </button>
        </section>
      )}

      {/* =====================================================
          TABELA DE PESSOAS
          ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-sm">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-100">
            Pessoas cadastradas
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {pessoasFiltradas.length} registro(s) encontrado(s)
          </p>
        </div>

        {pessoasFiltradas.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-zinc-300">
              Nenhuma pessoa encontrada.
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Cadastre uma nova pessoa ou ajuste a pesquisa.
            </p>
          </div>
        )}

        {pessoasFiltradas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">
                    Pessoa
                  </th>

                  <th className="px-5 py-3 text-left font-semibold">
                    Contato
                  </th>

                  <th className="w-40 px-5 py-3 text-left font-semibold">
                    CPF
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
                {pessoasFiltradas.map((pessoa) => {
                  const estaEditando = editandoId === pessoa.id

                  return (
                    <tr
                      key={pessoa.id}
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
                              {pessoa.nome}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500">
                              Cadastro geral de pessoa
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <div className="grid grid-cols-1 gap-2">
                            <input
                              type="text"
                              value={telefoneEdicao}
                              onChange={(e) => setTelefoneEdicao(e.target.value)}
                              placeholder="Telefone"
                              className="
                                h-10 rounded-lg border border-zinc-700
                                bg-zinc-950 px-3 text-sm text-zinc-100
                                outline-none transition placeholder:text-zinc-500
                                focus:border-blue-500/60
                                focus:ring-2 focus:ring-blue-500/20
                              "
                            />

                            <input
                              type="email"
                              value={emailEdicao}
                              onChange={(e) => setEmailEdicao(e.target.value)}
                              placeholder="E-mail"
                              className="
                                h-10 rounded-lg border border-zinc-700
                                bg-zinc-950 px-3 text-sm text-zinc-100
                                outline-none transition placeholder:text-zinc-500
                                focus:border-blue-500/60
                                focus:ring-2 focus:ring-blue-500/20
                              "
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="text-zinc-300">
                              {pessoa.telefone || "Sem telefone"}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500">
                              {pessoa.email || "Sem e-mail"}
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <input
                            type="text"
                            value={cpfEdicao}
                            onChange={(e) => setCpfEdicao(e.target.value)}
                            placeholder="CPF"
                            className="
                              h-10 w-full rounded-lg border border-zinc-700
                              bg-zinc-950 px-3 text-sm text-zinc-100
                              outline-none transition placeholder:text-zinc-500
                              focus:border-blue-500/60
                              focus:ring-2 focus:ring-blue-500/20
                            "
                          />
                        ) : (
                          <p className="text-zinc-300">
                            {pessoa.cpf || "Não informado"}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        <span
                          className={`
                            inline-flex items-center rounded-full border px-2.5 py-1
                            text-xs font-semibold
                            ${
                              pessoa.ativo
                                ? "border-green-500/30 bg-green-500/10 text-green-300"
                                : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"
                            }
                          `}
                        >
                          {pessoa.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      
                    {podeGerenciar && (
                      <td className="px-5 py-3 align-middle">
                        <div className="flex flex-wrap justify-end gap-2">
                          {estaEditando ? (
                            <>
                              <button
                                  onClick={() => salvarEdicaoPessoa(pessoa.id!)}
                                  disabled={acaoEmAndamento === `salvar_${pessoa.id}`}
                                  className="
                                    rounded-lg border border-blue-500/40
                                    bg-blue-600 px-3 py-2 text-xs font-semibold text-white
                                    transition hover:bg-blue-500
                                    disabled:cursor-not-allowed disabled:opacity-50
                                  "
                                >
                                  {acaoEmAndamento === `salvar_${pessoa.id}`
                                    ? "Salvando..."
                                    : "Salvar"}
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
                                onClick={() => iniciarEdicao(pessoa)}
                                className="
                                  rounded-lg border border-zinc-700
                                  bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100
                                  transition hover:bg-zinc-700
                                "
                              >
                                Editar
                              </button>

                              {pessoa.id && (
                                <button
                                  onClick={() => alternarStatus(pessoa.id!, pessoa.ativo)}
                                  disabled={acaoEmAndamento === `status_${pessoa.id}`}
                                  className={`
                                    rounded-lg border px-3 py-2 text-xs font-semibold transition
                                    disabled:cursor-not-allowed disabled:opacity-50
                                    ${
                                      pessoa.ativo
                                        ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                                        : "border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20"
                                    }
                                  `}
                                >
                                  {acaoEmAndamento === `status_${pessoa.id}`
                                    ? "Aguarde..."
                                    : pessoa.ativo
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