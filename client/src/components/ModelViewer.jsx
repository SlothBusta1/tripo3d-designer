import { useRef, useState, useEffect } from "react";
import styles from "./ModelViewer.module.css";

// load state machine: idle → loading → loaded | error
const IDLE = "idle";
const LOADING = "loading";
const LOADED = "loaded";
const ERROR = "error";

export default function ModelViewer({ glbUrl }) {
  const viewerRef = useRef(null);
  const [loadState, setLoadState] = useState(IDLE);
  const [arSupported, setArSupported] = useState(false);

  // Reset whenever the URL changes
  useEffect(() => {
    setLoadState(glbUrl ? LOADING : IDLE);
    setArSupported(false);
  }, [glbUrl]);

  // Attach model-viewer DOM events imperatively (React doesn't know about web-component events)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !glbUrl) return;

    const onLoad = () => {
      setLoadState(LOADED);
      // canActivateAR is true on iOS (Quick Look) and Android (Scene Viewer)
      setArSupported(viewer.canActivateAR === true);
    };

    const onError = () => setLoadState(ERROR);

    viewer.addEventListener("load", onLoad);
    viewer.addEventListener("error", onError);
    return () => {
      viewer.removeEventListener("load", onLoad);
      viewer.removeEventListener("error", onError);
    };
  }, [glbUrl]);

  // ── Empty state ──────────────────────────────────────────
  if (!glbUrl) {
    return (
      <div className={styles.emptyState}>
        <CubeIcon />
        <p>Your model will appear here</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Skeleton shown while model loads */}
      {loadState === LOADING && <div className={styles.skeleton} />}

      {/* Error fallback */}
      {loadState === ERROR && (
        <div className={styles.loadError}>
          <WarningIcon />
          <span>Could not load 3D preview</span>
        </div>
      )}

      {/*
        model-viewer is always mounted once glbUrl is set so the browser can
        start fetching the asset. We hide it via CSS until loaded to avoid
        showing an empty canvas alongside the skeleton.
        Boolean attributes on web components must be written as empty strings
        in React 18 to be set as HTML attributes correctly.
      */}
      <model-viewer
        ref={viewerRef}
        src={glbUrl}
        camera-controls=""
        auto-rotate=""
        shadow-intensity="1"
        ar=""
        ar-modes="webxr scene-viewer quick-look"
        class={styles.viewer}
        style={{ display: loadState === LOADED ? "block" : "none" }}
      />

      {/* Custom AR button — only shown when platform supports it */}
      {arSupported && loadState === LOADED && (
        <button
          className={styles.arBtn}
          onClick={() => viewerRef.current?.activateAR()}
          aria-label="View in augmented reality"
        >
          <ARIcon /> View in AR
        </button>
      )}
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────

function CubeIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ARIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 3H3v2" />
      <path d="M19 3h2v2" />
      <path d="M5 21H3v-2" />
      <path d="M19 21h2v-2" />
      <path d="M12 8l-4 2.5v5L12 18l4-2.5v-5L12 8z" />
      <line x1="12" y1="8" x2="12" y2="18" />
      <line x1="8" y1="10.5" x2="16" y2="10.5" />
    </svg>
  );
}
