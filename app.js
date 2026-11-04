// ============================================================
// ZED - CURRENT INTERFACE
// Firebase Authentication + Zed Backend
// Liquid Glass Interface Controls
// ============================================================
// ============================================================
// FIREBASE
// ============================================================
let firebaseAuth = null;
let GoogleAuthProvider = null;
let signInWithPopup = null;
let signInWithEmailAndPassword = null;
let createUserWithEmailAndPassword = null;
let onAuthStateChanged = null;
let signOut = null;
async function initializeFirebase() {
  const firebaseAppModule = await import(
    "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"
  );
  const firebaseAuthModule = await import(
    "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"
  );
  const firebaseConfig = {
    apiKey: "AIzaSyD1jcmrhZK_XitZu-9Wa9whFB7BJZn0Wa8",
    authDomain: "zed-ai-6d201.firebaseapp.com",
    projectId: "zed-ai-6d201",
    storageBucket: "zed-ai-6d201.firebasestorage.app",
    messagingSenderId: "538225665227",
    appId: "1:538225665227:web:d61483c3cafa8e4694e74e"
  };
  const firebaseApp =
    firebaseAppModule.initializeApp(firebaseConfig);
  firebaseAuth =
    firebaseAuthModule.getAuth(firebaseApp);
  GoogleAuthProvider =
    firebaseAuthModule.GoogleAuthProvider;
  signInWithPopup =
    firebaseAuthModule.signInWithPopup;
  signInWithEmailAndPassword =
    firebaseAuthModule.signInWithEmailAndPassword;
  createUserWithEmailAndPassword =
    firebaseAuthModule.createUserWithEmailAndPassword;
  onAuthStateChanged =
    firebaseAuthModule.onAuthStateChanged;
  signOut =
    firebaseAuthModule.signOut;
}
// ============================================================
// STATE
// ============================================================
const state = {
  userId: null,
  firebaseUser: null,
  conversationId: null,
  messages: [],
  chats: [],
  chatHistoryUnavailable: false,
  selectedFile: null,
  selectedFilePreviewUrl: null,
  sending: false,
  authGeneration: 0,
  settingsOpen: false
};

// Expose only the signed-in Firebase user accessor needed by live voice.
window.zedVoiceGetUser = () => state.firebaseUser;
// ============================================================
// AUTHENTICATED API REQUESTS
// ============================================================
async function apiFetch(url, options = {}) {
  const user = state.firebaseUser;
  if (!user || !state.userId || user.uid !== state.userId) {
    throw new Error("Please sign in to continue.");
  }

  const requestUid = user.uid;
  const token = await user.getIdToken();
  if (state.firebaseUser?.uid !== requestUid || state.userId !== requestUid) {
    throw new Error("Your Zed account changed during this request. Please try again.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(url, {
    ...options,
    headers
  });

  if (state.firebaseUser?.uid !== requestUid || state.userId !== requestUid) {
    throw new Error("Your Zed account changed during this request. Please try again.");
  }
  return response;
}

// ============================================================
// ELEMENTS
// ============================================================
const app =
  document.getElementById("app");
const sidebar =
  document.getElementById("sidebar");
const newChatBtn =
  document.getElementById("newChatBtn");
const recentChats =
  document.getElementById("recentChats");
const settingsBtn =
  document.getElementById("settingsBtn");
const accountBtn =
  document.getElementById("accountBtn");
const menuBtn =
  document.getElementById("menuBtn");
const profileBtn =
  document.getElementById("profileBtn");
const welcome =
  document.getElementById("welcome");
const messages =
  document.getElementById("messages");
const attachBtn =
  document.getElementById("attachBtn");
const attachMenu =
  document.getElementById("attachMenu");
const uploadPhotoBtn =
  document.getElementById("uploadPhotoBtn");
const uploadFileBtn =
  document.getElementById("uploadFileBtn");
const createImageBtn =
  document.getElementById("createImageBtn");
const fileInput =
  document.getElementById("fileInput");
const messageInput =
  document.getElementById("messageInput");
const selectedFileChip =
  document.getElementById("selectedFileChip");
const sendBtn =
  document.getElementById("sendBtn");
function createDocumentIcon(className = "selected-file-document-icon") {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", className);
  icon.setAttribute("viewBox", "0 0 32 36");
  icon.setAttribute("width", "32");
  icon.setAttribute("height", "36");
  icon.setAttribute("role", "img");
  icon.setAttribute("aria-label", "Document");
  icon.setAttribute("focusable", "false");
  const page = document.createElementNS("http://www.w3.org/2000/svg", "path");
  page.setAttribute("d", "M6 2.5h13l7 7V33H6z");
  page.setAttribute("fill", "#ffffff");
  page.setAttribute("stroke", "#ffffff");
  page.setAttribute("stroke-width", "1.5");
  page.setAttribute("stroke-linejoin", "round");
  const fold = document.createElementNS("http://www.w3.org/2000/svg", "path");
  fold.setAttribute("d", "M19 2.5v7h7");
  fold.setAttribute("fill", "none");
  fold.setAttribute("stroke", "#64748b");
  fold.setAttribute("stroke-width", "1.5");
  fold.setAttribute("stroke-linejoin", "round");
  const lines = document.createElementNS("http://www.w3.org/2000/svg", "path");
  lines.setAttribute("d", "M10 16h12M10 21h12M10 26h9");
  lines.setAttribute("fill", "none");
  lines.setAttribute("stroke", "#334155");
  lines.setAttribute("stroke-width", "1.8");
  lines.setAttribute("stroke-linecap", "round");
  icon.append(page, fold, lines);
  return icon;
}
function renderSelectedFileChip() {
  if (!selectedFileChip) return;
  selectedFileChip.replaceChildren();
  selectedFileChip.hidden = !state.selectedFile;
  selectedFileChip.classList.toggle("has-file", Boolean(state.selectedFile));
  if (!state.selectedFile) {
    selectedFileChip.removeAttribute("style");
    return;
  }
  const isImage = state.selectedFile.type?.startsWith("image/");
  if (isImage) {
    if (!state.selectedFilePreviewUrl) {
      state.selectedFilePreviewUrl = URL.createObjectURL(state.selectedFile);
    }
    const preview = document.createElement("img");
    preview.className = "selected-file-image-preview";
    preview.src = state.selectedFilePreviewUrl;
    preview.alt = "Attached image preview";
    selectedFileChip.appendChild(preview);
  } else {
    selectedFileChip.appendChild(createDocumentIcon());
    const label = document.createElement("span");
    label.className = "selected-file-name";
    label.textContent = "File";
    selectedFileChip.appendChild(label);
  }

  const remove = document.createElement("button");
  remove.className = "remove-file-button";
  remove.type = "button";
  remove.setAttribute("aria-label", "Remove attached file");
  remove.setAttribute("data-attachment-remove", "true");
  const closeMark = document.createElement("span");
  closeMark.className = "attachment-close-mark";
  closeMark.setAttribute("aria-hidden", "true");
  closeMark.textContent = "×";
  remove.appendChild(closeMark);
  remove.addEventListener("pointerdown", event => event.stopPropagation());
  remove.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.selectedFile = null;
    if (state.selectedFilePreviewUrl) {
      URL.revokeObjectURL(state.selectedFilePreviewUrl);
      state.selectedFilePreviewUrl = null;
    }
    if (fileInput) fileInput.value = "";
    renderSelectedFileChip();
  });
  selectedFileChip.appendChild(remove);
}
// ============================================================
// AUTH UI
// ============================================================
let authScreen = null;
let authMessage = null;
let emailInput = null;
let passwordInput = null;
let googleLogin = null;
let emailLogin = null;
let emailSignup = null;
let accountPanel = null;
let settingsPanel = null;
let menuBackdrop = null;
// ============================================================
// CREATE AUTH SCREEN
// ============================================================
function createAuthScreen() {
  if (document.getElementById("zedAuthScreen")) {
    authScreen =
      document.getElementById("zedAuthScreen");
    return;
  }
  authScreen =
    document.createElement("div");
  authScreen.id =
    "zedAuthScreen";
  authScreen.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(circle at 20% 20%, rgba(114,230,164,.12), transparent 30%),
      radial-gradient(circle at 80% 80%, rgba(100,160,255,.12), transparent 30%),
      #101114;
    color: #f5f5f5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding: 20px;
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
  `;
  const box =
    document.createElement("div");
  box.style.cssText = `
    width: 100%;
    max-width: 390px;
    background: rgba(42,44,51,.72);
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 26px;
    padding: 28px;
    box-shadow:
      0 30px 80px rgba(0,0,0,.40),
      inset 0 1px 0 rgba(255,255,255,.16);
    backdrop-filter: blur(35px) saturate(150%);
    -webkit-backdrop-filter: blur(35px) saturate(150%);
  `;
  box.innerHTML = `
    <div style="
      width:64px;
      height:64px;
      margin:0 auto 18px;
      border-radius:20px;
      background:rgba(255,255,255,.10);
      border:1px solid rgba(255,255,255,.14);
      display:flex;
      align-items:center;
      justify-content:center;
      color:#72e6a4;
      font-size:30px;
      font-weight:700;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.20);
    "><img src="/super-brain.svg?v=2" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:19px;display:block;"></div>
    <h1 style="
      text-align:center;
      font-size:25px;
      margin-bottom:8px;
    ">Welcome to Zed</h1>
    <p style="
      text-align:center;
      color:#a7a7a7;
      font-size:14px;
      margin-bottom:22px;
    ">Sign in to continue</p>
    <button id="googleLogin" style="
      width:100%;
      height:44px;
      border:0;
      border-radius:13px;
      background:rgba(255,255,255,.92);
      color:#202020;
      cursor:pointer;
      font-weight:600;
      margin-bottom:16px;
    ">Continue with Google</button>
    <div style="
      text-align:center;
      color:#777;
      font-size:12px;
      margin:10px 0;
    ">or</div>
    <input id="emailInput"
      type="email"
      placeholder="Email"
      style="
        width:100%;
        height:44px;
        margin-bottom:10px;
        padding:0 12px;
        border:1px solid rgba(255,255,255,.10);
        border-radius:13px;
        outline:none;
        background:rgba(0,0,0,.16);
        color:#f5f5f5;
      "
    >
    <input id="passwordInput"
      type="password"
      placeholder="Password"
      style="
        width:100%;
        height:44px;
        margin-bottom:12px;
        padding:0 12px;
        border:1px solid rgba(255,255,255,.10);
        border-radius:13px;
        outline:none;
        background:rgba(0,0,0,.16);
        color:#f5f5f5;
      "
    >
    <div style="
      display:flex;
      gap:8px;
    ">
      <button id="emailLogin" style="
        flex:1;
        height:42px;
        border:0;
        border-radius:13px;
        background:#72e6a4;
        color:#111;
        cursor:pointer;
        font-weight:700;
      ">Login</button>
      <button id="emailSignup" style="
        flex:1;
        height:42px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:13px;
        background:rgba(255,255,255,.06);
        color:#f5f5f5;
        cursor:pointer;
      ">Sign up</button>
    </div>
    <div id="authMessage" style="
      min-height:20px;
      margin-top:14px;
      text-align:center;
      color:#ff8c8c;
      font-size:12px;
    "></div>
  `;
  authScreen.appendChild(box);
  document.body.appendChild(authScreen);
  googleLogin =
    document.getElementById("googleLogin");
  emailLogin =
    document.getElementById("emailLogin");
  emailSignup =
    document.getElementById("emailSignup");
  emailInput =
    document.getElementById("emailInput");
  passwordInput =
    document.getElementById("passwordInput");
  authMessage =
    document.getElementById("authMessage");
}
// ============================================================
// ACCOUNT PANEL
// ============================================================
function createAccountPanel() {
  if (accountPanel) {
    return;
  }
  accountPanel =
    document.createElement("div");
  accountPanel.style.cssText = `
    position:fixed;
    right:16px;
    top:68px;
    z-index:600;
    width:280px;
    background:rgba(42,44,51,.78);
    border:1px solid rgba(255,255,255,.12);
    border-radius:20px;
    padding:18px;
    box-shadow:
      0 20px 60px rgba(0,0,0,.35),
      inset 0 1px 0 rgba(255,255,255,.14);
    backdrop-filter:blur(30px) saturate(150%);
    -webkit-backdrop-filter:blur(30px) saturate(150%);
    display:none;
  `;
  accountPanel.innerHTML = `
    <div id="zedAccountName"
      style="font-weight:700;font-size:15px;margin-bottom:5px;">
    </div>
    <div id="zedAccountEmail"
      style="color:#a7a7a7;font-size:12px;margin-bottom:18px;">
    </div>
    <button id="zedLogout"
      style="
        width:100%;
        height:40px;
        border:1px solid rgba(255,255,255,.10);
        border-radius:12px;
        background:rgba(255,255,255,.08);
        color:#fff;
        cursor:pointer;
      ">
      Log out
    </button>
  `;
  document.body.appendChild(accountPanel);
  document
    .getElementById("zedLogout")
    .addEventListener(
      "click",
      async () => {
        try {
          await signOut(firebaseAuth);
        } catch (error) {
          console.error(error);
        }
      }
    );
}
function updateGoogleProfileAvatar() {
  const user = state.firebaseUser;
  const photoURL = user?.photoURL || "";
  const initials = (user?.displayName || user?.email || "U")
    .trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();

  const renderAvatar = (button, className) => {
    if (!button) return;
    button.replaceChildren();
    if (photoURL) {
      const image = document.createElement("img");
      image.className = className;
      image.src = photoURL;
      image.alt = "Google account profile";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => {
        const fallback = document.createElement("span");
        fallback.className = "profile-avatar-fallback";
        fallback.textContent = initials || "U";
        button.replaceChildren(fallback);
      }, { once: true });
      button.appendChild(image);
    } else {
      const fallback = document.createElement("span");
      fallback.className = "profile-avatar-fallback";
      fallback.textContent = initials || "U";
      button.appendChild(fallback);
    }
  };

  renderAvatar(profileBtn, "profile-avatar-image");
  renderAvatar(accountBtn, "sidebar-account-avatar");
  if (profileBtn) {
    profileBtn.setAttribute("aria-label", user
      ? `Account: ${user.displayName || user.email || "signed in"}`
      : "Account");
    profileBtn.title = user?.displayName || user?.email || "Account";
  }
}

function updateAccountPanel() {
  updateGoogleProfileAvatar();
  if (!accountPanel) return;
  const name = document.getElementById("zedAccountName");
  const email = document.getElementById("zedAccountEmail");
  if (name) name.textContent = state.firebaseUser?.displayName || "Zed User";
  if (email) email.textContent = state.firebaseUser?.email || "";
}
// ============================================================
// SETTINGS PANEL
// ============================================================
function createSettingsPanel() {
  if (settingsPanel) {
    return;
  }
  settingsPanel =
    document.createElement("div");
  settingsPanel.id =
    "zedSettingsPanel";
  settingsPanel.style.cssText = `
    position:fixed;
    left:50%;
    top:50%;
    transform:translate(-50%,-50%) scale(.96);
    width:min(92vw, 430px);
    max-height:80vh;
    overflow:auto;
    z-index:1000;
    display:none;
    background:rgba(42,44,51,.82);
    border:1px solid rgba(255,255,255,.13);
    border-radius:26px;
    padding:22px;
    box-shadow:
      0 30px 90px rgba(0,0,0,.45),
      inset 0 1px 0 rgba(255,255,255,.16);
    backdrop-filter:blur(35px) saturate(150%);
    -webkit-backdrop-filter:blur(35px) saturate(150%);
    color:#f5f5f5;
  `;
  settingsPanel.innerHTML = `
    <div style="
      display:flex;
      align-items:center;
      justify-content:space-between;
      margin-bottom:20px;
    ">
      <div>
        <div style="
          font-size:20px;
          font-weight:700;
        ">Settings</div>
        <div style="
          color:#929292;
          font-size:12px;
          margin-top:4px;
        ">Customize your Zed experience</div>
      </div>
      <button id="zedSettingsClose"
        aria-label="Close settings"
        style="
          width:36px;
          height:36px;
          border-radius:50%;
          background:rgba(255,255,255,.08);
          border:1px solid rgba(255,255,255,.10);
          color:#fff;
          cursor:pointer;
          font-size:18px;
        ">×</button>
    </div>
    <div style="
      padding:15px;
      margin-bottom:10px;
      border-radius:17px;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.08);
    ">
      <div style="font-weight:600;">Appearance</div>
      <div style="
        color:#929292;
        font-size:12px;
        margin-top:5px;
      ">
        Zed uses the Liquid Glass interface.
      </div>
    </div>
    <div style="
      padding:15px;
      margin-bottom:10px;
      border-radius:17px;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.08);
    ">
      <div style="font-weight:600;">Account</div>
      <div id="zedSettingsAccount"
        style="
          color:#929292;
          font-size:12px;
          margin-top:5px;
        ">
      </div>
    </div>
    <div style="
      padding:15px;
      border-radius:17px;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.08);
    ">
      <div style="font-weight:600;">Zed</div>
      <div style="
        color:#929292;
        font-size:12px;
        margin-top:5px;
      ">
        Your conversations, files and AI tools are managed by Zed.
      </div>
    </div>
  `;
  document.body.appendChild(settingsPanel);
  document
    .getElementById("zedSettingsClose")
    ?.addEventListener(
      "click",
      closeSettings
    );
}
function openSettings() {
  if (!settingsPanel) {
    createSettingsPanel();
  }
  if (accountPanel) {
    accountPanel.style.display =
      "none";
  }
  const accountText =
    document.getElementById(
      "zedSettingsAccount"
    );
  if (accountText) {
    accountText.textContent =
      state.firebaseUser?.email ||
      "Signed in user";
  }
  settingsPanel.style.display =
    "block";
  requestAnimationFrame(() => {
    if (settingsPanel) {
      settingsPanel.style.transform =
        "translate(-50%,-50%) scale(1)";
    }
  });
  state.settingsOpen =
    true;
}
function closeSettings() {
  if (!settingsPanel) {
    return;
  }
  settingsPanel.style.transform =
    "translate(-50%,-50%) scale(.96)";
  state.settingsOpen =
    false;
  setTimeout(() => {
    if (settingsPanel) {
      settingsPanel.style.display =
        "none";
    }
  }, 140);
}
// ============================================================
// MENU BACKDROP
// ============================================================
function createMenuBackdrop() {
  if (menuBackdrop) {
    return;
  }
  menuBackdrop =
    document.createElement("div");
  menuBackdrop.id =
    "zedMenuBackdrop";
  menuBackdrop.style.cssText = `
    position:fixed;
    inset:0;
    z-index:90;
    background:rgba(0,0,0,.28);
    backdrop-filter:blur(3px);
    -webkit-backdrop-filter:blur(3px);
    display:none;
  `;
  document.body.appendChild(menuBackdrop);
  menuBackdrop.addEventListener(
    "click",
    closeSidebar
  );
}
// ============================================================
// SIDEBAR
// ============================================================
function syncSidebarAccessibility() {
  const expanded = Boolean(sidebar?.classList.contains("open"));
  menuBtn?.setAttribute("aria-expanded", String(expanded));
  menuBtn?.setAttribute("aria-label", expanded ? "Close menu" : "Open menu");
}
function openSidebar() {
  if (!sidebar) return;
  sidebar.classList.add("open");
  if (menuBackdrop && window.innerWidth <= 700) menuBackdrop.style.display = "block";
  syncSidebarAccessibility();
}
function closeSidebar() {
  if (!sidebar) return;
  sidebar.classList.remove("open");
  if (menuBackdrop) menuBackdrop.style.display = "none";
  syncSidebarAccessibility();
}
function toggleSidebar() {
  if (!sidebar) return;
  if (sidebar.classList.contains("open")) closeSidebar();
  else openSidebar();
}
menuBtn?.addEventListener(
  "click",
  event => {
    event.stopPropagation();
    if (window.innerWidth <= 700) {
      toggleSidebar();
    }
  }
);
// Close sidebar when switching to desktop
window.addEventListener(
  "resize",
  () => {
    if (window.innerWidth > 700) {
      closeSidebar();
    }
  }
);
// ============================================================
// ACCOUNT
// ============================================================
function toggleAccountPanel() {
  if (!accountPanel) {
    return;
  }
  if (
    accountPanel.style.display ===
    "none" ||
    !accountPanel.style.display
  ) {
    updateAccountPanel();
    accountPanel.style.display =
      "block";
  } else {
    accountPanel.style.display =
      "none";
  }
}
profileBtn?.addEventListener(
  "click",
  event => {
    event.stopPropagation();
    closeSettings();
    toggleAccountPanel();
  }
);
accountBtn?.addEventListener(
  "click",
  event => {
    event.stopPropagation();
    closeSidebar();
    closeSettings();
    toggleAccountPanel();
  }
);
// ============================================================
// SETTINGS BUTTON
// ============================================================
settingsBtn?.addEventListener(
  "click",
  event => {
    event.stopPropagation();
    closeSidebar();
    if (accountPanel) {
      accountPanel.style.display =
        "none";
    }
    openSettings();
  }
);
// ============================================================
// CLOSE FLOATING PANELS
// ============================================================
document.addEventListener(
  "click",
  event => {
    if (
      accountPanel &&
      !accountPanel.contains(event.target) &&
      event.target !== profileBtn &&
      event.target !== accountBtn
    ) {
      accountPanel.style.display =
        "none";
    }
  }
);
// ============================================================
// AUTH HELPERS
// ============================================================
function showAuthMessage(
  message = ""
) {
  if (authMessage) {
    authMessage.textContent =
      message;
  }
}
function showAuth() {
  if (authScreen) {
    authScreen.style.display =
      "flex";
  }
  if (app) {
    app.style.display =
      "none";
  }
}
function showApp() {
  if (authScreen) {
    authScreen.style.display =
      "none";
  }
  if (app) {
    app.style.display =
      "flex";
  }
}
// ============================================================
// AUTH BUTTONS
// ============================================================
function setupAuthButtons() {
  googleLogin?.addEventListener(
    "click",
    async () => {
      try {
        showAuthMessage("");
        googleLogin.disabled =
          true;
        const provider =
          new GoogleAuthProvider();
        await signInWithPopup(
          firebaseAuth,
          provider
        );
      } catch (error) {
        console.error(
          "Google login error:",
          error
        );
        showAuthMessage(
          error.message
        );
      } finally {
        googleLogin.disabled =
          false;
      }
    }
  );
  emailLogin?.addEventListener(
    "click",
    async () => {
      try {
        showAuthMessage("");
        const email =
          emailInput.value.trim();
        const password =
          passwordInput.value;
        if (!email || !password) {
          throw new Error(
            "Enter your email and password."
          );
        }
        emailLogin.disabled =
          true;
        await signInWithEmailAndPassword(
          firebaseAuth,
          email,
          password
        );
      } catch (error) {
        console.error(
          "Email login error:",
          error
        );
        showAuthMessage(
          error.message
        );
      } finally {
        emailLogin.disabled =
          false;
      }
    }
  );
  emailSignup?.addEventListener(
    "click",
    async () => {
      try {
        showAuthMessage("");
        const email =
          emailInput.value.trim();
        const password =
          passwordInput.value;
        if (!email || !password) {
          throw new Error(
            "Enter an email and password."
          );
        }
        if (password.length < 6) {
          throw new Error(
            "Password must contain at least 6 characters."
          );
        }
        emailSignup.disabled =
          true;
        await createUserWithEmailAndPassword(
          firebaseAuth,
          email,
          password
        );
      } catch (error) {
        console.error(
          "Signup error:",
          error
        );
        showAuthMessage(
          error.message
        );
      } finally {
        emailSignup.disabled =
          false;
      }
    }
  );
}
// ============================================================
// HELPERS
// ============================================================
function escapeHtml(
  value = ""
) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
async function parseResponse(
  response
) {
  const text =
    await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return {
      ok: false,
      error:
        "The server returned an invalid response."
    };
  }
}
function setSending(
  value
) {
  state.sending =
    value;
  if (sendBtn) {
    sendBtn.disabled =
      value;
  }
  if (attachBtn) {
    attachBtn.disabled =
      value;
  }
  if (messageInput) {
    messageInput.disabled =
      value;
  }
}
// ============================================================
// SAFE MARKDOWN RENDERING
// ============================================================
// Build DOM nodes instead of injecting model output as HTML.
function appendInlineMarkdown(parent, source) {
  const text = String(source || "");
  const tokenPattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\x60([^\x60]+)\x60|\*([^*\n]+)\*|_([^_\n]+)_)/g;
  let cursor = 0;
  let match;
  while ((match = tokenPattern.exec(text))) {
    if (match.index > cursor) parent.appendChild(document.createTextNode(text.slice(cursor, match.index)));
    let node;
    if (match[2] && match[3]) {
      try {
        const url = new URL(match[3]);
        if (url.protocol === "http:" || url.protocol === "https:") {
          node = document.createElement("a");
          node.href = url.href;
          node.target = "_blank";
          node.rel = "noopener noreferrer";
          node.textContent = match[2];
        }
      } catch {}
    } else if (match[4] || match[5]) {
      node = document.createElement("strong");
      node.textContent = match[4] || match[5];
    } else if (match[6]) {
      node = document.createElement("code");
      node.textContent = match[6];
    } else if (match[7] || match[8]) {
      node = document.createElement("em");
      node.textContent = match[7] || match[8];
    }
    parent.appendChild(node || document.createTextNode(match[0]));
    cursor = tokenPattern.lastIndex;
  }
  if (cursor < text.length) parent.appendChild(document.createTextNode(text.slice(cursor)));
}

function renderMarkdownInto(container, markdown) {
  const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
  let index = 0;
  const isTableDivider = line => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
  const splitTableRow = line => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim());

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }

    if (/^\s{0,3}\x60\x60\x60/.test(line)) {
      index++;
      const codeLines = [];
      while (index < lines.length && !/^\s{0,3}\x60\x60\x60/.test(lines[index])) codeLines.push(lines[index++]);
      if (index < lines.length) index++;
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = codeLines.join("\n");
      pre.appendChild(code);
      container.appendChild(pre);
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,4})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const h = document.createElement("h" + Math.min(4, heading[1].length + 1));
      appendInlineMarkdown(h, heading[2]);
      container.appendChild(h);
      index++;
      continue;
    }

    if (index + 1 < lines.length && line.includes("|") && isTableDivider(lines[index + 1])) {
      const headers = splitTableRow(line);
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      headers.forEach(value => {
        const th = document.createElement("th");
        appendInlineMarkdown(th, value);
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);
      index += 2;
      const tbody = document.createElement("tbody");
      while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
        const values = splitTableRow(lines[index++]);
        const row = document.createElement("tr");
        headers.forEach((_, cellIndex) => {
          const td = document.createElement("td");
          appendInlineMarkdown(td, values[cellIndex] || "");
          row.appendChild(td);
        });
        tbody.appendChild(row);
      }
      table.appendChild(tbody);
      container.appendChild(table);
      continue;
    }

    const listMatch = line.match(/^\s{0,3}([-*+]|\d+[.)])\s+(.+)$/);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      const list = document.createElement(ordered ? "ol" : "ul");
      while (index < lines.length) {
        const itemMatch = lines[index].match(/^\s{0,3}([-*+]|\d+[.)])\s+(.+)$/);
        if (!itemMatch || /^\d/.test(itemMatch[1]) !== ordered) break;
        const item = document.createElement("li");
        appendInlineMarkdown(item, itemMatch[2]);
        list.appendChild(item);
        index++;
      }
      container.appendChild(list);
      continue;
    }

    if (/^\s{0,3}>\s?/.test(line)) {
      const quote = document.createElement("blockquote");
      while (index < lines.length && /^\s{0,3}>\s?/.test(lines[index])) {
        const paragraph = document.createElement("p");
        appendInlineMarkdown(paragraph, lines[index++].replace(/^\s{0,3}>\s?/, ""));
        quote.appendChild(paragraph);
      }
      container.appendChild(quote);
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length && lines[index].trim()) {
      if (/^\s{0,3}(#{1,4}\s|\x60\x60\x60|>\s?|([-*+]|\d+[.)])\s+)/.test(lines[index])) break;
      if (index + 1 < lines.length && lines[index].includes("|") && isTableDivider(lines[index + 1])) break;
      paragraphLines.push(lines[index++].trim());
    }
    if (paragraphLines.length) {
      const paragraph = document.createElement("p");
      appendInlineMarkdown(paragraph, paragraphLines.join(" "));
      container.appendChild(paragraph);
    } else {
      container.appendChild(document.createTextNode(line));
      index++;
    }
  }
}

// ============================================================
// MESSAGE RENDERING
// ============================================================
function renderMessages() {
  if (!messages) {
    return;
  }
  messages.innerHTML =
    "";
  if (!state.messages.length) {
    if (welcome) {
      welcome.style.display =
        "block";
    }
    return;
  }
  if (welcome) {
    welcome.style.display =
      "none";
  }
  for (
    const message of state.messages
  ) {
    const wrapper =
      document.createElement("div");
    wrapper.className =
      "message " +
      (
        message.role === "user"
          ? "message-user"
          : "message-assistant"
      );
    const content =
      document.createElement("div");
    content.className =
      "message-content";
    if (message.role === "assistant") {
      renderMarkdownInto(content, message.content || "");
    } else {
      content.textContent = message.content || "";
    }
    wrapper.appendChild(
      content
    );
    if (message.imageAttachment?.id || message.image) {
      const image = document.createElement("img");
      image.className = "message-uploaded-image";
      image.alt = message.imageAttachment?.name || message.imageName || "Uploaded image";
      image.loading = "lazy";

      // Prefer the authenticated, persistent image over a temporary blob URL.
      // Local previews are used only until the saved attachment metadata arrives.
      if (message.imageAttachment?.id) {
        image.dataset.attachmentId = message.imageAttachment.id;
        // Keep the current local/persistent preview visible while the
        // authenticated attachment is refreshed in the background.
        const fallbackPreview = message._previewObjectUrl || message.image;
        if (fallbackPreview) image.src = fallbackPreview;
      } else if (message.image) {
        image.src = message.image;
      }
      content.appendChild(image);

      if (message.imageAttachment?.id) {
        image.dataset.attachmentId = message.imageAttachment.id;
        const loadPersistentPreview = async () => {
          const response = await apiFetch(
            "/api/library/" + encodeURIComponent(message.imageAttachment.id) + "/content"
          );
          if (!response.ok) {
            const failure = await parseResponse(response).catch(() => ({}));
            throw new Error(failure?.error || "Image preview is unavailable.");
          }

          const imageBlob = await response.blob();
          if (!imageBlob.size || !imageBlob.type.startsWith("image/")) {
            throw new Error("The stored file did not return valid image data.");
          }

          const nextObjectUrl = URL.createObjectURL(imageBlob);
          try {
            // Decode the candidate before replacing the visible preview.
            const candidate = new Image();
            candidate.src = nextObjectUrl;
            if (typeof candidate.decode === "function") {
              await candidate.decode();
            } else {
              await new Promise((resolve, reject) => {
                candidate.onload = resolve;
                candidate.onerror = () => reject(new Error("The saved image could not be decoded."));
              });
            }

            if (!image.isConnected) {
              URL.revokeObjectURL(nextObjectUrl);
              return;
            }

            const previousObjectUrl = message._previewObjectUrl;
            image.src = nextObjectUrl;
            message._previewObjectUrl = nextObjectUrl;

            // Only release the previous preview after the new one is ready.
            if (previousObjectUrl && previousObjectUrl !== nextObjectUrl) {
              URL.revokeObjectURL(previousObjectUrl);
            }
            if (message.image && message.image.startsWith("blob:")) {
              URL.revokeObjectURL(message.image);
              message.image = null;
            }
          } catch (error) {
            URL.revokeObjectURL(nextObjectUrl);
            throw error;
          }
        };

        loadPersistentPreview().catch(error => {
          console.warn("Uploaded image could not be restored:", error.message);
          if (image.isConnected && !image.getAttribute("src")) {
            image.alt = "Saved image preview is temporarily unavailable.";
          }
        });
      }
    }
    if (message.role === "user" && message.fileAttachment && !message.imageAttachment && !message.image) {
      const fileChip = document.createElement("div");
      fileChip.className = "message-file-chip";
      fileChip.setAttribute("aria-label", "Attached file");
      const fileIcon = createDocumentIcon("message-file-icon");
      const fileLabel = document.createElement("span");
      fileLabel.textContent = "File";
      fileChip.append(fileIcon, fileLabel);
      content.appendChild(fileChip);
    }
    // Display validated web sources as ordinary safe links.
    if (message.role === "assistant" && Array.isArray(message.webSources) && message.webSources.length) {
      const sourcePanel = document.createElement("section");
      sourcePanel.className = "web-sources";
      sourcePanel.style.cssText = "margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,.10);display:flex;flex-direction:column;gap:8px;";
      const sourceHeading = document.createElement("div");
      sourceHeading.textContent = "Sources";
      sourceHeading.style.cssText = "font-size:12px;font-weight:600;color:var(--text-secondary,#a0a0a0);";
      sourcePanel.appendChild(sourceHeading);

      for (const source of message.webSources.slice(0, 8)) {
        let parsedUrl;
        try {
          parsedUrl = new URL(source.url);
        } catch {
          continue;
        }
        if (!["http:", "https:"].includes(parsedUrl.protocol)) continue;

        const link = document.createElement("a");
        link.href = parsedUrl.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = source.title || source.source || parsedUrl.hostname;
        link.style.cssText = "color:var(--text-secondary,#a0a0a0);font-size:13px;text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere;";
        link.title = [source.source, source.published].filter(Boolean).join(" · ");
        sourcePanel.appendChild(link);
      }
      if (sourcePanel.childElementCount > 1) wrapper.appendChild(sourcePanel);
    }

    // Provide a safe copy action for each message without interpreting text as HTML.
    const actions = document.createElement("div");
    actions.className = "message-actions";
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "message-action message-copy-button";
    copyButton.textContent = "⧉";
    copyButton.title = message.role === "user" ? "Copy message" : "Copy response";
    copyButton.setAttribute(
      "aria-label",
      message.role === "user" ? "Copy your message" : "Copy Zed's response"
    );
    copyButton.addEventListener("click", async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(message.content || "");
        } else {
          const temporary = document.createElement("textarea");
          temporary.value = message.content || "";
          temporary.setAttribute("readonly", "");
          temporary.style.position = "fixed";
          temporary.style.opacity = "0";
          document.body.appendChild(temporary);
          temporary.select();
          const copied = document.execCommand("copy");
          temporary.remove();
          if (!copied) throw new Error("Copy is not available in this browser.");
        }
        copyButton.textContent = "✓";
        copyButton.title = "Copied";
        copyButton.setAttribute("aria-label", "Copied");
      } catch (error) {
        console.warn("Unable to copy message:", error);
        copyButton.textContent = "!";
        copyButton.title = "Copy failed";
        copyButton.setAttribute("aria-label", "Copy failed");
      }
      window.setTimeout(() => {
        if (!copyButton.isConnected) return;
        copyButton.textContent = "⧉";
        copyButton.title = message.role === "user" ? "Copy message" : "Copy response";
        copyButton.setAttribute(
          "aria-label",
          message.role === "user" ? "Copy your message" : "Copy Zed's response"
        );
      }, 1400);
    });
    actions.appendChild(copyButton);
    wrapper.appendChild(actions);

    messages.appendChild(
      wrapper
    );
  }
  requestAnimationFrame(
    () => {
      const chatArea =
        document.querySelector(
          ".chat-area"
        );
      if (chatArea) {
        chatArea.scrollTop =
          chatArea.scrollHeight;
      }
    }
  );
}
// ============================================================
// THINKING
// ============================================================
function showThinking() {
  const wrapper = document.createElement("div");
  wrapper.className = "message message-assistant thinking-indicator";
  wrapper.id = "thinkingMessage";
  wrapper.setAttribute("role", "status");
  wrapper.setAttribute("aria-label", "Zed is responding");
  const content = document.createElement("div");
  content.className = "message-content thinking-content";
  const label = document.createElement("span");
  label.textContent = "Zed is responding";
  const dots = document.createElement("span");
  dots.className = "thinking-dots";
  dots.setAttribute("aria-hidden", "true");
  dots.textContent = "•••";
  content.append(label, dots);
  wrapper.appendChild(content);
  messages?.appendChild(wrapper);
}
function removeThinking() {
  document
    .getElementById(
      "thinkingMessage"
    )
    ?.remove();
}
// ============================================================
// LOAD CHATS
// ============================================================
async function loadChats() {
  const requestUid = state.userId;
  const requestGeneration = state.authGeneration;
  if (!requestUid || !state.firebaseUser || state.firebaseUser.uid !== requestUid) return;
  try {
    const response = await apiFetch(`/api/chats?userId=${encodeURIComponent(requestUid)}`);
    const data = await parseResponse(response);
    if (state.authGeneration !== requestGeneration || state.userId !== requestUid) return;
    if (!response.ok || !data.ok) throw new Error(data.error || "Unable to load chats.");
    state.chats = Array.isArray(data.chats) ? data.chats : [];
    state.chatHistoryUnavailable = data.persistent === false;
    renderRecentChats();
  } catch (error) {
    if (state.authGeneration !== requestGeneration || state.userId !== requestUid) return;
    console.error("Load chats error:", error);
    state.chatHistoryUnavailable = true;
    renderRecentChats();
  }
}
// ============================================================
// RECENT CHATS
// ============================================================
function renderRecentChats() {
  if (!recentChats) {
    return;
  }
  recentChats.innerHTML =
    "";
  if (!state.chats.length) {
    const empty =
      document.createElement("div");
    empty.style.cssText = `
      color:#777;
      font-size:12px;
      padding:10px;
    `;
    empty.textContent = state.chatHistoryUnavailable
      ? "Chat history is temporarily unavailable. Check your connection and try again."
      : "No conversations yet.";
    recentChats.appendChild(
      empty
    );
    return;
  }
  for (
    const chat of state.chats
  ) {
    const id =
      chat.id ||
      chat.conversationId;
    if (!id) {
      continue;
    }
    const item =
      document.createElement("button");
    item.className =
      "recent-chat";
    item.type =
      "button";
    item.textContent =
      chat.title ||
      "New chat";
    item.addEventListener(
      "click",
      async () => {
        await loadConversation(id);
        closeSidebar();
      }
    );
    recentChats.appendChild(
      item
    );
  }
}
// ============================================================
// LOAD CONVERSATION
// ============================================================
async function loadConversation(conversationId) {
  const requestUid = state.userId;
  const requestGeneration = state.authGeneration;
  if (!requestUid || !conversationId || !state.firebaseUser || state.firebaseUser.uid !== requestUid) return;
  try {
    const response = await apiFetch(`/api/chat/${encodeURIComponent(conversationId)}?userId=${encodeURIComponent(requestUid)}`);
    const data = await parseResponse(response);
    if (state.authGeneration !== requestGeneration || state.userId !== requestUid) return;
    if (!response.ok || !data.ok) throw new Error(data.error || "Unable to load conversation.");
    state.conversationId = data.conversation.id;
    state.messages = Array.isArray(data.conversation.messages) ? data.conversation.messages : [];
    renderMessages();
  } catch (error) {
    if (state.authGeneration !== requestGeneration || state.userId !== requestUid) return;
    console.error("Conversation error:", error);
  }
}
// ============================================================
// NEW CHAT
// ============================================================
async function createNewChat() {
  if (state.sending || !state.userId || !state.firebaseUser || state.firebaseUser.uid !== state.userId) return;
  const requestUid = state.userId;
  const requestGeneration = state.authGeneration;
  try {
    const response = await apiFetch("/api/new-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: requestUid })
    });
    const data = await parseResponse(response);
    if (state.authGeneration !== requestGeneration || state.userId !== requestUid) return;
    if (!response.ok || !data.ok) throw new Error(data.error || "Unable to create a new chat.");
    state.conversationId = data.conversationId || data.conversation?.id || null;
    state.messages = [];
    state.selectedFile = null;
    renderSelectedFileChip();
    renderMessages();
    await loadChats();
    if (state.authGeneration !== requestGeneration || state.userId !== requestUid) return;
    closeSidebar();
    messageInput?.focus();
  } catch (error) {
    if (state.authGeneration !== requestGeneration || state.userId !== requestUid) return;
    console.error("New chat error:", error);
  }
}
newChatBtn?.addEventListener(
  "click",
  createNewChat
);
// ============================================================
// FILE READER
// ============================================================
function readFileAsDataURL(
  file
) {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();
      reader.onload =
        () => {
          resolve({
            name:
              file.name,
            mimeType:
              file.type,
            data:
              reader.result
          });
        };
      reader.onerror =
        reject;
      reader.readAsDataURL(
        file
      );
    }
  );
}
async function optimizeImageForUpload(file) {
  const MAX_EDGE = 2048;
  const MAX_OUTPUT_BYTES = 12 * 1024 * 1024;
  if (!file?.type?.startsWith("image/")) return file;
  if (file.size <= MAX_OUTPUT_BYTES && !["image/heic", "image/heif"].includes(file.type)) return file;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("This image is too large to upload. Please convert it to JPEG, PNG, or WebP and try again.");
  }

  let bitmap;
  let sourceUrl;
  try {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(file);
    } else {
      const image = new Image();
      sourceUrl = URL.createObjectURL(file);
      bitmap = await new Promise((resolve, reject) => {
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Zed could not read this image. Please try another image."));
        image.src = sourceUrl;
      });
    }
    const width = bitmap.width || bitmap.naturalWidth;
    const height = bitmap.height || bitmap.naturalHeight;
    if (!width || !height) throw new Error("Zed could not read this image.");

    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image preparation is not available in this browser.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const toBlob = (type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));
    let outputType = file.type === "image/png" ? "image/png" : "image/webp";
    let blob = await toBlob(outputType, 0.82);
    if (!blob && outputType === "image/webp") {
      outputType = "image/jpeg";
      blob = await toBlob(outputType, 0.82);
    }
    if (!blob) throw new Error("Zed could not prepare this image for upload.");
    if (blob.size > MAX_OUTPUT_BYTES && outputType !== "image/jpeg") {
      outputType = "image/jpeg";
      blob = await toBlob(outputType, 0.76);
    }
    if (!blob || blob.size > MAX_OUTPUT_BYTES) {
      throw new Error("This image is still too large after compression. Please choose a smaller image.");
    }

    const extension = outputType === "image/png" ? ".png" : outputType === "image/jpeg" ? ".jpg" : ".webp";
    const baseName = String(file.name || "uploaded-image").replace(/\.[^.]+$/, "");
    return new File([blob], baseName + extension, { type: outputType, lastModified: Date.now() });
  } finally {
    if (bitmap && typeof bitmap.close === "function") bitmap.close();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }
}
// ============================================================
// SEND MESSAGE
// ============================================================
async function sendMessage() {
  if (
    state.sending ||
    !state.userId ||
    !state.firebaseUser ||
    state.firebaseUser.uid !== state.userId
  ) {
    return;
  }
  const requestUid = state.userId;
  const requestGeneration = state.authGeneration;
  const requestFile = state.selectedFile;
  const requestConversationId = state.conversationId;
  const text =
    messageInput?.value.trim() ||
    "";
  if (
    !text &&
    !state.selectedFile
  ) {
    return;
  }
  const isImageUpload = Boolean(requestFile?.type?.startsWith("image/"));
  const maxOriginalBytes = isImageUpload ? 30 * 1024 * 1024 : 18 * 1024 * 1024;
  if (requestFile && requestFile.size > maxOriginalBytes) {
    state.messages.push({
      role: "assistant",
      content: isImageUpload
        ? "This image is too large for the browser to prepare safely. Please choose an image smaller than 30 MB."
        : "This file is too large to analyse. Please choose a file smaller than 18 MB."
    });
    renderMessages();
    return;
  }
  setSending(true);
  const previousMessages =
    state.messages.slice();
  const selectedImage = requestFile && requestFile.type?.startsWith("image/")
    ? requestFile
    : null;
  const localImagePreview = selectedImage ? URL.createObjectURL(selectedImage) : null;
  state.messages.push({
    role:"user",
    content:
      text ||
      "Please analyze this uploaded file.",
    ...(localImagePreview ? { image: localImagePreview, imageName: selectedImage.name } : {}),
    ...(requestFile && !isImageUpload ? { fileAttachment: { kind: "file" } } : {})
  });
  renderMessages();
  messageInput.value =
    "";
  messageInput.style.height =
    "auto";
  let filePayload =
    null;
  try {
    if (requestFile) {
      const uploadFile = isImageUpload
        ? await optimizeImageForUpload(requestFile)
        : requestFile;
      filePayload = await readFileAsDataURL(uploadFile);
    }
    if (state.authGeneration !== requestGeneration || state.userId !== requestUid) return null;
    showThinking();
    const chatRequestBody = {
      message: text,
      userId: requestUid,
      conversationId: requestConversationId,
      conversation: previousMessages.map(message => ({
        role: message.role,
        text: message.content
      })),
      file: filePayload
    };
    let response = await apiFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chatRequestBody)
    });
    let data = await parseResponse(response);

    // A stale or inaccessible conversation must never block a user's first message.
    // Create a fresh conversation under the currently authenticated UID, then retry once.
    if (
      response.status === 404 &&
      requestConversationId &&
      /conversation not found/i.test(String(data.error || data.answer || ""))
    ) {
      const newChatResponse = await apiFetch("/api/new-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: requestUid })
      });
      const newChatData = await parseResponse(newChatResponse);
      if (
        state.authGeneration !== requestGeneration ||
        state.userId !== requestUid
      ) return null;
      const freshConversationId =
        newChatData.conversationId || newChatData.conversation?.id;
      if (!newChatResponse.ok || !newChatData.ok || !freshConversationId) {
        throw new Error(newChatData.error || "A fresh chat could not be created. Please try again.");
      }
      state.conversationId = freshConversationId;
      chatRequestBody.conversationId = freshConversationId;
      response = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chatRequestBody)
      });
      data = await parseResponse(response);
    }
    if (state.authGeneration !== requestGeneration || state.userId !== requestUid) return null;
    removeThinking();
    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
        data.answer ||
        "Zed could not respond."
      );
    }
    state.conversationId =
      data.conversationId ||
      state.conversationId;
    const currentUserMessage = [...state.messages].reverse().find(message => message.role === "user");
    if (currentUserMessage && data.imageAttachment) {
      currentUserMessage.imageAttachment = data.imageAttachment;
    }
    if (currentUserMessage && data.fileAttachment) {
      currentUserMessage.fileAttachment = data.fileAttachment;
    }
    if (currentUserMessage && selectedImage && !data.imageAttachment) {
      currentUserMessage.imageSaveWarning = true;
    }
    const assistantAnswer = data.answer || data.reply || "Zed did not return an answer.";
    state.messages.push({
      role:"assistant",
      content: assistantAnswer,
      webSearch: data.webSearch === true,
      webSources: Array.isArray(data.webSources) ? data.webSources : []
    });
    speakZedResponse(assistantAnswer);
    if (data.chatPersistent === false) {
      state.messages.push({
        role:"assistant",
        content:"Warning: this reply could not be saved to your chat history. Copy anything important before leaving this conversation."
      });
    }
    renderMessages();
    await loadChats();
    if (state.authGeneration !== requestGeneration || state.userId !== requestUid) return null;
    return assistantAnswer;
  } catch (error) {
    if (state.authGeneration !== requestGeneration || state.userId !== requestUid) {
      console.info("Discarded a chat response after the signed-in account changed.");
      return null;
    }
    console.error(
      "Chat error:",
      error
    );
    removeThinking();
    state.messages.push({
      role:"assistant",
      content:
        "I couldn't complete that request.\n\n" +
        error.message
    });
    renderMessages();
    return null;
  } finally {
    if (state.authGeneration === requestGeneration && state.userId === requestUid) {
      state.selectedFile = null;
      if (state.selectedFilePreviewUrl) {
        URL.revokeObjectURL(state.selectedFilePreviewUrl);
        state.selectedFilePreviewUrl = null;
      }
      if (fileInput) fileInput.value = "";
      renderSelectedFileChip();
      setSending(false);
      messageInput?.focus();
    }
  }
}
// Voice submits recognised speech through this same authenticated chat pipeline.
window.zedVoiceSubmitTranscript = async transcript => {
  const spokenText = String(transcript || "").trim();
  if (!spokenText) return "";
  if (state.sending) throw new Error("Zed is still completing the previous request.");
  if (!state.userId || !state.firebaseUser) throw new Error("Please sign in to use voice chat.");
  messageInput.value = spokenText;
  const requestUid = state.userId;
  const answer = await sendMessage();
  if (state.userId !== requestUid) {
    throw new Error("Your Zed account changed during the voice request. Please restart voice chat.");
  }
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("Zed could not complete that voice request. Please try again.");
  }
  return answer.trim();
};

sendBtn?.addEventListener(
  "click",
  sendMessage
);
// ============================================================
// INPUT
// ============================================================
messageInput?.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }
);
messageInput?.addEventListener(
  "input",
  () => {
    messageInput.style.height =
      "auto";
    messageInput.style.height =
      Math.min(
        messageInput.scrollHeight,
        180
      ) + "px";
  }
);
// ============================================================
// ATTACHMENTS
// ============================================================
attachBtn?.addEventListener(
  "click",
  event => {
    event.stopPropagation();
    if (state.sending) {
      return;
    }
    attachMenu?.classList.toggle(
      "show"
    );
  }
);
document.addEventListener(
  "click",
  event => {
    if (
      attachMenu &&
      !attachMenu.contains(event.target) &&
      event.target !== attachBtn
    ) {
      attachMenu.classList.remove(
        "show"
      );
    }
  }
);
uploadPhotoBtn?.addEventListener(
  "click",
  () => {
    attachMenu?.classList.remove(
      "show"
    );
    fileInput?.click();
  }
);
uploadFileBtn?.addEventListener(
  "click",
  () => {
    attachMenu?.classList.remove(
      "show"
    );
    fileInput?.click();
  }
);
fileInput?.addEventListener(
  "change",
  () => {
    const file =
      fileInput.files?.[0];
    if (!file) {
      return;
    }

    const maxUploadBytes =
      18 * 1024 * 1024;

    if (file.size > maxUploadBytes) {
      state.selectedFile = null;
      fileInput.value = "";
      alert(
        "This file is too large. Please choose a file smaller than 18 MB."
      );
      return;
    }

    if (state.selectedFilePreviewUrl) {
      URL.revokeObjectURL(state.selectedFilePreviewUrl);
      state.selectedFilePreviewUrl = null;
    }
    const originalName = String(file.name || "");
    const extensionMatch = originalName.match(/(\.[a-z0-9]{1,12})$/i);
    const safeDisplayName = "File" + (extensionMatch ? extensionMatch[1] : "");
    state.selectedFile = new File([file], safeDisplayName, {
      type: file.type,
      lastModified: file.lastModified
    });
    renderSelectedFileChip();
    // Keep the user's composer text unchanged when an attachment is selected.
    // The user decides what Zed should do with the attached file.
    messageInput.focus();
  }
);
// ============================================================
// IMAGE GENERATION
// ============================================================
async function createImage() {
  if (
    state.sending ||
    !state.userId
  ) {
    return;
  }
  const prompt =
    messageInput?.value.trim();
  if (!prompt) {
    alert(
      "Describe the image you want Zed to create."
    );
    return;
  }
  attachMenu?.classList.remove(
    "show"
  );
  setSending(true);
  state.messages.push({
    role:"user",
    content:
      "Create an image: " +
      prompt
  });
  renderMessages();
  messageInput.value =
    "";
  showThinking();
  try {
    const response =
      await apiFetch(
        "/api/generate-image",
        {
          method:"POST",
          headers:{
            "Content-Type":
              "application/json"
          },
          body:JSON.stringify({
            prompt
          })
        }
      );
    const data =
      await parseResponse(
        response
      );
    removeThinking();
    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
        "Image generation failed."
      );
    }
    const result =
      data.result || {};
    let imageSource =
      null;
    if (
      result.image &&
      result.contentType
    ) {
      imageSource =
        `data:${result.contentType};base64,${result.image}`;
    } else if (
      data.image
    ) {
      imageSource =
        data.image;
    }
    state.messages.push({
      role:"assistant",
      content:
        imageSource
          ? "I created the image you requested."
          : "The image service returned a result, but no image could be displayed.",
      image:
        imageSource
    });
    renderMessages();
    if (imageSource && imageSource.startsWith("data:")) {
      try {
        const extension = result.contentType === "image/webp" ? "webp" :
          result.contentType === "image/jpeg" ? "jpg" :
          result.contentType === "image/gif" ? "gif" : "png";
        const saved = await apiFetch("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "zed-image-" + Date.now() + "." + extension, dataUrl: imageSource })
        });
        const savedData = await parseResponse(saved);
        if (!saved.ok || !savedData.ok) console.warn("Generated image was not saved to Library:", savedData.error);
      } catch (saveError) {
        console.warn("Generated image could not be saved to Library:", saveError.message);
      }
    }
    await loadChats();
  } catch (error) {
    console.error(
      "Image generation error:",
      error
    );
    removeThinking();
    state.messages.push({
      role:"assistant",
      content:
        "I couldn't create that image right now.\n\n" +
        error.message
    });
    renderMessages();
  } finally {
    setSending(false);
    messageInput?.focus();
  }
}
createImageBtn?.addEventListener(
  "click",
  createImage
);
// ============================================================
// VOICE INPUT
// ============================================================
let recognition = null;
const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;
if (SpeechRecognition) {
  recognition =
    new SpeechRecognition();
  recognition.lang =
    "en-US";
  recognition.interimResults =
    false;
  recognition.continuous =
    false;
  recognition.onresult =
    event => {
      const transcript =
        event.results[0][0]
          .transcript;
      if (messageInput) {
        messageInput.value =
          transcript;
        messageInput.dispatchEvent(
          new Event("input")
        );
        messageInput.focus();
      }
    };
  recognition.onerror =
    error => {
      console.error(
        "Voice recognition error:",
        error
      );
      if (voiceInputBtn) voiceInputBtn.setAttribute("aria-label", "Dictate a message");
    };
}
const voiceInputBtn = document.getElementById("voiceInputBtn");
const voiceModeBtn = document.getElementById("voiceModeBtn");
let voiceModeEnabled = false;

window.zedVoiceSetEnabled = enabled => {
  voiceModeEnabled = Boolean(enabled);
  if (!voiceModeEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  voiceModeBtn?.setAttribute("aria-pressed", String(voiceModeEnabled));
};

function speakZedResponse(text) {
  // Dedicated voice mode speaks the reply itself after the shared chat request resolves.
  if (window.ZedVoiceMode?.isActive) return;
  if (!voiceModeEnabled || !("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(String(text).slice(0, 5000));
  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.onstart = () => window.dispatchEvent(new CustomEvent("zed:voice-speaking", { detail: { speaking: true } }));
  utterance.onend = () => window.dispatchEvent(new CustomEvent("zed:voice-speaking", { detail: { speaking: false } }));
  utterance.onerror = () => window.dispatchEvent(new CustomEvent("zed:voice-speaking", { detail: { speaking: false } }));
  window.speechSynthesis.speak(utterance);
}

voiceInputBtn?.addEventListener("click", () => {
  if (!recognition) {
    alert("Voice dictation is not supported by this browser. You can still type your message.");
    return;
  }
  try {
    recognition.start();
    voiceInputBtn.setAttribute("aria-label", "Listening");
  } catch (error) {
    console.warn("Voice input could not start:", error);
  }
});

recognition && (recognition.onend = () => {
  voiceInputBtn?.setAttribute("aria-label", "Dictate a message");
});

voiceModeBtn?.setAttribute("aria-pressed", "false");
voiceModeBtn?.addEventListener("click", () => {
  voiceModeEnabled = !voiceModeEnabled;
  voiceModeBtn.setAttribute("aria-pressed", String(voiceModeEnabled));
  voiceModeBtn.setAttribute("aria-label", voiceModeEnabled ? "Turn off spoken responses" : "Turn on spoken responses");
  if (!voiceModeEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  if (voiceModeEnabled) {
    const latest = [...state.messages].reverse().find(item => item.role === "assistant" && item.content);
    if (latest) speakZedResponse(latest.content);
  }
});
// ============================================================
// AUTH STATE
// ============================================================
function setupAuthListener() {
  onAuthStateChanged(
    firebaseAuth,
    async user => {
      const nextUid = user?.uid || null;
      if (state.userId !== nextUid) {
        state.authGeneration += 1;
        state.sending = false;
        setSending(false);
        state.selectedFile = null;
        state.chats = [];
        state.chatHistoryUnavailable = false;
        if (fileInput) fileInput.value = "";
        removeThinking();
        window.ZedVoiceMode?.stop?.();
        renderRecentChats();
        document.getElementById("projectList")?.replaceChildren();
      }
      state.firebaseUser =
        user || null;
      updateGoogleProfileAvatar();
      state.userId =
        user?.uid || null;
      if (user) {
        state.conversationId =
          null;
        state.messages =
          [];
        updateAccountPanel();
        showApp();
        renderMessages();
        await loadChats();
        await loadProjects();
        checkDueScheduledTasks();
        messageInput?.focus();
      } else {
        state.userId =
          null;
        state.firebaseUser =
          null;
        state.conversationId =
          null;
        state.messages =
          [];
        state.chats =
          [];
        closeSidebar();
        closeFeaturePanel();
        closeSettings();
        if (accountPanel) {
          accountPanel.style.display =
            "none";
        }
        renderMessages();
        showAuth();
      }
    }
  );
}
// ============================================================
// SIDEBAR FEATURES: SEARCH, PROJECTS, LIBRARY, IMAGES, EXPLORE
// ============================================================
const chatSearchInput = document.getElementById("chatSearchInput");
const sidebarSearchToggle = document.getElementById("sidebarSearchToggle");
const sidebarSearchWrap = document.getElementById("sidebarSearchWrap");
const projectList = document.getElementById("projectList");
const addProjectBtn = document.getElementById("addProjectBtn");
const seeAllChatsBtn = document.getElementById("seeAllChatsBtn");
let showAllChats = false;
let featurePanel = null;

function ensureFeaturePanel() {
  if (featurePanel) return featurePanel;
  featurePanel = document.createElement("section");
  featurePanel.className = "zed-feature-panel";
  featurePanel.id = "zedFeaturePanel";
  featurePanel.setAttribute("aria-live", "polite");
  document.body.appendChild(featurePanel);
  return featurePanel;
}

function closeFeaturePanel() {
  featurePanel?.classList.remove("open");
}

function openFeaturePanel(title, content) {
  const panel = ensureFeaturePanel();
  panel.replaceChildren();
  const head = document.createElement("div");
  head.className = "zed-feature-head";
  const heading = document.createElement("h2");
  heading.textContent = title;
  const close = document.createElement("button");
  close.className = "zed-feature-close";
  close.type = "button";
  close.setAttribute("aria-label", "Close");
  close.textContent = "×";
  close.addEventListener("click", closeFeaturePanel);
  head.append(heading, close);
  panel.append(head, content);
  panel.classList.add("open");
}

function featureCard(title, description, actionLabel, action) {
  const card = document.createElement("article");
  card.className = "zed-feature-card";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const copy = document.createElement("p");
  copy.textContent = description;
  card.append(heading, copy);
  if (actionLabel && action) {
    const button = document.createElement("button");
    button.className = "zed-feature-action";
    button.type = "button";
    button.textContent = actionLabel;
    button.addEventListener("click", action);
    card.append(button);
  }
  return card;
}

async function openImagesView() {
  const content = document.createElement("div");
  const status = document.createElement("p");
  status.className = "zed-library-status";
  status.textContent = "Loading your saved images…";
  const grid = document.createElement("div");
  grid.className = "zed-image-grid";
  const create = document.createElement("button");
  create.type = "button";
  create.className = "zed-feature-action";
  create.textContent = "＋ Create an image";
  create.addEventListener("click", () => {
    closeFeaturePanel();
    messageInput.value = "Create an image: ";
    messageInput.focus();
  });
  content.append(create, status, grid);
  openFeaturePanel("Images", content);
  try {
    const response = await apiFetch("/api/library");
    const data = await parseResponse(response);
    if (!response.ok || !data.ok) throw new Error(data.error || "Images could not be loaded.");
    const images = (data.files || []).filter(file => String(file.contentType || "").startsWith("image/"));
    status.textContent = images.length ? images.length + " saved image(s)" : "No saved images yet. Images you create with Zed will appear here.";
    for (const file of images) {
      const card = document.createElement("article");
      card.className = "zed-feature-card";
      const image = document.createElement("img");
      image.alt = file.name || "Image created with Zed";
      image.loading = "lazy";
      image.style.cssText = "width:100%;aspect-ratio:1;object-fit:contain;border-radius:12px;background:#f5f5f5;";
      const caption = document.createElement("p");
      caption.textContent = file.name;
      card.append(image, caption);
      grid.append(card);
      try {
        const previewResponse = await apiFetch("/api/library/" + encodeURIComponent(file.id) + "/preview");
        const preview = await parseResponse(previewResponse);
        if (previewResponse.ok && preview.ok) image.src = preview.url;
      } catch (error) {
        caption.textContent += " · Preview unavailable";
      }
    }
  } catch (error) {
    status.textContent = error.message || "Your image library is temporarily unavailable.";
  }
}

async function openLibraryView() {
  const content = document.createElement("div");
  const intro = document.createElement("p");
  intro.textContent = "Save files privately to your Zed account and access them across devices.";
  intro.style.color = "#707070";
  content.append(intro);
  const upload = document.createElement("button");
  upload.className = "zed-feature-action";
  upload.type = "button";
  upload.textContent = "＋ Upload a file";
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = ".pdf,.txt,.csv,.json,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif";
  picker.hidden = true;
  const list = document.createElement("div");
  list.className = "zed-library-list";
  const status = document.createElement("p");
  status.className = "zed-library-status";
  status.textContent = "Loading saved files…";
  content.append(upload, picker, status, list);
  upload.addEventListener("click", () => picker.click());
  picker.addEventListener("change", async () => {
    const file = picker.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      status.textContent = "Choose a file smaller than 15 MB.";
      picker.value = "";
      return;
    }
    status.textContent = "Uploading " + file.name + "…";
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("The file could not be read."));
        reader.readAsDataURL(file);
      });
      const response = await apiFetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, dataUrl })
      });
      const data = await parseResponse(response);
      if (!response.ok || !data.ok) throw new Error(data.error || "Upload failed.");
      status.textContent = "Saved " + file.name + " to your Library.";
      await refreshLibrary();
    } catch (error) {
      status.textContent = error.message || "Upload failed. Try again.";
    } finally {
      picker.value = "";
    }
  });
  async function refreshLibrary() {
    list.replaceChildren();
    try {
      const response = await apiFetch("/api/library");
      const data = await parseResponse(response);
      if (!response.ok || !data.ok) throw new Error(data.error || "Library unavailable.");
      const files = Array.isArray(data.files) ? data.files : [];
      status.textContent = files.length ? files.length + " saved file(s)" : "Your library is empty. Upload a file to get started.";
      for (const file of files) {
        const row = document.createElement("article");
        row.className = "zed-feature-card zed-library-row";
        const heading = document.createElement("h3");
        heading.textContent = file.name;
        const meta = document.createElement("p");
        meta.textContent = (file.contentType || "File") + " · " + formatFileSize(file.size) + " · " + new Date(file.createdAt).toLocaleDateString();
        const actions = document.createElement("div");
        actions.className = "zed-library-actions";
        const download = document.createElement("button");
        download.type = "button";
        download.className = "zed-feature-action";
        download.textContent = "Download";
        download.addEventListener("click", async () => {
          try {
            const result = await apiFetch("/api/library/" + encodeURIComponent(file.id) + "/download");
            const payload = await parseResponse(result);
            if (!result.ok || !payload.ok || !payload.url) throw new Error(payload.error || "Download unavailable.");
            window.open(payload.url, "_blank", "noopener");
          } catch (error) { status.textContent = error.message; }
        });
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "zed-library-delete";
        remove.textContent = "Delete";
        remove.addEventListener("click", async () => {
          if (!window.confirm("Delete " + file.name + " from your Library?")) return;
          try {
            const result = await apiFetch("/api/library/" + encodeURIComponent(file.id), { method: "DELETE" });
            const payload = await parseResponse(result);
            if (!result.ok || !payload.ok || !payload.deleted) throw new Error(payload.error || "Delete failed.");
            await refreshLibrary();
          } catch (error) { status.textContent = error.message; }
        });
        actions.append(download, remove);
        row.append(heading, meta, actions);
        list.append(row);
      }
    } catch (error) {
      status.textContent = error.message || "Library could not be loaded.";
    }
  }
  openFeaturePanel("Library", content);
  await refreshLibrary();
}

function formatFileSize(bytes = 0) {
  const size = Number(bytes) || 0;
  if (size < 1024) return size + " B";
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB";
  return (size / (1024 * 1024)).toFixed(1) + " MB";
}

async function loadProjects() {
  const requestUid = state.userId;
  const requestGeneration = state.authGeneration;
  if (!projectList || !requestUid || !state.firebaseUser || state.firebaseUser.uid !== requestUid) return;
  projectList.replaceChildren();
  const loading = document.createElement("div");
  loading.className = "sidebar-empty";
  loading.textContent = "Loading projects…";
  projectList.append(loading);
  try {
    const response = await apiFetch("/api/projects");
    const data = await parseResponse(response);
    if (state.authGeneration !== requestGeneration || state.userId !== requestUid) return;
    if (!response.ok || !data.ok) throw new Error(data.error || "Projects could not be loaded.");
    projectList.replaceChildren();
    const projects = Array.isArray(data.projects) ? data.projects : [];
    if (!projects.length) {
      const empty = document.createElement("div");
      empty.className = "sidebar-empty";
      empty.textContent = "Your projects will appear here.";
      projectList.append(empty);
      return;
    }
    for (const project of projects) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "project-link";
      const icon = document.createElement("span");
      icon.textContent = "▱";
      const label = document.createElement("span");
      label.textContent = project.name || "Untitled project";
      button.append(icon, label);
      button.addEventListener("click", () => openProjectView(project));
      projectList.append(button);
    }
  } catch (error) {
    if (state.authGeneration !== requestGeneration || state.userId !== requestUid) return;
    projectList.replaceChildren();
    const failed = document.createElement("div");
    failed.className = "sidebar-empty";
    failed.textContent = "Projects are temporarily unavailable. Try again.";
    projectList.append(failed);
    console.error("Project list error:", error);
  }
}
function openProjectView(project) {
  const content = document.createElement("div");
  content.append(featureCard(
    project.name || "Project",
    project.description || "Your project workspace.",
    "Start a chat about this project",
    () => {
      closeFeaturePanel();
      createNewChat().then(() => {
        messageInput.value = "I want to work on the project: " + (project.name || "this project") + ". ";
        messageInput.focus();
      });
    }
  ));
  openFeaturePanel(project.name || "Project", content);
}

async function createProjectFromPrompt() {
  if (!state.firebaseUser) return;
  const name = window.prompt("Name your new project");
  if (!name || !name.trim()) return;
  try {
    const response = await apiFetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: "" })
    });
    const data = await parseResponse(response);
    if (!response.ok || !data.ok) throw new Error(data.error || "Project could not be created.");
    await loadProjects();
  } catch (error) {
    alert(error.message || "Project could not be created.");
  }
}

function openExploreView() {
  const content = document.createElement("div");
  content.append(
    featureCard("Writing and editing", "Draft, rewrite, proofread and improve messages or documents.", "Start writing", () => { closeFeaturePanel(); messageInput.value = "Help me write or edit: "; messageInput.focus(); }),
    featureCard("Study assistant", "Get explanations, guided lessons, summaries and practice questions.", "Start studying", () => { closeFeaturePanel(); messageInput.value = "Help me study: "; messageInput.focus(); }),
    featureCard("CV and cover letter maker", "Build a professional CV, tailor work experience and prepare job applications using details you provide.", "Create a CV", () => { closeFeaturePanel(); messageInput.value = "Help me create a professional CV. Ask me for the information you need: "; messageInput.focus(); }),
    featureCard("Business assistant", "Work through business ideas, planning, marketing and practical documents.", "Explore business", () => { closeFeaturePanel(); messageInput.value = "Help me with a business task: "; messageInput.focus(); }),
    featureCard("Research assistant", "Research a topic, compare evidence and organise findings. Ask for current sources when freshness matters.", "Start research", () => { closeFeaturePanel(); messageInput.value = "Research this topic and provide reliable sources: "; messageInput.focus(); }),
    featureCard("File analysis", "Upload supported documents, spreadsheets, code or images for analysis.", "Upload a file", () => { closeFeaturePanel(); fileInput?.click(); }),
    featureCard("Football analysis", "Ask about fixtures, results, team data and match analysis where reliable data is available.", "Analyse a match", () => { closeFeaturePanel(); messageInput.value = "Analyse this football match using available verified data: "; messageInput.focus(); })
  );
  openFeaturePanel("Explore Zed", content);
}

function toLocalDateTimeInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

async function openScheduledView() {
  const content = document.createElement("div");
  const intro = document.createElement("p");
  intro.textContent = "Create reminders and manage upcoming tasks. In this version, alerts are checked while Zed is open; device push notifications when the app is closed are not yet configured.";
  intro.style.color = "#707070";
  const permissionButton = document.createElement("button");
  permissionButton.type = "button";
  permissionButton.className = "zed-library-delete";
  permissionButton.textContent = ("Notification" in window && Notification.permission === "granted")
    ? "Notifications enabled"
    : "Enable browser notifications";
  permissionButton.disabled = !("Notification" in window) || Notification.permission === "granted";
  permissionButton.addEventListener("click", async () => {
    if (!("Notification" in window)) {
      status.textContent = "This browser does not support notifications. Zed can still show in-app reminder alerts while open.";
      return;
    }
    const permission = await Notification.requestPermission();
    permissionButton.textContent = permission === "granted" ? "Notifications enabled" : "Notifications not enabled";
    permissionButton.disabled = permission === "granted";
    status.textContent = permission === "granted"
      ? "Browser notifications are enabled for reminders while Zed is open."
      : "Notification permission was not granted. In-app alerts will still appear while Zed is open.";
  });
  const form = document.createElement("form");
  form.className = "zed-schedule-form";
  const title = document.createElement("input");
  title.type = "text";
  title.maxLength = 160;
  title.required = true;
  title.placeholder = "What should Zed remind you about?";
  const due = document.createElement("input");
  due.type = "datetime-local";
  due.required = true;
  due.min = toLocalDateTimeInput(new Date(Date.now() + 60000));
  due.value = toLocalDateTimeInput(new Date(Date.now() + 60 * 60000));
  const notes = document.createElement("textarea");
  notes.rows = 2;
  notes.maxLength = 1000;
  notes.placeholder = "Notes (optional)";
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "zed-feature-action";
  submit.textContent = "＋ Create reminder";
  form.append(title, due, notes, submit);
  const status = document.createElement("p");
  status.className = "zed-library-status";
  const list = document.createElement("div");
  list.className = "zed-scheduled-list";
  content.append(intro, permissionButton, form, status, list);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    submit.disabled = true;
    status.textContent = "Saving reminder…";
    try {
      const response = await apiFetch("/api/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.value.trim(), notes: notes.value.trim(), dueAt: new Date(due.value).toISOString() })
      });
      const data = await parseResponse(response);
      if (!response.ok || !data.ok) throw new Error(data.error || "Reminder could not be saved.");
      title.value = "";
      notes.value = "";
      status.textContent = "Reminder saved.";
      await refreshScheduled();
    } catch (error) {
      status.textContent = error.message || "Reminder could not be saved.";
    } finally {
      submit.disabled = false;
    }
  });

  async function refreshScheduled() {
    list.replaceChildren();
    try {
      const response = await apiFetch("/api/scheduled");
      const data = await parseResponse(response);
      if (!response.ok || !data.ok) throw new Error(data.error || "Scheduled tasks unavailable.");
      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      const active = tasks.filter(task => task.status !== "completed");
      status.textContent = active.length + " upcoming · " + (tasks.length - active.length) + " completed";
      for (const task of tasks) {
        const row = document.createElement("article");
        row.className = "zed-feature-card zed-scheduled-row";
        const heading = document.createElement("h3");
        heading.textContent = task.title;
        const meta = document.createElement("p");
        meta.textContent = new Date(task.dueAt).toLocaleString() + " · " + (task.status === "completed" ? "Completed" : "Scheduled");
        row.append(heading, meta);
        if (task.notes) {
          const detail = document.createElement("p");
          detail.textContent = task.notes;
          row.append(detail);
        }
        const actions = document.createElement("div");
        actions.className = "zed-library-actions";
        if (task.status !== "completed") {
          const done = document.createElement("button");
          done.type = "button";
          done.className = "zed-feature-action";
          done.textContent = "Mark complete";
          done.addEventListener("click", async () => {
            try {
              const result = await apiFetch("/api/scheduled/" + encodeURIComponent(task.id), {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "completed" })
              });
              const payload = await parseResponse(result);
              if (!result.ok || !payload.ok) throw new Error(payload.error || "Could not update reminder.");
              await refreshScheduled();
            } catch (error) { status.textContent = error.message; }
          });
          actions.append(done);
        }
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "zed-library-delete";
        remove.textContent = "Delete";
        remove.addEventListener("click", async () => {
          if (!window.confirm("Delete this reminder?")) return;
          try {
            const result = await apiFetch("/api/scheduled/" + encodeURIComponent(task.id), { method: "DELETE" });
            const payload = await parseResponse(result);
            if (!result.ok || !payload.ok || !payload.deleted) throw new Error(payload.error || "Could not delete reminder.");
            await refreshScheduled();
          } catch (error) { status.textContent = error.message; }
        });
        actions.append(remove);
        row.append(actions);
        list.append(row);
      }
    } catch (error) {
      status.textContent = error.message || "Scheduled tasks could not be loaded.";
    }
  }
  openFeaturePanel("Scheduled", content);
  await refreshScheduled();
}

let scheduledCheckInProgress = false;
async function checkDueScheduledTasks() {
  if (!state.firebaseUser || scheduledCheckInProgress) return;
  scheduledCheckInProgress = true;
  try {
    const response = await apiFetch("/api/scheduled");
    const data = await parseResponse(response);
    if (!response.ok || !data.ok) return;
    const dueTasks = (data.tasks || []).filter(task =>
      task.status === "scheduled" && !task.notifiedAt && Number(task.dueAt) <= Date.now()
    );
    for (const task of dueTasks) {
      const message = "Zed reminder: " + task.title;
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Zed reminder", { body: message });
      } else {
        const notice = document.createElement("div");
        notice.className = "zed-reminder-toast";
        notice.textContent = message;
        document.body.append(notice);
        window.setTimeout(() => notice.remove(), 12000);
      }
      await apiFetch("/api/scheduled/" + encodeURIComponent(task.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notified: true })
      });
    }
  } catch (error) {
    console.warn("Scheduled reminder check failed:", error.message);
  } finally {
    scheduledCheckInProgress = false;
  }
}


document.querySelectorAll("[data-zed-view]").forEach(button => {
  button.addEventListener("click", () => {
    const view = button.dataset.zedView;
    closeSidebar();
    if (view === "images") openImagesView();
    else if (view === "library") openLibraryView();
    else if (view === "projects") {
      const content = document.createElement("div");
      content.append(featureCard("Your projects", "Create and organise workspaces using Zed's existing project service.", "Create project", createProjectFromPrompt));
      openFeaturePanel("Projects", content);
      loadProjects();
    } else if (view === "scheduled") openScheduledView();
    else if (view === "explore") openExploreView();
  });
});

sidebarSearchToggle?.addEventListener("click", () => {
  sidebarSearchWrap?.classList.toggle("open");
  if (sidebarSearchWrap?.classList.contains("open")) chatSearchInput?.focus();
});
chatSearchInput?.addEventListener("input", () => {
  const query = chatSearchInput.value.trim().toLowerCase();
  recentChats?.querySelectorAll(".recent-chat").forEach(item => {
    item.hidden = !item.textContent.toLowerCase().includes(query);
  });
});
seeAllChatsBtn?.addEventListener("click", () => {
  showAllChats = !showAllChats;
  recentChats?.classList.toggle("show-all", showAllChats);
  seeAllChatsBtn.textContent = showAllChats ? "Show less" : "See all";
});
addProjectBtn?.addEventListener("click", createProjectFromPrompt);

document.getElementById("upgradeBtn")?.addEventListener("click", () => {
  const content = document.createElement("div");
  content.append(featureCard(
    "Zed plans",
    "The upgrade screen is ready as a navigation entry, but subscription plans, billing and payment processing are not connected in this project yet. No payment will be requested here.",
    null,
    null
  ));
  openFeaturePanel("Upgrade", content);
});

document.querySelectorAll("[data-zed-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    messageInput.value = button.dataset.zedPrompt || "";
    messageInput.focus();
    messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
  });
});

document.querySelector('[data-zed-action="image"]')?.addEventListener("click", () => {
  const prompt = window.prompt("Describe the image you want Zed to create:");
  if (!prompt || !prompt.trim()) return;
  messageInput.value = prompt.trim();
  createImage();
});

if (!window.__zedScheduledReminderTimer) {
  window.__zedScheduledReminderTimer = window.setInterval(checkDueScheduledTasks, 30000);
}

// ============================================================
// START
// ============================================================
async function initialize() {
  createAuthScreen();
  createAccountPanel();
  createSettingsPanel();
  createMenuBackdrop();
  showAuth();
  try {
    await initializeFirebase();
    setupAuthButtons();
    setupAuthListener();
  } catch (error) {
    console.error(
      "Firebase initialization failed:",
      error
    );
    showAuthMessage(
      "Zed could not connect to the account system."
    );
  }
}
initialize();
