// Zed real-time voice: Gemini Live native audio, continuous microphone streaming and barge-in.
(() => {
  let active = false;
  let connecting = false;
  let muted = false;
  let socket = null;
  let mediaStream = null;
  let audioContext = null;
  let micSource = null;
  let micProcessor = null;
  let silentGain = null;
  let voiceScreen = null;
  let statusNode = null;
  let transcriptNode = null;
  let setupReady = false;
  let scheduledUntil = 0;
  let activeSources = new Set();
  let inputText = "";
  let outputText = "";
  let connectGeneration = 0;

  const LIVE_ENDPOINT = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";

  function setStatus(message, state = "idle") {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.dataset.state = state;
    voiceScreen?.classList.toggle("is-listening", state === "listening");
    voiceScreen?.classList.toggle("is-thinking", state === "thinking");
    voiceScreen?.classList.toggle("is-speaking", state === "speaking");
  }

  function setTranscript(message) {
    if (!transcriptNode) return;
    transcriptNode.textContent = message || "Your conversation will appear here.";
    transcriptNode.scrollTop = transcriptNode.scrollHeight;
  }

  function appendTranscript(speaker, message) {
    const line = String(message || "").trim();
    if (!line) return;
    const current = transcriptNode?.textContent || "";
    const prefix = current === "Your conversation will appear here." ? "" : current + "\n\n";
    setTranscript(prefix + speaker + "\n" + line);
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
    voiceScreen.setAttribute("aria-label", "Zed real-time voice conversation");
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
        <p class="zed-voice-status" data-state="idle" aria-live="polite">Starting real-time voice…</p>
        <div class="zed-voice-transcript" aria-live="polite">Your conversation will appear here.</div>
      </main>
      <footer class="zed-voice-footer">
        <button class="zed-voice-action zed-voice-mute" type="button" aria-pressed="false"><span>◖</span><small>Mute reply</small></button>
        <button class="zed-voice-action zed-voice-mic" type="button" aria-label="Stop current reply"><span>🎙</span><small>Interrupt</small></button>
        <button class="zed-voice-action zed-voice-end" type="button"><span>×</span><small>End</small></button>
      </footer>
      <p class="zed-voice-hint">Speak naturally. You can interrupt Zed at any time.</p>`;
    document.body.append(voiceScreen);
    statusNode = voiceScreen.querySelector(".zed-voice-status");
    transcriptNode = voiceScreen.querySelector(".zed-voice-transcript");
    voiceScreen.querySelector(".zed-voice-close").addEventListener("click", stop);
    voiceScreen.querySelector(".zed-voice-end").addEventListener("click", stop);
    voiceScreen.querySelector(".zed-voice-mute").addEventListener("click", toggleMute);
    voiceScreen.querySelector(".zed-voice-mic").addEventListener("click", () => {
      stopPlayback();
      if (active && setupReady) setStatus("Listening… go ahead", "listening");
    });
    return voiceScreen;
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      binary += String.fromCharCode(...bytes.subarray(i, i + step));
    }
    return btoa(binary);
  }

  function downsampleToPcm16(input, inputRate) {
    const ratio = inputRate / 16000;
    const outputLength = Math.max(1, Math.floor(input.length / ratio));
    const pcm = new Int16Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
      const position = i * ratio;
      const left = Math.floor(position);
      const right = Math.min(left + 1, input.length - 1);
      const fraction = position - left;
      const sample = input[left] * (1 - fraction) + input[right] * fraction;
      const clipped = Math.max(-1, Math.min(1, sample));
      pcm[i] = clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff;
    }
    return new Uint8Array(pcm.buffer);
  }

  function startMicrophoneStreaming() {
    if (!audioContext || !mediaStream || !socket || socket.readyState !== WebSocket.OPEN) return;
    micSource = audioContext.createMediaStreamSource(mediaStream);
    micProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    micProcessor.onaudioprocess = event => {
      if (!active || !setupReady || !socket || socket.readyState !== WebSocket.OPEN) return;
      const input = event.inputBuffer.getChannelData(0);
      const pcm = downsampleToPcm16(input, audioContext.sampleRate);
      socket.send(JSON.stringify({
        realtimeInput: {
          audio: {
            mimeType: "audio/pcm;rate=16000",
            data: bytesToBase64(pcm)
          }
        }
      }));
    };
    micSource.connect(micProcessor);
    micProcessor.connect(silentGain);
    silentGain.connect(audioContext.destination);
  }

  function stopPlayback() {
    for (const source of activeSources) {
      try { source.stop(); } catch {}
      try { source.disconnect(); } catch {}
    }
    activeSources.clear();
    scheduledUntil = audioContext?.currentTime || 0;
    voiceScreen?.classList.remove("is-speaking");
    if (active && setupReady) setStatus("Listening… go ahead", "listening");
  }

  function playPcm24k(base64) {
    if (!audioContext || muted || !base64) return;
    const binary = atob(base64);
    if (binary.length < 8) return;
    const sampleCount = Math.floor(binary.length / 2);
    const view = new DataView(new ArrayBuffer(sampleCount * 2));
    for (let i = 0; i < sampleCount; i++) {
      view.setInt16(i * 2, (binary.charCodeAt(i * 2) & 255) | ((binary.charCodeAt(i * 2 + 1) & 255) << 8), true);
    }
    const buffer = audioContext.createBuffer(1, sampleCount, 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) channel[i] = view.getInt16(i * 2, true) / 32768;
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    const startAt = Math.max(audioContext.currentTime + 0.025, scheduledUntil);
    scheduledUntil = startAt + buffer.duration;
    activeSources.add(source);
    source.onended = () => {
      activeSources.delete(source);
      try { source.disconnect(); } catch {}
      if (active && activeSources.size === 0 && audioContext.currentTime >= scheduledUntil - 0.04) {
        voiceScreen?.classList.remove("is-speaking");
        setStatus("Listening… your turn", "listening");
      }
    };
    source.start(startAt);
    voiceScreen?.classList.add("is-speaking");
    setStatus("Zed is speaking — you can interrupt", "speaking");
  }

  async function submitToZedChat(spokenText) {
    if (typeof window.zedVoiceSubmitTranscript !== "function") {
      throw new Error("Zed's chat engine is not ready. Please reload and try again.");
    }
    return await window.zedVoiceSubmitTranscript(String(spokenText || "").trim());
  }

  async function handleToolCalls(calls) {
    for (const call of calls || []) {
      if (call.name !== "zed_chat") {
        socket?.send(JSON.stringify({
          toolResponse: {
            functionResponses: [{
              id: call.id,
              name: call.name,
              response: { error: "This tool is not available in voice mode." }
            }]
          }
        }));
        continue;
      }
      const message = String(call.args?.message || "").trim();
      if (!message) continue;
      setStatus("Checking that with Zed…", "thinking");
      appendTranscript("You", message);
      try {
        const answer = await submitToZedChat(message);
        socket?.send(JSON.stringify({
          toolResponse: {
            functionResponses: [{
              id: call.id,
              name: call.name,
              response: { result: String(answer || "Zed could not find an answer.") }
            }]
          }
        }));
      } catch (error) {
        socket?.send(JSON.stringify({
          toolResponse: {
            functionResponses: [{
              id: call.id,
              name: call.name,
              response: { error: error?.message || "Zed chat request failed." }
            }]
          }
        }));
      }
    }
  }

  function handleLiveMessage(event) {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      console.warn("Zed received an unreadable Live API event.");
      return;
    }

    if (message.setupComplete) {
      setupReady = true;
      setStatus("Listening… speak naturally", "listening");
      startMicrophoneStreaming();
      return;
    }

    if (message.error) {
      console.error("Zed Live API error:", message.error);
      setStatus(message.error.message || "The real-time voice service returned an error.", "error");
      return;
    }

    if (message.toolCall?.functionCalls?.length) {
      void handleToolCalls(message.toolCall.functionCalls);
    }

    const serverContent = message.serverContent;
    if (!serverContent) return;

    if (serverContent.interrupted) stopPlayback();

    if (serverContent.inputTranscription?.text) {
      inputText += serverContent.inputTranscription.text;
      setTranscript("You\n" + inputText.trim() + (outputText ? "\n\nZed\n" + outputText.trim() : ""));
    }

    if (serverContent.outputTranscription?.text) {
      outputText += serverContent.outputTranscription.text;
      setTranscript((inputText ? "You\n" + inputText.trim() + "\n\n" : "") + "Zed\n" + outputText.trim());
    }

    for (const part of serverContent.modelTurn?.parts || []) {
      const inline = part.inlineData || part.inline_data;
      if (inline?.data && String(inline.mimeType || inline.mime_type || "").startsWith("audio/")) {
        playPcm24k(inline.data);
      }
    }

    if (serverContent.turnComplete) {
      inputText = "";
      outputText = "";
      if (!activeSources.size) setStatus("Listening… your turn", "listening");
    }
  }

  async function openLiveSession(generation) {
    const user = window.zedVoiceGetUser?.();
    if (!user) throw new Error("Please sign in before starting voice chat.");
    const idToken = await user.getIdToken();
    if (!active || generation !== connectGeneration) return;

    const tokenController = new AbortController();
    const tokenTimeout = window.setTimeout(() => tokenController.abort(), 15000);
    let tokenResponse;
    try {
      tokenResponse = await fetch("/api/voice/token", {
        method: "POST",
        headers: { Authorization: "Bearer " + idToken },
        signal: tokenController.signal
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Zed's secure voice session request timed out. Please try again.");
      }
      throw new Error("Zed could not reach the voice session service. Check your connection and try again.");
    } finally {
      window.clearTimeout(tokenTimeout);
    }
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenData.ok || !tokenData.token) {
      throw new Error(tokenData.error || "Zed could not create a secure voice session.");
    }
    if (!active || generation !== connectGeneration) return;

    const url = LIVE_ENDPOINT + "?access_token=" + encodeURIComponent(tokenData.token);
    socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        socket.removeEventListener("open", onOpen);
        socket.removeEventListener("message", onMessage);
        socket.removeEventListener("close", onClose);
        socket.removeEventListener("error", onError);
        if (error) reject(error);
        else resolve();
      };
      const timeout = window.setTimeout(() => {
        finish(new Error("Zed's real-time voice setup timed out. Please close voice chat and try again."));
        try { socket.close(); } catch {}
      }, 20000);
      const onOpen = () => {
        try {
          socket.send(JSON.stringify({
            setup: {
              model: "models/" + tokenData.model,
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: "Aoede" }
                  }
                }
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              sessionResumption: {},
              tools: [{
                functionDeclarations: [{
                  name: "zed_chat",
                  description: "Send the user's spoken request through Zed's authenticated chat engine so it can use saved conversation context, web search, football data and enabled features. Use this for every substantive question or task. Only answer greetings and simple conversational small talk directly.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      message: { type: "STRING", description: "The user's complete spoken request, transcribed accurately." }
                    },
                    required: ["message"]
                  }
                }]
              }],
              systemInstruction: {
                parts: [{
                  text: "You are Zed, a warm, natural and attentive voice assistant. Speak like a helpful person in a relaxed conversation. Keep spoken replies concise and direct unless the user asks for detail. Use contractions naturally. Avoid robotic introductions, repetitive summaries, reading out formatting, or saying you are an AI. Answer accurately and admit uncertainty. Do not claim to be another assistant."
                }]
              }
            }
          }));
        } catch (error) {
          finish(new Error("Zed could not send the voice setup request: " + (error?.message || "unknown error")));
        }
      };
      const onMessage = async (event) => {
        let raw = "";
        let packet;
        try {
          // Browsers can expose WebSocket frames as strings, Blob, or ArrayBuffer.
          if (typeof event.data === "string") {
            raw = event.data;
          } else if (typeof Blob !== "undefined" && event.data instanceof Blob) {
            raw = await event.data.text();
          } else if (event.data instanceof ArrayBuffer) {
            raw = new TextDecoder().decode(event.data);
          } else if (ArrayBuffer.isView(event.data)) {
            raw = new TextDecoder().decode(event.data);
          } else {
            throw new Error("Unsupported WebSocket frame type: " + Object.prototype.toString.call(event.data));
          }
          packet = JSON.parse(raw);
        } catch (error) {
          const preview = String(raw || "").replace(/[\\r\\n\\t]+/g, " ").slice(0, 180);
          finish(new Error(
            "Zed could not read Gemini's voice setup frame" +
            (preview ? ": " + preview : ". The service returned a non-JSON frame.") +
            (error?.message ? " (" + error.message + ")" : "")
          ));
          return;
        }
        if (packet.setupComplete) {
          setupReady = true;
          setStatus("Listening… speak naturally", "listening");
          startMicrophoneStreaming();
          finish();
        } else if (packet.error) {
          const detail = packet.error.message || packet.error.status || JSON.stringify(packet.error);
          finish(new Error("Gemini rejected the real-time voice session: " + detail));
        } else if (packet.goAway) {
          finish(new Error("Gemini is closing the voice session before setup completed."));
        }
      };
      const onClose = (event) => {
        finish(new Error("The voice service closed before setup completed" +
          (event.code ? " (code " + event.code + ")" : "") +
          (event.reason ? ": " + event.reason : ". Please try again.")));
      };
      const onError = () => {
        finish(new Error("Could not connect to Gemini's real-time voice service. Check the connection and try again."));
      };
      socket.addEventListener("open", onOpen, { once: true });
      socket.addEventListener("message", onMessage);
      socket.addEventListener("close", onClose, { once: true });
      socket.addEventListener("error", onError, { once: true });
    });
    if (!active || generation !== connectGeneration) return;
    socket.onmessage = handleLiveMessage;
    socket.onclose = event => {
      setupReady = false;
      if (active) setStatus(event.reason || "Voice connection ended. Close and restart voice chat.", "error");
    };
    socket.onerror = () => {
      if (active) setStatus("The real-time voice connection was interrupted.", "error");
    };
  }

  async function start() {
    ensureScreen();
    if (active || connecting) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof window.AudioContext !== "function" && typeof window.webkitAudioContext !== "function") {
      voiceScreen.classList.add("is-active");
      document.body.classList.add("zed-voice-open");
      setStatus("This browser does not support real-time microphone audio. Please use Safari or Chrome.", "error");
      return;
    }

    active = true;
    connecting = true;
    muted = false;
    setupReady = false;
    inputText = "";
    outputText = "";
    connectGeneration++;
    const generation = connectGeneration;
    document.body.classList.add("zed-voice-open");
    voiceScreen.classList.add("is-active");
    voiceScreen.querySelector(".zed-voice-mute").setAttribute("aria-pressed", "false");
    voiceScreen.querySelector(".zed-voice-mute small").textContent = "Mute reply";
    setTranscript("Connecting to Zed…");
    setStatus("Starting secure voice connection…", "connecting");
    window.zedVoiceSetEnabled?.(true);
    updateButtons();

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContextClass();
      await audioContext.resume();
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });
      if (!active || generation !== connectGeneration) return;
      setStatus("Connecting to Zed Live…", "connecting");
      await openLiveSession(generation);
    } catch (error) {
      console.error("Zed real-time voice startup failed:", error);
      if (active && generation === connectGeneration) {
        setStatus(error?.message || "Voice could not start. Please try again.", "error");
        active = false;
        setupReady = false;
        if (socket) {
          const failedSocket = socket;
          socket = null;
          try { failedSocket.close(); } catch {}
        }
        window.zedVoiceSetEnabled?.(false);
        updateButtons();
      }
      await releaseAudioResources();
    } finally {
      connecting = false;
    }
  }

  async function releaseAudioResources() {
    if (micProcessor) {
      micProcessor.onaudioprocess = null;
      try { micProcessor.disconnect(); } catch {}
      micProcessor = null;
    }
    try { micSource?.disconnect(); } catch {}
    micSource = null;
    try { silentGain?.disconnect(); } catch {}
    silentGain = null;
    for (const source of activeSources) {
      try { source.stop(); } catch {}
      try { source.disconnect(); } catch {}
    }
    activeSources.clear();
    if (mediaStream) {
      for (const track of mediaStream.getTracks()) track.stop();
      mediaStream = null;
    }
    if (audioContext) {
      const context = audioContext;
      audioContext = null;
      try { await context.close(); } catch {}
    }
  }

  async function stop() {
    active = false;
    connecting = false;
    setupReady = false;
    connectGeneration++;
    if (socket) {
      const current = socket;
      socket = null;
      try { current.close(1000, "Voice session ended"); } catch {}
    }
    await releaseAudioResources();
    window.zedVoiceSetEnabled?.(false);
    voiceScreen?.classList.remove("is-active", "is-speaking", "is-listening", "is-thinking");
    document.body.classList.remove("zed-voice-open");
    setStatus("Voice conversation ended", "idle");
    updateButtons();
  }

  function toggleMute() {
    muted = !muted;
    const button = voiceScreen?.querySelector(".zed-voice-mute");
    if (button) {
      button.setAttribute("aria-pressed", String(muted));
      button.querySelector("small").textContent = muted ? "Unmute reply" : "Mute reply";
    }
    if (muted) stopPlayback();
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
        void toggle();
      }, true);
    }
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && active) void stop();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && active) setStatus("Voice is paused while this page is in the background.", "error");
    });
  }

  function toggle() {
    if (active) void stop();
    else void start();
  }

  window.ZedVoiceMode = { start, stop, toggle, get isActive() { return active; } };
  install();
})();
