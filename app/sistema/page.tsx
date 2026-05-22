import { redirect } from "next/navigation"

// =====================================================
// ROTA BASE DO SISTEMA
// =====================================================
// Quando alguém acessar "/sistema", manda direto para
// "/sistema/inicio" antes mesmo de renderizar a tela.
export default function SistemaPage() {
  redirect("/sistema/inicio")
}