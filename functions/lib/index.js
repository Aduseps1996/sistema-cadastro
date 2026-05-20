"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alternarStatusUsuario = exports.redefinirSenhaUsuario = exports.atualizarUsuario = exports.criarUsuario = void 0;
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/https");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
(0, firebase_functions_1.setGlobalOptions)({ maxInstances: 10 });
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
const perfisPermitidos = [
    "Administrador",
    "Recepção",
    "Atendente",
    "Consulta",
];
async function validarAdministrador(uid) {
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Usuário não autenticado.");
    }
    const usuarioRef = db.collection("usuarios").doc(uid);
    const usuarioSnap = await usuarioRef.get();
    if (!usuarioSnap.exists) {
        throw new https_1.HttpsError("permission-denied", "Usuário não encontrado.");
    }
    const usuario = usuarioSnap.data();
    if (!(usuario === null || usuario === void 0 ? void 0 : usuario.ativo)) {
        throw new https_1.HttpsError("permission-denied", "Usuário inativo.");
    }
    if ((usuario === null || usuario === void 0 ? void 0 : usuario.perfil) !== "Administrador") {
        throw new https_1.HttpsError("permission-denied", "Apenas administradores podem executar esta ação.");
    }
    return usuario;
}
function validarTexto(valor, campo) {
    if (typeof valor !== "string" || valor.trim() === "") {
        throw new https_1.HttpsError("invalid-argument", `Informe ${campo}.`);
    }
    return valor.trim();
}
function validarEmail(valor) {
    const email = validarTexto(valor, "o e-mail").toLowerCase();
    if (!email.includes("@")) {
        throw new https_1.HttpsError("invalid-argument", "E-mail inválido.");
    }
    return email;
}
function validarPerfil(valor) {
    const perfil = validarTexto(valor, "o perfil");
    if (!perfisPermitidos.includes(perfil)) {
        throw new https_1.HttpsError("invalid-argument", "Perfil inválido.");
    }
    return perfil;
}
exports.criarUsuario = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c;
    await validarAdministrador((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
    const nome = validarTexto(request.data.nome, "o nome");
    const email = validarEmail(request.data.email);
    const senha = validarTexto(request.data.senha, "a senha");
    const perfil = validarPerfil(request.data.perfil);
    if (senha.length < 6) {
        throw new https_1.HttpsError("invalid-argument", "A senha precisa ter pelo menos 6 caracteres.");
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
        criado_em: firestore_1.FieldValue.serverTimestamp(),
        atualizado_em: firestore_1.FieldValue.serverTimestamp(),
        criado_por: ((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid) || null,
        atualizado_por: ((_c = request.auth) === null || _c === void 0 ? void 0 : _c.uid) || null,
    });
    return {
        sucesso: true,
        uid: usuarioCriado.uid,
    };
});
exports.atualizarUsuario = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    await validarAdministrador((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
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
        atualizado_em: firestore_1.FieldValue.serverTimestamp(),
        atualizado_por: ((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid) || null,
    });
    return {
        sucesso: true,
    };
});
exports.redefinirSenhaUsuario = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    await validarAdministrador((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
    const uid = validarTexto(request.data.uid, "o ID do usuário");
    const novaSenha = validarTexto(request.data.novaSenha, "a nova senha");
    if (novaSenha.length < 6) {
        throw new https_1.HttpsError("invalid-argument", "A nova senha precisa ter pelo menos 6 caracteres.");
    }
    await auth.updateUser(uid, {
        password: novaSenha,
    });
    await db.collection("usuarios").doc(uid).update({
        atualizado_em: firestore_1.FieldValue.serverTimestamp(),
        atualizado_por: ((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid) || null,
    });
    return {
        sucesso: true,
    };
});
exports.alternarStatusUsuario = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    await validarAdministrador((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
    const uid = validarTexto(request.data.uid, "o ID do usuário");
    const ativoAtual = request.data.ativoAtual;
    if (typeof ativoAtual !== "boolean") {
        throw new https_1.HttpsError("invalid-argument", "Status inválido.");
    }
    const novoStatus = !ativoAtual;
    await auth.updateUser(uid, {
        disabled: !novoStatus,
    });
    await db.collection("usuarios").doc(uid).update({
        ativo: novoStatus,
        atualizado_em: firestore_1.FieldValue.serverTimestamp(),
        atualizado_por: ((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid) || null,
    });
    return {
        sucesso: true,
        ativo: novoStatus,
    };
});
//# sourceMappingURL=index.js.map