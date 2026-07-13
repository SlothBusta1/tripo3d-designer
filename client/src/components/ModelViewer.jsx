import { useState, useEffect, useRef } from "react";
import styles from "./ModelViewer.module.css";

export default function ModelViewer({ glbUrl, fallbackImage }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [viewerError, setViewerError] = useState(null);
  const blobUrlRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!glbUrl) {
      setBlobUrl(null);
      setFetching(false);
      setFetchError(null);
      setViewerError(null);
      return;
    }

    setBlobUrl(null);
    setFetching(true);
    setFetchError(null);
    setViewerError(null);
    let cancelled = false;

    fetch(`/api/tripo/file?url=${encodeURIComponent(glbUrl)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        if (blob.size === 0) throw new Error("Empty file");
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
        setFetching(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(err.message);
          setFetching(false);
        }
      });

    return () => { cancelled = true; };
  }, [glbUrl]);

  useEffect(() => {
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); };
  }, []);

  // model-viewer swallows load/parse failures internally — surface them instead
  // of leaving a blank canvas (this is the most common cause of "the viewer
  // doesn't work" reports where the network fetch itself succeeded).
  useEffect(() => {
    const el = viewerRef.current;
    if (!el || !blobUrl) return undefined;
    const handleError = (e) => {
      setViewerError(e?.detail?.sourceError?.message || "This model couldn't be displayed in 3D.");
    };
    el.addEventListener("error", handleError);
    return () => el.removeEventListener("error", handleError);
  }, [blobUrl]);

  // No model yet
  if (!glbUrl) {
    return (
      <div className={styles.emptyState}>
        <CubeIcon />
        <p>Your model will appear here</p>
      </div>
    );
  }

  // Fetching GLB through proxy
  if (fetching) {
    return (
      <div className={styles.skeleton}>
        <span className={styles.skeletonLabel}>Downloading model…</span>
      </div>
    );
  }

  // Proxy fetch failed, or model-viewer couldn't parse the file — show
  // rendered image or error
  if (fetchError || viewerError || !blobUrl) {
    return fallbackImage ? (
      <div className={styles.fallback}>
        <img
          src={fallbackImage}
          alt="Generated model preview"
          className={styles.fallbackImg}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <p className={styles.fallbackNote}>Interactive 3D unavailable — showing rendered preview</p>
      </div>
    ) : (
      <div className={styles.loadError}>
        <WarningIcon />
        <span>{fetchError || viewerError || "Could not load 3D preview"}</span>
      </div>
    );
  }

  // Hand the blob URL to model-viewer and let it handle its own loading UI.
  // `key` forces a clean remount per model so a new src is never applied to
  // an already-initialized viewer instance.
  return (
    <model-viewer
      key={blobUrl}
      ref={viewerRef}
      src={blobUrl}
      camera-controls=""
      auto-rotate=""
      shadow-intensity="1"
      ar=""
      ar-modes="webxr scene-viewer quick-look"
      class={styles.viewer}
    />
  );
}

function CubeIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
