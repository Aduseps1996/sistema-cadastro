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

      {/* CABEÇALHO DA PÁGINA*/}

      <ToolbarPagina
        titulo="Representantes"
        descricao="Vínculo entre associados e seus representantes."
      >
        <div className="w-full md:w-96">
          <Input
            placeholder="Pesquisar por representante, associado ou tipo"
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
              Cadastrar representante
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Vincule uma pessoa como representante de um associado.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_220px]">
            {/* BUSCA DO ASSOCIADO */}

            <div className="relative">
              <Input
                placeholder="Buscar associado por nome ou matrícula"
                value={buscaAssociado}
                onChange={(e) => {
                  setBuscaAssociado(e.target.value)
                  setAssociadoId("")
                }}
              />

              {buscaAssociado.trim().length >= 2 && associadoId === "" && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                  {associadosEncontrados.length === 0 && (
                    <p className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
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
                        w-full px-4 py-3 text-left text-sm text-zinc-700
                        transition hover:bg-zinc-100
                        dark:text-zinc-200 dark:hover:bg-zinc-800
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
              <Input
                placeholder="Buscar pessoa representante"
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

            {/* TIPO DO REPRESENTANTE */}

            <Select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="">Tipo</option>

              {tiposRepresentante.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>

          <Botao
            onClick={adicionarRepresentante}
            disabled={acaoEmAndamento === "adicionar_representante"}
            variante="primario"
            className="mt-4"
          >
            {acaoEmAndamento === "adicionar_representante"
              ? "Adicionando..."
              : "Adicionar representante"}
          </Botao>
        </section>
      )}

      {/* =====================================================
          TABELA DE REPRESENTANTES
          ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Representantes cadastrados
          </h2>

          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {representantesFiltrados.length} registro(s) encontrado(s)
          </p>
        </div>

        {representantesFiltrados.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nenhum representante encontrado.
            </p>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Cadastre um novo representante ou ajuste a pesquisa.
            </p>
          </div>
        )}

        {representantesFiltrados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-100 text-xs uppercase tracking-wider text-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-500">
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

              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {representantesFiltrados.map((representante) => {
                  const estaEditando = editandoId === representante.id

                  return (
                    <tr
                      key={representante.id}
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
                                  pessoa.id === representante.pessoa_id
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
                              {buscarPessoa(representante.pessoa_id)?.nome ||
                                "Pessoa não encontrada"}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              Pessoa vinculada como representante
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <Select
                            value={associadoIdEdicao}
                            onChange={(e) =>
                              setAssociadoIdEdicao(e.target.value)
                            }
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
                          </Select>
                        ) : (
                          <p className="text-zinc-700 dark:text-zinc-300">
                            {buscarNomeAssociado(representante.associado_id)}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <Select
                            value={tipoEdicao}
                            onChange={(e) => setTipoEdicao(e.target.value)}
                          >
                            <option value="">Tipo</option>

                            {tiposRepresentante.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <p className="text-zinc-700 dark:text-zinc-300">
                            {representante.tipo}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        
                        {/* Status dos representantes cadastrados */}
                        <BadgeStatus
                          status={representante.ativo ? "ativo" : "inativo"}
                        />
                        
                      </td>
                      {podeGerenciar && (
                        <td className="px-5 py-3 align-middle">
                          <div className="flex flex-wrap justify-end gap-2">
                            {estaEditando ? (
                              <>
                                <Botao
                                  onClick={() =>
                                    salvarEdicaoRepresentante(representante.id!)
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
                                  onClick={() => iniciarEdicao(representante)}
                                  variante="secundario"
                                  className="px-2 py-1.5 text-xs"
                                >
                                  Editar
                                </Botao>

                                {representante.id && (
                                  <Botao
                                    onClick={() =>
                                      alternarStatusRepresentante(
                                        representante.id!,
                                        representante.ativo
                                      )
                                    }
                                    disabled={acaoEmAndamento === `status_${representante.id}`}
                                    variante={
                                    representante.ativo
                                        ? "perigo"
                                        : "sucesso"
                                    }
                                    className="px-2 py-1.5 text-xs"
                                  >
                                    {acaoEmAndamento === `status_${representante.id}`
                                      ? "Aguarde..."
                                      : representante.ativo
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