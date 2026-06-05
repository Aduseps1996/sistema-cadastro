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

import {
  formatarCPF,
  formatarTelefone,
  formatarNome
} from "../../utils/formatadores"

import { Botao } from "../../components/ui/Botao"
import { Input } from "../../components/ui/Input"
import { BadgeStatus } from "../../components/ui/BadgeStatus"
import { ToolbarPagina } from "../../components/ui/ToolbarPagina"

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

  /* Configurar título da página */
  useEffect(() => {
    document.title = "Controle de Atendimento - Pessoas"
  }, [])

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
        nome: formatarNome(nome),
        telefone: telefone.replace(/\D/g, ""),
        email: email.trim().toLowerCase(),
        cpf: cpf.replace(/\D/g, ""),
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
        nome: formatarNome(nomeEdicao),
        telefone: telefoneEdicao.replace(/\D/g, ""),
        email: emailEdicao.trim().toLowerCase(),
        cpf: cpfEdicao.replace(/\D/g, ""),
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
    setNomeEdicao(formatarNome(pessoa.nome))
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

      {/*CABEÇALHO DA PÁGINA*/}

      <ToolbarPagina
        titulo="Pessoas"
        descricao="Cadastro geral de pessoas do sistema."
      >
        <div className="w-full md:w-96">
          <Input
            placeholder="Pesquisar por nome, telefone, e-mail ou CPF"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
          />
        </div>
      </ToolbarPagina>

      {/* =====================================================
          CARD DE CADASTRO
          ===================================================== */}

      {podeGerenciar && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Cadastrar pessoa
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Cadastre pessoas que poderão ser associadas, representantes ou atendidas.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <Input
              placeholder="Telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />

            <Input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              placeholder="CPF"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
            />
          </div>

          <Botao
            onClick={adicionarPessoa}
            disabled={acaoEmAndamento === "adicionar_pessoa"}
            variante="primario"
            className="mt-4"
          >
            {acaoEmAndamento === "adicionar_pessoa"
              ? "Adicionando..."
              : "Adicionar pessoa"}
          </Botao>
        </section>
      )}

      {/* =====================================================
          TABELA DE PESSOAS
          ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Pessoas cadastradas
          </h2>

          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {pessoasFiltradas.length} registro(s) encontrado(s)
          </p>
        </div>

        {pessoasFiltradas.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nenhuma pessoa encontrada.
            </p>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Cadastre uma nova pessoa ou ajuste a pesquisa.
            </p>
          </div>
        )}

        {pessoasFiltradas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-100 text-xs uppercase tracking-wider text-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-500">
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

              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {pessoasFiltradas.map((pessoa) => {
                  const estaEditando = editandoId === pessoa.id

                  return (
                    <tr
                      key={pessoa.id}
                      className="transition hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    >
                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <Input
                            placeholder="Nome"
                            value={nomeEdicao}
                            onChange={(e) => setNomeEdicao(e.target.value)}
                          />
                        ) : (
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {pessoa.nome}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              Cadastro geral de pessoa
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <div className="grid grid-cols-1 gap-2">
                            <Input
                              value={telefoneEdicao}
                              onChange={(e) => setTelefoneEdicao(e.target.value)}
                              placeholder="Telefone"
                            />

                            <Input
                              type="email"
                              value={emailEdicao}
                              onChange={(e) => setEmailEdicao(e.target.value)}
                              placeholder="E-mail"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="text-zinc-700 dark:text-zinc-300">
                              {pessoa.telefone
                                ? formatarTelefone(pessoa.telefone)
                                : "Sem telefone"}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              {pessoa.email || "Sem e-mail"}
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <Input
                            value={cpfEdicao}
                            onChange={(e) => setCpfEdicao(e.target.value)}
                            placeholder="CPF"
                          />
                        ) : (
                          <p className="text-zinc-700 dark:text-zinc-300">
                            {pessoa.cpf
                              ? formatarCPF(pessoa.cpf)
                              : "Não informado"}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        
                        {/* Status das pessoas cadastradas */}
                        <BadgeStatus
                          status={pessoa.ativo ? "ativo" : "inativo"}
                        />
                        
                      </td>

                      {podeGerenciar && (
                        <td className="px-5 py-3 align-middle">
                          <div className="flex flex-wrap justify-end gap-2">
                            {estaEditando ? (
                              <>
                                <Botao
                                  onClick={() => salvarEdicaoPessoa(pessoa.id!)}
                                  disabled={acaoEmAndamento === `salvar_${pessoa.id}`}
                                  variante="primario"
                                  className="px-2 py-1.5 text-xs"
                                >
                                  {acaoEmAndamento === `salvar_${pessoa.id}`
                                    ? "Salvando..."
                                    : "Salvar"}
                                </Botao>

                                <Botao
                                  onClick={cancelarEdicao}
                                  variante="secundario"
                                  className="px-2 py-1.5 text-xs"
                                >
                                  Cancelar
                                </Botao>
                              </>
                            ) : (
                              <>
                                <Botao
                                  onClick={() => iniciarEdicao(pessoa)}
                                  variante="secundario"
                                  className="px-2 py-1.5 text-xs"
                                >
                                  Editar
                                </Botao>

                                {pessoa.id && (
                                  <Botao
                                    onClick={() => alternarStatus(pessoa.id!, pessoa.ativo)}
                                    disabled={acaoEmAndamento === `status_${pessoa.id}`}
                                    variante={
                                      pessoa.ativo
                                        ? "perigo"
                                        : "sucesso"
                                    }
                                    className="px-2 py-1.5 text-xs"
                                  >
                                    {acaoEmAndamento === `status_${pessoa.id}`
                                      ? "Aguarde..."
                                      : pessoa.ativo
                                        ? "Inativar"
                                        : "Reativar"}
                                  </Botao>
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