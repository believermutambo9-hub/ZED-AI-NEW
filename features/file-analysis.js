import path from "node:path";

function cleanAIAnswer(value = "") {
  return String(value).replace(/\u0000/g, "").trim();
}

// ============================================================
function detectUploadedSignature(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))) return "image/gif";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return "application/x-ole-storage";
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && [0x03, 0x05, 0x07].includes(buffer[2]) && [0x04, 0x06, 0x08].includes(buffer[3])) return "application/zip";
  return "text-or-unknown";
}

function extractXmlText(xml) {
  return String(xml || "")
    .replace(/<w:tab\b[^>]*\/>|<a:br\b[^>]*\/>|<text:tab\b[^>]*\/>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

async function extractOfficeOrEbookText(buffer, extension) {
  const { unzipSync, strFromU8 } = await import("fflate");
  let archive;
  try {
    archive = unzipSync(buffer);
  } catch {
    throw new Error("This file appears to be a damaged or unsupported compressed document.");
  }

  const entries = Object.keys(archive);
  let selected = [];
  if (extension === ".pptx") {
    selected = entries.filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1] || 0) - Number(b.match(/slide(\d+)/i)?.[1] || 0));
  } else if (extension === ".odt" || extension === ".odp") {
    selected = entries.includes("content.xml") ? ["content.xml"] : [];
  } else if (extension === ".epub") {
    selected = entries.filter(name => /\.(xhtml|html|htm)$/i.test(name)).sort();
  }

  if (!selected.length) {
    throw new Error("No readable text content was found in this document.");
  }

  return selected.map(name => {
    const label = extension === ".pptx" ? "Slide " + (name.match(/slide(\d+)/i)?.[1] || "") + ": " : "";
    return label + extractXmlText(strFromU8(archive[name]));
  }).filter(Boolean).join("\n\n").slice(0, 100000);
}

async function prepareUploadedFile(file) {
  if (!file) return null;
  const dataUrl = typeof file === "string" ? file : file.data;
  const rawFileName = String(typeof file === "object" ? file.name || "uploaded-file" : "uploaded-file");
  const fileName = path.basename(rawFileName.replace(/\\/g, "/")).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 255) || "uploaded-file";
  const declaredType = String(typeof file === "object" ? file.type || "" : "").toLowerCase();
  const match = /^data:([^;,]+)?;base64,([\s\S]+)$/.exec(String(dataUrl || ""));
  if (!match) throw new Error("The uploaded file could not be read. Please upload it again.");
  const dataUrlType = String(match[1] || "").toLowerCase();
  const mimeType = dataUrlType || declaredType || "application/octet-stream";
  const base64 = match[2];

  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) {
    throw new Error("The uploaded file data is invalid. Please upload it again.");
  }

  const buffer = Buffer.from(base64, "base64");
  const extension = path.extname(fileName).toLowerCase();
  if (!buffer.length) throw new Error("The uploaded file is empty or invalid.");
  if (buffer.length > 18 * 1024 * 1024) throw new Error("This file is too large to analyse. Please upload a file smaller than 18 MB.");

  const signature = detectUploadedSignature(buffer);
  const knownExtensionTypes = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".odt": "application/vnd.oasis.opendocument.text",
    ".odp": "application/vnd.oasis.opendocument.presentation",
    ".epub": "application/epub+zip"
  };
  const expectedType = knownExtensionTypes[extension];
  const isZipDocument = [".docx", ".xlsx", ".pptx", ".odt", ".odp", ".epub"].includes(extension);
  const isLegacyOffice = [".doc", ".ppt"].includes(extension);
  const mimeLooksGeneric = ["", "application/octet-stream", "binary/octet-stream"].includes(mimeType);
  const signatureMatches = expectedType && (
    (isZipDocument && signature === "application/zip") ||
    signature === expectedType
  );
  if (expectedType && !signatureMatches) {
    throw new Error("The file contents do not match the file type. Please upload a valid, unmodified file.");
  }
  if (!mimeLooksGeneric && expectedType && !isZipDocument && mimeType !== expectedType) {
    throw new Error("The file's declared format does not match its filename. Please check the file and upload it again.");
  }
  if (mimeType.startsWith("image/") && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType)) {
    throw new Error("This image format is not supported. Please upload a JPEG, PNG, WebP, or GIF image.");
  }
  if (mimeType.startsWith("image/") && signature !== mimeType) {
    throw new Error("The image contents do not match the declared image format. Please upload a valid image.");
  }
  if ((mimeType === "application/pdf" || extension === ".pdf") && signature !== "application/pdf") {
    throw new Error("The file contents do not match a valid PDF. Please upload a valid PDF file.");
  }
  if (isLegacyOffice) {
    throw new Error("Legacy .doc and .ppt files are not supported yet. Please save as DOCX/PPTX or PDF and upload again.");
  }

  if (signature === "application/zip" && !isZipDocument && extension !== ".zip") {
    throw new Error("This compressed file format is not supported for direct analysis. Please upload a supported document format.");
  }

  if (signature.startsWith("image/")) {
    return { fileName, mimeType: signature, inlineData: { mimeType: signature, data: base64 }, extractedText: "" };
  }

  if (signature === "application/pdf") {
    let extractedText = "";
    try {
      const pdfModule = await import("pdf-parse");
      const parsePdf = pdfModule.default || pdfModule;
      const parsed = await parsePdf(buffer);
      extractedText = cleanAIAnswer(parsed.text || "");
    } catch (error) {
      console.warn("PDF text extraction unavailable:", error.message);
    }
    return { fileName, mimeType: "application/pdf", inlineData: { mimeType: "application/pdf", data: base64 }, extractedText };
  }

  if (extension === ".docx" || mimeType.includes("wordprocessingml")) {
    if (signature !== "application/zip") throw new Error("This is not a valid DOCX document.");
    const mammoth = await import("mammoth");
    const extractRawText = mammoth.extractRawText || mammoth.default?.extractRawText;
    const result = await extractRawText({ buffer });
    return { fileName, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extractedText: cleanAIAnswer(result.value || "").slice(0, 100000) };
  }

  if ([".xlsx", ".xls"].includes(extension) || mimeType.includes("spreadsheet") || mimeType.includes("ms-excel")) {
    if (extension === ".xlsx" && signature !== "application/zip") throw new Error("This is not a valid XLSX spreadsheet.");
    if (extension === ".xls" && signature !== "application/x-ole-storage" && signature !== "application/zip") throw new Error("This is not a valid XLS spreadsheet.");
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const extractedText = workbook.SheetNames.map(name => "Sheet: " + name + "\n" + XLSX.utils.sheet_to_csv(workbook.Sheets[name])).join("\n\n");
    return { fileName, mimeType, extractedText: cleanAIAnswer(extractedText).slice(0, 100000) };
  }

  if (extension === ".pptx" || extension === ".odt" || extension === ".odp" || extension === ".epub") {
    if (signature !== "application/zip") throw new Error("This document does not contain a valid Office/ebook archive.");
    const extractedText = await extractOfficeOrEbookText(buffer, extension);
    return { fileName, mimeType, extractedText };
  }

  if (mimeType.startsWith("text/") || ["application/json", "application/xml", "application/javascript", "application/rtf", "application/x-yaml"].includes(mimeType) ||
      [".txt", ".csv", ".tsv", ".md", ".json", ".xml", ".html", ".htm", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".css", ".scss", ".less", ".log", ".rtf", ".yaml", ".yml", ".toml", ".ini", ".conf", ".config", ".env", ".py", ".java", ".c", ".h", ".cpp", ".hpp", ".cs", ".go", ".rs", ".php", ".rb", ".sh", ".bash", ".sql", ".ipynb", ".vue", ".svelte", ".gradle", ".properties", ".makefile", ".dockerfile"].includes(extension)) {
    if (signature !== "text-or-unknown") {
      throw new Error("The file appears to contain binary data, not the selected text/code format.");
    }
    const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
    if (text.includes("\uFFFD") || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
      throw new Error("This file does not appear to be valid readable text. Try exporting it as UTF-8 or PDF.");
    }
    return { fileName, mimeType: mimeType === "application/octet-stream" ? "text/plain" : mimeType, extractedText: text.slice(0, 100000) };
  }

  throw new Error("This file type is not supported yet. Supported formats include PDF, common images, DOCX, PPTX, XLS/XLSX, ODT/ODP, EPUB, CSV, JSON, and common text/code files. If a format is missing, convert it to PDF or a supported Office format.");
}



export { detectUploadedSignature, prepareUploadedFile };
