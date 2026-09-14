import { WelcomeOrb } from "./welcome-orb.js";

const preferenceKey = "gaip-h5-avatar-version";

export class WelcomeAvatar {
  constructor(button, storage) {
    this.button = button;
    this.storage = storage;
    this.version = 2;
    try {
      this.version = storage.getItem(preferenceKey) === "1" ? 1 : 2;
    } catch {}
    this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.visible = true;
    this.sync = this.sync.bind(this);
    this.toggle = () => {
      this.version = this.version === 1 ? 2 : 1;
      try {
        storage.setItem(preferenceKey, String(this.version));
      } catch {}
      this.render();
    };
    button.addEventListener("click", this.toggle);
    document.addEventListener("visibilitychange", this.sync);
    window.addEventListener("pagehide", this.sync);
    window.addEventListener("pageshow", this.sync);
    this.motion.addEventListener("change", this.sync);
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.sync();
    });
    this.observer.observe(button);
    this.render();
  }

  releaseMedia() {
    this.orb?.destroy();
    this.orb = null;
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute("src");
      this.video.load();
      this.video = null;
    }
  }

  render() {
    this.releaseMedia();
    const v1 = this.version === 1;
    this.button.setAttribute(
      "aria-label",
      `当前 V${this.version} ${v1 ? "渐变机器人" : "机器人猫"}，点击切换 V${v1 ? 2 : 1}`,
    );
    this.button.title = `点击切换 V${v1 ? 2 : 1}`;
    this.button.innerHTML = v1
      ? '<span class="welcome-orb" aria-hidden="true"><img src="./assets/orb-poster.png" alt=""><span class="welcome-orb-canvas"></span><img class="avatar-robot" src="./assets/avatar-robot.svg" alt=""></span>'
      : '<span class="welcome-orb" aria-hidden="true"><img class="avatar-poster-v2" src="./assets/avatar-v2.png" alt=""><video class="avatar-video" src="./assets/avatar-v2.mp4" poster="./assets/avatar-v2.png" muted loop playsinline preload="metadata"></video></span>';
    if (v1) {
      this.orb = new WelcomeOrb(
        this.button.querySelector(".welcome-orb-canvas"),
        "./assets/orb-texture.webp",
      );
    } else {
      this.video = this.button.querySelector("video");
      this.video.muted = true;
      this.sync();
    }
  }

  sync(event) {
    if (!this.video) return;
    const staticFrame = this.motion.matches;
    this.video.hidden = staticFrame;
    if (
      !staticFrame &&
      !document.hidden &&
      this.visible &&
      event?.type !== "pagehide"
    ) {
      this.video.play().catch(() => {});
    } else this.video.pause();
  }

  destroy() {
    this.releaseMedia();
    this.observer.disconnect();
    this.button.removeEventListener("click", this.toggle);
    document.removeEventListener("visibilitychange", this.sync);
    window.removeEventListener("pagehide", this.sync);
    window.removeEventListener("pageshow", this.sync);
    this.motion.removeEventListener("change", this.sync);
  }
}
