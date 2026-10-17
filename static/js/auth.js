const googleButton = document.getElementById("googleLogin");
const googleRegisterButton = document.getElementById("googleRegister");
const googleMessage = document.getElementById("googleAuthMessage");
const loginButton = document.getElementById("enter");
const loginHelp = document.getElementById("loginHelp");
const loginTab = document.getElementById("authLoginTab");
const registerTab = document.getElementById("authRegisterTab");
const loginPanel = document.getElementById("authLoginPanel");
const registerPanel = document.getElementById("authRegisterPanel");
const googleProfileDialog = document.getElementById("googleProfileDialog");
const googleProfileForm = document.getElementById("googleProfileForm");
const googleProfileName = document.getElementById("googleProfileName");

function setAuthMode(mode){
  const registering = mode === "register";
  loginPanel.hidden = registering;
  registerPanel.hidden = !registering;
  loginTab.classList.toggle("is-active", !registering);
  registerTab.classList.toggle("is-active", registering);
  loginTab.setAttribute("aria-selected", String(!registering));
  registerTab.setAttribute("aria-selected", String(registering));
  googleMessage.textContent = "";
  document.getElementById("err").textContent = "";
}

loginTab.addEventListener("click", () => setAuthMode("login"));
registerTab.addEventListener("click", () => setAuthMode("register"));
document.getElementById("googleRegister").addEventListener("click", () => startGoogleLogin(true));
googleButton.addEventListener("click", () => startGoogleLogin(false));
document.getElementById("createPasswordAccount").addEventListener("click", createPasswordAccount);
googleProfileForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = googleProfileName.value.trim();
  if (!name) {
    googleProfileName.focus();
    return;
  }
  if (window.societyGoogleProfileSubmit(name)) {
    googleProfileDialog.close();
    googleMessage.textContent = "Criando sua conta…";
  }
});
document.getElementById("googleProfileCancel").addEventListener("click", () => {
  googleProfileDialog.close();
  window.societyGoogleProfileCancel();
  googleMessage.textContent = "";
});
googleProfileDialog.addEventListener("cancel", event => {
  event.preventDefault();
  googleProfileDialog.close();
  window.societyGoogleProfileCancel();
  googleMessage.textContent = "";
});
window.addEventListener("society-google-profile-required", event => {
  // Campo vazio de propósito: o usuário escolhe o nome, nada é gerado a partir da conta Google.
  googleProfileName.value = "";
  googleMessage.textContent = "";
  document.getElementById("err").textContent = "";
  googleProfileDialog.showModal();
  googleProfileName.focus();
});
window.addEventListener("society-auth-error", event => {
  if (!googleProfileDialog.open) return;
  googleProfileDialog.close();
  googleMessage.textContent = event.detail;
});

function googleLoginErrorMessage(error){
  const messages = {
    "auth/unauthorized-domain":
      "Este domínio não está autorizado no Firebase. Adicione-o em Authentication > Settings > Authorized domains ou acesse o site por localhost.",
    "auth/operation-not-allowed":
      "O login Google não está habilitado. Ative o provedor Google em Firebase Authentication > Sign-in method.",
    "auth/popup-blocked":
      "O navegador bloqueou a janela de login. Permita pop-ups para este site e tente novamente.",
    "auth/popup-closed-by-user":
      "A janela de login foi fechada antes de concluir.",
    "auth/network-request-failed":
      "Falha de rede ao conectar ao Firebase. Verifique sua conexão, firewall e restrições da API key.",
    "auth/invalid-api-key":
      "A API key do Firebase Web é inválida. Confira FIREBASE_WEB_CONFIG no arquivo .env.",
    "auth/api-key-not-valid":
      "A API key do Firebase Web é inválida ou está restrita para este domínio.",
    "auth/cancelled-popup-request":
      "Já existe uma janela de login aberta. Conclua-a antes de tentar novamente."
  };
  const code = error && typeof error.code === "string" ? error.code : "";
  return messages[code] || (code
    ? "Não foi possível entrar com Google (" + code + "). Confira o Console do navegador para detalhes."
    : "Não foi possível entrar com Google. Confira o Console do navegador para detalhes.");
}

function registrationCredentials(){
  const nick = document.getElementById("registerNick").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirmation = document.getElementById("registerPasswordConfirm").value;
  if (!/^[A-Za-z0-9_]{3,14}$/.test(nick)) {
    throw new Error("O nick deve ter 3 a 14 letras, números ou underline.");
  }
  if (password.length < 10 || password.length > 128) {
    throw new Error("A senha deve ter entre 10 e 128 caracteres.");
  }
  if (password !== confirmation) {
    throw new Error("A confirmação não corresponde à senha.");
  }
  return {nick, password};
}

async function createPasswordAccount(){
  const button = document.getElementById("createPasswordAccount");
  document.getElementById("err").textContent = "";
  try {
    const credentials = registrationCredentials();
    if (typeof window.societyPasswordRegister !== "function") {
      throw new Error("O cadastro ainda está carregando. Atualize a página.");
    }
    button.disabled = true;
    googleMessage.textContent = "Criando sua conta…";
    window.societyPasswordRegister(credentials);
  } catch (error) {
    googleMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function configureGoogleLogin(){
  try {
    const response = await fetch("/api/config", {cache:"no-store"});
    if (!response.ok) {
      let detail = "";
      try {
        const errorResponse = await response.json();
        detail = typeof errorResponse.detail === "string" ? errorResponse.detail : "";
      } catch (error) {
        console.warn("A resposta de configuração não contém JSON válido.", error);
      }
      throw new Error(detail || "Não foi possível carregar as configurações de autenticação.");
    }
    const configResponse = await response.json();
    if (!configResponse.google_auth_enabled) {
      googleMessage.textContent = "Login Google ainda não configurado. Contas existentes seguem disponíveis.";
      return;
    }
    const {initializeApp} = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
    const {getAuth, GoogleAuthProvider, signInWithPopup, signOut} =
      await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");
    const firebaseApp = initializeApp(configResponse.firebase_web_config);
    const auth = getAuth(firebaseApp);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({prompt:"select_account"});
    if (typeof window.societyGoogleLogin !== "function") {
      await new Promise(resolve => window.addEventListener("society-app-ready", resolve, {once:true}));
    }
    googleButton.hidden = false;
    googleRegisterButton.hidden = false;
    loginButton.hidden = false;
    loginHelp.textContent = "Entre com nick e senha ou use sua conta Google.";
    window.societyFirebaseSignOut = () => signOut(auth);
    window.societyGoogleSignIn = signInWithPopup;
    window.societyGoogleProvider = provider;
    window.societyFirebaseAuth = auth;
  } catch (error) {
    console.error("Falha ao configurar o login Google.", error);
    googleMessage.textContent = error instanceof Error && error.message
      ? "Login Google indisponível: " + error.message
      : "Login Google indisponível no momento. Contas existentes seguem disponíveis.";
  }
}

/*
 * Os dois botões Google (aba "Entrar" e aba "Criar conta") fazem o mesmo fluxo:
 *  - conta já existe  -> entra direto
 *  - conta não existe -> o servidor responde "google_profile_required" e o diálogo
 *    pede o nome de usuário; a conta só é criada depois que ele for confirmado.
 * Por isso allow_registration é sempre true e nenhum nome é enviado daqui.
 */
async function startGoogleLogin(){
  const button = googleButton.hidden ? googleRegisterButton : googleButton;
  const buttons = [googleButton, googleRegisterButton];
  buttons.forEach(b => { b.disabled = true; });
  googleMessage.textContent = "Conectando com Google…";
  document.getElementById("err").textContent = "";
  try {
    const signIn = window.societyGoogleSignIn;
    const provider = window.societyGoogleProvider;
    const auth = window.societyFirebaseAuth;
    if (!signIn || !provider || !auth) {
      throw new Error("A autenticação Google ainda está inicializando. Atualize a página.");
    }
    const credential = await signIn(auth, provider);
    const idToken = await credential.user.getIdToken(true);
    window.societyGoogleLogin({
      id_token:idToken,
      allow_registration:true
    });
    googleMessage.textContent = "Verificando sua conta…";
  } catch (error) {
    console.error("Falha no login Google.", error);
    googleMessage.textContent = error instanceof Error && !error.code
      ? error.message
      : googleLoginErrorMessage(error);
  } finally {
    buttons.forEach(b => { b.disabled = false; });
  }
}

configureGoogleLogin();

/* ---------- modo visitante ---------- */
const guestButton = document.getElementById("guestLogin");

function startGuestLogin(){
  document.getElementById("err").textContent = "";
  if (typeof window.societyGuestLogin !== "function") {
    googleMessage.textContent = "O site ainda está carregando. Tente novamente em instantes.";
    return;
  }
  guestButton.disabled = true;
  googleMessage.textContent = "Entrando como visitante…";
  window.societyGuestLogin();
  window.setTimeout(() => { guestButton.disabled = false; }, 6000);
}

if (guestButton) guestButton.addEventListener("click", startGuestLogin);

window.addEventListener("society-auth-error", () => {
  if (guestButton) guestButton.disabled = false;
  if (!googleProfileDialog.open) googleMessage.textContent = "";
});

// visitante clicou em "Criar conta": abre direto a aba de cadastro
try {
  if (sessionStorage.getItem("society.auth_mode") === "register") {
    sessionStorage.removeItem("society.auth_mode");
    setAuthMode("register");
  }
} catch (error) { /* sessionStorage indisponível: segue na aba Entrar */ }

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