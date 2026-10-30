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
  sending: false,
  settingsOpen: false
};
// ============================================================
// AUTHENTICATED API REQUESTS
// ============================================================
async function apiFetch(url, options = {}) {
  const user = state.firebaseUser;
  if (!user) {
    throw new Error("Please sign in to continue.");
  }

  const token = await user.getIdToken();
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(url, {
    ...options,
    headers
  });
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
const sendBtn =
  document.getElementById("sendBtn");
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
function updateAccountPanel() {
  if (!accountPanel) {
    return;
  }
  const name =
    document.getElementById("zedAccountName");
  const email =
    document.getElementById("zedAccountEmail");
  if (name) {
    name.textContent =
      state.firebaseUser?.displayName ||
      "Zed User";
  }
  if (email) {
    email.textContent =
      state.firebaseUser?.email ||
      "";
  }
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
function openSidebar() {
  if (!sidebar) {
    return;
  }
  sidebar.classList.add("open");
  if (
    menuBackdrop &&
    window.innerWidth <= 700
  ) {
    menuBackdrop.style.display =
      "block";
  }
}
function closeSidebar() {
  if (!sidebar) {
    return;
  }
  sidebar.classList.remove("open");
  if (menuBackdrop) {
    menuBackdrop.style.display =
      "none";
  }
}
function toggleSidebar() {
  if (!sidebar) {
    return;
  }
  if (
    sidebar.classList.contains("open")
  ) {
    closeSidebar();
  } else {
    openSidebar();
  }
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
    content.textContent =
      message.content || "";
    wrapper.appendChild(
      content
    );
    if (message.image) {
      const image =
        document.createElement("img");
      image.src =
        message.image;
      image.alt =
        "Image created by Zed";
      image.style.cssText = `
        display:block;
        max-width:100%;
        margin-top:12px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,.10);
      `;
      content.appendChild(
        image
      );
    }
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
  const wrapper =
    document.createElement("div");
  wrapper.className =
    "message message-assistant";
  wrapper.id =
    "thinkingMessage";
  const content =
    document.createElement("div");
  content.className =
    "message-content";
  content.textContent =
    "Zed is thinking...";
  wrapper.appendChild(
    content
  );
  messages?.appendChild(
    wrapper
  );
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
  if (!state.userId) {
    return;
  }
  try {
    const response =
      await apiFetch(
        `/api/chats?userId=${encodeURIComponent(
          state.userId
        )}`
      );
    const data =
      await parseResponse(
        response
      );
    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
        "Unable to load chats."
      );
    }
    state.chats =
      Array.isArray(data.chats)
        ? data.chats
        : [];
    state.chatHistoryUnavailable =
      data.persistent === false;
    renderRecentChats();
  } catch (error) {
    console.error(
      "Load chats error:",
      error
    );
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
async function loadConversation(
  conversationId
) {
  if (
    !state.userId ||
    !conversationId
  ) {
    return;
  }
  try {
    const response =
      await apiFetch(
        `/api/chat/${encodeURIComponent(
          conversationId
        )}?userId=${encodeURIComponent(
          state.userId
        )}`
      );
    const data =
      await parseResponse(
        response
      );
    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
        "Unable to load conversation."
      );
    }
    state.conversationId =
      data.conversation.id;
    state.messages =
      Array.isArray(
        data.conversation.messages
      )
        ? data.conversation.messages
        : [];
    renderMessages();
  } catch (error) {
    console.error(
      "Conversation error:",
      error
    );
  }
}
// ============================================================
// NEW CHAT
// ============================================================
async function createNewChat() {
  if (
    state.sending ||
    !state.userId
  ) {
    return;
  }
  try {
    const response =
      await apiFetch(
        "/api/new-chat",
        {
          method:"POST",
          headers:{
            "Content-Type":
              "application/json"
          },
          body:JSON.stringify({
            userId:
              state.userId
          })
        }
      );
    const data =
      await parseResponse(
        response
      );
    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
        "Unable to create a new chat."
      );
    }
    state.conversationId =
      data.conversationId ||
      data.conversation?.id ||
      null;
    state.messages = [];
    state.selectedFile = null;
    renderMessages();
    await loadChats();
    closeSidebar();
    messageInput?.focus();
  } catch (error) {
    console.error(
      "New chat error:",
      error
    );
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
// ============================================================
// SEND MESSAGE
// ============================================================
async function sendMessage() {
  if (
    state.sending ||
    !state.userId
  ) {
    return;
  }
  const text =
    messageInput?.value.trim() ||
    "";
  if (
    !text &&
    !state.selectedFile
  ) {
    return;
  }
  if (state.selectedFile && state.selectedFile.size > 18 * 1024 * 1024) {
    state.messages.push({
      role: "assistant",
      content: "This file is too large to analyse. Please choose a file smaller than 18 MB."
    });
    renderMessages();
    return;
  }
  setSending(true);
  const previousMessages =
    state.messages.slice();
  state.messages.push({
    role:"user",
    content:
      text ||
      "Please analyze this uploaded file."
  });
  renderMessages();
  messageInput.value =
    "";
  messageInput.style.height =
    "auto";
  let filePayload =
    null;
  try {
    if (state.selectedFile) {
      filePayload =
        await readFileAsDataURL(
          state.selectedFile
        );
    }
    showThinking();
    const response =
      await apiFetch(
        "/api/chat",
        {
          method:"POST",
          headers:{
            "Content-Type":
              "application/json"
          },
          body:JSON.stringify({
            message:
              text,
            userId:
              state.userId,
            conversationId:
              state.conversationId,
            conversation:
              previousMessages.map(
                message => ({
                  role:
                    message.role,
                  text:
                    message.content
                })
              ),
            file:
              filePayload
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
        data.answer ||
        "Zed could not respond."
      );
    }
    state.conversationId =
      data.conversationId ||
      state.conversationId;
    state.messages.push({
      role:"assistant",
      content:
        data.answer ||
        data.reply ||
        "Zed did not return an answer."
    });
    speakZedResponse(data.answer || data.reply || "Zed did not return an answer.");
    if (data.chatPersistent === false) {
      state.messages.push({
        role:"assistant",
        content:"Warning: this reply could not be saved to your chat history. Copy anything important before leaving this conversation."
      });
    }
    renderMessages();
    await loadChats();
  } catch (error) {
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
  } finally {
    state.selectedFile =
      null;
    if (fileInput) {
      fileInput.value =
        "";
    }
    setSending(false);
    messageInput?.focus();
  }
}
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

    state.selectedFile =
      file;
    messageInput.value =
      `Please analyze ${file.name}`;
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

function speakZedResponse(text) {
  if (!voiceModeEnabled || !("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(String(text).slice(0, 5000));
  utterance.lang = "en-US";
  utterance.rate = 1;
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
      state.firebaseUser =
        user || null;
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
  if (!projectList || !state.firebaseUser) return;
  projectList.replaceChildren();
  const loading = document.createElement("div");
  loading.className = "sidebar-empty";
  loading.textContent = "Loading projects…";
  projectList.append(loading);
  try {
    const response = await apiFetch("/api/projects");
    const data = await parseResponse(response);
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
    featureCard("Business assistant", "Work through business ideas, planning, marketing and practical documents.", "Explore business", () => { closeFeaturePanel(); messageInput.value = "Help me with a business task: "; messageInput.focus(); }),
    featureCard("File analysis", "Upload supported documents, spreadsheets, code or images for analysis.", "Upload a file", () => { closeFeaturePanel(); fileInput?.click(); }),
    featureCard("Football analysis", "Ask about fixtures, results, team data and match analysis where reliable data is available.", "Analyse a match", () => { closeFeaturePanel(); messageInput.value = "Analyse this football match: "; messageInput.focus(); })
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

// Keep the menu state accessible to assistive technologies.
menuBtn?.addEventListener("click", () => {
  const expanded = sidebar?.classList.contains("open") || false;
  menuBtn.setAttribute("aria-expanded", String(expanded));
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
