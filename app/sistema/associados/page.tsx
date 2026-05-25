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

import { Botao } from "../../components/ui/Botao"
import { Input } from "../../components/ui/Input"
import { Select } from "../../components/ui/Select"
import { BadgeStatus } from "../../components/ui/BadgeStatus"
import { ToolbarPagina } from "../../components/ui/ToolbarPagina"


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
    if (!podeGerenciar) {
      toast.warning("Você não tem permissão para editar associados.")
      return
    }

    if (acaoEmAndamento) return

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

    try {
      setAcaoEmAndamento(`salvar_${id}`)

      await updateDoc(doc(db, "associados", id), {
        pessoa_id: pessoaIdEdicao,
        matricula: matriculaFormatada,
        atualizado_em: serverTimestamp()
      })

      toast.success("Associado atualizado.")
      cancelarEdicao()
    } catch (error) {
      console.error(error)
      toast.error("Erro ao atualizar associado.")
    } finally {
      setAcaoEmAndamento("")
    }
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
      {/*CABEÇALHO DA PÁGINA*/}

      <ToolbarPagina
        titulo="Associados"
        descricao="Cadastro e gerenciamento dos associados da ADUSEPS."
      >
        <div className="w-full md:w-96">
          <Input
            placeholder="Pesquisar por nome ou matrícula"
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
              Cadastrar associado
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Vincule uma pessoa cadastrada a uma matrícula de associado.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
            {/* BUSCA DA PESSOA */}

            <div className="relative">
              <Input
                placeholder="Buscar pessoa por nome"
                value={buscaPessoa}
                onChange={(e) => {
                  setBuscaPessoa(e.target.value)
                  setPessoaId("")
                }}
              />

              {buscaPessoa.trim().length >= 2 && pessoaId === "" && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                  {pessoasEncontradas.length === 0 && (
                    <p className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
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
                        w-full px-4 py-3 text-left text-sm text-zinc-700
                        transition hover:bg-zinc-100
                        dark:text-zinc-200 dark:hover:bg-zinc-800
                      "
                    >
                      {pessoa.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* MATRÍCULA */}

            <Input
              placeholder="Matrícula"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
            />
          </div>

          <Botao
            onClick={adicionarAssociado}
            disabled={acaoEmAndamento === "adicionar_associado"}
            variante="primario"
            className="mt-4"
          >
            {acaoEmAndamento === "adicionar_associado"
              ? "Adicionando..."
              : "Adicionar associado"}
          </Botao>
        </section>
      )}

      {/* =====================================================
          TABELA DE ASSOCIADOS
          ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Associados cadastrados
          </h2>

          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {associadosFiltrados.length} registro(s) encontrado(s)
          </p>
        </div>

        {associadosFiltrados.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nenhum associado encontrado.
            </p>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Cadastre um novo associado ou ajuste a pesquisa.
            </p>
          </div>
        )}

        {associadosFiltrados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-100 text-xs uppercase tracking-wider text-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-500">
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

              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {associadosFiltrados.map((associado) => {
                  const estaEditando = editandoId === associado.id

                  return (
                    <tr
                      key={associado.id}
                      className="transition hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    >
                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <Select
                            value={pessoaIdEdicao}
                            onChange={(e) => setPessoaIdEdicao(e.target.value)}
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
                          </Select>
                        ) : (
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {buscarNomePessoa(associado.pessoa_id)}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              Pessoa vinculada como associado
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <Input
                            placeholder="Matrícula"
                            value={matriculaEdicao}
                            onChange={(e) =>
                              setMatriculaEdicao(e.target.value)
                            }
                          />
                        ) : (
                          <p className="text-zinc-700 dark:text-zinc-300">
                            {associado.matricula}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        
                        {/* Status dos associados cadastrados */}
                        <BadgeStatus
                          status={associado.ativo ? "ativo" : "inativo"}
                        />
                        
                      </td>

                      {podeGerenciar && (
                        <td className="px-5 py-3 align-middle">
                          <div className="flex flex-wrap justify-end gap-2">
                            {estaEditando ? (
                              <>
                                <Botao
                                  onClick={() =>
                                    salvarEdicaoAssociado(associado.id!)
                                  }
                                  variante="primario"
                                  className="px-2 py-1.5 text-xs"
                                  >
                                  Salvar
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
                                  onClick={() => iniciarEdicao(associado)}
                                  variante="secundario"
                                  className="px-2 py-1.5 text-xs"
                                >
                                  Editar
                                </Botao>

                                {associado.id && (
                                  <Botao
                                    onClick={() =>
                                      alternarStatus(
                                        associado.id!,
                                        associado.ativo
                                      )
                                    }
                                    variante={
                                      associado.ativo
                                        ? "perigo"
                                        : "sucesso"
                                    }
                                    className="px-2 py-1.5 text-xs"
                                  >
                                    {associado.ativo ? "Inativar" : "Reativar"}
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