export type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

export interface ProcessOptions {
  quality: number; // 0.1 - 1
  format: OutputFormat;
  resizeWidth?: number; // optional target width in px
  resizeHeight?: number; // optional target height in px (forces exact dimensions when both set)
  resizeMode?: "exact" | "width" | "fit"; // exact: stretch to WxH; width: width-only keep AR; fit: bounding box keep AR
  /** Optional target file-size window (in bytes). When set, quality is auto-tuned
   *  via binary search to land inside [targetMinBytes, targetMaxBytes].
   *  If the window cannot be satisfied, processing throws.
   *  Ignored for PNG (lossless – quality has no effect). */
  targetMinBytes?: number;
  targetMaxBytes?: number;
}

export interface ProcessedImage {
  id: string;
  name: string;
  originalUrl: string;
  resultUrl: string;
  originalSize: number;
  resultSize: number;
  originalWidth: number;
  originalHeight: number;
  resultWidth: number;
  resultHeight: number;
  format: OutputFormat;
  createdAt: number;
}

const formatExt: Record<OutputFormat, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extFor(format: OutputFormat) {
  return formatExt[format];
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Defer revoke so the canvas drawImage step still has access.
      setTimeout(() => URL.revokeObjectURL(url), 0);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          `Could not decode "${file.name}". The file may be corrupt or use an unsupported format (e.g. HEIC). Try JPG, PNG or WEBP.`,
        ),
      );
    };
    img.src = url;
  });
}

export async function processImage(
  file: File,
  options: ProcessOptions,
): Promise<ProcessedImage> {
  const img = await loadImage(file);
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  let targetW = originalWidth;
  let targetH = originalHeight;
  const w = options.resizeWidth && options.resizeWidth > 0 ? options.resizeWidth : undefined;
  const h = options.resizeHeight && options.resizeHeight > 0 ? options.resizeHeight : undefined;
  const mode = options.resizeMode ?? "exact";
  if (mode === "fit" && (w || h)) {
    const maxW = w ?? originalWidth;
    const maxH = h ?? originalHeight;
    const scale = Math.min(maxW / originalWidth, maxH / originalHeight, 1);
    targetW = Math.max(1, Math.round(originalWidth * scale));
    targetH = Math.max(1, Math.round(originalHeight * scale));
  } else if (mode === "width" && w) {
    targetW = w;
    targetH = Math.round((w / originalWidth) * originalHeight);
  } else if (w && h) {
    targetW = w;
    targetH = h;
  } else if (w) {
    targetW = w;
    targetH = Math.round((w / originalWidth) * originalHeight);
  } else if (h) {
    targetH = h;
    targetW = Math.round((h / originalHeight) * originalWidth);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const encode = (q: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        options.format,
        options.format === "image/png" ? undefined : q,
      );
    });

  let blob: Blob;
  const useRange =
    options.format !== "image/png" &&
    options.targetMinBytes != null &&
    options.targetMaxBytes != null &&
    options.targetMaxBytes >= options.targetMinBytes;

  if (useRange) {
    const minB = options.targetMinBytes!;
    const maxB = options.targetMaxBytes!;
    // Probe extremes first.
    const lowQ = await encode(0.1);
    const highQ = await encode(1);
    if (lowQ.size > maxB) {
      throw new Error(
        `"${file.name}" can't fit under ${(maxB / 1024).toFixed(0)} KB at this resolution. Try a smaller width/height or raise the max.`,
      );
    }
    if (highQ.size < minB) {
      throw new Error(
        `"${file.name}" can't reach ${(minB / 1024).toFixed(0)} KB — the source image isn't detailed enough. Lower the min or use a larger source.`,
      );
    }
    // Binary search the highest quality whose size <= maxB.
    let lo = 0.1;
    let hi = 1;
    let best: Blob = lowQ;
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      const b = await encode(mid);
      if (b.size <= maxB) {
        best = b;
        lo = mid;
      } else {
        hi = mid;
      }
    }
    if (best.size < minB) {
      // Walk quality up until we cross the floor (or hit max).
      for (const q of [0.85, 0.9, 0.95, 1]) {
        const b = await encode(q);
        if (b.size >= minB && b.size <= maxB) {
          best = b;
          break;
        }
        if (b.size > maxB) break;
        best = b;
      }
    }
    if (best.size < minB || best.size > maxB) {
      throw new Error(
        `"${file.name}" couldn't be tuned into the ${(minB / 1024).toFixed(0)}–${(maxB / 1024).toFixed(0)} KB window (got ${(best.size / 1024).toFixed(0)} KB). Widen the range and try again.`,
      );
    }
    blob = best;
  } else {
    blob = await encode(options.quality);
  }

  const baseName = file.name.replace(/\.[^.]+$/, "");
  const resultUrl = URL.createObjectURL(blob);
  const originalUrl = URL.createObjectURL(file);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${baseName}.${extFor(options.format)}`,
    originalUrl,
    resultUrl,
    originalSize: file.size,
    resultSize: blob.size,
    originalWidth,
    originalHeight,
    resultWidth: targetW,
    resultHeight: targetH,
    format: options.format,
    createdAt: Date.now(),
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}