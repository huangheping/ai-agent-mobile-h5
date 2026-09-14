export function formatDuration(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
export function gestureOutcome({ duration, dy }) {
  return dy <= -72 ? "cancel" : duration >= 600 ? "finish" : "short";
}

export function initVoice({ canOpen, onConfirm, notify, demoMode = true }) {
  const $ = (id) => document.getElementById(id);
  const dialog = $("voice-feedback"),
    scene = $("voice-scene"),
    control = $("voice-button");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let mode = "idle",
    demo = demoMode,
    token = 0,
    stream,
    recorder,
    context,
    analyser,
    buffer;
  let raf,
    timer,
    started = 0,
    elapsed = 0,
    gesture = null,
    drag = 0,
    position = 0,
    velocity = 0,
    lastFrame = 0,
    energy = 0;
  const bars = Array.from({ length: 37 }, () => {
    const bar = document.createElement("i");
    $("voice-wave").append(bar);
    return bar;
  });

  function state(next) {
    mode = next;
    scene.dataset.state = next;
    $("voice-demo-label").hidden = !demo;
    dialog.hidden = next === "idle";
    document
      .getElementById("app")
      .classList.toggle("voice-active", !["idle", "error"].includes(next));
    control.classList.toggle(
      "holding",
      ["recording", "permission"].includes(next),
    );
    control.disabled = next === "processing";
    const label =
      next === "recording"
        ? "松开转文字"
        : next === "permission"
          ? "等待麦克风…"
          : next === "processing"
            ? "正在转文字…"
            : "长按说话";
    $("voice-main-label").textContent = label;
    control.setAttribute("aria-label", label);
    control.querySelector("img").src = "./assets/mic.svg";
  }
  function text(caption, title, hint, status) {
    $("voice-caption").textContent = caption;
    $("voice-title").textContent = title;
    $("voice-hint").textContent = hint;
    $("voice-status").textContent = status;
  }
  function stopTracks() {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    if (context) {
      context.close().catch(() => {});
      context = null;
    }
    analyser = null;
  }
  function cleanup() {
    token++;
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    if (recorder?.state === "recording") recorder.stop();
    recorder = null;
    stopTracks();
    releaseCapture();
    gesture = null;
    drag = position = velocity = 0;
    $("voice-visual").style.transform = "";
    scene.style.setProperty("--cancel-progress", 0);
    scene.classList.remove("cancel-ready");
  }

  function releaseCapture() {
    if (!gesture) return;
    try {
      control.releasePointerCapture(gesture.id);
    } catch {
      // ignore if pointer was never captured
    }
  }

  function abortIfPending() {
    if (!gesture) return;
    reset("语音输入已中断，本段内容已取消");
  }
  function reset(message) {
    cleanup();
    elapsed = energy = 0;
    $("voice-time").textContent = "00:00";
    scene.hidden = false;

    state("idle");
    text(
      "语音转文字",
      "想说的，按住说。",
      "松开转文字，上移后松开取消",
      message || "识别后可以修改，确认后再发送",
    );
    bars.forEach(
      (b, i) =>
        (b.style.transform = `scaleY(${0.1 + 0.1 * Math.pow(Math.sin(i * 0.8), 2)})`),
    );
    if (message) notify(message);
  }
  function paint(timestamp) {
    if (mode !== "recording") return;
    elapsed = Math.min(60, (performance.now() - started) / 1000);
    $("voice-time").textContent = formatDuration(elapsed);
    let level = 0.035;
    if (demo)
      level =
        0.16 +
        0.48 * Math.sin(timestamp / 540) ** 2 +
        0.2 * Math.sin(timestamp / 180) ** 2;
    else if (analyser) {
      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (const sample of buffer) sum += ((sample - 128) / 128) ** 2;
      level = Math.min(1, Math.sqrt(sum / buffer.length) * 5);
    }
    energy += (level - energy) * 0.18;
    bars.forEach((bar, i) => {
      const envelope = 1 - Math.abs(i - 18) / 25;
      const wave = reduced.matches
        ? 0.65
        : 0.22 +
          0.78 *
            Math.abs(
              Math.sin(i * 0.71 + timestamp / 155) *
                Math.cos(i * 0.24 - timestamp / 510),
            );
      bar.style.transform = `scaleY(${0.1 + envelope * energy * wave * 0.9})`;
    });
    const dt = Math.min(0.032, (timestamp - lastFrame) / 1000 || 0.016);
    lastFrame = timestamp;
    velocity += (250 * (drag - position) - 30 * velocity) * dt;
    position += velocity * dt;
    $("voice-visual").style.transform = reduced.matches
      ? ""
      : `translateY(${position}px)`;
    scene.style.setProperty("--voice-energy", energy.toFixed(3));
    if (elapsed >= 60) {
      if (scene.classList.contains("cancel-ready"))
        reset("已取消，这段语音不会转写或发送");
      else finish();
      return;
    }
    if (elapsed >= 50 && !scene.classList.contains("cancel-ready"))
      $("voice-status").textContent =
        `还可以说 ${Math.ceil(60 - elapsed)} 秒，松开即可转文字`;
    raf = requestAnimationFrame(paint);
  }
  function begin() {
    state("recording");
    started = lastFrame = performance.now();
    text(
      demo ? "语音反馈演示" : "正在聆听",
      "我在听，慢慢说。",
      "松开后，为你转换成文字",
      "上移取消 · 移回原位继续说话",
    );
    raf = requestAnimationFrame(paint);
  }
  async function start() {
    if (!["idle", "error"].includes(mode)) return;
    const attempt = ++token;
    if (demo) {
      begin();
      return;
    }
    state("permission");
    text(
      "准备接收语音",
      "正在连接麦克风",
      "首次使用请允许麦克风权限",
      "如果已经松开，授权后请重新按住说话",
    );
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      reset();
      state("error");
      text(
        "语音暂不可用",
        "先用文字继续吧",
        "请在支持录音的 HTTPS 环境使用",
        "可以先在输入框中打字继续",
      );
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (attempt !== token) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = media;
      if (!gesture) {
        stopTracks();
        reset("麦克风已准备好，请重新按住说话");
        return;
      }
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
        (t) => MediaRecorder.isTypeSupported(t),
      );
      recorder = mime
        ? new MediaRecorder(media, { mimeType: mime })
        : new MediaRecorder(media);
      const recording = recorder,
        chunks = [];
      recording.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recording.onstop = () => {
        if (attempt !== token) return;
        stopTracks();
        const blob = new Blob(chunks, { type: recording.mimeType });
        if (!blob.size) {
          reset("没有采集到声音，请重新按住说话");
          state("error");
          return;
        }
        // ASR integration boundary. Never present demo text as an actual transcript.
        // Captured audio is not uploaded or persisted by this prototype.
        review(false);
      };
      recording.onerror = () => {
        reset("语音输入已中断，请重试或使用文字");
        state("error");
      };
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        context = new Audio();
        await context.resume();
        if (attempt !== token) {
          stopTracks();
          return;
        }
        if (!gesture) {
          stopTracks();
          reset("麦克风已准备好，请重新按住说话");
          return;
        }
        analyser = context.createAnalyser();
        analyser.fftSize = 256;
        buffer = new Uint8Array(analyser.fftSize);
        context.createMediaStreamSource(media).connect(analyser);
      } catch {
        analyser = null;
      }
      if (attempt !== token) return;
      if (!gesture) {
        stopTracks();
        reset("麦克风已准备好，请重新按住说话");
        return;
      }
      recording.start(250);
      begin();
    } catch (error) {
      if (attempt !== token) return;
      stopTracks();
      gesture = null;
      state("error");
      text(
        "未能开始语音输入",
        error.name === "NotAllowedError" ? "麦克风还未开启" : "麦克风暂不可用",
        error.name === "NotAllowedError"
          ? "请允许麦克风权限后重新按住说话"
          : "检查麦克风是否被占用，然后重试",
        "可以先在输入框中打字继续",
      );
    }
  }
  function finish() {
    if (mode !== "recording") return;
    elapsed = Math.min(60, (performance.now() - started) / 1000);
    cancelAnimationFrame(raf);
    gesture = null;
    drag = 0;
    scene.classList.remove("cancel-ready");
    scene.style.setProperty("--cancel-progress", 0);
    $("voice-visual").style.transform = "";
    if (elapsed < 0.6) {
      reset("说话时间太短，请按住多说一点");
      return;
    }
    state("processing");
    text(
      demo ? "转写流程演示" : "语音采集完成",
      demo ? "正在转换成文字…" : "正在准备转写…",
      "转换后可修改，确认后再发送",
      demo
        ? "正在演示转换过程，不代表实际识别"
        : "语音仅在当前页面处理，不上传",
    );
    if (demo) {
      const attempt = token;
      timer = setTimeout(() => {
        if (attempt === token) review(true);
      }, 850);
    } else if (recorder?.state === "recording") {
      recorder.stop();
      stopTracks();
    }
  }
  function review(isDemo) {
    reset();
    if (isDemo) {
      onConfirm(
        "【语音演示】帮我对比三份保障方案，重点看保障范围、年度预算和需要补充的资料。",
      );
    } else {
      notify("已结束采集；语音转写服务尚未接入，请先使用文字输入。");
    }
  }
  function press(id, y) {
    if (gesture || !["idle", "error"].includes(mode)) return;
    if (!canOpen()) {
      notify("请先等待回答完成，或停止生成。");
      return;
    }
    gesture = { id, y, dy: 0, time: performance.now() };
    start();
  }
  function move(id, y) {
    if (!gesture || gesture.id !== id) return;
    gesture.dy = y - gesture.y;
    if (mode !== "recording") return;
    const progress = Math.min(1, Math.max(0, -gesture.dy / 72));
    scene.style.setProperty("--cancel-progress", progress);
    scene.classList.toggle("cancel-ready", progress >= 1);
    drag = -Math.min(100, Math.max(0, -gesture.dy)) * 0.22;
    $("voice-caption").textContent =
      progress >= 1 ? "松开即可取消" : demo ? "语音反馈演示" : "正在聆听";
    $("voice-title").textContent =
      progress >= 1 ? "松开，取消这段话。" : "我在听，慢慢说。";
    $("voice-main-label").textContent =
      progress >= 1 ? "松开取消" : "松开转文字";
    control.setAttribute(
      "aria-label",
      progress >= 1 ? "松开取消" : "松开转文字",
    );
    $("voice-hint").textContent =
      progress >= 1 ? "松开后，这段语音不会转写" : "松开后，为你转换成文字";
    $("voice-status").textContent =
      progress >= 1 ? "移回原位，还可以继续说话" : "上移取消 · 松开后转文字";
  }
  function release(id) {
    if (!gesture || gesture.id !== id) return;
    releaseCapture();
    const outcome = gestureOutcome({
      duration: performance.now() - gesture.time,
      dy: gesture.dy,
    });
    gesture = null;
    if (mode === "permission") {
      reset(
        outcome === "cancel" ? "已取消语音输入" : "授权完成后，请重新按住说话",
      );
      return;
    }
    if (mode !== "recording") {
      if (mode === "error") reset($("voice-hint").textContent);
      return;
    }
    if (outcome === "cancel") reset("已取消，这段语音不会转写或发送");
    else if (outcome === "short")
      reset("请长按语音按钮说话，松开即转文字");
    else finish();
  }

  control.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.isPrimary === false || gesture) return;
    event.preventDefault();
    try {
      control.setPointerCapture(event.pointerId);
    } catch {}
    press(event.pointerId, event.clientY);
  });
  control.addEventListener("pointermove", (event) =>
    move(event.pointerId, event.clientY),
  );
  control.addEventListener("pointerup", (event) => release(event.pointerId));
  document.addEventListener("pointerup", (event) => {
    if (gesture && gesture.id === event.pointerId) release(event.pointerId);
  });
  control.addEventListener("pointercancel", () => {
    if (gesture) reset("语音输入已中断，本段内容已取消");
  });
  document.addEventListener("pointercancel", abortIfPending);
  control.addEventListener("contextmenu", (event) => event.preventDefault());
  control.addEventListener("keydown", (event) => {
    if ([" ", "Enter"].includes(event.key) && !event.repeat) {
      event.preventDefault();
      press("keyboard", 0);
    }
    if (event.key === "Escape") reset("已取消语音输入");
  });
  control.addEventListener("keyup", (event) => {
    if ([" ", "Enter"].includes(event.key)) {
      event.preventDefault();
      release("keyboard");
    }
  });
  control.addEventListener("click", (event) => {
    event.preventDefault();
  });
  document.addEventListener("touchend", (event) => {
    if (!gesture) return;
    if (!event.target || !(event.target instanceof HTMLElement)) return;
    if (event.target.closest("button") && event.target.closest("button").id === "voice-button") return;
    abortIfPending();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && ["recording", "permission"].includes(mode))
      reset("页面切到后台，语音输入已取消");
  });
  window.addEventListener("pagehide", () => reset());
  reset();
}
