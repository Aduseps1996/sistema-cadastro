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
// TIPO DO CONVÊNIO
// =====================================================
// Define os campos principais da coleção "convenios".
type Convenio = {
  id?: string
  nome: string
  ativo: boolean
}

export default function ConveniosPage() {

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

  // =====================================================
  // ESTADOS DO FORMULÁRIO
  // =====================================================
  // nome: controla o input de cadastro do convênio.
  const [nome, setNome] = useState("")

  // =====================================================
  // ESTADO DA PESQUISA
  // =====================================================
  // pesquisa: controla a busca local da tabela.
  const [pesquisa, setPesquisa] = useState("")

  // =====================================================
  // LISTA DE CONVÊNIOS
  // =====================================================
  // convenios: armazena todos os registros vindos do Firestore.
  const [convenios, setConvenios] = useState<Convenio[]>([])

  // =====================================================
  // ESTADOS DA EDIÇÃO INLINE
  // =====================================================
  // editandoId: controla qual linha está sendo editada.
  // nomeEdicao: controla o input de edição.
  const [editandoId, setEditandoId] = useState("")
  const [nomeEdicao, setNomeEdicao] = useState("")

  // =====================================================
  // CONTROLE DE PROCESSAMENTO DAS AÇÕES
  // =====================================================
  const [acaoEmAndamento, setAcaoEmAndamento] = useState("")

  // =====================================================
  // CONSULTA EM TEMPO REAL
  // =====================================================
  // Busca todos os convênios ordenados por nome.
  // Atualiza automaticamente sempre que houver alteração.
  useEffect(() => {
    const consulta = query(
      collection(db, "convenios"),
      orderBy("nome", "asc")
    )

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Convenio[]

      setConvenios(lista)
    })

    return () => unsubscribe()
  }, [])

  // =====================================================
  // ADICIONAR CONVÊNIO
  // =====================================================
  // Cria um novo documento na coleção "convenios".
  async function adicionarConvenio() {

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
      toast.warning("Informe o nome do convênio.")
      return
    }

    // =====================================================
    // EVITA DUPLICIDADE
    // =====================================================
    const convenioExiste = convenios.some(
      (item) =>
        item.nome.toLowerCase() ===
        nome.trim().toLowerCase()
    )

    if (convenioExiste) {
      toast.warning("Esse convênio já existe.")
      return
    }

    try {

      setAcaoEmAndamento("adicionar_convenio")

      await addDoc(collection(db, "convenios"), {
        nome: nome.trim(),
        ativo: true,
        criado_em: serverTimestamp(),
        atualizado_em: serverTimestamp()
      })

      setNome("")

      toast.success("Convênio cadastrado.")

    } catch (error) {

      console.error(error)

      toast.error("Erro ao cadastrar convênio.")

    } finally {

      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // SALVAR EDIÇÃO
  // =====================================================
  // Atualiza o nome do convênio.
  async function salvarEdicaoConvenio(id: string) {

    if (!podeGerenciar) {
      toast.warning("Você não tem permissão.")
      return
    }

    if (acaoEmAndamento) return

    if (nomeEdicao.trim() === "") {
      toast.warning("Informe o nome do convênio.")
      return
    }

    try {

      setAcaoEmAndamento(`salvar_${id}`)

      await updateDoc(doc(db, "convenios", id), {
        nome: nomeEdicao.trim(),
        atualizado_em: serverTimestamp()
      })

      cancelarEdicao()

      toast.success("Convênio atualizado.")

    } catch (error) {

      console.error(error)

      toast.error("Erro ao atualizar convênio.")

    } finally {

      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // INATIVAR / REATIVAR
  // =====================================================
  // Alterna o status ativo do convênio.
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

      await updateDoc(doc(db, "convenios", id), {
        ativo: !ativoAtual,
        atualizado_em: serverTimestamp()
      })

      toast.success(
        ativoAtual
          ? "Convênio inativado."
          : "Convênio reativado."
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
  // Ativa o modo edição da linha.
  function iniciarEdicao(convenio: Convenio) {
    setEditandoId(convenio.id || "")
    setNomeEdicao(convenio.nome)
  }

  // =====================================================
  // CANCELAR EDIÇÃO
  // =====================================================
  // Limpa os estados de edição.
  function cancelarEdicao() {
    setEditandoId("")
    setNomeEdicao("")

    toast.success("Edição cancelada.")
  }

  // =====================================================
  // FILTRO LOCAL DA TABELA
  // =====================================================
  // Filtra os convênios pela pesquisa digitada.
  const conveniosFiltrados = convenios.filter((convenio) =>
    convenio.nome
      .toLowerCase()
      .includes(pesquisa.toLowerCase().trim())
  )

  return (

    // =====================================================
    // CONTAINER PRINCIPAL
    // =====================================================
    // Não usamos mais bg-zinc-950 nem min-h-screen,
    // porque isso já vem do layout principal.
    <div className="space-y-6">

      {/* =====================================================
          CABEÇALHO DA PÁGINA
          ===================================================== */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

        {/* TÍTULO E DESCRIÇÃO */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Convênios
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Cadastro de convênios e parcerias.
          </p>
        </div>

        {/* CAMPO DE PESQUISA */}
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
          ===================================================== */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">

        <div className="mb-4">
          <h2 className="text-base font-semibold text-zinc-100">
            Novo convênio
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Cadastre convênios e parcerias disponíveis no sistema.
          </p>
        </div>

        {/* FORMULÁRIO */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px]">

          {/* INPUT */}
          <input
            type="text"
            placeholder="Nome do convênio"
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

          {/* BOTÃO */}
          <button
            onClick={adicionarConvenio}
            disabled={acaoEmAndamento === "adicionar_convenio"}
            className="
              h-11 rounded-xl border border-blue-500/40
              bg-blue-600 px-5 text-sm font-semibold text-white
              transition hover:bg-blue-500
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {acaoEmAndamento === "adicionar_convenio"
              ? "Adicionando..."
              : "Adicionar convênio"}
          </button>

        </div>

      </section>

      {/* =====================================================
          TABELA DE CONVÊNIOS
          ===================================================== */}
      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-sm">

        {/* TOPO DA TABELA */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">

          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Convênios cadastrados
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {conveniosFiltrados.length} registro(s) encontrado(s)
            </p>
          </div>

        </div>

        {/* =====================================================
            ESTADO VAZIO
            ===================================================== */}
        {conveniosFiltrados.length === 0 && (
          <div className="px-5 py-10 text-center">

            <p className="text-sm font-medium text-zinc-300">
              Nenhum convênio encontrado.
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Cadastre um novo convênio ou ajuste a pesquisa.
            </p>

          </div>
        )}

        {/* =====================================================
            TABELA
            ===================================================== */}
        {conveniosFiltrados.length > 0 && (
          <div className="overflow-x-auto">

            <table className="w-full border-collapse text-sm">

              {/* CABEÇALHO */}
              <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-500">

                <tr>

                  <th className="px-5 py-3 text-left font-semibold">
                    Convênio
                  </th>

                  <th className="w-32 px-5 py-3 text-left font-semibold">
                    Status
                  </th>

                  <th className="w-56 px-5 py-3 text-right font-semibold">
                    Ações
                  </th>

                </tr>

              </thead>

              {/* CORPO */}
              <tbody className="divide-y divide-zinc-800">

                {conveniosFiltrados.map((convenio) => {

                  const estaEditando =
                    editandoId === convenio.id

                  return (

                    <tr
                      key={convenio.id}
                      className="transition hover:bg-zinc-800/50"
                    >

                      {/* COLUNA NOME */}
                      <td className="px-5 py-3 align-middle">

                        {estaEditando ? (

                          <input
                            type="text"
                            value={nomeEdicao}
                            onChange={(e) =>
                              setNomeEdicao(e.target.value)
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

                          <div>

                            <p className="font-semibold text-zinc-100">
                              {convenio.nome}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500">
                              Convênio cadastrado no sistema
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
                            ${convenio.ativo
                              ? "border-green-500/30 bg-green-500/10 text-green-300"
                              : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"
                            }
                          `}
                        >
                          {convenio.ativo ? "Ativo" : "Inativo"}
                        </span>

                      </td>

                      {/* COLUNA AÇÕES */}
                      <td className="px-5 py-3 align-middle">

                        <div className="flex justify-end gap-2">

                          {estaEditando ? (

                            <>
                              {/* BOTÃO SALVAR */}
                              <button
                                onClick={() =>
                                  salvarEdicaoConvenio(convenio.id!)
                                }
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
                                onClick={() => iniciarEdicao(convenio)}
                                className="
                                  rounded-lg border border-zinc-700
                                  bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100
                                  transition hover:bg-zinc-700
                                "
                              >
                                Editar
                              </button>

                              {/* BOTÃO STATUS */}
                              {convenio.id && (
                                <button
                                  onClick={() =>
                                    alternarStatus(
                                      convenio.id!,
                                      convenio.ativo
                                    )
                                  }
                                  className={`
                                    rounded-lg border px-3 py-2 text-xs font-semibold transition
                                    ${convenio.ativo
                                      ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                                      : "border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20"
                                    }
                                  `}
                                >
                                  {convenio.ativo
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