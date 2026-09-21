// Only known local demo IDs are accepted. Chat history never supplies file URLs or HTML.
export const demoDocuments = [
  {
    id: "demo-pdf",
    type: "PDF",
    icon: "file-pdf.svg",
    name: "家庭保障方案沟通稿.pdf",
    file: "family-plan.pdf",
    sizeBytes: 130482,
  },
  {
    id: "demo-word",
    type: "Word",
    icon: "file-word.svg",
    name: "家庭保障方案沟通稿与待补充资料清单.docx",
    file: "family-plan.docx",
    sizeBytes: 38955,
  },
  {
    id: "demo-excel",
    type: "Excel",
    icon: "file-excel.svg",
    name: "家庭保障方案对比与资料清单.xlsx",
    file: "plan-comparison.xlsx",
    sizeBytes: 6574,
  },
];
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const url = (file) => new URL("../demo-files/" + file, import.meta.url).href;
function documentMeta(doc) {
  if (!Number.isFinite(doc.sizeBytes) || doc.sizeBytes < 0) return doc.type;
  const unit = doc.sizeBytes >= 1024 * 1024 ? "MB" : doc.sizeBytes >= 1024 ? "KB" : "B";
  const divisor = unit === "MB" ? 1024 * 1024 : unit === "KB" ? 1024 : 1;
  const size = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(doc.sizeBytes / divisor);
  return `${doc.type} · ${size} ${unit}`;
}
export function documentCardsHtml(message) {
  const ids = Array.isArray(message.documents) ? message.documents : [];
  const docs = demoDocuments.filter((doc) => ids.includes(doc.id));
  if (!docs.length) return "";
  return `<div class="reply-documents" aria-label="回复附件">${docs.map((doc) => `<button class="reply-document" data-preview-document="${doc.id}" aria-label="预览 ${escape(doc.name)}"><span class="document-type"><img src="./assets/${doc.icon}" alt="" draggable="false"></span><span class="document-copy"><strong>${escape(doc.name)}</strong><small>${documentMeta(doc)}</small></span><img class="document-arrow" src="./assets/chevron-left.svg" alt=""></button>`).join("")}</div>`;
}

export function initDocumentPreview() {
  const dialog = document.getElementById("document-dialog");
  const body = document.getElementById("document-preview-body");
  const toolbar = document.getElementById("document-preview-tools");
  const previewError = document.getElementById("document-preview-error");
  const nameToggle = document.getElementById("document-name-toggle");
  const nameText = document.getElementById("document-name-text");
  let request = 0,
    controller,
    active,
    opener,
    sheets = [],
    zoom = 1;
  const cache = new Map();
  const tableHtml = (sheet) =>
    `<table class="document-sheet"><caption class="sr-only">${escape(sheet.name)}，演示数据</caption><thead><tr>${sheet.columns.map((col) => `<th scope="col">${escape(col)}</th>`).join("")}</tr></thead><tbody>${sheet.rows.map((row) => `<tr>${row.map((cell, i) => `<${i ? "td" : 'th scope="row"'}>${escape(cell)}</${i ? "td" : "th"}>`).join("")}</tr>`).join("")}</tbody></table>`;
  function showSheet(index) {
    const sheet = sheets[index];
    if (!sheet) return;
    body.innerHTML = `<div class="document-sheet-scroll" tabindex="0" role="region" aria-label="${escape(sheet.name)}，可上下左右滑动">${tableHtml(sheet)}</div>`;
    toolbar.innerHTML = `<div class="document-sheet-tabs" aria-label="工作表">${sheets.map((s, i) => `<button data-sheet-index="${i}" aria-pressed="${i === index}">${escape(s.name)}</button>`).join("")}</div>`;
  }
  function setZoom() {
    const pages = body.querySelector(".document-pages");
    if (!pages) return;
    pages.style.width = `${zoom * 100}%`;
    toolbar.innerHTML = `<span>共 ${pages.children.length} 页</span><div><button data-zoom="out" aria-label="缩小" ${zoom === 1 ? "disabled" : ""}>−</button><button data-zoom="reset" aria-label="恢复适合宽度">${zoom === 1 ? "适合宽度" : `${Math.round(zoom * 100)}%`}</button><button data-zoom="in" aria-label="放大" ${zoom === 2 ? "disabled" : ""}>＋</button></div>`;
  }
  async function open(id, button) {
    const doc = demoDocuments.find((d) => d.id === id);
    if (!doc) return;
    active = doc;
    if (button) opener = button;
    controller?.abort();
    controller = new AbortController();
    const attempt = ++request;
    zoom = 1;
    nameText.textContent = doc.name;
    document.getElementById("document-preview-title").setAttribute("aria-label", doc.name);
    nameToggle.title = doc.name;
    nameToggle.setAttribute("aria-expanded", "false");
    nameToggle.setAttribute("aria-label", `展开完整文件名：${doc.name}`);
    nameText.scrollTop = 0;
    const download = document.getElementById("document-download");
    download.href = url(doc.file);
    download.download = doc.name;
    previewError.hidden = true;
    previewError.textContent = "";
    body.className = `document-preview-body ${doc.id}`;
    body.innerHTML =
      '<div class="document-loading" role="status"><i class="spinner"></i>正在打开文件…</div>';
    body.setAttribute("aria-busy", "true");
    toolbar.innerHTML = "";
    toolbar.hidden = true;
    if (!dialog.open) dialog.showModal();
    try {
      const resource =
        doc.id === "demo-pdf"
          ? "pdf-preview.json"
          : doc.id === "demo-word"
            ? "word-preview.json"
            : "excel-preview.json";
      let data = cache.get(resource);
      if (!data) {
        const response = await fetch(url(resource), {
          signal: controller.signal,
        });
        if (!response.ok) throw Error("Preview unavailable");
        data = await response.json();
        cache.set(resource, data);
      }
      if (attempt !== request || !dialog.open) return;
      if (doc.id === "demo-pdf") {
        body.innerHTML = `<div class="document-pages">${data.pages.map((page, i) => `<figure><img src="${url(page.image)}" width="${page.width}" height="${page.height}" alt="${escape(doc.name)} 第 ${i + 1} 页" ${i ? 'loading="lazy"' : ""} draggable="false"><figcaption>${i + 1} / ${data.pages.length}</figcaption></figure>`).join("")}</div>`;
        body.querySelectorAll("img").forEach((img) =>
          img.addEventListener("error", () => {
            if (attempt === request) {
              previewError.textContent = "部分页面未加载，请重新打开或下载原文件";
              previewError.hidden = false;
            }
          }),
        );
        toolbar.hidden = false;
        setZoom();
      } else if (doc.id === "demo-word") {
        body.innerHTML = `<article class="document-reading">${data
          .map((block) => {
            const tag = ["h1", "h2"].includes(block.kind) ? block.kind : "p";
            return `<${tag}>${escape(block.text)}</${tag}>`;
          })
          .join("")}</article>`;
      } else {
        sheets = data;
        toolbar.hidden = false;
        showSheet(0);
      }
      body.scrollTop = 0;
      body.scrollLeft = 0;
    } catch (error) {
      if (error.name === "AbortError" || attempt !== request) return;
      body.innerHTML =
        '<div class="document-error"><strong>暂时无法预览</strong><p>可以重试，或下载原文件查看。</p><button id="document-retry">重新加载</button></div>';
    } finally {
      if (attempt === request) body.removeAttribute("aria-busy");
    }
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-preview-document]");
    if (button) open(button.dataset.previewDocument, button);
  });
  nameToggle.addEventListener("click", () => {
    const expanded = nameToggle.getAttribute("aria-expanded") !== "true";
    nameToggle.setAttribute("aria-expanded", String(expanded));
    nameToggle.setAttribute("aria-label", `${expanded ? "收起" : "展开完整"}文件名：${active.name}`);
    nameText.scrollTop = 0;
  });
  dialog.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-sheet-index"))
      showSheet(Number(button.dataset.sheetIndex));
    if (button.dataset.zoom) {
      zoom =
        button.dataset.zoom === "reset"
          ? 1
          : Math.min(
              2,
              Math.max(1, zoom + (button.dataset.zoom === "in" ? 0.5 : -0.5)),
            );
      setZoom();
    }
    if (button.id === "document-retry") open(active.id);
  });
  dialog.addEventListener("close", () => {
    ++request;
    controller?.abort();
    body.innerHTML = "";
    toolbar.innerHTML = "";
    opener?.isConnected && opener.focus({ preventScroll: true });
  });
}
