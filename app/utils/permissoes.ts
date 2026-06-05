export function podeAcessarPagina(
  perfil: string,
  pagina: string
) {

  if (perfil === "Administrador") {
    return true
  }

  if (perfil === "Recepção") {
    return [
      "/sistema/inicio",
      "/sistema/atendimentos",
      "/sistema/pessoas",
      "/sistema/associados",
      "/sistema/representantes",
      "/sistema/escala-atendimentos"
    ].includes(pagina)
  }

  if (perfil === "Atendente") {
    return [
      "/sistema/inicio",
      "/sistema/atendimentos",
      "/sistema/escala-atendimentos"
    ].includes(pagina)
  }

  if (perfil === "Consulta") {
    return [
      "/sistema/inicio",
      "/sistema/atendimentos",
      "/sistema/pessoas",
      "/sistema/associados",
      "/sistema/representantes",
      "/sistema/escala-atendimentos"
    ].includes(pagina)
  }

  return false
}