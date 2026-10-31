const VoiceMode = (() => {
  let session = null;
  let stream = null;
  let audioContext = null;
  let sourceNode = null;
  let processorNode = null;
  let active = false;
  let starting = false;
  let nextPlaybackTime = 0;
  let playbackSources = new Set();
  let overlay = null;
  let statusNode = null;
  let userCaption = null;
  let zedCaption = null;
  let transcriptUser = "";
  let transcriptZed = "";
  let closeRequested = false;

  const setStatus = (label, state = "listening") => {
    if (!statusNode) return;
    statusNode.textContent = label;
    statusNode.dataset.state = state;
    const retry = overlay?.querySelector(".zed-voice-retry");
    if (retry) retry.hidden = state !== "error";
  };

  const appendCaption = (node, text) => {
    if (node && text) node.textContent = text;
  };

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("section");
    overlay.className = "zed-voice-overlay";
    overlay.id = "zedVoiceOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Live voice conversation with Zed");
    overlay.innerHTML = `
      <div class="zed-voice-top">
        <div class="zed-voice-brand"><span class="zed-voice-mark">Z</span><span>Zed voice</span></div>
        <button class="zed-voice-close" type="button" aria-label="End voice conversation">×</button>
      </div>
      <div class="zed-voice-center">
        <div class="zed-voice-orb" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="zed-voice-status" id="zedVoiceStatus" data-state="connecting" aria-live="polite">Connecting…</div>
        <p class="zed-voice-hint">Speak naturally. You can interrupt Zed at any time.</p>
      </div>
      <div class="zed-voice-captions" aria-live="polite" aria-relevant="additions text">
        <div class="zed-voice-caption"><span>You</span><p id="zedVoiceUserCaption">Your words will appear here.</p></div>
        <div class="zed-voice-caption"><span>Zed</span><p id="zedVoiceZedCaption">Zed's replies will appear here.</p></div>
      </div>
      <div class="zed-voice-actions">
        <button class="zed-voice-retry" type="button" hidden>Try again</button>
        <button class="zed-voice-mute" type="button" aria-pressed="false">Mute microphone</button>
        <button class="zed-voice-end" type="button">End conversation</button>
      </div>
    `;
    document.body.appendChild(overlay);
    statusNode = overlay.querySelector("#zedVoiceStatus");
    userCaption = overlay.querySelector("#zedVoiceUserCaption");
    zedCaption = overlay.querySelector("#zedVoiceZedCaption");
    overlay.querySelector(".zed-voice-close").addEventListener("click", stop);
    overlay.querySelector(".zed-voice-end").addEventListener("click", stop);
    overlay.querySelector(".zed-voice-retry").addEventListener("click", () => { cleanup().then(start); });
    overlay.querySelector(".zed-voice-mute").addEventListener("click", toggleMute);
    return overlay;
  }

  function toggleMute() {
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    const button = overlay.querySelector(".zed-voice-mute");
    button.textContent = track.enabled ? "Mute microphone" : "Unmute microphone";
    button.setAttribute("aria-pressed", String(!track.enabled));
    setStatus(track.enabled ? "Listening" : "Microphone muted", track.enabled ? "listening" : "muted");
  }

  function base64FromBytes(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function bytesFromBase64(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function resampleTo16k(floatSamples, inputRate) {
    if (inputRate === 16000) return floatSamples;
    const ratio = inputRate / 16000;
    const outputLength = Math.floor(floatSamples.length / ratio);
    const output = new Int16Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
      const position = i * ratio;
      const left = Math.floor(position);
      const right = Math.min(left + 1, floatSamples.length - 1);
      const fraction = position - left;
      const sample = floatSamples[left] * (1 - fraction) + floatSamples[right] * fraction;
      const clamped = Math.max(-1, Math.min(1, sample));
      output[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
    }
    return output;
  }

  async function setupMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone access is unavailable. Open Zed in a supported browser over HTTPS.");
    }
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false
    });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.resume();
    sourceNode = audioContext.createMediaStreamSource(stream);
    processorNode = audioContext.createScriptProcessor(4096, 1, 1);
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    processorNode.onaudioprocess = event => {
      if (!active || !session || !stream?.getAudioTracks()[0]?.enabled) return;
      const samples = resampleTo16k(event.inputBuffer.getChannelData(0), audioContext.sampleRate);
      if (!samples.length) return;
      if (session) {
        try {
          session.sendRealtimeInput({
            audio: {
              data: base64FromBytes(new Uint8Array(samples.buffer)),
              mimeType: "audio/pcm;rate=16000"
            }
          });
        } catch (error) {
          console.warn("Zed voice audio send failed:", error);
          setStatus("Connection interrupted", "error");
        }
      }
    };
    sourceNode.connect(processorNode);
    processorNode.connect(silentGain);
    silentGain.connect(audioContext.destination);
  }

  function playAudio(base64) {
    if (!audioContext || !base64) return;
    const bytes = bytesFromBase64(base64);
    const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const buffer = audioContext.createBuffer(1, samples.length, 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 32768;
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    const startAt = Math.max(audioContext.currentTime + 0.025, nextPlaybackTime);
    source.start(startAt);
    nextPlaybackTime = startAt + buffer.duration;
    playbackSources.add(source);
    source.onended = () => playbackSources.delete(source);
  }

  function stopPlayback() {
    for (const source of playbackSources) {
      try { source.stop(); } catch {}
    }
    playbackSources.clear();
    nextPlaybackTime = audioContext?.currentTime || 0;
  }

  function handleMessage(message) {
    const content = message?.serverContent;
    if (!content) return;
    if (content.interrupted) {
      stopPlayback();
      setStatus("Listening", "listening");
    }
    const inputText = content.inputTranscription?.text;
    if (inputText) {
      transcriptUser += inputText;
      appendCaption(userCaption, transcriptUser);
      setStatus("Listening", "listening");
    }
    const outputText = content.outputTranscription?.text;
    if (outputText) {
      transcriptZed += outputText;
      appendCaption(zedCaption, transcriptZed);
      setStatus("Zed is speaking", "speaking");
    }
    const parts = content.modelTurn?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("audio/")) {
        playAudio(part.inlineData.data);
        setStatus("Zed is speaking", "speaking");
      }
      if (part.text) {
        transcriptZed += part.text;
        appendCaption(zedCaption, transcriptZed);
      }
    }
    if (content.turnComplete) setStatus("Listening", "listening");
  }

  async function start() {
    if (active || starting) return;
    starting = true;
    closeRequested = false;
    ensureOverlay().classList.add("open");
    document.body.classList.add("zed-voice-open");
    setStatus("Preparing secure connection…", "connecting");
    try {
      if (!window.isSecureContext) throw new Error("Voice conversations require a secure HTTPS connection.");
      const user = window.zedVoiceGetUser?.();
      if (!user) throw new Error("Please sign in before starting a voice conversation.");
      setStatus("Requesting microphone access…", "connecting");
      await setupMicrophone();
      if (closeRequested) { await cleanup(); return; }
      const idToken = await user.getIdToken();
      if (closeRequested) { await cleanup(); return; }
      const tokenResponse = await fetch("/api/voice/token", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        cache: "no-store"
      });
      const tokenData = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !tokenData.token) throw new Error(tokenData.error || "Could not create a secure voice session.");
      if (closeRequested) { await cleanup(); return; }

      setStatus("Connecting to Zed…", "connecting");
      const { GoogleGenAI } = await import("https://esm.sh/@google/genai@2.3.0");
      if (closeRequested) { await cleanup(); return; }
      const ai = new GoogleGenAI({ apiKey: tokenData.token });
      session = await ai.live.connect({
        model: tokenData.model || "gemini-3.8-live",
        config: {
          responseModalities: ["AUDIO"],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          sessionResumption: {}
        },
        callbacks: {
          onopen: () => setStatus("Starting live audio…", "connecting"),
          onmessage: handleMessage,
          onerror: event => {
            console.error("Zed voice connection error:", event?.message || event);
            setStatus("Connection interrupted", "error");
          },
          onclose: event => {
            if (active && !closeRequested) {
              setStatus("Connection closed. You can try again.", "error");
              void cleanup();
            }
            console.info("Zed voice connection closed:", event?.reason || "");
          }
        }
      });
      if (closeRequested) { await cleanup(); return; }
      active = true;
      setStatus("Listening", "listening");
      transcriptUser = "";
      transcriptZed = "";
      appendCaption(userCaption, "I'm listening…");
      appendCaption(zedCaption, "Zed is ready.");
    } catch (error) {
      console.error("Could not start Zed voice:", error);
      setStatus(error.message || "Voice could not start", "error");
      await cleanup();
    } finally {
      starting = false;
    }
  }

  async function cleanup() {
    active = false;
    try { processorNode?.disconnect(); } catch {}
    try { sourceNode?.disconnect(); } catch {}
    processorNode = null;
    sourceNode = null;
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    stopPlayback();
    try { session?.close(); } catch {}
    session = null;
    if (audioContext) {
      try { await audioContext.close(); } catch {}
    }
    audioContext = null;
    document.body.classList.remove("zed-voice-open");
  }

  async function stop() {
    closeRequested = true;
    setStatus("Ending conversation…", "connecting");
    await cleanup();
    overlay?.classList.remove("open");
  }

  function install() {
    const micButton = document.getElementById("voiceInputBtn");
    if (micButton) {
      micButton.title = "Start a live voice conversation";
      micButton.setAttribute("aria-label", "Start a live voice conversation");
      micButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        start();
      }, true);
    }
    const speechButton = document.getElementById("voiceModeBtn");
    if (speechButton) {
      speechButton.title = "Live voice conversation";
      speechButton.setAttribute("aria-label", "Start a live voice conversation");
      speechButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        start();
      }, true);
    }
  }

  return { install, start, stop };
})();

VoiceMode.install();
