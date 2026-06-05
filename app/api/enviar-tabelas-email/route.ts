import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(request: Request) {
  try {
    const { assunto, corpoHtml, destinatarios } = await request.json()

    if (!assunto || !corpoHtml || !Array.isArray(destinatarios)) {
      return NextResponse.json(
        { erro: "Dados incompletos para envio do e-mail." },
        { status: 400 }
      )
    }

    if (destinatarios.length === 0) {
      return NextResponse.json(
        { erro: "Informe pelo menos um destinatário." },
        { status: 400 }
      )
    }

    const usuario = process.env.EMAIL_ESCALA_USER
    const senha = process.env.EMAIL_ESCALA_PASS

    if (!usuario || !senha) {
      return NextResponse.json(
        { erro: "E-mail de origem não configurado no servidor." },
        { status: 500 }
      )
    }

    const transportador = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: usuario,
        pass: senha
      }
    })

    await transportador.sendMail({
      from: `"ADUSEPS - Escala Jurídica" <${usuario}>`,
      to: destinatarios.join(", "),
      subject: assunto,
      html: corpoHtml
    })

    return NextResponse.json({
      sucesso: true,
      mensagem: "E-mail enviado com sucesso."
    })
  } catch (erro) {
    console.error(erro)

    return NextResponse.json(
      { erro: "Não foi possível enviar o e-mail." },
      { status: 500 }
    )
  }
}