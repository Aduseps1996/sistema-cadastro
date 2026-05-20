import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/https";

import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";

initializeApp();

setGlobalOptions({maxInstances: 10});

const db = getFirestore();
const auth = getAuth();

const perfisPermitidos = [
  "Administrador",
  "Recepção",
  "Atendente",
  "Consulta",
];

async function validarAdministrador(uid?: string) {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const usuarioRef = db.collection("usuarios").doc(uid);
  const usuarioSnap = await usuarioRef.get();

  if (!usuarioSnap.exists) {
    throw new HttpsError("permission-denied", "Usuário não encontrado.");
  }

  const usuario = usuarioSnap.data();

  if (!usuario?.ativo) {
    throw new HttpsError("permission-denied", "Usuário inativo.");
  }

  if (usuario?.perfil !== "Administrador") {
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores podem executar esta ação."
    );
  }

  return usuario;
}

function validarTexto(valor: unknown, campo: string) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new HttpsError("invalid-argument", `Informe ${campo}.`);
  }

  return valor.trim();
}

function validarEmail(valor: unknown) {
  const email = validarTexto(valor, "o e-mail").toLowerCase();

  if (!email.includes("@")) {
    throw new HttpsError("invalid-argument", "E-mail inválido.");
  }

  return email;
}

function validarPerfil(valor: unknown) {
  const perfil = validarTexto(valor, "o perfil");

  if (!perfisPermitidos.includes(perfil)) {
    throw new HttpsError("invalid-argument", "Perfil inválido.");
  }

  return perfil;
}

export const criarUsuario = onCall(async (request) => {
  await validarAdministrador(request.auth?.uid);

  const nome = validarTexto(request.data.nome, "o nome");
  const email = validarEmail(request.data.email);
  const senha = validarTexto(request.data.senha, "a senha");
  const perfil = validarPerfil(request.data.perfil);

  if (senha.length < 6) {
    throw new HttpsError(
      "invalid-argument",
      "A senha precisa ter pelo menos 6 caracteres."
    );
  }

  const usuarioCriado = await auth.createUser({
    email,
    password: senha,
    displayName: nome,
    disabled: false,
  });

  await db.collection("usuarios").doc(usuarioCriado.uid).set({
    uid: usuarioCriado.uid,
    nome,
    email,
    perfil,
    ativo: true,
    criado_em: FieldValue.serverTimestamp(),
    atualizado_em: FieldValue.serverTimestamp(),
    criado_por: request.auth?.uid || null,
    atualizado_por: request.auth?.uid || null,
  });

  return {
    sucesso: true,
    uid: usuarioCriado.uid,
  };
});

export const atualizarUsuario = onCall(async (request) => {
  await validarAdministrador(request.auth?.uid);

  const uid = validarTexto(request.data.uid, "o ID do usuário");
  const nome = validarTexto(request.data.nome, "o nome");
  const email = validarEmail(request.data.email);
  const perfil = validarPerfil(request.data.perfil);

  await auth.updateUser(uid, {
    email,
    displayName: nome,
  });

  await db.collection("usuarios").doc(uid).update({
    nome,
    email,
    perfil,
    atualizado_em: FieldValue.serverTimestamp(),
    atualizado_por: request.auth?.uid || null,
  });

  return {
    sucesso: true,
  };
});

export const redefinirSenhaUsuario = onCall(async (request) => {
  await validarAdministrador(request.auth?.uid);

  const uid = validarTexto(request.data.uid, "o ID do usuário");
  const novaSenha = validarTexto(request.data.novaSenha, "a nova senha");

  if (novaSenha.length < 6) {
    throw new HttpsError(
      "invalid-argument",
      "A nova senha precisa ter pelo menos 6 caracteres."
    );
  }

  await auth.updateUser(uid, {
    password: novaSenha,
  });

  await db.collection("usuarios").doc(uid).update({
    atualizado_em: FieldValue.serverTimestamp(),
    atualizado_por: request.auth?.uid || null,
  });

  return {
    sucesso: true,
  };
});

export const alternarStatusUsuario = onCall(async (request) => {
  await validarAdministrador(request.auth?.uid);

  const uid = validarTexto(request.data.uid, "o ID do usuário");
  const ativoAtual = request.data.ativoAtual;

  if (typeof ativoAtual !== "boolean") {
    throw new HttpsError("invalid-argument", "Status inválido.");
  }

  const novoStatus = !ativoAtual;

  await auth.updateUser(uid, {
    disabled: !novoStatus,
  });

  await db.collection("usuarios").doc(uid).update({
    ativo: novoStatus,
    atualizado_em: FieldValue.serverTimestamp(),
    atualizado_por: request.auth?.uid || null,
  });

  return {
    sucesso: true,
    ativo: novoStatus,
  };
});