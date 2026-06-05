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
import { BadgeStatus } from "../../components/ui/BadgeStatus"
import { ToolbarPagina } from "@/app/components/ui/ToolbarPagina"

type Convenio = {
  id?: string
  nome: string
  ativo: boolean
}

export default function ConveniosPage() {
  const { usuarioSistema } = useUsuario()

  const podeGerenciar =
    usuarioSistema?.perfil === "Administrador" ||
    usuarioSistema?.perfil === "Recepção"

  const [nome, setNome] = useState("")
  const [pesquisa, setPesquisa] = useState("")
  const [convenios, setConvenios] = useState<Convenio[]>([])

  const [editandoId, setEditandoId] = useState("")
  const [nomeEdicao, setNomeEdicao] = useState("")

  const [acaoEmAndamento, setAcaoEmAndamento] = useState("")

  /* Configurar título da página */
  useEffect(() => {
    document.title = "Controle de Atendimento - Convênios"
  }, [])


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

  async function adicionarConvenio() {
    if (!podeGerenciar) {
      toast.warning("Você não tem permissão.")
      return
    }

    if (acaoEmAndamento) return

    if (nome.trim() === "") {
      toast.warning("Informe o nome do convênio.")
      return
    }

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

  function iniciarEdicao(convenio: Convenio) {
    setEditandoId(convenio.id || "")
    setNomeEdicao(convenio.nome)
  }

  function cancelarEdicao() {
    setEditandoId("")
    setNomeEdicao("")

    toast.success("Edição cancelada.")
  }

  const conveniosFiltrados = convenios.filter((convenio) =>
    convenio.nome
      .toLowerCase()
      .includes(pesquisa.toLowerCase().trim())
  )

  return (
    <div className="space-y-6">
      
      {/* CABEÇALHO */}
      <ToolbarPagina
          titulo="Convênios"
          descricao="Cadastro e gerenciamento dos convênios do sistema."
        >
          <div className="w-full md:w-96">
            <Input
              placeholder="Pesquisar por nome, convênio"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
            />
          </div>
        </ToolbarPagina>

      {/* CARD DE CADASTRO */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Cadastrar convênio
          </h2>

          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Cadastre convênios e parcerias disponíveis no sistema.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px] items-center">
          <Input
            placeholder="Nome do convênio"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <Botao
            onClick={adicionarConvenio}
            disabled={acaoEmAndamento === "adicionar_convenio"}
            variante="primario"
            className="h-13 flex items-center justify-center"
          >
            {acaoEmAndamento === "adicionar_convenio"
              ? "Adicionando..."
              : "Adicionar convênio"}
          </Botao>
        </div>
      </section>

      {/* TABELA */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Convênios cadastrados
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {conveniosFiltrados.length} registro(s) encontrado(s)
            </p>
          </div>
        </div>

        {conveniosFiltrados.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nenhum convênio encontrado.
            </p>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Cadastre um novo convênio ou ajuste a pesquisa.
            </p>
          </div>
        )}

        {conveniosFiltrados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-100 text-xs uppercase tracking-wider text-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-500">
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

              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {conveniosFiltrados.map((convenio) => {
                  const estaEditando =
                    editandoId === convenio.id

                  return (
                    <tr
                      key={convenio.id}
                      className="transition hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    >
                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <Input
                            placeholder="Nome do convênio"
                            value={nomeEdicao}
                            onChange={(e) =>
                              setNomeEdicao(e.target.value)
                            }
                          />
                        ) : (
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {convenio.nome}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              Convênio cadastrado no sistema
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3 align-middle">
                        {/* Status dos convênios cadastrados */}
                        <BadgeStatus
                         status={convenio.ativo ? "ativo" : "inativo"}
                        />
                      </td>

                      <td className="px-5 py-3 align-middle">
                        <div className="flex justify-end gap-2">
                          {estaEditando ? (
                            <>
                              <Botao
                                onClick={() =>
                                  salvarEdicaoConvenio(convenio.id!)
                                }
                                variante="primario"
                                className="px-3 py-2 text-xs"
                              >
                                Salvar
                              </Botao>

                              <Botao
                                onClick={cancelarEdicao}
                                variante="secundario"
                                className="px-3 py-2 text-xs"
                              >
                                Cancelar
                              </Botao>
                            </>
                          ) : (
                            <>
                              <Botao
                                onClick={() => iniciarEdicao(convenio)}
                                variante="secundario"
                                className="px-2 py-1.5 text-xs"
                              >
                                Editar
                              </Botao>

                              {convenio.id && (
                                <Botao
                                  onClick={() =>
                                    alternarStatus(
                                      convenio.id!,
                                      convenio.ativo
                                    )
                                  }
                                    variante={
                                      convenio.ativo
                                        ? "perigo"
                                        : "sucesso"
                                    }
                                    className="px-2 py-1.5 text-xs"
                                >
                                  {convenio.ativo
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
