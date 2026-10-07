// ============================================================
// ZED AI INTERFACE
// Firebase Authentication + Zed Backend
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
  const firebaseAppModule =
    await import(
      "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"
    );

  const firebaseAuthModule =
    await import(
      "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"
    );

  const firebaseConfig = {
    apiKey:
      "AIzaSyD1jcmrhZK_XitZu-9Wa9whFB7BJZn0Wa8",

    authDomain:
      "zed-ai-6d201.firebaseapp.com",

    projectId:
      "zed-ai-6d201",

    storageBucket:
      "zed-ai-6d201.firebasestorage.app",

    messagingSenderId:
      "538225665227",

    appId:
      "1:538225665227:web:d61483c3cafa8e4694e74e"
  };

  const firebaseApp =
    firebaseAppModule.initializeApp(
      firebaseConfig
    );

  firebaseAuth =
    firebaseAuthModule.getAuth(
      firebaseApp
    );

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
  sending: false
};


// ============================================================
// ELEMENTS
// ============================================================

const authScreen =
  document.getElementById("authScreen");

const app =
  document.getElementById("app");

const googleLogin =
  document.getElementById("googleLogin");

const emailLogin =
  document.getElementById("emailLogin");

const emailSignup =
  document.getElementById("emailSignup");

const emailInput =
  document.getElementById("emailInput");

const passwordInput =
  document.getElementById("passwordInput");

const authMessage =
  document.getElementById("authMessage");

const logoutButton =
  document.getElementById("logoutButton");

const accountName =
  document.getElementById("accountName");

const accountEmail =
  document.getElementById("accountEmail");

const profilePhoto =
  document.getElementById("profilePhoto");

const menuButton =
  document.getElementById("menuButton");

const menuOverlay =
  document.getElementById("menuOverlay");

const drawerClose =
  document.getElementById("drawerClose");

const newChatButton =
  document.getElementById("newChatButton");

const newChatTopButton =
  document.getElementById("newChatTopButton");

const historyList =
  document.getElementById("historyList");

const searchChats =
  document.getElementById("searchChats");

const chatArea =
  document.getElementById("chatArea");

const chatContent =
  document.getElementById("chatContent");

const welcome =
  document.getElementById("welcome");

const messageInput =
  document.getElementById("messageInput");

const sendButton =
  document.getElementById("sendButton");

const attachButton =
  document.getElementById("attachButton");

const attachMenu =
  document.getElementById("attachMenu");

const uploadPhotoButton =
  document.getElementById("uploadPhotoButton");

const uploadFileButton =
  document.getElementById("uploadFileButton");

const createImageButton =
  document.getElementById("createImageButton");

const photoInput =
  document.getElementById("photoInput");

const fileInput =
  document.getElementById("fileInput");

const fileName =
  document.getElementById("fileName");

const micButton =
  document.getElementById("micButton");


// ============================================================
// FIREBASE USER ID
// ============================================================

function updateUserState(user) {

  state.firebaseUser =
    user || null;

  state.userId =
    user?.uid || null;
}


// ============================================================
// HELPERS
// ============================================================

function escapeHtml(value = "") {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


async function parseResponse(response) {

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


function removeElement(element) {

  if (
    element &&
    element.parentNode
  ) {

    element.parentNode.removeChild(
      element
    );

  }
}


function showAuthMessage(message = "") {

  if (authMessage) {
    authMessage.textContent =
      message;
  }
}


function showApp() {

  authScreen?.classList.add(
    "hidden"
  );

  app?.classList.remove(
    "hidden"
  );
}


function showAuth() {

  authScreen?.classList.remove(
    "hidden"
  );

  app?.classList.add(
    "hidden"
  );
}


function setSending(value) {

  state.sending =
    value;

  if (sendButton) {
    sendButton.disabled =
      value;
  }

  if (attachButton) {
    attachButton.disabled =
      value;
  }

  if (messageInput) {
    messageInput.disabled =
      value;
  }
}


// ============================================================
// MENU
// ============================================================

function openMenu() {

  menuOverlay?.classList.remove(
    "closed"
  );
}


function closeMenu() {

  menuOverlay?.classList.add(
    "closed"
  );
}


function toggleMenu() {

  if (
    menuOverlay?.classList.contains(
      "closed"
    )
  ) {

    openMenu();

  } else {

    closeMenu();

  }
}


menuButton?.addEventListener(
  "click",
  toggleMenu
);


drawerClose?.addEventListener(
  "click",
  closeMenu
);


menuOverlay?.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      menuOverlay
    ) {

      closeMenu();

    }

  }
);


// ============================================================
// MESSAGE RENDERING
// ============================================================

function renderMessages() {

  if (!chatContent) {
    return;
  }

  chatContent.innerHTML =
    "";

  if (
    !state.messages.length
  ) {

    if (welcome) {

      chatContent.appendChild(
        welcome
      );

    }

    return;
  }

  for (
    const message of state.messages
  ) {

    const wrapper =
      document.createElement(
        "div"
      );

    wrapper.className =
      "message " +
      (
        message.role === "user"
          ? "user"
          : "assistant"
      );

    const inner =
      document.createElement(
        "div"
      );

    inner.className =
      "messageInner";

    const label =
      document.createElement(
        "div"
      );

    label.className =
      "messageLabel";

    label.textContent =
      message.role === "user"
        ? "You"
        : "Zed";

    inner.appendChild(
      label
    );

    const body =
      document.createElement(
        "div"
      );

    body.className =
      "messageBody";

    body.textContent =
      message.content || "";

    inner.appendChild(
      body
    );

    if (
      message.image
    ) {

      const image =
        document.createElement(
          "img"
        );

      image.className =
        "generatedImage";

      image.src =
        message.image;

      image.alt =
        "Image created by Zed";

      image.loading =
        "lazy";

      inner.appendChild(
        image
      );

    }

    wrapper.appendChild(
      inner
    );

    chatContent.appendChild(
      wrapper
    );

  }

  requestAnimationFrame(
    () => {

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
    document.createElement(
      "div"
    );

  wrapper.className =
    "message assistant";

  wrapper.id =
    "thinkingMessage";

  const inner =
    document.createElement(
      "div"
    );

  inner.className =
    "messageInner";

  const label =
    document.createElement(
      "div"
    );

  label.className =
    "messageLabel";

  label.textContent =
    "Zed";

  const thinking =
    document.createElement(
      "div"
    );

  thinking.className =
    "thinkingMessage";

  thinking.innerHTML = `
    <span>Thinking</span>
    <span class="thinkingDots">
      <span></span>
      <span></span>
      <span></span>
    </span>
  `;

  inner.appendChild(
    label
  );

  inner.appendChild(
    thinking
  );

  wrapper.appendChild(
    inner
  );

  chatContent.appendChild(
    wrapper
  );

  requestAnimationFrame(
    () => {

      if (chatArea) {

        chatArea.scrollTop =
          chatArea.scrollHeight;

      }

    }
  );
}


function removeThinking() {

  const thinking =
    document.getElementById(
      "thinkingMessage"
    );

  if (thinking) {
    thinking.remove();
  }
}


// ============================================================
// LOAD RECENT CHATS
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

    if (
      !response.ok ||
      !data.ok
    ) {

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
// RENDER RECENT CHATS
// ============================================================

function renderRecentChats() {

  if (!historyList) {
    return;
  }

  historyList.innerHTML =
    "";

  if (
    !state.chats.length
  ) {

    const empty =
      document.createElement(
        "div"
      );

    empty.style.padding =
      "12px 8px";

    empty.style.color =
      "#666";

    empty.style.fontSize =
      "12px";

    empty.textContent =
      "No conversations yet.";

    historyList.appendChild(
      empty
    );

    return;
  }

  for (
    const chat of state.chats
  ) {

    const conversationId =
      chat.id ||
      chat.conversationId;

    if (!conversationId) {
      continue;
    }

    const item =
      document.createElement(
        "div"
      );

    item.className =
      "historyItem";

    item.textContent =
      chat.title ||
      "New chat";

    item.addEventListener(
      "click",
      async () => {

        await loadConversation(
          conversationId
        );

        closeMenu();

      }
    );

    historyList.appendChild(
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

    if (
      !response.ok ||
      !data.ok
    ) {

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
      "Load conversation error:",
      error
    );

    state.messages = [
      {
        role:
          "assistant",

        content:
          "I couldn't load that conversation."
      }
    ];

    renderMessages();

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
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              userId:
                state.userId
            })
        }
      );

    const data =
      await parseResponse(
        response
      );

    if (
      !response.ok ||
      !data.ok
    ) {

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

    state.selectedFile =
      null;

    if (fileName) {
      fileName.textContent =
        "";
    }

    if (messageInput) {
      messageInput.value =
        "";
    }

    renderMessages();

    await loadChats();

    closeMenu();

    messageInput?.focus();

  } catch (error) {

    console.error(
      "New chat error:",
      error
    );

  }
}


newChatButton?.addEventListener(
  "click",
  createNewChat
);


newChatTopButton?.addEventListener(
  "click",
  createNewChat
);


// ============================================================
// SEND MESSAGE
// ============================================================

async function sendMessage() {

  if (
    state.sending ||
    !state.userId ||
    !messageInput
  ) {
    return;
  }

  const text =
    messageInput.value.trim();

  if (
    !text &&
    !state.selectedFile
  ) {
    return;
  }

  setSending(true);

  const userMessage = {
    role:
      "user",

    content:
      text ||
      "Please analyze this uploaded file."
  };

  state.messages.push(
    userMessage
  );

  renderMessages();

  messageInput.value =
    "";

  messageInput.style.height =
    "auto";

  let filePayload =
    null;

  if (
    state.selectedFile
  ) {

    try {

      filePayload =
        await readFileAsDataURL(
          state.selectedFile
        );

    } catch (error) {

      console.error(
        "File reading error:",
        error
      );

      state.messages.push({
        role:
          "assistant",

        content:
          "I couldn't read that file. Please try uploading it again."
      });

      renderMessages();

      setSending(false);

      return;
    }
  }

  showThinking();

  try {

    const response =
      await fetch(
        "/api/chat",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              message:
                text,

              userId:
                state.userId,

              conversationId:
                state.conversationId,

              conversation:
                state.messages
                  .slice(0, -1)
                  .map(
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

    if (
      !response.ok ||
      !data.ok
    ) {

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

      role:
        "assistant",

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

      role:
        "assistant",

      content:
        "I couldn't complete that request.\n\n" +
        error.message

    });

    renderMessages();

  } finally {

    state.selectedFile =
      null;

    if (fileName) {
      fileName.textContent =
        "";
    }

    if (photoInput) {
      photoInput.value =
        "";
    }

    if (fileInput) {
      fileInput.value =
        "";
    }

    setSending(false);

    messageInput.focus();

  }
}


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

  attachMenu?.classList.add(
    "hidden"
  );

  setSending(true);

  state.messages.push({

    role:
      "user",

    content:
      "Create an image: " +
      prompt

  });

  renderMessages();

  messageInput.value =
    "";

  messageInput.style.height =
    "auto";

  showThinking();

  try {

    const response =
      await fetch(
        "/api/generate-image",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              prompt
            })
        }
      );

    const data =
      await parseResponse(
        response
      );

    removeThinking();

    if (
      !response.ok ||
      !data.ok
    ) {

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

      role:
        "assistant",

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

      role:
        "assistant",

      content:
        "I couldn't create that image right now.\n\n" +
        error.message

    });

    renderMessages();

  } finally {

    setSending(false);

    messageInput.focus();

  }
}


// ============================================================
// ATTACHMENTS
// ============================================================

attachButton?.addEventListener(
  "click",
  () => {

    if (state.sending) {
      return;
    }

    attachMenu?.classList.toggle(
      "hidden"
    );

  }
);


uploadPhotoButton?.addEventListener(
  "click",
  () => {

    attachMenu?.classList.add(
      "hidden"
    );

    photoInput?.click();

  }
);


uploadFileButton?.addEventListener(
  "click",
  () => {

    attachMenu?.classList.add(
      "hidden"
    );

    fileInput?.click();

  }
);


createImageButton?.addEventListener(
  "click",
  createImage
);


photoInput?.addEventListener(
  "change",
  () => {

    const file =
      photoInput.files?.[0];

    if (!file) {
      return;
    }

    state.selectedFile =
      file;

    if (fileName) {

      fileName.textContent =
        "Selected: " +
        file.name;

    }

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

    if (fileName) {

      fileName.textContent =
        "Selected: " +
        file.name;

    }

  }
);


// ============================================================
// INPUT
// ============================================================

sendButton?.addEventListener(
  "click",
  sendMessage
);


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
        150
      ) + "px";

  }
);


// ============================================================
// SEARCH CHATS
// ============================================================

searchChats?.addEventListener(
  "input",
  () => {

    const search =
      searchChats.value
        .trim()
        .toLowerCase();

    const filtered =
      state.chats.filter(
        chat =>
          String(
            chat.title || ""
          )
            .toLowerCase()
            .includes(search)
      );

    if (!search) {

      renderRecentChats();

      return;
    }

    if (!historyList) {
      return;
    }

    historyList.innerHTML =
      "";

    for (
      const chat of filtered
    ) {

      const conversationId =
        chat.id ||
        chat.conversationId;

      if (!conversationId) {
        continue;
      }

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "historyItem";

      item.textContent =
        chat.title ||
        "New chat";

      item.addEventListener(
        "click",
        async () => {

          await loadConversation(
            conversationId
          );

          closeMenu();

        }
      );

      historyList.appendChild(
        item
      );

    }

  }
);


// ============================================================
// AUTHENTICATION
// ============================================================

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

      emailLogin.disabled =
        true;

      const email =
        emailInput.value.trim();

      const password =
        passwordInput.value;

      if (
        !email ||
        !password
      ) {

        throw new Error(
          "Enter your email and password."
        );

      }

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

      emailSignup.disabled =
        true;

      const email =
        emailInput.value.trim();

      const password =
        passwordInput.value;

      if (
        !email ||
        !password
      ) {

        throw new Error(
          "Enter an email and password."
        );

      }

      await createUserWithEmailAndPassword(
        firebaseAuth,
        email,
        password
      );

    } catch (error) {

      console.error(
        "Account creation error:",
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


logoutButton?.addEventListener(
  "click",
  async () => {

    try {

      await signOut(
        firebaseAuth
      );

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }

  }
);


// ============================================================
// AUTH STATE
// ============================================================

function setupAuthListener() {

  onAuthStateChanged(
    firebaseAuth,
    async user => {

      updateUserState(
        user
      );

      if (user) {

        state.conversationId =
          null;

        state.messages =
          [];

        if (accountName) {

          accountName.textContent =
            user.displayName ||
            "Zed User";

        }

        if (accountEmail) {

          accountEmail.textContent =
            user.email ||
            "";

        }

        if (
          profilePhoto &&
          user.photoURL
        ) {

          profilePhoto.src =
            user.photoURL;

        } else if (
          profilePhoto
        ) {

          profilePhoto.src =
            "data:image/svg+xml," +
            encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg"
                   width="80"
                   height="80">
                <rect width="100%"
                      height="100%"
                      fill="#444"/>
                <text x="50%"
                      y="57%"
                      text-anchor="middle"
                      fill="white"
                      font-family="Arial"
                      font-size="30">
                  Z
                </text>
              </svg>
            `);

        }

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

        renderMessages();

        showAuth();

        closeMenu();

      }

    }
  );
}


// ============================================================
// VOICE INPUT
// ============================================================

let recognition =
  null;


if (
  "webkitSpeechRecognition" in window ||
  "SpeechRecognition" in window
) {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  recognition =
    new SpeechRecognition();

  recognition.lang =
    "en-US";

  recognition.interimResults =
    false;

  recognition.continuous =
    false;

  recognition.onstart =
    () => {

      if (micButton) {

        micButton.style.background =
          "#4a4a4a";

      }

    };

  recognition.onend =
    () => {

      if (micButton) {

        micButton.style.background =
          "transparent";

      }

    };

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

      if (micButton) {

        micButton.style.background =
          "transparent";

      }

    };

}


micButton?.addEventListener(
  "click",
  () => {

    if (!recognition) {

      alert(
        "Voice input is not supported by this browser."
      );

      return;

    }

    if (state.sending) {
      return;
    }

    try {

      recognition.start();

    } catch (error) {

      console.error(
        "Voice start error:",
        error
      );

    }

  }
);


// ============================================================
// START ZED
// ============================================================

async function initialize() {

  try {

    await initializeFirebase();

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
