import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Utility: simple classNames helper
const cx = (...s: (string | false | null | undefined)[]) => s.filter(Boolean).join(" ");

// --- Sample image sources (will try to load from the files you shared). If these don't load in your environment,
// you can drag & drop the same images directly into the dropzone below.
const SAMPLE_IMAGES: { name: string; url: string }[] = [
  { name: "Death Record", url: "sandbox:/mnt/data/IMG_2024_10_22_11_35_12S.jpg" },
  { name: "Marriage Record", url: "sandbox:/mnt/data/marriages.png" },
];

// Types
type LoadedImg = { name: string; dataUrl: string };

type Step = 1 | 2 | 3; // 1 Upload, 2 Enhance, 3 Finalize

// --- Main Component ---
export default function OMPreProcessingDemo() {
  const [step, setStep] = React.useState<Step>(1);
  const [dragActive, setDragActive] = React.useState(false);
  const [images, setImages] = React.useState<LoadedImg[]>([]);

  // enhancement controls (CSS filter based)
  const [contrast, setContrast] = React.useState(1.05); // slight pop
  const [brightness, setBrightness] = React.useState(1.02);
  const [grayscale, setGrayscale] = React.useState(0);
  const [invert, setInvert] = React.useState(0);

  const [finalizing, setFinalizing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  // --- helpers ---
  const onFiles = async (files: FileList | File[]) => {
    const list: LoadedImg[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      const dataUrl = await fileToDataURL(f);
      list.push({ name: f.name, dataUrl });
    }
    if (list.length) {
      setImages((prev) => [...prev, ...list]);
      setStep(2);
    }
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const loadSamples = async () => {
    const fetched: LoadedImg[] = [];
    for (const s of SAMPLE_IMAGES) {
      try {
        const blob = await fetch(s.url).then((r) => r.blob());
        const dataUrl = await blobToDataURL(blob);
        fetched.push({ name: s.name, dataUrl });
      } catch (err) {
        console.warn("Could not load sample:", s.url, err);
      }
    }
    if (fetched.length) {
      setImages(fetched);
      setStep(2);
    }
  };

  const startFinalize = async () => {
    setStep(3);
    setFinalizing(true);
    setProgress(0);
    // Fun staged animation to simulate real checks
    const phases = [
      { label: "Validating image integrity…", dur: 800 },
      { label: "Detecting skew & uneven lighting…", dur: 900 },
      { label: "Applying denoise & contrast lift…", dur: 1000 },
      { label: "Checking legibility & fields…", dur: 1000 },
      { label: "Packaging results…", dur: 800 },
    ];
    let total = 0;
    for (let i = 0; i < phases.length; i++) {
      await sleep(phases[i].dur);
      total += Math.floor(100 / phases.length);
      setProgress(Math.min(99, total));
    }
    await sleep(400);
    setProgress(100);
    setFinalizing(false);
  };

  const reset = () => {
    setStep(1);
    setImages([]);
    setContrast(1.05);
    setBrightness(1.02);
    setGrayscale(0);
    setInvert(0);
    setFinalizing(false);
    setProgress(0);
  };

  const filterStr = `contrast(${contrast}) brightness(${brightness}) grayscale(${grayscale}) invert(${invert})`;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-50 via-white to-amber-50 flex flex-col gap-6 p-6">
      {/* Header / Brand */}
      <div className="flex items-center justify-between">
        <div className="text-2xl font-black tracking-tight">
          <span className="text-purple-700">Orthodox</span> <span className="text-amber-600">Metrics</span>
          <span className="ml-2 text-sm font-medium text-slate-500">Pre‑Processing Review</span>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className={btn("outline")}>Start Over</button>
          <button onClick={loadSamples} className={btn("primary")}>Load Sample Images</button>
        </div>
      </div>

      {/* Stepper */}
      <Stepper step={step} />

      {/* Content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls / Info Panel */}
        <motion.div layout className="lg:col-span-1">
          <Card>
            <div className="p-5">
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Step 1 — Upload Church Record Images</h2>
                  <p className="text-sm text-slate-600">Drag & drop or click the box to upload. Use the <span className="font-medium">Load Sample Images</span> button to auto‑load the two images you shared (Death & Marriage records).</p>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Step 2 — Enhance & Inspect</h2>
                  <p className="text-sm text-slate-600">OM performs gentle, reversible improvements before any heavy processing. Adjust the preview filters to simulate contrast lift and exposure correction.</p>
                  <div className="space-y-3">
                    <Slider label={`Contrast ${contrast.toFixed(2)}x`} min={0.8} max={1.8} step={0.01} value={contrast} onChange={setContrast} />
                    <Slider label={`Brightness ${brightness.toFixed(2)}x`} min={0.8} max={1.6} step={0.01} value={brightness} onChange={setBrightness} />
                    <Slider label={`Grayscale ${Math.round(grayscale * 100)}%`} min={0} max={1} step={0.01} value={grayscale} onChange={setGrayscale} />
                    <Slider label={`Invert ${Math.round(invert * 100)}%`} min={0} max={1} step={0.01} value={invert} onChange={setInvert} />
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Step 3 — Finalize</h2>
                  <p className="text-sm text-slate-600">OM runs a final pre‑flight: integrity checks, legibility, field zoning, and packaging for downstream processing.</p>
                  <ProgressBar value={progress} running={finalizing} />
                </div>
              )}
            </div>
            <div className="border-t p-4 flex gap-3 justify-end">
              {step === 1 && (
                <button className={btn("primary")} onClick={() => setStep(2)} disabled={!images.length}>Continue</button>
              )}
              {step === 2 && (
                <>
                  <button className={btn("ghost")} onClick={() => setStep(1)}>Back</button>
                  <button className={btn("primary")} onClick={startFinalize} disabled={!images.length}>Finalize</button>
                </>
              )}
              {step === 3 && (
                <>
                  <button className={btn("ghost")} onClick={() => setStep(2)} disabled={finalizing}>Back</button>
                  <button className={btn("primary")} onClick={reset} disabled={finalizing}>Done</button>
                </>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Right: Visual Work Area */}
        <motion.div layout className="lg:col-span-2">
          <Card>
            <div className="p-5">
              {step === 1 && (
                <Dropzone
                  dragActive={dragActive}
                  setDragActive={setDragActive}
                  onFiles={onFiles}
                />
              )}

              {step >= 2 && (
                <div className="space-y-4">
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    {images.length === 0 && (
                      <EmptyState />
                    )}
                    {images.map((img, idx) => (
                      <motion.div
                        key={idx}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 140, damping: 16 }}
                        className="rounded-2xl overflow-hidden shadow-lg border"
                      >
                        <div className="p-3 text-sm font-medium text-slate-600 flex items-center justify-between bg-slate-50 border-b">
                          <span>{img.name}</span>
                          <span className="text-xs text-slate-400">Preview</span>
                        </div>
                        <div className="relative">
                          <img src={img.dataUrl} alt={img.name} className="w-full block" />
                          {/* Enhancement overlay */}
                          <motion.div
                            className="absolute inset-0 pointer-events-none"
                            style={{ filter: filterStr }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: step >= 2 ? 1 : 0 }}
                            transition={{ duration: 0.4 }}
                          >
                            <img src={img.dataUrl} alt={img.name + " enhanced"} className="w-full h-full object-cover mix-blend-multiply" />
                          </motion.div>
                          <Ribbon text={step === 2 ? "Enhanced Preview" : step === 3 ? "Finalized" : ""} color={step === 3 ? "bg-emerald-600" : "bg-purple-700"} />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {step === 2 && (
                    <div className="text-right">
                      <span className="text-xs text-slate-500">Visual preview only — OM preserves originals</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Footer note */}
      <div className="text-center text-xs text-slate-500 pt-2">
        This interactive demo showcases OM’s careful pre‑processing review before downstream OCR/structuring.
      </div>
    </div>
  );
}

// --- Stepper ---
function Stepper({ step }: { step: Step }) {
  const items = [
    { n: 1, title: "Upload" },
    { n: 2, title: "Enhance" },
    { n: 3, title: "Finalize" },
  ];
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        {items.map((it, i) => {
          const active = step === (it.n as Step);
          const done = step > (it.n as Step);
          return (
            <div key={it.n} className="flex-1 flex items-center">
              <div className="flex items-center gap-3">
                <motion.div
                  className={cx(
                    "h-9 w-9 rounded-full border flex items-center justify-center text-sm font-bold",
                    active && "bg-purple-700 text-white border-purple-700 shadow",
                    done && "bg-emerald-600 text-white border-emerald-600",
                    !active && !done && "bg-white border-slate-300 text-slate-500"
                  )}
                  initial={{ scale: 0.9, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 18 }}
                >
                  {it.n}
                </motion.div>
                <div className={cx("text-sm font-medium", active ? "text-slate-900" : done ? "text-slate-600" : "text-slate-500")}>{it.title}</div>
              </div>
              {i < items.length - 1 && (
                <div className="flex-1 h-1 mx-3 rounded-full bg-slate-200 overflow-hidden">
                  <motion.div
                    className={cx("h-full", done ? "bg-emerald-500" : active ? "bg-purple-500" : "bg-slate-300")}
                    initial={{ width: 0 }}
                    animate={{ width: done ? "100%" : active ? "50%" : "0%" }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- UI atoms ---
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border shadow-sm bg-white/90 backdrop-blur">
      {children}
    </div>
  );
}

function btn(variant: "primary" | "outline" | "ghost") {
  const base = "px-4 py-2 rounded-xl text-sm font-medium transition active:scale-[.98]";
  if (variant === "primary") return cx(base, "bg-purple-700 text-white hover:bg-purple-800 shadow");
  if (variant === "outline") return cx(base, "border border-slate-300 bg-white hover:bg-slate-50");
  return cx(base, "text-slate-700 hover:bg-slate-100");
}

function ProgressBar({ value, running }: { value: number; running: boolean }) {
  return (
    <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
      <motion.div
        className="h-full bg-amber-500"
        style={{ width: `${value}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: "tween", ease: "easeInOut", duration: 0.4 }}
      />
      {running && (
        <motion.div
          className="h-3 w-24 bg-white/30 -mt-3"
          initial={{ x: -100 }}
          animate={{ x: ["-10%", "110%"] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; step: number }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1 text-sm text-slate-700">
        <span>{label}</span>
        <span className="text-xs text-slate-500">{min}–{max}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

function Ribbon({ text, color }: { text: string; color: string }) {
  if (!text) return null;
  return (
    <div className={cx("absolute top-3 right-[-42px] rotate-45 text-white text-[11px] px-10 py-1 shadow-lg", color)}>{text}</div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border-2 border-dashed p-8 text-center text-slate-500">
      No images loaded yet.
    </div>
  );
}

function Dropzone({ dragActive, setDragActive, onFiles }: { dragActive: boolean; setDragActive: (b: boolean) => void; onFiles: (files: FileList | File[]) => void }) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  return (
    <div
      onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
      onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files); }}
      className={cx(
        "relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer group",
        dragActive ? "border-purple-600 bg-purple-50/50" : "border-slate-300 hover:border-slate-400"
      )}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && onFiles(e.target.files)} />
      <AnimatePresence initial={false}>
        {dragActive ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <p className="text-lg font-semibold text-purple-700">Drop files to upload</p>
            <p className="text-sm text-slate-600">We’ll stage them for enhancement & review.</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <p className="text-lg font-semibold">Drag & drop church record images</p>
            <p className="text-sm text-slate-600">or click to browse. Originals are preserved, edits are non‑destructive.</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-xs border border-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Live demo
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- helpers ---
async function fileToDataURL(file: File): Promise<string> {
  const reader = new FileReader();
  return new Promise((res, rej) => {
    reader.onload = () => res(String(reader.result));
    reader.onerror = () => rej(reader.error);
    reader.readAsDataURL(file);
  });
}

async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
