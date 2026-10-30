/* Zed interface enhancements — presentation only; preserves existing API/auth flows. */
(() => {
  "use strict";

  const root = document.documentElement;
  const themeButton = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeToggleIcon");
  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendBtn");
  const fileInput = document.getElementById("fileInput");
  const fileChip = document.getElementById("selectedFileChip");
  const recentChats = document.getElementById("recentChats");

  function applyTheme(theme, persist = true) {
    const safeTheme = theme === "light" ? "light" : "dark";
    root.dataset.theme = safeTheme;
    if (persist) {
      try { localStorage.setItem("zed-theme", safeTheme); } catch {}
    }
    if (themeButton) {
      const nextTheme = safeTheme === "dark" ? "light" : "dark";
      themeButton.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
      themeButton.title = `Switch to ${nextTheme} theme`;
    }
    if (themeIcon) themeIcon.textContent = safeTheme === "dark" ? "☼" : "☾";
  }

  applyTheme(root.dataset.theme || "dark", false);
  themeButton?.addEventListener("click", () => {
    applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
  });

  // Show the selected file and allow removal before sending.
  function renderFileChip(file) {
    if (!fileChip) return;
    fileChip.replaceChildren();
    if (!file) {
      fileChip.hidden = true;
      return;
    }
    fileChip.hidden = false;
    const label = document.createElement("span");
    label.className = "selected-file-name";
    label.textContent = `Attached: ${file.name}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-file-button";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${file.name}`);
    remove.addEventListener("click", () => {
      try { state.selectedFile = null; } catch {}
      if (fileInput) fileInput.value = "";
      renderFileChip(null);
      if (messageInput && messageInput.value === `Please analyze ${file.name}`) {
        messageInput.value = "";
      }
    });
    fileChip.append(label, remove);
  }
  fileInput?.addEventListener("change", () => renderFileChip(fileInput.files?.[0] || null));
  if (sendButton) {
    const sendingObserver = new MutationObserver(() => {
      if (!sendButton.disabled && !fileInput?.files?.length) renderFileChip(null);
    });
    sendingObserver.observe(sendButton, { attributes: true, attributeFilter: ["disabled"] });
  }

  // Make dynamically-created settings expose the same theme preference.
  const settingsObserver = new MutationObserver(() => {
    const panel = document.getElementById("zedSettingsPanel");
    if (!panel || panel.querySelector("#zedThemeSetting")) return;
    const section = document.createElement("div");
    section.className = "zed-theme-setting";
    section.id = "zedThemeSetting";
    const copy = document.createElement("div");
    copy.innerHTML = "<strong>Appearance</strong><span>Choose how Zed looks on this device.</span>";
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Theme");
    select.innerHTML = '<option value="dark">Dark</option><option value="light">Light</option>';
    select.value = root.dataset.theme === "light" ? "light" : "dark";
    select.addEventListener("change", () => applyTheme(select.value));
    section.append(copy, select);
    const appearance = [...panel.children].find(child => /Appearance/.test(child.textContent || ""));
    if (appearance) appearance.replaceWith(section);
    else panel.prepend(section);
  });
  settingsObserver.observe(document.body, { childList: true, subtree: true });

  // Keyboard shortcuts make desktop use faster while keeping native text editing.
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      document.getElementById("attachMenu")?.classList.remove("show");
      document.getElementById("zedSettingsPanel")?.querySelector("#zedSettingsClose")?.click();
      document.getElementById("zedMenuBackdrop")?.click();
      if (messageInput && !messageInput.disabled) messageInput.focus();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      const search = document.getElementById("chatSearchInput");
      if (search) search.focus();
      else messageInput?.focus();
    }
  });

  // Highlight the selected conversation without changing history API behavior.
  recentChats?.addEventListener("click", event => {
    const item = event.target.closest(".recent-chat");
    if (!item) return;
    recentChats.querySelectorAll(".recent-chat").forEach(chat => {
      chat.classList.toggle("active", chat === item);
      if (chat === item) chat.setAttribute("aria-current", "true");
      else chat.removeAttribute("aria-current");
    });
  });

  // Respect reduced-motion preferences for people who request it.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("reduce-motion");
  }
})();
