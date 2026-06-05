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

import { Input } from "../../components/ui/Input"
import { Botao } from "../../components/ui/Botao"
import { BadgeStatus } from "../../components/ui/BadgeStatus"
import { ToolbarPagina } from "../../components/ui/ToolbarPagina"

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


  /* Configurar título da página */
    useEffect(() => {
    document.title = "Controle de Atendimento - Cargos"
  }, [])


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
    <div className="space-y-6">

      {/*CABEÇALHO DA PÁGINA*/}

      <ToolbarPagina
        titulo="Cargos"
        descricao="Cadastro de cargos e funções dos profissionais."
      >
        <div className="w-full md:w-96">
          <Input
            placeholder="Pesquisar por nome do cargo"
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
              Cadastrar cargo
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Informe o nome do cargo que será vinculado aos profissionais.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px]">
            {/* INPUT DO NOVO CARGO */}
            <Input
              placeholder="Ex: Advogado, Recepcionista, Coordenador"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            {/* BOTÃO ADICIONAR */}
            <Botao
              onClick={adicionarCargo}
              disabled={acaoEmAndamento === "adicionar_cargo"}
              variante="primario"
              className="h-11 px-5"
            >
              {acaoEmAndamento === "adicionar_cargo"
                ? "Adicionando..."
                : "Adicionar cargo"}
            </Botao>
          </div>
        </section>
      )}

      {/* =====================================================
          CARD DA LISTAGEM
          ===================================================== */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        {/* CABEÇALHO DA LISTAGEM */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Cargos cadastrados
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {cargosFiltrados.length} registro(s) encontrado(s)
            </p>
          </div>
        </div>

        {/* =====================================================
            ESTADO VAZIO
            ===================================================== */}
        {cargosFiltrados.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nenhum cargo encontrado.
            </p>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Cadastre um novo cargo ou ajuste o termo pesquisado.
            </p>
          </div>
        )}

        {/* =====================================================
            TABELA ADMINISTRATIVA
            ===================================================== */}
        {cargosFiltrados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              {/* CABEÇALHO DA TABELA */}
              <thead className="bg-zinc-100 text-xs uppercase tracking-wider text-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-500">
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
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {cargosFiltrados.map((cargo) => {
                  const estaEditando = editandoId === cargo.id

                  return (
                    <tr
                      key={cargo.id}
                      className="transition hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    >
                      {/* COLUNA CARGO */}
                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <Input
                            value={nomeEdicao}
                            onChange={(e) => setNomeEdicao(e.target.value)}
                            className="h-10"
                          />
                        ) : (
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {cargo.nome}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              Cadastro de cargo profissional
                            </p>
                          </div>
                        )}
                      </td>

                      {/* COLUNA STATUS */}
                      <td className="px-5 py-3 align-middle">

                        {/* Status dos cargos cadastrados */}
                        <BadgeStatus
                          status={cargo.ativo ? "ativo" : "inativo"}
                        />
                        
                      </td>

                      {/* COLUNA AÇÕES */}
                      <td className="px-5 py-3 align-middle">
                        <div className="flex justify-end gap-2">
                          {estaEditando ? (
                            <>
                              {/* BOTÃO SALVAR */}
                              <Botao
                                onClick={() => salvarEdicaoCargo(cargo.id!)}
                                disabled={acaoEmAndamento === `salvar_${cargo.id}`}
                                className="px-2 py-1.5 text-xs"
                              >
                                {acaoEmAndamento === `salvar_${cargo.id}`
                                  ? "Salvando..."
                                  : "Salvar"}
                              </Botao>

                              {/* BOTÃO CANCELAR */}
                              <Botao
                                onClick={cancelarEdicao}
                                disabled={acaoEmAndamento !== ""}
                                variante="secundario"
                                className="px-2 py-1.5 text-xs"
                              >
                                Cancelar
                              </Botao>
                            </>
                          ) : (
                            <>
                              {/* BOTÃO EDITAR */}
                              <Botao
                                onClick={() => iniciarEdicao(cargo)}
                                disabled={acaoEmAndamento !== ""}
                                variante="secundario"
                                className="px-2 py-1.5 text-xs"
                              >
                                Editar
                              </Botao>

                              {/* BOTÃO INATIVAR / REATIVAR */}
                              {cargo.id && (
                                <Botao
                                  onClick={() =>
                                    alternarStatusCargo(
                                      cargo.id!,
                                      cargo.ativo
                                    )
                                  }
                                  disabled={acaoEmAndamento === `status_${cargo.id}`}

                                  variante={
                                    cargo.ativo
                                      ? "perigo"
                                      : "sucesso"
                                  }
                                  className="px-2 py-1.5 text-xs"
                                >
                                  {acaoEmAndamento === `status_${cargo.id}`
                                    ? "Aguarde..."
                                    : cargo.ativo
                                      ? "Inativar"
                                      : "Reativar"}
                                </Botao>
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