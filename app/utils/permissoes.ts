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
      "/sistema/representantes"
    ].includes(pagina)
  }

  if (perfil === "Atendente") {
    return [
      "/sistema/inicio",
      "/sistema/atendimentos"
    ].includes(pagina)
  }

  if (perfil === "Consulta") {
    return [
      "/sistema/inicio",
      "/sistema/atendimentos",
      "/sistema/pessoas",
      "/sistema/associados",
      "/sistema/representantes"
    ].includes(pagina)
  }

  return false
}