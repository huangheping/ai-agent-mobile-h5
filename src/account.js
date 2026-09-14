export function installGuideFor({ userAgent = "", platform = "", maxTouchPoints = 0 } = {}) {
  const apple = /iPhone|iPad|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
  if (/MicroMessenger|wxwork/i.test(userAgent)) {
    return {
      title: "先在浏览器打开",
      intro: "在浏览器中添加，之后可从手机桌面直接进入。",
      steps: ["点击右上角菜单，选择在浏览器打开。", `打开后${apple ? "点击分享，选择添加到主屏幕。" : "在浏览器菜单中选择添加到主屏幕或安装应用。"}`, "如果没有外部打开选项，可复制链接到浏览器。"],
    };
  }
  if (apple) return {
    title: "添加到主屏幕",
    intro: "用 Safari 打开此页面，按下面步骤添加。",
    steps: ["点击浏览器的分享按钮。", "选择添加到主屏幕。", "确认名称后点击添加，下次从桌面图标进入。"],
  };
  if (/Android/i.test(userAgent)) return {
    title: "添加到桌面",
    intro: "菜单名称可能因浏览器版本不同而有所区别。",
    steps: ["点击浏览器右上角菜单。", "选择添加到主屏幕、添加到桌面或安装应用。", "按系统提示确认添加；没有该选项时可换用 Chrome。"],
  };
  return {
    title: "在手机上添加",
    intro: "将此链接发到手机，用手机浏览器打开。",
    steps: ["iPhone：在 Safari 的分享菜单中添加到主屏幕。", "安卓：在浏览器菜单中查找添加到主屏幕或安装应用。"],
  };
}

export function initAccountMenu() {
  const $ = (id) => document.getElementById(id);
  const drawer = $("history-dialog"), root = $("drawer-account"), panel = $("account-popover"), trigger = $("account-trigger");
  let deferredPrompt = null, installed = false;
  const standalone = matchMedia("(display-mode: standalone)");
  function updateInstall() {
    $("account-install").hidden = installed || standalone.matches || window.navigator.standalone === true;
  }
  function viewGuide(show) {
    $("account-overview").hidden = show;
    $("account-install-guide").hidden = !show;
  }
  function close(restoreFocus = false) {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger.focus({ preventScroll: true });
  }
  trigger.addEventListener("click", () => {
    if (!panel.hidden) return close();
    viewGuide(false);
    $("account-note").hidden = true;
    updateInstall();
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    ($("account-install").hidden ? $("account-logout") : $("account-install")).focus({ preventScroll: true });
  });
  document.addEventListener("pointerdown", (event) => {
    if (!root.contains(event.target)) close();
  });
  // Escape first dismisses the small popup, then the surrounding history drawer.
  drawer.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  });
  drawer.addEventListener("close", () => close());
  $("account-back").onclick = () => { viewGuide(false); $("account-install").focus(); };
  $("account-logout").onclick = () => {
    $("account-note").textContent = "当前为演示账号，尚未接入登录服务。";
    $("account-note").hidden = false;
  };
  $("account-install").onclick = () => {
    const guide = installGuideFor(navigator);
    $("install-guide-title").textContent = guide.title;
    $("install-guide-intro").textContent = guide.intro;
    $("install-guide-steps").replaceChildren(...guide.steps.map((text) => {
      const li = document.createElement("li"); li.textContent = text; return li;
    }));
    $("install-guide-status").hidden = true;
    $("install-guide-action").textContent = deferredPrompt ? "添加到桌面" : "复制链接";
    viewGuide(true);
    $("account-back").focus({ preventScroll: true });
  };
  $("install-guide-action").onclick = async () => {
    const action = $("install-guide-action"), status = $("install-guide-status");
    action.disabled = true;
    try {
      if (deferredPrompt) {
        const event = deferredPrompt; deferredPrompt = null;
        await event.prompt();
        const result = await event.userChoice;
        if (result.outcome === "accepted") {
          $("account-install").hidden = true; close(true);
        } else {
          status.textContent = "已取消添加，可稍后从浏览器菜单操作。"; status.hidden = false;
        }
        action.textContent = "复制链接";
      } else {
        const url = new URL(location.href); url.search = ""; url.hash = "";
        await navigator.clipboard.writeText(url.href);
        status.textContent = "链接已复制"; status.hidden = false;
      }
    } catch {
      status.textContent = "请从浏览器地址栏复制链接，或按上方步骤操作。"; status.hidden = false;
    } finally { action.disabled = false; }
  };
  window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); deferredPrompt = event; });
  window.addEventListener("appinstalled", () => { deferredPrompt = null; installed = true; $("account-install").hidden = true; close(); });
  standalone.addEventListener?.("change", updateInstall);
  updateInstall();
}
