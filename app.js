
/* ============================================================
   ZED — FRONTEND APPLICATION
   Compatible with the supplied server.js and interface.html.
   ============================================================ */

(() => {
  "use strict";

  // ----------------------------------------------------------
  // FIREBASE CONFIGURATION
  // ----------------------------------------------------------

  const firebaseConfig = {
    apiKey: "AIzaSyD1jcmrhZK_XitZu-9Wa9whFB7BJZn0Wa8",
    authDomain: "zed-ai-6d201.firebaseapp.com",
    projectId: "zed-ai-6d201",
    storageBucket: "zed-ai-6d201.firebasestorage.app",
    messagingSenderId: "538225665227",
    appId: "1:538225665227:web:d61483c3cafa8e4694e74e"
  };

  const THEME_KEY = "zed-theme";

  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const state = {
    userId: null,
    firebaseUser: null,
    auth: null,
    googleProvider: null,
    conversationId: null,
    messages: [],
    chats: [],
    selectedFile: null,
    sending: false,
    recognition: null,
    listening: false,
    firebaseReady: false,
    initialized: false
  };

  // ----------------------------------------------------------
  // DOM HELPERS
  // ----------------------------------------------------------

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const byId = (id) =>
    document.getElementById(id);

  const elements = {
    app: byId("app"),
    sidebar: byId("sidebar"),
    sidebarBackdrop: byId("zedSidebarBackdrop"),
    menuBtn: byId("menuBtn"),
    collapseBtn: byId("zedSidebarCollapse"),
    messages: byId("messages"),
    welcome: byId("welcome"),
    input: byId("messageInput"),
    sendBtn: byId("sendBtn"),
    newChatBtn: byId("newChatBtn"),
    recentChats: byId("recentChats"),
    chatCount: byId("zedChatCount"),
    attachBtn: byId("attachBtn"),
    attachMenu: byId("attachMenu"),
    uploadPhotoBtn: byId("uploadPhotoBtn"),
    uploadFileBtn: byId("uploadFileBtn"),
    createImageBtn: byId("createImageBtn"),
    fileInput: byId("fileInput"),
    voiceBtn: byId("zedVoiceBtn"),
    composer: byId("zedComposer"),
    connectionStatus: byId("zedConnectionStatus"),
    composerContext: byId("zedComposerContext"),
    profileBtn: byId("profileBtn"),
    accountBtn: byId("accountBtn"),
    settingsBtn: byId("settingsBtn")
  };

  // ----------------------------------------------------------
  // UTILITIES
  // ----------------------------------------------------------

  function safeText(value) {
    return value == null ? "" : String(value);
  }

  function setStatus(message, isError = false) {
    if (elements.connectionStatus) {
      const label = $(".connection-label", elements.connectionStatus);

      if (label) {
        label.textContent = message;
      } else {
        elements.connectionStatus.setAttribute("title", message);
      }

      elements.connectionStatus.dataset.status =
        isError ? "error" : "connected";
    }
  }

  async function readResponse(response) {
    const raw = await response.text();

    if (!raw) return {};

    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(
        `The server returned an invalid response (HTTP ${response.status}).`
      );
    }
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(options.headers || {})
      }
    });

    const data = await readResponse(response);

    if (!response.ok || data.ok === false) {
      throw new Error(
        data.error || data.answer || `Request failed (${response.status}).`
      );
    }

    return data;
  }

  function jsonOptions(method, body) {
    return {
      method,
      body: JSON.stringify(body)
    };
  }

  function getLocalGuestId() {
    try {
      let id = localStorage.getItem("zedAIUserId");

      if (!id) {
        id = `guest-${crypto.randomUUID()}`;
        localStorage.setItem("zedAIUserId", id);
      }

      return id;
    } catch {
      return `guest-${Date.now()}`;
    }
  }

  function currentUserId() {
    return state.firebaseUser?.uid || state.userId || getLocalGuestId();
  }

  function scrollToBottom() {
    const area = $(".chat-area");

    if (area) {
      area.scrollTop = area.scrollHeight;
    }
  }

  function resizeTextarea() {
    const input = elements.input;
    if (!input) return;

    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
  }

  function showWelcome(show = true) {
    if (elements.welcome) {
      elements.welcome.style.display = show ? "" : "none";
    }
  }

  function setSending(value) {
    state.sending = value;

    if (elements.sendBtn) {
      elements.sendBtn.disabled = value;
      elements.sendBtn.style.opacity = value ? "0.55" : "";
    }

    if (elements.input) {
      elements.input.disabled = value;
    }

    if (elements.attachBtn) {
      elements.attachBtn.disabled = value;
    }

    if (elements.voiceBtn) {
      elements.voiceBtn.disabled = value;
    }
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
  }

  // ----------------------------------------------------------
  // THEME
  // ----------------------------------------------------------

  function getSavedTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      return ["light", "dark", "system"].includes(theme)
        ? theme
        : "dark";
    } catch {
      return "dark";
    }
  }

  function applyTheme(theme) {
    const validTheme = ["light", "dark", "system"].includes(theme)
      ? theme
      : "dark";

    const actualTheme =
      validTheme === "system"
        ? (window.matchMedia("(prefers-color-scheme: light)").matches
            ? "light"
            : "dark")
        : validTheme;

    document.documentElement.dataset.theme = actualTheme;
    document.documentElement.style.colorScheme = actualTheme;

    try {
      localStorage.setItem(THEME_KEY, validTheme);
    } catch {
      // Theme still works for the current session.
    }

    document.querySelectorAll("[data-zed-theme]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.zedTheme === validTheme)
      );
    });
  }

  // ----------------------------------------------------------
  // AUTHENTICATION SCREEN
  // ----------------------------------------------------------

  function createAuthScreen() {
    let screen = byId("zedAuthScreen");
    if (screen) return screen;

    screen = makeElement("section", "zed-auth-screen");
    screen.id = "zedAuthScreen";

    Object.assign(screen.style, {
      position: "fixed",
      inset: "0",
      zIndex: "9999",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      padding: "22px",
      background: "var(--bg, #101116)",
      color: "var(--text, #f5f5f5)",
      overflowY: "auto"
    });

    const card = makeElement("div", "zed-auth-card");

    Object.assign(card.style, {
      width: "100%",
      maxWidth: "410px",
      padding: "28px",
      border: "1px solid var(--border, #35363d)",
      borderRadius: "20px",
      background: "var(--panel, #191a20)",
      boxSizing: "border-box"
    });

    const title = makeElement("h1", "", "Zed");
    title.style.marginTop = "0";

    const subtitle = makeElement(
      "p",
      "",
      "Sign in to continue to your conversations."
    );

    const googleButton = makeElement("button", "", "Continue with Google");
    const emailInput = makeElement("input");
    const passwordInput = makeElement("input");
    const signInButton = makeElement("button", "", "Sign in");
    const signUpButton = makeElement("button", "", "Create account");
    const message = makeElement("p", "zed-auth-message");

    googleButton.type = "button";
    signInButton.type = "button";
    signUpButton.type = "button";

    emailInput.type = "email";
    emailInput.autocomplete = "email";
    emailInput.placeholder = "Email address";
    emailInput.required = true;

    passwordInput.type = "password";
    passwordInput.autocomplete = "current-password";
    passwordInput.placeholder = "Password";
    passwordInput.required = true;

    for (const input of [emailInput, passwordInput]) {
      Object.assign(input.style, {
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        margin: "12px 0",
        padding: "13px",
        borderRadius: "10px",
        border: "1px solid var(--border, #35363d)",
        background: "var(--input-bg, #22232a)",
        color: "inherit",
        font: "inherit"
      });
    }

    for (const button of [googleButton, signInButton, signUpButton]) {
      Object.assign(button.style, {
        width: "100%",
        padding: "12px",
        marginTop: "10px",
        borderRadius: "10px",
        border: "1px solid var(--border, #35363d)",
        cursor: "pointer",
        background: "var(--button-bg, #26272e)",
        color: "inherit",
        font: "inherit"
      });
    }

    message.setAttribute("role", "status");
    message.style.fontSize = "13px";

    card.append(
      title,
      subtitle,
      googleButton,
      emailInput,
      passwordInput,
      signInButton,
      signUpButton,
      message
    );

    screen.appendChild(card);
    document.body.appendChild(screen);

    screen._fields = {
      googleButton,
      emailInput,
      passwordInput,
      signInButton,
      signUpButton,
      message
    };

    return screen;
  }

  function showAuth(message = "") {
    const screen = createAuthScreen();

    if (elements.app) elements.app.style.display = "none";

    screen.style.display = "flex";

    const status = screen._fields?.message;
    if (status) status.textContent = message;
  }

  function showApp() {
    const screen = byId("zedAuthScreen");
    if (screen) screen.style.display = "none";

    if (elements.app) elements.app.style.display = "";

    if (elements.input) {
      elements.input.focus();
    }
  }

  async function initializeFirebase() {
    try {
      const appSdk = await import(
        "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"
      );

      const authSdk = await import(
        "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"
      );

      const firebaseApp =
        appSdk.getApps().length > 0
          ? appSdk.getApp()
          : appSdk.initializeApp(firebaseConfig);

      state.auth = authSdk.getAuth(firebaseApp);
      state.googleProvider = new authSdk.GoogleAuthProvider();
      state.firebaseReady = true;

      return authSdk;
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      state.firebaseReady = false;
      throw new Error(
        "Zed could not connect to Firebase Authentication. Check the Firebase project settings and authorised domains."
      );
    }
  }

  function setupAuthButtons(authSdk) {
    const screen = createAuthScreen();
    const fields = screen._fields;

    fields.googleButton.addEventListener("click", async () => {
      fields.message.textContent = "Opening Google sign-in…";

      try {
        await authSdk.signInWithPopup(
          state.auth,
          state.googleProvider
        );
      } catch (error) {
        console.error("Google sign-in failed:", error);
        fields.message.textContent = friendlyAuthError(error);
      }
    });

    fields.signInButton.addEventListener("click", async () => {
      const email = fields.emailInput.value.trim();
      const password = fields.passwordInput.value;

      if (!email || !password) {
        fields.message.textContent = "Enter your email and password.";
        return;
      }

      fields.message.textContent = "Signing in…";

      try {
        await authSdk.signInWithEmailAndPassword(
          state.auth,
          email,
          password
        );
      } catch (error) {
        console.error("Sign-in failed:", error);
        fields.message.textContent = friendlyAuthError(error);
      }
    });

    fields.signUpButton.addEventListener("click", async () => {
      const email = fields.emailInput.value.trim();
      const password = fields.passwordInput.value;

      if (!email || !password) {
        fields.message.textContent = "Enter your email and choose a password.";
        return;
      }

      if (password.length < 6) {
        fields.message.textContent =
          "Your password must contain at least 6 characters.";
        return;
      }

      fields.message.textContent = "Creating your account…";

      try {
        await authSdk.createUserWithEmailAndPassword(
          state.auth,
          email,
          password
        );
      } catch (error) {
        console.error("Account creation failed:", error);
        fields.message.textContent = friendlyAuthError(error);
      }
    });
  }

  function friendlyAuthError(error) {
    const code = error?.code || "";

    const messages = {
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/user-not-found": "No account was found for that email.",
      "auth/wrong-password": "The email or password is incorrect.",
      "auth/invalid-credential": "The email or password is incorrect.",
      "auth/email-already-in-use": "An account already uses that email.",
      "auth/weak-password": "Choose a stronger password with at least 6 characters.",
      "auth/popup-closed-by-user": "The Google sign-in window was closed.",
      "auth/unauthorized-domain":
        "This website domain is not authorised in Firebase Authentication.",
      "auth/operation-not-allowed":
        "Enable this sign-in method in Firebase Authentication."
    };

    return messages[code] || error?.message || "Authentication failed. Please try again.";
  }

  // ----------------------------------------------------------
  // ACCOUNT PANEL
  // ----------------------------------------------------------

  function createAccountPanel() {
    let panel = byId("zedAccountPanel");
    if (panel) return panel;

    panel = makeElement("section", "zed-floating-panel");
    panel.id = "zedAccountPanel";

    Object.assign(panel.style, {
      position: "fixed",
      zIndex: "5000",
      top: "70px",
      right: "16px",
      width: "min(330px, calc(100vw - 32px))",
      padding: "18px",
      border: "1px solid var(--border, #35363d)",
      borderRadius: "16px",
      background: "var(--panel, #191a20)",
      color: "var(--text, #f5f5f5)",
      boxShadow: "0 14px 40px #0004",
      display: "none"
    });

    const title = makeElement("h3", "", "Your account");
    const email = makeElement("p", "zed-account-email");
    email.id = "zedAccountEmail";

    const signOut = makeElement("button", "", "Sign out");
    signOut.type = "button";
    signOut.addEventListener("click", async () => {
      try {
        if (state.auth) {
          const sdk = await import(
            "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"
          );
          await sdk.signOut(state.auth);
        }
      } catch (error) {
        console.error("Sign-out failed:", error);
        alert("Unable to sign out. Please try again.");
      }
    });

    panel.append(title, email, signOut);
    document.body.appendChild(panel);

    return panel;
  }

  function toggleAccountPanel() {
    const panel = createAccountPanel();
    const isOpen = panel.style.display === "block";

    panel.style.display = isOpen ? "none" : "block";

    const email = byId("zedAccountEmail");
    if (email) {
      email.textContent =
        state.firebaseUser?.email || "Signed in";
    }
  }

  // ----------------------------------------------------------
  // SETTINGS PANEL
  // ----------------------------------------------------------

  function createSettingsPanel() {
    let panel = byId("zedSettingsPanel");
    if (panel) return panel;

    panel = makeElement("section", "zed-floating-panel");
    panel.id = "zedSettingsPanel";

    Object.assign(panel.style, {
      position: "fixed",
      zIndex: "5000",
      top: "70px",
      right: "16px",
      width: "min(330px, calc(100vw - 32px))",
      padding: "18px",
      border: "1px solid var(--border, #35363d)",
      borderRadius: "16px",
      background: "var(--panel, #191a20)",
      color: "var(--text, #f5f5f5)",
      boxShadow: "0 14px 40px #0004",
      display: "none"
    });

    panel.appendChild(makeElement("h3", "", "Settings"));
    panel.appendChild(makeElement("p", "", "Appearance"));

    const choices = makeElement("div", "zed-theme-options");

    for (const theme of ["dark", "light", "system"]) {
      const button = makeElement(
        "button",
        "",
        theme.charAt(0).toUpperCase() + theme.slice(1)
      );

      button.type = "button";
      button.dataset.zedTheme = theme;
      button.addEventListener("click", () => applyTheme(theme));

      Object.assign(button.style, {
        margin: "4px",
        padding: "8px 10px",
        borderRadius: "8px",
        cursor: "pointer"
      });

      choices.appendChild(button);
    }

    panel.appendChild(choices);
    document.body.appendChild(panel);

    return panel;
  }

  function toggleSettingsPanel() {
    const panel = createSettingsPanel();
    const isOpen = panel.style.display === "block";

    panel.style.display = isOpen ? "none" : "block";
  }

  // ----------------------------------------------------------
  // MESSAGE RENDERING
  // ----------------------------------------------------------

  function renderMessages() {
    const container = elements.messages;
    if (!container) return;

    container.replaceChildren();

    for (const item of state.messages) {
      const role = item.role === "user" ? "user" : "assistant";
      const message = makeElement("div", `message message-${role}`);
      const content = makeElement("div", "message-content");

      content.textContent = safeText(
        item.content ?? item.text ?? ""
      );

      message.appendChild(content);

      if (item.imageUrl) {
        const image = document.createElement("img");
        image.src = item.imageUrl;
        image.alt = "Generated by Zed";
        image.loading = "lazy";
        image.style.maxWidth = "100%";
        image.style.borderRadius = "14px";
        content.appendChild(image);
      }

      container.appendChild(message);
    }

    showWelcome(state.messages.length === 0);
    scrollToBottom();
  }

  function addMessage(role, content) {
    state.messages.push({
      role,
      content: safeText(content)
    });

    renderMessages();
  }

  function showThinking() {
    const container = elements.messages;
    if (!container) return null;

    const message = makeElement(
      "div",
      "message message-assistant",
      undefined
    );

    message.id = "zedThinkingMessage";

    message.appendChild(
      makeElement("div", "message-content", "Zed is thinking…")
    );

    container.appendChild(message);
    scrollToBottom();

    return message;
  }

  function removeThinking() {
    byId("zedThinkingMessage")?.remove();
  }

  // ----------------------------------------------------------
  // CONVERSATIONS
  // ----------------------------------------------------------

  async function loadChats() {
    try {
      const data = await api(
        `/api/chats?userId=${encodeURIComponent(currentUserId())}`
      );

      state.chats = Array.isArray(data.chats) ? data.chats : [];
      renderRecentChats();

      if (data.persistent === false) {
        setStatus("Chat history storage unavailable", true);
      }

      return state.chats;
    } catch (error) {
      console.error("Unable to load chats:", error);
      state.chats = [];
      renderRecentChats();
      return [];
    }
  }

  function renderRecentChats() {
    const container = elements.recentChats;
    if (!container) return;

    container.replaceChildren();

    if (elements.chatCount) {
      elements.chatCount.textContent = String(state.chats.length);
    }

    if (!state.chats.length) {
      const empty = makeElement("div", "", "No recent chats");
      empty.style.padding = "10px";
      empty.style.color = "#888";
      empty.style.fontSize = "12px";
      container.appendChild(empty);
      return;
    }

    for (const chat of state.chats) {
      const id = chat.id || chat.conversationId;
      if (!id) continue;

      const button = makeElement(
        "button",
        "recent-chat",
        chat.title || "New chat"
      );

      button.type = "button";
      button.title = chat.title || "New chat";

      if (id === state.conversationId) {
        button.classList.add("active");
      }

      button.addEventListener("click", async () => {
        await loadConversation(id);
        closeSidebar();
      });

      container.appendChild(button);
    }
  }

  async function loadConversation(conversationId) {
    if (!conversationId) return;

    try {
      const data = await api(
        `/api/chat/${encodeURIComponent(conversationId)}?userId=${encodeURIComponent(currentUserId())}`
      );

      const conversation = data.conversation || {};

      state.conversationId =
        conversation.id || conversationId;

      state.messages = Array.isArray(conversation.messages)
        ? conversation.messages.map((message) => ({
            role: message.role,
            content: message.content ?? message.text ?? ""
          }))
        : [];

      renderMessages();
      renderRecentChats();
    } catch (error) {
      console.error("Unable to load conversation:", error);
      alert(error.message || "Unable to load this conversation.");
    }
  }

  async function createNewChat() {
    if (state.sending) return;

    try {
      const data = await api(
        "/api/new-chat",
        jsonOptions("POST", {
          userId: currentUserId()
        })
      );

      state.conversationId =
        data.conversationId || data.conversation?.id || null;

      state.messages = [];
      state.selectedFile = null;

      if (elements.input) {
        elements.input.value = "";
        resizeTextarea();
        elements.input.focus();
      }

      updateSelectedFileNotice();
      renderMessages();
      await loadChats();
      closeSidebar();
    } catch (error) {
      console.error("Unable to create a new chat:", error);
      alert(error.message || "Unable to create a new chat.");
    }
  }

  // ----------------------------------------------------------
  // SEND CHAT MESSAGE
  // ----------------------------------------------------------

  async function sendMessage() {
    if (state.sending || !elements.input) return;

    const messageText = elements.input.value.trim();

    if (state.selectedFile) {
      alert(
        "File analysis is not available on the current server. " +
        "Your file has not been analysed. Remove the attachment and send a text question, " +
        "or add file-analysis support to the backend first."
      );
      return;
    }

    if (!messageText) return;

    setSending(true);

    const previousMessages = state.messages.slice();

    state.messages.push({
      role: "user",
      content: messageText
    });

    renderMessages();

    elements.input.value = "";
    resizeTextarea();

    showThinking();

    try {
      const data = await api(
        "/api/chat",
        jsonOptions("POST", {
          message: messageText,
          userId: currentUserId(),
          conversationId: state.conversationId,
          conversation: previousMessages.map((item) => ({
            role: item.role,
            content: item.content
          }))
        })
      );

      removeThinking();

      state.conversationId =
        data.conversationId ||
        data.conversation?.id ||
        state.conversationId;

      state.messages.push({
        role: "assistant",
        content: data.answer || data.reply || "Zed returned no answer."
      });

      renderMessages();
      await loadChats();

      setStatus(
        data.provider ? `Connected · ${data.provider}` : "Connected"
      );
    } catch (error) {
      removeThinking();

      console.error("Chat request failed:", error);

      state.messages.push({
        role: "assistant",
        content:
          error.message ||
          "Sorry, something went wrong. Please try again."
      });

      renderMessages();
      setStatus("Connection error", true);
    } finally {
      setSending(false);
      elements.input?.focus();
    }
  }

  // ----------------------------------------------------------
  // FILE ATTACHMENTS
  // ----------------------------------------------------------

  function openFilePicker(accept = "") {
    closeAttachMenu();

    if (!elements.fileInput) return;

    elements.fileInput.accept = accept;
    elements.fileInput.click();
  }

  function updateSelectedFileNotice() {
    const oldNotice = byId("zedSelectedFileNotice");
    oldNotice?.remove();

    if (!state.selectedFile || !elements.composer) return;

    const notice = makeElement(
      "div",
      "zed-selected-file-notice",
      `Selected: ${state.selectedFile.name}`
    );

    notice.id = "zedSelectedFileNotice";

    const removeButton = makeElement("button", "", "Remove");
    removeButton.type = "button";
    removeButton.addEventListener("click", () => {
      state.selectedFile = null;
      if (elements.fileInput) elements.fileInput.value = "";
      updateSelectedFileNotice();
    });

    notice.appendChild(document.createTextNode(" "));
    notice.appendChild(removeButton);

    elements.composer.appendChild(notice);
  }

  function handleSelectedFile(file) {
    if (!file) return;

    const maxSize = 15 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("This file is larger than 15 MB. Please choose a smaller file.");
      return;
    }

    state.selectedFile = file;
    updateSelectedFileNotice();

    alert(
      "The file is selected, but the current server does not analyse uploaded files yet. " +
      "Zed will not pretend it has read this file."
    );
  }

  // ----------------------------------------------------------
  // IMAGE GENERATION
  // ----------------------------------------------------------

  async function createImage() {
    closeAttachMenu();

    let prompt = elements.input?.value.trim() || "";

    if (!prompt) {
      prompt = window.prompt(
        "Describe the image you want Zed to create:"
      ) || "";
    }

    prompt = prompt.trim();
    if (!prompt) return;

    const previousInput = elements.input?.value || "";

    setSending(true);
    showThinking();

    try {
      const data = await api(
        "/api/generate-image",
        jsonOptions("POST", {
          prompt,
          userId: currentUserId(),
          conversationId: state.conversationId
        })
      );

      removeThinking();

      const result = data.result || {};

      let imageSource = "";

      if (result.image && result.contentType) {
        imageSource =
          `data:${result.contentType};base64,${result.image}`;
      } else if (
        typeof result.result?.image === "string" &&
        result.result.contentType
      ) {
        imageSource =
          `data:${result.result.contentType};base64,${result.result.image}`;
      } else if (result.image_url) {
        imageSource = result.image_url;
      } else if (result.url) {
        imageSource = result.url;
      }

      if (!imageSource) {
        throw new Error(
          "The image service responded, but did not return a supported image. " +
          "Check the Cloudflare image API response format."
        );
      }

      state.messages.push({
        role: "user",
        content: `Create an image: ${prompt}`
      });

      state.messages.push({
        role: "assistant",
        content: "Image generated.",
        imageUrl: imageSource
      });

      renderMessages();

      if (elements.input) {
        elements.input.value = "";
        resizeTextarea();
      }
    } catch (error) {
      removeThinking();

      console.error("Image generation failed:", error);

      state.messages.push({
        role: "assistant",
        content: `Image generation failed: ${error.message}`
      });

      renderMessages();

      if (elements.input) {
        elements.input.value = previousInput;
        resizeTextarea();
      }
    } finally {
      setSending(false);
    }
  }

  // ----------------------------------------------------------
  // VOICE INPUT
  // ----------------------------------------------------------

  function initializeVoiceRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      if (elements.voiceBtn) {
        elements.voiceBtn.title =
          "Voice input is not supported by this browser.";
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      state.listening = true;
      elements.voiceBtn?.classList.add("listening");
      if (elements.voiceBtn) elements.voiceBtn.setAttribute("aria-pressed", "true");
    };

    recognition.onend = () => {
      state.listening = false;
      elements.voiceBtn?.classList.remove("listening");
      if (elements.voiceBtn) elements.voiceBtn.setAttribute("aria-pressed", "false");
    };

    recognition.onerror = (event) => {
      console.error("Voice recognition error:", event.error);

      if (event.error === "not-allowed") {
        alert("Allow microphone access in your browser to use voice input.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        alert("Voice input failed. Please try again.");
      }
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      if (elements.input) {
        elements.input.value = transcript.trim();
        resizeTextarea();
      }
    };

    state.recognition = recognition;
  }

  function toggleVoiceInput() {
    if (!state.recognition) {
      alert(
        "Voice input is not supported by this browser. Try a browser with speech recognition support."
      );
      return;
    }

    try {
      if (state.listening) {
        state.recognition.stop();
      } else {
        state.recognition.start();
      }
    } catch (error) {
      console.error("Unable to toggle voice input:", error);
    }
  }

  // ----------------------------------------------------------
  // SIDEBAR AND ATTACHMENT MENU
  // ----------------------------------------------------------

  function openSidebar() {
    elements.sidebar?.classList.add("open");
    elements.sidebarBackdrop?.classList.add("show", "open", "active");
    elements.sidebarBackdrop?.setAttribute("aria-hidden", "false");
  }

  function closeSidebar() {
    elements.sidebar?.classList.remove("open");
    elements.sidebarBackdrop?.classList.remove("show", "open", "active");
    elements.sidebarBackdrop?.setAttribute("aria-hidden", "true");
  }

  function toggleSidebar() {
    if (elements.sidebar?.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  function toggleAttachMenu() {
    elements.attachMenu?.classList.toggle("show");
  }

  function closeAttachMenu() {
    elements.attachMenu?.classList.remove("show");
  }

  // ----------------------------------------------------------
  // EVENT LISTENERS
  // ----------------------------------------------------------

  function setupEvents() {
    elements.sendBtn?.addEventListener("click", sendMessage);
    elements.newChatBtn?.addEventListener("click", createNewChat);

    elements.input?.addEventListener("input", resizeTextarea);

    elements.input?.addEventListener("keydown", (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.isComposing
      ) {
        event.preventDefault();
        sendMessage();
      }
    });

    // interface.html already handles #menuBtn.
    // Do not add a second click handler here.

    elements.collapseBtn?.addEventListener("click", closeSidebar);
    elements.sidebarBackdrop?.addEventListener("click", closeSidebar);

    elements.attachBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleAttachMenu();
    });

    elements.uploadPhotoBtn?.addEventListener("click", () => {
      openFilePicker("image/*");
    });

    elements.uploadFileBtn?.addEventListener("click", () => {
      openFilePicker(".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx");
    });

    elements.createImageBtn?.addEventListener("click", createImage);
    elements.voiceBtn?.addEventListener("click", toggleVoiceInput);

    elements.fileInput?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      handleSelectedFile(file);
      event.target.value = "";
    });

    elements.profileBtn?.addEventListener("click", toggleAccountPanel);
    elements.accountBtn?.addEventListener("click", toggleAccountPanel);
    elements.settingsBtn?.addEventListener("click", toggleSettingsPanel);

    document.addEventListener("click", (event) => {
      if (
        elements.attachMenu &&
        elements.attachBtn &&
        !elements.attachMenu.contains(event.target) &&
        !elements.attachBtn.contains(event.target)
      ) {
        closeAttachMenu();
      }

      const accountPanel = byId("zedAccountPanel");
      const settingsPanel = byId("zedSettingsPanel");

      if (
        accountPanel &&
        !accountPanel.contains(event.target) &&
        !elements.profileBtn?.contains(event.target) &&
        !elements.accountBtn?.contains(event.target)
      ) {
        accountPanel.style.display = "none";
      }

      if (
        settingsPanel &&
        !settingsPanel.contains(event.target) &&
        !elements.settingsBtn?.contains(event.target)
      ) {
        settingsPanel.style.display = "none";
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 700) closeSidebar();
    });

    window.matchMedia("(prefers-color-scheme: light)")
      .addEventListener?.("change", () => {
        if (getSavedTheme() === "system") {
          applyTheme("system");
        }
      });

    document.querySelectorAll("[data-prompt]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!elements.input) return;

        elements.input.value = button.dataset.prompt || "";
        resizeTextarea();
        elements.input.focus();
      });
    });
  }

  // ----------------------------------------------------------
  // INITIALIZATION
  // ----------------------------------------------------------

  async function initialize() {
    if (state.initialized) return;
    state.initialized = true;

    applyTheme(getSavedTheme());
    createAuthScreen();
    createAccountPanel();
    createSettingsPanel();
    setupEvents();
    initializeVoiceRecognition();

    // Show the sign-in screen until Firebase confirms the user.
    showAuth();

    try {
      const authSdk = await initializeFirebase();
      setupAuthButtons(authSdk);

      authSdk.onAuthStateChanged(state.auth, async (user) => {
        state.firebaseUser = user || null;

        if (!user) {
          state.userId = getLocalGuestId();
          state.conversationId = null;
          state.messages = [];
          showAuth();
          return;
        }

        state.userId = user.uid;
        showApp();
        renderMessages();
        setStatus("Connected");

        await loadChats();
      });
    } catch (error) {
      console.error("Zed startup error:", error);
      showAuth(error.message);
    }
  }

  initialize();
})();
