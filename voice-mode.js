// Zed dedicated voice experience — all requests use the authenticated shared chat engine.
(() => {
  let recognition = null;
  let active = false;
  let processing = false;
  let speaking = false;
  let restartPending = false;
  let finalTranscript = "";
  let voiceScreen = null;
  let statusNode = null;
  let transcriptNode = null;
  let lastUserText = "";
  let muted = false;
  let speechGeneration = 0;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function setStatus(message, state = "idle") {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.dataset.state = state;
  }

  function setTranscript(message) {
    if (transcriptNode) transcriptNode.textContent = message;
  }

  function updateButtons() {
    for (const id of ["voiceInputBtn", "voiceModeBtn"]) {
      const button = document.getElementById(id);
      if (!button) continue;
      button.classList.toggle("voice-active", active);
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", active ? "Close voice chat" : "Start voice chat");
      button.title = active ? "Close voice chat" : "Start voice chat";
    }
  }

  function ensureScreen() {
    if (voiceScreen) return voiceScreen;
    voiceScreen = document.createElement("section");
    voiceScreen.className = "zed-voice-screen";
    voiceScreen.setAttribute("role", "dialog");
    voiceScreen.setAttribute("aria-modal", "true");
    voiceScreen.setAttribute("aria-label", "Zed voice conversation");
    voiceScreen.innerHTML = `
      <header class="zed-voice-header">
        <div class="zed-voice-brand"><span class="zed-voice-brand-mark">Z</span><span>Zed voice</span></div>
        <button class="zed-voice-close" type="button" aria-label="Close voice chat">×</button>
      </header>
      <main class="zed-voice-stage">
        <div class="zed-voice-orb" aria-hidden="true"><span></span><span></span><span></span></div>
        <h2 class="zed-voice-heading">Talk with Zed</h2>
        <p class="zed-voice-status" data-state="idle" aria-live="polite">Starting voice conversation…</p>
        <div class="zed-voice-transcript" aria-live="polite">Your conversation will appear here.</div>
      </main>
      <footer class="zed-voice-footer">
        <button class="zed-voice-action zed-voice-mute" type="button" aria-pressed="false"><span>◖</span><small>Mute reply</small></button>
        <button class="zed-voice-action zed-voice-mic" type="button" aria-label="Resume listening"><span>🎙</span><small>Listening</small></button>
        <button class="zed-voice-action zed-voice-end" type="button"><span>×</span><small>End</small></button>
      </footer>`;
    document.body.append(voiceScreen);
    statusNode = voiceScreen.querySelector(".zed-voice-status");
    transcriptNode = voiceScreen.querySelector(".zed-voice-transcript");
    voiceScreen.querySelector(".zed-voice-close").addEventListener("click", stop);
    voiceScreen.querySelector(".zed-voice-end").addEventListener("click", stop);
    voiceScreen.querySelector(".zed-voice-mute").addEventListener("click", toggleMute);
    voiceScreen.querySelector(".zed-voice-mic").addEventListener("click", () => {
      if (!active) return;
      if (speaking && "speechSynthesis" in window) window.speechSynthesis.cancel();
      speaking = false;
      startRecognition();
    });
    return voiceScreen;
  }

  function startRecognition() {
    if (!active || processing || speaking || muted && !recognition || !recognition || restartPending || document.hidden) return;
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

  function stopRecognition() {
    if (!recognition) return;
    try { recognition.stop(); } catch {}
  }

  function speak(text) {
    const answer = String(text || "").trim();
    if (!answer || muted || !("speechSynthesis" in window)) return;
    const generation = ++speechGeneration;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(answer.slice(0, 12000));
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => {
      if (generation !== speechGeneration || !active) return;
      speaking = true;
      stopRecognition();
      setStatus("Zed is speaking…", "speaking");
      voiceScreen?.classList.add("is-speaking");
      window.dispatchEvent(new CustomEvent("zed:voice-speaking", { detail: { speaking: true } }));
    };
    const finish = () => {
      if (generation !== speechGeneration) return;
      speaking = false;
      voiceScreen?.classList.remove("is-speaking");
      window.dispatchEvent(new CustomEvent("zed:voice-speaking", { detail: { speaking: false } }));
      if (active && !processing) {
        setStatus("Listening… your turn", "listening");
        window.setTimeout(startRecognition, 450);
      }
    };
    utterance.onend = finish;
    utterance.onerror = event => {
      if (event.error !== "canceled" && event.error !== "interrupted") {
        setStatus("Zed's reply is visible, but audio playback failed. Tap the microphone to continue.", "error");
      }
      finish();
    };
    window.speechSynthesis.speak(utterance);
    // Some mobile browsers queue speech without firing onstart promptly.
    setStatus("Preparing Zed's voice…", "speaking");
  }

  function toggleMute() {
    muted = !muted;
    const button = voiceScreen?.querySelector(".zed-voice-mute");
    if (button) {
      button.setAttribute("aria-pressed", String(muted));
      button.querySelector("small").textContent = muted ? "Unmute reply" : "Mute reply";
    }
    if (muted && "speechSynthesis" in window) {
      speechGeneration++;
      window.speechSynthesis.cancel();
      speaking = false;
      voiceScreen?.classList.remove("is-speaking");
      if (active && !processing) startRecognition();
    }
  }

  async function submitSpeech(text) {
    const spokenText = String(text || "").trim();
    if (!spokenText || processing || !active) return;
    processing = true;
    stopRecognition();
    lastUserText = spokenText;
    setTranscript("You\n" + spokenText);
    setStatus("Zed is thinking…", "thinking");
    try {
      if (typeof window.zedVoiceSubmitTranscript !== "function") {
        throw new Error("Zed's chat engine is not ready. Please reload and try again.");
      }
      const answer = await window.zedVoiceSubmitTranscript(spokenText);
      if (!answer) throw new Error("Zed did not return a response. Please try again.");
      setTranscript("You\n" + spokenText + "\n\nZed\n" + answer);
      if (!muted && "speechSynthesis" in window) speak(answer);
      else {
        setStatus("Zed replied. Listening…", "listening");
        window.setTimeout(startRecognition, 350);
      }
    } catch (error) {
      console.error("Zed voice conversation failed:", error);
      const message = error?.message || "Voice request failed. Please try again.";
      setTranscript("You\n" + spokenText + "\n\nZed\n" + message);
      setStatus(message, "error");
      if (!muted) speak(message);
    } finally {
      processing = false;
      if (active && !speaking && (!("speechSynthesis" in window) || muted)) {
        window.setTimeout(startRecognition, 400);
      }
    }
  }

  function configureRecognition() {
    if (!SpeechRecognition) return false;
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      restartPending = false;
      finalTranscript = "";
      if (active && !processing && !speaking) setStatus("Listening… speak naturally", "listening");
    };
    recognition.onresult = event => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalTranscript += result[0].transcript + " ";
        else interim += result[0].transcript;
      }
      const visible = (finalTranscript + interim).trim();
      if (visible) setTranscript("You\n" + visible);
      if (finalTranscript.trim() && !processing) {
        const completed = finalTranscript.trim();
        finalTranscript = "";
        void submitSpeech(completed);
      }
    };
    recognition.onerror = event => {
      restartPending = false;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setStatus("Microphone permission was denied. Allow microphone access and start voice again.", "error");
        active = false;
        document.body.classList.remove("zed-voice-open");
        voiceScreen?.classList.remove("is-active");
        window.zedVoiceSetEnabled?.(false);
        updateButtons();
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setStatus("Microphone connection interrupted. Reconnecting…", "error");
      }
    };
    recognition.onend = () => {
      restartPending = false;
      if (active && !processing && !speaking && !document.hidden) window.setTimeout(startRecognition, 350);
    };
    return true;
  }

  function start() {
    ensureScreen();
    if (!SpeechRecognition) {
      voiceScreen.classList.add("is-active");
      document.body.classList.add("zed-voice-open");
      setStatus("This browser does not support voice input. Open Zed in Safari or Chrome with microphone access enabled.", "error");
      return;
    }
    if (active) return;
    if (!recognition && !configureRecognition()) return;
    active = true;
    processing = false;
    speaking = false;
    muted = false;
    document.body.classList.add("zed-voice-open");
    voiceScreen.classList.add("is-active");
    voiceScreen.querySelector(".zed-voice-mute").setAttribute("aria-pressed", "false");
    voiceScreen.querySelector(".zed-voice-mute small").textContent = "Mute reply";
    setTranscript("I'm listening. What would you like to talk about?");
    setStatus("Connecting microphone…", "connecting");
    window.zedVoiceSetEnabled?.(true);
    updateButtons();
    startRecognition();
  }

  function stop() {
    active = false;
    processing = false;
    speaking = false;
    restartPending = false;
    speechGeneration++;
    stopRecognition();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    window.zedVoiceSetEnabled?.(false);
    voiceScreen?.classList.remove("is-active", "is-speaking");
    document.body.classList.remove("zed-voice-open");
    setStatus("Voice conversation ended", "idle");
    updateButtons();
  }

  function toggle() {
    if (active) stop();
    else start();
  }

  function install() {
    for (const id of ["voiceInputBtn", "voiceModeBtn"]) {
      const button = document.getElementById(id);
      if (!button) continue;
      button.title = "Start voice chat";
      button.setAttribute("aria-label", "Start voice chat");
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggle();
      }, true);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && active) stopRecognition();
      else if (!document.hidden && active && !processing && !speaking) startRecognition();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && active) stop();
    });
  }

  window.ZedVoiceMode = { start, stop, toggle, get isActive() { return active; } };
  install();
})();
