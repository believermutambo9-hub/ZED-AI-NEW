// Zed voice: continuous listening, barge-in and spoken replies through the shared chat engine.
(() => {
  let recognition = null;
  let active = false;
  let processing = false;
  let speaking = false;
  let recognitionRunning = false;
  let restartPending = false;
  let finalTranscript = "";
  let voiceScreen = null;
  let statusNode = null;
  let transcriptNode = null;
  let muted = false;
  let speechGeneration = 0;
  let activeSpokenText = "";
  let transcriptHistory = [];
  let lastSubmittedAt = 0;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function setStatus(message, state = "idle") {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.dataset.state = state;
    voiceScreen?.classList.toggle("is-listening", state === "listening");
    voiceScreen?.classList.toggle("is-thinking", state === "thinking");
    voiceScreen?.classList.toggle("is-speaking", state === "speaking");
  }

  function setTranscript(message) {
    if (transcriptNode) transcriptNode.textContent = message;
  }

  function addTranscript(speaker, message) {
    transcriptHistory.push({ speaker, message: String(message || "").trim() });
    transcriptHistory = transcriptHistory.slice(-30);
    setTranscript(transcriptHistory.map(item => item.speaker + "\n" + item.message).join("\n\n"));
    if (transcriptNode) transcriptNode.scrollTop = transcriptNode.scrollHeight;
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
        <div class="zed-voice-header-actions">
          <span class="zed-voice-live-indicator"><i></i> LIVE</span>
          <button class="zed-voice-close" type="button" aria-label="Close voice chat">×</button>
        </div>
      </header>
      <main class="zed-voice-stage">
        <div class="zed-voice-orb" aria-hidden="true"><span></span><span></span><span></span></div>
        <h2 class="zed-voice-heading">Talk with Zed</h2>
        <p class="zed-voice-status" data-state="idle" aria-live="polite">Starting voice conversation…</p>
        <div class="zed-voice-transcript" aria-live="polite">Your conversation will appear here.</div>
      </main>
      <footer class="zed-voice-footer">
        <button class="zed-voice-action zed-voice-mute" type="button" aria-pressed="false"><span>◖</span><small>Mute reply</small></button>
        <button class="zed-voice-action zed-voice-mic" type="button" aria-label="Interrupt or resume listening"><span>🎙</span><small>Interrupt</small></button>
        <button class="zed-voice-action zed-voice-end" type="button"><span>×</span><small>End</small></button>
      </footer>
      <p class="zed-voice-hint">You can speak while Zed is talking to interrupt.</p>`;
    document.body.append(voiceScreen);
    statusNode = voiceScreen.querySelector(".zed-voice-status");
    transcriptNode = voiceScreen.querySelector(".zed-voice-transcript");
    voiceScreen.querySelector(".zed-voice-close").addEventListener("click", stop);
    voiceScreen.querySelector(".zed-voice-end").addEventListener("click", stop);
    voiceScreen.querySelector(".zed-voice-mute").addEventListener("click", toggleMute);
    voiceScreen.querySelector(".zed-voice-mic").addEventListener("click", () => {
      if (!active) return;
      interruptSpeech();
      startRecognition();
    });
    return voiceScreen;
  }

  function startRecognition() {
    if (!active || processing || !recognition || recognitionRunning || restartPending || document.hidden) return;
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
    restartPending = false;
    try { recognition.stop(); } catch {}
  }

  function normalizeWords(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9\s']/g, " ").split(/\s+/).filter(Boolean);
  }

  // Ignore text the microphone recognises from Zed's own speaker output.
  function isLikelySpeechEcho(candidate) {
    const words = normalizeWords(candidate);
    const spoken = normalizeWords(activeSpokenText);
    if (words.length < 2 || spoken.length < 2) return false;
    const spokenSet = new Set(spoken);
    const overlap = words.filter(word => spokenSet.has(word)).length / words.length;
    const phrase = words.join(" ");
    return activeSpokenText.toLowerCase().includes(phrase) || overlap >= 0.78;
  }

  function interruptSpeech() {
    if (!speaking) return;
    speechGeneration++;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    speaking = false;
    activeSpokenText = "";
    voiceScreen?.classList.remove("is-speaking");
    window.dispatchEvent(new CustomEvent("zed:voice-speaking", { detail: { speaking: false } }));
    setStatus("Listening… go ahead", "listening");
  }

  // iOS Safari may block speech started only after an awaited network request.
  // Prime its speech engine synchronously from the user's tap that opens Voice Mode.
  function primeSpeechSynthesis() {
    const synth = window.speechSynthesis;
    if (!synth || typeof window.SpeechSynthesisUtterance !== "function") return false;
    try {
      synth.cancel();
      const primer = new window.SpeechSynthesisUtterance(".");
      primer.lang = "en-US";
      primer.volume = 0;
      primer.rate = 10;
      primer.onend = () => {
        try { synth.resume(); } catch {}
      };
      synth.resume();
      synth.speak(primer);
      return true;
    } catch (error) {
      console.warn("Zed voice playback could not be unlocked:", error);
      return false;
    }
  }

  function speak(text) {
    const answer = String(text || "").trim();
    if (!answer || muted || !("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance !== "function") {
      if (!muted) setStatus("Spoken replies are not supported by this browser.", "error");
      return;
    }
    const generation = ++speechGeneration;
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    activeSpokenText = answer;
    const utterance = new SpeechSynthesisUtterance(answer.slice(0, 12000));
    utterance.lang = "en-US";
    utterance.rate = 1.02;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices?.() || [];
    const preferredVoice = voices.find(voice => /^en-US$/i.test(voice.lang) && /natural|enhanced|premium/i.test(voice.name))
      || voices.find(voice => /^en-US$/i.test(voice.lang))
      || voices.find(voice => /^en/i.test(voice.lang));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      if (generation !== speechGeneration || !active) return;
      speaking = true;
      setStatus("Zed is speaking — you can interrupt", "speaking");
      voiceScreen?.classList.add("is-speaking");
      window.dispatchEvent(new CustomEvent("zed:voice-speaking", { detail: { speaking: true } }));
      // Keep recognition alive during speech so the user can barge in naturally.
      startRecognition();
    };
    const finish = () => {
      if (generation !== speechGeneration) return;
      speaking = false;
      activeSpokenText = "";
      voiceScreen?.classList.remove("is-speaking");
      window.dispatchEvent(new CustomEvent("zed:voice-speaking", { detail: { speaking: false } }));
      if (active && !processing) {
        setStatus("Listening… your turn", "listening");
        window.setTimeout(startRecognition, 250);
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
    setStatus("Preparing Zed's voice…", "speaking");
  }

  function toggleMute() {
    muted = !muted;
    const button = voiceScreen?.querySelector(".zed-voice-mute");
    if (button) {
      button.setAttribute("aria-pressed", String(muted));
      button.querySelector("small").textContent = muted ? "Unmute reply" : "Mute reply";
    }
    if (muted) interruptSpeech();
  }

  async function submitSpeech(text) {
    const spokenText = String(text || "").trim();
    if (!spokenText || processing || !active) return;
    const now = Date.now();
    if (now - lastSubmittedAt < 700) return;
    lastSubmittedAt = now;
    processing = true;
    stopRecognition();
    interruptSpeech();
    finalTranscript = "";
    addTranscript("You", spokenText);
    setStatus("Zed is thinking…", "thinking");
    try {
      if (typeof window.zedVoiceSubmitTranscript !== "function") {
        throw new Error("Zed's chat engine is not ready. Please reload and try again.");
      }
      const answer = await window.zedVoiceSubmitTranscript(spokenText);
      if (!answer) throw new Error("Zed did not return a response. Please try again.");
      addTranscript("Zed", answer);
      if (!muted && "speechSynthesis" in window) speak(answer);
      else setStatus("Zed replied. Listening…", "listening");
    } catch (error) {
      console.error("Zed voice conversation failed:", error);
      const message = error?.message || "Voice request failed. Please try again.";
      addTranscript("Zed", message);
      if (!muted) speak(message);
      else setStatus(message, "error");
    } finally {
      processing = false;
      if (active) window.setTimeout(startRecognition, 300);
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
      recognitionRunning = true;
      finalTranscript = "";
      if (active && !processing && !speaking) setStatus("Listening… speak naturally", "listening");
    };
    recognition.onresult = event => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const phrase = String(result[0]?.transcript || "").trim();
        if (!phrase) continue;
        if (speaking && isLikelySpeechEcho(phrase)) continue;
        if (speaking && phrase.split(/\s+/).length >= 2) interruptSpeech();
        if (result.isFinal) finalText += phrase + " ";
        else interim += phrase;
      }
      const visible = (finalText + interim).trim();
      if (visible && !speaking) setTranscript("You\n" + visible);
      if (finalText.trim() && !processing) void submitSpeech(finalText.trim());
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
      recognitionRunning = false;
      restartPending = false;
      if (active && !processing && !document.hidden) window.setTimeout(startRecognition, 250);
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
    // Must run directly inside the Start Voice button gesture for iOS Safari.
    primeSpeechSynthesis();
    active = true;
    processing = false;
    speaking = false;
    muted = false;
    transcriptHistory = [];
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
    recognitionRunning = false;
    restartPending = false;
    speechGeneration++;
    stopRecognition();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    activeSpokenText = "";
    window.zedVoiceSetEnabled?.(false);
    voiceScreen?.classList.remove("is-active", "is-speaking", "is-listening", "is-thinking");
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
      else if (!document.hidden && active && !processing) startRecognition();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && active) stop();
    });
  }

  window.ZedVoiceMode = { start, stop, toggle, get isActive() { return active; } };
  install();
})();
