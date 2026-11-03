// Zed voice chat — speech is routed through the same authenticated /api/chat engine as text.
(() => {
  let recognition = null;
  let active = false;
  let processing = false;
  let speaking = false;
  let restartPending = false;
  let dock = null;
  let statusNode = null;
  let transcriptNode = null;
  let startButton = null;
  let stopButton = null;
  let finalTranscript = "";

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function setStatus(message, state = "idle") {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.dataset.state = state;
  }

  function ensureDock() {
    if (dock) return dock;
    dock = document.createElement("section");
    dock.className = "zed-voice-dock";
    dock.setAttribute("aria-label", "Zed voice chat controls");
    dock.innerHTML = `
      <div class="zed-voice-dock-main">
        <div class="zed-voice-indicator" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="zed-voice-copy">
          <div class="zed-voice-title">Voice chat</div>
          <div class="zed-voice-status" data-state="idle" aria-live="polite">Ready when you are</div>
          <div class="zed-voice-transcript" aria-live="polite">Your spoken words will appear here.</div>
        </div>
        <div class="zed-voice-controls">
          <button class="zed-voice-stop" type="button">End voice</button>
        </div>
      </div>`;
    const composer = document.querySelector(".composer-container");
    (composer || document.body).prepend(dock);
    statusNode = dock.querySelector(".zed-voice-status");
    transcriptNode = dock.querySelector(".zed-voice-transcript");
    stopButton = dock.querySelector(".zed-voice-stop");
    stopButton.addEventListener("click", stop);
    return dock;
  }

  function updateButtons() {
    const mic = document.getElementById("voiceInputBtn");
    const mode = document.getElementById("voiceModeBtn");
    [mic, mode].forEach(button => {
      if (!button) return;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("voice-active", active);
      button.title = active ? "End voice chat" : "Start voice chat";
      button.setAttribute("aria-label", button.title);
    });
  }

  function stopRecognition() {
    if (!recognition) return;
    try { recognition.stop(); } catch {}
  }

  function startRecognition() {
    if (!active || processing || speaking || !recognition || restartPending) return;
    restartPending = true;
    try {
      recognition.start();
    } catch (error) {
      restartPending = false;
      if (error?.name !== "InvalidStateError") {
        console.warn("Zed voice recognition could not start:", error);
        setStatus("Microphone could not start. Tap the microphone to retry.", "error");
      }
    }
  }

  async function submitSpeech(text) {
    const spokenText = String(text || "").trim();
    if (!spokenText || processing || !active) return;
    processing = true;
    stopRecognition();
    if (transcriptNode) transcriptNode.textContent = "You: " + spokenText;
    setStatus("Zed is thinking…", "thinking");
    try {
      if (typeof window.zedVoiceSubmitTranscript !== "function") {
        throw new Error("The shared Zed chat connection is not ready. Reload the app and try again.");
      }
      const answer = await window.zedVoiceSubmitTranscript(spokenText);
      if (!answer) throw new Error("Zed did not return a response.");
      setStatus("Zed replied. Listening will resume after the response.", "speaking");
      if (!("speechSynthesis" in window)) {
        setStatus("Reply is shown in the chat. Tap the microphone to speak again.", "idle");
      }
    } catch (error) {
      console.error("Zed voice chat request failed:", error);
      setStatus(error.message || "Voice request failed. Please try again.", "error");
    } finally {
      processing = false;
      if (active && !speaking) {
        if ("speechSynthesis" in window && window.speechSynthesis.speaking) {
          speaking = true;
        } else {
          window.setTimeout(startRecognition, 350);
        }
      }
    }
  }

  function configureRecognition() {
    if (!SpeechRecognition) return false;
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      restartPending = false;
      finalTranscript = "";
      setStatus("Listening… speak naturally", "listening");
    };
    recognition.onresult = event => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalTranscript += result[0].transcript + " ";
        else interim += result[0].transcript;
      }
      const visible = (finalTranscript + interim).trim();
      if (visible && transcriptNode) transcriptNode.textContent = "You: " + visible;
      if (finalTranscript.trim()) {
        const completed = finalTranscript.trim();
        finalTranscript = "";
        void submitSpeech(completed);
      }
    };
    recognition.onerror = event => {
      restartPending = false;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setStatus("Microphone permission was denied. Allow microphone access in your browser settings.", "error");
        active = false;
        updateButtons();
        dock?.classList.remove("is-active");
        window.zedVoiceSetEnabled?.(false);
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setStatus("Voice recognition interrupted. Trying again…", "error");
      }
    };
    recognition.onend = () => {
      restartPending = false;
      if (active && !processing && !speaking) window.setTimeout(startRecognition, 300);
    };
    return true;
  }

  function start() {
    ensureDock();
    if (!SpeechRecognition) {
      dock.classList.add("is-active");
      setStatus("Voice recognition is not supported in this browser. Try Safari or Chrome with microphone permissions enabled.", "error");
      return;
    }
    if (active) return;
    if (!recognition && !configureRecognition()) return;
    active = true;
    processing = false;
    speaking = false;
    dock.classList.add("is-active");
    document.body.classList.add("zed-voice-chat-active");
    window.zedVoiceSetEnabled?.(true);
    updateButtons();
    setStatus("Starting microphone…", "connecting");
    startRecognition();
  }

  function stop() {
    active = false;
    processing = false;
    speaking = false;
    restartPending = false;
    stopRecognition();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    window.zedVoiceSetEnabled?.(false);
    dock?.classList.remove("is-active");
    document.body.classList.remove("zed-voice-chat-active");
    setStatus("Voice chat ended", "idle");
    updateButtons();
  }

  function toggle() {
    if (active) stop();
    else start();
  }

  window.addEventListener("zed:voice-speaking", event => {
    speaking = Boolean(event.detail?.speaking);
    if (!active) return;
    if (speaking) {
      stopRecognition();
      setStatus("Zed is speaking…", "speaking");
    } else if (!processing) {
      setStatus("Listening…", "listening");
      window.setTimeout(startRecognition, 350);
    }
  });

  function install() {
    ["voiceInputBtn", "voiceModeBtn"].forEach(id => {
      const button = document.getElementById(id);
      if (!button) return;
      button.title = "Start voice chat";
      button.setAttribute("aria-label", "Start voice chat");
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggle();
      }, true);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && active) stopRecognition();
      else if (!document.hidden && active && !processing && !speaking) startRecognition();
    });
  }

  window.ZedVoiceMode = { start, stop, toggle };
  install();
})();