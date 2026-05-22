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
import { formatarNome } from "../../utils/formatadores"

// =====================================================
// TIPO DO CARGO
// =====================================================
// Define o formato básico de um documento da coleção "cargos".
// id é opcional porque ele não vem dentro do documento do Firestore,
// ele é adicionado manualmente quando montamos a lista.
type Cargo = {
  id?: string
  nome: string
  ativo: boolean
}

export default function CargosPage() {

  // =====================================================
  // USUÁRIO LOGADO
  // =====================================================
  const { usuarioSistema } = useUsuario()

  // =====================================================
  // CONTROLE DE PERMISSÃO
  // =====================================================
  // Apenas Administrador e Recepção podem gerenciar cargos.
  const podeGerenciar =
    usuarioSistema?.perfil === "Administrador" ||
    usuarioSistema?.perfil === "Recepção"

  // =====================================================
  // ESTADOS DO FORMULÁRIO DE CADASTRO
  // =====================================================
  // nome: controla o input usado para cadastrar um novo cargo.
  const [nome, setNome] = useState("")

  // =====================================================
  // ESTADO DA PESQUISA
  // =====================================================
  // pesquisa: controla o campo de busca por nome do cargo.
  const [pesquisa, setPesquisa] = useState("")

  // =====================================================
  // ESTADO DA LISTA DE CARGOS
  // =====================================================
  // cargos: armazena todos os cargos vindos do Firestore.
  const [cargos, setCargos] = useState<Cargo[]>([])

  // =====================================================
  // CONTROLE DE PROCESSAMENTO DAS AÇÕES
  // =====================================================
  const [acaoEmAndamento, setAcaoEmAndamento] = useState("")

  // =====================================================
  // ESTADOS DA EDIÇÃO INLINE
  // =====================================================
  // editandoId: guarda o id do cargo que está sendo editado.
  // nomeEdicao: controla o input de edição do cargo.
  const [editandoId, setEditandoId] = useState("")
  const [nomeEdicao, setNomeEdicao] = useState("")


  // =====================================================
  // BUSCA EM TEMPO REAL DOS CARGOS
  // =====================================================
  // Esse useEffect cria um listener em tempo real na coleção "cargos".
  // Sempre que adicionar, editar, inativar ou reativar um cargo,
  // a lista atualiza automaticamente na tela.
  useEffect(() => {
    const consulta = query(
      collection(db, "cargos"),
      orderBy("nome", "asc")
    )

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Cargo[]

      setCargos(lista)
    })

    // Cancela o listener quando sair da página.
    return () => unsubscribe()
  }, [])

  // =====================================================
  // ADICIONAR NOVO CARGO
  // =====================================================
  // Valida o campo nome e grava um novo documento na coleção "cargos".
  async function adicionarCargo() {

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
    // VALIDAÇÃO
    // =====================================================
    if (nome.trim() === "") {
      toast.warning("Informe o nome do cargo.")
      return
    }

    // =====================================================
    // EVITA CARGO DUPLICADO
    // =====================================================
    const cargoExiste = cargos.some(
      (item) =>
        item.nome.toLowerCase() ===
        nome.trim().toLowerCase()
    )

    if (cargoExiste) {
      toast.warning("Esse cargo já existe.")
      return
    }

    try {

      setAcaoEmAndamento("adicionar_cargo")

      await addDoc(collection(db, "cargos"), {
        nome: formatarNome(nome),
        ativo: true,
        criado_em: serverTimestamp(),
        atualizado_em: serverTimestamp()
      })

      setNome("")

      toast.success("Cargo cadastrado.")

    } catch (error) {

      console.error(error)

      toast.error("Erro ao cadastrar cargo.")

    } finally {

      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // SALVAR EDIÇÃO DO CARGO
  // =====================================================
  // Atualiza apenas o nome e a data de atualização do cargo.
  async function salvarEdicaoCargo(id: string) {

    if (!podeGerenciar) {
      toast.warning("Você não tem permissão.")
      return
    }

    if (acaoEmAndamento) return

    if (nomeEdicao.trim() === "") {
      toast.warning("Informe o nome do cargo.")
      return
    }

    try {

      setAcaoEmAndamento(`salvar_${id}`)

      await updateDoc(doc(db, "cargos", id), {
        nome: formatarNome(nomeEdicao),
        atualizado_em: serverTimestamp()
      })

      cancelarEdicao()

      toast.success("Cargo atualizado.")

    } catch (error) {

      console.error(error)

      toast.error("Erro ao atualizar cargo.")

    } finally {

      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // INATIVAR OU REATIVAR CARGO
  // =====================================================
  // Não exclui o cargo do banco.
  // Apenas alterna o campo ativo entre true e false.
  async function alternarStatusCargo(
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

      await updateDoc(doc(db, "cargos", id), {
        ativo: !ativoAtual,
        atualizado_em: serverTimestamp()
      })

      toast.success(
        ativoAtual
          ? "Cargo inativado."
          : "Cargo reativado."
      )

    } catch (error) {

      console.error(error)

      toast.error("Erro ao alterar status.")

    } finally {

      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // INICIAR EDIÇÃO INLINE
  // =====================================================
  // Coloca uma linha da tabela em modo de edição.
  function iniciarEdicao(cargo: Cargo) {
    setEditandoId(cargo.id || "")
    setNomeEdicao(cargo.nome)
  }

  // =====================================================
  // CANCELAR EDIÇÃO INLINE
  // =====================================================
  // Limpa os estados de edição e volta a linha para o modo normal.
  function cancelarEdicao() {
    setEditandoId("")
    setNomeEdicao("")

    toast.success("Edição cancelada.")
  }

  // =====================================================
  // FILTRO DE CARGOS POR NOME
  // =====================================================
  // Filtra os cargos localmente, sem nova consulta ao Firestore.
  const cargosFiltrados = cargos.filter((cargo) =>
    cargo.nome.toLowerCase().includes(pesquisa.toLowerCase().trim())
  )

  return (
    // =====================================================
    // CONTAINER PRINCIPAL DA PÁGINA
    // =====================================================
    // Aqui não usamos mais min-h-screen nem bg-zinc-950,
    // porque isso já vem do layout principal do sistema.
    <div className="space-y-6">

      {/* =====================================================
          CABEÇALHO DA PÁGINA
          =====================================================
          Área superior com título, descrição e busca.
          Esse padrão depois pode ser repetido em outras páginas.
      */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Cargos
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Cadastro de cargos e funções dos profissionais.
          </p>
        </div>

        {/* CAMPO DE BUSCA */}
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

      {/* =====================================================
          CARD DE CADASTRO
          =====================================================
          Bloco usado para cadastrar um novo cargo.
          Visual mais compacto, com menos altura e melhor alinhamento.
      */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-zinc-100">
            Novo cargo
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Informe o nome do cargo que será vinculado aos profissionais.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px]">
          {/* INPUT DO NOVO CARGO */}
          <input
            type="text"
            placeholder="Ex: Advogado, Recepcionista, Coordenador"
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

          {/* BOTÃO ADICIONAR */}
          <button
            onClick={adicionarCargo}
            disabled={acaoEmAndamento === "adicionar_cargo"}
            className="
              h-11 rounded-xl border border-blue-500/40
              bg-blue-600 px-5 text-sm font-semibold text-white
              transition hover:bg-blue-500
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {acaoEmAndamento === "adicionar_cargo"
              ? "Adicionando..."
              : "Adicionar cargo"}
          </button>
        </div>
      </section>

      {/* =====================================================
          CARD DA LISTAGEM
          =====================================================
          Bloco que exibe a lista de cargos cadastrados.
          Agora usa aparência de tabela administrativa.
      */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-sm overflow-hidden">

        {/* CABEÇALHO DA LISTAGEM */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Cargos cadastrados
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {cargosFiltrados.length} registro(s) encontrado(s)
            </p>
          </div>
        </div>

        {/* =====================================================
            ESTADO VAZIO
            =====================================================
            Exibido quando não existe cargo ou quando a busca não encontra nada.
        */}
        {cargosFiltrados.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-zinc-300">
              Nenhum cargo encontrado.
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Cadastre um novo cargo ou ajuste o termo pesquisado.
            </p>
          </div>
        )}

        {/* =====================================================
            TABELA ADMINISTRATIVA
            =====================================================
            Em sistemas administrativos, tabela é melhor que card
            para cadastro simples. Fica mais compacto e profissional.
        */}
        {cargosFiltrados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">

              {/* CABEÇALHO DA TABELA */}
              <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
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

              {/* CORPO DA TABELA */}
              <tbody className="divide-y divide-zinc-800">
                {cargosFiltrados.map((cargo) => {
                  const estaEditando = editandoId === cargo.id

                  return (
                    <tr
                      key={cargo.id}
                      className="transition hover:bg-zinc-800/50"
                    >
                      {/* COLUNA CARGO */}
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
                              {cargo.nome}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500">
                              Cadastro de cargo profissional
                            </p>
                          </div>
                        )}
                      </td>

                      {/* COLUNA STATUS */}
                      <td className="px-5 py-3 align-middle">
                        <span
                          className={`
                            inline-flex items-center rounded-full border px-2.5 py-1
                            text-xs font-semibold
                            ${cargo.ativo
                              ? "border-green-500/30 bg-green-500/10 text-green-300"
                              : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"
                            }
                          `}
                        >
                          {cargo.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>

                      {/* COLUNA AÇÕES */}
                      <td className="px-5 py-3 align-middle">
                        <div className="flex justify-end gap-2">
                          {estaEditando ? (
                            <>
                              {/* BOTÃO SALVAR */}
                              <button
                                onClick={() => salvarEdicaoCargo(cargo.id!)}
                                className="
                                  rounded-lg border border-blue-500/40
                                  bg-blue-600 px-3 py-2 text-xs font-semibold text-white
                                  transition hover:bg-blue-500
                                "
                              >
                                Salvar
                              </button>

                              {/* BOTÃO CANCELAR */}
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
                              {/* BOTÃO EDITAR */}
                              <button
                                onClick={() => iniciarEdicao(cargo)}
                                className="
                                  rounded-lg border border-zinc-700
                                  bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100
                                  transition hover:bg-zinc-700
                                "
                              >
                                Editar
                              </button>

                              {/* BOTÃO INATIVAR / REATIVAR */}
                              {cargo.id && (
                                <button
                                  onClick={() =>
                                    alternarStatusCargo(
                                      cargo.id!,
                                      cargo.ativo
                                    )
                                  }
                                  disabled={acaoEmAndamento === `status_${cargo.id}`}
                                  className={`
                                    rounded-lg border px-3 py-2 text-xs font-semibold transition
                                    disabled:cursor-not-allowed disabled:opacity-50
                                    ${cargo.ativo
                                      ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                                      : "border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20"
                                    }
                                  `}
                                >
                                  {acaoEmAndamento === `status_${cargo.id}`
                                    ? "Aguarde..."
                                    : cargo.ativo
                                      ? "Inativar"
                                      : "Reativar"}
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
