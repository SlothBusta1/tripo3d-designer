import { useState, useRef, useCallback, useEffect } from "react";
import { useTripoTask } from "../hooks/useTripoTask";
import { useToast } from "../hooks/useToast";
import { useHistory } from "../hooks/useHistory";
import ModelViewer from "./ModelViewer";
import HistoryPanel from "./HistoryPanel";
import { ToastContainer } from "./Toast";
import styles from "./Designer.module.css";

const MODEL_VERSIONS = [
  { value: "P1-20260311", label: "P1.0 (newest — fast, clean topology)" },
  { value: "v2.5-20250123", label: "v2.5 (high detail)" },
  { value: "v2.0-20240919", label: "v2.0 (legacy)" },
];

const FILE_FORMATS = [
  { value: "glb", label: "GLB" },
  { value: "fbx", label: "FBX" },
  { value: "obj", label: "OBJ" },
  { value: "stl", label: "STL" },
];

const ALLOWED_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const STATUS_LABELS = {
  submitting: "Submitting…",
  queued: "Queued — waiting for worker…",
  running: "Generating",
};

function stripDataUrlPrefix(dataUrl) {
  return dataUrl.split(",")[1] ?? dataUrl;
}

export default function Designer() {
  // ── Form state ───────────────────────────────────────────
  const [mode, setMode] = useState("text");
  const [prompt, setPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [modelVersion, setModelVersion] = useState(MODEL_VERSIONS[0].value);
  const [fileFormat, setFileFormat] = useState("glb");

  // ── History selection (null = current gen, entry = history item) ─
  const [historySelection, setHistorySelection] = useState(null);

  const fileInputRef = useRef(null);
  // Tracks whether the current task has already been saved to history
  const savedRef = useRef(false);
  // Captures form values at submit time so the history entry is accurate
  const submissionRef = useRef({ mode: "text", label: "", fileFormat: "glb" });

  const { status, progress, output, error, isRunning, startTask, reset } = useTripoTask();
  const { toasts, addToast, dismiss: dismissToast } = useToast();
  const { entries: historyEntries, addEntry, clearAll: clearHistory } = useHistory();

  // ── Toast on API / network errors ───────────────────────
  useEffect(() => {
    if (error) addToast(error, "error");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // ── Save to history on success (exactly once per task) ──
  useEffect(() => {
    if (status === "success" && output && !savedRef.current) {
      savedRef.current = true;
      const { mode: m, label, fileFormat: ff } = submissionRef.current;
      addEntry({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        mode: m,
        label,
        thumbnail: output.rendered_image ?? null,
        glbUrl: output.pbr_model ?? (ff === "glb" ? output.model : null) ?? null,
        output: {
          model: output.model,
          pbr_model: output.pbr_model,
          rendered_image: output.rendered_image,
        },
        fileFormat: ff,
        timestamp: Date.now(),
      });
      setHistorySelection(null);
    }
    if (status === null || status === "submitting") {
      savedRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, output]);

  // ── Image handling ───────────────────────────────────────
  const loadImageFile = useCallback(
    (file) => {
      if (!file) return;
      if (!ALLOWED_TYPES[file.type]) {
        addToast("Unsupported file type — use PNG, JPG, or WEBP.", "error");
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        addToast("File is too large — maximum size is 10 MB.", "error");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    },
    [addToast]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      loadImageFile(e.dataTransfer.files?.[0]);
    },
    [loadImageFile]
  );

  const clearImage = useCallback((e) => {
    e?.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ── Tab switch ───────────────────────────────────────────
  const switchMode = (next) => {
    if (next === mode) return;
    setMode(next);
    reset();
    setHistorySelection(null);
  };

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setHistorySelection(null);

    submissionRef.current = {
      mode,
      label: mode === "text" ? prompt.trim() : (imageFile?.name ?? "Image upload"),
      fileFormat,
    };

    const shared = {
      model_version: modelVersion,
      texture: true,
      pbr: true,
      file_format: fileFormat,
    };

    if (mode === "text") {
      await startTask({
        type: "text_to_model",
        prompt: prompt.trim(),
        ...(negPrompt.trim() && { negative_prompt: negPrompt.trim() }),
        ...shared,
      });
    } else {
      if (!imageFile || !imagePreview) return;
      await startTask({
        type: "image_to_model",
        file: {
          type: ALLOWED_TYPES[imageFile.type],
          data: stripDataUrlPrefix(imagePreview),
        },
        ...shared,
      });
    }
  };

  const handleReset = () => {
    reset();
    setPrompt("");
    setNegPrompt("");
    clearImage();
    setHistorySelection(null);
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistorySelection(null);
  };

  // ── Derived display state ────────────────────────────────
  const canSubmit =
    !isRunning &&
    (mode === "text" ? prompt.trim().length >= 3 : imageFile !== null);

  // Active model — history selection overrides current generation
  const activeOutput = historySelection
    ? historySelection.output
    : status === "success"
    ? output
    : null;

  const activeFileFormat = historySelection?.fileFormat ?? fileFormat;

  const activeGlb = historySelection
    ? historySelection.glbUrl
    : output?.pbr_model ?? (fileFormat === "glb" ? output?.model : null) ?? null;

  const barWidth =
    status === "submitting" || status === "queued" ? undefined : `${progress}%`;

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        {/* ════ Left column: form + history ════ */}
        <div className={styles.formPanel}>

          {/* Mode tabs */}
          <div className={styles.tabs}>
            {["text", "image"].map((m) => (
              <button
                key={m}
                type="button"
                className={`${styles.tab} ${mode === m ? styles.active : ""}`}
                onClick={() => switchMode(m)}
              >
                {m === "text" ? "Text to 3D" : "Image to 3D"}
              </button>
            ))}
          </div>

          {/* Generation form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {mode === "text" ? (
              <>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Prompt <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    className={styles.promptTextarea}
                    rows={6}
                    placeholder="e.g. A ceramic coffee mug with a handle, realistic texture"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isRunning}
                    required
                  />
                </div>

                <details className={styles.negPromptDetails}>
                  <summary className={styles.negPromptSummary}>
                    Negative prompt <span className={styles.optional}>(optional)</span>
                  </summary>
                  <textarea
                    className={styles.negPromptTextarea}
                    rows={2}
                    placeholder="e.g. blurry, low quality, distorted"
                    value={negPrompt}
                    onChange={(e) => setNegPrompt(e.target.value)}
                    disabled={isRunning}
                  />
                </details>
              </>
            ) : (
              <div className={styles.field}>
                <label className={styles.label}>Reference image</label>

                <div
                  className={[
                    styles.dropzone,
                    dragOver ? styles.dragOver : "",
                    imagePreview ? styles.hasImage : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => !isRunning && fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Selected reference" className={styles.imagePreview} />
                  ) : (
                    <div className={styles.dropzoneInner}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <p>Drag &amp; drop or <span className={styles.browseLink}>browse</span></p>
                      <p className={styles.hint}>PNG, JPG, WEBP — max 10 MB</p>
                    </div>
                  )}
                </div>

                {imagePreview && !isRunning && (
                  <button type="button" className={styles.clearImage} onClick={clearImage}>
                    Remove image
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => loadImageFile(e.target.files?.[0])}
                />
              </div>
            )}

            {/* Shared controls */}
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Model version</label>
                <select
                  className={styles.select}
                  value={modelVersion}
                  onChange={(e) => setModelVersion(e.target.value)}
                  disabled={isRunning}
                >
                  {MODEL_VERSIONS.map((v) => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Output format</label>
                <select
                  className={styles.select}
                  value={fileFormat}
                  onChange={(e) => setFileFormat(e.target.value)}
                  disabled={isRunning}
                >
                  {FILE_FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className={styles.generateBtn} disabled={!canSubmit}>
              {isRunning ? "Generating…" : "Generate 3D Model"}
            </button>
          </form>

          {/* Progress */}
          {isRunning && (
            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span className={styles.statusLabel}>
                  {STATUS_LABELS[status] ?? "Processing…"}
                  {status === "running" && ` ${progress}%`}
                </span>
                {status === "running" && (
                  <span className={styles.progressPct}>{progress}%</span>
                )}
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressBar} ${!barWidth ? styles.indeterminate : ""}`}
                  style={barWidth ? { width: barWidth } : undefined}
                />
              </div>
            </div>
          )}

          {/* Error — hidden while viewing a history item to avoid confusion */}
          {error && !historySelection && (
            <div className={styles.errorBox}>
              <p>{error}</p>
              <button type="button" className={styles.retryBtn} onClick={handleReset}>
                Try again
              </button>
            </div>
          )}

          {/* Generation history */}
          <HistoryPanel
            entries={historyEntries}
            onSelect={setHistorySelection}
            selectedId={historySelection?.id}
            onClear={handleClearHistory}
          />
        </div>

        {/* ════ Right column: viewer + downloads ════ */}
        <div className={styles.viewerPanel}>
          {/* History context banner */}
          {historySelection && (
            <div className={styles.historyBanner}>
              <span>Viewing: <strong>{historySelection.label}</strong></span>
              <button
                type="button"
                className={styles.historyBannerClose}
                onClick={() => setHistorySelection(null)}
              >
                ✕ Back to latest
              </button>
            </div>
          )}

          {/* 3D viewer */}
          <ModelViewer
            glbUrl={activeGlb}
            fallbackImage={activeOutput?.rendered_image ?? null}
          />

          {/* Downloads — shown for current generation or selected history item */}
          {activeOutput && (
            <div className={styles.outputSection}>
              {!historySelection && (
                <p className={styles.outputTitle}>Generation complete</p>
              )}

              <div className={styles.downloads}>
                {activeOutput.model && (
                  <a
                    href={activeOutput.model}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className={styles.downloadBtn}
                  >
                    <span className={styles.badge}>{activeFileFormat.toUpperCase()}</span>
                    Download Model
                  </a>
                )}
                {activeOutput.pbr_model && (
                  <a
                    href={activeOutput.pbr_model}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className={styles.downloadBtn}
                  >
                    <span className={styles.badge}>PBR</span>
                    Download PBR Model
                  </a>
                )}
                {activeOutput.rendered_image && (
                  <a
                    href={activeOutput.rendered_image}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className={styles.downloadBtn}
                  >
                    <span className={styles.badge}>PNG</span>
                    Download Preview
                  </a>
                )}
              </div>

              {!historySelection && (
                <button type="button" className={styles.newGenerationBtn} onClick={handleReset}>
                  New generation
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
