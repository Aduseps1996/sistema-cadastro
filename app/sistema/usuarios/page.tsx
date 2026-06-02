"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
  getDocs,
  where
} from "firebase/firestore"

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "firebase/auth"

import {
  db,
  auth,
  secondaryAuth
} from "../../../lib/firebase"

import { Botao } from "../../components/ui/Botao"
import { Input } from "../../components/ui/Input"
import { Select } from "../../components/ui/Select"
import { BadgeStatus } from "../../components/ui/BadgeStatus"
import { ToolbarPagina } from "../../components/ui/ToolbarPagina"

// =====================================================
// TIPO DO USUÁRIO
// =====================================================
// Representa a estrutura dos documentos da coleção "usuarios".
type Usuario = {
  id?: string
  uid?: string
  nome: string
  email: string
  perfil: string
  profissional_id?: string
  ativo: boolean
}

// =====================================================
// LISTA DE PERFIS DISPONÍVEIS
// =====================================================
// Perfis usados no controle de acesso do sistema.
const perfis = [
  "Administrador",
  "Recepção",
  "Atendente",
  "Consulta"
]

// =====================================================
// LISTA DE PROFISSIONAIS DISPONÍVEIS
// =====================================================
// Profissionais disponíveis para atribuição aos usuários.

type Profissional = {
  id?: string
  nome: string
  ativo: boolean
}

export default function UsuariosPage() {

  // =====================================================
  // ESTADOS DO FORMULÁRIO DE CADASTRO
  // =====================================================
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [perfil, setPerfil] = useState("")
  const [profissionalId, setProfissionalId] = useState("")

  // =====================================================
  // ESTADO DA PESQUISA
  // =====================================================
  const [pesquisa, setPesquisa] = useState("")

  // =====================================================
  // LISTA DE USUÁRIOS
  // =====================================================
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])

  // =====================================================
  // ESTADOS DA EDIÇÃO INLINE
  // =====================================================
  const [editandoId, setEditandoId] = useState("")
  const [nomeEdicao, setNomeEdicao] = useState("")
  const [emailEdicao, setEmailEdicao] = useState("")
  const [perfilEdicao, setPerfilEdicao] = useState("")
  const [acaoEmAndamento, setAcaoEmAndamento] = useState("")
  const [profissionalIdEdicao, setProfissionalIdEdicao] = useState("")

  const [carregando, setCarregando] = useState(false)

  // =====================================================
  // CONSULTA EM TEMPO REAL
  // =====================================================
  // Busca os usuários cadastrados e atualiza automaticamente.
  useEffect(() => {

    const consulta = query(
      collection(db, "usuarios"),
      orderBy("nome", "asc")
    )

    const unsubscribe = onSnapshot(consulta, (resultado) => {

      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Usuario[]

      setUsuarios(lista)
    })

    return () => unsubscribe()

  }, [])

  useEffect(() => {
    const consulta = query(
      collection(db, "profissionais"),
      orderBy("nome", "asc")
    )

    const unsubscribe = onSnapshot(consulta, (resultado) => {
      const lista = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      })) as Profissional[]

      setProfissionais(lista)
    })

    return () => unsubscribe()
  }, [])

  // =====================================================
  // CADASTRAR NOVO USUÁRIO
  // =====================================================
  // Cria:
  // 1. usuário no Firebase Authentication;
  // 2. documento na coleção "usuarios".
  async function adicionarUsuario() {

    if (nome.trim() === "") {
      toast.warning("Informe o nome.")
      return
    }

    if (email.trim() === "") {
      toast.warning("Informe o e-mail.")
      return
    }

    if (senha.trim() === "") {
      toast.warning("Informe a senha.")
      return
    }

    if (senha.length < 6) {
      toast.warning("A senha precisa ter pelo menos 6 caracteres.")
      return
    }

    if (perfil === "Atendente" && profissionalId === "") {
      toast.warning("Vincule um profissional ao usuário atendente.")
      return
    }

    if (perfil === "") {
      toast.warning("Selecione o perfil.")
      return
    }

    const emailFormatado =
      email.trim().toLowerCase()

    // =====================================================
    // VALIDAÇÃO DE E-MAIL DUPLICADO
    // =====================================================
    const emailExiste = usuarios.some(
      (usuario) =>
        usuario.email.toLowerCase() === emailFormatado
    )

    if (emailExiste) {
      toast.warning("Este e-mail já está cadastrado.")
      return
    }

    // =====================================================
    // CRIAÇÃO NO FIREBASE AUTH
    // =====================================================
    try {
      setAcaoEmAndamento("adicionar_usuario")

      const credencial =
        await createUserWithEmailAndPassword(
          secondaryAuth,
          emailFormatado,
          senha
        )

      await setDoc(doc(db, "usuarios", credencial.user.uid), {
        uid: credencial.user.uid,
        nome: nome.trim(),
        email: emailFormatado,
        perfil,
        profissional_id: perfil === "Atendente" ? profissionalId : null,
        ativo: true,
        criado_em: serverTimestamp(),
        atualizado_em: serverTimestamp()
      })

      await signOut(secondaryAuth)

      setNome("")
      setEmail("")
      setSenha("")
      setPerfil("")
      setProfissionalId("")

      toast.success("Usuário cadastrado com sucesso.")

    } catch (error) {
      console.error(error)
      toast.error("Erro ao cadastrar usuário.")

    } finally {
      setAcaoEmAndamento("")
    }

  }

  // =====================================================
  // SALVAR EDIÇÃO
  // =====================================================
  async function salvarEdicaoUsuario(id: string) {

    if (nomeEdicao.trim() === "") {
      toast.warning("Informe o nome.")
      return
    }

    if (emailEdicao.trim() === "") {
      toast.warning("Informe o e-mail.")
      return
    }

    if (perfilEdicao === "") {
      toast.warning("Selecione o perfil.")
      return
    }

    if (perfilEdicao === "Atendente" && profissionalIdEdicao === "") {
      toast.warning("Vincule um profissional ao usuário atendente.")
      return
    }

    const emailFormatado =
      emailEdicao.trim().toLowerCase()

    // =====================================================
    // VALIDAÇÃO DE E-MAIL DUPLICADO
    // =====================================================
    const emailExiste = usuarios.some(
      (usuario) =>
        usuario.id !== id &&
        usuario.email.toLowerCase() === emailFormatado
    )

    if (emailExiste) {
      toast.warning("Este e-mail já está cadastrado.")
      return
    }

    try {
      setAcaoEmAndamento(`salvar_${id}`)

      await updateDoc(doc(db, "usuarios", id), {
        nome: nomeEdicao.trim(),
        email: emailFormatado,
        perfil: perfilEdicao,
        profissional_id: perfilEdicao === "Atendente" ? profissionalIdEdicao : null,
        atualizado_em: serverTimestamp()
      })

      toast.success("Usuário atualizado.")

      cancelarEdicao()

    } catch (error) {
      console.error(error)
      toast.error("Erro ao salvar alterações.")

    } finally {
      setAcaoEmAndamento("")
    }

  }

  // =====================================================
  // INATIVAR / REATIVAR
  // =====================================================
  async function alternarStatus(id: string, ativoAtual: boolean) {
    if (acaoEmAndamento) return

    try {
      setAcaoEmAndamento(`status_${id}`)

      await updateDoc(doc(db, "usuarios", id), {
        ativo: !ativoAtual,
        atualizado_em: serverTimestamp()
      })

      toast.success(
        ativoAtual
          ? "Usuário inativado."
          : "Usuário reativado."
      )
    } catch (error) {
      console.error(error)
      toast.error("Erro ao alterar status do usuário.")
    } finally {
      setAcaoEmAndamento("")
    }
  }
  // =====================================================
  // REDEFINIR SENHA
  // =====================================================
  // Envia e-mail de redefinição para o usuário.
  async function redefinirSenha(emailUsuario: string) {
    const emailFormatado = emailUsuario.trim().toLowerCase()

    if (emailFormatado === "") {
      toast.warning("E-mail inválido.")
      return
    }

    try {
      setAcaoEmAndamento(`senha_${emailFormatado}`)

      const consultaUsuario = query(
        collection(db, "usuarios"),
        where("email", "==", emailFormatado)
      )

      const resultado = await getDocs(consultaUsuario)

      if (resultado.empty) {
        toast.warning("E-mail não cadastrado no sistema.")
        return
      }

      const usuarioDoc = resultado.docs[0].data()

      if (!usuarioDoc.ativo) {
        toast.warning("Usuário inativo. Procure o administrador.")
        return
      }

      await sendPasswordResetEmail(
        auth,
        emailFormatado
      )

      toast.success("E-mail de redefinição enviado.")
    } catch (error) {
      console.error(error)
      toast.error("Não foi possível enviar o e-mail.")
    } finally {
      setAcaoEmAndamento("")
    }
  }

  // =====================================================
  // INICIAR EDIÇÃO
  // =====================================================
  function iniciarEdicao(usuario: Usuario) {

    setEditandoId(usuario.id || "")
    setNomeEdicao(usuario.nome)
    setEmailEdicao(usuario.email)
    setPerfilEdicao(usuario.perfil)
    setProfissionalIdEdicao(usuario.profissional_id || "")
  }

  // =====================================================
  // CANCELAR EDIÇÃO
  // =====================================================
  function cancelarEdicao() {

    setEditandoId("")
    setNomeEdicao("")
    setEmailEdicao("")
    setPerfilEdicao("")
    setProfissionalIdEdicao("")
  }

  // =====================================================
  // FILTRO LOCAL DA TABELA
  // =====================================================
  const usuariosFiltrados = usuarios.filter((usuario) => {

    const termo =
      pesquisa.toLowerCase().trim()

    return (
      usuario.nome.toLowerCase().includes(termo) ||
      usuario.email.toLowerCase().includes(termo) ||
      usuario.perfil.toLowerCase().includes(termo)
    )
  })

  return (

    // =====================================================
    // CONTAINER PRINCIPAL
    // =====================================================
    <div className="space-y-6">

      {/* =====================================================
          CABEÇALHO DA PÁGINA
          ===================================================== */}
      <ToolbarPagina
        titulo="Usuários"
        descricao="Cadastro e gerenciamento dos usuários do sistema."
      >
        <div className="w-full md:w-96">
          <Input
            placeholder="Pesquisar por nome, e-mail ou perfil"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
          />
        </div>
      </ToolbarPagina>

      {/* =====================================================
          CARD DE CADASTRO
          ===================================================== */}
      <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80 p-5 shadow-sm">

        <div className="mb-4">

          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Cadastrar usuário
          </h2>

          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Cadastre usuários com perfil de acesso ao sistema.
          </p>

        </div>

        {/* FORMULÁRIO */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">

          {/* NOME */}
          <Input
            placeholder="Nome"
            value={nome}
            onChange={(e) =>
              setNome(e.target.value)
            }
          />

          {/* E-MAIL */}
          <Input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          {/* SENHA */}
          <Input
            type="password"
            placeholder="Senha inicial"
            value={senha}
            onChange={(e) =>
              setSenha(e.target.value)
            }
          />

          {/* PERFIL */}
          <Select
            value={perfil}
            onChange={(e) => {
              setPerfil(e.target.value)

              if (e.target.value !== "Atendente") {
                setProfissionalId("")
              }
            }}
          >
            <option value="">
              Perfil
            </option>

            {perfis.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </Select>

          {perfil === "Atendente" && (
            <Select
              value={profissionalId}
              onChange={(e) => setProfissionalId(e.target.value)}
            >
              <option value="">Vincular profissional</option>

              {profissionais
                .filter((profissional) => profissional.ativo)
                .map((profissional) => (
                  <option key={profissional.id} value={profissional.id}>
                    {profissional.nome}
                  </option>
                ))}
            </Select>
          )}

        </div>

        {/* BOTÃO */}
        <Botao
          onClick={adicionarUsuario}
          variante="primario"
          className="h-11 px-5 mt-4"
        >
          Adicionar usuário
        </Botao>

      </section>

      {/* =====================================================
          TABELA DE USUÁRIOS
          ===================================================== */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80 shadow-sm">

        {/* TOPO DA TABELA */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 px-5 py-4">

          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Usuários cadastrados
          </h2>

          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {usuariosFiltrados.length} registro(s) encontrado(s)
          </p>

        </div>

        {/* ESTADO VAZIO */}
        {usuariosFiltrados.length === 0 && (
          <div className="px-5 py-10 text-center">

            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nenhum usuário encontrado.
            </p>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Cadastre um novo usuário ou ajuste a pesquisa.
            </p>

          </div>
        )}

        {/* TABELA */}
        {usuariosFiltrados.length > 0 && (
          <div className="overflow-x-auto">

            <table className="w-full border-collapse text-sm">

              {/* CABEÇALHO */}
              <thead className="bg-zinc-100 text-xs uppercase tracking-wider text-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-400">

                <tr>

                  <th className="px-5 py-3 text-left font-semibold">
                    Usuário
                  </th>

                  <th className="px-5 py-3 text-left font-semibold">
                    Perfil
                  </th>

                  <th className="w-32 px-5 py-3 text-left font-semibold">
                    Status
                  </th>

                  <th className="w-80 px-5 py-3 text-right font-semibold">
                    Ações
                  </th>

                </tr>

              </thead>

              {/* CORPO */}
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">

                {usuariosFiltrados.map((usuario) => {

                  const estaEditando =
                    editandoId === usuario.id

                  return (

                    <tr
                      key={usuario.id}
                      className="transition hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    >

                      {/* COLUNA USUÁRIO */}
                      <td className="px-5 py-3 align-middle">

                        {estaEditando ? (

                          <div className="grid grid-cols-1 gap-2">

                            <Input
                              placeholder="Nome"
                              value={nomeEdicao}
                              onChange={(e) =>
                                setNomeEdicao(e.target.value)
                              }
                            />

                            <Input
                              type="email"
                              placeholder="E-mail"
                              value={emailEdicao}
                              onChange={(e) =>
                                setEmailEdicao(e.target.value)
                              }
                            />

                          </div>

                        ) : (

                          <div>

                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {usuario.nome}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              {usuario.email}
                            </p>

                          </div>

                        )}

                      </td>

                      {/* COLUNA PERFIL */}
                      <td className="px-5 py-3 align-middle">
                        {estaEditando ? (
                          <div className="grid grid-cols-1 gap-2">
                            <Select
                              value={perfilEdicao}
                              onChange={(e) => {
                                setPerfilEdicao(e.target.value)

                                if (e.target.value !== "Atendente") {
                                  setProfissionalIdEdicao("")
                                }
                              }}
                            >
                              <option value="">Perfil</option>

                              {perfis.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </Select>

                            {perfilEdicao === "Atendente" && (
                              <Select
                                value={profissionalIdEdicao}
                                onChange={(e) => setProfissionalIdEdicao(e.target.value)}
                              >
                                <option value="">Vincular profissional</option>

                                {profissionais
                                  .filter((profissional) => profissional.ativo)
                                  .map((profissional) => (
                                    <option key={profissional.id} value={profissional.id}>
                                      {profissional.nome}
                                    </option>
                                  ))}
                              </Select>
                            )}
                          </div>
                        ) : (
                          <div>
                            <p className="text-zinc-700 dark:text-zinc-300">
                              {usuario.perfil}
                            </p>

                            {usuario.profissional_id && (
                              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                Profissional vinculado:{" "}
                                {profissionais.find(
                                  (profissional) => profissional.id === usuario.profissional_id
                                )?.nome || "Não encontrado"}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* COLUNA STATUS */}
                      <td className="px-5 py-3 align-middle">

                        {/* Status dos usuários cadastrados */}
                        <BadgeStatus
                          status={usuario.ativo ? "Ativo" : "Inativo"}
                        />

                      </td>

                      {/* COLUNA AÇÕES */}
                      <td className="px-5 py-3 align-middle">

                        <div className="flex justify-end gap-2 whitespace-nowrap">

                          {estaEditando ? (

                            <>
                              {/* SALVAR */}
                              <Botao
                                onClick={() =>
                                  salvarEdicaoUsuario(usuario.id!)
                                }
                                variante="primario"
                                className="px-2 py-1.5 text-xs"
                              >
                                Salvar
                              </Botao>

                              {/* CANCELAR */}
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
                              {/* EDITAR */}
                              <Botao
                                onClick={() =>
                                  iniciarEdicao(usuario)
                                }
                                variante="secundario"
                                className="px-2 py-1.5 text-xs"
                              >
                                Editar
                              </Botao>

                              {/* REDEFINIR SENHA */}
                              <Botao
                                onClick={() =>
                                  redefinirSenha(usuario.email)
                                }
                                disabled={
                                  acaoEmAndamento === `senha_${usuario.email}`
                                }
                                variante="info"
                                className="px-2 py-1.5 text-xs"
                              >
                                {acaoEmAndamento === `senha_${usuario.email}`
                                  ? "Enviando..."
                                  : "Redefinir senha"}
                              </Botao>

                              {/* Botão de status */}
                              {usuario.id && (
                                <Botao
                                  onClick={() =>
                                    alternarStatus(
                                      usuario.id!,
                                      usuario.ativo
                                    )
                                  }
                                  variante={
                                    usuario.ativo
                                      ? "perigo"
                                      : "sucesso"
                                  }
                                  className="px-2 py-1.5 text-xs"
                                >
                                  {usuario.ativo
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