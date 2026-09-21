export function attachmentKind(file = {}) {
  const name = String(file.name || "").trim();
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  if (/^(png|jpe?g|gif|webp|bmp|svg|heic|heif|avif|tiff?)$/.test(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (/^docx?$/.test(ext)) return "word";
  if (/^xlsx?$/.test(ext)) return "excel";
  const type = String(file.type || "").toLowerCase().split(";")[0].trim();
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(type)) return "word";
  if (["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(type)) return "excel";
  return "generic";
}

export function attachmentIcon(file) {
  const kind = attachmentKind(file);
  return `./assets/attachment-${kind === "generic" ? "tag" : kind}.svg`;
}
