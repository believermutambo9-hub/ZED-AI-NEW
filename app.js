// ============================================================
// ZED AI INTERFACE
// ============================================================
const state = {
  userId: "guest",
  conversationId: null,
  sending: false,
  chats: []
};
// ============================================================
// ELEMENTS
// ============================================================
const messagesEl =
  document.getElementById("messages");
const welcomeEl =
  document.getElementById("welcome");
const messageInput =
  document.getElementById("messageInput");
const sendBtn =
  document.getElementById("sendBtn");
const newChatBtn =
  document.getElementById("newChatBtn");
const recentChatsEl =
  document.getElementById("recentChats");
const attachBtn =
  document.getElementById("attachBtn");
const attachMenu =
  document.getElementById("attachMenu");
const fileInput =
  document.getElementById("fileInput");
const uploadPhotoBtn =
  document.getElementById("uploadPhotoBtn");
const uploadFileBtn =
  document.getElementById("uploadFileBtn");
const createImageBtn =
  document.getElementById("createImageBtn");
const menuBtn =
  document.getElementById("menuBtn");
const sidebar =
  document.getElementById("sidebar");
// ============================================================
// USER ID
// ============================================================
function getUserId() {
  let userId =
    localStorage.getItem(
      "zedAIUserId"
    );
  if (!userId) {
    userId =
      "guest-" +
      crypto.randomUUID();
    localStorage.setItem(
      "zedAIUserId",
      userId
    );
  }
  return userId;
}
state.userId =
  getUserId();
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
function scrollToBottom() {
  const chatArea =
    document.querySelector(
      ".chat-area"
    );
  if (chatArea) {
    chatArea.scrollTop =
      chatArea.scrollHeight;
  }
}
function showWelcome(show = true) {
  if (!welcomeEl) {
    return;
  }
  welcomeEl.style.display =
    show ? "block" : "none";
}
function setSending(value) {
  state.sending = value;
  if (sendBtn) {
    sendBtn.disabled =
      value;
    sendBtn.style.opacity =
      value ? "0.5" : "1";
  }
  if (messageInput) {
    messageInput.disabled =
      value;
  }
}
// ============================================================
// MESSAGE DISPLAY
// ============================================================
function addMessage(
  role,
  content
) {
  if (!messagesEl) {
    return;
  }
  showWelcome(false);
  const message =
    document.createElement("div");
  message.className =
    `message message-${role}`;
  const contentEl =
    document.createElement("div");
  contentEl.className =
    "message-content";
  contentEl.textContent =
    content;
  message.appendChild(
    contentEl
  );
  messagesEl.appendChild(
    message
  );
  scrollToBottom();
  return message;
}
function addLoadingMessage() {
  if (!messagesEl) {
    return null;
  }
  showWelcome(false);
  const message =
    document.createElement("div");
  message.className =
    "message message-assistant";
  const content =
    document.createElement("div");
  content.className =
    "message-content";
  content.textContent =
    "Zed is thinking...";
  message.appendChild(
    content
  );
  messagesEl.appendChild(
    message
  );
  scrollToBottom();
  return message;
}
// ============================================================
// LOAD CONVERSATION
// ============================================================
async function loadConversation(
  conversationId
) {
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
      await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
        "Unable to load conversation."
      );
    }
    state.conversationId =
      data.conversation.id;
    messagesEl.innerHTML = "";
    const messages =
      data.conversation.messages ||
      [];
    if (!messages.length) {
      showWelcome(true);
      return;
    }
    showWelcome(false);
    for (
      const message of messages
    ) {
      addMessage(
        message.role,
        message.content
      );
    }
    scrollToBottom();
  } catch (error) {
    console.error(
      "Load conversation error:",
      error
    );
    addMessage(
      "assistant",
      "I couldn't load that conversation."
    );
  }
}
// ============================================================
// LOAD RECENT CHATS
// ============================================================
async function loadChats() {
  try {
    const response =
      await fetch(
        `/api/chats?userId=${encodeURIComponent(
          state.userId
        )}`
      );
    const data =
      await response.json();
    if (!response.ok || !data.ok) {
      return;
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
  if (!recentChatsEl) {
    return;
  }
  recentChatsEl.innerHTML = "";
  if (!state.chats.length) {
    const empty =
      document.createElement(
        "div"
      );
    empty.style.color =
      "#777";
    empty.style.fontSize =
      "12px";
    empty.style.padding =
      "10px";
    empty.textContent =
      "No recent chats";
    recentChatsEl.appendChild(
      empty
    );
    return;
  }
  for (
    const chat of state.chats
  ) {
    const button =
      document.createElement(
        "button"
      );
    button.className =
      "recent-chat";
    button.textContent =
      chat.title ||
      "New chat";
    button.title =
      chat.title ||
      "New chat";
    button.addEventListener(
      "click",
      async () => {
        await loadConversation(
          chat.id ||
          chat.conversationId
        );
        closeSidebarMobile();
      }
    );
    recentChatsEl.appendChild(
      button
    );
  }
}
// ============================================================
// NEW CHAT
// ============================================================
async function createNewChat() {
  try {
    const response =
      await fetch(
        "/api/new-chat",
        {
          method: "POST",
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
      await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
        "Unable to create chat."
      );
    }
    state.conversationId =
      data.conversationId;
    messagesEl.innerHTML = "";
    showWelcome(true);
    messageInput.value = "";
    await loadChats();
    messageInput.focus();
    closeSidebarMobile();
  } catch (error) {
    console.error(
      "New chat error:",
      error
    );
    addMessage(
      "assistant",
      "I couldn't create a new chat."
    );
  }
}
// ============================================================
// SEND MESSAGE
// ============================================================
async function sendMessage() {
  if (state.sending) {
    return;
  }
  const message =
    messageInput.value.trim();
  if (!message) {
    return;
  }
  setSending(true);
  addMessage(
    "user",
    message
  );
  messageInput.value = "";
  autoResizeTextarea();
  const loading =
    addLoadingMessage();
  try {
    const response =
      await fetch(
        "/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body:
            JSON.stringify({
              message,
              userId:
                state.userId,
              conversationId:
                state.conversationId
            })
        }
      );
    const data =
      await response.json();
    if (
      loading &&
      loading.parentNode
    ) {
      loading.parentNode.removeChild(
        loading
      );
    }
    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
        data.answer ||
        "Zed AI request failed."
      );
    }
    state.conversationId =
      data.conversationId ||
      state.conversationId;
    addMessage(
      "assistant",
      data.answer ||
      "I received your message, but no answer was returned."
    );
    await loadChats();
  } catch (error) {
    console.error(
      "Send message error:",
      error
    );
    if (
      loading &&
      loading.parentNode
    ) {
      loading.parentNode.removeChild(
        loading
      );
    }
    addMessage(
      "assistant",
      `Sorry, something went wrong: ${error.message}`
    );
  } finally {
    setSending(false);
    messageInput.focus();
  }
}
// ============================================================
// TEXTAREA AUTO RESIZE
// ============================================================
function autoResizeTextarea() {
  if (!messageInput) {
    return;
  }
  messageInput.style.height =
    "auto";
  messageInput.style.height =
    Math.min(
      messageInput.scrollHeight,
      180
    ) + "px";
}
// ============================================================
// ATTACH MENU
// ============================================================
function toggleAttachMenu() {
  if (!attachMenu) {
    return;
  }
  attachMenu.classList.toggle(
    "show"
  );
}
function closeAttachMenu() {
  if (!attachMenu) {
    return;
  }
  attachMenu.classList.remove(
    "show"
  );
}
// ============================================================
// FILE UPLOAD
// ============================================================
function openFilePicker() {
  closeAttachMenu();
  if (fileInput) {
    fileInput.click();
  }
}
function handleSelectedFile(
  file
) {
  if (!file) {
    return;
  }
  addMessage(
    "user",
    `Selected file: ${file.name}`
  );
  addMessage(
    "assistant",
    "File upload is selected. The next step is connecting this interface to your existing file-analysis endpoint."
  );
}
// ============================================================
// IMAGE GENERATION
// ============================================================
async function createImage() {
  closeAttachMenu();
  const prompt =
    window.prompt(
      "What image would you like Zed AI to create?"
    );
  if (!prompt || !prompt.trim()) {
    return;
  }
  const loading =
    addLoadingMessage();
  try {
    const response =
      await fetch(
        "/api/generate-image",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body:
            JSON.stringify({
              prompt:
                prompt.trim()
            })
        }
      );
    const data =
      await response.json();
    if (
      loading &&
      loading.parentNode
    ) {
      loading.parentNode.removeChild(
        loading
      );
    }
    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
        "Image generation failed."
      );
    }
    displayGeneratedImage(
      data.result
    );
  } catch (error) {
    console.error(
      "Image generation error:",
      error
    );
    if (
      loading &&
      loading.parentNode
    ) {
      loading.parentNode.removeChild(
        loading
      );
    }
    addMessage(
      "assistant",
      `Image generation failed: ${error.message}`
    );
  }
}
// ============================================================
// DISPLAY GENERATED IMAGE
// ============================================================
function displayGeneratedImage(
  result
) {
  if (!messagesEl) {
    return;
  }
  showWelcome(false);
  const message =
    document.createElement("div");
  message.className =
    "message message-assistant";
  const content =
    document.createElement("div");
  content.className =
    "message-content";
  if (
    result?.image &&
    result?.contentType
  ) {
    const img =
      document.createElement("img");
    img.src =
      `data:${result.contentType};base64,${result.image}`;
    img.alt =
      "Generated by Zed AI";
    img.style.maxWidth =
      "100%";
    img.style.borderRadius =
      "14px";
    content.appendChild(
      img
    );
  } else {
    content.textContent =
      "Zed generated a result, but the image format returned by the server is not currently supported by this interface.";
  }
  message.appendChild(
    content
  );
  messagesEl.appendChild(
    message
  );
  scrollToBottom();
}
// ============================================================
// MOBILE SIDEBAR
// ============================================================
function toggleSidebarMobile() {
  if (!sidebar) {
    return;
  }
  sidebar.classList.toggle(
    "open"
  );
}
function closeSidebarMobile() {
  if (!sidebar) {
    return;
  }
  sidebar.classList.remove(
    "open"
  );
}
// ============================================================
// EVENT LISTENERS
// ============================================================
if (sendBtn) {
  sendBtn.addEventListener(
    "click",
    sendMessage
  );
}
if (newChatBtn) {
  newChatBtn.addEventListener(
    "click",
    createNewChat
  );
}
if (attachBtn) {
  attachBtn.addEventListener(
    "click",
    toggleAttachMenu
  );
}
if (uploadFileBtn) {
  uploadFileBtn.addEventListener(
    "click",
    openFilePicker
  );
}
if (uploadPhotoBtn) {
  uploadPhotoBtn.addEventListener(
    "click",
    () => {
      closeAttachMenu();
      if (fileInput) {
        fileInput.accept =
          "image/*";
        fileInput.click();
      }
    }
  );
}
if (createImageBtn) {
  createImageBtn.addEventListener(
    "click",
    createImage
  );
}
if (fileInput) {
  fileInput.addEventListener(
    "change",
    event => {
      const file =
        event.target.files?.[0];
      handleSelectedFile(
        file
      );
      event.target.value =
        "";
    }
  );
}
if (menuBtn) {
  menuBtn.addEventListener(
    "click",
    toggleSidebarMobile
  );
}
if (messageInput) {
  messageInput.addEventListener(
    "input",
    autoResizeTextarea
  );
  messageInput.addEventListener(
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
}
document.addEventListener(
  "click",
  event => {
    if (
      attachMenu &&
      attachBtn &&
      !attachMenu.contains(
        event.target
      ) &&
      !attachBtn.contains(
        event.target
      )
    ) {
      closeAttachMenu();
    }
  }
);
// ============================================================
// INITIALIZE
// ============================================================
async function initialize() {
  try {
    await loadChats();
  } catch (error) {
    console.error(
      "Initialization error:",
      error
    );
  }
  messageInput?.focus();
}
initialize();
