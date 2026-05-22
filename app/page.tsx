import { redirect } from "next/navigation"

// =====================================================
// ROTA RAIZ DO PROJETO
// =====================================================
// Quando acessar "/", manda direto para o login.
export default function HomePage() {
  redirect("/login")
}