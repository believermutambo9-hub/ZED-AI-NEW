// ============================================================
// ZED AI - CURRENT INTERFACE
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
  selectedFile: null,
  sending: false,
  settingsOpen: false
};


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
    ">Z</div>

    <h1 style="
      text-align:center;
      font-size:25px;
      margin-bottom:8px;
    ">Welcome to Zed AI</h1>

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
        ">Customize your Zed AI experience</div>
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
      <div style="font-weight:600;">Zed AI</div>
      <div style="
        color:#929292;
        font-size:12px;
        margin-top:5px;
      ">
        Your conversations, files and AI tools are managed by Zed AI.
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
    settingsPanel.style.transform =
      "translate(-50%,-50%) scale(1)";
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

  setTimeout(() => {

    if (!state.settingsOpen) {
      return;
    }

    settingsPanel.style.display =
      "none";

  }, 140);

  state.settingsOpen =
    false;
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

  if (menuBackdrop && window.innerWidth <= 700) {
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

  if (sidebar.classList.contains("open")) {
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
        "Image created by Zed AI";

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
      await fetch(
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

    renderRecentChats();

  } catch (error) {

    console.error(
      "Load chats error:",
      error
    );

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

    empty.textContent =
      "No conversations yet.";

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
      await fetch(
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
      await fetch(
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
      await fetch(
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
      await fetch(
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

    };
}


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
