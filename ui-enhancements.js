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
  const sidebar = document.getElementById("sidebar");

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

  // Add a quick filter without changing the existing chat-history API.
  if (recentChats && !document.getElementById("chatSearch")) {
    const search = document.createElement("input");
    search.id = "chatSearch";
    search.className = "chat-search";
    search.type = "search";
    search.placeholder = "Search conversations";
    search.setAttribute("aria-label", "Search conversation titles");
    recentChats.parentElement?.insertBefore(search, recentChats);
    search.addEventListener("input", () => {
      const query = search.value.trim().toLocaleLowerCase();
      recentChats.querySelectorAll(".recent-chat").forEach(item => {
        item.hidden = !item.textContent.toLocaleLowerCase().includes(query);
      });
    });
    new MutationObserver(() => {
      const query = search.value.trim().toLocaleLowerCase();
      recentChats.querySelectorAll(".recent-chat").forEach(item => {
        item.hidden = !item.textContent.toLocaleLowerCase().includes(query);
      });
    }).observe(recentChats, { childList: true });
  }

  // Suggested prompts reuse the normal message-send path.
  document.querySelectorAll(".suggested-prompt, .suggestion-card").forEach(button => {
    button.addEventListener("click", () => {
      if (!messageInput || messageInput.disabled) return;
      messageInput.value = button.dataset.prompt || "";
      messageInput.dispatchEvent(new Event("input", { bubbles: true }));
      messageInput.focus();
      if (sendButton && !sendButton.disabled) sendButton.click();
    });
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
      if (fileInput) fileInput.value = "";
      renderFileChip(null);
      if (messageInput && messageInput.value === `Please analyze ${file.name}`) {
        messageInput.value = "";
      }
    });
    fileChip.append(label, remove);
  }
  fileInput?.addEventListener("change", () => renderFileChip(fileInput.files?.[0] || null));
  sendButton?.addEventListener("click", () => {
    // The core app clears the file input after a completed request.
    window.setTimeout(() => {
      if (!fileInput?.files?.length) renderFileChip(null);
    }, 0);
  });

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

  // Escape closes transient UI and returns focus to the composer.
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    document.getElementById("attachMenu")?.classList.remove("show");
    document.getElementById("zedSettingsPanel")?.querySelector("#zedSettingsClose")?.click();
    document.getElementById("zedMenuBackdrop")?.click();
    if (messageInput && !messageInput.disabled) messageInput.focus();
  });

  // Mark the selected conversation in the sidebar.
  if (recentChats) {
    const activeObserver = new MutationObserver(() => {
      recentChats.querySelectorAll(".recent-chat").forEach(item => {
        const isActive = item.dataset.conversationId &&
          item.dataset.conversationId === window.zedActiveConversationId;
        item.classList.toggle("active", Boolean(isActive));
      });
    });
    activeObserver.observe(recentChats, { childList: true, subtree: true });
  }

  // Respect reduced-motion preferences for people who request it.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("reduce-motion");
  }
})();
