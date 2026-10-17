#!/usr/bin/env python3
"""
apply_auto_register.py — duas melhorias na tela de login do Society MLBB:

  1. Ícone do "G" colorido nos botões "Entrar com Google" / "Criar conta com Google".
  2. Se alguém tenta ENTRAR com um nick que não existe, o site abre uma janela
     pedindo o nome de exibição (e a confirmação da senha) e cria a conta.

Uso (na raiz do projeto, onde ficam server.py e static/):
    python apply_auto_register.py
    python apply_auto_register.py --root D:\\lobby

Altera: server.py, static/js/app.js, static/js/auth.js, static/index.html
(faz backup .bak; se qualquer trecho falhar, NADA é gravado; é idempotente).
Rode DEPOIS do apply_guest_mode.py (ou sem ele — os trechos não dependem dele).
"""
import argparse
import re
import shutil
import sys
from pathlib import Path

ERRORS = []


def rep(text, old, new, label):
    n = text.count(old)
    if n != 1:
        ERRORS.append(f"[{label}] trecho encontrado {n}x (esperado 1x): {old.strip()[:80]!r}")
        return text
    return text.replace(old, new, 1)


# ══════════════════════════════════════════════════════════════
# server.py
# ══════════════════════════════════════════════════════════════
def patch_server(s):
    L = "server.py"

    # 1) exceção específica para "conta não existe"
    s = rep(s, '''def password_login_account(message):
''', '''class AccountNotFound(IdentityError):
    """Login por senha com nick inexistente: o cliente oferece criar a conta."""
    def __init__(self, nick):
        super().__init__("Conta não encontrada.")
        self.nick = nick


def password_login_account(message):
''', L)

    s = rep(s, '''    if not user:
        raise IdentityError("Conta não encontrada. Abra \u201cCriar conta\u201d para se cadastrar.")
''', '''    if not user:
        raise AccountNotFound(raw)
''', L)

    # 2) nome de exibição opcional no cadastro por senha
    s = rep(s, '''def register_password_account(message):
    raw_nick, nick, password, legacy_credential = validate_registration_payload(message)
    user = get_user(nick)
''', '''def clean_display_name(value, fallback):
    """Nome exibido no perfil. None => usa o fallback (o próprio nick)."""
    if value is None:
        return fallback
    if not isinstance(value, str):
        raise IdentityError("Informe um nome válido para exibição.")
    name = value.strip()
    if not 1 <= len(name) <= 28 or any(unicodedata.category(ch) == "Cc" for ch in name):
        raise IdentityError("O nome de exibição deve ter de 1 a 28 caracteres.")
    return name


def register_password_account(message):
    raw_nick, nick, password, legacy_credential = validate_registration_payload(message)
    display_name = clean_display_name(message.get("display_name"), raw_nick)
    user = get_user(nick)
''', L)

    s = rep(s, '''            "VALUES(?,?,?,?,?,?,?)",
            (nick, raw_nick, "", "", hash_secret(password, password_salt), password_salt,
''', '''            "VALUES(?,?,?,?,?,?,?)",
            (nick, display_name, "", "", hash_secret(password, password_salt), password_salt,
''', L)

    # 3) fluxo no WebSocket: pede o nome, recebe, cadastra
    s = rep(s, '''            try:
                key, role, created = password_login_account(msg)
            except IdentityError:
                record_login_failure(attempt_key)
                raise
''', '''            try:
                key, role, created = password_login_account(msg)
            except AccountNotFound as missing:
                # nick não existe: pede o nome de exibição e cria a conta
                await ws.send_text(json.dumps({
                    "t": "register_required",
                    "nick": missing.nick,
                    "suggested_name": missing.nick,
                }))
                reply = json.loads(await ws.receive_text())
                if reply.get("t") != "register_complete":
                    raise IdentityError("Cadastro cancelado.")
                if reply.get("password_confirm") != msg.get("password"):
                    raise IdentityError("A confirmação não corresponde à senha.")
                key, role, created = register_password_account({
                    "nick": msg.get("nick"),
                    "password": msg.get("password"),
                    "display_name": reply.get("profile_name"),
                })
            except IdentityError:
                record_login_failure(attempt_key)
                raise
''', L)
    return s


# ══════════════════════════════════════════════════════════════
# static/js/app.js
# ══════════════════════════════════════════════════════════════
def patch_app(s):
    L = "app.js"
    s = rep(s, '''  else if (t === "session_invalid"){
''', '''  else if (t === "register_required"){
    window.dispatchEvent(new CustomEvent("society-register-required", {
      detail:{nick:m.nick || "", suggestedName:m.suggested_name || ""}
    }));
  }
  else if (t === "session_invalid"){
''', L)
    s = rep(s, '''window.societyGoogleProfileCancel = () => send({t:"google_profile_cancel"});
''', '''window.societyGoogleProfileCancel = () => send({t:"google_profile_cancel"});
window.societyRegisterSubmit = (profileName, passwordConfirm) =>
  send({t:"register_complete", profile_name:profileName, password_confirm:passwordConfirm});
window.societyRegisterCancel = () => send({t:"register_cancel"});
''', L)
    return s


# ══════════════════════════════════════════════════════════════
# static/js/auth.js
# ══════════════════════════════════════════════════════════════
AUTH_APPEND = '''
/* ---------- cadastro automático ao tentar entrar com nick inexistente ---------- */
const registerPromptDialog = document.getElementById("registerPromptDialog");
const registerPromptForm = document.getElementById("registerPromptForm");
const registerPromptNick = document.getElementById("registerPromptNick");
const registerPromptName = document.getElementById("registerPromptName");
const registerPromptConfirm = document.getElementById("registerPromptConfirm");
const registerPromptError = document.getElementById("registerPromptError");

function cancelRegisterPrompt(){
  if (registerPromptDialog.open) registerPromptDialog.close();
  window.societyRegisterCancel();
  googleMessage.textContent = "";
}

window.addEventListener("society-register-required", event => {
  registerPromptNick.textContent = event.detail.nick;
  registerPromptName.value = event.detail.suggestedName || "";
  registerPromptConfirm.value = "";
  registerPromptError.textContent = "";
  googleMessage.textContent = "";
  registerPromptDialog.showModal();
  registerPromptName.focus();
  registerPromptName.select();
});

registerPromptForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = registerPromptName.value.trim();
  const password = document.getElementById("password").value;
  const confirmation = registerPromptConfirm.value;
  if (!name || name.length > 28) {
    registerPromptError.textContent = "O nome deve ter de 1 a 28 caracteres.";
    registerPromptName.focus();
    return;
  }
  if (password.length < 10) {
    registerPromptError.textContent =
      "Para criar a conta, a senha precisa ter pelo menos 10 caracteres. Cancele e digite uma senha maior.";
    return;
  }
  if (confirmation !== password) {
    registerPromptError.textContent = "A confirmação não corresponde à senha digitada.";
    registerPromptConfirm.focus();
    return;
  }
  if (window.societyRegisterSubmit(name, confirmation)) {
    registerPromptDialog.close();
    googleMessage.textContent = "Criando sua conta…";
  } else {
    registerPromptError.textContent = "Conexão interrompida. Tente entrar novamente.";
  }
});

document.getElementById("registerPromptCancel").addEventListener("click", cancelRegisterPrompt);
registerPromptDialog.addEventListener("cancel", event => {
  event.preventDefault();
  cancelRegisterPrompt();
});

// erro do servidor depois de enviar o nome: fecha a janela e mostra o motivo
window.addEventListener("society-auth-error", event => {
  if (registerPromptDialog.open) registerPromptDialog.close();
  googleMessage.textContent = event.detail;
});
'''


def patch_auth(s):
    return s.rstrip("\n") + "\n" + AUTH_APPEND


# ══════════════════════════════════════════════════════════════
# static/index.html
# ══════════════════════════════════════════════════════════════
G_SVG = ('<svg class="google-g" width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false">'
         '<path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>'
         '<path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/>'
         '<path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/>'
         '<path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>'
         '</svg>')

REGISTER_DIALOG = '''<dialog id="registerPromptDialog" class="google-profile-dialog" aria-labelledby="registerPromptTitle">
  <form id="registerPromptForm" novalidate>
    <h2 id="registerPromptTitle">Criar sua conta</h2>
    <p>O nick <b id="registerPromptNick"></b> ainda não existe. Vamos criá-lo agora com a senha que você digitou.</p>
    <label for="registerPromptName">Nome de exibição
      <input id="registerPromptName" maxlength="28" autocomplete="name" required>
    </label>
    <label for="registerPromptConfirm">Confirme a senha
      <input id="registerPromptConfirm" type="password" maxlength="128" autocomplete="off" required>
    </label>
    <p id="registerPromptError" class="google-auth-message" role="alert"></p>
    <div class="google-profile-actions">
      <button id="registerPromptCancel" type="button" class="google-profile-cancel">Cancelar</button>
      <button type="submit">Criar conta</button>
    </div>
  </form>
</dialog>

'''


def add_google_icon(s, button_id, label):
    m = re.search(r'(<button id="%s"[^>]*>)(.*?)(</button>)' % button_id, s, re.S)
    if not m:
        ERRORS.append(f"[index.html] botão #{button_id} não encontrado")
        return s
    if "<svg" in m.group(2):
        return s  # já tem ícone
    inner = m.group(2).strip() or label
    new = f'{m.group(1)}\n      {G_SVG}\n      <span>{inner}</span>\n    {m.group(3)}'
    return s[:m.start()] + new + s[m.end():]


def patch_index(s):
    L = "index.html"
    s = add_google_icon(s, "googleLogin", "Entrar com Google")
    s = add_google_icon(s, "googleRegister", "Criar conta com Google")
    s = rep(s, '<div id="game">', REGISTER_DIALOG + '<div id="game">', L)
    return s


# ══════════════════════════════════════════════════════════════
FILES = [
    ("server.py", patch_server, "class AccountNotFound"),
    ("static/js/app.js", patch_app, "register_required"),
    ("static/js/auth.js", patch_auth, "registerPromptDialog"),
    ("static/index.html", patch_index, 'id="registerPromptDialog"'),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="raiz do projeto")
    root = Path(ap.parse_args().root).resolve()

    results = []
    for rel, fn, marker in FILES:
        path = root / rel
        if not path.exists():
            ERRORS.append(f"[{rel}] arquivo não encontrado em {path}")
            continue
        raw = path.read_bytes().decode("utf-8")
        crlf = "\r\n" in raw
        text = raw.replace("\r\n", "\n")
        if marker in text:
            print(f"= {rel}: já tem o cadastro automático, pulando.")
            continue
        new = fn(text)
        if crlf:
            new = new.replace("\n", "\r\n")
        results.append((path, new))

    if ERRORS:
        print("\n\u2717 NADA foi gravado. Problemas encontrados:\n")
        for e in ERRORS:
            print("  -", e)
        print("\nO trecho do seu arquivo diverge do que eu recebi; me envie o trecho atual e eu ajusto.")
        sys.exit(1)

    for path, new in results:
        shutil.copyfile(path, str(path) + ".bak2")
        path.write_bytes(new.encode("utf-8"))
        print(f"\u2713 {path.relative_to(root)} atualizado (backup: {path.name}.bak2)")
    print("\nPronto. Reinicie o servidor e dê Ctrl+F5 no navegador.")


if __name__ == "__main__":
    main()