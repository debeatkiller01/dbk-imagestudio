import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Download, X, ImageIcon, Loader2, Settings2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  processImage,
  formatBytes,
  type OutputFormat,
  type ProcessedImage,
} from "@/lib/image-processor";
import { addHistory } from "@/lib/history-store";
import JSZip from "jszip";
import { toast } from "sonner";

const MAX_BATCH = 20;

const IMAGE_EXTENSIONS = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i;

function isImageFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    file.type === "" ||
    file.type === "application/octet-stream" ||
    IMAGE_EXTENSIONS.test(file.name)
  );
}

const SIZE_PRESETS: { label: string; min: number; max: number }[] = [
  { label: "Tiny (50–150 KB)", min: 50, max: 150 },
  { label: "Small (150–300 KB)", min: 150, max: 300 },
  { label: "Branding (150–500 KB)", min: 150, max: 500 },
  { label: "Standard (300–800 KB)", min: 300, max: 800 },
  { label: "Hi-Q (500–1500 KB)", min: 500, max: 1500 },
];

type PresetKey =
  | "blog-featured"
  | "blog-inline"
  | "instagram-square"
  | "instagram-portrait"
  | "instagram-story"
  | "facebook-post"
  | "facebook-cover"
  | "twitter-post"
  | "linkedin-post"
  | "linkedin-cover"
  | "youtube-thumbnail"
  | "pinterest-pin"
  | "ecommerce-product"
  | "email-header"
  | "website-hero"
  | "avatar"
  | "favicon";

const PRESETS: Record<PresetKey, { label: string; w: number; h: number; note: string }> = {
  "blog-featured": { label: "Blog — featured image", w: 1200, h: 630, note: "Great for article headers & OG share" },
  "blog-inline": { label: "Blog — inline image", w: 800, h: 450, note: "Lightweight in-article visual" },
  "instagram-square": { label: "Instagram — square post", w: 1080, h: 1080, note: "Classic IG feed post" },
  "instagram-portrait": { label: "Instagram — portrait post", w: 1080, h: 1350, note: "Takes more feed space" },
  "instagram-story": { label: "Instagram / TikTok story", w: 1080, h: 1920, note: "Vertical 9:16 story / reel cover" },
  "facebook-post": { label: "Facebook — post", w: 1200, h: 630, note: "Recommended FB feed size" },
  "facebook-cover": { label: "Facebook — cover", w: 1640, h: 924, note: "Page cover photo" },
  "twitter-post": { label: "X / Twitter — post", w: 1600, h: 900, note: "16:9 in-feed image" },
  "linkedin-post": { label: "LinkedIn — post", w: 1200, h: 627, note: "Feed share image" },
  "linkedin-cover": { label: "LinkedIn — cover", w: 1584, h: 396, note: "Profile banner" },
  "youtube-thumbnail": { label: "YouTube — thumbnail", w: 1280, h: 720, note: "16:9 video thumbnail" },
  "pinterest-pin": { label: "Pinterest — pin", w: 1000, h: 1500, note: "2:3 vertical pin" },
  "ecommerce-product": { label: "E-commerce — product", w: 2000, h: 2000, note: "Square, zoom-friendly" },
  "email-header": { label: "Email — header", w: 600, h: 200, note: "Newsletter banner" },
  "website-hero": { label: "Website — hero banner", w: 1920, h: 1080, note: "Full-width landing hero" },
  avatar: { label: "Avatar / profile picture", w: 400, h: 400, note: "Square headshot" },
  favicon: { label: "Favicon / app icon", w: 512, h: 512, note: "Square icon source" },
};

interface WorkspaceProps {
  title: string;
  subtitle: string;
  mode: "compress" | "resize" | "both";
}

type OpMode = "compress" | "resize" | "both";

export function Workspace({ title, subtitle, mode }: WorkspaceProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ProcessedImage[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [quality, setQuality] = useState(0.8);
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [autoMode, setAutoMode] = useState(true);
  const [preset, setPreset] = useState<PresetKey>("blog-featured");
  const [sizeTargetEnabled, setSizeTargetEnabled] = useState(false);
  const [sizePresetIdx, setSizePresetIdx] = useState<number>(2); // Branding default
  const [sizeCustom, setSizeCustom] = useState(false);
  const [minKB, setMinKB] = useState<string>("150");
  const [maxKB, setMaxKB] = useState<string>("500");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  // Per-batch operation mode — lets the user choose Compress only,
  // Resize only, or Both regardless of which page they're on.
  const [opMode, setOpMode] = useState<OpMode>(mode === "both" ? "both" : mode);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const fileQueueRef = useRef<File[]>([]);

  const showResize = opMode === "resize" || opMode === "both";
  const showQuality = opMode === "compress" || opMode === "both";

  const onFiles = useCallback((list: FileList | File[]) => {
    const selected = Array.from(list);
    const arr = selected.filter(isImageFile);
    if (!arr.length) {
      setFeedback({ type: "error", text: "No supported images found — choose JPG, PNG, WEBP, GIF, SVG, BMP or AVIF." });
      toast.error("No supported images found — choose JPG, PNG, WEBP, GIF, SVG, BMP or AVIF.");
      return;
    }
    if (arr.length < selected.length) {
      setFeedback({ type: "warning", text: "Some selected files were skipped because they are not supported images." });
      toast.warning("Some selected files were skipped because they are not supported images.");
    } else {
      setFeedback({ type: "success", text: `${arr.length} image${arr.length !== 1 ? "s" : ""} ready to process.` });
    }
    setFiles((prev) => {
      const combined = [...prev, ...arr];
      if (combined.length > MAX_BATCH) {
        toast.warning(
          `Batch limit is ${MAX_BATCH} images — extra files were dropped. Large batches may be slow.`,
        );
        const limited = combined.slice(0, MAX_BATCH);
        fileQueueRef.current = limited;
        return limited;
      }
      if (combined.length >= 15) {
        toast.message(`${combined.length} images queued — processing may take a moment.`);
      }
      fileQueueRef.current = combined;
      return combined;
    });
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
  };

  // Global paste support — works anywhere on the page
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imgs: File[] = [];
      for (const it of Array.from(items)) {
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) {
            // Give pasted screenshots a friendlier name
            const ext = f.type.split("/")[1] || "png";
            const named = f.name && f.name !== "image.png"
              ? f
              : new File([f], `pasted-${Date.now()}.${ext}`, { type: f.type });
            imgs.push(named);
          }
        }
      }
      if (imgs.length) {
        e.preventDefault();
        onFiles(imgs);
        toast.success(`Pasted ${imgs.length} image${imgs.length !== 1 ? "s" : ""}`);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFiles]);

  const removeFile = (i: number) =>
    setFiles((p) => {
      const next = p.filter((_, idx) => idx !== i);
      fileQueueRef.current = next;
      return next;
    });

  const process = async () => {
    const queuedFiles = fileQueueRef.current.length ? fileQueueRef.current : files;
    if (!queuedFiles.length) {
      setFeedback({ type: "error", text: "No images to process — upload or paste at least one image first." });
      toast.error("No images to process — upload or paste at least one image first.");
      // Nudge focus back to the upload area so it's obvious where to start.
      inputRef.current?.focus();
      return;
    }
    setFeedback(null);
    setBusy(true);
    const out: ProcessedImage[] = [];
    const failed: string[] = [];
    let w: number | undefined;
    let h: number | undefined;
    if (showResize) {
      if (autoMode) {
        w = PRESETS[preset].w;
        h = PRESETS[preset].h;
      } else {
        w = width ? parseInt(width, 10) : undefined;
        h = height ? parseInt(height, 10) : undefined;
        if ((width && (!w || w <= 0)) || (height && (!h || h <= 0))) {
          toast.error("Width and height must be positive numbers.");
          setBusy(false);
          return;
        }
      }
    }
    for (const f of queuedFiles) {
      try {
        let targetMinBytes: number | undefined;
        let targetMaxBytes: number | undefined;
        if (showQuality && sizeTargetEnabled && format !== "image/png") {
          const minVal = sizeCustom ? parseInt(minKB, 10) : SIZE_PRESETS[sizePresetIdx].min;
          const maxVal = sizeCustom ? parseInt(maxKB, 10) : SIZE_PRESETS[sizePresetIdx].max;
          if (!minVal || !maxVal || minVal <= 0 || maxVal <= 0 || maxVal < minVal) {
            toast.error("Set a valid KB range (max ≥ min, both > 0).");
            setBusy(false);
            return;
          }
          targetMinBytes = minVal * 1024;
          targetMaxBytes = maxVal * 1024;
        }
        const r = await processImage(f, {
          quality: showQuality ? quality : 0.92,
          format,
          resizeWidth: showResize && w && !isNaN(w) ? w : undefined,
          resizeHeight: showResize && h && !isNaN(h) ? h : undefined,
          // Manual mode with both W & H = exact (user explicitly asked for that size).
          // Auto preset = exact (preset dimensions are the target).
          // Only one dimension = width-mode keeps aspect ratio.
          resizeMode: showResize ? (w && h ? "exact" : "width") : undefined,
          targetMinBytes,
          targetMaxBytes,
        });
        out.push(r);
        addHistory({
          id: r.id,
          name: r.name,
          originalSize: r.originalSize,
          resultSize: r.resultSize,
          resultWidth: r.resultWidth,
          resultHeight: r.resultHeight,
          format: r.format,
          createdAt: r.createdAt,
        });
      } catch (e: any) {
        console.error(e);
        failed.push(e?.message ? `${f.name} — ${e.message}` : f.name);
      }
    }
    setResults((prev) => [...out, ...prev]);
    fileQueueRef.current = [];
    setFiles([]);
    setBusy(false);
    if (out.length > 0) {
      // Make sure the user actually sees the new results, especially on mobile
      // where the results section sits below the settings panel.
      requestAnimationFrame(() =>
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }

    if (failed.length) {
      setFeedback({
        type: "error",
        text: `Couldn't process ${failed.length} file${failed.length !== 1 ? "s" : ""}. ${failed.slice(0, 2).join(" • ")}${failed.length > 2 ? " …" : ""}`,
      });
      toast.error(
        `Couldn't process ${failed.length} file${failed.length !== 1 ? "s" : ""}. ${failed.slice(0, 2).join(" • ")}${failed.length > 2 ? " …" : ""}`,
        { duration: 8000 },
      );
    }

    if (out.length > 0) {
      setFeedback({ type: "success", text: `Processed ${out.length} image${out.length !== 1 ? "s" : ""}. Use Download to save.` });
      toast.success(
        `Processed ${out.length} image${out.length !== 1 ? "s" : ""}. Use Download to save.`,
      );
    } else if (!failed.length) {
      setFeedback({ type: "error", text: "Nothing was processed. Please try again." });
      toast.error("Nothing was processed. Please try again.");
    }
    setWidth("");
    setHeight("");
  };

  const downloadOne = (r: ProcessedImage) => {
    const a = document.createElement("a");
    a.href = r.resultUrl;
    a.download = r.name;
    a.click();
  };

  const downloadAsZip = async (items: ProcessedImage[]) => {
    const zip = new JSZip();
    const used = new Map<string, number>();
    for (const r of items) {
      const blob = await fetch(r.resultUrl).then((res) => res.blob());
      let name = r.name;
      const count = used.get(name) ?? 0;
      if (count > 0) {
        const dot = name.lastIndexOf(".");
        name = dot > 0 ? `${name.slice(0, dot)}-${count}${name.slice(dot)}` : `${name}-${count}`;
      }
      used.set(r.name, count + 1);
      zip.file(name, blob);
    }
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dbk-images-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadAll = async () => {
    if (!results.length) return;
    try {
      await downloadAsZip(results);
      toast.success("ZIP downloaded.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to build ZIP file.");
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
          <span className="text-gradient">{title}</span>
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">{subtitle}</p>
      </div>

      {/* Upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl glass-strong p-6 sm:p-10 md:p-16 text-center transition-all touch-manipulation ${
          drag ? "border-primary glow scale-[1.01]" : "hover:border-primary/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onFiles(e.target.files);
            // Reset so re-selecting the SAME file (common with single uploads)
            // still fires onChange next time.
            e.target.value = "";
          }}
        />
        <div className="mx-auto mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary/10 glow">
          <Upload className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
        </div>
        <p className="text-base sm:text-lg font-semibold">
          <span className="hidden sm:inline">Drop, paste or click to browse</span>
          <span className="sm:hidden">Tap to upload images</span>
        </p>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          JPG, PNG, WEBP — up to {MAX_BATCH} images. <span className="hidden sm:inline">Press ⌘/Ctrl+V to paste.</span>
        </p>
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <div className="rounded-2xl glass p-5 animate-scale-in">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">{files.length} file(s) ready</p>
            <button
              onClick={() => setFiles([])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div
                key={i}
                className="group flex items-center gap-2 rounded-lg bg-white/5 pl-3 pr-1 py-1.5 text-xs"
              >
                <ImageIcon className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-[160px] truncate">{f.name}</span>
                <span className="text-muted-foreground">{formatBytes(f.size)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="rounded p-1 hover:bg-destructive/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="rounded-2xl glass p-4 sm:p-6 grid gap-5 sm:gap-6 grid-cols-2 md:grid-cols-4">
        <div className="md:col-span-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Settings2 className="h-4 w-4" />
          Settings
        </div>

        {/* Operation mode — Compress / Resize / Both */}
        <div className="col-span-2 md:col-span-4 rounded-xl bg-white/5 p-3 sm:p-4 space-y-2">
          <Label className="text-xs">What do you want to do?</Label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: "compress", label: "Compress only", note: "Shrink file size" },
              { v: "resize", label: "Resize only", note: "Change dimensions" },
              { v: "both", label: "Compress & resize", note: "Do both at once" },
            ] as { v: OpMode; label: string; note: string }[]).map((o) => {
              const active = opMode === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setOpMode(o.v)}
                  className={`text-left rounded-lg border p-2.5 text-xs transition-all ${
                    active
                      ? "border-primary bg-primary/15 text-foreground glow"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <div className="font-semibold text-[13px] text-foreground">{o.label}</div>
                  <div className="hidden sm:block opacity-80">{o.note}</div>
                </button>
              );
            })}
          </div>
        </div>

        {showResize && (
          <>
            <div className="space-y-3 col-span-2 md:col-span-4 rounded-xl bg-white/5 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {autoMode ? "Auto-recommend size" : "Manual size"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {autoMode
                      ? "Pick what you'll use the image for — we'll set the best W×H."
                      : "Enter exact width and height in pixels."}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Label htmlFor="auto-toggle" className="text-xs text-muted-foreground">
                    {autoMode ? "Auto" : "Manual"}
                  </Label>
                  <Switch id="auto-toggle" checked={autoMode} onCheckedChange={setAutoMode} />
                </div>
              </div>

              {autoMode ? (
                <div className="space-y-2">
                  <Label className="text-xs">What's this image for?</Label>
                  <Select value={preset} onValueChange={(v) => setPreset(v as PresetKey)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRESETS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label} — {v.w}×{v.h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Recommended: <span className="text-primary font-mono">{PRESETS[preset].w}×{PRESETS[preset].h}</span> — {PRESETS[preset].note}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Width (px)</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="Original"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      min={1}
                    />
                    <p className="text-xs text-muted-foreground">Any size, e.g. 100 or 3000</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Height (px)</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="Auto"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      min={1}
                    />
                    <p className="text-xs text-muted-foreground">Empty = keep aspect ratio</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {showQuality && (
          <div className="space-y-2 col-span-2 md:col-span-1">
            <Label className="text-xs flex justify-between">
              <span>Quality</span>
              <span className="text-primary font-mono">{quality.toFixed(2)}</span>
            </Label>
            <Slider
              value={[quality]}
              min={0.1}
              max={1}
              step={0.05}
              onValueChange={(v) => setQuality(v[0])}
              className="pt-2"
              disabled={sizeTargetEnabled}
            />
            <p className="text-xs text-muted-foreground">
              {sizeTargetEnabled ? "Auto-tuned to your KB target" : "Lower = smaller file"}
            </p>
          </div>
        )}

        <div className="space-y-2 col-span-2 md:col-span-1">
          <Label className="text-xs">Output format</Label>
          <Select value={format} onValueChange={(v) => setFormat(v as OutputFormat)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="image/jpeg">JPG</SelectItem>
              <SelectItem value="image/png">PNG</SelectItem>
              <SelectItem value="image/webp">WEBP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showQuality && (
          <div className="col-span-2 md:col-span-4 rounded-xl bg-white/5 p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Target file size</p>
                <p className="text-xs text-muted-foreground">
                  Auto-tune quality so each image lands inside a KB window. Great for branding kits & uploads with size limits.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Label htmlFor="size-target" className="text-xs text-muted-foreground">
                  {sizeTargetEnabled ? "On" : "Off"}
                </Label>
                <Switch
                  id="size-target"
                  checked={sizeTargetEnabled}
                  onCheckedChange={setSizeTargetEnabled}
                />
              </div>
            </div>

            {sizeTargetEnabled && (
              <>
                {format === "image/png" && (
                  <p className="text-xs text-amber-400">
                    PNG is lossless — KB targeting only works for JPG or WEBP. Switch format to enable.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {SIZE_PRESETS.map((p, i) => {
                    const active = !sizeCustom && sizePresetIdx === i;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setSizeCustom(false);
                          setSizePresetIdx(i);
                          setMinKB(String(p.min));
                          setMaxKB(String(p.max));
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                          active
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-white/10 bg-white/5 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setSizeCustom(true)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                      sizeCustom
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {sizeCustom && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Min (KB)</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={minKB}
                        onChange={(e) => setMinKB(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max (KB)</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={maxKB}
                        onChange={(e) => setMaxKB(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Files that can't fit the window will be reported as failed — widen the range or adjust dimensions.
                </p>
              </>
            )}
          </div>
        )}

        {feedback && (
          <div
            className={`col-span-2 md:col-span-4 rounded-xl border px-4 py-3 text-sm ${
              feedback.type === "error"
                ? "border-destructive/40 bg-destructive/10 text-foreground"
                : "border-primary/40 bg-primary/10 text-foreground"
            }`}
            role="status"
            aria-live="polite"
          >
            {feedback.text}
          </div>
        )}

        <div className="col-span-2 md:col-span-4 flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
          <Button
            onClick={process}
            disabled={busy}
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/70 text-primary-foreground hover:opacity-90 glow"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              <>Process {files.length || ""} image{files.length !== 1 ? "s" : ""}</>
            )}
          </Button>
          {results.length > 0 && (
            <Button onClick={downloadAll} variant="outline" size="lg" className="w-full sm:w-auto">
              <Package className="mr-2 h-4 w-4" /> Download all as ZIP
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div ref={resultsRef}>
          <h2 className="mb-4 text-xl font-semibold">Results</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => {
              const saved = Math.max(0, 1 - r.resultSize / r.originalSize);
              return (
                <div
                  key={r.id}
                  className="rounded-2xl glass overflow-hidden hover:scale-[1.02] transition-transform animate-scale-in"
                >
                  <div className="grid grid-cols-2 gap-px bg-border/40">
                    <div className="relative aspect-square bg-black/30">
                      <img
                        src={r.originalUrl}
                        alt="before"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <span className="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                        Before
                      </span>
                    </div>
                    <div className="relative aspect-square bg-black/30">
                      <img
                        src={r.resultUrl}
                        alt="after"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <span className="absolute top-2 left-2 rounded bg-primary/80 text-primary-foreground px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold">
                        After
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-white/5 p-2">
                        <p className="text-muted-foreground">Original</p>
                        <p className="font-mono">{formatBytes(r.originalSize)}</p>
                        <p className="text-muted-foreground">
                          {r.originalWidth}×{r.originalHeight}
                        </p>
                      </div>
                      <div className="rounded-lg bg-primary/10 p-2">
                        <p className="text-primary">Compressed</p>
                        <p className="font-mono">{formatBytes(r.resultSize)}</p>
                        <p className="text-muted-foreground">
                          {r.resultWidth}×{r.resultHeight}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">
                        −{(saved * 100).toFixed(0)}% saved
                      </span>
                      <Button size="sm" onClick={() => downloadOne(r)}>
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}